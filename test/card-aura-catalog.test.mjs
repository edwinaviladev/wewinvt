import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import "../js/sobre-data.js";
import "../js/sorteo.js";

const catalogo = globalThis.SOBRE_CATALOGO;
const { construirCartas } = globalThis.SOBRE_SORTEO;

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const bases = catalogo.filter((c) => c.variante === "base");
const aura = catalogo.filter((c) => c.variante === "aura");
const antesDeAura = catalogo.filter((c) => c.variante !== "aura");

test("every base card has exactly one Aura version with the same rarity and art", () => {
  assert.equal(aura.length, bases.length);
  bases.forEach((base) => {
    const versiones = aura.filter((c) => c.grupoId === base.id);
    assert.equal(versiones.length, 1, base.id);
    assert.equal(versiones[0].id, `${base.id}-aura`);
    assert.equal(versiones[0].nombreVariante, "Aura");
    assert.equal(versiones[0].rareza, base.rareza);
    assert.equal(versiones[0].src, base.src);
  });
});

test("Aura entries come after every other entry, in base order", () => {
  const primeraAura = catalogo.findIndex((c) => c.variante === "aura");
  assert.equal(primeraAura, antesDeAura.length);
  assert.ok(catalogo.slice(primeraAura).every((c) => c.variante === "aura"));
  assert.deepEqual(aura.map((c) => c.grupoId), bases.map((c) => c.id));
  assert.equal(catalogo.length, bases.length * 4);
});

test("existing base, holo and gold ids keep their catalog positions", () => {
  const baseYHolo = bases.flatMap((c) => [c.id, `${c.id}-holo`]);
  const gold = bases.map((c) => `${c.id}-gold`);
  assert.deepEqual(antesDeAura.map((c) => c.id), [...baseYHolo, ...gold]);
  assert.equal(catalogo[0].id, "lentes-oscuros");
  assert.equal(catalogo[1].id, "lentes-oscuros-holo");
  assert.equal(catalogo[baseYHolo.length].id, "lentes-oscuros-gold");
});

test("every group weighs 84 base, 10 holo, 4 aura and 2 gold", () => {
  const grupos = Map.groupBy(catalogo, (c) => c.grupoId);
  assert.equal(grupos.size, bases.length);
  for (const [grupo, variantes] of grupos) {
    const pesos = Object.fromEntries(variantes.map((c) => [c.variante, c.pesoVariante]));
    assert.deepEqual(pesos, { base: 84, holo: 10, gold: 2, aura: 4 }, grupo);
  }
});

test("a pack can yield an Aura card when the dice land on the last weight band", () => {
  const cartas = construirCartas(catalogo, { random: () => 0.995 });
  assert.equal(cartas.length, 3);
  cartas.forEach((c) => assert.equal(c.variante, "aura"));
  assert.equal(new Set(cartas.map((c) => c.grupoId)).size, 3);
});

test("Aura odds are close to 4% over many draws", () => {
  let estado = 24680;
  const random = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
  let total = 0;
  let auras = 0;
  for (let i = 0; i < 20000; i++) {
    construirCartas(catalogo, { random }).forEach((c) => {
      total++;
      if (c.variante === "aura") auras++;
    });
  }
  const tasa = auras / total;
  assert.ok(tasa > 0.03 && tasa < 0.05, `tasa Aura ${tasa}`);
});

/* ---- Markup, rendered by the real carta.js on stubs ---- */
function marcadoDe(id) {
  const ventana = { SOBRE_CATALOGO: catalogo, matchMedia: () => ({ matches: true }) };
  const documento = {
    createElement: () => ({ classList: { add() {} }, dataset: {}, innerHTML: "" }),
  };
  runInNewContext(leer("../js/carta.js"), { window: ventana, document: documento });
  return ventana.CartaWewin.crearCarta(catalogo.find((c) => c.id === id)).innerHTML;
}

