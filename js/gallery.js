/**
 * WewinVT — galerías de emotes y fanarts + lightbox (vanilla JS).
 * Solo se carga en emotes.html.
 */

(function () {
  'use strict';

  var DATA = window.WEWIN || {};
  var emotes = DATA.emotes || [];
  var fanarts = DATA.fanarts || [];

  /**
   * Placeholder de 1px (SVG transparente) para el <img> del lightbox cuando
   * está cerrado. Un src vacío haría que el navegador pidiera la propia
   * página como imagen (tarea "imagen vacía" del documento de mejoras).
   */
  var PLACEHOLDER =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
    );

  /* ------------------------------------------------------------------ */
  /* Render de las galerías                                              */
  /* ------------------------------------------------------------------ */

  function buildItem(item, listName, index) {
    var li = document.createElement('li');
    li.className = listName === 'emote' ? 'emote-tile' : 'fanart-card';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile-btn';
    button.title = item.alt;
    button.setAttribute('aria-label', 'Ver en grande: ' + item.alt);
    button.addEventListener('click', function () {
      openLightbox(listName, index, button);
    });

    var img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.loading = 'lazy';
    img.decoding = 'async';

    button.appendChild(img);

    if (item.animada) {
      var badge = document.createElement('span');
      badge.className = 'animation-badge';
      badge.textContent = 'ANIMADO';
      button.appendChild(badge);
    }

    li.appendChild(button);

    // Crédito del artista (solo si hay dato; sin "por @" vacío).
    if (item.artista) {
      var credit = document.createElement('p');
      credit.className = 'tile-credit';
      if (item.enlace) {
        var link = document.createElement('a');
        link.href = item.enlace;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'por @' + item.artista;
        credit.appendChild(link);
      } else {
        credit.textContent = 'por @' + item.artista;
      }
      li.appendChild(credit);
    }

    return li;
  }

  var emoteList = document.querySelector('[data-emote-list]');
  if (emoteList) {
    emotes.forEach(function (item, index) {
      emoteList.appendChild(buildItem(item, 'emote', index));
    });
  }

  var fanartList = document.querySelector('[data-fanart-list]');
  if (fanartList) {
    fanarts.forEach(function (item, index) {
      fanartList.appendChild(buildItem(item, 'fanart', index));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lightbox                                                            */
  /* ------------------------------------------------------------------ */

  var lightbox = document.querySelector('[data-lightbox]');
  if (!lightbox) return;

  var lightboxImg = lightbox.querySelector('[data-lightbox-img]');
  var lightboxCaption = lightbox.querySelector('[data-lightbox-caption]');
  var closeButton = lightbox.querySelector('[data-lightbox-close]');
  var prevButton = lightbox.querySelector('[data-lightbox-prev]');
  var nextButton = lightbox.querySelector('[data-lightbox-next]');

  var currentList = null;
  var currentIndex = 0;
  var lastTrigger = null;

  function itemsFor(listName) {
    return listName === 'emote' ? emotes : fanarts;
  }

  /** Pinta la leyenda: autor como enlace si existe; si no, la descripción. */
  function renderLightbox() {
    var item = itemsFor(currentList)[currentIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightboxCaption.textContent = '';
    if (item.artista) {
      lightboxCaption.appendChild(document.createTextNode('por '));
      if (item.enlace) {
        var link = document.createElement('a');
        link.href = item.enlace;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = '@' + item.artista;
        lightboxCaption.appendChild(link);
      } else {
        var name = document.createElement('strong');
        name.textContent = '@' + item.artista;
        lightboxCaption.appendChild(name);
      }
    } else {
      lightboxCaption.textContent = item.alt;
    }
  }

  function openLightbox(listName, index, trigger) {
    currentList = listName;
    currentIndex = index;
    lastTrigger = trigger || null;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    closeButton.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightboxImg.src = PLACEHOLDER;
    lightboxImg.alt = '';
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
  }

  function step(direction) {
    var items = itemsFor(currentList);
    currentIndex = (currentIndex + direction + items.length) % items.length;
    renderLightbox();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    }
  }

  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  closeButton.addEventListener('click', closeLightbox);
  prevButton.addEventListener('click', function () {
    step(-1);
  });
  nextButton.addEventListener('click', function () {
    step(1);
  });

  // Estado inicial: el lightbox cerrado nunca carga la página como imagen.
  lightboxImg.src = PLACEHOLDER;
})();
