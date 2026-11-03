import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), "utf8");
const lineas = (texto) => texto.split(/\r?\n/);
const listar = (dir, ext) =>
  readdirSync(new URL(dir, raiz), { recursive: true })
    .map((f) => f.replaceAll("\\", "/"))
    .filter((f) => f.endsWith(ext))
    .map((f) => dir + f);

const paginas = readdirSync(raiz).filter((f) => f.endsWith(".html"));
const fuentes = [...paginas, ...listar("css/", ".css"), ...listar("js/", ".js")];

/** Reads a _headers file into rules: [{ ruta, cabeceras: Map(lowercase name -> value) }]. */
function leerReglas(texto) {
  const reglas = [];
  for (const linea of lineas(texto)) {
    if (!linea.trim() || linea.trim().startsWith("#")) continue;
    if (/^\s/.test(linea)) {
      const separador = linea.indexOf(":");
      reglas.at(-1).cabeceras.set(linea.slice(0, separador).trim().toLowerCase(), linea.slice(separador + 1).trim());
    } else {
      reglas.push({ ruta: linea.trim(), cabeceras: new Map() });
    }
  }
  return reglas;
}

/** Two rules overlap when one pattern's literal prefix contains the other's. */
function seSolapan(a, b) {
  const prefijo = (ruta) => ruta.split("*")[0];
  return prefijo(a).startsWith(prefijo(b)) || prefijo(b).startsWith(prefijo(a));
}

function cabecerasRepetidas(reglas) {
  const repetidas = [];
  reglas.forEach((a, i) => {
    for (const b of reglas.slice(i + 1)) {
      if (!seSolapan(a.ruta, b.ruta)) continue;
      for (const nombre of a.cabeceras.keys()) {
        if (b.cabeceras.has(nombre)) repetidas.push(`${nombre} in ${a.ruta} and ${b.ruta}`);
      }
    }
  });
  return repetidas;
}

/** The subset of .gitignore syntax that .assetsignore uses: anchored paths, *, ** and bare names. */
function reglaARegex(regla) {
  const anclada = regla.startsWith("/");
  const cuerpo = (anclada ? regla.slice(1) : regla)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\/|\*/g, (m) => (m === "*" ? "[^/]*" : "(?:.*/)?"));
  return new RegExp(`${anclada ? "^" : "(?:^|/)"}${cuerpo}(?:/|$)`);
}

const reglasIgnoradas = lineas(leer(".assetsignore"))
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map(reglaARegex);
const excluido = (ruta) => reglasIgnoradas.some((r) => r.test(ruta));

const reglas = leerReglas(leer("_headers"));
const csp = reglas.find((r) => r.ruta === "/*").cabeceras.get("content-security-policy");
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

test("no source uses inline handlers or javascript: URLs, which the CSP blocks", () => {
  for (const fuente of fuentes) {
    const texto = leer(fuente);
    assert.ok(!/<[^>]*\son[a-z]+\s*=/i.test(texto), `${fuente}: inline event handler`);
    assert.ok(!/setAttribute\(\s*["'`]on[a-z]+/i.test(texto), `${fuente}: inline event handler`);
    assert.ok(!/javascript:/i.test(texto), `${fuente}: javascript: URL`);
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
  assert.deepEqual(cabecerasRepetidas(reglas), []);
  assert.ok(!leer("_headers").includes("immutable"), "asset names have no content hash");
});

test("the _headers check catches a repeated header, with either line ending", () => {
  const texto = "/*\n  X-Content-Type-Options: nosniff\n\n/img/*\n  X-Content-Type-Options: nosniff\n\n/css/*\n  Cache-Control: a\n\n/js/*\n  Cache-Control: b\n";
  const esperado = ["x-content-type-options in /* and /img/*"];
  assert.deepEqual(cabecerasRepetidas(leerReglas(texto)), esperado);
  assert.deepEqual(cabecerasRepetidas(leerReglas(texto.replaceAll("\n", "\r\n"))), esperado);
});

test("every image the site references exists and is published", () => {
  const referencias = new Set(
    fuentes.flatMap((f) => [...leer(f).matchAll(/\b(?:img\/[\w./-]+|favicon)\.[a-z]+/g)].map((m) => m[0])),
  );
  assert.ok(referencias.size > 0);
  for (const ref of referencias) {
    assert.ok(existsSync(new URL(ref, raiz)), `${ref} does not exist`);
    assert.ok(!excluido(ref), `${ref} is excluded by .assetsignore`);
  }
});

test("image paths are written in full, so the reference check can see them", () => {
  for (const fuente of fuentes) {
    const texto = leer(fuente);
    assert.ok(!/\bimg\/[\w./-]*\$\{/.test(texto), `${fuente}: image path built from a template`);
    assert.ok(!/\bimg\/[\w./-]*["'`]\s*\+/.test(texto), `${fuente}: image path built by concatenation`);
  }
});

test(".assetsignore keeps non-site files out and the site files in", () => {
  for (const ruta of [
    "worker.js", "README.md", "servidor.mjs", "servidor.cmd", "wrangler.jsonc", ".gitignore", ".dev.vars", ".env.local",
    "odd/tasks/site-hardening.md", "test/worker.test.mjs", "old/index.html", "upgrades.md", "fanarts y emotes/emotes/a.png",
    "favicon.png", "img/og-wewin.png", "img/avatar-preview.webp", "img/fanarts/boceto-lapiz.jpg", "img/emotes/pensar-sonrojo.gif",
  ]) {
    assert.ok(excluido(ruta), `${ruta} should be excluded`);
  }
  for (const ruta of ["_headers", ...paginas, "robots.txt", "sitemap.xml", "favicon.webp", "js/main.js", "css/styles.css", "img/avatar.webp", "img/og-wewin.webp"]) {
    assert.ok(!excluido(ruta), `${ruta} should be published`);
  }
});
