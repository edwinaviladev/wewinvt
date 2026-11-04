import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";

const dataSource = readFileSync(new URL("../js/data.js", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const start = mainSource.indexOf("  function partesFechaEnZona(fecha, zona) {");
const end = mainSource.indexOf("  function proximoStreamTexto() {", start);
assert.ok(start >= 0 && end > start, "timezone helpers should be present in main.js");
const timezoneHelpers = mainSource.slice(start, end);
const remate = "Si pasa de esa hora… probablemente ya no prendí. 🔌";

function lineasEnZona(zona, ahora) {
  const script = `${dataSource}\nvar horario = window.WEWIN.horario;\n${timezoneHelpers}\nlineasHorario(${JSON.stringify(zona)}, new Date(${JSON.stringify(ahora)}));`;
  return Array.from(runInNewContext(script, { window: {} }));
}

function listaHoras(horas) {
  return horas.slice(0, -1).join(", ") + " o " + horas[horas.length - 1];
}

function formatoHoras(zona, fechas) {
  const formato = new Intl.DateTimeFormat("es-MX", { timeZone: zona, hour: "numeric", minute: "2-digit" });
  return listaHoras(fechas.map((fecha) => formato.format(new Date(fecha))));
}

test("afternoon stream hours convert correctly across winter and summer offsets", () => {
  const invierno = lineasEnZona("America/Los_Angeles", "2026-01-15T12:00:00Z");
  const verano = lineasEnZona("America/Los_Angeles", "2026-07-15T12:00:00Z");
  const fechasMexico = ["2026-01-15T23:00:00Z", "2026-01-16T00:00:00Z", "2026-01-16T01:00:00Z"];
  const fechasMexicoVerano = ["2026-07-15T23:00:00Z", "2026-07-16T00:00:00Z", "2026-07-16T01:00:00Z"];

  assert.equal(invierno[0], `Todos los días, entre ${formatoHoras("America/Mexico_City", fechasMexico)} (hora de México)`);
  assert.equal(invierno[1], `En tu hora local: ${formatoHoras("America/Los_Angeles", fechasMexico)}`);
  assert.equal(verano[1], `En tu hora local: ${formatoHoras("America/Los_Angeles", fechasMexicoVerano)}`);
  assert.equal(invierno[2], remate);
  assert.equal(verano[2], remate);
});

test("visitors in Mexico see one schedule, not a duplicate conversion", () => {
  const lines = lineasEnZona("America/Mexico_City", "2026-01-15T12:00:00Z");

  assert.equal(lines.length, 2);
  assert.match(lines[0], /5:00.*6:00.*7:00/);
  assert.equal(lines[1], remate);
});
