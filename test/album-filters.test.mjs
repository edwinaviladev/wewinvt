import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const filtersSource = readFileSync(new URL("../js/album-filters.js", import.meta.url), "utf8");
const catalogSource = readFileSync(new URL("../js/sobre-data.js", import.meta.url), "utf8");
const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");
const albumHtml = readFileSync(new URL("../album.html", import.meta.url), "utf8");

function filters() {
  const window = {};
  runInNewContext(filtersSource, { window });
  return window.AlbumFilters;
}

test("missing and rarity filters combine without changing the source catalog", () => {
  const catalog = [
    { id: "common-owned", rareza: "comun" },
    { id: "common-missing", rareza: "comun" },
    { id: "rare-owned", rareza: "rara" },
    { id: "rare-missing", rareza: "rara" },
  ];
  const owned = new Set(["common-owned", "rare-owned"]);
  const originalIds = catalog.map((carta) => carta.id);
  const filter = filters();

  const faltantes = filter.filtrar(catalog, { soloFaltantes: true }, (id) => owned.has(id));
  const faltantesRaras = filter.filtrar(
    catalog,
    { rareza: "rara", soloFaltantes: true },
    (id) => owned.has(id)
  );

  assert.deepEqual(Array.from(faltantes, (carta) => carta.id), ["common-missing", "rare-missing"]);
  assert.deepEqual(Array.from(faltantesRaras, (carta) => carta.id), ["rare-missing"]);
  assert.deepEqual(catalog.map((carta) => carta.id), originalIds);
});

test("set progress counts owned catalog entries by set", () => {
  const catalogContext = {};
  runInNewContext(catalogSource, catalogContext);
  const catalog = catalogContext.SOBRE_CATALOGO;
  const owned = new Set([catalog[0].id, catalog[1].id]);
  const progress = filters().progresoPorConjunto(catalog, (id) => owned.has(id));

  assert.equal(progress.length, 1);
  assert.equal(progress[0].id, "serie-1");
  assert.equal(progress[0].nombre, "Serie 1");
  assert.equal(progress[0].total, catalog.length);
  assert.equal(progress[0].obtenidas, 2);
});

test("album page loads the filters before its renderer and exposes controls", () => {
  assert.ok(albumHtml.indexOf("js/album-filters.js") < albumHtml.indexOf("js/album.js"));
  assert.match(albumHtml, /data-conjuntos/);
  assert.match(albumHtml, /data-filtro-rareza/);
  assert.match(albumHtml, /data-filtro-faltantes/);
  assert.match(albumSource, /AlbumFilters\.filtrar/);
  assert.match(albumSource, /AlbumFilters\.progresoPorConjunto/);
});

test("collection id treats missing and base variants as normales", () => {
  const filter = filters();

  assert.equal(filter.coleccionDe({ id: "a" }), "normales");
  assert.equal(filter.coleccionDe({ id: "a", variante: "base" }), "normales");
  assert.equal(filter.coleccionDe({ id: "a", variante: "holo" }), "holo");
});

test("collections list puts normales first and derives variants from the data", () => {
  const filter = filters();
  const catalog = [
    { id: "a", variante: "holo", nombreVariante: "Holo" },
    { id: "b", variante: "base" },
    { id: "c", variante: "prisma" },
    { id: "d", variante: "holo", nombreVariante: "Holo" },
  ];

  assert.deepEqual(JSON.parse(JSON.stringify(filter.colecciones(catalog))), [
    { id: "normales", nombre: "Normales" },
    { id: "holo", nombre: "Holo" },
    { id: "prisma", nombre: "prisma" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(filter.colecciones([]))), [{ id: "normales", nombre: "Normales" }]);
});

test("real catalog yields normales and holo collections", () => {
  const catalogContext = {};
  runInNewContext(catalogSource, catalogContext);
  const lista = filters().colecciones(catalogContext.SOBRE_CATALOGO);

  assert.deepEqual(Array.from(lista, (c) => c.id), ["normales", "holo"]);
});

test("collection resolution falls back to normales for unknown or missing ids", () => {
  const filter = filters();
  const lista = filter.colecciones([{ id: "a", variante: "holo", nombreVariante: "Holo" }]);

  assert.equal(filter.resolverColeccion("holo", lista), "holo");
  assert.equal(filter.resolverColeccion("nope", lista), "normales");
  assert.equal(filter.resolverColeccion("<img onerror=x>", lista), "normales");
  assert.equal(filter.resolverColeccion(null, lista), "normales");
  assert.equal(filter.resolverColeccion(undefined, lista), "normales");
  assert.equal(filter.resolverColeccion("constructor", lista), "normales");
});
