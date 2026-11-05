import { test } from "node:test";
import assert from "node:assert/strict";
import "../js/sobre-data.js";
import "../js/sorteo.js";

const catalogo = globalThis.SOBRE_CATALOGO;
const { construirCartas } = globalThis.SOBRE_SORTEO;

const noGold = catalogo.filter((c) => c.variante !== "gold");
const gold = catalogo.filter((c) => c.variante === "gold");

test("every base card has exactly one Gold version", () => {
  const bases = catalogo.filter((c) => c.variante === "base");
  assert.equal(gold.length, bases.length);
  bases.forEach((base) => {
    const dorada = gold.filter((c) => c.grupoId === base.id);
    assert.equal(dorada.length, 1, base.id);
    assert.equal(dorada[0].id, `${base.id}-gold`);
    assert.equal(dorada[0].nombreVariante, "Gold");
    assert.equal(dorada[0].rareza, base.rareza);
    assert.equal(dorada[0].src, base.src);
  });
});

test("Gold entries come after every other entry, in base order", () => {
  const primeraGold = catalogo.findIndex((c) => c.variante === "gold");
  assert.equal(primeraGold, noGold.length);
  assert.ok(catalogo.slice(primeraGold).every((c) => c.variante === "gold"));
  const ordenBases = catalogo.filter((c) => c.variante === "base").map((c) => c.id);
  assert.deepEqual(gold.map((c) => c.grupoId), ordenBases);
});

test("existing ids keep their position: base then holo per card", () => {
  const esperado = catalogo
    .filter((c) => c.variante === "base")
    .flatMap((c) => [c.id, `${c.id}-holo`]);
  assert.deepEqual(noGold.map((c) => c.id), esperado);
  assert.equal(catalogo[0].id, "lentes-oscuros");
  assert.equal(catalogo[1].id, "lentes-oscuros-holo");
});

test("every group weighs 88 base, 10 holo and 2 gold", () => {
  const grupos = Map.groupBy(catalogo, (c) => c.grupoId);
  assert.ok(grupos.size > 0);
  for (const [grupo, variantes] of grupos) {
    const pesos = Object.fromEntries(variantes.map((c) => [c.variante, c.pesoVariante]));
    assert.deepEqual(pesos, { base: 88, holo: 10, gold: 2 }, grupo);
  }
  catalogo.forEach((c) => assert.ok(c.conjunto?.id, c.id));
});

test("a pack can yield a Gold card when the dice land on it", () => {
  /* Siempre ~0.995: la rareza más alta y el último tramo del peso (el 2% de Gold) */
  const cartas = construirCartas(catalogo, { random: () => 0.995 });
  assert.equal(cartas.length, 3);
  cartas.forEach((c) => assert.equal(c.variante, "gold"));
  assert.equal(new Set(cartas.map((c) => c.grupoId)).size, 3);
});

test("a low roll still gives the base card", () => {
  const cartas = construirCartas(catalogo, { random: () => 0 });
  cartas.forEach((c) => assert.equal(c.variante, "base"));
});

test("Gold odds are close to 2% over many draws", () => {
  let estado = 12345;
  const random = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
  let total = 0;
  let doradas = 0;
  for (let i = 0; i < 20000; i++) {
    construirCartas(catalogo, { random }).forEach((c) => {
      total++;
      if (c.variante === "gold") doradas++;
    });
  }
  const tasa = doradas / total;
  assert.ok(tasa > 0.012 && tasa < 0.028, `tasa Gold ${tasa}`);
});

test("Gold motion is gated: glints on live cards, sweep on demand, both off for reduced motion", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../css/sobre.css", import.meta.url), "utf8");
  /* animation-name only: a shorthand here would outrank and reset the staggered delays */
  assert.match(css, /\.card\.is-viva \.card__destellos i \{ animation-name: destello; \}/);
  assert.match(css, /\.card__destellos i:nth-child\(2\) \{[^}]*animation-delay: 1\.3s/);
  assert.match(css, /\.card\.is-barrido \.card__barrido::after \{ animation: barrido/);
  assert.doesNotMatch(css, /is-revealed \.card__barrido/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.card__destellos,\s*\.card__barrido \{ display: none; \}/);
});

/* ---- Reveal effects, run from the real sobre.js source on stubs ---- */
const { readFileSync: leer } = await import("node:fs");
const { runInNewContext } = await import("node:vm");
const sobreSource = leer(new URL("../js/sobre.js", import.meta.url), "utf8");

function marcadoDe(id) {
  const ventana = { SOBRE_CATALOGO: catalogo, matchMedia: () => ({ matches: true }) };
  const documento = {
    createElement: () => ({ classList: { add() {} }, dataset: {}, innerHTML: "" }),
  };
  runInNewContext(leer(new URL("../js/carta.js", import.meta.url), "utf8"), { window: ventana, document: documento });
  return ventana.CartaWewin.crearCarta(catalogo.find((c) => c.id === id)).innerHTML;
}

