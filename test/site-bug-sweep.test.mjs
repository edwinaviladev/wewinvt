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
