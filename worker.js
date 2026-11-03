/*
 * WewinVT · API de colecciones (Cloudflare Worker)
 *
 * ACTIVACIÓN (wrangler.jsonc):
 *   "main": "worker.js",
 *   "assets": { "directory": ".", "not_found_handling": "404-page", "binding": "ASSETS" },
 *   "kv_namespaces": [{ "binding": "COLECCIONES", "id": "<id del namespace KV>" }],
 *
 * VARIABLES Y SECRETOS (dashboard → Workers → wewinvt → Settings → Variables and Secrets):
 *   CLIENT_ID       · client id de la app de Twitch (sin él, la API rechaza todo token)
 *   CLIENT_SECRET   · client secret de la app de Twitch (Secret)
 *   BROADCASTER_ID  · id de Twitch del dueño del canal; es el ÚNICO que puede registrar
 *                     canjes. Sin él, /api/canje falla cerrado (500).
 *
 * ENDPOINTS:
 *   GET    /api/config      → { clientId } público (sin secret)
 *   POST   /api/login       → canjea el ?code= de OAuth (el secret vive aquí)
 *   POST   /api/refresh     → renueva el token con el refresh_token
 *   GET    /api/coleccion   → colección del usuario del token
 *   DELETE /api/coleccion   → borra la colección del usuario del token
 *   POST   /api/canje       → (solo BROADCASTER_ID) { canjeId, usuarioId }: el servidor
 *                             sortea el sobre y lo suma a la colección. Idempotente por canjeId.
 *
 * La colección en línea solo cambia por canjes del stream: no hay endpoint para
 * que el cliente escriba cartas, y el sorteo ocurre aquí (js/sorteo.js).
 */

import "./js/sobre-data.js";
import "./js/sorteo.js";

const TWITCH_VALIDATE = "https://id.twitch.tv/oauth2/validate";
const TWITCH_TOKEN = "https://id.twitch.tv/oauth2/token";

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const claveColeccion = (userId) => `coleccion:${userId}`;
const claveCanje = (canjeId) => `canje:${canjeId}`;
const TTL_CANJE = 7 * 24 * 60 * 60; // segundos: ventana de idempotencia
const MAX_CANJES_APLICADOS = 200; // por colección: últimos canjes ya sumados

/* Error con código HTTP: el mensaje es seguro de mostrar al cliente */
class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

/* Lee el cuerpo JSON; si no es JSON válido o no es un objeto → 400 */
async function leerJson(request) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    throw new ErrorHttp(400, "el cuerpo debe ser JSON válido");
  }
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw new ErrorHttp(400, "el cuerpo debe ser un objeto JSON");
  }
  return cuerpo;
}

/* Aleatoriedad criptográfica en [0, 1) para el sorteo del servidor */
function azarSeguro() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/* Valida un token de Twitch y devuelve { user_id, login, client_id, ... } */
async function twitchTokenValido(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ErrorHttp(401, "falta el token de Twitch");
  /* Sin CLIENT_ID no se puede comprobar la app: falla cerrado */
  if (!env.CLIENT_ID) throw new ErrorHttp(500, "el servidor no tiene CLIENT_ID configurado");

  const res = await fetch(TWITCH_VALIDATE, { headers: { Authorization: `OAuth ${token}` } });
  if (res.status === 401) throw new ErrorHttp(401, "token de Twitch inválido");
  /* Otro error es un fallo de Twitch, no del token: 5xx para que el cliente reintente */
  if (!res.ok) throw new ErrorHttp(502, "no se pudo validar el token con Twitch");
  const datos = await res.json();
  if (datos.client_id !== env.CLIENT_ID) {
    throw new ErrorHttp(401, "el token no pertenece a esta aplicación");
  }
  return datos;
}

