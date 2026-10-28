/*
 * Álbum de colección · WewinVT
 * - Pinta el catálogo por rareza desde la colección (localStorage, unida con la nube).
 * - Login de viewers con Twitch: la colección se guarda en línea vía /api/coleccion.
 * - Al conectarse, une local y nube (máximo por carta) y sube lo jugado offline.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const CATALOGO = window.SOBRE_CATALOGO || [];
  const ORDEN = ["legendaria", "epica", "rara", "comun"];
  const RAREZAS = {
    comun: { nombre: "Común", color: "#bfa78f" },
    rara: { nombre: "Rara", color: "#a8e6d4" },
    epica: { nombre: "Épica", color: "#ff5a6a" },
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
  const numeroDe = (datos) => "#" + String(CATALOGO.indexOf(datos) + 1).padStart(2, "0");

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

      /* Une local y nube; lo jugado offline se sube a la nube */
      const deltas = [];
      for (const carta of CATALOGO) {
        const localN = coleccion[carta.id] || 0;
        const nubeN = nube.cartas?.[carta.id] || 0;
        for (let i = 0; i < localN - nubeN; i++) deltas.push(carta.id);
        coleccion[carta.id] = Math.max(localN, nubeN);
      }
      sobres = Math.max(sobres, nube.sobres || 0);

      if (deltas.length) {
        await fetch("/api/coleccion", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ anadir: deltas }),
        });
      }

      localStorage.setItem("wewinvt_coleccion", JSON.stringify(coleccion));
      localStorage.setItem("wewinvt_sobres", String(sobres));
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
      linea.innerHTML = `Colección en línea ✅${nombre ? ` · <b>${nombre}</b>` : ""}`;
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
      grupo.forEach((datos, i) => {
        grid.append(obtenidas(datos.id) > 0 ? cartaObtenida(datos, i) : cartaBloqueada(i));
      });
      album.append(seccion);
    });
  }

  function cartaObtenida(datos, indice, clickeable = true) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card is-flip is-revealed";
    btn.style.setProperty("--d", `${indice * 0.04}s`);
    btn.dataset.rareza = datos.rareza;
    btn.dataset.tipo = datos.tipo;
    btn.setAttribute("aria-label", `${datos.nombre}, ${RAREZAS[datos.rareza].nombre} (${datos.tipo})`);
    btn.innerHTML = `
      <span class="card__bob">
        <span class="card__inner">
          <span class="card__face card__face--front">
            <span class="card__head">
              <span class="card__name">${datos.nombre}</span>
              <span class="card__num">${numeroDe(datos)}</span>
            </span>
            <span class="card__art">
              <img src="${datos.src}" alt="${datos.alt}" loading="lazy" decoding="async" draggable="false" />
              <i class="card__holo"></i>
              <i class="card__spark"></i>
            </span>
            <span class="card__meta">
              <span class="card__tipo">${datos.tipo}</span>
              <span class="card__rareza"><span class="card__gem"></span>${RAREZAS[datos.rareza].nombre}</span>
            </span>
          </span>
        </span>
      </span>
    `;
    if (clickeable) btn.addEventListener("click", () => abrirDetalle(datos));
    return btn;
  }

  function cartaBloqueada(indice) {
    const div = document.createElement("div");
    div.className = "card card--locked";
    div.style.setProperty("--d", `${indice * 0.04}s`);
    div.setAttribute("aria-label", "Carta sin descubrir");
    div.innerHTML = `
      <span class="card__bob">
        <span class="card__inner">
          <span class="card__face card__face--back">
            <span class="card__emblem">?</span>
          </span>
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

  function abrirDetalle(datos) {
    const enlaceArtista = datos.enlace
      ? `<a href="${datos.enlace}" target="_blank" rel="noreferrer">${datos.artista || "Anónimo"}</a>`
      : datos.artista || "Anónimo";

    cajaCarta.innerHTML = "";
    cajaCarta.append(cartaObtenida(datos, 0, false));

    cajaInfo.innerHTML = `
      <h3>${datos.nombre}</h3>
      <p class="detalle-dato"><span>Tipo</span><b>${datos.tipo}</b></p>
      <p class="detalle-dato"><span>Rareza</span><b style="color: ${RAREZAS[datos.rareza].color}">${RAREZAS[datos.rareza].nombre}</b></p>
      <p class="detalle-dato"><span>Número</span><b>${numeroDe(datos)}</b></p>
      <p class="detalle-dato"><span>Artista</span><b>${enlaceArtista}</b></p>
      <p class="detalle-dato"><span>Obtenida</span><b>×${obtenidas(datos.id)}</b></p>
    `;

    detalle.hidden = false;
    document.body.classList.add("sin-scroll");
  }

  function cerrarDetalle() {
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
     REINICIAR COLECCIÓN (para probar)
     ========================================================= */
  $("[data-reiniciar]").addEventListener("click", async () => {
    if (!confirm("¿Borrar toda la colección de este navegador?")) return;
    localStorage.removeItem("wewinvt_coleccion");
    localStorage.removeItem("wewinvt_sobres");
    try {
      const token = await window.TwitchAuth.tokenValido();
      if (token) {
        await fetch("/api/coleccion", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      /* si falla la nube, al menos se limpia lo local */
    }
    location.reload();
  });

  /* =========================================================
     INICIO
     ========================================================= */
  (async () => {
    await cargarConfig();

    /* Regreso de Twitch con ?code=... (login del viewer) */
    const query = new URLSearchParams(location.search);
    if (query.get("code") && clienteId) {
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
