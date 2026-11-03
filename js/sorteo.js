/*
 * Sorteo de un sobre (3 cartas sin repetir grupo).
 * Script clásico compartido por el navegador (demo /sobre, overlay) y el
 * Worker (donde se sortean los canjes reales). Expone globalThis.SOBRE_SORTEO.
 * Los pesos viven SOLO aquí; sobre.js conserva los datos de presentación.
 */
(() => {
  "use strict";

  const ORDEN = ["comun", "rara", "epica", "legendaria"];
  const PESOS_RAREZA = { comun: 55, rara: 25, epica: 15, legendaria: 5 };
  /* El tercer sobre garantiza Rara o mejor (estilo TCGP) */
  const PESOS_SLOT3 = { comun: 0, rara: 70, epica: 22, legendaria: 8 };

  function crearAzar(random) {
    const rollPeso = (pesos) => {
      const total = Object.values(pesos).reduce((a, b) => a + b, 0);
      let r = random() * total;
      for (const [clave, peso] of Object.entries(pesos)) {
        r -= peso;
        if (r <= 0) return clave;
      }
      return Object.keys(pesos).at(-1);
    };
    const elegir = (lista) => lista[Math.floor(random() * lista.length)];
    return { rollPeso, elegir };
  }

  /* Devuelve 3 entradas del catálogo. `forzado`: "" | rara | epica | legendaria */
  function construirCartas(catalogo, { forzado = "", random = Math.random } = {}) {
    const { rollPeso, elegir } = crearAzar(random);
    const usadas = new Set();
    const cartas = [];
    const cartasBase = catalogo.filter((c) => !c.variante || c.variante === "base");
    const grupoDe = (carta) => carta.grupoId || carta.id;

    for (let i = 0; i < 3; i++) {
      let tier;
      if (i === 2) {
        if (forzado) tier = forzado;
        else if (random() < 0.08) tier = rollPeso({ rara: 1, epica: 2, legendaria: 1 });
        else tier = rollPeso(PESOS_SLOT3);
      } else {
        tier = rollPeso(PESOS_RAREZA);
      }

      const sinRepetir = (lista) => lista.filter((c) => !usadas.has(grupoDe(c)));
      let pool = sinRepetir(cartasBase.filter((c) => c.rareza === tier));
      if (!pool.length) pool = sinRepetir(cartasBase.filter((c) => ORDEN.indexOf(c.rareza) >= ORDEN.indexOf(tier)));
      if (!pool.length) pool = sinRepetir(cartasBase);

      const cartaBase = elegir(pool);
      const grupoId = grupoDe(cartaBase);
      const variantes = catalogo.filter((c) => grupoDe(c) === grupoId && c.rareza === cartaBase.rareza);
      const pesosVariantes = Object.fromEntries(variantes.map((c) => [
        c.id,
        c.pesoVariante ?? (!c.variante || c.variante === "base" ? 100 : 0),
      ]));
      const idVariante = rollPeso(pesosVariantes);
      const carta = variantes.find((c) => c.id === idVariante) || cartaBase;

      usadas.add(grupoId);
      cartas.push(carta);
    }
    return cartas;
  }

  globalThis.SOBRE_SORTEO = { construirCartas };
})();
