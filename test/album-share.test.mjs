import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const shareSource = readFileSync(new URL("../js/album-share.js", import.meta.url), "utf8");
const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");
const cartaSource = readFileSync(new URL("../js/carta.js", import.meta.url), "utf8");
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

function montarCompartir({ archivosCompartibles = false, errorAlCompartir = null, sinContexto = false, sinBlob = false } = {}) {
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
    getContext: (tipo) => (tipo === "2d" && !sinContexto ? contexto : null),
    toBlob(callback, tipo) {
      llamadas.mime = tipo;
      callback(sinBlob ? null : blob);
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
    setTimeout(callback, espera) {
      llamadas.esperaRevocar = espera;
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
  assert.equal(llamadas.esperaRevocar, 40000);
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

test("the renderer rejects when the card image cannot be drawn", async () => {
  const { window } = montarCompartir();
  const fallaCon = (imagenRota, message) =>
    assert.rejects(() => window.AlbumShare.crearImagen(carta, imagenRota, meta), { message });

  await fallaCon(null, "Falta la ilustración de la carta.");
  await fallaCon({ complete: true, naturalWidth: 0 }, "No se pudo cargar la ilustración de la carta.");

  const errorDecode = new Error("decode failed");
  await assert.rejects(
    () => window.AlbumShare.crearImagen(carta, { complete: false, decode: async () => { throw errorDecode; } }, meta),
    errorDecode
  );
});

test("the renderer rejects without a 2D context or a PNG blob", async () => {
  const sinContexto = montarCompartir({ sinContexto: true });
  await assert.rejects(() => sinContexto.window.AlbumShare.crearImagen(carta, imagen, meta), {
    message: "Este navegador no puede crear la imagen de la carta.",
  });

  const sinBlob = montarCompartir({ sinBlob: true });
  await assert.rejects(() => sinBlob.window.AlbumShare.compartir(carta, imagen, meta), {
    message: "No se pudo crear la imagen de la carta.",
  });
  assert.equal(sinBlob.llamadas.enlaces.length, 0);
});

test("the renderer reads its rarities from the card module, loaded first", () => {
  assert.match(cartaSource, /window\.CartaWewin = \{[^}]*\bRAREZAS\b/);
  const carta = albumHtml.indexOf("js/carta.js");
  assert.ok(carta >= 0 && carta < albumHtml.indexOf("js/album-share.js"));
});

/* El detalle real de album.js, con su botón de compartir, sobre un DOM mínimo */
function montarDetalle({ cantidad = 1, compartir = async () => "downloaded" } = {}) {
  const inicio = albumSource.indexOf("  async function compartirCarta(");
  const fin = albumSource.indexOf("\n  function cerrarDetalle() {", inicio);
  assert.ok(inicio >= 0 && fin > inicio, "compartirCarta and abrirDetalle should be present in album.js");

  const atributos = new Map();
  const boton = {
    getAttribute: (nombre) => atributos.get(nombre) ?? null,
    setAttribute: (nombre, valor) => atributos.set(nombre, valor),
    removeAttribute: (nombre) => atributos.delete(nombre),
    addEventListener(tipo, accion) { if (tipo === "click") this.click = accion; },
  };
  const estado = { textContent: "" };
  const arte = { nombre: "arte de la carta" };
  const selectoresCarta = [];
  const llamadas = [];
  const datos = { ...carta, tipo: "fanart" };
  const cajaInfo = {
    innerHTML: "",
    querySelector(selector) {
      if (!this.innerHTML.includes("data-compartir")) return null;
      if (selector === "[data-compartir]") return boton;
      if (selector === "[data-compartir-estado]") return estado;
      return null;
    },
  };

  runInNewContext(`${albumSource.slice(inicio, fin)}\nabrirDetalle(datos);`, {
    datos,
    window: {
      AlbumShare: {
        compartir(...args) {
          llamadas.push(args);
          return compartir(...args);
        },
      },
    },
    document: { body: { classList: { add() {} } } },
    CATALOGO: [datos, {}, {}],
    RAREZAS: { epica: { nombre: "Épica", color: "#b994ff" } },
    Carta: { esEspecial: () => false, seguirInclinacion: () => () => {} },
    numeroDe: () => "#001",
    obtenidas: () => cantidad,
    cartaObtenida: () => ({
      querySelector(selector) {
        selectoresCarta.push(selector);
        return selector === ".card__arte" ? arte : null;
      },
    }),
    cajaCarta: { innerHTML: "", append() {} },
    cajaInfo,
    detalle: { hidden: true, classList: { remove() {} } },
    dejarDeInclinar: () => {},
    tarjetaOrigenDetalle: null,
  });

  return { arte, boton, cajaInfo, datos, estado, llamadas, selectoresCarta };
}

const vaciarTareas = () => new Promise((resolve) => setImmediate(resolve));

test("cards that are not owned offer no sharing control", () => {
  assert.equal(montarDetalle({ cantidad: 0 }).cajaInfo.innerHTML.includes("data-compartir"), false);
  assert.equal(montarDetalle({ cantidad: 1 }).cajaInfo.innerHTML.includes("data-compartir"), true);
});

test("sharing sends the detail card's art and numbering to the renderer", async () => {
  const { arte, boton, datos, llamadas, selectoresCarta } = montarDetalle();

  boton.click();
  await vaciarTareas();

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0][0], datos);
  assert.equal(llamadas[0][1], arte);
  assert.deepEqual({ ...llamadas[0][2] }, { numero: "#001", total: 3 });
  assert.deepEqual(selectoresCarta, [".card__arte"]);
});

test("each share outcome tells the viewer what happened", async () => {
  const mensajes = {
    shared: "Carta compartida. ¡Gracias!",
    cancelled: "Se canceló el envío.",
    downloaded: "PNG descargado. Adjunta la imagen en Discord o X.",
  };
  for (const [resultado, mensaje] of Object.entries(mensajes)) {
    const { boton, estado } = montarDetalle({ compartir: async () => resultado });
    boton.click();
    assert.equal(estado.textContent, "Preparando la imagen…");
    await vaciarTareas();
    assert.equal(estado.textContent, mensaje);
  }
});

test("the button ignores clicks while busy without using disabled, so it keeps focus", async () => {
  let terminar;
  const { boton, estado, llamadas } = montarDetalle({
    compartir: () => new Promise((resolve) => { terminar = resolve; }),
  });

  boton.click();
  boton.click();
  assert.equal(llamadas.length, 1);
  assert.equal(boton.getAttribute("aria-disabled"), "true");
  assert.equal(boton.disabled, undefined);

  terminar("shared");
  await vaciarTareas();
  assert.equal(boton.getAttribute("aria-disabled"), null);
  assert.equal(estado.textContent, "Carta compartida. ¡Gracias!");
});

test("a failed share shows the error and lets the viewer retry", async () => {
  let intentos = 0;
  const { boton, estado, llamadas } = montarDetalle({
    compartir: async () => {
      intentos += 1;
      if (intentos === 1) throw new Error("sin canvas");
      return "downloaded";
    },
  });

  boton.click();
  await vaciarTareas();
  assert.equal(estado.textContent, "No se pudo preparar la imagen. Inténtalo de nuevo.");
  assert.equal(boton.getAttribute("aria-disabled"), null);

  boton.click();
  await vaciarTareas();
  assert.equal(llamadas.length, 2);
  assert.equal(estado.textContent, "PNG descargado. Adjunta la imagen en Discord o X.");
});

test("sharing controls stay readable on the dark album detail", () => {
  assert.match(albumCss, /body\.album-page \.detalle-compartir \.btn--ghost \{[^}]*color: #fffcf6;/);
  assert.match(albumCss, /body\.album-page \.detalle-compartir-ayuda,\s*body\.album-page \.detalle-compartir-estado \{\s*color: #d9c8b5;/);
});
