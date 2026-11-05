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
  assert.match(css, /\.card\.is-viva \.card__destellos i \{ animation: destello/);
  assert.match(css, /\.card\.is-barrido \.card__barrido::after \{ animation: barrido/);
  assert.doesNotMatch(css, /is-revealed \.card__barrido/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.card__destellos,\s*\.card__barrido \{ display: none; \}/);
});
