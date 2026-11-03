import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

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
