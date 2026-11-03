(() => {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const redirectUri = location.origin + location.pathname;

  const inpClientId = $("#cliente-id");
  const inpCanal = $("#canal");
  const inpRecompensa = $("#recompensa");
  const lineaEstado = $("[data-estado-linea]");
  const textoEstado = $("[data-estado-texto]");
  const cajaError = $("[data-error]");

  $("#redirect-uri").textContent = redirectUri;
  $("[data-url-overlay]").textContent =
    location.origin + location.pathname.replace("overlay-config.html", "overlay.html") + "?transparente=1";

  $("[data-copiar]").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      e.target.textContent = "¡Copiado!";
      setTimeout(() => (e.target.textContent = "Copiar"), 1600);
    } catch {
      cajaError.textContent = "No se pudo copiar: selecciónalo y cópialo manualmente.";
    }
  });

  function pintarEstado(clase, texto) {
    lineaEstado.hidden = false;
    lineaEstado.className = "estado-linea" + (clase ? ` ${clase}` : "");
    textoEstado.textContent = texto;
  }

  function limpiarError() {
    cajaError.textContent = "";
  }

  function error(msg) {
    cajaError.textContent = msg;
    pintarEstado("mal", "Sin conexión.");
  }

  /* Regresar de Twitch con ?code=... */
  window.addEventListener("DOMContentLoaded", async () => {
    const config = window.TwitchAuth.leerConfig();
    if (config) {
      inpCanal.value = config.canal || "";
      inpRecompensa.value = config.recompensa || "";
    }

    /* El Client ID es propiedad del servidor: siempre manda él */
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const datos = await res.json();
        if (datos.clientId) inpClientId.value = datos.clientId;
      }
    } catch {
      /* sin worker desplegado todavía */
    }

    const query = new URLSearchParams(location.search);
    if (query.get("error")) {
      if (query.get("error") === "redirect_mismatch") {
        error(`El redirect URI de la página no está registrado en tu app de Twitch. Agrega EXACTO "${redirectUri}" en dev.twitch.tv/console/apps → tu app → OAuth Redirect URLs.`);
      } else {
        error(`Twitch rechazó el acceso (${query.get("error")}).`);
      }
      return;
    }
    if (query.get("code")) {
      try {
        limpiarError();
        const id = (config?.clientId || inpClientId.value).trim();
        if (!id) throw new Error("falta el Client ID");
        await window.TwitchAuth.completarLogin(id, redirectUri);
        pintarEstado("ok", "¡Twitch conectado! El token se renovará solo.");
      } catch (e) {
        const msg = String(e.message || e);
        console.warn("[Twitch] fallo el login:", e);
        if (/invalid grant/i.test(msg)) {
          error("El código de Twitch ya se usó o expiró (dura solo segundos). Da clic otra vez en «Conectar con Twitch» y no recargues la página al volver.");
        } else if (/invalid client/i.test(msg)) {
          error("El Client ID no corresponde a una app válida. Cópialo de nuevo desde dev.twitch.tv/console/apps.");
        } else if (/redirect/i.test(msg)) {
          error(`El redirect URI no coincide. Debe estar registrado EXACTO en tu app: ${redirectUri}`);
        } else {
          error(`No se pudo completar el login: ${msg}`);
        }
      }
      return;
    }
    if (window.TwitchAuth.leerToken()) {
      pintarEstado("", "Ya existe un token guardado. Usa «Probar conexión» para verificarlo.");
    }
  });

  $("[data-conectar]").addEventListener("click", () => {
    limpiarError();
    const clientId = inpClientId.value.trim();
    if (!clientId) {
      error("El servidor aún no tiene el CLIENT_ID configurado (variable en wrangler/dashboard).");
      return;
    }
    window.TwitchAuth.guardarConfig({
      clientId,
      canal: inpCanal.value.trim().toLowerCase(),
      recompensa: inpRecompensa.value.trim(),
    });
    window.TwitchAuth.iniciarLogin(clientId, redirectUri).catch((e) => error(e.message));
  });

  $("[data-verificar]").addEventListener("click", async () => {
    limpiarError();
    try {
      const config = window.TwitchAuth.leerConfig();
      if (!config?.clientId) throw new Error("primero guarda la configuración con «Conectar»");
      const token = await window.TwitchAuth.tokenValido();
      if (!token) throw new Error("aún no hay token: usa «Conectar con Twitch»");
      const usuario = await window.TwitchAuth.obtenerUsuario(token, config.clientId, config.canal);
      if (!usuario) throw new Error("no se encontró ese canal");
      pintarEstado("ok", `Conectado como ${usuario.display_name} (@${usuario.login}).`);
    } catch (e) {
      error(e.message);
    }
  });
})();
