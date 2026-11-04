import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const mainSource = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const editorialStyles = readFileSync(new URL("../css/paleta-editorial.css", import.meta.url), "utf8");
const startMarker = "  var toReveal = Array.prototype.slice.call(document.querySelectorAll('[data-animate]'));";
const endMarker = "\n  /* ------------------------------------------------------------------ */\n  /* Año del footer";
const start = mainSource.indexOf(startMarker);
const end = mainSource.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "scroll reveal initialization should be present in main.js");
const revealSource = mainSource.slice(start, end);

function element() {
  const clases = new Set();
  return {
    clases,
    classList: {
      add: (name) => clases.add(name),
      remove: (name) => clases.delete(name),
    },
  };
}

function runReveal({ timelineSupport = false, reduceMotion = false, hasObserver = true } = {}) {
  const elements = [element(), element()];
  const observers = [];
  function MockIntersectionObserver(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.unobserved = [];
    observers.push(this);
  }
  MockIntersectionObserver.prototype.observe = function (target) {
    this.observed.push(target);
  };
  MockIntersectionObserver.prototype.unobserve = function (target) {
    this.unobserved.push(target);
  };

  const window = {
    CSS: { supports: () => timelineSupport },
  };
  if (hasObserver) window.IntersectionObserver = MockIntersectionObserver;
  const document = { querySelectorAll: () => elements };

  runInNewContext(revealSource, {
    document,
    window,
    reduceMotion,
    IntersectionObserver: MockIntersectionObserver,
  });
  return { elements, observers };
}

test("CSS view timelines replace the IntersectionObserver reveal when supported", () => {
  const { elements, observers } = runReveal({ timelineSupport: true });

  assert.equal(observers.length, 0);
  assert.ok(elements.every((el) => el.clases.has("is-visible")));
  assert.match(editorialStyles, /animation-timeline:\s*view\(\)/);
  assert.match(editorialStyles, /animation-range:\s*entry 0% entry 40%/);
  assert.match(editorialStyles, /prefers-reduced-motion:\s*no-preference/);
});

test("IntersectionObserver remains the fallback when scroll timelines are unsupported", () => {
  const { elements, observers } = runReveal();

  assert.equal(observers.length, 1);
  assert.deepEqual(observers[0].observed, elements);
  assert.ok(elements.every((el) => !el.clases.has("is-visible")));

  observers[0].callback([{ isIntersecting: true, target: elements[0] }]);
  assert.equal(elements[0].clases.has("is-visible"), true);
  assert.equal(elements[1].clases.has("is-visible"), false);
  assert.deepEqual(observers[0].unobserved, [elements[0]]);
});

test("reduced motion and browsers without IntersectionObserver reveal immediately", () => {
  [runReveal({ timelineSupport: true, reduceMotion: true }), runReveal({ hasObserver: false })].forEach(
    ({ elements, observers }) => {
      assert.equal(observers.length, 0);
      assert.ok(elements.every((el) => el.clases.has("is-visible")));
    }
  );
});
