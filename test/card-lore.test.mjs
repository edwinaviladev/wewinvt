import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const lore = "Dicen que estos lentes aparecen justo antes de cada decisión cuestionable. Nadie sabe quién los deja ahí.";
const catalogSource = readFileSync(new URL("../js/sobre-data.js", import.meta.url), "utf8");
const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");

test("approved lore belongs to Modo cool and carries over to its Holo variant", () => {
  const context = {};
  runInNewContext(catalogSource, context);
  const catalog = context.SOBRE_CATALOGO;
  const base = catalog.find((carta) => carta.id === "lentes-oscuros");
  const holo = catalog.find((carta) => carta.id === "lentes-oscuros-holo");
  const anotherCard = catalog.find((carta) => carta.id === "angustia");

  assert.equal(base.lore, lore);
  assert.equal(holo.lore, lore);
  assert.equal(anotherCard.lore, undefined);
});

test("album detail inserts lore as text only when the card has it", () => {
  assert.match(albumSource, /\$\{datos\.lore \? '<p class="detalle-lore"><\/p>' : ""\}/);
  assert.match(albumSource, /cajaInfo\.querySelector\("\.detalle-lore"\)\.textContent = datos\.lore/);
});
