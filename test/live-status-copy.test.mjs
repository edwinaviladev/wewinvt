import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const mainSource = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const albumHtml = readFileSync(new URL("../album.html", import.meta.url), "utf8");
const startMarker = "  function renderSignal(panel, status) {";
const endMarker = "\n  function initSignalPanel() {";
const start = mainSource.indexOf(startMarker);
const end = mainSource.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "renderSignal should be present in main.js");
const renderSignalSource = mainSource.slice(start, end);

function renderSignal(status, schedule = "") {
  const nodes = new Map();
  ["[data-signal-label]", "[data-signal-strong]", "[data-signal-text]", "[data-signal-meta]", "[data-signal-cta]"].forEach((selector) => {
    nodes.set(selector, { textContent: "", innerHTML: "" });
  });
  const classes = new Set();
  const panel = {
    classList: {
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      add: (name) => classes.add(name),
    },
    querySelector: (selector) => nodes.get(selector) || null,
  };

  runInNewContext(`${renderSignalSource}\nrenderSignal(panel, status);`, {
    panel,
    status,
    proximoStreamTexto: () => schedule,
    formatDuration: () => "",
    insertarReproductor() {},
  });
  return { nodes, classes };
}

test("empty album state keeps its existing playful copy", () => {
  assert.match(albumHtml, /Aún no tienes cartas — ¡canjea el gacha en el stream!/);
});

test("offline and lookup-error states have distinct, voiced copy", () => {
  const offline = renderSignal({ state: "offline", lastTitle: "La partida que no acabó" });
  assert.equal(offline.nodes.get("[data-signal-label]").textContent, "Fuera de aire");
  assert.equal(offline.nodes.get("[data-signal-strong]").textContent, "Wewin anda en pausa");
  assert.match(offline.nodes.get("[data-signal-text]").textContent, /La próxima decisión cuestionable/);
  assert.equal(offline.classes.has("signal-offline"), true);

  const error = renderSignal({ state: "error" }, "Próximo stream: martes 20:00");
  assert.equal(error.nodes.get("[data-signal-label]").textContent, "Interferencia");
  assert.equal(error.nodes.get("[data-signal-strong]").textContent, "No pudimos consultar Twitch");
  assert.match(error.nodes.get("[data-signal-text]").textContent, /confirma el directo en Twitch/i);
  assert.equal(error.classes.has("signal-error"), true);
});
