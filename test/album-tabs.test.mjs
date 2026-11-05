import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const filtersSource = readFileSync(new URL("../js/album-filters.js", import.meta.url), "utf8");
const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");
const albumHtml = readFileSync(new URL("../album.html", import.meta.url), "utf8");

const CATALOG = [
  { id: "a", rareza: "comun", variante: "base" },
  { id: "a-holo", rareza: "comun", variante: "holo", nombreVariante: "Holo" },
  { id: "b", rareza: "rara", variante: "base" },
  { id: "b-holo", rareza: "rara", variante: "holo", nombreVariante: "Holo" },
  { id: "c", rareza: "rara", variante: "base" },
  { id: "c-holo", rareza: "rara", variante: "holo", nombreVariante: "Holo" },
];

function createDom() {
  const dom = { activeElement: null, nodes: new Map(), tabs: [], layoutReads: [] };

  dom.element = (tagName) => {
    let html = "";
    const node = {
      tagName,
      children: [],
      attributes: {},
      dataset: {},
      listeners: {},
      style: {
        setProperty(name, value) {
          this[name] = value;
        },
      },
      classList: { add() {}, remove() {} },
      hidden: false,
      textContent: "",
      value: "",
      checked: false,
      tabIndex: 0,
      get offsetWidth() {
        dom.layoutReads.push(node.style.width);
        return 0;
      },
      get innerHTML() {
        return html;
      },
      set innerHTML(value) {
        html = value;
        if (value === "") node.children = [];
      },
      append(...items) {
        node.children.push(...items);
      },
      appendChild(item) {
        node.children.push(item);
        return item;
      },
      setAttribute(name, value) {
        node.attributes[name] = value;
      },
      addEventListener(name, listener) {
        node.listeners[name] = listener;
      },
      focus() {
        dom.activeElement = node;
      },
      querySelector(selector) {
        if (selector === "[data-tab-cuenta]") {
          return node.children.find((child) => child.dataset.tabCuenta !== undefined) || null;
        }
        if (selector === ".album-grid") {
          node.grid ??= dom.element("div");
          return node.grid;
        }
        return null;
      },
      querySelectorAll(selector) {
        return selector === "[role=tab]" ? node.children.filter((child) => child.attributes.role === "tab") : [];
      },
    };
    return node;
  };

  dom.get = (selector) => {
    if (!dom.nodes.has(selector)) dom.nodes.set(selector, dom.element("div"));
    return dom.nodes.get(selector);
  };
  return dom;
}

async function mountAlbum({ search = "", owned = ["a", "b", "a-holo"], catalog = CATALOG } = {}) {
  const dom = createDom();
  const replaced = [];
  dom.get("[data-vacio]").textContent = "Aún no tienes cartas";

  const document = {
    querySelector: dom.get,
    createElement: dom.element,
    getElementById: (id) => dom.get("[data-tabs]").children.find((tab) => tab.id === id) || null,
    addEventListener() {},
    get activeElement() {
      return dom.activeElement;
    },
    contains: () => true,
  };
  const window = {
    SOBRE_CATALOGO: catalog,
    CartaWewin: {
      crearCarta(datos) {
        const card = dom.element("button");
        card.carta = datos;
        return card;
      },
      etiquetaCarta: (datos) => datos.id,
    },
    TwitchAuth: { tokenValido: async () => null },
  };
  runInNewContext(filtersSource, { window });

  const coleccion = JSON.stringify(Object.fromEntries(owned.map((id) => [id, 1])));
  runInNewContext(albumSource, {
    window,
    document,
    URLSearchParams,
    location: { search, pathname: "/album", origin: "https://wewinvt.test" },
    history: { replaceState: (_state, _title, url) => replaced.push(url) },
    localStorage: { getItem: (key) => (key === "wewinvt_coleccion" ? coleccion : null) },
    fetch: async () => ({ ok: false }),
    setTimeout,
  });
  await new Promise((resolve) => setImmediate(resolve));

  const tab = (id) => dom.get("[data-tabs]").children.find((item) => item.dataset.coleccion === id);
  const cards = () => dom.get("[data-album]").children.flatMap((section) => section.grid.children);
  const press = (key, modifiers = {}) => {
    let prevented = false;
    dom.get("[data-tabs]").listeners.keydown({ key, preventDefault: () => (prevented = true), ...modifiers });
    return prevented;
  };
  const setFilters = (rareza, soloFaltantes) => {
    dom.get("[data-filtro-rareza]").value = rareza;
    dom.get("[data-filtro-faltantes]").checked = soloFaltantes;
    dom.get("[data-filtro-rareza]").listeners.change();
  };

  return {
    dom,
    replaced,
    tab,
    press,
    setFilters,
    selected: () => dom.get("[data-tabs]").children.find((item) => item.attributes["aria-selected"] === "true").dataset.coleccion,
    ownedCards: () => cards().filter((card) => card.carta).map((card) => card.carta.id),
    cardCount: () => cards().length,
    progress: () => `${dom.get("[data-total-obtenidas]").textContent}/${dom.get("[data-total-cartas]").textContent}`,
    filters: () => [dom.get("[data-filtro-rareza]").value, dom.get("[data-filtro-faltantes]").checked],
    bar: () => dom.get("[data-barra]"),
    segments: () =>
      dom.get("[data-barra]").children.map((segment) => [
        segment.dataset.rareza,
        segment.style.flexGrow,
        segment.children[0].style.width,
        segment.attributes["aria-hidden"],
      ]),
    seriesCount: () => dom.get("[data-conjuntos]").children.length,
  };
}

