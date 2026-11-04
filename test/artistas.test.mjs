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

  runInNewContext(artistasSource, { window, document });
  return { window, container };
}

function titleText(section) {
  const heading = section.children[0].children[0];
  return heading.children.length ? heading.children[0].textContent : heading.textContent;
}

test("artists page groups every emote and fanart by credited artist", () => {
  const { window, container } = mountArtists();
  const totalWorks = container.children.reduce((total, section) => total + section.children[1].children.length, 0);

  assert.equal(totalWorks, window.WEWIN.emotes.length + window.WEWIN.fanarts.length);
  assert.ok(container.children.length > 1);

  const skyshinez = container.children.find((section) => titleText(section) === "skyshinez_");
  assert.ok(skyshinez);
  assert.equal(skyshinez.children[0].children[0].children[0].href, "https://www.instagram.com/skyshinez_/");
  assert.ok(skyshinez.children[1].children.length > 1);

  const koru = container.children.find((section) => titleText(section) === "koru");
  assert.ok(koru);
  assert.equal(koru.children[0].children[0].children.length, 0);
  assert.equal(koru.children[1].children.length, 1);
});
