import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../js/home-cards.js", import.meta.url), "utf8");

function mount(catalog) {
  const built = [];
  const children = [];
  const container = { appendChild: (child) => children.push(child) };
  const window = {
    SOBRE_CATALOGO: catalog,
    location: { href: "" },
    CartaWewin: {
      crearCarta(datos, opciones) {
        const card = {
          attributes: {},
          listeners: {},
          setAttribute(name, value) {
            this.attributes[name] = value;
          },
          addEventListener(name, listener) {
            this.listeners[name] = listener;
          },
        };
        built.push({ datos, opciones, card });
        return card;
      },
      etiquetaCarta: (datos) => `${datos.nombre} (${datos.rareza})`,
    },
  };
  const document = {
    querySelector: (selector) => (selector === "[data-home-cards]" ? container : null),
  };

  runInNewContext(source, { document, window });
  return { built, children, window };
}

test("home preview renders three catalog cards and opens the album", () => {
  const catalog = [
    { id: "lentes-oscuros", nombre: "Modo cool", rareza: "comun" },
    { id: "comic-comunidad", nombre: "Gymbro", rareza: "epica" },
    { id: "proyectado", nombre: "Proyectado", rareza: "legendaria" },
  ];
  const { built, children, window } = mount(catalog);

  assert.deepEqual(built.map(({ datos }) => datos.id), ["lentes-oscuros", "comic-comunidad", "proyectado"]);
  assert.equal(children.length, 3);
  assert.ok(built.every(({ opciones }) => opciones.soloFrente && opciones.plana));
  assert.match(built[0].card.attributes["aria-label"], /Modo cool/);

  built[0].card.listeners.click();
  assert.equal(window.location.href, "album.html");
});

test("home preview stays empty if a featured catalog card is missing", () => {
  const { built, children } = mount([{ id: "lentes-oscuros", nombre: "Modo cool" }]);

  assert.equal(built.length, 0);
  assert.equal(children.length, 0);
});