async function leerColeccionDe(env, userId) {
  if (!env.COLECCIONES) throw new ErrorHttp(500, "almacenamiento no configurado");
  const crudo = await env.COLECCIONES.get(claveColeccion(userId));
  return crudo ? JSON.parse(crudo) : { cartas: {}, sobres: 0 };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    try {
      if (url.pathname === "/api/config" && request.method === "GET") {
        return json({ clientId: env.CLIENT_ID || null });
      }

      if (url.pathname === "/api/login" && request.method === "POST") {
        if (!env.CLIENT_SECRET) {
          return json({ error: "el servidor no tiene CLIENT_SECRET configurado (debe ser de tipo Secret)" }, 500);
        }
        const cuerpo = await leerJson(request);
        const res = await fetch(TWITCH_TOKEN, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            code: cuerpo.code,
            code_verifier: cuerpo.code_verifier,
            grant_type: "authorization_code",
            redirect_uri: cuerpo.redirect_uri,
          }),
        });
        const datos = await res.json();
        return json(datos, res.ok ? 200 : 400);
      }

      if (url.pathname === "/api/refresh" && request.method === "POST") {
        if (!env.CLIENT_SECRET) {
          return json({ error: "el servidor no tiene CLIENT_SECRET configurado (debe ser de tipo Secret)" }, 500);
        }
        const cuerpo = await leerJson(request);
        const res = await fetch(TWITCH_TOKEN, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: cuerpo.refresh_token,
          }),
        });
        const datos = await res.json();
        return json(datos, res.ok ? 200 : 400);
      }

      if (url.pathname === "/api/coleccion" && request.method === "GET") {
        const usuario = await twitchTokenValido(request, env);
        const { cartas, sobres } = await leerColeccionDe(env, usuario.user_id);
        return json({ coleccion: { cartas, sobres } });
      }

      if (url.pathname === "/api/coleccion" && request.method === "DELETE") {
        const usuario = await twitchTokenValido(request, env);
        if (env.COLECCIONES) await env.COLECCIONES.delete(claveColeccion(usuario.user_id));
        return json({ ok: true });
      }

      if (url.pathname === "/api/canje" && request.method === "POST") {
        /* Sin BROADCASTER_ID no hay a quién autorizar: falla cerrado */
        if (!env.BROADCASTER_ID) throw new ErrorHttp(500, "el servidor no tiene BROADCASTER_ID configurado");
        const emisor = await twitchTokenValido(request, env);
        if (String(emisor.user_id) !== String(env.BROADCASTER_ID)) {
          throw new ErrorHttp(403, "solo el dueño del canal puede registrar canjes del stream");
        }
        if (!env.COLECCIONES) throw new ErrorHttp(500, "almacenamiento no configurado");

        /* Solo se leen canjeId y usuarioId; cualquier otro campo se ignora */
        const cuerpo = await leerJson(request);
        const canjeId = cuerpo.canjeId;
        const usuarioId = cuerpo.usuarioId;
        if (typeof canjeId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(canjeId)) {
          throw new ErrorHttp(400, "canjeId inválido");
        }
        if (typeof usuarioId !== "string" || !/^\d{1,20}$/.test(usuarioId)) {
          throw new ErrorHttp(400, "usuarioId inválido");
        }

        /* Idempotencia en dos pasos, para que un fallo a mitad se pueda reintentar:
           1) el resultado del sorteo se guarda antes de tocar la colección;
           2) la colección registra el canje en la misma escritura que suma las cartas. */
        const coleccion = await leerColeccionDe(env, usuarioId);
        const previo = await env.COLECCIONES.get(claveCanje(canjeId));
        let resultado = previo ? JSON.parse(previo) : null;
        if (resultado && resultado.usuarioId !== usuarioId) {
          throw new ErrorHttp(409, "canjeId ya usado por otro usuario");
        }
        if (!resultado) {
          const sorteo = globalThis.SOBRE_SORTEO.construirCartas(globalThis.SOBRE_CATALOGO, { random: azarSeguro });
          const ids = sorteo.map((c) => c.id);
          const nuevas = [...new Set(ids.filter((id) => !Number(coleccion.cartas[id])))];
          resultado = { usuarioId, cartas: ids, nuevas };
          await env.COLECCIONES.put(claveCanje(canjeId), JSON.stringify(resultado), { expirationTtl: TTL_CANJE });
        }

        const aplicados = coleccion.canjes || [];
        if (!aplicados.includes(canjeId)) {
          resultado.cartas.forEach((id) => {
            coleccion.cartas[id] = (Number(coleccion.cartas[id]) || 0) + 1;
          });
          coleccion.sobres = (coleccion.sobres || 0) + 1;
          coleccion.canjes = [...aplicados, canjeId].slice(-MAX_CANJES_APLICADOS);
          await env.COLECCIONES.put(claveColeccion(usuarioId), JSON.stringify(coleccion));
        }
        return json({ ok: true, cartas: resultado.cartas, nuevas: resultado.nuevas });
      }

      return json({ error: "no encontrado" }, 404);
    } catch (error) {
      if (error instanceof ErrorHttp) return json({ error: error.message }, error.status);
      return json({ error: "error interno" }, 500);
    }
  },
};
