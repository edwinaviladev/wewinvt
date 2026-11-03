import { test } from "node:test";
import assert from "node:assert/strict";
import "../js/sobre-data.js";
import "../js/sorteo.js";

const catalogo = globalThis.SOBRE_CATALOGO;
const { construirCartas } = globalThis.SOBRE_SORTEO;

/* PRNG determinista (mulberry32) */
function semilla(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("3 cartas del catálogo con grupos distintos", () => {
  for (let s = 1; s <= 2000; s++) {
    const cartas = construirCartas(catalogo, { random: semilla(s) });
    assert.equal(cartas.length, 3);
    cartas.forEach((c) => assert.ok(catalogo.includes(c)));
    assert.equal(new Set(cartas.map((c) => c.grupoId)).size, 3);
  }
});

test("forzado se respeta en la tercera carta", () => {
  for (const tier of ["rara", "epica", "legendaria"]) {
    for (let s = 1; s <= 300; s++) {
      const cartas = construirCartas(catalogo, { forzado: tier, random: semilla(s) });
      assert.equal(cartas[2].rareza, tier);
    }
  }
});

test("la tercera carta nunca es común sin forzar", () => {
  for (let s = 1; s <= 1000; s++) {
    assert.notEqual(construirCartas(catalogo, { random: semilla(s) })[2].rareza, "comun");
  }
});
