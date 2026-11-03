import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker.js";

const BROADCASTER = "523494003";
const CLIENT = "app-test";
const CATALOGO = globalThis.SOBRE_CATALOGO;
const IDS = new Set(CATALOGO.map((c) => c.id));

/* KV falso: Map con get/put/delete */
function kvFalso() {
  const mapa = new Map();
  return {
    mapa,
    get: async (k) => mapa.get(k) ?? null,
    put: async (k, v) => {
      mapa.set(k, v);
    },
    delete: async (k) => {
      mapa.delete(k);
    },
  };
}

/* Twitch falso: "tok-<user_id>" valida; "tok-ajeno" es de otra app */
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), "https://id.twitch.tv/oauth2/validate");
  const token = init.headers.Authorization.replace("OAuth ", "");
  if (token === "tok-ajeno") return Response.json({ user_id: BROADCASTER, client_id: "otra-app" });
  if (token.startsWith("tok-")) return Response.json({ user_id: token.slice(4), client_id: CLIENT });
  return new Response("{}", { status: 401 });
};

let kv;
let env;
beforeEach(() => {
  kv = kvFalso();
  env = { CLIENT_ID: CLIENT, BROADCASTER_ID: BROADCASTER, COLECCIONES: kv };
});

const llamar = (metodo, ruta, { token, cuerpo, crudo, entorno } = {}) =>
  worker.fetch(
    new Request(`https://x.test${ruta}`, {
      method: metodo,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
    }),
    entorno || env
  );
const canje = (cuerpo, token = `tok-${BROADCASTER}`, opts = {}) =>
  llamar("POST", "/api/canje", { token, cuerpo, ...opts });

test("un token que no es del broadcaster recibe 403 aunque envíe su propio id", async () => {
  const res = await canje(
    { broadcasterId: "999", canjeId: "c1", usuarioId: "111", cartas: ["proyectado"] },
    "tok-999"
  );
  assert.equal(res.status, 403);
  assert.equal(kv.mapa.size, 0);
});

test("el broadcaster recibe 3 cartas de grupos distintos y se ignoran las del cliente", async () => {
  const res = await canje({
    canjeId: "c1",
    usuarioId: "111",
    cartas: ["proyectado", "proyectado", "proyectado"],
  });
  assert.equal(res.status, 200);
  const datos = await res.json();
  assert.equal(datos.ok, true);
  assert.equal(datos.cartas.length, 3);
  datos.cartas.forEach((id) => assert.ok(IDS.has(id)));
  const grupos = datos.cartas.map((id) => CATALOGO.find((c) => c.id === id).grupoId);
  assert.equal(new Set(grupos).size, 3);
  const guardada = JSON.parse(kv.mapa.get("coleccion:111"));
  assert.equal(guardada.sobres, 1);
  assert.equal(Object.values(guardada.cartas).reduce((a, b) => a + b, 0), 3);
});

test("repetir el canje devuelve lo mismo sin sumar cartas", async () => {
  const a = await (await canje({ canjeId: "c1", usuarioId: "111" })).json();
  const antes = kv.mapa.get("coleccion:111");
  const b = await (await canje({ canjeId: "c1", usuarioId: "111" })).json();
  assert.deepEqual(b, a);
  assert.equal(kv.mapa.get("coleccion:111"), antes);
});

test("el mismo canjeId con otro usuarioId da 409", async () => {
  await canje({ canjeId: "c1", usuarioId: "111" });
  const res = await canje({ canjeId: "c1", usuarioId: "222" });
  assert.equal(res.status, 409);
  assert.equal(kv.mapa.has("coleccion:222"), false);
});

test("canjeId, usuarioId o JSON inválidos dan 400", async () => {
  const invalidos = [
    { canjeId: "", usuarioId: "111" },
    { canjeId: "a".repeat(129), usuarioId: "111" },
    { canjeId: "con espacio", usuarioId: "111" },
    { canjeId: 5, usuarioId: "111" },
    { usuarioId: "111" },
    { canjeId: "c1", usuarioId: "abc" },
    { canjeId: "c1", usuarioId: "1".repeat(21) },
    { canjeId: "c1", usuarioId: 111 },
    { canjeId: "c1" },
  ];
  for (const cuerpo of invalidos) {
    assert.equal((await canje(cuerpo)).status, 400, JSON.stringify(cuerpo));
  }
  const malJson = await canje(undefined, undefined, { crudo: "{no es json" });
  assert.equal(malJson.status, 400);
  assert.equal(kv.mapa.size, 0);
});

test("sin BROADCASTER_ID o sin CLIENT_ID falla cerrado", async () => {
  const cuerpo = { canjeId: "c1", usuarioId: "111" };
  const sinBroadcaster = await canje(cuerpo, undefined, { entorno: { ...env, BROADCASTER_ID: undefined } });
  assert.equal(sinBroadcaster.status, 500);
  const sinClient = await canje(cuerpo, undefined, { entorno: { ...env, CLIENT_ID: undefined } });
  assert.equal(sinClient.status, 500);
  const lectura = await llamar("GET", "/api/coleccion", {
    token: "tok-111",
    entorno: { ...env, CLIENT_ID: undefined },
  });
  assert.equal(lectura.status, 500);
  assert.equal(kv.mapa.size, 0);
});

test("un token de otra app o sin token da 401", async () => {
  assert.equal((await canje({ canjeId: "c1", usuarioId: "111" }, "tok-ajeno")).status, 401);
  const sinToken = await llamar("POST", "/api/canje", { cuerpo: { canjeId: "c1", usuarioId: "111" } });
  assert.equal(sinToken.status, 401);
  assert.equal((await llamar("GET", "/api/coleccion")).status, 401);
});

test("POST /api/coleccion ya no existe y no escribe", async () => {
  const res = await llamar("POST", "/api/coleccion", {
    token: "tok-111",
    cuerpo: { anadir: ["proyectado"], sobres: 5 },
  });
  assert.equal(res.status, 404);
  assert.equal(kv.mapa.size, 0);
});

test("GET /api/coleccion devuelve solo la del dueño del token", async () => {
  kv.mapa.set("coleccion:111", JSON.stringify({ cartas: { hola: 2 }, sobres: 1 }));
  kv.mapa.set("coleccion:222", JSON.stringify({ cartas: { lupa: 1 }, sobres: 9 }));
  const res = await llamar("GET", "/api/coleccion", { token: "tok-111" });
  assert.deepEqual((await res.json()).coleccion, { cartas: { hola: 2 }, sobres: 1 });
  const vacia = await llamar("GET", "/api/coleccion", { token: "tok-333" });
  assert.deepEqual((await vacia.json()).coleccion, { cartas: {}, sobres: 0 });
});

test("los errores inesperados no filtran el mensaje interno", async () => {
  kv.get = async () => {
    throw new Error("secreto interno");
  };
  const res = await canje({ canjeId: "c1", usuarioId: "111" });
  assert.equal(res.status, 500);
  assert.doesNotMatch(JSON.stringify(await res.json()), /secreto/);
});

test("sobre.html y overlay.html cargan sorteo.js antes de sobre.js", () => {
  for (const pagina of ["sobre.html", "overlay.html"]) {
    const html = readFileSync(new URL(`../${pagina}`, import.meta.url), "utf8");
    const iData = html.indexOf("js/sobre-data.js");
    const iSorteo = html.indexOf("js/sorteo.js");
    const iSobre = html.indexOf("js/sobre.js");
    assert.ok(iData >= 0 && iData < iSorteo && iSorteo < iSobre, pagina);
  }
});
