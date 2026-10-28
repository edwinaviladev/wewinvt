/*
 * Catálogo de cartas del prototipo "Sobre coleccionable".
 * Cada entrada: id, tipo (emote|fanart), src, nombre (en carta), alt, artista, rareza.
 * Rarezas: comun | rara | epica | legendaria (misma paleta del sitio).
 */
window.SOBRE_CATALOGO = [
  /* ---------- Emotes ---------- */
  { id: "lentes-oscuros", tipo: "emote", src: "img/emotes/lentes-oscuros.png", nombre: "Modo cool", alt: "Emote de Wewin con lentes oscuros: modo cool", artista: "skyshinez_", rareza: "comun" },
  { id: "angustia", tipo: "emote", src: "img/emotes/angustia.png", nombre: "Angustia", alt: "Emote de Wewin llorando de angustia", artista: "skyshinez_", rareza: "comun" },
  { id: "mirada-vacia", tipo: "emote", src: "img/emotes/mirada-vacia.png", nombre: "Mirada vacía", alt: "Emote de Wewin con mirada vacía de sorpresa", artista: "skyshinez_", rareza: "comun" },
  { id: "durmiendo", tipo: "emote", src: "img/emotes/durmiendo.png", nombre: "Modo siesta", alt: "Emote de Wewin durmiendo plácidamente", artista: "skyshinez_", rareza: "comun" },
  { id: "angel-halo", tipo: "emote", src: "img/emotes/angel-halo.png", nombre: "Angelito", alt: "Emote angelical de Wewin con halo y alitas", artista: "skyshinez_", rareza: "epica" },
  { id: "fiesta-confeti", tipo: "emote", src: "img/emotes/fiesta-confeti.png", nombre: "¡Fiesta!", alt: "Emote de fiesta de Wewin con gafas de neón y confeti", artista: "skyshinez_", rareza: "rara" },
  { id: "ojitos-suplica", tipo: "emote", src: "img/emotes/ojitos-suplica.png", nombre: "Ojitos", alt: "Emote de Wewin con ojitos brillantes de súplica", artista: "skyshinez_", rareza: "rara" },
  { id: "headpat", tipo: "emote", src: "img/emotes/headpat.png", nombre: "Headpat", alt: "Emote de cariño: mano acariciando la cabeza de Wewin", artista: "skyshinez_", rareza: "comun" },
  { id: "uno-inversa", tipo: "emote", src: "img/emotes/uno-inversa.png", nombre: "UNO: Inversa", alt: "Emote de Wewin mostrando una carta Uno invertida", artista: "skyshinez_", rareza: "rara" },
  { id: "ojitos-lagrimas", tipo: "emote", src: "img/emotes/ojitos-lagrimas.png", nombre: "Lagrijitos", alt: "Emote de Wewin con ojitos de súplica y lágrimas", artista: "skyshinez_", rareza: "comun" },
  { id: "lupa", tipo: "emote", src: "img/emotes/lupa.png", nombre: "Detective", alt: "Emote de Wewin investigando con una lupa", artista: "skyshinez_", rareza: "comun" },
  { id: "spinner-pensando", tipo: "emote", src: "img/emotes/spinner-pensando.png", nombre: "Pensando…", alt: "Emote de Wewin pensando con spinner sobre los ojos", artista: "skyshinez_", rareza: "comun" },
  { id: "asomandose", tipo: "emote", src: "img/emotes/asomandose.png", nombre: "Asomándose", alt: "Emote de Wewin asomándose tímidamente tras una pared", artista: "skyshinez_", rareza: "comun" },
  { id: "risa", tipo: "emote", src: "img/emotes/risa.png", nombre: "Risita", alt: "Emote de Wewin riendo con ganas", artista: "vtkairo", rareza: "comun" },
  { id: "bonk", tipo: "emote", src: "img/emotes/bonk.png", nombre: "¡BONK!", alt: "Emote bonk: un bate golpeando a Wewin", artista: "vtkairo", rareza: "rara" },
  { id: "sonrojo-corazon", tipo: "emote", src: "img/emotes/sonrojo-corazon.png", nombre: "Sonrojo", alt: "Emote de Wewin sonrojado con manitas y corazón", artista: "vtkairo", rareza: "comun" },
  { id: "pensar-sonrojo", tipo: "emote", src: "img/emotes/pensar-sonrojo.gif", nombre: "Pensar sonrojado", alt: "Emote animado de Wewin: de pensar a sonrojo", artista: "skyshinez_", rareza: "comun" },
  { id: "gran-corazon", tipo: "emote", src: "img/emotes/gran-corazon.png", nombre: "Gran corazón", alt: "Emote de Wewin mostrando un gran corazón", artista: "vtkairo", rareza: "legendaria" },
  { id: "diablito-halloween", tipo: "emote", src: "img/emotes/diablito-halloween.png", nombre: "Diablito", alt: "Emote de mini diablito con cuernos de Halloween", artista: "frozenyogurt02", rareza: "epica" },
  { id: "hola", tipo: "emote", src: "img/emotes/hola.png", nombre: "¡Hola!", alt: "Emote de Wewin saludando (hi)", artista: "vtkairo", rareza: "comun" },
  { id: "caballero-hueco", tipo: "emote", src: "img/emotes/caballero-hueco.png", nombre: "Caballero hueco", alt: "Emote del caballero hueco de Hollow Knight llorando", artista: "frozenyogurt02", rareza: "legendaria" },
  { id: "waos-botella", tipo: "emote", src: "img/emotes/waos-botella.png", nombre: "Waos", alt: "Emote de Wewin con una botella de WAOS", artista: "vtkairo", rareza: "comun" },
  { id: "abrazo", tipo: "emote", src: "img/emotes/abrazo.png", nombre: "Abrazo", alt: "Emote de Wewin pidiendo un abrazo con manitas y lentes enormes", artista: "skyshinez_", rareza: "rara" },
  { id: "gordinflon", tipo: "emote", src: "img/emotes/gordinflon.gif", nombre: "Gordinflón", alt: "Emote animado del Wewin gordinflón flotando con calma", artista: "skyshinez_", rareza: "rara" },

  /* ---------- Fanarts ---------- */
  { id: "templo-hollow-knight", tipo: "fanart", src: "img/fanarts/templo-hollow-knight.png", nombre: "Templo hueco", alt: "Fanart de Wewin dentro de un templo estilo Hollow Knight", artista: "darklobo117", rareza: "epica" },
  { id: "criaturas-nocturnas", tipo: "fanart", src: "img/fanarts/criaturas-nocturnas.png", nombre: "Criaturas nocturnas", alt: "Dibujo de tres personajes jugando criaturas en una escena nocturna", artista: "vtkairo", rareza: "rara" },
  { id: "pongan-bachata", tipo: "fanart", src: "img/fanarts/pongan-bachata.png", nombre: "¡Pongan bachata!", alt: "Fanart: Wewin bailando con la frase «Pongan Bachata»", artista: "ryonikku", rareza: "rara" },
  { id: "comic-comunidad", tipo: "fanart", src: "img/fanarts/comic-comunidad.png", nombre: "Cómic de la comunidad", alt: "Cómic de la comunidad: conversación entre amigos", artista: "eclipsenoctis", rareza: "epica" },
  { id: "batalla-pokemon", tipo: "fanart", src: "img/fanarts/batalla-pokemon.jpg", nombre: "Batalla legendaria", alt: "Fanart de una batalla legendaria de Pokémon", artista: "daggercrosstv", rareza: "epica" },
  { id: "boceto-tinta-chibi", tipo: "fanart", src: "img/fanarts/boceto-tinta-chibi.jpeg", nombre: "Boceto a tinta", alt: "Boceto a tinta de dos personajes chibi", artista: "vtkairo", rareza: "comun" },
  { id: "retrato-pintado", tipo: "fanart", src: "img/fanarts/retrato-pintado.jpg", nombre: "Retrato pintado", alt: "Retrato pintado de Wewin con playera roja", artista: "vtkairo", rareza: "legendaria" },
  { id: "peluche-wewin", tipo: "fanart", src: "img/fanarts/peluche-wewin.png", nombre: "Peluche Wewin", alt: "Fanart estilo peluche de Wewin sentado", artista: "eclipsenoctis", rareza: "legendaria" },
  { id: "corbata-roja", tipo: "fanart", src: "img/fanarts/corbata-roja.png", nombre: "Corbata roja", alt: "Ilustración anime de Wewin acomodando una corbata roja", artista: "arandaidai", rareza: "rara" },
  { id: "boceto-lapiz", tipo: "fanart", src: "img/fanarts/boceto-lapiz.jpg", nombre: "Boceto a lápiz", alt: "Boceto a lápiz de un retrato hecho por la comunidad", artista: "koru", rareza: "comun" },
  { id: "pixel-guerrero", tipo: "fanart", src: "img/fanarts/pixel-guerrero.png", nombre: "Guerrero pixel", alt: "Pixel art de guerrero con espada (fanart)", artista: "loki_vt_", rareza: "rara" },
  { id: "poster-rincon-chisme", tipo: "fanart", src: "img/fanarts/poster-rincon-chisme.png", nombre: "Rincón del chisme", alt: "Póster de «Rincón del chisme» by @wewinvt", artista: "frozenyogurt02", rareza: "epica" },
  { id: "wechi-bebe", tipo: "fanart", src: "img/fanarts/wechi-bebe.png", nombre: "Wechi bebé", alt: "Wechi bebé: mascota cariñosa con su juguete", artista: "andromeda_vte", rareza: "rara" },
  { id: "dino-pijama", tipo: "fanart", src: "img/fanarts/dino-pijama.png", nombre: "Dino de pijama", alt: "Fanart de Wewin con pijama de dinosaurio", artista: "cosmic_alexs", rareza: "rara" },
  { id: "cumpleanos-pixel", tipo: "fanart", src: "img/fanarts/cumpleanos-pixel.png", nombre: "Cumpleaños pixel", alt: "Fanart pixel art de cumpleaños de Wewin con chibis de Red, Goku, Luffy y Edward", artista: "Josswarz", rareza: "epica" },
];