test("album opens on Normales with only base cards and its own progress", async () => {
  const album = await mountAlbum();

  assert.equal(album.selected(), "normales");
  assert.equal(album.progress(), "2/3");
  assert.equal(album.dom.get("[data-porcentaje]").textContent, "67%");
  assert.equal(album.cardCount(), 3);
  assert.deepEqual([...album.ownedCards()].sort(), ["a", "b"]);
  assert.equal(album.dom.get("[data-novedades]").hidden, false);
  assert.equal(album.dom.get("[data-panel]").attributes["aria-labelledby"], "album-tab-normales");
  assert.equal(album.tab("normales").tabIndex, 0);
  assert.equal(album.tab("holo").tabIndex, -1);
  assert.equal(album.tab("holo").querySelector("[data-tab-cuenta]").textContent, "1/3");

  for (const id of ["normales", "holo"]) {
    assert.equal(album.tab(id).attributes.role, "tab");
    assert.equal(album.tab(id).attributes["aria-controls"], "album-panel");
  }
  assert.match(albumHtml, /id="album-panel"[^>]*role="tabpanel"|role="tabpanel"[^>]*id="album-panel"/);
});

test("clicking the Holo tab scopes the album and updates the URL without history", async () => {
  const album = await mountAlbum();

  album.tab("holo").listeners.click();
  assert.equal(album.selected(), "holo");
  assert.equal(album.progress(), "1/3");
  assert.equal(album.cardCount(), 3);
  assert.deepEqual(album.ownedCards(), ["a-holo"]);
  assert.equal(album.dom.get("[data-novedades]").hidden, true);
  assert.equal(album.dom.get("[data-panel]").attributes["aria-labelledby"], "album-tab-holo");
  assert.equal(album.tab("holo").tabIndex, 0);
  assert.equal(album.tab("normales").tabIndex, -1);

  album.tab("normales").listeners.click();
  assert.deepEqual(album.replaced, ["/album?coleccion=holo", "/album"]);
});

test("each collection keeps its own filters and clearing affects only the active one", async () => {
  const album = await mountAlbum();

  album.tab("holo").listeners.click();
  album.setFilters("rara", true);
  assert.equal(album.cardCount(), 2);
  assert.deepEqual(album.filters(), ["rara", true]);

  album.tab("normales").listeners.click();
  assert.deepEqual(album.filters(), ["all", false]);
  assert.equal(album.cardCount(), 3);

  album.setFilters("comun", false);
  assert.equal(album.cardCount(), 1);
  album.dom.get("[data-limpiar-filtros]").listeners.click();
  assert.deepEqual(album.filters(), ["all", false]);
  assert.equal(album.cardCount(), 3);

  album.tab("holo").listeners.click();
  assert.deepEqual(album.filters(), ["rara", true]);
  assert.equal(album.cardCount(), 2);
});

test("arrow, Home and End keys switch tabs with wraparound and move focus", async () => {
  const album = await mountAlbum();

  assert.equal(album.press("ArrowLeft"), true);
  assert.equal(album.selected(), "holo");
  assert.equal(album.dom.activeElement, album.tab("holo"));

  album.press("ArrowRight");
  assert.equal(album.selected(), "normales");
  assert.equal(album.dom.activeElement, album.tab("normales"));

  album.press("End");
  assert.equal(album.selected(), "holo");
  album.press("Home");
  assert.equal(album.selected(), "normales");
});

test("browser shortcuts with modifier keys are left alone", async () => {
  const album = await mountAlbum();

  for (const modifier of ["altKey", "ctrlKey", "metaKey"]) {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      assert.equal(album.press(key, { [modifier]: true }), false, `${modifier}+${key}`);
      assert.equal(album.selected(), "normales", `${modifier}+${key}`);
    }
  }
  assert.deepEqual(album.replaced, []);
});

test("other keys do not switch tabs", async () => {
  const album = await mountAlbum();

  assert.equal(album.press("Tab"), false);
  assert.equal(album.selected(), "normales");
});

test("the URL selects a known collection and ignores anything else", async () => {
  assert.equal((await mountAlbum({ search: "?coleccion=holo" })).selected(), "holo");

  const unknown = await mountAlbum({ search: "?coleccion=%3Cimg%20onerror%3Dx%3E" });
  assert.equal(unknown.selected(), "normales");
  assert.equal(unknown.progress(), "2/3");
});

