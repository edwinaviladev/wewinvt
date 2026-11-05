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
