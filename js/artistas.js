(() => {
  "use strict";

  const DATA = window.WEWIN || {};
  const container = document.querySelector("[data-artistas]");
  if (!container) return;

  const thumbnailWidths = { emote: [64, 128, 256], fanart: [320, 640] };

  function thumbnailPath(src, width) {
    const directory = src.slice(0, src.lastIndexOf("/") + 1);
    const filename = src.slice(src.lastIndexOf("/") + 1).replace(/\.webp$/i, "");
    return `${directory}thumbs/${filename}-${width}.webp`;
  }

  function configureImage(img, work, category) {
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
    img.sizes = "(max-width: 560px) 42vw, 160px";
    img.src = candidates[0].split(" ")[0];
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
      section.className = "artist-card";
      section.setAttribute("aria-labelledby", `artist-${index}-title`);

      const header = document.createElement("header");
      header.className = "artist-card__header";
      const heading = document.createElement("h2");
      heading.className = "artist-card__title";
      heading.id = `artist-${index}-title`;
      if (artist.link) {
        const link = document.createElement("a");
        link.href = artist.link;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = artist.name;
        heading.appendChild(link);
      } else {
        heading.textContent = artist.name;
      }

      const count = document.createElement("p");
      count.className = "artist-card__count";
      count.textContent = `${artist.works.length} ${artist.works.length === 1 ? "obra" : "obras"}`;
      header.append(heading, count);

      const list = document.createElement("ul");
      list.className = "artist-works";
      list.setAttribute("aria-label", `Obras de ${artist.name}`);
      artist.works.forEach((work) => {
        const item = document.createElement("li");
        item.className = "artist-work";
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        configureImage(img, work, work.category === "Emote" ? "emote" : "fanart");
        figure.appendChild(img);

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
      container.appendChild(section);
    });
})();
