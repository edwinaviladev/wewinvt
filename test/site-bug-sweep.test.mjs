import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

/* Declarations of the last rule whose selector list contains exactly this selector */
function regla(css, selector) {
  const bloques = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectores]) => selectores.split(",").map((s) => s.trim()).includes(selector));
  assert.ok(bloques.length, `no rule for ${selector}`);
  return bloques.at(-1)[2];
}

test("the CSP lets the Cloudflare Web Analytics beacon load and report", () => {
  const csp = leer("_headers").match(/Content-Security-Policy: (.+)/)[1];
  const directiva = (nombre) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${nombre} `));
  assert.ok(directiva("script-src").includes("https://static.cloudflareinsights.com"));
  assert.ok(directiva("connect-src").includes("https://cloudflareinsights.com"));
});

test("images with width and height attributes keep their ratio in the CSS", () => {
  assert.match(regla(leer("css/artistas.css"), ".artist-work img"), /height:\s*auto/);
  const emote = regla(leer("css/styles.css"), ".emote-tile .tile-btn img");
  assert.match(emote, /height:\s*auto/);
  assert.match(emote, /aspect-ratio:\s*1/);
});

test("the lightbox caption text does not match its background", () => {
  const caption = regla(leer("css/paleta-editorial.css"), ".lb-caption");
  const fondo = caption.match(/background:\s*([^;]+);/);
  const color = caption.match(/(?:^|\s)color:\s*([^;]+);/);
  assert.ok(fondo, "the editorial palette must set the caption background");
  assert.notEqual(fondo[1], color[1]);
  assert.notEqual(fondo[1], "var(--surface-strong)");
});
