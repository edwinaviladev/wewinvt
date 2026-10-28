/*
 * Prototipo "Sobre coleccionable" · WewinVT
 * Flujo: sobre → rasgado → 3 cartas boca abajo → revelado con efectos por rareza.
 * Los sonidos se sintetizan con Web Audio (sin archivos).
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const stage = $("[data-stage]");
  const pack = $("[data-pack]");
  const hand = $("[data-hand]");
  const hint = $("[data-hint]");
  const actions = $("[data-actions]");
  const btnAgain = $("[data-again]");
  const btnRevealAll = $("[data-reveal-all]");
  const btnMute = $("[data-mute]");
  const openedEl = $("[data-opened]");
  const forceSel = $("[data-force]");
  const fx = $("[data-fx]");
  const rays = $("[data-rays]");
  const flash = $("[data-flash]");
  const solo = $("[data-solo]");
  const btnDemo = $("[data-demo]");
  const banner = $("[data-banner]");
  const debugLog = $("[data-debug-log]");

  /* ?debug=1 muestra en pantalla la conexión y los canjes que llegan */
  const DEBUG = new URLSearchParams(location.search).get("debug") === "1";

  /* Modo: "interactivo" (sobre.html) u "overlay" (overlay.html, canje automático) */
  const MODO = document.body.dataset.modo === "overlay" ? "overlay" : "interactivo";
  let secuencia = false;
  let splashT1 = 0, splashT2 = 0, finalT1 = 0, finalT2 = 0, recuentoT1 = 0, recuentoT2 = 0;
  /* Cola de canjes: si varios viewers canjean seguido, los sobres salen en fila */
  const colaCanjes = [];
  const MAX_COLA = 10;
  /* Tiempo que cada carta se muestra antes de salir de pantalla */
  const HOLD_MS = { comun: 1400, rara: 1400, epica: 1900, legendaria: 2500 };

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORES = ["#d7263d", "#ff5a6a", "#f2b263", "#a8e6d4", "#ff9eb1", "#f6ebdd"];
  const MINTS = ["#a8e6d4", "#c9f0e4", "#f6ebdd"];
  const ROJOS = ["#ff5a6a", "#ff9eb1", "#f6ebdd"];
  const DORADOS = ["#f2b263", "#ffdf9e", "#f6ebdd"];

  /* =========================================================
     RAREZAS
     ========================================================= */
  const ORDEN = ["comun", "rara", "epica", "legendaria"];
  const RAREZAS = {
    comun: { nombre: "Común", peso: 55 },
    rara: { nombre: "Rara", peso: 25 },
    epica: { nombre: "Épica", peso: 15 },
    legendaria: { nombre: "Legendaria", peso: 5 },
  };
  const COLOR_RAREZA = {
    comun: "#bfa78f",
    rara: "#a8e6d4",
    epica: "#ff5a6a",
    legendaria: "#f2b263",
  };
  /* El tercer sobre garantiza Rara o mejor (estilo TCGP) */
  const PESOS_SLOT3 = { comun: 0, rara: 70, epica: 22, legendaria: 8 };

  const CATALOGO = window.SOBRE_CATALOGO || [];

  /* =========================================================
     AUDIO · Web Audio sintetizado
     ========================================================= */
  const AudioFX = (() => {
    let ctx = null;
    let noiseBuf = null;
    let muted = localStorage.getItem("wewinvt_sobre_mute") === "1";

    const ac = () => {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    };

    const now = () => ac().currentTime;

    function osc({ f = 440, f2 = 0, type = "sine", t = 0, d = 0.2, v = 0.2 }) {
      const c = ac();
      const t0 = now() + t;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(f, 1), t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t0 + d);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + d + 0.06);
    }

    function noise({ t = 0, d = 0.3, v = 0.2, f = 1200, f2 = 0, q = 1, type = "bandpass" }) {
      const c = ac();
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      }
      const t0 = now() + t;
      const s = c.createBufferSource();
      s.buffer = noiseBuf;
      const flt = c.createBiquadFilter();
      flt.type = type;
      flt.frequency.setValueAtTime(Math.max(f, 1), t0);
      flt.Q.value = q;
      if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t0 + d);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      s.connect(flt).connect(g).connect(c.destination);
      s.start(t0);
      s.stop(t0 + d + 0.06);
    }

    const nota = (m) => 440 * 2 ** ((m - 69) / 12);

    return {
      unlock() { try { ac(); } catch { /* sin audio disponible */ } },
      get muted() { return muted; },
      setMuted(v) {
        muted = v;
        localStorage.setItem("wewinvt_sobre_mute", v ? "1" : "0");
      },
      tick() { if (!muted) osc({ f: 900, type: "square", d: 0.04, v: 0.05 }); },
      grab() {
        if (muted) return;
        osc({ f: 160, f2: 50, type: "sine", d: 0.22, v: 0.35 });
        noise({ d: 0.1, v: 0.18, f: 380, type: "lowpass" });
      },
      rip() {
        if (muted) return;
        noise({ d: 0.38, v: 0.5, f: 900, f2: 3600, q: 0.8 });
        noise({ t: 0.05, d: 0.3, v: 0.32, f: 500, f2: 2600, q: 1.2 });
        osc({ t: 0.3, f: 1200, type: "square", d: 0.05, v: 0.08 });
      },
      /* Estallido: doble sub-bass + crujido de foil + chispa metálica */
      boom() {
        if (muted) return;
        osc({ f: 130, f2: 38, type: "sine", d: 0.55, v: 0.5 });
        osc({ t: 0.05, f: 90, f2: 30, type: "sine", d: 0.6, v: 0.3 });
        noise({ d: 0.5, v: 0.6, f: 300, f2: 2400, q: 0.6 });
        noise({ d: 0.28, v: 0.4, f: 5200, f2: 900, q: 0.8, type: "lowpass" });
        noise({ t: 0.02, d: 0.16, v: 0.22, f: 4200, type: "highpass" });
      },
      pop(i = 0) {
        if (muted) return;
        const f = 300 * 1.09 ** i;
        osc({ f, f2: f * 2, type: "square", d: 0.09, v: 0.11 });
        noise({ d: 0.04, v: 0.07, f: 3200, type: "highpass" });
      },
      whoosh() {
        if (muted) return;
        noise({ d: 0.2, v: 0.13, f: 400, f2: 2200 });
      },
      /* Fanfarria según rareza (sube de intensidad) */
      sting(tier) {
        if (muted) return;
        if (tier === "comun") {
          osc({ f: nota(69), type: "triangle", d: 0.3, v: 0.18 });
        } else if (tier === "rara") {
          osc({ f: nota(76), type: "triangle", d: 0.22, v: 0.16 });
          osc({ t: 0.09, f: nota(81), type: "triangle", d: 0.3, v: 0.16 });
        } else if (tier === "epica") {
          [73, 76, 81].forEach((m, i) => osc({ t: i * 0.08, f: nota(m), type: "triangle", d: 0.3, v: 0.16 }));
          noise({ d: 0.5, v: 0.05, f: 6200, type: "highpass" });
        } else if (tier === "legendaria") {
          osc({ f: 110, f2: 55, type: "sine", d: 0.4, v: 0.3 });
          [69, 73, 76, 81].forEach((m, i) => osc({ t: i * 0.09, f: nota(m), type: "triangle", d: 0.34, v: 0.16 }));
          osc({ t: 0.4, f: nota(88), type: "triangle", d: 0.5, v: 0.1 });
          [81, 85, 88].forEach((m) => osc({ t: 0.38, f: nota(m), type: "triangle", d: 0.75, v: 0.09 }));
          noise({ t: 0.05, d: 0.7, v: 0.07, f: 6800, f2: 9200, type: "highpass" });
        }
      },
      fanfare() {
        if (muted) return;
        [69, 73, 76].forEach((m) => osc({ f: nota(m), type: "triangle", d: 0.4, v: 0.11 }));
        osc({ t: 0.14, f: nota(81), type: "triangle", d: 0.5, v: 0.12 });
      },
    };
  })();

  /* =========================================================
     UTILIDADES
     ========================================================= */
  const azar = (n) => Math.floor(Math.random() * n);
  const elegir = (lista) => lista[azar(lista.length)];

  function rollPeso(pesos) {
    const total = Object.values(pesos).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [clave, peso] of Object.entries(pesos)) {
      r -= peso;
      if (r <= 0) return clave;
    }
    return Object.keys(pesos).at(-1);
  }

  function rollRarity(minTier = 0) {
    const pesos = {};
    ORDEN.forEach((k, i) => { if (i >= minTier) pesos[k] = RAREZAS[k].peso; });
    return rollPeso(pesos);
  }

  /* =========================================================
     ESTADO
     ========================================================= */
  let estado = "idle"; // idle | abriendo | cartas | listo
  let cartasActuales = [];
  let reveladas = 0;

  function contarAbiertos() {
    return Number(localStorage.getItem("wewinvt_sobres") || 0);
  }

  function pintarContador() {
    openedEl.textContent = String(contarAbiertos());
  }

  /* =========================================================
     CONSTRUCCIÓN DEL SOBRE (3 cartas sin repetir)
     ========================================================= */
  function construirSobre() {
    const forzado = forceSel.value; // "" | rara | epica | legendaria
    const usadas = new Set();
    cartasActuales = [];

    for (let i = 0; i < 3; i++) {
      let tier;
      if (i === 2) {
        if (forzado) tier = forzado;
        else if (Math.random() < 0.08) tier = rollPeso({ rara: 1, epica: 2, legendaria: 1 });
        else tier = rollPeso(PESOS_SLOT3);
      } else {
        tier = rollRarity();
      }

      const sinRepetir = (lista) => lista.filter((c) => !usadas.has(c.id));
      let pool = sinRepetir(CATALOGO.filter((c) => c.rareza === tier));
      if (!pool.length) pool = sinRepetir(CATALOGO.filter((c) => ORDEN.indexOf(c.rareza) >= ORDEN.indexOf(tier)));
      if (!pool.length) pool = sinRepetir(CATALOGO);

      const carta = elegir(pool);
      usadas.add(carta.id);
      cartasActuales.push(carta);
    }
  }

  /* =========================================================
     RENDER DE CARTAS
     ========================================================= */
  function numeroCard(indexGlobal) {
    return "#" + String(indexGlobal + 1).padStart(2, "0");
  }

  function crearCarta(datos, i) {
    const numGlobal = CATALOGO.indexOf(datos);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.style.setProperty("--d", `${i * 0.14}s`);
    btn.dataset.rareza = datos.rareza;
    btn.dataset.tipo = datos.tipo;
    btn.dataset.i = String(i);
    btn.setAttribute("aria-label", `Carta ${i + 1} de 3, sin revelar`);

    btn.innerHTML = `
      <span class="card__bob">
        <span class="card__inner">
          <span class="card__face card__face--back">
            <span class="card__emblem">W</span>
          </span>
          <span class="card__face card__face--front">
            <span class="card__head">
              <span class="card__name">${datos.nombre}</span>
              <span class="card__num">${numeroCard(numGlobal < 0 ? i : numGlobal)}</span>
            </span>
            <span class="card__art">
              <img src="${datos.src}" alt="${datos.alt}" draggable="false" />
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

    if (MODO === "interactivo") btn.addEventListener("click", () => revelar(btn, datos));
    return btn;
  }

  function pintarCartas() {
    hand.innerHTML = "";
    cartasActuales.forEach((datos, i) => hand.append(crearCarta(datos, i)));
  }

  /* =========================================================
     EFECTOS
     ========================================================= */
  function burst(x, y, n = 22, fuerza = 1, colores = COLORES) {
    if (REDUCED) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.className = "p";
      const ang = Math.random() * Math.PI * 2;
      const dist = (60 + Math.random() * 190) * fuerza;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(ang) * dist - 40}px`);
      p.style.setProperty("--c", elegir(colores));
      p.addEventListener("animationend", () => p.remove());
      fx.append(p);
    }
  }

  function confeti(n = 36) {
    if (REDUCED) return;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "cf";
      c.style.setProperty("--x", `${azar(100)}vw`);
      c.style.setProperty("--c", elegir(COLORES));
      c.style.setProperty("--t", `${1.5 + Math.random() * 1.4}s`);
      c.style.setProperty("--d", `${Math.random() * 0.5}s`);
      c.addEventListener("animationend", () => c.remove());
      fx.append(c);
    }
  }

  function temblor() {
    if (REDUCED) return;
    stage.classList.remove("is-shake");
    void stage.offsetWidth;
    stage.classList.add("is-shake");
  }

  function destello() {
    if (REDUCED) return;
    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.classList.add("is-on");
  }

  function activarRays(ms = 2000) {
    rays.classList.add("is-on");
    setTimeout(() => rays.classList.remove("is-on"), ms);
  }

  /* El sobre estalla: onda expansiva + humo + chispas + pedazos de foil */
  function estallido(x, y) {
    if (REDUCED) return;

    /* Onda expansiva doble */
    for (let i = 0; i < 2; i++) {
      const onda = document.createElement("i");
      onda.className = "shock";
      onda.style.left = `${x}px`;
      onda.style.top = `${y}px`;
      if (i > 0) onda.style.animationDelay = "80ms";
      onda.addEventListener("animationend", () => onda.remove());
      fx.append(onda);
    }

    /* Humo que se despeja */
    for (let i = 0; i < 5; i++) {
      const humo = document.createElement("i");
      humo.className = "humo";
      const tam = 90 + azar(80);
      humo.style.width = `${tam}px`;
      humo.style.height = `${tam}px`;
      humo.style.left = `${x + (Math.random() - 0.5) * 160}px`;
      humo.style.top = `${y + (Math.random() - 0.5) * 200}px`;
      humo.style.setProperty("--t", `${(0.8 + Math.random() * 0.5).toFixed(2)}s`);
      humo.addEventListener("animationend", () => humo.remove());
      fx.append(humo);
    }

    /* Chispas que cruzan la pantalla */
    for (let i = 0; i < 10; i++) {
      const chispa = document.createElement("i");
      chispa.className = "spark";
      chispa.style.left = `${x}px`;
      chispa.style.top = `${y}px`;
      chispa.style.setProperty("--largo", `${40 + azar(60)}px`);
      chispa.style.setProperty("--ang", `${azar(360)}deg`);
      chispa.style.setProperty("--dist", `${-(240 + azar(300))}px`);
      chispa.style.setProperty("--c", elegir(["#ffdf9e", "#f2b263", "#f6ebdd", "#ff9eb1"]));
      chispa.addEventListener("animationend", () => chispa.remove());
      fx.append(chispa);
    }

    /* Pedazos del sobre */
    const FOIL = ["#3f2c22", "#241813", "#4a3520", "#5a4128", "#f2b263", "#d7263d", "#ff5a6a"];
    for (let i = 0; i < 22; i++) {
      const pedazo = document.createElement("i");
      pedazo.className = "frag";
      const lado = 16 + azar(34);
      pedazo.style.width = `${lado}px`;
      pedazo.style.height = `${Math.round(lado * (0.6 + Math.random() * 0.8))}px`;
      pedazo.style.left = `${x + (Math.random() - 0.5) * 170}px`;
      pedazo.style.top = `${y + (Math.random() - 0.5) * 220}px`;
      pedazo.style.setProperty("--c", elegir(FOIL));
      pedazo.style.setProperty("--dx", `${(Math.random() - 0.5) * 560}px`);
      pedazo.style.setProperty("--dy", `${-(60 + Math.random() * 380)}px`);
      pedazo.style.setProperty("--fr", `${(Math.random() - 0.5) * 840}deg`);
      pedazo.style.setProperty("--d", `${azar(90)}ms`);
      pedazo.addEventListener("animationend", () => pedazo.remove());
      fx.append(pedazo);
    }
  }

  function centroDe(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Efectos por rareza (compartidos entre modos) */
  function efectosRareza(rareza, el) {
    const c = centroDe(el);
    if (rareza === "comun") {
      burst(c.x, c.y, 8, 0.6);
    } else if (rareza === "rara") {
      burst(c.x, c.y, 16, 0.8, MINTS);
    } else if (rareza === "epica") {
      burst(c.x, c.y, 30, 1, ROJOS);
      mostrarTinte("#ff5a6a");
      mostrarSplash("¡Épica!", "#ff5a6a");
    } else {
      burst(c.x, c.y, 44, 1.4, DORADOS);
      confeti(46);
      activarRays(2600);
      temblor();
      mostrarTinte("#f2b263");
      mostrarSplash("¡Legendaria!", "#f2b263", true);
    }
  }

  /* Texto grande de la rareza (estilo Balatro) */
  function mostrarSplash(nombre, color, grande = false) {
    const splash = $("[data-splash]");
    if (!splash) return;
    const span = splash.querySelector("span");
    span.textContent = nombre;
    span.style.setProperty("--r-splash", color);
    span.style.fontSize = grande ? "clamp(52px, 13vw, 132px)" : "";
    splash.hidden = false;
    splash.classList.remove("is-out");
    void splash.offsetWidth;
    clearTimeout(splashT1);
    clearTimeout(splashT2);
    splashT1 = setTimeout(() => splash.classList.add("is-out"), grande ? 2100 : 1600);
    splashT2 = setTimeout(() => {
      splash.hidden = true;
    }, (grande ? 2100 : 1600) + 450);
  }

  /* Destello a pantalla completa del color de la rareza */
  function mostrarTinte(color) {
    const tinte = $("[data-tint]");
    if (!tinte || REDUCED) return;
    tinte.style.setProperty("--c-tint", color);
    tinte.classList.remove("is-on");
    void tinte.offsetWidth;
    tinte.classList.add("is-on");
  }

  /* La rareza más grande del sobre */
  function mejorRareza(cartas) {
    if (!cartas?.length) return "comun";
    return cartas.reduce(
      (mejor, c) => (ORDEN.indexOf(c.rareza) > ORDEN.indexOf(mejor.rareza) ? c : mejor),
      cartas[0]
    ).rareza;
  }

  function mostrarFinal(rareza) {
    const finalEl = $("[data-final]");
    if (!finalEl) return;
    const nombre = $("[data-final-rareza]", finalEl);
    nombre.textContent = RAREZAS[rareza]?.nombre || "Común";
    nombre.style.setProperty("--c-final", COLOR_RAREZA[rareza] || "#f2b263");
    finalEl.hidden = false;
    finalEl.classList.remove("is-out");
    void finalEl.offsetWidth;
    clearTimeout(finalT1);
    clearTimeout(finalT2);
    finalT1 = setTimeout(() => finalEl.classList.add("is-out"), 2500);
    finalT2 = setTimeout(() => {
      finalEl.hidden = true;
    }, 3000);
  }

  /* =========================================================
     FLUJO PRINCIPAL
     ========================================================= */
  const FRASES = [
    "¡Colecciónalas todas! ¿Se podrá con las 39?",
    "El álbum te espera… en una próxima actualización. ✨",
    "Cartas hechas por la comunidad, para la comunidad. 💛",
    "¿Otra ronda? El sobre nunca dice no.",
  ];

  function abrirSobre() {
    if (estado !== "idle") return;
    estado = "abriendo";
    actions.hidden = true;
    hint.textContent = "Abriendo el sobre…";

    AudioFX.grab();
    pack.classList.add("is-winding");

    /* 600ms: el sobre estalla */
    setTimeout(() => {
      pack.classList.add("is-open");
      AudioFX.rip();
      AudioFX.boom();
      activarRays(2600);
      const c = centroDe(pack);
      estallido(c.x, c.y);
      burst(c.x, c.y, 48, 1.5);
      temblor();
      destello();
    }, 600);

    /* 950ms: salen las cartas */
    setTimeout(() => {
      construirSobre();
      pintarCartas();
      estado = "cartas";
      reveladas = 0;
      pack.hidden = true;

      cartasActuales.forEach((_, i) => setTimeout(() => AudioFX.pop(i), i * 120));

      hint.textContent = "Toca una carta para revelarla";
      btnRevealAll.hidden = false;
      actions.hidden = false;
    }, 1050);
  }

  function revelar(btn, datos) {
    if (estado !== "cartas" || btn.classList.contains("is-flip")) return;
    btn.classList.add("is-flip");
    btn.setAttribute("aria-label", `${datos.nombre}, ${RAREZAS[datos.rareza].nombre} (${datos.tipo})`);
    AudioFX.whoosh();

    setTimeout(() => {
      btn.classList.add("is-revealed");
      AudioFX.sting(datos.rareza);
      conectarTilt(btn);
      efectosRareza(datos.rareza, btn);

      reveladas++;
      if (reveladas === cartasActuales.length) terminar();
    }, 260);
  }

  function terminar() {
    estado = "listo";
    btnRevealAll.hidden = true;
    hint.textContent = elegir(FRASES);
    setTimeout(() => AudioFX.fanfare(), 380);

    const abiertos = contarAbiertos() + 1;
    localStorage.setItem("wewinvt_sobres", String(abiertos));
    pintarContador();
  }

  function revelarTodas() {
    [...hand.children].forEach((btn, i) => {
      if (btn.classList.contains("is-flip")) return;
      setTimeout(() => btn.click(), i * 300);
    });
  }

  function otroSobre() {
    if (estado !== "listo") return;
    AudioFX.tick();
    hand.innerHTML = "";
    pack.hidden = false;
    pack.classList.remove("is-winding", "is-open");
    hint.textContent = "Toca el sobre para abrirlo";
    actions.hidden = true;
    estado = "idle";
  }

  /* =========================================================
     MODO OVERLAY · canje de puntos (secuencia automática)
     Aparece el sobre → se rasga solo → las cartas salen una por
     una, se destapan, se muestran un momento y salen de pantalla.
     ========================================================= */
  function secuenciaCanje(forzar = "", usuario = "") {
    if (MODO !== "overlay" || secuencia || estado !== "idle") return;
    secuencia = true;
    if (forzar) forceSel.value = forzar;
    btnDemo.hidden = true;
    mostrarBanner(usuario);

    /* 1. El sobre entra con muelle */
    pack.classList.remove("is-entering", "is-winding", "is-open");
    pack.hidden = false;
    pack.classList.add("is-entering");

    /* 2. Carga y rasgado */
    setTimeout(() => pack.classList.remove("is-entering"), 480);
    setTimeout(() => {
      pack.classList.add("is-winding");
      AudioFX.grab();
    }, 600);
    setTimeout(() => {
      pack.classList.add("is-open");
      AudioFX.rip();
      AudioFX.boom();
      activarRays(3000);
      const c = centroDe(pack);
      estallido(c.x, c.y);
      burst(c.x, c.y, 60, 1.8);
      temblor();
      destello();
    }, 1200);

    /* 3. Se despeja el humo del estallido y salen las cartas una por una */
    setTimeout(() => {
      pack.hidden = true;
      pack.classList.remove("is-entering", "is-winding", "is-open");
      construirSobre();
      soltarCartas();
    }, 1800);
  }

  function soltarCartas() {
    let i = 0;
    const siguiente = () => {
      if (i >= cartasActuales.length) {
        cerrarCanje();
        return;
      }
      mostrarCartaSola(cartasActuales[i], i, () => {
        i += 1;
        siguiente();
      });
    };
    siguiente();
  }

  function mostrarCartaSola(datos, i, alTerminar) {
    estado = "cartas";
    const btn = crearCarta(datos, i);
    solo.hidden = false;
    solo.innerHTML = "";
    solo.append(btn);
    AudioFX.pop(i);

    /* Se destapa sola */
    setTimeout(() => {
      btn.classList.add("is-flip");
      btn.setAttribute("aria-label", `${datos.nombre}, ${RAREZAS[datos.rareza].nombre} (${datos.tipo})`);
      AudioFX.whoosh();
    }, 550);

    setTimeout(() => {
      btn.classList.add("is-revealed");
      conectarTilt(btn);
      AudioFX.sting(datos.rareza);
      efectosRareza(datos.rareza, btn);
    }, 950);

    /* Se muestra un momento y sale de pantalla */
    const salida = 950 + HOLD_MS[datos.rareza];
    setTimeout(() => {
      btn.classList.add("is-out");
      AudioFX.whoosh();
    }, salida);

    setTimeout(() => {
      btn.remove();
      alTerminar();
    }, salida + 450);
  }

  function cerrarCanje() {
    solo.innerHTML = "";
    solo.hidden = true;
    rays.classList.remove("is-on");

    /* El banner se retira al terminar el evento */
    banner.classList.add("is-out");
    setTimeout(() => {
      banner.hidden = true;
    }, 500);

    /* Vuelven las 3 cartas del sobre junto al "Mejor del sobre" */
    mostrarRecuento(cartasActuales);

    setTimeout(() => {
      estado = "idle";
      secuencia = false;
      btnDemo.hidden = false;

      const abiertos = contarAbiertos() + 1;
      localStorage.setItem("wewinvt_sobres", String(abiertos));
      pintarContador();

      /* Si hay más canjes en la fila, sale el siguiente */
      procesarCola();
    }, 3700);
  }

  function mostrarRecuento(cartas) {
    const finalEl = $("[data-final]");
    const contenedor = $("[data-final-hand]");
    if (!finalEl || !contenedor) return;

    contenedor.innerHTML = "";
    contenedor.hidden = false;
    contenedor.classList.remove("is-out");

    cartas.forEach((datos, i) => {
      const btn = crearCarta(datos, i);
      btn.classList.add("is-flip", "is-revealed");
      contenedor.append(btn);
    });

    setTimeout(() => mostrarFinal(mejorRareza(cartas)), 550);

    clearTimeout(recuentoT1);
    clearTimeout(recuentoT2);
    recuentoT1 = setTimeout(() => contenedor.classList.add("is-out"), 3150);
    recuentoT2 = setTimeout(() => {
      contenedor.innerHTML = "";
      contenedor.hidden = true;
    }, 3650);
  }

  /* =========================================================
     COLA DE CANJES
     ========================================================= */
  function encolarCanje(opciones = {}) {
    if (colaCanjes.length >= MAX_COLA) return false;
    colaCanjes.push(opciones);
    procesarCola();
    return true;
  }

  function procesarCola() {
    if (secuencia || estado !== "idle") return;
    const siguiente = colaCanjes.shift();
    if (!siguiente) return;
    secuenciaCanje(siguiente.rareza || "", siguiente.usuario || "");
  }

  /* =========================================================
     BANNER: quién canjeó el sobre
     ========================================================= */
  function mostrarBanner(usuario) {
    if (!banner) return;
    banner.textContent = usuario ? `@${usuario} abrió un sobre` : "¡Alguien canjeó un sobre!";
    banner.hidden = false;
    banner.classList.remove("is-out");
    void banner.offsetWidth;
  }

  /* =========================================================
     INTEGRACIÓN TWITCH (canjes reales de Channel Points)
     ========================================================= */
  function coincideRecompensa(titulo, filtro) {
    if (!filtro) return true;
    const a = (titulo || "").toLowerCase();
    const b = filtro.toLowerCase();
    return a === b || a.includes(b);
  }

  /* =========================================================
     DEBUG EN PANTALLA (?debug=1)
     ========================================================= */
  function debugLinea(texto, clase = "") {
    if (!DEBUG || !debugLog) return;
    debugLog.hidden = false;
    const linea = document.createElement("div");
    if (clase) linea.className = clase;
    const hora = new Date().toLocaleTimeString("es-MX", { hour12: false });
    linea.textContent = `[${hora}] ${texto}`;
    debugLog.prepend(linea);
    while (debugLog.children.length > 9) debugLog.lastChild.remove();
  }

  function actualizarEstadoTwitch(nuevoEstado, detalle = "") {
    const chip = $("[data-twitch-estado]");
    if (chip) {
      chip.hidden = false;
      chip.dataset.estado = nuevoEstado;
      chip.textContent = `Twitch: ${nuevoEstado}${detalle ? ` · ${detalle}` : ""}`;
    }
    debugLinea(
      `twitch: ${nuevoEstado}${detalle ? ` · ${detalle}` : ""}`,
      nuevoEstado === "error" ? "err" : nuevoEstado === "conectado" ? "ok" : ""
    );
  }

  async function iniciarTwitch() {
    if (!window.TwitchAuth || !window.TwitchEvents) return;
    const config = window.TwitchAuth.leerConfig();
    if (!config?.clientId) {
      debugLinea("sin configuración: conecta Twitch en overlay-config.html", "err");
      return;
    }
    debugLinea(`config: canal "${config.canal || "(mi canal)"}" · recompensa "${config.recompensa || "(cualquiera)"}"`);

    try {
      const token = await window.TwitchAuth.tokenValido();
      if (!token) {
        debugLinea("sin token: conecta Twitch en overlay-config.html", "err");
        return;
      }
      const canal = await window.TwitchAuth.obtenerUsuario(token, config.clientId, config.canal);
      if (!canal) throw new Error("no se encontró el canal configurado");
      debugLinea(`canal: ${canal.display_name} (@${canal.login})`, "ok");

      window.TwitchEvents.conectar({
        clientId: config.clientId,
        broadcasterId: canal.id,
        alRedimir: (evento) => {
          const titulo = evento.reward?.title || "";
          debugLinea(`canje recibido: @${evento.user_login || "?"} — "${titulo}"`, "ok");
          if (!coincideRecompensa(titulo, config.recompensa)) {
            debugLinea(`ignorado: no contiene "${config.recompensa}"`);
            return;
          }
          encolarCanje({ usuario: evento.user_login || "", rareza: "" });
        },
        alEstado: actualizarEstadoTwitch,
      });
    } catch (error) {
      console.warn("[Twitch] no se pudo conectar:", error);
      actualizarEstadoTwitch("error", error.message);
    }
  }

  /* =========================================================
     TILT 3D + HOLO que sigue el puntero
     ========================================================= */
  function conectarTilt(card) {
    const mover = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`);
      card.style.setProperty("--mx", px.toFixed(3));
      card.style.setProperty("--my", py.toFixed(3));
    };
    const salir = () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--mx", "0");
      card.style.setProperty("--my", "0");
    };
    card.addEventListener("pointermove", mover);
    card.addEventListener("pointerleave", salir);
  }

  /* =========================================================
     EVENTOS E INICIO
     ========================================================= */
  if (MODO === "interactivo") {
    pack.addEventListener("click", abrirSobre);
    btnAgain.addEventListener("click", otroSobre);
    btnRevealAll.addEventListener("click", revelarTodas);
  } else {
    /* Modo overlay: nada se toca, la secuencia corre sola al canjear */
    pack.hidden = true;
    pack.tabIndex = -1;
    btnDemo.addEventListener("click", () => encolarCanje({ usuario: "" }));

    /* API para la integración con Twitch y pruebas */
    window.SobreOverlay = {
      canje: (opciones = {}) => encolarCanje(opciones),
      canjear: (opciones = {}) => encolarCanje(opciones), // alias
    };
    window.addEventListener("message", (evento) => {
      if (evento.data && evento.data.type === "wewinvt:canje") {
        encolarCanje({ rareza: evento.data.rareza || "", usuario: evento.data.usuario || "" });
      }
    });

    /* Fondo transparente para browser source de OBS */
    if (new URLSearchParams(location.search).get("transparente") === "1") {
      document.body.classList.add("is-transparente");
    }

    /* ?probar=1 lanza un canje de prueba al cargar */
    if (new URLSearchParams(location.search).get("probar") === "1") {
      setTimeout(() => encolarCanje({ usuario: "test" }), 1500);
    }

    debugLinea("overlay cargado");

    /* Conexión real a Twitch (si está configurada) */
    iniciarTwitch();
  }

  btnMute.addEventListener("click", () => {
    AudioFX.setMuted(!AudioFX.muted);
    btnMute.textContent = AudioFX.muted ? "🔇" : "🔊";
    btnMute.setAttribute("aria-pressed", String(AudioFX.muted));
    btnMute.setAttribute("aria-label", AudioFX.muted ? "Activar sonidos" : "Silenciar sonidos");
  });

  document.addEventListener("pointerdown", () => AudioFX.unlock(), { once: true });

  if (AudioFX.muted) {
    btnMute.textContent = "🔇";
    btnMute.setAttribute("aria-pressed", "true");
  }
  pintarContador();
})();
