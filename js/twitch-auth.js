/*
 * TwitchAuth · OAuth (PKCE) client-side para el overlay de WewinVT.
 * Alcance usado: channel:read:redemptions (solo lectura de canjes de puntos).
 * Guarda el token en localStorage y lo refresca solo.
 */
window.TwitchAuth = (() => {
  const AUTORIZAR = "https://id.twitch.tv/oauth2/authorize";
  const TOKEN = "https://id.twitch.tv/oauth2/token";
  const SCOPES = "channel:read:redemptions";
  const LS_CONFIG = "wewinvt_overlay_config";
  const LS_TOKEN = "wewinvt_twitch_token";

  let refrescando = null;

  /* ---------- Config (clientId, canal, recompensa) ---------- */

  function leerConfig() {
    try {
      return JSON.parse(localStorage.getItem(LS_CONFIG)) || null;
    } catch {
      return null;
    }
  }

  function guardarConfig(config) {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config || {}));
  }

  /* ---------- Token ---------- */

  function leerToken() {
    try {
      return JSON.parse(localStorage.getItem(LS_TOKEN)) || null;
    } catch {
      return null;
    }
  }

  function guardarToken(token) {
    localStorage.setItem(LS_TOKEN, JSON.stringify(token));
  }

  function borrarToken() {
    localStorage.removeItem(LS_TOKEN);
  }

  /* ---------- PKCE ---------- */

  function b64url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function crearVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return b64url(bytes.buffer);
  }

  async function desafioPkce(verifier) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return b64url(hash);
  }

  /* ---------- Login (redirige a Twitch y regresa con ?code=...) ---------- */

  async function iniciarLogin(clientId, redirectUri) {
    const verifier = crearVerifier();
    const state = crearVerifier();
    sessionStorage.setItem("wewinvt_pkce_verifier", verifier);
    sessionStorage.setItem("wewinvt_oauth_state", state);

    const challenge = await desafioPkce(verifier);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    });
    location.href = `${AUTORIZAR}?${params}`;
  }

  async function completarLogin(clientId, redirectUri) {
    const query = new URLSearchParams(location.search);
    const code = query.get("code");
    if (!code) return null;

    const state = query.get("state");
    const esperado = sessionStorage.getItem("wewinvt_oauth_state");
    const verifier = sessionStorage.getItem("wewinvt_pkce_verifier");
    sessionStorage.removeItem("wewinvt_oauth_state");
    sessionStorage.removeItem("wewinvt_pkce_verifier");

    if (!esperado || state !== esperado) throw new Error("state de OAuth inválido");
    if (!verifier) throw new Error("falta el verifier PKCE");

    history.replaceState(null, "", location.pathname);

    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      let motivo = cuerpo;
      try {
        motivo = JSON.parse(cuerpo)?.message || cuerpo;
      } catch {
        /* cuerpo no era JSON, se usa tal cual */
      }
      console.warn("[TwitchAuth] respuesta del token endpoint:", res.status, cuerpo);
      throw new Error(`no se pudo canjear el código (${res.status})${motivo ? `: ${motivo}` : ""}`);
    }

    const datos = await res.json();
    guardarToken({
      access_token: datos.access_token,
      refresh_token: datos.refresh_token,
      expira: Date.now() + Math.max((datos.expires_in || 0) - 60, 30) * 1000,
    });
    return datos;
  }

  /* ---------- Token vigente (refresca en background) ---------- */

  async function refrescar() {
    const config = leerConfig();
    const token = leerToken();
    if (!token?.refresh_token || !config?.clientId) {
      borrarToken();
      throw new Error("sin credenciales para refrescar el token");
    }

    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });
    if (!res.ok) {
      borrarToken();
      throw new Error(`refresh del token falló (${res.status})`);
    }

    const datos = await res.json();
    const nuevo = {
      access_token: datos.access_token,
      refresh_token: datos.refresh_token || token.refresh_token,
      expira: Date.now() + Math.max((datos.expires_in || 0) - 60, 30) * 1000,
    };
    guardarToken(nuevo);
    return nuevo.access_token;
  }

  async function tokenValido() {
    const token = leerToken();
    if (!token) return null;
    if (Date.now() < token.expira) return token.access_token;
    if (!refrescando) {
      refrescando = refrescar().finally(() => {
        refrescando = null;
      });
    }
    return refrescando;
  }

  /* ---------- Helix ---------- */

  async function obtenerUsuario(accessToken, clientId, login) {
    const url = new URL("https://api.twitch.tv/helix/users");
    if (login) url.searchParams.set("login", login);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
    });
    if (!res.ok) throw new Error(`helix/users (${res.status})`);
    const datos = await res.json();
    return datos.data?.[0] || null;
  }

  return {
    SCOPES,
    leerConfig,
    guardarConfig,
    leerToken,
    guardarToken,
    borrarToken,
    iniciarLogin,
    completarLogin,
    tokenValido,
    obtenerUsuario,
  };
})();
