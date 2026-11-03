(() => {
  "use strict";

  const container = document.querySelector("[data-home-cards]");
  const catalog = window.SOBRE_CATALOGO;
  const cards = window.CartaWewin;
  if (!container || !Array.isArray(catalog) || !cards) return;

  const destacados = ["lentes-oscuros", "comic-comunidad", "proyectado"].map((id) =>
    catalog.find((carta) => carta.id === id)
  );
  if (destacados.some((carta) => !carta)) return;

  destacados.forEach((datos) => {
    const carta = cards.crearCarta(datos, { soloFrente: true, plana: true });
    carta.setAttribute("aria-label", `Ver en el álbum: ${cards.etiquetaCarta(datos)}`);
    carta.addEventListener("click", () => {
      window.location.href = "album.html";
    });
    container.appendChild(carta);
  });
})();
