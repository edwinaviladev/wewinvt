import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const slugs = [
  "EasyTrappedEyeballMrDestructoid-IFZhSg8Zo57g5LRs",
  "ElatedSmoothCrabPupper-UO8pGWGqPu5mF258",
  "HyperImpartialVultureSSSsss-DYCBDr-y_tHentPF",
  "SolidPopularOryxGivePLZ-2zI0P4rRU2gspMfL",
];

test("homepage embeds the four selected Twitch clips and links to each original", () => {
  const home = read("../index.html");
  const embeds = home.match(/https:\/\/clips\.twitch\.tv\/embed\?clip=/g) || [];

  assert.equal(embeds.length, slugs.length);
  slugs.forEach((slug) => {
    assert.ok(home.includes(`clip=${slug}&amp;parent=wewinvt.com`), `${slug} should be embedded`);
    assert.ok(home.includes(`href="https://www.twitch.tv/wewinvt/clip/${slug}?range=7d"`), `${slug} should link to its original`);
  });
  assert.match(home, /<section class="section clips-section" id="clips"/);
  assert.match(home, /loading="lazy"/);
});

test("small screens keep direct links instead of undersized Twitch players", () => {
  const css = read("../css/paleta-editorial.css");

  assert.match(css, /@media \(max-width: 480px\)\s*\{\s*\.clip-embed\s*\{\s*display: none;/);
});

test("CSP allows Twitch clip embeds", () => {
  const headers = read("../_headers");

  assert.match(headers, /frame-src[^;]*https:\/\/clips\.twitch\.tv/);
});
