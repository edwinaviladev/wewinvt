import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), "utf8");
const listar = (dir, ext) =>
  readdirSync(new URL(dir, raiz))
    .filter((f) => f.endsWith(ext))
    .map((f) => dir + f);

const paginas = listar("./", ".html").map((f) => f.slice(2));
const fuentes = [...paginas, ...listar("css/", ".css"), ...listar("js/", ".js")];

const headers = leer("_headers");
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const directiva = (nombre) => csp.split("; ").find((d) => d.startsWith(`${nombre} `));

test("the CSP allows every inline script by hash and never with unsafe-inline", () => {
  const scriptSrc = directiva("script-src");
  assert.ok(!scriptSrc.includes("unsafe-inline"));
  for (const pagina of paginas) {
    for (const [, atributos, cuerpo] of leer(pagina).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (atributos.includes("src=")) continue;
      const hash = createHash("sha256").update(cuerpo).digest("base64");
      assert.ok(scriptSrc.includes(`'sha256-${hash}'`), `${pagina}: inline script without a CSP hash`);
    }
  }
});

test("the CSP allows the external origins the site connects to", () => {
  for (const origen of ["https://api.twitch.tv", "https://id.twitch.tv", "wss://eventsub.wss.twitch.tv", "https://api.ivr.fi", "https://decapi.me"]) {
    assert.ok(directiva("connect-src").includes(origen), origen);
  }
  assert.ok(directiva("style-src").includes("https://fonts.googleapis.com"));
  assert.ok(directiva("font-src").includes("https://fonts.gstatic.com"));
  assert.ok(directiva("frame-src").includes("https://player.twitch.tv"));
});

test("each header is set by a single rule and nothing is immutable", () => {
  const global = headers.split(/^\/\*$/m)[1].split(/^\s*$/m)[0];
  assert.ok(!global.includes("Cache-Control"), "Cache-Control in /* would be joined with the specific rules");
  assert.ok(!headers.includes("immutable"), "asset names have no content hash");
});

test("every image the site references exists and is published", () => {
  const referencias = new Set(
    fuentes.flatMap((f) => [...leer(f).matchAll(/(?:img\/[\w/-]+|favicon)\.[a-z]+/g)].map((m) => m[0])),
  );
  assert.ok(referencias.size > 0);
  for (const ref of referencias) {
    assert.ok(existsSync(new URL(ref, raiz)), `${ref} does not exist`);
    assert.ok(!/\.(png|jpe?g|gif)$/.test(ref), `${ref} is excluded by .assetsignore`);
  }
});

test(".assetsignore keeps non-site files out and the site files in", () => {
  const reglas = leer(".assetsignore").split(/\r?\n/);
  for (const ruta of ["/worker.js", "/README.md", "/servidor.mjs", "/servidor.cmd", "/wrangler.jsonc", "/.gitignore", "/odd", "/test", "/old", "/upgrades.md", "/fanarts y emotes"]) {
    assert.ok(reglas.includes(ruta), ruta);
  }
  for (const ruta of ["/_headers", "/index.html", "/js", "/css", "/img"]) {
    assert.ok(!reglas.includes(ruta), ruta);
  }
});
