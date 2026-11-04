import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("artists page is linked in public navigation and included in the sitemap", () => {
  const pages = ["../index.html", "../emotes.html", "../album.html", "../404.html"]
    .map(read);
  const artistsPage = read("../artistas.html");
  const sitemap = read("../sitemap.xml");

  pages.forEach((page) => assert.match(page, /href="artistas\.html"/));
  assert.match(artistsPage, /<span class="nav-link is-active" aria-current="page">Artistas<\/span>/);
  assert.match(sitemap, /<loc>https:\/\/wewinvt\.com\/artistas<\/loc>/);
});
