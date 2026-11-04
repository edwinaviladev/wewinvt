import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const editorialStyles = read("../css/paleta-editorial.css");

test("the collection pages no longer label the public flow as a prototype", () => {
  const sobre = read("../sobre.html");
  const overlay = read("../overlay.html");
  const title = /<title>(.*?)<\/title>/i.exec(sobre)?.[1] || "";
  const description = /<meta name="description" content="([^"]+)"/i.exec(sobre)?.[1] || "";
  const backLink = /<a class="back-link" href="sobre\.html">([^<]+)<\/a>/i.exec(overlay)?.[1] || "";

  assert.doesNotMatch(`${title} ${description} ${backLink}`, /prototipo/i);
});

test("home page loads the shared card catalog and card renderer", () => {
  const home = read("../index.html");

  assert.match(home, /data-home-cards/);
  assert.match(home, /js\/sobre-data\.js/);
  assert.match(home, /js\/carta\.js/);
  assert.match(home, /js\/home-cards\.js/);
});

test("home section dividers use manga panels and screen tones without adding spoken decoration", () => {
  const home = read("../index.html");
  const dividers = [...home.matchAll(/<div class="manga-divider" aria-hidden="true">([\s\S]*?)<\/div>/g)];
  const sounds = dividers.map(([, markup]) => {
    assert.match(markup, /manga-divider__panel--dots/);
    assert.match(markup, /manga-divider__panel--lines/);
    return /<span class="manga-divider__sound">([^<]+)<\/span>/.exec(markup)?.[1];
  });

  assert.deepEqual(sounds, ["¡PUM!", "¡TACHÁN!", "¡CLIC!", "¡JA!", "¡BZZT!", "¡PLIN!"]);
  assert.match(editorialStyles, /\.manga-divider__panel--dots\s*\{[^}]*radial-gradient/s);
  assert.match(editorialStyles, /\.manga-divider__panel--lines\s*\{[^}]*repeating-linear-gradient/s);
});
