/*
 * TwitchEvents · EventSub WebSocket para canjes de puntos de canal.
 * Escucha: channel.channel_points_custom_reward_redemption.add
 * Reconecta solo y vuelve a crear la suscripción en cada sesión nueva
 * (las suscripciones de tipo websocket viven mientras vive el socket).
 */
window.TwitchEvents = (() => {
  const WS_URL = "wss://eventsub.websocket.twitch.tv/ws";
  const API_SUBS = "https://api.twitch.tv/helix/eventsub/subscriptions";
  const TIPO = "channel.channel_points_custom_reward_redemption.add";

  let ws = null;
  let sesionId = null;
  let opciones = null; // { clientId, broadcasterId, alRedimir, alEstado }
  let apagado = true;
  let intento = 0;
  let temporizador = null;

  function estado(nombre, detalle = "") {
    opciones?.alEstado?.(nombre, detalle);
  }

  function programarReintento() {
    clearTimeout(temporizador);
    if (apagado) return;
    intento += 1;
    const delay = Math.min(60000, 3000 * 2 ** (intento - 1));
    estado("reconectando", `reintento ${intento} en ${Math.round(delay / 1000)}s`);
    temporizador = setTimeout(abrir, delay);
  }

  async function suscribir() {
    const token = await window.TwitchAuth.tokenValido();
    if (!token) throw new Error("no hay token de Twitch válido");

    const res = await fetch(API_SUBS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": opciones.clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: TIPO,
        version: "1",
        condition: { broadcaster_user_id: opciones.broadcasterId },
        transport: { method: "websocket", session_id: sesionId },
      }),
    });
    if (!res.ok) {
      const texto = await res.text().catch(() => "");
      throw new Error(`creando suscripción (${res.status}) ${texto}`.trim());
    }
    return res.json();
  }

  function abrir() {
    if (apagado) return;
    estado("conectando");

    try {
      ws?.close();
    } catch {
      /* ya estaba cerrado */
    }

    ws = new WebSocket(WS_URL);

    ws.onmessage = (mensaje) => {
      let dato;
      try {
        dato = JSON.parse(mensaje.data);
      } catch {
        return;
      }

      const tipo = dato.metadata?.message_type;

      if (tipo === "session_welcome") {
        sesionId = dato.payload?.session?.id;
        suscribir()
          .then((sub) => {
            intento = 0;
            estado("conectado", sub?.data?.[0]?.id || "");
          })
          .catch((error) => {
            estado("error", error.message);
            programarReintento();
          });
      } else if (tipo === "notification") {
        if (dato.payload?.subscription?.type === TIPO) {
          opciones.alRedimir?.(dato.payload.event);
        }
      } else if (tipo === "session_reconnect") {
        /* El servidor pide migrar de socket: cerramos y la reconexión
           crea una sesión nueva con su suscripción nueva. */
        estado("reconectando");
        try {
          ws.close();
        } catch {
          /* ya cerrado */
        }
      } else if (tipo === "revocation") {
        estado("error", "suscripción revocada por Twitch");
        programarReintento();
      }
      /* session_keepalive: no hay que hacer nada */
    };

    ws.onclose = () => {
      if (apagado) return;
      estado("desconectado");
      programarReintento();
    };

    ws.onerror = () => {
      /* onclose maneja la recuperación */
    };
  }

  function conectar(nuevasOpciones) {
    opciones = nuevasOpciones;
    apagado = false;
    intento = 0;
    abrir();
  }

  function desconectar() {
    apagado = true;
    clearTimeout(temporizador);
    try {
      ws?.close();
    } catch {
      /* ya cerrado */
    }
    estado("desconectado");
  }

  return { conectar, desconectar };
})();
