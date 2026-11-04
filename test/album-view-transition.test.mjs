import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const albumSource = readFileSync(new URL("../js/album.js", import.meta.url), "utf8");
const albumHtml = readFileSync(new URL("../album.html", import.meta.url), "utf8");
const albumStyles = readFileSync(new URL("../css/album.css", import.meta.url), "utf8");
const start = albumSource.indexOf("  function transicionarCarta(origen, dialogo, actualizar) {");
const end = albumSource.indexOf("\n  function abrirDetalle(datos, origen) {", start);
assert.ok(start >= 0 && end > start, "transicionarCarta should be present in album.js");
const transitionSource = albumSource.slice(start, end);

function style() {
  const values = new Map();
  return {
    values,
    setProperty(name, value) {
      values.set(name, value);
    },
    removeProperty(name) {
      values.delete(name);
    },
  };
}

function runTransition({ reduced = false, supported = true, dialogHidden = false } = {}) {
  const origen = { isConnected: true, style: style() };
  const destino = { isConnected: true, style: style() };
  const clases = new Set();
  const dialogo = {
    hidden: false,
    classList: {
      add: (name) => clases.add(name),
      remove: (name) => clases.delete(name),
    },
  };
  let transitionFinish;
  const transition = { finished: new Promise((resolve) => { transitionFinish = resolve; }) };
  let transitionCalls = 0;
  let updates = 0;
  let sourceNameAtCapture;
  let targetNameAfterUpdate;
  const document = {};
  if (supported) {
    document.startViewTransition = (update) => {
      transitionCalls += 1;
      sourceNameAtCapture = origen.style.values.get("view-transition-name");
      update();
      targetNameAfterUpdate = destino.style.values.get("view-transition-name");
      return transition;
    };
  }
  const window = { matchMedia: () => ({ matches: reduced }) };
  const actualizar = () => {
    updates += 1;
    dialogo.hidden = dialogHidden;
    return destino;
  };
  const result = runInNewContext(`${transitionSource}\ntransicionarCarta(origen, dialogo, actualizar);`, {
    document,
    window,
    origen,
    dialogo,
    actualizar,
  });

  return {
    clases,
    destino,
    dialogo,
    origen,
    result,
    sourceNameAtCapture,
    targetNameAfterUpdate,
    transition,
    transitionCalls,
    transitionFinish,
    updates,
  };
}

test("the card's shared transition name moves to the detail card and is cleaned afterward", async () => {
  const result = runTransition();

  assert.equal(result.transitionCalls, 1);
  assert.equal(result.updates, 1);
  assert.equal(result.sourceNameAtCapture, "album-card");
  assert.equal(result.targetNameAfterUpdate, "album-card");
  assert.equal(result.result, result.transition);
  assert.equal(result.clases.has("is-view-transition"), true);

  result.transitionFinish();
  await result.transition.finished;
  assert.equal(result.origen.style.values.has("view-transition-name"), false);
  assert.equal(result.destino.style.values.has("view-transition-name"), false);
  assert.equal(result.clases.has("is-view-transition"), true);
});

test("closing the detail removes its transition state after returning to the source card", async () => {
  const result = runTransition({ dialogHidden: true });

  assert.equal(result.sourceNameAtCapture, "album-card");
  assert.equal(result.targetNameAfterUpdate, "album-card");
  result.transitionFinish();
  await result.transition.finished;

  assert.equal(result.dialogo.hidden, true);
  assert.equal(result.clases.has("is-view-transition"), false);
  assert.equal(result.origen.style.values.has("view-transition-name"), false);
  assert.equal(result.destino.style.values.has("view-transition-name"), false);
});

test("reduced motion and unsupported browsers use the normal detail update", () => {
  [runTransition({ reduced: true }), runTransition({ supported: false })].forEach((result) => {
    assert.equal(result.result, null);
    assert.equal(result.transitionCalls, 0);
    assert.equal(result.updates, 1);
    assert.equal(result.clases.has("is-view-transition"), false);
    assert.equal(result.origen.style.values.has("view-transition-name"), false);
  });
});

test("album card clicks pass the source element and opt into the shared-card style", () => {
  assert.match(albumSource, /abrirDetalle\(datos, btn\)/);
  assert.match(albumSource, /transicionarCarta\(origen, detalle, actualizar\)/);
  assert.match(albumSource, /transicionarCarta\(cartaDetalle, detalle, actualizar\)/);
  assert.match(albumHtml, /css\/view-transitions\.css/);
  assert.match(albumStyles, /::view-transition-group\(album-card\)/);
  assert.match(albumStyles, /\.detalle\.is-view-transition \.detalle-caja\s*\{/);
});
