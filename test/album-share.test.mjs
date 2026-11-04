import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const shareSource = readFileSync(new URL("../js/album-share.js", import.meta.url), "utf8");
const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");
const albumHtml = readFileSync(new URL("../album.html", import.meta.url), "utf8");
const albumCss = readFileSync(new URL("../css/album.css", import.meta.url), "utf8");

const carta = {
  id: "templo-hollow-knight",
  nombre: "Templo hueco",
  rareza: "epica",
  variante: "holo",
  nombreVariante: "Holo",
  tipo: "fanart",
  artista: "darklobo117",
};

function montarCompartir({ archivosCompartibles = false, errorAlCompartir = null } = {}) {
  const llamadas = { textos: [], dibujos: [], enlaces: [], compartido: null, mime: "" };
  const blob = { type: "image/png", size: 1234 };
  const contexto = {
    fillRect() {},
    strokeRect() {},
    drawImage: (...args) => llamadas.dibujos.push(args),
    measureText: (texto) => ({ width: String(texto).length * 9 }),
    fillText: (texto) => llamadas.textos.push(String(texto)),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: (tipo) => (tipo === "2d" ? contexto : null),
    toBlob(callback, tipo) {
      llamadas.mime = tipo;
      callback(blob);
    },
  };
  const document = {
    createElement(tag) {
      if (tag === "canvas") return canvas;
      if (tag !== "a") throw new Error(`Elemento inesperado: ${tag}`);
      const enlace = {
        click() { this.clicked = true; },
        remove() { this.removed = true; },
      };
      llamadas.enlaces.push(enlace);
      return enlace;
    },
    body: { appendChild() {} },
  };
  const navigator = {
    canShare: ({ files }) => archivosCompartibles && files[0].type === "image/png",
    async share(opciones) {
      llamadas.compartido = opciones;
      if (errorAlCompartir) throw errorAlCompartir;
    },
  };
  class MockFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  }
  const window = {
    navigator,
    CartaWewin: {
      RAREZAS: {
        comun: { nombre: "Común", color: "#d9cbb9" },
        epica: { nombre: "Épica", color: "#c8aefc" },
      },
    },
    File: MockFile,
    URL: {
      createObjectURL: () => "blob:wewin-card",
      revokeObjectURL: (url) => { llamadas.revocado = url; },
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
  };

  runInNewContext(shareSource, { document, window });
  return { blob, canvas, llamadas, window };
}

const imagen = { complete: true, naturalWidth: 400, naturalHeight: 600 };
const meta = { numero: "#003", total: 72 };

test("share image is a 1200x630 PNG with the card art and credits", async () => {
  const { blob, canvas, llamadas, window } = montarCompartir();
  const generado = await window.AlbumShare.crearImagen(carta, imagen, meta);

  assert.equal(generado, blob);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 630);
  assert.equal(llamadas.mime, "image/png");
  assert.equal(llamadas.dibujos.length, 1);
  assert.equal(llamadas.dibujos[0][0], imagen);
  assert.ok(llamadas.textos.includes("Templo hueco"));
  assert.ok(llamadas.textos.includes("ÉPICA"));
  assert.ok(llamadas.textos.includes("HOLO"));
  assert.ok(llamadas.textos.includes("Arte por darklobo117"));
});

test("native file sharing includes the generated PNG and album link", async () => {
  const { llamadas, window } = montarCompartir({ archivosCompartibles: true });
  const resultado = await window.AlbumShare.compartir(carta, imagen, meta);

  assert.equal(resultado, "shared");
  assert.equal(llamadas.compartido.files[0].name, "wewinvt-templo-hollow-knight.png");
  assert.equal(llamadas.compartido.files[0].type, "image/png");
  assert.equal(llamadas.compartido.url, "https://wewinvt.com/album");
  assert.equal(llamadas.enlaces.length, 0);
});

test("unsupported file sharing downloads a PNG for manual upload", async () => {
  const { llamadas, window } = montarCompartir();
  const resultado = await window.AlbumShare.compartir(carta, imagen, meta);

  assert.equal(resultado, "downloaded");
  assert.equal(llamadas.enlaces[0].download, "wewinvt-templo-hollow-knight.png");
  assert.equal(llamadas.enlaces[0].clicked, true);
  assert.equal(llamadas.revocado, "blob:wewin-card");
});

test("canceling native sharing does not trigger a download", async () => {
  const error = Object.assign(new Error("cancelled"), { name: "AbortError" });
  const { llamadas, window } = montarCompartir({ archivosCompartibles: true, errorAlCompartir: error });

  assert.equal(await window.AlbumShare.compartir(carta, imagen, meta), "cancelled");
  assert.equal(llamadas.enlaces.length, 0);
});

test("album loads the renderer before its sharing button and offers the fallback copy", () => {
  assert.ok(albumHtml.indexOf("js/album-share.js") < albumHtml.indexOf("js/album.js"));
  assert.match(albumSource, /window\.AlbumShare\.compartir/);
  assert.match(albumSource, /data-compartir/);
  assert.match(albumSource, /PNG descargado\. Adjunta la imagen en Discord o X\./);
});

test("share image names the card's own set and defaults to Serie 1", async () => {
  const { llamadas, window } = montarCompartir();
  await window.AlbumShare.crearImagen(carta, imagen, meta);
  assert.ok(llamadas.textos.includes("SERIE 1 · #003"));

  const otra = montarCompartir();
  await otra.window.AlbumShare.crearImagen({ ...carta, conjunto: { id: "serie-2", nombre: "Serie 2" } }, imagen, meta);
  assert.ok(otra.llamadas.textos.includes("SERIE 2 · #003"));
});

test("a failed native share still downloads the PNG", async () => {
  const error = Object.assign(new Error("needs a gesture"), { name: "NotAllowedError" });
  const { llamadas, window } = montarCompartir({ archivosCompartibles: true, errorAlCompartir: error });

  assert.equal(await window.AlbumShare.compartir(carta, imagen, meta), "downloaded");
  assert.ok(llamadas.compartido);
  assert.equal(llamadas.enlaces[0].clicked, true);
});

test("only owned cards offer sharing and the button keeps keyboard focus", () => {
  assert.match(albumSource, /obtenidas\(datos\.id\) > 0 \? `\s*<div class="detalle-compartir">/);
  assert.match(albumSource, /boton\.setAttribute\("aria-disabled", "true"\)/);
  assert.doesNotMatch(albumSource, /boton\.disabled/);
});

test("sharing controls stay readable on the dark album detail", () => {
  assert.match(albumCss, /body\.album-page \.detalle-compartir \.btn--ghost \{[^}]*color: #fffcf6;/);
  assert.match(albumCss, /body\.album-page \.detalle-compartir-ayuda,\s*body\.album-page \.detalle-compartir-estado \{\s*color: #d9c8b5;/);
});
