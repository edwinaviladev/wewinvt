/*
 * Álbum de colección · WewinVT
 * Lee la colección de localStorage (la llenan sobre.html y overlay.html)
 * y pinta el catálogo completo por rareza + detalle de cada carta.
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
  try {
    coleccion = JSON.parse(localStorage.getItem("wewinvt_coleccion") || "{}");
  } catch {
    /* colección corrupta: se empieza de cero */
  }

  const obtenidas = (id) => coleccion[id] || 0;
  const numeroDe = (datos) => "#" + String(CATALOGO.indexOf(datos) + 1).padStart(2, "0");

  /* =========================================================
     ENCABEZADO: progreso y estadísticas
     ========================================================= */
  const total = CATALOGO.length;
  const cuantas = CATALOGO.filter((c) => obtenidas(c.id) > 0).length;
  const pct = total ? Math.round((cuantas / total) * 100) : 0;

  $("[data-total-cartas]").textContent = String(total);
  $("[data-total-obtenidas]").textContent = String(cuantas);
  $("[data-porcentaje]").textContent = `${pct}%`;
  $("[data-sobres]").textContent = localStorage.getItem("wewinvt_sobres") || "0";

  const barra = $("[data-barra]");
  const relleno = $("[data-barra-fill]");
  if (barra) barra.setAttribute("aria-valuenow", String(pct));
  /* Se anima al entrar en pantalla */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      relleno.style.width = `${pct}%`;
    });
  });

  if (cuantas === 0) $("[data-vacio]").hidden = false;

  const stats = $("[data-stats]");
  ORDEN.forEach((clave) => {
    const grupo = CATALOGO.filter((c) => c.rareza === clave);
    const tengo = grupo.filter((c) => obtenidas(c.id) > 0).length;
    const chip = document.createElement("span");
    chip.className = "stat";
    chip.style.setProperty("--c", RAREZAS[clave].color);
    chip.innerHTML = `<i aria-hidden="true"></i>${RAREZAS[clave].nombre} <b>${tengo}/${grupo.length}</b>`;
    stats.append(chip);
  });

  /* =========================================================
     ÁLBUM: secciones por rareza
     ========================================================= */
  const album = $("[data-album]");

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
  $("[data-reiniciar]").addEventListener("click", () => {
    if (!confirm("¿Borrar toda la colección de este navegador?")) return;
    localStorage.removeItem("wewinvt_coleccion");
    localStorage.removeItem("wewinvt_sobres");
    location.reload();
  });
})();