test("each collection shows its own empty message", async () => {
  const album = await mountAlbum({ owned: ["a"] });
  const message = album.dom.get("[data-vacio]");

  assert.equal(message.hidden, true);

  album.tab("holo").listeners.click();
  assert.equal(message.hidden, false);
  assert.equal(message.textContent, "Aún no tienes cartas Holo. Cada carta puede salir en versión Holo al canjear el gacha.");

  album.tab("normales").listeners.click();
  assert.equal(message.hidden, true);
  assert.equal(message.textContent, "Aún no tienes cartas");
});

test("bar segments persist across renders so their fill can animate", async () => {
  const album = await mountAlbum();
  const [rara, comun] = album.bar().children;

  assert.deepEqual(album.dom.layoutReads, [undefined, undefined]);
  assert.equal(rara.children[0].style.width, "50%");
  assert.equal(comun.children[0].style.width, "100%");

  album.tab("holo").listeners.click();
  assert.equal(album.bar().children[0], rara);
  assert.equal(album.bar().children[1], comun);
  assert.equal(rara.children[0].style.width, "0%");
  assert.equal(comun.children[0].style.width, "100%");

  album.setFilters("rara", true);
  assert.equal(album.bar().children[0], rara);
  assert.equal(album.dom.layoutReads.length, 2);
});

test("bar segments are rebuilt when the rarities in a collection differ", async () => {
  const album = await mountAlbum({
    catalog: [
      { id: "a", rareza: "comun", variante: "base" },
      { id: "b", rareza: "rara", variante: "base" },
      { id: "a-holo", rareza: "comun", variante: "holo", nombreVariante: "Holo" },
    ],
  });

  assert.deepEqual(Array.from(album.bar().children, (segment) => segment.dataset.rareza), ["rara", "comun"]);
  album.tab("holo").listeners.click();
  assert.deepEqual(Array.from(album.bar().children, (segment) => segment.dataset.rareza), ["comun"]);
});

test("the Ver álbum Holo button activates and focuses the Holo tab", async () => {
  const album = await mountAlbum();

  assert.equal(album.dom.get("[data-ver-holo]").hidden, false);
  album.dom.get("[data-ver-holo]").listeners.click();
  assert.equal(album.selected(), "holo");
  assert.equal(album.dom.activeElement, album.tab("holo"));
});

test("the Ver álbum Holo button hides when the catalog has no Holo cards", async () => {
  const album = await mountAlbum({ catalog: CATALOG.filter((carta) => carta.variante === "base"), owned: ["a"] });

  assert.equal(album.dom.get("[data-ver-holo]").hidden, true);
  assert.equal(album.tab("holo"), undefined);
  album.dom.get("[data-ver-holo]").listeners.click();
  assert.equal(album.selected(), "normales");
});

test("the progress bar has one segment per rarity sized by the active collection", async () => {
  const album = await mountAlbum();

  assert.equal(album.bar().attributes["aria-valuenow"], "67");
  assert.deepEqual(album.segments(), [
    ["rara", "2", "50%", "true"],
    ["comun", "1", "100%", "true"],
  ]);

  album.tab("holo").listeners.click();
  assert.equal(album.bar().attributes["aria-valuenow"], "33");
  assert.deepEqual(album.segments(), [
    ["rara", "2", "0%", "true"],
    ["comun", "1", "100%", "true"],
  ]);
});

test("the progress bar keeps its accessible name and hides segments from assistive tech", () => {
  assert.match(albumHtml, /role="progressbar"[^>]*aria-label="Progreso de la colección"|aria-label="Progreso de la colección"[^>]*role="progressbar"/);
  assert.ok(!albumHtml.includes("data-barra-fill"), "segments are built by js/album.js, not authored");
});

test("series progress renders only when the collection has two or more series", async () => {
  const single = await mountAlbum();
  assert.equal(single.seriesCount(), 0);

  const twoSeries = CATALOG.map((carta) => ({
    ...carta,
    conjunto: carta.rareza === "comun" ? { id: "s1", nombre: "Serie 1" } : { id: "s2", nombre: "Serie 2" },
  }));
  const several = await mountAlbum({ catalog: twoSeries });
  assert.equal(several.seriesCount(), 2);

  several.tab("holo").listeners.click();
  assert.equal(several.seriesCount(), 2);

  const oneInHolo = twoSeries.map((carta) => (carta.variante === "holo" ? { ...carta, conjunto: { id: "s1", nombre: "Serie 1" } } : carta));
  const mixed = await mountAlbum({ catalog: oneInHolo });
  assert.equal(mixed.seriesCount(), 2);
  mixed.tab("holo").listeners.click();
  assert.equal(mixed.seriesCount(), 0);
});
