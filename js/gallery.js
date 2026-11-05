/**
 * WewinVT — galerías de emotes y fanarts + lightbox (vanilla JS).
 * Solo se carga en emotes.html.
 */

(function () {
  'use strict';

  var DATA = window.WEWIN || {};
  var emotes = DATA.emotes || [];
  var fanarts = DATA.fanarts || [];
  var visibleIndexes = {
    emote: emotes.map(function (_item, index) { return index; }),
    fanart: fanarts.map(function (_item, index) { return index; }),
  };

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

  var thumbnailWidths = {
    emote: [64, 128, 256],
    fanart: [320, 640],
  };

  function thumbnailPath(src, width) {
    var directory = src.slice(0, src.lastIndexOf('/') + 1);
    var filename = src.slice(src.lastIndexOf('/') + 1).replace(/\.webp$/i, '');
    return directory + 'thumbs/' + filename + '-' + width + '.webp';
  }

  function configureImage(img, item, listName) {
    img.alt = item.alt;
    img.loading = 'lazy';
    img.decoding = 'async';

    if (typeof item.width !== 'number' || typeof item.height !== 'number') {
      img.src = item.src;
      return;
    }

    var candidates = thumbnailWidths[listName]
      .filter(function (width) {
        return width < item.width;
      })
      .map(function (width) {
        return thumbnailPath(item.src, width) + ' ' + width + 'w';
      });

    img.width = item.width;
    img.height = item.height;
    if (!candidates.length) {
      img.src = item.src;
      return;
    }
    img.srcset = candidates.join(', ');
    img.sizes = listName === 'emote'
      ? '(max-width: 480px) 30vw, 96px'
      : item.destacada
        ? '(max-width: 600px) calc(100vw - 3rem), 640px'
        : '(max-width: 600px) calc(100vw - 3rem), (max-width: 900px) 45vw, 290px';
    img.src = candidates[0].split(' ')[0];
  }

  function buildItem(item, listName, index) {
    var li = document.createElement('li');
    var featuredFanart = listName === 'fanart' && item.destacada;
    li.className = listName === 'emote'
      ? 'emote-tile'
      : 'fanart-card' + (featuredFanart ? ' fanart-card--featured' : '');
    li.dataset.tipo = listName;
    li.dataset.artista = item.artista || '';
    li.dataset.index = String(index);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile-btn';
    button.title = item.alt;
    button.setAttribute('aria-label', 'Ver en grande: ' + item.alt);
    button.addEventListener('click', function () {
      openLightbox(listName, index, button);
    });

    var img = document.createElement('img');
    configureImage(img, item, listName);

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

  var typeFilter = document.querySelector('[data-gallery-type-filter]');
  var artistFilter = document.querySelector('[data-gallery-artist-filter]');
  var clearFilters = document.querySelector('[data-gallery-clear]');
  var filterCount = document.querySelector('[data-gallery-filter-count]');
  var filterEmpty = document.querySelector('[data-gallery-empty]');

  if (typeFilter && artistFilter) {
    var artistNames = Array.from(new Set(emotes.concat(fanarts)
      .map(function (item) { return item.artista; })
      .filter(Boolean)))
      .sort(function (a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); });

    artistNames.forEach(function (name) {
      var option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      artistFilter.appendChild(option);
    });

    var gallerySections = Array.prototype.slice.call(
      document.querySelectorAll('[data-gallery-section]')
    );

    function applyFilters() {
      var tipoElegido = typeFilter.value;
      var artistaElegido = artistFilter.value;
      var actualizados = { emote: [], fanart: [] };
      var totalVisible = 0;

      gallerySections.forEach(function (section) {
        var tipo = section.dataset.gallerySection;
        var list = section.querySelector('ul');
        var visiblesEnSeccion = 0;
        Array.prototype.forEach.call(list ? list.children : [], function (item) {
          var visible =
            (tipoElegido === 'all' || tipoElegido === tipo) &&
            (artistaElegido === 'all' || artistaElegido === item.dataset.artista);
          item.hidden = !visible;
          if (visible) {
            actualizados[tipo].push(Number(item.dataset.index));
            visiblesEnSeccion += 1;
            totalVisible += 1;
          }
        });
        section.hidden = visiblesEnSeccion === 0;
      });

      visibleIndexes = actualizados;
      if (filterCount) filterCount.textContent = totalVisible + (totalVisible === 1 ? ' obra' : ' obras');
      if (filterEmpty) filterEmpty.hidden = totalVisible > 0;
    }

    typeFilter.addEventListener('change', applyFilters);
    artistFilter.addEventListener('change', applyFilters);
    if (clearFilters) {
      clearFilters.addEventListener('click', function () {
        typeFilter.value = 'all';
        artistFilter.value = 'all';
        applyFilters();
      });
    }
    // Deep link: emotes.html?artista=<name> preselects an existing artist; unknown names are ignored.
    if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
      var requestedArtist = new URLSearchParams(location.search).get('artista');
      if (requestedArtist !== null && artistNames.indexOf(requestedArtist) !== -1) {
        artistFilter.value = requestedArtist;
      }
    }
    applyFilters();
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
    var index = (visibleIndexes[currentList] || [])[currentIndex];
    var item = itemsFor(currentList)[index];
    if (!item) return;
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
    var visible = visibleIndexes[listName] || [];
    var visibleIndex = visible.indexOf(index);
    if (visibleIndex === -1) return;
    currentList = listName;
    currentIndex = visibleIndex;
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
    var visible = visibleIndexes[currentList] || [];
    if (!visible.length) return;
    currentIndex = (currentIndex + direction + visible.length) % visible.length;
    renderLightbox();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    } else if (event.key === 'Tab') {
      var focusable = Array.prototype.slice.call(
        lightbox.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
