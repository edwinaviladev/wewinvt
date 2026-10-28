/*
 * Servidor local mínimo para probar el sitio y el overlay sin desplegar.
 * Uso:  node servidor.mjs   (o doble clic en servidor.cmd)
 * Luego abre http://localhost:5500/overlay.html
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PUERTO = process.env.PUERTO || 5500;
const RAIZ = dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let ruta = decodeURIComponent(url.pathname);
    if (ruta.endsWith("/")) ruta += "index.html";

    const archivo = normalize(join(RAIZ, ruta));
    if (!archivo.startsWith(RAIZ)) {
      res.writeHead(403).end("403");
      return;
    }

    const datos = await readFile(archivo);
    res.writeHead(200, { "Content-Type": MIME[extname(archivo).toLowerCase()] || "application/octet-stream" });
    res.end(datos);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 · no encontrado");
  }
}).listen(PUERTO, () => {
  console.log(`✦ Servidor local listo (Ctrl+C para detener)`);
  console.log(`  Prototipo interactivo: http://localhost:${PUERTO}/sobre.html`);
  console.log(`  Overlay de canjes:     http://localhost:${PUERTO}/overlay.html`);
  console.log(`  Configurar Twitch:     http://localhost:${PUERTO}/overlay-config.html`);
});