test("a Gold card renders its frame, foil, pattern, glints and sweep; others do not", () => {
  const capas = ["card__oro--aro", "card__oro--claro", "card__oro--oscuro", "card__oro-patron", "card__destellos", "card__barrido"];
  const dorada = marcadoDe("headpat-gold");
  capas.forEach((capa) => assert.ok(dorada.includes(capa), capa));
  for (const id of ["headpat", "headpat-holo"]) {
    const otra = marcadoDe(id);
    capas.forEach((capa) => assert.ok(!otra.includes(capa), `${id} ${capa}`));
  }
});

function efectos({ reduced = false } = {}) {
  const inicio = sobreSource.indexOf("  function efectosRareza(");
  const fin = sobreSource.indexOf("  /* Cinta con el nombre de la rareza", inicio);
  assert.ok(inicio >= 0 && fin > inicio, "efectosRareza and efectosGold should be present in sobre.js");
  const emitidas = [];
  const cintas = [];
  const timers = [];
  const contexto = {
    REDUCED: reduced,
    RAREZAS: {
      comun: { nombre: "Común", color: "#d9cbb9" },
      rara: { nombre: "Rara", color: "#9fecd6" },
      epica: { nombre: "Épica", color: "#c8aefc" },
      legendaria: { nombre: "Legendaria", color: "#ffd27a" },
    },
    Chispas: { emitir: (...args) => emitidas.push(args) },
    rectoEnEscena: () => ({ x: 10, y: 20 }),
    mostrarSplash: (texto, color) => cintas.push([texto, color]),
    aclararEscena() {},
    setTimeout: (fn) => timers.push(fn),
    stage: { clientWidth: 400 },
    Math,
  };
  runInNewContext(`${sobreSource.slice(inicio, fin)}\nglobalThis.efectosRareza = efectosRareza;`, contexto);
  return { run: contexto.efectosRareza, emitidas, cintas };
}

function carta() {
  const clases = new Set();
  return { clases, classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) } };
}

for (const [rareza, texto] of [["comun", "¡Gold!"], ["rara", "¡Gold!"], ["epica", "¡Épica Gold!"], ["legendaria", "¡Legendaria Gold!"]]) {
  test(`revealing a Gold ${rareza} sweeps, throws gold dust and shows one ribbon`, () => {
    const { run, emitidas, cintas } = efectos();
    const el = carta();
    run(rareza, el, true);
    assert.ok(el.clases.has("is-barrido"));
    assert.ok(emitidas.some(([, , , opciones]) => opciones.colores.includes("#f3cd6b")));
    assert.deepEqual(cintas, [[texto, "#f3cd6b"]]);
  });
}

test("non-Gold reveals are unchanged: no sweep, plain rarity ribbon only for epica and legendaria", () => {
  for (const [rareza, cintasEsperadas] of [["comun", []], ["rara", []], ["epica", [["¡Épica!", "#c8aefc"]]], ["legendaria", [["¡Legendaria!", "#ffd27a"]]]]) {
    const { run, cintas } = efectos();
    const el = carta();
    run(rareza, el);
    assert.ok(!el.clases.has("is-barrido"), rareza);
    assert.deepEqual(cintas, cintasEsperadas, rareza);
  }
});

test("with reduced motion Gold throws no dust but still shows its ribbon", () => {
  const { run, emitidas, cintas } = efectos({ reduced: true });
  const el = carta();
  run("comun", el, true);
  assert.ok(!emitidas.some(([, , , opciones]) => opciones.colores.includes("#f3cd6b")));
  assert.deepEqual(cintas, [["¡Gold!", "#f3cd6b"]]);
});

test("every sway check goes through the shared special-variant predicate", () => {
  const albumSource = leer(new URL("../js/album.js", import.meta.url), "utf8");
  assert.doesNotMatch(sobreSource, /variante === "holo"/);
  assert.doesNotMatch(albumSource, /mece: datos\.variante === "holo"/);
  const cartaSource = leer(new URL("../js/carta.js", import.meta.url), "utf8");
  const ventana = {};
  runInNewContext(cartaSource.slice(cartaSource.indexOf("const esEspecial"), cartaSource.indexOf("\n", cartaSource.indexOf("const esEspecial"))) + "\nglobalThis.f = esEspecial;", ventana);
  assert.equal(ventana.f({ variante: "gold" }), true);
  assert.equal(ventana.f({ variante: "holo" }), true);
  assert.equal(ventana.f({ variante: "base" }), false);
  assert.equal(ventana.f({}), false);
});
