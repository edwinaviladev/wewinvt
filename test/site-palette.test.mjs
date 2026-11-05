import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

/* Body of the first :root rule of a stylesheet, without comments */
function bloqueRaiz(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").match(/:root\s*\{([^{}]*)\}/)[1];
}

const tokensDe = (bloque) =>
  Object.fromEntries([...bloque.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, nombre, valor]) => [nombre, valor.trim()]));

test(":root in paleta-editorial.css is the dark palette of the feature", () => {
  const bloque = bloqueRaiz(leer("css/paleta-editorial.css"));
  const tokens = tokensDe(bloque);
  assert.deepEqual(
    {
      pagina: tokens["--color-bg"],
      superficie: tokens["--color-surface"],
      linea: tokens["--color-border"],
      control: tokens["--color-control"],
      texto: tokens["--color-ink"],
      apagado: tokens["--color-muted"],
      acento: tokens["--color-accent"],
      acentoTexto: tokens["--color-accent-text"],
      sobreAcento: tokens["--color-on-accent"],
      mat: tokens["--color-art-mat"],
    },
    {
      pagina: "#1f1d1b",
      superficie: "#2a2724",
      linea: "#3d3935",
      control: "#8a8279",
      texto: "#f5f0e8",
      apagado: "#b5ada2",
      acento: "#d4635b",
      acentoTexto: "#e8857e",
      sobreAcento: "#1f1d1b",
      mat: "#fffcf6",
    },
  );
  assert.match(bloque, /color-scheme:\s*dark;/);
  for (const nombre of ["--color-accent-hover", "--color-accent-soft", "--color-sand", "--color-success"]) {
    assert.match(tokens[nombre], /^#[0-9a-f]{6}$/, nombre);
  }
});

test("/album reads its palette from the shared tokens instead of repeating values", () => {
  const css = leer("css/album.css");
  const bloque = css.match(/body\.album-page \{([^{}]*)\}/)[1];
  const album = [...bloque.matchAll(/(--album-[\w-]+)\s*:\s*([^;]+);/g)];
  assert.ok(album.length >= 10);
  for (const [, nombre, valor] of album) {
    assert.match(valor.trim(), /^var\(--color-[\w-]+\)$/, nombre);
  }
  assert.doesNotMatch(css, /body\.album-page \.site-header \{[^}]*color-scheme:\s*light/);
});


const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/* Declarations of every rule whose selector list contains exactly this selector */
function regla(css, selector) {
  const bloques = [...sinComentarios(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectores]) => selectores.split(",").map((s) => s.trim()).includes(selector));
  assert.ok(bloques.length, `no rule for ${selector}`);
  return bloques.map((bloque) => bloque[2]).join("\n");
}

const PAGINAS_PUBLICAS = ["index.html", "emotes.html", "artistas.html", "album.html", "404.html"];

test("the in-scope pages share the charcoal theme-color", () => {
  for (const pagina of PAGINAS_PUBLICAS) {
    assert.match(leer(pagina), /<meta name="theme-color" content="#1F1D1B" \/>/, pagina);
  }
});

test("transparent artwork keeps a light mat on the dark pages", () => {
  const editorial = leer("css/paleta-editorial.css");
  for (const selector of [".brand img", ".hero-figure img", ".home-gallery-item a", ".tile-btn", ".fanart-card .tile-btn", ".lb-img", ".notfound-emote"]) {
    assert.match(regla(editorial, selector), /background:\s*var\(--color-art-mat\)/, selector);
  }
  assert.match(regla(leer("css/artistas.css"), ".artist-work img"), /background:\s*var\(--color-art-mat\)/);
});

