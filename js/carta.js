/*
 * Carta coleccionable · WewinVT
 * Marcado compartido por /sobre, /overlay y /album, y motor de inclinación:
 * un solo bucle que toca únicamente las cartas activas y visibles (--mx, --my, --luz).
 */
(() => {
  "use strict";

  const SERENO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const RAREZAS = {
    comun: { nombre: "Común", nivel: 1, color: "#d9cbb9" },
    rara: { nombre: "Rara", nivel: 2, color: "#9fecd6" },
    epica: { nombre: "Épica", nivel: 3, color: "#c8aefc" },
    legendaria: { nombre: "Legendaria", nivel: 4, color: "#ffd27a" },
  };

  /* =========================================================
     MARCADO
     ========================================================= */
  const CAPAS_HOLO = `
    <i class="card__prisma card__prisma--claro"></i>
    <i class="card__prisma card__prisma--oscuro"></i>
    <span class="card__patron"><i class="card__prisma"></i></span>
  `;

  /* Gold: marco, hoja de oro y filigrana comparten el motor de inclinación del Holo */
  const CAPAS_GOLD = `
    <i class="card__prisma card__oro--claro"></i>
    <i class="card__prisma card__oro--oscuro"></i>
    <span class="card__oro-patron"><i class="card__prisma"></i></span>
  `;

  /* Aura: energía que sale de la carta. Solo se mueve en cartas vivas (.is-viva).
     Las brasas suben desde abajo; cada una lleva su retraso (--d) y su deriva (--x) */
  const CAPAS_AURA_ATRAS = `
    <i class="aura__halo"></i>
    <span class="aura__humo aura__humo--1"><i></i></span>
    <span class="aura__humo aura__humo--2"><i></i></span>
    <span class="aura__anillo"><span><i></i></span></span>
    <i class="aura__onda"></i>
  `;
  const BRASAS_AURA = [-4, 104, 18, 88, -2, 102, 8, 96, 44, 70, -6, 106];
  const CAPAS_AURA_FRENTE = BRASAS_AURA
    .map((x, i) => `<i class="aura__chispa" style="left:${x}%;--d:${(i * 0.43).toFixed(2)}s;--x:${(x < 50 ? -1 : 1) * (6 + (i % 3) * 8)}px"></i>`)
    .join("");

  /* Variante distinta de la base (Holo, Gold…): la carta se mece sola */
  const esEspecial = (datos) => Boolean(datos?.variante) && datos.variante !== "base";

  function etiquetaCarta(datos, nueva = false) {
    const etiquetas = [datos.nombreVariante, nueva ? "Nueva" : ""].filter(Boolean);
    const detalle = etiquetas.length ? `, ${etiquetas.join(", ")}` : "";
    return `${datos.nombre}${detalle}, ${RAREZAS[datos.rareza].nombre} (${datos.tipo}), arte de ${datos.artista || "Anónimo"}`;
  }

  function htmlFrente(datos, perezosa) {
    const catalogo = window.SOBRE_CATALOGO || [];
    const holo = datos.variante === "holo";
    const gold = datos.variante === "gold";
    const numero = String(catalogo.indexOf(datos) + 1).padStart(3, "0");
    const carga = perezosa ? ' loading="lazy" decoding="async"' : "";
    return `
      <span class="card__face card__face--front">
        ${holo ? '<i class="card__prisma card__prisma--aro"></i>' : ""}
        ${gold ? '<i class="card__prisma card__oro--aro"></i>' : ""}
        <span class="card__lamina">
          <span class="card__franja">
            <span class="card__name">${datos.nombre}</span>
            <span class="card__num">#${numero}</span>
          </span>
          <span class="card__ventana">
            ${datos.variante === "aura" ? '<i class="aura-fondo" aria-hidden="true"></i>' : ""}
            <img class="card__arte" src="${datos.src}" alt="${datos.alt}"${carga} draggable="false" />
            ${holo ? CAPAS_HOLO : ""}
            ${gold ? CAPAS_GOLD : ""}
          </span>
          <span class="card__placa">
            <span class="card__chispas" aria-hidden="true">${"<i></i>".repeat(RAREZAS[datos.rareza].nivel)}</span>
            <span class="card__etiquetas">
              ${datos.nombreVariante ? `<span class="card__variante">${datos.nombreVariante}</span>` : ""}
              <span class="card__tipo">${datos.tipo}</span>
            </span>
            <span class="card__credito"><span>Ilus.</span> ${datos.artista || "Anónimo"}</span>
            <span class="card__serie">S1 · ${catalogo.length}</span>
          </span>
        </span>
        <span class="card__nueva" aria-hidden="true">Nueva</span>
        <i class="card__brillo"></i>
        ${gold ? `<span class="card__destellos" aria-hidden="true">${"<i></i>".repeat(4)}</span><span class="card__barrido" aria-hidden="true"></span>` : ""}
      </span>
    `;
  }

  /* Opciones:
     - soloFrente: carta ya descubierta, sin dorso ni giro.
     - plana: sin capas 3D en reposo (cuadrículas con muchas cartas).
     - mece: se balancea sola mientras esté visible. */
  function crearCarta(datos, { soloFrente = false, plana = false, mece = false } = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    if (soloFrente) btn.classList.add("is-flip", "is-revealed");
    if (plana) btn.classList.add("card--plana");
    btn.dataset.rareza = datos.rareza;
    btn.dataset.tipo = datos.tipo;
    btn.dataset.variante = datos.variante || "base";
    if (datos.nombre.length > 16) btn.dataset.largo = "2";
    else if (datos.nombre.length > 13) btn.dataset.largo = "1";
    /* Las capas de Aura van fuera de .card__incl: dentro de su espacio 3D, la cara
       cruzaría el plano del aura durante el giro y las llamas la taparían */
    btn.innerHTML = `
      ${datos.variante === "aura" ? `<span class="card__aura" aria-hidden="true">${CAPAS_AURA_ATRAS}</span>` : ""}
      <span class="card__incl">
        <span class="card__inner">
          ${soloFrente ? "" : '<span class="card__face card__face--back"></span>'}
          ${htmlFrente(datos, soloFrente)}
        </span>
      </span>
      ${datos.variante === "aura" ? `<span class="aura__frente" aria-hidden="true">${CAPAS_AURA_FRENTE}</span>` : ""}
    `;
    conectar(btn, { mece });
    return btn;
  }

  /* =========================================================
     MOTOR DE INCLINACIÓN
     ========================================================= */
  const estados = new WeakMap();
  const vivas = new Set();
  let bucle = 0;

  const limitar = (v) => Math.max(-1, Math.min(1, v));

  const visor = "IntersectionObserver" in window
    ? new IntersectionObserver((entradas) => {
        entradas.forEach(({ target, isIntersecting }) => {
          const s = estados.get(target);
          if (!s) return;
          s.visible = isIntersecting;
          if (isIntersecting && s.mece) activar(target);
        });
      }, { rootMargin: "40px" })
    : null;

  function activar(el) {
    if (!vivas.has(el)) {
      vivas.add(el);
      el.classList.add("is-viva");
    }
    if (!bucle) bucle = requestAnimationFrame(latir);
  }

  function dormir(el) {
    vivas.delete(el);
    el.classList.remove("is-viva");
  }

  function latir(t) {
    bucle = 0;
    vivas.forEach((el) => {
      const s = estados.get(el);
      if (!el.isConnected) {
        visor?.unobserve(el);
        dormir(el);
        return;
      }
      const manda = s.dentro || s.orienta;
      const balancea = !manda && (s.foco || (s.mece && s.visible));
      /* Fuera de pantalla no se gasta ni un cuadro más */
      if (!manda && !s.foco && s.mece && !s.visible) {
        dormir(el);
        return;
      }
      let tx = 0;
      let ty = 0;
      let luz = 0;
      if (manda) {
        tx = s.tx;
        ty = s.ty;
        luz = 1;
      } else if (balancea) {
        tx = Math.sin(t / 1500 + s.fase) * 0.62;
        ty = Math.cos(t / 2100 + s.fase) * 0.42;
        luz = 0.8;
      }
      s.x += (tx - s.x) * 0.11;
      s.y += (ty - s.y) * 0.11;
      s.l += (luz - s.l) * 0.1;
      el.style.setProperty("--mx", s.x.toFixed(3));
      el.style.setProperty("--my", s.y.toFixed(3));
      el.style.setProperty("--luz", s.l.toFixed(3));
      const quieta = Math.abs(s.x - tx) + Math.abs(s.y - ty) + Math.abs(s.l - luz) < 0.003;
      if (quieta && !manda && !balancea) dormir(el);
    });
    if (vivas.size) bucle = requestAnimationFrame(latir);
  }

  function conectar(el, { mece = false } = {}) {
    if (SERENO) return el;
    const s = {
      x: 0, y: 0, l: 0, tx: 0, ty: 0, fase: Math.random() * 6,
      dentro: false, foco: false, orienta: false, mece: false, visible: false,
    };
    estados.set(el, s);
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      s.tx = limitar(((e.clientX - r.left) / r.width) * 2 - 1);
      s.ty = limitar(((e.clientY - r.top) / r.height) * 2 - 1);
      s.dentro = true;
      activar(el);
    });
    const salir = () => {
      s.dentro = false;
      if (vivas.has(el) || s.mece) activar(el);
    };
    el.addEventListener("pointerleave", salir);
    el.addEventListener("pointercancel", salir);
    el.addEventListener("focus", () => {
      if (!el.matches(":focus-visible")) return;
      s.foco = true;
      activar(el);
    });
    el.addEventListener("blur", () => {
      s.foco = false;
    });
    if (mece) meciendo(el, true);
    return el;
  }

  /* Enciende o apaga el balanceo automático (p. ej. solo tras revelar la carta) */
  function meciendo(el, activo) {
    const s = estados.get(el);
    if (!s) return;
    s.mece = activo;
    if (!activo) return;
    if (visor) visor.observe(el);
    else {
      s.visible = true;
      activar(el);
    }
  }

  /* Sigue la inclinación del teléfono y devuelve la función que la detiene.
     En iOS pide permiso, así que hay que llamarla desde un gesto del usuario;
     si no hay sensor o se niega, la carta sigue respondiendo al dedo. */
  function seguirInclinacion(el) {
    const s = estados.get(el);
    if (!s || !window.DeviceOrientationEvent || !window.matchMedia("(pointer: coarse)").matches) {
      return () => {};
    }
    let base = null;
    let activo = true;
    const alMover = (e) => {
      if (e.beta === null || e.gamma === null) return;
      base ??= { beta: e.beta, gamma: e.gamma };
      s.tx = limitar((e.gamma - base.gamma) / 22);
      s.ty = limitar((e.beta - base.beta) / 22);
      s.orienta = true;
      activar(el);
    };
    const escuchar = () => {
      if (activo) window.addEventListener("deviceorientation", alMover);
    };
    if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
      window.DeviceOrientationEvent.requestPermission()
        .then((respuesta) => {
          if (respuesta === "granted") escuchar();
        })
        .catch(() => { /* sin permiso: sigue respondiendo al dedo */ });
    } else {
      escuchar();
    }
    return () => {
      activo = false;
      s.orienta = false;
      window.removeEventListener("deviceorientation", alMover);
    };
  }

  window.CartaWewin = { SERENO, RAREZAS, crearCarta, etiquetaCarta, esEspecial, conectar, meciendo, seguirInclinacion };
})();
