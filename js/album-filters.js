window.AlbumFilters = (() => {
  "use strict";

  const CONJUNTO_DEFAULT = { id: "serie-1", nombre: "Serie 1" };

  function filtrar(cartas, filtros, obtenida) {
    const opciones = filtros || {};
    const rareza = opciones.rareza || "all";
    const soloFaltantes = Boolean(opciones.soloFaltantes);
    const tieneCarta = typeof obtenida === "function" ? obtenida : () => false;

    return cartas.filter((carta) => {
      if (rareza !== "all" && carta.rareza !== rareza) return false;
      return !soloFaltantes || !tieneCarta(carta.id);
    });
  }

  function progresoPorConjunto(cartas, obtenida) {
    const tieneCarta = typeof obtenida === "function" ? obtenida : () => false;
    const progreso = new Map();

    cartas.forEach((carta) => {
      const conjunto = carta.conjunto || CONJUNTO_DEFAULT;
      const id = conjunto.id || CONJUNTO_DEFAULT.id;
      const nombre = conjunto.nombre || id;
      let resumen = progreso.get(id);
      if (!resumen) {
        resumen = { id, nombre, total: 0, obtenidas: 0 };
        progreso.set(id, resumen);
      }
      resumen.total += 1;
      if (tieneCarta(carta.id)) resumen.obtenidas += 1;
    });

    return [...progreso.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  return { filtrar, progresoPorConjunto };
})();
