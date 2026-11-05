(() => {
  "use strict";

  const DATA = window.WEWIN || {};
  const container = document.querySelector("[data-artistas]");
  if (!container) return;

  const thumbnailWidths = { emote: [64, 128, 256], fanart: [320, 640] };
  // Artists with this many works or more get a full-width card.
  const WIDE_CARD_MIN_WORKS = 4;
  const PLATFORMS = [
    { host: "twitch.tv", label: "Twitch" },
    { host: "instagram.com", label: "Instagram" },
  ];

  function pluralize(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function countsText(works) {
    const emotes = works.filter((work) => work.category === "Emote").length;
    const fanarts = works.filter((work) => work.category === "Fanart").length;
    return [
      emotes ? pluralize(emotes, "emote", "emotes") : "",
      fanarts ? pluralize(fanarts, "fanart", "fanarts") : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // Returns the platform label for a profile URL, or "" when it is malformed.
  function platformLabel(url) {
    let hostname;
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch (error) {
      return "";
    }
    const known = PLATFORMS.find(({ host }) => hostname === host || hostname.endsWith(`.${host}`));
    return known ? known.label : "Perfil";
  }

  function thumbnailPath(src, width) {
    const directory = src.slice(0, src.lastIndexOf("/") + 1);
    const filename = src.slice(src.lastIndexOf("/") + 1).replace(/\.webp$/i, "");
    return `${directory}thumbs/${filename}-${width}.webp`;
  }

  // Rendered thumbnail width follows the card layout in css/artistas.css.
  function thumbnailSizes(worksCount) {
    if (worksCount >= WIDE_CARD_MIN_WORKS) return "(max-width: 560px) 28vw, 180px";
    if (worksCount === 1) return "(max-width: 560px) 42vw, (max-width: 900px) 46vw, min(31vw, 590px)";
    return "(max-width: 560px) 42vw, (max-width: 900px) 23vw, min(16vw, 290px)";
  }

  function configureImage(img, work, category, sizes) {
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    if (typeof work.width !== "number" || typeof work.height !== "number") {
      img.src = work.src;
      return;
    }

    const candidates = thumbnailWidths[category]
      .filter((width) => width < work.width)
      .map((width) => `${thumbnailPath(work.src, width)} ${width}w`);
    img.width = work.width;
    img.height = work.height;
    if (!candidates.length) {
      img.src = work.src;
      return;
    }
    img.srcset = candidates.join(", ");
    img.sizes = sizes;
    img.src = candidates[0].split(" ")[0];
  }

  /* Lightbox (optional: the page works without its markup). */

  // 1px transparent image shown while closed so the browser never loads the page as an image.
  const PLACEHOLDER =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');

  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImg = lightbox && lightbox.querySelector("[data-lightbox-img]");
  const lightboxCaption = lightbox && lightbox.querySelector("[data-lightbox-caption]");
  const closeButton = lightbox && lightbox.querySelector("[data-lightbox-close]");
  const prevButton = lightbox && lightbox.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox && lightbox.querySelector("[data-lightbox-next]");
  const lightboxReady = Boolean(lightboxImg && lightboxCaption && closeButton && prevButton && nextButton);

  let currentWorks = [];
  let currentIndex = 0;
  let lastTrigger = null;

  function renderLightbox() {
    const work = currentWorks[currentIndex];
    if (!work) return;
    lightboxImg.src = work.src;
    lightboxImg.alt = work.alt;
    lightboxCaption.textContent = "";
    const type = document.createElement("strong");
    type.className = "lb-caption__type";
    type.textContent = work.category;
    const description = document.createElement("span");
    description.textContent = work.alt;
    lightboxCaption.append(type, description);
    const single = currentWorks.length < 2;
    prevButton.hidden = single;
    nextButton.hidden = single;
  }

  function openLightbox(works, index, trigger) {
    currentWorks = works;
    currentIndex = index;
    lastTrigger = trigger || null;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    closeButton.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    lightboxImg.src = PLACEHOLDER;
    lightboxImg.alt = "";
    document.removeEventListener("keydown", onKeydown);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  function step(direction) {
    if (currentWorks.length < 2) return;
    currentIndex = (currentIndex + direction + currentWorks.length) % currentWorks.length;
    renderLightbox();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      step(-1);
    } else if (event.key === "ArrowRight") {
      step(1);
    } else if (event.key === "Tab") {
      const focusable = Array.from(
        lightbox.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((node) => !node.hidden);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!focusable.includes(active)) {
        // Focus left the controls, for example after a click on the image: bring it back.
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  if (lightboxReady) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", () => step(-1));
    nextButton.addEventListener("click", () => step(1));
    lightboxImg.src = PLACEHOLDER;
  }

  const byArtist = new Map();
  [
    ["fanarts", "Fanart"],
    ["emotes", "Emote"],
  ].forEach(([key, category]) => {
    (DATA[key] || []).forEach((work) => {
      const name = (work.artista || "Anónimo").trim() || "Anónimo";
      let artist = byArtist.get(name);
      if (!artist) {
        artist = { name, link: "", works: [] };
        byArtist.set(name, artist);
      }
      if (!artist.link && work.enlace) artist.link = work.enlace;
      artist.works.push({ ...work, category });
    });
  });

  [...byArtist.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
    .forEach((artist, index) => {
      const section = document.createElement("section");
      section.className = artist.works.length >= WIDE_CARD_MIN_WORKS ? "artist-card artist-card--wide" : "artist-card";
      section.setAttribute("aria-labelledby", `artist-${index}-title`);

      const header = document.createElement("header");
      header.className = "artist-card__header";
      const heading = document.createElement("h2");
      heading.className = "artist-card__title";
      heading.id = `artist-${index}-title`;
      heading.textContent = artist.name;

      const count = document.createElement("p");
      count.className = "artist-card__count";
      count.textContent = countsText(artist.works);
      header.append(heading, count);

      const label = artist.link ? platformLabel(artist.link) : "";
      if (label) {
        const link = document.createElement("a");
        link.className = "artist-card__profile";
        link.href = artist.link;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = `${label} ↗`;
        link.setAttribute("aria-label", `Perfil de ${artist.name} en ${label} (se abre en otra pestaña)`);
        header.appendChild(link);
      }

      // Anonymous works have no credited artist, so there is no filtered gallery to link to.
      const credited = artist.works.some((work) => work.artista && work.artista.trim());
      let galleryLink = null;
      if (credited) {
        galleryLink = document.createElement("a");
        galleryLink.className = "artist-card__gallery";
        galleryLink.href = `emotes.html?artista=${encodeURIComponent(artist.name)}`;
        galleryLink.textContent = "Ver en galería";
      }

      const list = document.createElement("ul");
      list.className = "artist-works";
      list.setAttribute("aria-label", `Obras de ${artist.name}`);
      artist.works.forEach((work, workIndex) => {
        const item = document.createElement("li");
        item.className = "artist-work";
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        configureImage(img, work, work.category === "Emote" ? "emote" : "fanart", thumbnailSizes(artist.works.length));
        if (lightboxReady) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "artist-work__open";
          button.setAttribute("aria-label", `Ver en grande: ${work.alt}`);
          button.addEventListener("click", () => openLightbox(artist.works, workIndex, button));
          button.appendChild(img);
          figure.appendChild(button);
        } else {
          figure.appendChild(img);
        }

        const caption = document.createElement("figcaption");
        const category = document.createElement("span");
        category.className = "artist-work__type";
        category.textContent = work.category;
        const description = document.createElement("span");
        description.className = "artist-work__description";
        description.textContent = work.alt;
        caption.append(category, description);
        figure.appendChild(caption);
        item.appendChild(figure);
        list.appendChild(item);
      });

      section.append(header, list);
      if (galleryLink) section.appendChild(galleryLink);
      container.appendChild(section);
    });
})();
