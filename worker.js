/*
 * WewinVT · API de colecciones (Cloudflare Worker)
 *
 * ACTIVACIÓN (wrangler.jsonc):
 *   "main": "worker.js",
 *   "assets": { "directory": ".", "not_found_handling": "404-page", "binding": "ASSETS" },
 *   "kv_namespaces": [{ "binding": "COLECCIONES", "id": "<id del namespace KV>" }],
 *
 * SECRETOS (dashboard → Workers → wewinvt → Settings → Variables and Secrets):
 *   CLIENT_ID      · client id de la app de Twitch
 *   CLIENT_SECRET  · client secret de la app de Twitch
 *
 * ENDPOINTS:
 *   GET    /api/config      → { clientId } público (sin secret)
 *   POST   /api/login       → canjea el ?code= de OAuth (el secret vive aquí)
 *   POST   /api/refresh     → renueva el token con el refresh_token
 *   GET    /api/coleccion   → colección del usuario del token
 *   POST   /api/coleccion   → añade cartas/sobres al usuario del token
 *   DELETE /api/coleccion   → borra la colección del usuario del token
 *   POST   /api/canje       → (solo broadcaster) registra un canje del stream
 */

const TWITCH_VALIDATE = "https://id.twitch.tv/oauth2/validate";
const TWITCH_TOKEN = "https://id.twitch.tv/oauth2/token";

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const claveColeccion = (userId) => `coleccion:${userId}`;

/* Valida un token de Twitch y devuelve { user_id, login, client_id, ... } */
async function twitchTokenValido(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("falta el token de Twitch");

  const res = await fetch(TWITCH_VALIDATE, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new Error("token de Twitch inválido");
  const datos = await res.json();
  if (env.CLIENT_ID && datos.client_id !== env.CLIENT_ID) {
    throw new Error("el token no pertenece a esta aplicación");
  }
  return datos;
}

async function leerColeccionDe(env, userId) {
  if (!env.COLECCIONES) throw new Error("almacenamiento no configurado");
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
        const cuerpo = await request.json();
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
        const cuerpo = await request.json();
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
        const coleccion = await leerColeccionDe(env, usuario.user_id);
        return json({ coleccion });
      }

      if (url.pathname === "/api/coleccion" && request.method === "POST") {
        const usuario = await twitchTokenValido(request, env);
        const cuerpo = await request.json();
        const coleccion = await leerColeccionDe(env, usuario.user_id);
        (cuerpo.anadir || []).forEach((id) => {
          if (id) coleccion.cartas[id] = (coleccion.cartas[id] || 0) + 1;
        });
        if (cuerpo.sobres) coleccion.sobres = (coleccion.sobres || 0) + cuerpo.sobres;
        await env.COLECCIONES.put(claveColeccion(usuario.user_id), JSON.stringify(coleccion));
        return json({ ok: true, coleccion });
      }

      if (url.pathname === "/api/coleccion" && request.method === "DELETE") {
        const usuario = await twitchTokenValido(request, env);
        if (env.COLECCIONES) await env.COLECCIONES.delete(claveColeccion(usuario.user_id));
        return json({ ok: true });
      }

      if (url.pathname === "/api/canje" && request.method === "POST") {
        const emisor = await twitchTokenValido(request, env);
        const cuerpo = await request.json();
        if (String(emisor.user_id) !== String(cuerpo.broadcasterId)) {
          throw new Error("solo el dueño del canal puede registrar canjes del stream");
        }
        const idDestino = String(cuerpo.usuarioId || "");
        if (!idDestino) throw new Error("falta el usuario que canjeó");
        const coleccion = await leerColeccionDe(env, idDestino);
        (cuerpo.cartas || []).forEach((id) => {
          if (id) coleccion.cartas[id] = (coleccion.cartas[id] || 0) + 1;
        });
        coleccion.sobres = (coleccion.sobres || 0) + 1;
        await env.COLECCIONES.put(claveColeccion(idDestino), JSON.stringify(coleccion));
        return json({ ok: true });
      }

      return json({ error: "no encontrado" }, 404);
    } catch (error) {
      return json({ error: error.message || "error interno" }, 500);
    }
  },
};
