/*
 * Álbum de colección · WewinVT
 * - Sin sesión: pinta la colección local (localStorage) de la demo /sobre.
 * - Con sesión de Twitch: pinta la colección en línea (GET /api/coleccion), que solo
 *   cambia por canjes reales del stream. No se sube nada y no se pisa el localStorage.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const CATALOGO = window.SOBRE_CATALOGO || [];
  const ORDEN = ["legendaria", "epica", "rara", "comun"];
  const Carta = window.CartaWewin;
  const RAREZAS = {
    comun: { nombre: "Común", color: "#bfa78f" },
    rara: { nombre: "Rara", color: "#a8e6d4" },
    epica: { nombre: "Épica", color: "#b994ff" },
    legendaria: { nombre: "Legendaria", color: "#f2b263" },
  };

  let coleccion = {};
  let sobres = 0;
  let clienteId = null;

  try {
    coleccion = JSON.parse(localStorage.getItem("wewinvt_coleccion") || "{}");
  } catch {
    /* colección corrupta: se empieza de cero */
  }
  sobres = Number(localStorage.getItem("wewinvt_sobres") || 0);

  const obtenidas = (id) => coleccion[id] || 0;
  const numeroDe = (datos) => "#" + String(CATALOGO.indexOf(datos) + 1).padStart(3, "0");

  /* =========================================================
     NUBE: configuración, login y sincronización
     ========================================================= */
  async function cargarConfig() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) clienteId = (await res.json())?.clientId || null;
    } catch {
      /* sin worker desplegado todavía */
    }
  }

  async function sincronizar() {
    let token = null;
    try {
      token = await window.TwitchAuth.tokenValido();
    } catch {
      token = null;
    }
    if (!token) return false;

    try {
      const res = await fetch("/api/coleccion", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const datos = await res.json();
      const nube = datos.coleccion || { cartas: {}, sobres: 0 };

      /* Con sesión se muestra la nube, solo en memoria: la colección local de la
         demo sigue intacta en localStorage y vuelve a verse al cerrar sesión */
      coleccion = { ...(nube.cartas || {}) };
      sobres = Number(nube.sobres) || 0;
      return true;
    } catch {
      return false;
    }
  }

  async function pintarIdentidad() {
    const linea = $("[data-identidad]");
    const btnConectar = $("[data-conectar]");
    const btnSalir = $("[data-salir]");
    if (!linea) return;

    let token = null;
    try {
      token = await window.TwitchAuth.tokenValido();
    } catch {
      token = null;
    }

    if (token) {
      let nombre = "";
      if (clienteId) {
        try {
          nombre = (await window.TwitchAuth.obtenerUsuario(token, clienteId))?.display_name || "";
        } catch {
          nombre = "";
        }
      }
      linea.innerHTML = `Colección en línea ✅ (solo cambia con canjes del stream)${nombre ? ` · <b>${nombre}</b>` : ""}`;
      btnConectar.hidden = true;
      btnSalir.hidden = false;
    } else {
      linea.textContent = "Colección local en este navegador";
      btnConectar.hidden = false;
      btnConectar.disabled = !clienteId;
      btnConectar.title = clienteId ? "" : "El servidor aún no tiene configurado el CLIENT_ID";
      btnSalir.hidden = true;
    }
  }

  $("[data-conectar]").addEventListener("click", async () => {
    if (!clienteId) return;
    try {
      /* Los viewers inician sesión sin permisos extra (solo identidad) */
      await window.TwitchAuth.iniciarLogin(clienteId, location.origin + location.pathname, "");
    } catch (error) {
      $("[data-identidad]").textContent = `No se pudo iniciar el login: ${error.message}`;
    }
  });

  $("[data-salir]").addEventListener("click", () => {
    window.TwitchAuth.borrarToken();
    location.reload();
  });

  /* =========================================================
     RENDER
     ========================================================= */
  function render() {
    const total = CATALOGO.length;
    const cuantas = CATALOGO.filter((c) => obtenidas(c.id) > 0).length;
    const pct = total ? Math.round((cuantas / total) * 100) : 0;

    $("[data-total-cartas]").textContent = String(total);
    $("[data-total-obtenidas]").textContent = String(cuantas);
    $("[data-porcentaje]").textContent = `${pct}%`;
    $("[data-sobres]").textContent = String(sobres);

    const barra = $("[data-barra]");
    if (barra) barra.setAttribute("aria-valuenow", String(pct));
    const relleno = $("[data-barra-fill]");
    if (relleno) relleno.style.width = `${pct}%`;

    $("[data-vacio]").hidden = cuantas !== 0;

    const stats = $("[data-stats]");
    stats.innerHTML = "";
    ORDEN.forEach((clave) => {
      const grupo = CATALOGO.filter((c) => c.rareza === clave);
      const tengo = grupo.filter((c) => obtenidas(c.id) > 0).length;
      const chip = document.createElement("span");
      chip.className = "stat";
      chip.style.setProperty("--c", RAREZAS[clave].color);
      chip.innerHTML = `<i aria-hidden="true"></i>${RAREZAS[clave].nombre} <b>${tengo}/${grupo.length}</b>`;
      stats.append(chip);
    });

    const album = $("[data-album]");
    album.innerHTML = "";

    ORDEN.forEach((clave) => {
      const grupo = CATALOGO.filter((c) => c.rareza === clave);
      const tengo = grupo.filter((c) => obtenidas(c.id) > 0).length;

      const seccion = document.createElement("section");
      seccion.className = "album-seccion";
      seccion.style.setProperty("--c", RAREZAS[clave].color);
      seccion.innerHTML = `
        <header class="album-rareza">
          <h2>${RAREZAS[clave].nombre}</h2>
          <span class="conteo">${tengo}/${grupo.length}</span>
          <span class="linea" aria-hidden="true"></span>
        </header>
        <div class="album-grid"></div>
      `;

      const grid = seccion.querySelector(".album-grid");
      grupo.forEach((datos) => {
        grid.append(obtenidas(datos.id) > 0 ? cartaObtenida(datos) : cartaBloqueada());
      });
      album.append(seccion);
    });

    const destacada = $(`[data-novedad-proyectado]`);
    if (destacada) {
      destacada.innerHTML = "";
      const carta = CATALOGO.find((c) => c.id === "proyectado");
      if (carta) destacada.append(cartaObtenida(carta));
    }

    const todasLasVariantesHolo = CATALOGO.filter((c) => c.variante === "holo");
    const variantesHolo = ORDEN
      .map((rareza) => todasLasVariantesHolo.find((c) => c.rareza === rareza))
      .filter(Boolean);
    const carruselHolo = $(`[data-novedades-holo]`);
    if (carruselHolo) {
      carruselHolo.innerHTML = "";
      variantesHolo.forEach((carta) => carruselHolo.append(cartaObtenida(carta)));
    }

    const totalHolo = $(`[data-novedades-holo-count]`);
    if (totalHolo) totalHolo.textContent = `${variantesHolo.length} de ${todasLasVariantesHolo.length}`;
  }

  /* En la cuadrícula la carta queda plana y quieta; solo se inclina la que se toca */
  function cartaObtenida(datos, opciones = { plana: true }) {
    const btn = Carta.crearCarta(datos, { soloFrente: true, ...opciones });
    btn.setAttribute("aria-label", Carta.etiquetaCarta(datos));
    if (opciones.plana) btn.addEventListener("click", () => abrirDetalle(datos));
    return btn;
  }

  function cartaBloqueada() {
    const div = document.createElement("div");
    div.className = "card card--locked";
    div.setAttribute("aria-label", "Carta sin descubrir");
    div.innerHTML = `
      <span class="card__incl">
        <span class="card__inner">
          <span class="card__face card__face--back"></span>
        </span>
      </span>
    `;
    return div;
  }

  /* =========================================================
     DETALLE DE CARTA
     ========================================================= */
  const detalle = $("[data-detalle]");
  const cajaCarta = $("[data-detalle-carta]");
  const cajaInfo = $("[data-detalle-info]");
  let dejarDeInclinar = () => {};

  function abrirDetalle(datos) {
    const enlaceArtista = datos.enlace
      ? `<a href="${datos.enlace}" target="_blank" rel="noreferrer">${datos.artista || "Anónimo"}</a>`
      : datos.artista || "Anónimo";

    cajaCarta.innerHTML = "";
    const carta = cartaObtenida(datos, { mece: datos.variante === "holo" });
    cajaCarta.append(carta);
    dejarDeInclinar();
    dejarDeInclinar = Carta.seguirInclinacion(carta);

    cajaInfo.innerHTML = `
      <h3>${datos.nombre}</h3>
      ${datos.lore ? '<p class="detalle-lore"></p>' : ""}
      <p class="detalle-dato"><span>Tipo</span><b>${datos.tipo}</b></p>
      <p class="detalle-dato"><span>Rareza</span><b style="color: ${RAREZAS[datos.rareza].color}">${RAREZAS[datos.rareza].nombre}</b></p>
      ${datos.nombreVariante ? `<p class="detalle-dato"><span>Variante</span><b>${datos.nombreVariante}</b></p>` : ""}
      <p class="detalle-dato"><span>Número</span><b>${numeroDe(datos)}</b></p>
      <p class="detalle-dato"><span>Artista</span><b>${enlaceArtista}</b></p>
      <p class="detalle-dato"><span>Obtenida</span><b>×${obtenidas(datos.id)}</b></p>
    `;
    if (datos.lore) cajaInfo.querySelector(".detalle-lore").textContent = datos.lore;

    detalle.hidden = false;
    document.body.classList.add("sin-scroll");
  }

  function cerrarDetalle() {
    dejarDeInclinar();
    dejarDeInclinar = () => {};
    cajaCarta.innerHTML = "";
    detalle.hidden = true;
    document.body.classList.remove("sin-scroll");
  }

  detalle.addEventListener("click", (e) => {
    if (e.target === detalle) cerrarDetalle();
  });
  $("[data-cerrar]").addEventListener("click", cerrarDetalle);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detalle.hidden) cerrarDetalle();
  });

  /* =========================================================
     REINICIAR COLECCIÓN
     Se retiró la UI de reinicio: para pruebas, borra las claves
     "wewinvt_coleccion" y "wewinvt_sobres" desde la consola.
     ========================================================= */

  /* =========================================================
     INICIO
     ========================================================= */
  (async () => {
    await cargarConfig();

    /* Regreso de Twitch con ?code=... (login del viewer) */
    const query = new URLSearchParams(location.search);
    if (query.get("error")) {
      const linea = $("[data-identidad]");
      if (linea) linea.textContent = `Twitch canceló el login (${query.get("error")}). Intenta de nuevo.`;
      history.replaceState(null, "", location.pathname);
    } else if (query.get("code") && clienteId) {
      try {
        await window.TwitchAuth.completarLogin(clienteId, location.origin + location.pathname);
      } catch (error) {
        const linea = $("[data-identidad]");
        if (linea) linea.textContent = `No se pudo completar el login: ${error.message}`;
      }
    }

    await sincronizar();
    await pintarIdentidad();
    render();
  })();
})();
