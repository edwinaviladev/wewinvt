import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("sobre is indexable, has social preview metadata, and appears in the sitemap", () => {
  const sobre = read("../sobre.html");
  const sitemap = read("../sitemap.xml");

  assert.match(sobre, /<link rel="canonical" href="https:\/\/wewinvt\.com\/sobre" \/>/);
  assert.doesNotMatch(sobre, /<meta name="robots" content="noindex/i);
  assert.match(sobre, /<meta property="og:title" content="Sobre coleccionable \| WewinVT" \/>/);
  assert.match(sobre, /<meta property="og:image" content="https:\/\/wewinvt\.com\/img\/og-wewin\.png" \/>/);
  assert.match(sobre, /<meta property="og:image:type" content="image\/png" \/>/);
  assert.match(sobre, /<meta property="og:image:width" content="1200" \/>/);
  assert.match(sobre, /<meta property="og:image:height" content="630" \/>/);
  assert.match(sobre, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(sobre, /<meta name="twitter:image" content="https:\/\/wewinvt\.com\/img\/og-wewin\.png" \/>/);
  assert.match(sitemap, /<loc>https:\/\/wewinvt\.com\/sobre<\/loc>/);
});
