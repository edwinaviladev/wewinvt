/**
 * WewinVT — comportamiento compartido (vanilla JS).
 * - Menú móvil.
 * - Animaciones de entrada al hacer scroll.
 * - Indicador de "en vivo" consultando la señal pública de Twitch
 *   (sin servidor propio: usa api.ivr.fi y cae a decapi.me).
 * - Tarjeta de horario de streams (se oculta si no hay datos).
 */

(function () {
  'use strict';

  var DATA = window.WEWIN || {
    channel: 'wewinvt',
    twitchUrl: 'https://www.twitch.tv/wewinvt',
    horario: null,
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var horario = DATA.horario || { zona: 'hora CDMX', dias: [] };

  /* ------------------------------------------------------------------ */
  /* Menú móvil                                                          */
  /* ------------------------------------------------------------------ */

  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');

  if (header && navToggle) {
    var closeMenu = function () {
      header.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', function () {
      var isOpen = header.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    document.querySelectorAll('.nav-list a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Animaciones de entrada                                              */
  /* ------------------------------------------------------------------ */

  var toReveal = Array.prototype.slice.call(document.querySelectorAll('[data-animate]'));

  if (!('IntersectionObserver' in window) || reduceMotion) {
    toReveal.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    toReveal.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Año del footer                                                      */
  /* ------------------------------------------------------------------ */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------ */
  /* Horario de streams                                                  */
  /* ------------------------------------------------------------------ */

  function proximoStreamTexto() {
    if (horario.dias && horario.dias.length > 0) {
      var proximo = horario.dias[0];
      return 'Próximo stream: ' + proximo.dia + ' ' + proximo.hora + ' (' + horario.zona + ')';
    }
    return horario.texto ? horario.texto : '';
  }

  function renderScheduleSlot() {
    var slot = document.querySelector('[data-schedule-slot]');
    if (!slot) return;

    var lines = [];
    if (horario.dias && horario.dias.length > 0) {
      horario.dias.forEach(function (dia) {
        lines.push(dia.dia + ' · ' + dia.hora + ' (' + horario.zona + ')');
      });
    } else if (horario.texto) {
      lines.push(horario.texto);
    }
    if (lines.length === 0) return;

    var card = document.createElement('div');
    card.className = 'schedule-card';
    card.setAttribute('aria-label', 'Horario de streams');

    var title = document.createElement('strong');
    title.textContent = 'Cuándo hay stream';
    card.appendChild(title);

    lines.forEach(function (line) {
      var span = document.createElement('span');
      span.textContent = line;
      card.appendChild(span);
    });

    slot.appendChild(card);
  }

  renderScheduleSlot();

  /* ------------------------------------------------------------------ */
  /* Indicador de señal en vivo                                          */
  /* ------------------------------------------------------------------ */

  var CACHE_KEY = 'wewin:live-status';
  var CACHE_TTL_MS = 60 * 1000;
  var SIGNAL_TIMEOUT_MS = 5 * 1000;

  function withTimeout(promise, ms, mensaje) {
    return Promise.race([
      promise,
      new Promise(function (_resolve, reject) {
        window.setTimeout(function () {
          reject(new Error(mensaje || 'timeout'));
        }, ms);
      }),
    ]);
  }

  function readCache() {
    try {
      var raw = window.sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
      return parsed.value;
    } catch (error) {
      return null;
    }
  }

  function writeCache(value) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), value: value }));
    } catch (error) {
      /* modo privado sin storage: se ignora */
    }
  }

  function formatDuration(isoStart) {
    var start = new Date(isoStart).getTime();
    if (Number.isNaN(start)) return null;
    var minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    if (hours > 0) return hours + ' h' + (rest > 0 ? ' ' + rest + ' m' : '');
    return rest + ' m';
  }

  /** Consulta el estado del canal con ivr.fi y, si falla, con decapi.me. */
  async function fetchLiveStatus() {
    var cached = readCache();
    if (cached) return cached;

    try {
      var response = await withTimeout(
        fetch('https://api.ivr.fi/v2/twitch/user?login=' + DATA.channel),
        SIGNAL_TIMEOUT_MS,
        'ivr timeout'
      );
      if (!response.ok) throw new Error('ivr disponibilidad ' + response.status);

      var payload = await response.json();
      var channel = Array.isArray(payload) ? payload[0] : payload;
      if (!channel) throw new Error('respuesta sin datos');

      var stream = channel.stream || null;
      var status = {
        state: stream ? 'live' : 'offline',
        title: null,
        game: null,
        viewers: null,
        startedAt: null,
        logo: channel.logo || null,
        lastTitle: (channel.lastBroadcast && channel.lastBroadcast.title) || null,
      };

      if (stream) {
        status.title = stream.title || null;
        status.game = stream.game || stream.gameName || null;
        status.viewers =
          typeof stream.viewerCount === 'number'
            ? stream.viewerCount
            : typeof stream.viewers === 'number'
              ? stream.viewers
              : null;
        status.startedAt = stream.createdAt || null;
      }

      writeCache(status);
      return status;
    } catch (ivrError) {
      // Plan B: decapi.me responde texto plano con CORS abierto (con margen corto).
      try {
        var res = await withTimeout(
          fetch('https://decapi.me/twitch/uptime/' + DATA.channel),
          2500,
          'decapi timeout'
        );
        var text = await res.text();
        var isLive = !/is offline/i.test(text);
        var parsedStatus = {
          state: isLive ? 'live' : 'offline',
          title: null,
          game: null,
          viewers: null,
          startedAt: null,
          logo: null,
          lastTitle: null,
        };
        writeCache(parsedStatus);
        return parsedStatus;
      } catch (decapiError) {
        throw decapiError;
      }
    }
  }

  function insertarReproductor(panel) {
    if (panel.querySelector('.stream-frame')) return;

    // En producción el sitio vive en wewinvt.com (apex y www, como parámetro parent).
    var iframe = document.createElement('iframe');
    iframe.className = 'stream-frame';
    iframe.src =
      'https://player.twitch.tv/?channel=' +
      DATA.channel +
      '&parent=wewinvt.com&parent=www.wewinvt.com&muted=true';
    iframe.title = 'Stream en vivo de Wewin en Twitch';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    panel.appendChild(iframe);
  }

  function renderSignal(panel, status) {
    var stateClass = {
      live: 'signal-live',
      offline: 'signal-offline',
      error: 'signal-error',
      loading: 'signal-loading',
    }[status.state] || 'signal-offline';

    panel.classList.remove('signal-live', 'signal-offline', 'signal-loading', 'signal-error');
    panel.classList.add(stateClass);

    var label = panel.querySelector('[data-signal-label]');
    var strong = panel.querySelector('[data-signal-strong]');
    var text = panel.querySelector('[data-signal-text]');
    var meta = panel.querySelector('[data-signal-meta]');
    var cta = panel.querySelector('[data-signal-cta]');
    var logo = panel.querySelector('[data-signal-logo]');

    if (status.state === 'loading') {
      if (label) label.textContent = 'Consultando señal';
      if (strong) strong.textContent = 'Revisando el canal…';
      if (text) text.textContent = 'Un momento, estamos viendo si Wewin está transmitiendo.';
      if (cta) cta.textContent = 'Ir al canal';
    } else if (status.state === 'live') {
      if (label) label.textContent = 'En vivo ahora';
      if (strong) strong.textContent = 'Wewin está en vivo';
      if (text) {
        text.textContent = status.title || 'Entra al canal para acompañar la transmisión.';
      }
      if (meta) {
        var chips = [];
        if (status.game) chips.push('🎮 ' + status.game);
        if (typeof status.viewers === 'number') chips.push('👥 ' + status.viewers.toLocaleString('es') + ' espectadores');
        if (status.startedAt) {
          var duration = formatDuration(status.startedAt);
          if (duration) chips.push('⏱ ' + duration);
        }
        meta.innerHTML = '';
        chips.forEach(function (chip) {
          var span = document.createElement('span');
          span.textContent = chip;
          meta.appendChild(span);
        });
      }
      if (cta) cta.textContent = 'Entrar a la transmisión';
      insertarReproductor(panel);
    } else if (status.state === 'offline') {
      if (label) label.textContent = 'Sin transmisión por ahora';
      if (strong) strong.textContent = 'Wewin no está en vivo';
      if (text) {
        text.textContent = status.lastTitle
          ? 'Última transmisión: «' + status.lastTitle + '». Cuando inicie un directo, este panel se actualizará.'
          : 'Cuando el canal inicie una transmisión, este panel cambiará automáticamente.';
      }
      if (cta) cta.textContent = 'Ir al canal';
    } else {
      // Estado de respaldo: la consulta falló o expiró.
      if (label) label.textContent = 'Sin transmisión por ahora';
      if (strong) strong.textContent = 'Wewin no está en vivo';
      if (text) {
        var proximo = proximoStreamTexto();
        text.textContent =
          proximo || 'Síguelo en Twitch para enterarte cuando empiece.';
      }
      if (cta) cta.textContent = 'Ir al canal';
    }

    if (logo && status.logo) {
      logo.hidden = true;
      logo.onload = function () {
        logo.hidden = false;
      };
      logo.onerror = function () {
        logo.hidden = true;
      };
      logo.src = status.logo;
    } else if (logo) {
      logo.hidden = true;
      logo.onload = null;
      logo.onerror = null;
      logo.removeAttribute('src');
    }
  }

  function initSignalPanel() {
    var panel = document.querySelector('[data-signal]');
    if (!panel) return;

    renderSignal(panel, { state: 'loading', logo: null });

    fetchLiveStatus()
      .then(function (status) {
        renderSignal(panel, status);
      })
      .catch(function () {
        renderSignal(panel, { state: 'error', logo: null });
      });
  }

  initSignalPanel();
})();
