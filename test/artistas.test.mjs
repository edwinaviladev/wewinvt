import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const dataSource = readFileSync(new URL("../js/data.js", import.meta.url), "utf8");
const artistasSource = readFileSync(new URL("../js/artistas.js", import.meta.url), "utf8");

function element(tagName) {
  return {
    tagName,
    children: [],
    attributes: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      this.children.push(...children);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function mountArtists() {
  const window = {};
  runInNewContext(dataSource, { window });
  const container = element("div");
  const document = {
    querySelector: (selector) => (selector === "[data-artistas]" ? container : null),
    createElement: (tagName) => element(tagName),
  };

  runInNewContext(artistasSource, { window, document, URL });
  return { window, container };
}

function titleText(section) {
  return section.children[0].children[0].textContent;
}

function headerLink(section) {
  return section.children[0].children.find((child) => child.tagName === "a");
}

function mountWithData(data) {
  const container = element("div");
  const document = {
    querySelector: (selector) => (selector === "[data-artistas]" ? container : null),
    createElement: (tagName) => element(tagName),
  };
  runInNewContext(artistasSource, { window: { WEWIN: data }, document, URL });
  return container;
}

test("artists page groups every emote and fanart by credited artist", () => {
  const { window, container } = mountArtists();
  const totalWorks = container.children.reduce((total, section) => total + section.children[1].children.length, 0);

  assert.equal(totalWorks, window.WEWIN.emotes.length + window.WEWIN.fanarts.length);
  assert.ok(container.children.length > 1);

  const skyshinez = container.children.find((section) => titleText(section) === "skyshinez_");
  assert.ok(skyshinez);
  assert.equal(skyshinez.children[0].children[0].children.length, 0);
  assert.equal(headerLink(skyshinez).href, "https://www.instagram.com/skyshinez_/");
  assert.ok(skyshinez.children[1].children.length > 1);

  const koru = container.children.find((section) => titleText(section) === "koru");
  assert.ok(koru);
  assert.equal(headerLink(koru), undefined);
  assert.equal(koru.children[1].children.length, 1);
});

test("artist cards stay alphabetical and only artists with 4+ works are wide", () => {
  const { container } = mountArtists();
  const names = container.children.map(titleText);
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  assert.deepEqual(names, sorted);

  container.children.forEach((section) => {
    const works = section.children[1].children.length;
    assert.equal(section.className.includes("artist-card--wide"), works >= 4, titleText(section));
  });
  assert.ok(container.children.some((s) => s.className.includes("artist-card--wide")));
  assert.ok(container.children.some((s) => !s.className.includes("artist-card--wide")));
});

test("header counts split emotes and fanarts with correct singulars", () => {
  const { window, container } = mountArtists();
  container.children.forEach((section) => {
    const text = section.children[0].children[1].textContent;
    const name = titleText(section);
    const belongs = (work) => ((work.artista || "Anónimo").trim() || "Anónimo") === name;
    const emotes = window.WEWIN.emotes.filter(belongs).length;
    const fanarts = window.WEWIN.fanarts.filter(belongs).length;
    const expected = [
      emotes ? `${emotes} ${emotes === 1 ? "emote" : "emotes"}` : "",
      fanarts ? `${fanarts} ${fanarts === 1 ? "fanart" : "fanarts"}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    assert.equal(text, expected, name);
  });
});

test("profile links are labelled by platform and malformed URLs render no link", () => {
  const work = (artista, enlace) => ({ src: `img/${artista}.webp`, alt: artista, artista, enlace });
  const container = mountWithData({
    emotes: [
      work("a", "https://www.twitch.tv/a"),
      work("b", "https://instagram.com/b"),
      work("c", "https://linktr.ee/c"),
      work("d", "not a url"),
      work("e", "https://nottwitch.tv/e"),
    ],
    fanarts: [],
  });
  const links = Object.fromEntries(container.children.map((s) => [titleText(s), headerLink(s)]));
  assert.equal(links.a.textContent, "Twitch ↗");
  assert.equal(links.a.attributes["aria-label"], "Perfil de a en Twitch (se abre en otra pestaña)");
  assert.equal(links.a.target, "_blank");
  assert.equal(links.a.rel, "noreferrer");
  assert.equal(links.b.textContent, "Instagram ↗");
  assert.equal(links.c.textContent, "Perfil ↗");
  assert.equal(links.d, undefined);
  assert.equal(links.e.textContent, "Perfil ↗");
});

function interactiveElement(tagName) {
  return {
    ...element(tagName),
    listeners: {},
    hidden: false,
    style: {},
    textContent: "",
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function mountWithLightbox(data) {
  let document;
  const make = (tagName) => {
    const node = interactiveElement(tagName);
    node.focus = () => {
      document.activeElement = node;
    };
    return node;
  };
  const container = make("div");
  const lightbox = make("div");
  lightbox.hidden = true;
  const lightboxImg = make("img");
  const caption = make("p");
  const closeButton = make("button");
  const prevButton = make("button");
  const nextButton = make("button");
  const parts = {
    "[data-lightbox-img]": lightboxImg,
    "[data-lightbox-caption]": caption,
    "[data-lightbox-close]": closeButton,
    "[data-lightbox-prev]": prevButton,
    "[data-lightbox-next]": nextButton,
  };
  lightbox.querySelector = (selector) => parts[selector] || null;
  lightbox.querySelectorAll = () => [prevButton, nextButton, closeButton];
  document = {
    body: { style: {} },
    activeElement: null,
    keydown: null,
    querySelector(selector) {
      if (selector === "[data-artistas]") return container;
      if (selector === "[data-lightbox]") return lightbox;
      return null;
    },
    createElement: make,
    createTextNode: (textContent) => ({ textContent }),
    addEventListener(name, listener) {
      if (name === "keydown") this.keydown = listener;
    },
    removeEventListener(name) {
      if (name === "keydown") this.keydown = null;
    },
    contains: () => true,
  };
  runInNewContext(artistasSource, { window: { WEWIN: data }, document, URL });
  return { container, document, lightbox, lightboxImg, caption, closeButton, prevButton, nextButton };
}

const sampleWork = (artista, n, alt = `Obra ${n} de ${artista}`) => ({ src: `img/${artista}-${n}.webp`, alt, artista });

function workButtons(section) {
  return section.children[1].children.map((item) => item.children[0].children[0]);
}

test("each work becomes a labelled button and the lightbox starts closed with a placeholder", () => {
  const { container, lightbox, lightboxImg } = mountWithLightbox({
    emotes: [sampleWork("ana", 1), sampleWork("ana", 2)],
    fanarts: [sampleWork("ben", 1)],
  });
  assert.equal(lightbox.hidden, true);
  assert.match(lightboxImg.src, /^data:image\/svg\+xml/);
  const [button] = workButtons(container.children[0]);
  assert.equal(button.tagName, "button");
  assert.equal(button.type, "button");
  assert.equal(button.attributes["aria-label"], "Ver en grande: Obra 1 de ana");
});

test("lightbox opens, steps within the artist's works with wrap, and closes returning focus", () => {
  const ctx = mountWithLightbox({
    emotes: [sampleWork("ana", 1), sampleWork("ana", 2), sampleWork("ana", 3)],
    fanarts: [sampleWork("ben", 1), sampleWork("ben", 2)],
  });
  const { container, document, lightbox, lightboxImg, caption, closeButton, prevButton } = ctx;
  const [first, , third] = workButtons(container.children[0]);

  first.listeners.click();
  assert.equal(lightbox.hidden, false);
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(document.activeElement, closeButton);
  assert.equal(lightboxImg.src, "img/ana-1.webp");
  assert.equal(prevButton.hidden, false);
  assert.equal(caption.children[0].textContent, "Emote");
  assert.equal(caption.children[1].textContent, "Obra 1 de ana");

  document.keydown({ key: "ArrowLeft" });
  assert.equal(lightboxImg.src, "img/ana-3.webp");
  document.keydown({ key: "ArrowRight" });
  document.keydown({ key: "ArrowRight" });
  assert.equal(lightboxImg.src, "img/ana-2.webp");
  document.keydown({ key: "ArrowRight" });
  document.keydown({ key: "ArrowRight" });
  assert.equal(lightboxImg.src, "img/ana-1.webp");

  document.keydown({ key: "Escape" });
  assert.equal(lightbox.hidden, true);
  assert.equal(document.body.style.overflow, "");
  assert.match(lightboxImg.src, /^data:image\/svg\+xml/);
  assert.equal(document.activeElement, first);
  assert.equal(document.keydown, null);

  third.listeners.click();
  ctx.nextButton.listeners.click();
  assert.equal(lightboxImg.src, "img/ana-1.webp");
  lightbox.listeners.click({ target: lightbox });
  assert.equal(lightbox.hidden, true);
  assert.equal(document.activeElement, third);
});

test("lightbox traps Tab focus and hides navigation for a single work", () => {
  const { container, document, closeButton, prevButton, nextButton } = mountWithLightbox({
    emotes: [sampleWork("ana", 1), sampleWork("ana", 2)],
    fanarts: [sampleWork("ben", 1)],
  });
  const prevented = [];
  const tab = (shiftKey) => document.keydown({ key: "Tab", shiftKey, preventDefault: () => prevented.push(true) });

  workButtons(container.children[0])[0].listeners.click();
  document.activeElement = closeButton;
  tab(false);
  assert.equal(document.activeElement, prevButton);
  tab(true);
  assert.equal(document.activeElement, closeButton);
  assert.equal(prevented.length, 2);
  document.keydown({ key: "Escape" });

  workButtons(container.children[1])[0].listeners.click();
  assert.equal(prevButton.hidden, true);
  assert.equal(nextButton.hidden, true);
});

test("lightbox caption is built from text nodes, never markup", () => {
  const { container, caption } = mountWithLightbox({
    emotes: [sampleWork("ana", 1, "<img src=x onerror=alert(1)> larga descripción")],
    fanarts: [],
  });
  workButtons(container.children[0])[0].listeners.click();
  assert.equal(caption.children[1].textContent, "<img src=x onerror=alert(1)> larga descripción");
  assert.equal(caption.innerHTML, undefined);
});
