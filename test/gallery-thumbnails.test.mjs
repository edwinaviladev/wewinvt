import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const dataSource = readFileSync(new URL("../js/data.js", import.meta.url), "utf8");
const gallerySource = readFileSync(new URL("../js/gallery.js", import.meta.url), "utf8");
const editorialStyles = readFileSync(new URL("../css/paleta-editorial.css", import.meta.url), "utf8");

function element() {
  return {
    children: [],
    listeners: {},
    attributes: {},
    dataset: {},
    style: {},
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function mountGallery() {
  const window = {};
  runInNewContext(dataSource, { window });

  const emoteList = element();
  const fanartList = element();
  const lightbox = element();
  const lightboxImage = element();
  const caption = element();
  const closeButton = element();
  const prevButton = element();
  const nextButton = element();
  const lightboxElements = {
    "[data-lightbox-img]": lightboxImage,
    "[data-lightbox-caption]": caption,
    "[data-lightbox-close]": closeButton,
    "[data-lightbox-prev]": prevButton,
    "[data-lightbox-next]": nextButton,
  };
  lightbox.querySelector = (selector) => lightboxElements[selector];

  const document = {
    body: { style: {} },
    activeElement: null,
    querySelector(selector) {
      if (selector === "[data-emote-list]") return emoteList;
      if (selector === "[data-fanart-list]") return fanartList;
      if (selector === "[data-lightbox]") return lightbox;
      return null;
    },
    createElement: () => element(),
    createTextNode: (textContent) => ({ textContent }),
    addEventListener() {},
    removeEventListener() {},
    contains: () => true,
  };

  runInNewContext(gallerySource, { document, window });
  return { window, emoteList, fanartList, lightbox, lightboxImage };
}

function imageIn(list, index) {
  return list.children[index].children[0].children[0];
}

function thumbnailPath(src, width) {
  const directory = src.slice(0, src.lastIndexOf("/") + 1);
  const name = src.slice(src.lastIndexOf("/") + 1).replace(/\.webp$/i, "");
  return `${directory}thumbs/${name}-${width}.webp`;
}

function webpFrameDurations(buffer) {
  const durations = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (type === "ANMF") durations.push(buffer.readUIntLE(offset + 20, 3));
    offset += 8 + size + (size & 1);
  }
  return durations;
}

test("gallery uses responsive thumbnails and keeps original images in the lightbox", () => {
  const { window, emoteList, fanartList, lightbox, lightboxImage } = mountGallery();
  const emote = imageIn(emoteList, 0);
  const fanart = imageIn(fanartList, 0);

  assert.equal(emote.src, "img/emotes/thumbs/lentes-oscuros-64.webp");
  assert.match(emote.srcset, /lentes-oscuros-128\.webp 128w/);
  assert.match(emote.srcset, /lentes-oscuros-256\.webp 256w/);
  assert.doesNotMatch(emote.srcset, /lentes-oscuros\.webp/);
  assert.equal(emote.sizes, "(max-width: 480px) 30vw, 96px");
  assert.equal(emote.width, 1280);
  assert.equal(emote.height, 1280);

  assert.equal(fanart.src, "img/fanarts/thumbs/templo-hollow-knight-320.webp");
  assert.match(fanart.srcset, /templo-hollow-knight-640\.webp 640w/);
  assert.doesNotMatch(fanart.srcset, /templo-hollow-knight\.webp/);
  assert.equal(fanart.sizes, "(max-width: 600px) calc(100vw - 3rem), 640px");

  const regularFanart = imageIn(fanartList, 1);
  assert.equal(regularFanart.sizes, "(max-width: 600px) calc(100vw - 3rem), (max-width: 900px) 45vw, 290px");

  fanartList.children[0].children[0].listeners.click();
  assert.equal(lightbox.hidden, false);
  assert.equal(lightboxImage.src, window.WEWIN.fanarts[0].src);
});

test("selected fanarts get double width in the mosaic without changing gallery order", () => {
  const { window, fanartList } = mountGallery();
  const featuredCards = fanartList.children.filter((item) => item.className.includes("fanart-card--featured"));
  const featuredImages = featuredCards.map((card) => window.WEWIN.fanarts[Number(card.dataset.index)].src);

  assert.deepEqual(featuredImages, [
    "img/fanarts/templo-hollow-knight.webp",
    "img/fanarts/comic-comunidad.webp",
  ]);
  assert.equal(imageIn(fanartList, Number(featuredCards[0].dataset.index)).sizes, "(max-width: 600px) calc(100vw - 3rem), 640px");
  assert.equal(fanartList.children.length, window.WEWIN.fanarts.length);
  assert.match(
    editorialStyles,
    /\.fanart-card--featured\s*\{[^}]*column-span:\s*all;[^}]*width:\s*min\(100%,\s*40rem\);/s
  );
});

test("generated gallery thumbnails exist and are smaller than their originals", () => {
  const { window } = mountGallery();
  const variants = {
    emotes: [64, 128, 256],
    fanarts: [320, 640],
  };

  Object.entries(variants).forEach(([category, widths]) => {
    window.WEWIN[category].forEach((item) => {
      widths.filter((width) => width < item.width).forEach((width) => {
        const thumbnail = thumbnailPath(item.src, width);
        const thumbnailUrl = new URL(`../${thumbnail}`, import.meta.url);
        const originalUrl = new URL(`../${item.src}`, import.meta.url);
        assert.ok(existsSync(thumbnailUrl), `${thumbnail} must exist`);
        assert.ok(
          statSync(thumbnailUrl).size < statSync(originalUrl).size,
          `${thumbnail} should be smaller than ${item.src}`
        );
      });
    });
  });
});

test("animated emote thumbnails retain the original frame timing", () => {
  const { window } = mountGallery();
  for (const item of window.WEWIN.emotes.filter((emote) => emote.animada)) {
    const original = readFileSync(new URL(`../${item.src}`, import.meta.url));
    const thumbnail = readFileSync(new URL(`../${thumbnailPath(item.src, 128)}`, import.meta.url));
    assert.deepEqual(webpFrameDurations(thumbnail), webpFrameDurations(original), item.src);
  }
});
