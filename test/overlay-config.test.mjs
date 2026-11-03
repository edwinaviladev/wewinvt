import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../js/overlay-config.js", import.meta.url), "utf8");

function urlMostrada(href) {
  const elementos = new Map();
  const document = {
    querySelector(selector) {
      if (!elementos.has(selector)) {
        elementos.set(selector, { addEventListener() {}, textContent: "" });
      }
      return elementos.get(selector);
    },
  };
  const window = { addEventListener() {} };

  runInNewContext(source, {
    document,
    window,
    location: new URL(href),
    URL,
    URLSearchParams,
  });

  return elementos.get("[data-url-overlay]").textContent;
}

test("overlay URL works with Cloudflare clean URLs", () => {
  assert.equal(urlMostrada("https://wewinvt.com/overlay-config?debug=1"), "https://wewinvt.com/overlay?transparente=1");
});

test("overlay URL keeps the html extension for the local static server", () => {
  assert.equal(urlMostrada("http://localhost:5500/overlay-config.html"), "http://localhost:5500/overlay.html?transparente=1");
});
