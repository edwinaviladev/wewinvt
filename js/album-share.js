window.AlbumShare = (() => {
  "use strict";

  const ANCHO = 1200;
  const ALTO = 630;
  /* Algunos navegadores, como iOS Safari, leen la URL cuando se confirma la descarga */
  const REVOCAR_MS = 40000;
  const RAREZAS = window.CartaWewin.RAREZAS;

  function esperarImagen(imagen) {
    if (!imagen) return Promise.reject(new Error("Falta la ilustración de la carta."));
    if (imagen.complete) {
      return imagen.naturalWidth > 0
        ? Promise.resolve()
        : Promise.reject(new Error("No se pudo cargar la ilustración de la carta."));
    }

    if (typeof imagen.decode === "function") return imagen.decode();
    return new Promise((resolve, reject) => {
      imagen.addEventListener("load", resolve, { once: true });
      imagen.addEventListener("error", () => reject(new Error("No se pudo cargar la ilustración de la carta.")), { once: true });
    });
  }

  function ajustarImagen(ctx, imagen, x, y, ancho, alto) {
    const escala = Math.min(ancho / imagen.naturalWidth, alto / imagen.naturalHeight);
    const anchoFinal = imagen.naturalWidth * escala;
    const altoFinal = imagen.naturalHeight * escala;
    ctx.drawImage(
      imagen,
      x + (ancho - anchoFinal) / 2,
      y + (alto - altoFinal) / 2,
      anchoFinal,
      altoFinal
    );
  }

  function ajustarLineas(ctx, texto, anchoMaximo, maxLineas) {
    const palabras = String(texto || "").trim().split(/\s+/).filter(Boolean);
    const lineas = [];
    let actual = "";

    palabras.forEach((palabra) => {
      const candidata = actual ? `${actual} ${palabra}` : palabra;
      if (actual && ctx.measureText(candidata).width > anchoMaximo) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = candidata;
      }
    });
    if (actual) lineas.push(actual);
    if (lineas.length <= maxLineas) return lineas;

    lineas.length = maxLineas;
    let ultima = lineas[maxLineas - 1];
    while (ultima && ctx.measureText(`${ultima}…`).width > anchoMaximo) ultima = ultima.slice(0, -1);
    lineas[maxLineas - 1] = `${ultima.trimEnd()}…`;
    return lineas;
  }

  function blobDe(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo crear la imagen de la carta."));
      }, "image/png");
    });
  }

  async function crearImagen(datos, imagen, { numero = "", total = 0 } = {}) {
    await esperarImagen(imagen);

    const canvas = document.createElement("canvas");
    canvas.width = ANCHO;
    canvas.height = ALTO;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador no puede crear la imagen de la carta.");

    const rareza = RAREZAS[datos.rareza] || RAREZAS.comun;

    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = "#b84a43";
    ctx.fillRect(0, 0, ANCHO, 8);

    ctx.fillStyle = "#fffcf6";
    ctx.fillRect(48, 42, 430, 546);
    ctx.strokeStyle = "#242321";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 42, 430, 546);
    ctx.fillStyle = "#f0dfda";
    ctx.fillRect(68, 62, 390, 448);
    ajustarImagen(ctx, imagen, 82, 76, 362, 420);

    ctx.fillStyle = "#242321";
    ctx.font = '700 15px "Space Mono", monospace';
    ctx.fillText(`${(datos.conjunto?.nombre || "Serie 1").toLocaleUpperCase("es-MX")} · ${numero}`, 68, 546);
    ctx.fillStyle = "#b84a43";
    ctx.fillRect(68, 563, 390, 5);

    ctx.fillStyle = "#b84a43";
    ctx.fillRect(536, 78, 7, 48);
    ctx.fillStyle = "#b84a43";
    ctx.font = '700 17px "Space Mono", monospace';
    ctx.fillText("WEWINVT · CARTA DE LA COMUNIDAD", 562, 108);

    ctx.fillStyle = "#242321";
    ctx.font = '600 60px "Newsreader", Georgia, serif';
    ajustarLineas(ctx, datos.nombre, 570, 2).forEach((linea, index) => {
      ctx.fillText(linea, 562, 226 + index * 70);
    });

    ctx.font = '700 16px "Space Mono", monospace';
    const nombreRareza = rareza.nombre.toLocaleUpperCase("es-MX");
    const anchoRareza = Math.max(150, Math.ceil(ctx.measureText(nombreRareza).width + 28));
    ctx.fillStyle = rareza.color;
    ctx.fillRect(562, 370, anchoRareza, 42);
    ctx.fillStyle = "#242321";
    ctx.fillText(nombreRareza, 576, 397);

    if (datos.nombreVariante) {
      const x = 562 + anchoRareza + 12;
      ctx.fillStyle = "#e8dcd0";
      ctx.fillRect(x, 370, 112, 42);
      ctx.fillStyle = "#242321";
      ctx.fillText(datos.nombreVariante.toLocaleUpperCase("es-MX"), x + 12, 397);
    }

    ctx.fillStyle = "#706a63";
    ctx.font = '15px "Space Mono", monospace';
    ctx.fillText(`${numero} · ${total} cartas`, 562, 467);
    ctx.fillStyle = "#242321";
    ctx.font = '500 19px "DM Sans", Arial, sans-serif';
    ctx.fillText(`Arte por ${datos.artista || "Anónimo"}`, 562, 510, 570);

    ctx.strokeStyle = "#e8dcd0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(562, 548);
    ctx.lineTo(1142, 548);
    ctx.stroke();
    ctx.font = '700 14px "Space Mono", monospace';
    ctx.fillStyle = "#b84a43";
    ctx.fillText("WEWINVT", 562, 580);
    ctx.textAlign = "right";
    ctx.fillStyle = "#706a63";
    ctx.fillText("wewinvt.com/album", 1142, 580);
    ctx.textAlign = "left";

    return blobDe(canvas);
  }

  function nombreArchivo(datos) {
    const id = String(datos.id || "carta")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `wewinvt-${id || "carta"}.png`;
  }

  function descargar(blob, nombre) {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.hidden = true;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), REVOCAR_MS);
  }

  async function compartir(datos, imagen, meta) {
    const blob = await crearImagen(datos, imagen, meta);
    const nombre = nombreArchivo(datos);
    const rareza = RAREZAS[datos.rareza]?.nombre || "Carta";
    const nav = window.navigator;

    if (typeof nav.share === "function" && typeof nav.canShare === "function" && typeof window.File === "function") {
      const archivo = new window.File([blob], nombre, { type: "image/png" });
      let soportaArchivo = false;
      try {
        soportaArchivo = nav.canShare({ files: [archivo] });
      } catch {
        soportaArchivo = false;
      }

      if (soportaArchivo) {
        try {
          await nav.share({
            files: [archivo],
            title: `${datos.nombre} | WewinVT`,
            text: `${datos.nombre} · ${rareza} · WewinVT`,
            url: "https://wewinvt.com/album",
          });
          return "shared";
        } catch (error) {
          if (error?.name === "AbortError") return "cancelled";
        }
      }
    }

    descargar(blob, nombre);
    return "downloaded";
  }

  return { crearImagen, compartir };
})();
