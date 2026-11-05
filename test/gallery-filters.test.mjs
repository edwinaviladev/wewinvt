import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const dataSource = readFileSync(new URL("../js/data.js", import.meta.url), "utf8");
const gallerySource = readFileSync(new URL("../js/gallery.js", import.meta.url), "utf8");

function element(tagName) {
  return {
    tagName,
    children: [],
    listeners: {},
    attributes: {},
    dataset: {},
    style: {},
    hidden: false,
    textContent: "",
    value: "",
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function mountGallery(search) {
  const window = {};
  runInNewContext(dataSource, { window });

  const emoteList = element("ul");
  const fanartList = element("ul");
  const fanartSection = element("section");
  const emoteSection = element("section");
  fanartSection.dataset.gallerySection = "fanart";
  emoteSection.dataset.gallerySection = "emote";
  fanartSection.querySelector = (selector) => (selector === "ul" ? fanartList : null);
  emoteSection.querySelector = (selector) => (selector === "ul" ? emoteList : null);

  const typeFilter = element("select");
  const artistFilter = element("select");
  typeFilter.value = "all";
  artistFilter.value = "all";
  const clearFilters = element("button");
  const filterCount = element("p");
  const filterEmpty = element("p");
  filterEmpty.hidden = true;

  const lightbox = element("div");
  const lightboxImage = element("img");
  const caption = element("p");
  const closeButton = element("button");
  const prevButton = element("button");
  const nextButton = element("button");
  const lightboxElements = {
    "[data-lightbox-img]": lightboxImage,
    "[data-lightbox-caption]": caption,
    "[data-lightbox-close]": closeButton,
    "[data-lightbox-prev]": prevButton,
    "[data-lightbox-next]": nextButton,
  };
  lightbox.querySelector = (selector) => lightboxElements[selector];

  const document = {
    body: { style: {} },
    activeElement: null,
    listeners: {},
    querySelector(selector) {
      const nodes = {
        "[data-emote-list]": emoteList,
        "[data-fanart-list]": fanartList,
        "[data-lightbox]": lightbox,
        "[data-gallery-type-filter]": typeFilter,
        "[data-gallery-artist-filter]": artistFilter,
        "[data-gallery-clear]": clearFilters,
        "[data-gallery-filter-count]": filterCount,
        "[data-gallery-empty]": filterEmpty,
      };
      return nodes[selector] || null;
    },
    querySelectorAll: (selector) => (selector === "[data-gallery-section]" ? [fanartSection, emoteSection] : []),
    createElement: (tagName) => element(tagName),
    createTextNode: (textContent) => ({ textContent }),
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    removeEventListener() {},
    contains: () => true,
  };

  const context = { document, window };
  if (search !== undefined) Object.assign(context, { location: { search }, URLSearchParams });
  runInNewContext(gallerySource, context);
  return {
    window,
    document,
    emoteList,
    fanartList,
    emoteSection,
    fanartSection,
    typeFilter,
    artistFilter,
    clearFilters,
    filterCount,
    filterEmpty,
    lightbox,
    lightboxImage,
  };
}

test("artist and type filters combine, update counts, and reset", () => {
  const { window, emoteList, fanartList, emoteSection, fanartSection, typeFilter, artistFilter, clearFilters, filterCount, filterEmpty } = mountGallery();
  const worksByVtkairo = [...window.WEWIN.fanarts, ...window.WEWIN.emotes].filter((work) => work.artista === "vtkairo");

  artistFilter.value = "vtkairo";
  artistFilter.listeners.change();
  assert.equal(Number(filterCount.textContent.split(" ")[0]), worksByVtkairo.length);
  assert.equal(emoteSection.hidden, false);
  assert.equal(fanartSection.hidden, false);

  typeFilter.value = "fanart";
  typeFilter.listeners.change();
  const fanartsByVtkairo = window.WEWIN.fanarts.filter((work) => work.artista === "vtkairo");
  assert.equal(emoteSection.hidden, true);
  assert.equal(fanartSection.hidden, false);
  assert.equal(Number(filterCount.textContent.split(" ")[0]), fanartsByVtkairo.length);
  assert.equal(fanartList.children.filter((item) => !item.hidden).length, fanartsByVtkairo.length);
  assert.equal(emoteList.children.filter((item) => !item.hidden).length, 0);
  assert.equal(filterEmpty.hidden, true);

  clearFilters.listeners.click();
  assert.equal(typeFilter.value, "all");
  assert.equal(artistFilter.value, "all");
  assert.equal(fanartList.children.filter((item) => !item.hidden).length, window.WEWIN.fanarts.length);
  assert.equal(emoteList.children.filter((item) => !item.hidden).length, window.WEWIN.emotes.length);
});

test("filtered lightbox navigation stays within the visible works", () => {
  const { window, fanartList, typeFilter, artistFilter, lightbox, lightboxImage, document } = mountGallery();
  const visibleFanarts = window.WEWIN.fanarts.filter((work) => work.artista === "vtkairo");

  typeFilter.value = "fanart";
  artistFilter.value = "vtkairo";
  artistFilter.listeners.change();
  const firstVisible = fanartList.children.find((item) => !item.hidden);
  firstVisible.children[0].listeners.click();
  assert.equal(lightbox.hidden, false);
  assert.equal(lightboxImage.src, visibleFanarts[0].src);

  document.listeners.keydown({ key: "ArrowRight", preventDefault() {} });
  assert.equal(lightboxImage.src, visibleFanarts[1].src);
});

test("combined filters show the no-results message when nothing matches", () => {
  const { artistFilter, typeFilter, filterEmpty, filterCount } = mountGallery();

  artistFilter.value = "koru";
  typeFilter.value = "emote";
  artistFilter.listeners.change();

  assert.equal(filterCount.textContent, "0 obras");
  assert.equal(filterEmpty.hidden, false);
});

test("?artista= preselects an existing artist and filters the gallery", () => {
  const { window, artistFilter, filterCount, fanartList } = mountGallery("?artista=vtkairo");
  const works = [...window.WEWIN.fanarts, ...window.WEWIN.emotes].filter((work) => work.artista === "vtkairo");

  assert.equal(artistFilter.value, "vtkairo");
  assert.equal(filterCount.textContent, works.length + (works.length === 1 ? " obra" : " obras"));
  assert.ok(fanartList.children.some((item) => item.hidden));
});

test("?artista= with an unknown, partial or empty name is ignored", () => {
  for (const search of ["?artista=nadie", "?artista=vtkai", "?artista=", "?otro=1", ""]) {
    const { window, artistFilter, filterCount } = mountGallery(search);
    const total = window.WEWIN.emotes.length + window.WEWIN.fanarts.length;
    assert.equal(artistFilter.value, "all", search);
    assert.equal(filterCount.textContent, total + " obras", search);
  }
});