test("an Aura card renders its energy layers behind, inside and in front of the face; others do not", () => {
  const capas = ["card__aura", "aura__halo", "aura__humo--1", "aura__humo--2", "aura__anillo", "aura__onda", "aura__frente", "aura-fondo"];
  const conAura = marcadoDe("headpat-aura");
  capas.forEach((capa) => assert.ok(conAura.includes(capa), capa));
  assert.equal(conAura.match(/class="aura__chispa"/g).length, 12);
  const decorativas = conAura.match(/<[^>]+(?:card__aura|aura__frente|aura-fondo)[^>]*>/g);
  assert.equal(decorativas.length, 3);
  decorativas.forEach((etiqueta) => assert.match(etiqueta, /aria-hidden="true"/));

  /* Halo y llamas van detrás de la cara; las brasas, después de ella */
  assert.ok(conAura.indexOf("card__aura") < conAura.indexOf("card__inner"));
  assert.ok(conAura.indexOf("aura__frente") > conAura.lastIndexOf("card__brillo"));
  assert.ok(conAura.indexOf("aura-fondo") < conAura.indexOf("card__arte"));

  for (const id of ["headpat", "headpat-holo", "headpat-gold"]) {
    const otra = marcadoDe(id);
    capas.forEach((capa) => assert.ok(!otra.includes(capa), `${id} ${capa}`));
  }
});

test("Aura embers have deterministic delays and drift", () => {
  assert.equal(marcadoDe("headpat-aura"), marcadoDe("headpat-aura"));
  const brasas = [...marcadoDe("headpat-aura").matchAll(/style="left:(-?\d+)%;--d:([\d.]+)s;--x:(-?\d+)px"/g)];
  assert.equal(brasas.length, 12);
  assert.deepEqual(brasas.map((b) => b[2]).slice(0, 3), ["0.00", "0.43", "0.86"]);
  brasas.forEach(([, izquierda, , deriva]) => assert.equal(Math.sign(Number(deriva)), Number(izquierda) < 50 ? -1 : 1));
});

/* ---- Look and motion gates, from the real stylesheet ---- */
const css = leer("../css/sobre.css");

test("Aura colors follow the rarity", () => {
  for (const [rareza, nucleo, color] of [
    ["rara", "#dcfff6", "#34e6c0"],
    ["epica", "#f1e4ff", "#a764ff"],
    ["legendaria", "#fff0b8", "#ff8a2c"],
  ]) {
    assert.ok(css.includes(`.card[data-variante="aura"][data-rareza="${rareza}"] { --aura-nucleo: ${nucleo}; --aura-color: ${color}; }`), rareza);
  }
  assert.match(css, /\.card\[data-variante="aura"\] \{[^}]*--aura-color: #bcdcff;/);
});

test("Aura flames and embers only move on live cards and are hidden otherwise", () => {
  assert.match(css, /\.card\.is-viva \.aura__humo--1 i \{ animation: aura-sube/);
  assert.match(css, /\.card\.is-viva \.aura__humo--2 i \{ animation: aura-sube/);
  assert.match(css, /\.card\.is-viva \.aura__chispa \{ animation: aura-chispa/);
  assert.match(css, /\.card:not\(\.is-viva\) \.aura__humo,\s*\.card:not\(\.is-viva\) \.aura__chispa \{ display: none; \}/);
  /* `aura` ya es la carga previa a revelar: las nuevas animaciones no la pisan */
  assert.equal(css.match(/@keyframes aura \{/g).length, 1);
});

test("Aura layers stay hidden until the card is revealed", () => {
  assert.match(css, /\.card__aura,\s*\.aura__frente \{[^}]*opacity: 0;/);
  assert.match(css, /\.card\.is-revealed \.card__aura,\s*\.card\.is-revealed \.aura__frente \{ opacity: 1; \}/);
});

test("with reduced motion Aura keeps a still halo and ring, with no flames, embers or wave", () => {
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.card\[data-variante="aura"\],\s*\.card\[data-variante="aura"\] \* \{ animation: none !important; \}\s*\.aura__humo,\s*\.aura__chispa,\s*\.aura__onda \{ display: none !important; \}/);
});

test("the Aura card sheen blends like Holo and Gold", () => {
  assert.match(css, /\.card\[data-variante="aura"\] \.card__brillo \{ mix-blend-mode: overlay; \}/);
});

test("the album keeps the Aura card shadow and clips the page horizontally", () => {
  const album = leer("../css/album.css");
  assert.match(album, /\.album-seccion \.card\[data-variante="aura"\] \{\s*--sombra-carta:/);
  assert.match(album, /body\.album-page \{[^}]*overflow-x: clip;/);
});
