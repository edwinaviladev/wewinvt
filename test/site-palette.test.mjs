import { readFileSync } from "node:fs";
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