test("no light page color is hardcoded in the public stylesheets", () => {
  for (const archivo of ["css/styles.css", "css/paleta-editorial.css", "css/home-cards.css", "css/gallery-filters.css", "css/artistas.css"]) {
    const css = sinComentarios(leer(archivo)).replace(/:root\s*\{[^{}]*\}/g, "");
    assert.doesNotMatch(css, /#(?:f5f0e8|fffcf6|fffdf9|f0dfda|eee7dc|e8dcd0)\b/i, archivo);
  }
});

test("the legacy color aliases resolve in the shared palette for every page using styles.css", () => {
  const tokens = tokensDe(bloqueRaiz(leer("css/paleta-editorial.css")));
  for (const alias of ["--bg", "--bg-deep", "--surface", "--surface-strong", "--violet", "--cyan", "--gold", "--pink", "--blue", "--green", "--text", "--muted", "--soft", "--line"]) {
    assert.ok(tokens[alias], `${alias} is missing`);
    const referencia = tokens[alias].match(/^var\((--[\w-]+)\)$/)?.[1];
    if (referencia) assert.ok(tokens[referencia], `${alias} points at undefined ${referencia}`);
  }

  const paginas = readdirSync(new URL("../", import.meta.url)).filter((archivo) => archivo.endsWith(".html"));
  const conEstilos = paginas.filter((pagina) => leer(pagina).includes("css/styles.css"));
  assert.ok(conEstilos.length >= PAGINAS_PUBLICAS.length);
  for (const pagina of conEstilos) {
    const html = leer(pagina);
    assert.ok(html.indexOf("css/paleta-editorial.css") > html.indexOf("css/styles.css"), `${pagina} must load the palette after styles.css`);
  }
});

test("the /sobre copy of the palette matches the shared tokens", () => {
  const compartidos = tokensDe(bloqueRaiz(leer("css/paleta-editorial.css")));
  const sobre = tokensDe(sinComentarios(leer("css/sobre.css")).match(/body\.sobre-page \{([^{}]*)\}/)[1]);
  const equivalencias = {
    "--site-bg": "--color-bg",
    "--site-bg-deep": "--bg-deep",
    "--site-surface": "--color-surface",
    "--site-surface-hover": "--color-surface-hover",
    "--site-control": "--color-control",
    "--site-text": "--color-ink",
    "--site-muted": "--color-muted",
    "--site-accent": "--color-accent",
    "--site-accent-text": "--color-accent-text",
    "--site-on-accent": "--color-on-accent",
  };
  for (const [local, compartido] of Object.entries(equivalencias)) {
    assert.ok(compartidos[compartido], `${compartido} is missing`);
    assert.equal(sobre[local], compartidos[compartido], local);
  }
  const sinEquivalente = Object.keys(sobre).filter((nombre) => nombre.startsWith("--site-") && !equivalencias[nombre]);
  assert.deepEqual(sinEquivalente, []);
});

test("/sobre takes the site theme-color and a page class; both overlay pages stay untouched", () => {
  const sobre = leer("sobre.html");
  assert.match(sobre, /<meta name="theme-color" content="#1F1D1B" \/>/);
  assert.match(sobre, /<body class="sobre-page">/);
  for (const pagina of ["overlay.html", "overlay-config.html"]) {
    const html = leer(pagina);
    assert.match(html, /<meta name="theme-color" content="#100b0a" \/>/, pagina);
    assert.doesNotMatch(html, /sobre-page/, pagina);
  }
});

test("the /sobre palette in sobre.css is scoped to body.sobre-page and leaves :root alone", () => {
  const css = leer("css/sobre.css");
  const inicio = css.indexOf("PALETA DEL SITIO");
  assert.ok(inicio > 0, "the scoped palette block is missing");
  const bloque = sinComentarios(css.slice(css.lastIndexOf("/*", inicio)));
  const selectores = [...bloque.matchAll(/([^{}]+)\{/g)].flatMap(([, lista]) => lista.split(",").map((s) => s.trim()));
  assert.ok(selectores.length > 5);
  for (const selector of selectores) assert.match(selector, /^body\.sobre-page(?:\s|:|$)/, selector);

  const tokens = tokensDe(bloqueRaiz(css));
  assert.equal(tokens["--bg"], "#120c0d");
  assert.equal(tokens["--bg-deep"], "#090607");
  assert.equal(tokens["--text"], "#f7efe0");
  assert.equal(tokens["--muted"], "#c9bdb0");
  assert.equal(tokens["--rojo"], "#d3142f");
});
