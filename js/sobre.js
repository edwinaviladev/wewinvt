/*
 * Sobre coleccionable · WewinVT
 * Flujo: sobre → corte → 3 cartas boca abajo → revelado con efectos por rareza.
 * Los sonidos se sintetizan con Web Audio (sin archivos) y las chispas se pintan en un canvas.
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
  const velo = $("[data-velo]");
  const solo = $("[data-solo]");
  const btnDemo = $("[data-demo]");
  const banner = $("[data-banner]");
  const debugLog = $("[data-debug-log]");

  const Carta = window.CartaWewin;

  /* ?debug=1 muestra en pantalla la conexión y los canjes que llegan */
  const DEBUG = new URLSearchParams(location.search).get("debug") === "1";

  /* Modo: "interactivo" (sobre.html) u "overlay" (overlay.html, canje automático) */
  const MODO = document.body.dataset.modo === "overlay" ? "overlay" : "interactivo";
  let secuencia = false;
  let splashT = 0, finalT1 = 0, finalT2 = 0, recuentoT1 = 0, recuentoT2 = 0, packT = 0;
  /* Cola de canjes: si varios viewers canjean seguido, los sobres salen en fila */
  const colaCanjes = [];
  const MAX_COLA = 10;
  /* Canjes ya recibidos en esta sesión de página (acotado) */
  const canjesVistos = new Set();
  const MAX_VISTOS = 200;
  /* Tiempo que cada carta se muestra antes de salir de pantalla */
  const HOLD_MS = { comun: 1400, rara: 1400, epica: 1900, legendaria: 2500 };

  const REDUCED = Carta.SERENO;

  /* =========================================================
     RAREZAS
     ========================================================= */
  const ORDEN = ["comun", "rara", "epica", "legendaria"];
  const RAREZAS = Carta.RAREZAS;
  /* Los pesos del sorteo viven en js/sorteo.js (compartido con el Worker) */

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
      /* Zumbido que sube mientras una carta épica o legendaria se carga */
      carga(duracion = 0.6) {
        if (muted) return;
        osc({ f: 180, f2: 720, type: "sawtooth", d: duracion, v: 0.05 });
        noise({ d: duracion, v: 0.08, f: 500, f2: 4200, q: 1.4 });
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
  const espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
  /* Pausa que solo existe para acompañar una animación: desaparece con movimiento reducido */
  const pausa = (ms) => espera(REDUCED ? 0 : ms);

  /* =========================================================
     ESTADO
     ========================================================= */
  let estado = "idle"; // idle | abriendo | cartas | listo
  let cartasActuales = [];
  let reveladas = 0;
  let idsNuevosCanje = new Set();
  /* Contexto del canje en curso (modo overlay) y del canal conectado */
  let usuarioActual = "";
  let usuarioIdActual = "";

  function contarAbiertos() {
    return Number(localStorage.getItem("wewinvt_sobres") || 0);
  }

  /* La colección vive en localStorage: { idDeCarta: vecesObtenida } */
  function coleccionGuardar(id) {
    try {
      const coleccion = JSON.parse(localStorage.getItem("wewinvt_coleccion") || "{}");
      const cantidadAnterior = Number(coleccion[id]) || 0;
      coleccion[id] = cantidadAnterior + 1;
      localStorage.setItem("wewinvt_coleccion", JSON.stringify(coleccion));
      return cantidadAnterior === 0;
    } catch {
      /* sin almacenamiento disponible */
      return false;
    }
  }

  /* Registra en la nube un canje del stream. El servidor sortea las cartas
     y las suma al coleccionista; aquí solo se envía qué canje y de quién.
     Devuelve { cartas, nuevas } o null si no se pudo registrar.
     Es idempotente por canjeId, así que reintentar una vez es seguro. */
  async function registrarCanjeNube(canjeId, usuarioId) {
    const token = await window.TwitchAuth?.tokenValido?.().catch(() => null);
    if (!token || !canjeId || !usuarioId) return null;
    for (let intento = 0; intento < 2; intento++) {
      try {
        const res = await fetch("/api/canje", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ canjeId, usuarioId }),
        });
        if (res.ok) {
          const resultado = await res.json();
          if (!Array.isArray(resultado.cartas)) return null;
          return {
            cartas: resultado.cartas,
            nuevas: Array.isArray(resultado.nuevas) ? resultado.nuevas : [],
          };
        }
        if (res.status < 500) return null; // 4xx: reintentar no cambia nada
      } catch {
        /* red caída: se reintenta una vez */
      }
    }
    return null;
  }

  function pintarContador() {
    openedEl.textContent = String(contarAbiertos());
  }

  /* =========================================================
     CONSTRUCCIÓN DEL SOBRE (3 cartas sin repetir)
     ========================================================= */
  function construirSobre() {
    const forzado = forceSel.value; // "" | rara | epica | legendaria
    cartasActuales = window.SOBRE_SORTEO.construirCartas(CATALOGO, { forzado });
  }


  /* =========================================================
     RENDER DE CARTAS
     ========================================================= */
  function crearCarta(datos, i, opciones = {}) {
    const btn = Carta.crearCarta(datos, opciones);
    btn.dataset.i = String(i);
    btn.setAttribute("aria-label", `Carta ${i + 1} de 3, sin revelar`);
    if (MODO === "interactivo") {
      btn.addEventListener("click", () => revelar(btn, datos));
    }
    return btn;
  }

  /* =========================================================
     EL SOBRE · dos piezas con el mismo arte y el mismo borde rasgado
     ========================================================= */
  const CORTE = 10; /* % de la altura donde pasa el corte */

  function dientes(desde, hasta, y, alto, pasos) {
    const puntos = [];
    for (let i = 0; i <= pasos; i++) {
      puntos.push(`${(desde + ((hasta - desde) * i) / pasos).toFixed(2)}% ${(y + (i % 2 ? alto : 0)).toFixed(2)}%`);
    }
    return puntos;
  }

  function bordeRasgado() {
    const puntos = [];
    let semilla = 7;
    for (let i = 0; i <= 22; i++) {
      semilla = (semilla * 31 + 11) % 97;
      puntos.push(`${((i / 22) * 100).toFixed(2)}% ${(CORTE + ((semilla % 9) - 4) * 0.28).toFixed(2)}%`);
    }
    return puntos;
  }

  function construirPack() {
    const arte = `
      <span class="pack__arte">
        <span class="pack__sol"></span>
        <span class="pack__disco"></span>
        <img class="pack__mascota" src="img/emotes/lentes-oscuros.webp" alt="" draggable="false" />
        <span class="pack__marca">WEWIN<small>Colección comunidad · Serie 1</small></span>
        <span class="pack__pie"><span>3 cartas</span><span>Arte: skyshinez_</span></span>
        <i class="pack__foil"></i>
      </span>
    `;
    pack.innerHTML = `
      <span class="pack__sombra"></span>
      <span class="pack__halo"></span>
      <span class="pack__cuerpo">
        <span class="pack__luz"></span>
        <span class="pack__pieza pack__pieza--bolsa">${arte}</span>
        <span class="pack__pieza pack__pieza--tapa">${arte}</span>
        <span class="pack__corte"></span>
      </span>
    `;
    const rasgado = bordeRasgado();
    $(".pack__pieza--tapa", pack).style.clipPath =
      `polygon(${[...dientes(0, 100, 0, 1.3, 44), ...[...rasgado].reverse()].join(",")})`;
    $(".pack__pieza--bolsa", pack).style.clipPath =
      `polygon(${[...rasgado, ...dientes(100, 0, 100, -1.3, 44)].join(",")})`;
    Carta.conectar(pack, { mece: true });
  }

  function reiniciarPack() {
    clearTimeout(packT);
    pack.classList.remove("is-entering", "is-winding", "is-cortando", "is-open", "is-soltando");
  }

  /* Carga, corte de luz y tapa que sale volando */
  async function rasgarPack() {
    if (REDUCED) await espera(500);
    pack.classList.add("is-winding");
    AudioFX.grab();
    await pausa(340);

    pack.classList.add("is-cortando");
    AudioFX.rip();
    const r = rectoEnEscena(pack);
    const yCorte = r.top + r.height * (CORTE / 100);
    chisporrotearCorte(r, yCorte);
    await pausa(470);

    pack.classList.add("is-open");
    Chispas.emitir(r.x, yCorte, 34, {
      colores: ["#fff4d2", "#ffc96a"], vel: 360, grav: 340, vida: 1, ang: -Math.PI / 2, abre: 1.5,
    });
  }

  /* La bolsa cae y se retira; las cartas ya están detrás de ella */
  function soltarPack() {
    pack.classList.add("is-soltando");
    AudioFX.whoosh();
    packT = setTimeout(() => {
      pack.hidden = true;
      reiniciarPack();
    }, REDUCED ? 0 : 620);
  }

  /* =========================================================
     EFECTOS · chispas en canvas: solo corre mientras haya alguna
     ========================================================= */
  const Chispas = (() => {
    const ctx = fx.getContext("2d");
    let lista = [];
    let corriendo = false;
    let ultimo = 0;
    let escala = 1;

    function medir() {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      fx.width = r.width * dpr;
      fx.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      escala = Math.max(0.6, Math.min(r.width / 900, 1.6));
    }
    medir();
    window.addEventListener("resize", medir);

    function pintar(ahora) {
      const dt = Math.min((ahora - ultimo) / 1000, 0.04);
      ultimo = ahora;
      ctx.clearRect(0, 0, fx.width, fx.height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      lista = lista.filter((p) => {
        p.t += dt;
        if (p.t >= p.vida) return false;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.t / p.vida;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.grosor;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.028, p.y - p.vy * 0.028);
        ctx.stroke();
        return true;
      });
      if (lista.length) {
        requestAnimationFrame(pintar);
      } else {
        corriendo = false;
        ctx.clearRect(0, 0, fx.width, fx.height);
      }
    }

    return {
      emitir(x, y, n, { colores = ["#ffd27a"], vel = 300, grav = 500, vida = 1, ang = null, abre = Math.PI * 2, grosor = 2 } = {}) {
        if (REDUCED) return;
        for (let i = 0; i < n; i++) {
          const a = ang === null ? Math.random() * Math.PI * 2 : ang + (Math.random() - 0.5) * abre;
          const v = vel * escala * (0.3 + Math.random() * 0.9);
          lista.push({
            x, y, t: 0,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            grav: grav * escala,
            vida: vida * (0.5 + Math.random() * 0.7),
            color: colores[i % colores.length],
            grosor: grosor * (0.6 + Math.random()),
          });
        }
        if (!corriendo) {
          corriendo = true;
          ultimo = performance.now();
          requestAnimationFrame(pintar);
        }
      },
    };
  })();

  /* Posición de un elemento relativa al escenario, donde pinta el canvas */
  function rectoEnEscena(el) {
    const a = el.getBoundingClientRect();
    const b = stage.getBoundingClientRect();
    return {
      left: a.left - b.left,
      top: a.top - b.top,
      width: a.width,
      height: a.height,
      x: a.left - b.left + a.width / 2,
      y: a.top - b.top + a.height / 2,
    };
  }

  /* Las chispas siguen a la punta del corte de izquierda a derecha */
  function chisporrotearCorte(r, yCorte) {
    if (REDUCED) return;
    const inicio = performance.now();
    const avanzar = (ahora) => {
      const f = Math.min((ahora - inicio) / 460, 1);
      Chispas.emitir(r.left + r.width * f, yCorte, 4, {
        colores: ["#fff0c0", "#ffc05a", "#ff7a3c"], vel: 230, grav: 620, vida: 0.6, ang: -Math.PI / 2, abre: 2.2, grosor: 1.6,
      });
      if (f < 1) requestAnimationFrame(avanzar);
    };
    requestAnimationFrame(avanzar);
  }

  /* Escena apagada con rayos para la legendaria; admite varias a la vez */
  let escenasOscuras = 0;

  function oscurecerEscena() {
    escenasOscuras += 1;
    velo?.classList.add("is-on");
    rays.classList.add("is-on");
  }

  function aclararEscena() {
    escenasOscuras = Math.max(0, escenasOscuras - 1);
    if (escenasOscuras) return;
    velo?.classList.remove("is-on");
    rays.classList.remove("is-on");
  }

  /* Anticipación antes de girar: la épica vibra, la legendaria apaga la escena */
  async function cargarRareza(rareza, btn) {
    if (rareza === "epica") {
      btn.classList.add("is-cargando", "is-al-frente");
      AudioFX.carga(0.55);
      await pausa(620);
    } else if (rareza === "legendaria") {
      oscurecerEscena();
      btn.classList.add("is-cargando", "is-al-frente", "is-lenta");
      AudioFX.carga(0.9);
      const c = rectoEnEscena(btn);
      Chispas.emitir(c.x, c.y, 30, { colores: [RAREZAS.legendaria.color], vel: 90, grav: -40, vida: 0.9, grosor: 1.4 });
      await pausa(900);
    }
    btn.classList.remove("is-cargando");
  }

  /* Efectos por rareza (compartidos entre modos), justo cuando la carta da la cara */
  function efectosRareza(rareza, el) {
    const c = rectoEnEscena(el);
    const color = RAREZAS[rareza].color;

    if (rareza === "comun") {
      Chispas.emitir(c.x, c.y, 16, { colores: [color, "#fff"], vel: 170, grav: 120, vida: 0.7, grosor: 1.3 });
    } else if (rareza === "rara") {
      Chispas.emitir(c.x, c.y, 46, { colores: [color, "#d9fff4", "#fff"], vel: 340, grav: 240, vida: 0.9 });
    } else if (rareza === "epica") {
      Chispas.emitir(c.x, c.y, 90, { colores: [color, "#ff9b4b", "#fff"], vel: 520, grav: 260, vida: 1.1, grosor: 2.4 });
      mostrarSplash(`¡${RAREZAS[rareza].nombre}!`, color);
    } else {
      Chispas.emitir(c.x, c.y, 190, { colores: [color, "#ff8d3c", "#fff4d2"], vel: 760, grav: 380, vida: 1.5, grosor: 2.8 });
      mostrarSplash(`¡${RAREZAS[rareza].nombre}!`, color);
      /* Lluvia de brasas desde arriba */
      if (!REDUCED) {
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            Chispas.emitir(Math.random() * stage.clientWidth, -8, 10, {
              colores: [color, "#ff8d3c"], vel: 50, grav: 150, vida: 3, ang: Math.PI / 2, abre: 0.5,
            });
          }, i * 260);
        }
      }
    }

    setTimeout(() => {
      el.classList.remove("is-lenta", "is-al-frente");
      if (rareza === "legendaria") aclararEscena();
    }, REDUCED ? 800 : rareza === "legendaria" ? 2100 : 700);
  }

  /* Cinta con el nombre de la rareza (épica / legendaria) */
  function mostrarSplash(nombre, color) {
    const splash = $("[data-splash]");
    if (!splash) return;
    splash.querySelector("span").textContent = nombre;
    splash.style.setProperty("--r-splash", color);
    splash.hidden = false;
    splash.classList.remove("is-on");
    void splash.offsetWidth;
    splash.classList.add("is-on");
    clearTimeout(splashT);
    splashT = setTimeout(() => {
      splash.hidden = true;
      splash.classList.remove("is-on");
    }, 1950);
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
    nombre.style.setProperty("--c-final", RAREZAS[rareza]?.color || RAREZAS.legendaria.color);
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

  /* El dorso tarda en quedar de canto: ahí se cambia a la cara con sus efectos */
  const giroMs = (rareza) => (rareza === "legendaria" ? 330 : 210);

  /* =========================================================
     FLUJO PRINCIPAL
     ========================================================= */
  const FRASES = [
    `¡Colecciónalas todas! Son ${CATALOGO.length} en total.`,
    "Tus cartas ya te esperan en el álbum. ✨",
    "Cartas hechas por la comunidad, para la comunidad. 💛",
    "¿Otra ronda? El sobre nunca dice no.",
  ];

  async function abrirSobre() {
    if (estado !== "idle") return;
    estado = "abriendo";
    actions.hidden = true;
    hint.textContent = "Abriendo el sobre…";

    await rasgarPack();

    /* Las cartas nacen apiladas detrás de la bolsa y suben */
    construirSobre();
    reveladas = 0;
    hand.innerHTML = "";
    hand.classList.add("is-repartiendo");
    const cartas = cartasActuales.map((datos, i) => crearCarta(datos, i));
    cartas.forEach((btn) => {
      btn.classList.add("is-apilada", "is-quieta");
      hand.append(btn);
    });
    const centroEscena = stage.getBoundingClientRect();
    const alto = pack.getBoundingClientRect().height;
    cartas.forEach((btn, i) => {
      const r = btn.getBoundingClientRect();
      const dx = centroEscena.left + centroEscena.width / 2 - (r.left + r.width / 2) + i * 2;
      btn.style.setProperty("--px", `${dx}px`);
      btn.style.setProperty("--py", `${alto * 0.42}px`);
      btn.style.setProperty("--e", "0.86");
      btn.style.opacity = "0";
    });
    void hand.offsetWidth;
    cartas.forEach((btn) => {
      btn.classList.remove("is-quieta");
      btn.style.opacity = "";
      btn.style.setProperty("--py", "-30px");
      btn.style.setProperty("--e", "0.94");
    });
    await pausa(260);

    soltarPack();
    await pausa(420);

    /* Se reparten a su sitio */
    cartas.forEach((btn, i) => {
      setTimeout(() => {
        btn.classList.remove("is-apilada");
        btn.style.removeProperty("--px");
        btn.style.removeProperty("--py");
        btn.style.removeProperty("--e");
        AudioFX.pop(i);
      }, REDUCED ? 0 : i * 110);
    });
    await pausa(560);
    hand.classList.remove("is-repartiendo");

    estado = "cartas";
    hint.textContent = "Toca una carta para revelarla";
    btnRevealAll.hidden = false;
    btnAgain.hidden = true;
    actions.hidden = false;
  }

  async function revelar(btn, datos) {
    if (estado !== "cartas" || btn.classList.contains("is-flip") || btn.dataset.revelando) return;
    btn.dataset.revelando = "1";
    await cargarRareza(datos.rareza, btn);

    btn.classList.add("is-flip");
    btn.setAttribute("aria-label", Carta.etiquetaCarta(datos));
    AudioFX.whoosh();
    await pausa(giroMs(datos.rareza));

    btn.classList.add("is-revealed");
    const nueva = coleccionGuardar(datos.id);
    if (nueva) btn.classList.add("is-new");
    btn.setAttribute("aria-label", Carta.etiquetaCarta(datos, nueva));
    AudioFX.sting(datos.rareza);
    efectosRareza(datos.rareza, btn);
    if (datos.variante === "holo") Carta.meciendo(btn, true);

    reveladas++;
    if (reveladas === cartasActuales.length) terminar();
  }

  function terminar() {
    estado = "listo";
    btnRevealAll.hidden = true;
    btnAgain.hidden = false;
    hint.textContent = elegir(FRASES);
    setTimeout(() => AudioFX.fanfare(), 380);

    const abiertos = contarAbiertos() + 1;
    localStorage.setItem("wewinvt_sobres", String(abiertos));
    pintarContador();
  }

  /* De una en una; en el carrusel móvil lleva cada carta al centro antes de girarla */
  async function revelarTodas() {
    btnRevealAll.hidden = true;
    for (const btn of [...hand.children]) {
      if (estado !== "cartas") return;
      if (btn.classList.contains("is-flip") || btn.dataset.revelando) continue;
      if (hand.scrollWidth > hand.clientWidth) {
        btn.scrollIntoView({ inline: "center", block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
        await pausa(280);
      }
      await revelar(btn, cartasActuales[Number(btn.dataset.i)]);
      await pausa(300);
    }
  }

  function otroSobre() {
    if (estado !== "listo") return;
    AudioFX.tick();
    hand.innerHTML = "";
    reiniciarPack();
    pack.hidden = false;
    hint.textContent = "Toca el sobre para abrirlo";
    actions.hidden = true;
    estado = "idle";
  }

  /* =========================================================
     MODO OVERLAY · canje de puntos (secuencia automática)
     Aparece el sobre → se rasga solo → las cartas salen una por
     una, se destapan, se muestran un momento y salen de pantalla.
     ========================================================= */
  async function secuenciaCanje(forzar = "", usuario = "", usuarioId = "", canjeId = "") {
    if (MODO !== "overlay" || secuencia || estado !== "idle") return;
    idsNuevosCanje = new Set();
    secuencia = true;
    if (forzar) forceSel.value = forzar;
    usuarioActual = usuario;
    usuarioIdActual = usuarioId;
    btnDemo.hidden = true;
    mostrarBanner(usuario);

    /* Solo los canjes reales (con canjeId y usuarioId) tocan la nube. Se registra desde
       el principio para que la respuesta no retrase la apertura */
    const registro = canjeId && usuarioId ? registrarCanjeNube(canjeId, usuarioId) : null;

    /* 1. El sobre entra con muelle */
    reiniciarPack();
    pack.hidden = false;
    pack.classList.add("is-entering");
    await pausa(600);
    pack.classList.remove("is-entering");

    /* 2. Carga, corte y tapa */
    await rasgarPack();

    /* 3. El servidor decide las cartas de un canje real y aquí se muestran esas */
    construirSobre();
    if (registro) {
      const resultado = await registro;
      const otorgadas = resultado?.cartas.map((id) => CATALOGO.find((c) => c.id === id));
      if (otorgadas && otorgadas.every(Boolean)) {
        cartasActuales = otorgadas;
        idsNuevosCanje = new Set(resultado.nuevas);
      } else {
        debugLinea(
          resultado
            ? "el servidor devolvió cartas desconocidas: lo que se ve en pantalla puede no coincidir con lo guardado"
            : "no se pudo guardar el canje en la nube: el canje no se guardó",
          "err"
        );
      }
    }

    /* 4. Cae la bolsa y sube la primera carta por detrás */
    soltarPack();
    soltarCartas();
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

  async function mostrarCartaSola(datos, i, alTerminar) {
    estado = "cartas";
    const nueva = idsNuevosCanje.has(datos.id);
    const btn = crearCarta(datos, i);
    solo.hidden = false;
    solo.innerHTML = "";
    solo.append(btn);
    AudioFX.pop(i);
    await espera(550);

    /* Anticipación según la rareza y se destapa sola */
    await cargarRareza(datos.rareza, btn);
    btn.classList.add("is-flip");
    btn.setAttribute("aria-label", Carta.etiquetaCarta(datos, nueva));
    AudioFX.whoosh();
    await pausa(giroMs(datos.rareza));

    /* En el overlay las cartas son del viewer que canjeó:
       no se guardan en el navegador del streamer, la nube las registra */
    btn.classList.add("is-revealed");
    if (nueva) btn.classList.add("is-new");
    AudioFX.sting(datos.rareza);
    efectosRareza(datos.rareza, btn);
    if (datos.variante === "holo") Carta.meciendo(btn, true);

    /* Se muestra un momento y sale de pantalla */
    await espera(HOLD_MS[datos.rareza]);
    btn.classList.add("is-out");
    AudioFX.whoosh();
    await pausa(450);

    btn.remove();
    alTerminar();
  }

  function cerrarCanje() {
    solo.innerHTML = "";
    solo.hidden = true;

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
      const btn = crearCarta(datos, i, { soloFrente: true, mece: datos.variante === "holo" });
      btn.style.setProperty("--d", `${i * 0.14}s`);
      const nueva = idsNuevosCanje.has(datos.id);
      if (nueva) btn.classList.add("is-new");
      btn.setAttribute("aria-label", Carta.etiquetaCarta(datos, nueva));
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
    /* Twitch puede reentregar un evento: un canjeId ya visto no se repite */
    if (opciones.canjeId && canjesVistos.has(opciones.canjeId)) return false;
    if (colaCanjes.length >= MAX_COLA) return false;
    /* Se marca solo si entra en la cola: uno descartado aún puede reentregarse */
    if (opciones.canjeId) {
      canjesVistos.add(opciones.canjeId);
      if (canjesVistos.size > MAX_VISTOS) canjesVistos.delete(canjesVistos.values().next().value);
    }
    colaCanjes.push(opciones);
    procesarCola();
    return true;
  }

  function procesarCola() {
    if (secuencia || estado !== "idle") return;
    const siguiente = colaCanjes.shift();
    if (!siguiente) return;
    secuenciaCanje(siguiente.rareza || "", siguiente.usuario || "", siguiente.usuarioId || "", siguiente.canjeId || "");
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
          encolarCanje({
            usuario: evento.user_login || "",
            usuarioId: evento.user_id || "",
            canjeId: evento.id || "",
            rareza: "",
          });
        },
        alEstado: actualizarEstadoTwitch,
      });
    } catch (error) {
      console.warn("[Twitch] no se pudo conectar:", error);
      actualizarEstadoTwitch("error", error.message);
    }
  }

  /* =========================================================
     EVENTOS E INICIO
     ========================================================= */
  construirPack();

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
      /* Solo mensajes de la misma página/origen (p. ej. el panel de pruebas) */
      if (evento.origin !== location.origin) return;
      if (evento.data && evento.data.type === "wewinvt:canje") {
        encolarCanje({
          rareza: evento.data.rareza || "",
          usuario: evento.data.usuario || "",
          usuarioId: evento.data.usuarioId || "",
        });
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

