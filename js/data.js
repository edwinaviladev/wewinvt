/**
 * WewinVT — datos del sitio (vanilla JS, sin framework).
 * Las imágenes viven en img/ (nombres en minúsculas, sin espacios ni acentos).
 * Las carpetas originales quedan en "fanarts y emotes/" como respaldo.
 */

window.WEWIN = {
  channel: "wewinvt",
  twitchUrl: "https://www.twitch.tv/wewinvt",

  /**
   * Horario de streams.
   * TODO: si Wewin define un horario fijo de días/horas, usar la lista `dias`.
   */
  horario: {
    zona: "hora de México",
    dias: [
      // { dia: 'Martes', hora: '20:00' },
    ],
    texto:
      "Entre 5, 6 o 7 de la tarde (hora de México), todos los días. Si pasa de esa hora… probablemente ya no prendí. 🔌",
  },

  /** Emotes del canal */
  emotes: [
    {
      src: "img/emotes/lentes-oscuros.webp",
      alt: "Emote de Wewin con lentes oscuros: modo cool",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/angustia.webp",
      alt: "Emote de Wewin llorando de angustia",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/mirada-vacia.webp",
      alt: "Emote de Wewin con mirada vacía de sorpresa",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/durmiendo.webp",
      alt: "Emote de Wewin durmiendo plácidamente",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/angel-halo.webp",
      alt: "Emote angelical de Wewin con halo y alitas",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/fiesta-confeti.webp",
      alt: "Emote de fiesta de Wewin con gafas de neón y confeti",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/ojitos-suplica.webp",
      alt: "Emote de Wewin con ojitos brillantes de súplica",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/headpat.webp",
      alt: "Emote de cariño: mano acariciando la cabeza de Wewin",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/uno-inversa.webp",
      alt: "Emote de Wewin mostrando una carta Uno invertida",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/ojitos-lagrimas.webp",
      alt: "Emote de Wewin con ojitos de súplica y lágrimas",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/lupa.webp",
      alt: "Emote de Wewin investigando con una lupa",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/spinner-pensando.webp",
      alt: "Emote de Wewin pensando con spinner sobre los ojos",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/asomandose.webp",
      alt: "Emote de Wewin asomándose tímidamente tras una pared",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/risa.webp",
      alt: "Emote de Wewin riendo con ganas",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/bonk.webp",
      alt: "Emote bonk: un bate golpeando a Wewin",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/sonrojo-corazon.webp",
      alt: "Emote de Wewin sonrojado con manitas y corazón",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/pensar-sonrojo.webp",
      alt: "Emote animado de Wewin: de pensar a sonrojo",
      animada: true,
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/gran-corazon.webp",
      alt: "Emote de Wewin mostrando un gran corazón",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/diablito-halloween.webp",
      alt: "Emote de mini diablito con cuernos de Halloween",
      artista: "frozenyogurt02",
      enlace: "https://www.twitch.tv/frozenyogurt02",
    },
    {
      src: "img/emotes/hola.webp",
      alt: "Emote de Wewin saludando (hi)",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/caballero-hueco.webp",
      alt: "Emote del caballero hueco de Hollow Knight llorando",
      artista: "frozenyogurt02",
      enlace: "https://www.twitch.tv/frozenyogurt02",
    },
    {
      src: "img/emotes/waos-botella.webp",
      alt: "Emote de Wewin con una botella de WAOS",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/emotes/abrazo.webp",
      alt: "Emote de Wewin de cuerpo completo con manitas y lentes enormes pidiendo un abrazo",
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
    {
      src: "img/emotes/gordinflon.webp",
      alt: "Emote animado del Wewin gordinflón: flotando con la mayor calma posible",
      animada: true,
      artista: "skyshinez_",
      enlace: "https://www.instagram.com/skyshinez_/",
    },
  ],

  /**
   * Fanarts hechos por la comunidad.
   * TODO: completar artista y enlace de cada pieza (preguntar en el Discord de fanarts).
   */
  fanarts: [
    {
      src: "img/fanarts/templo-hollow-knight.webp",
      alt: "Fanart de Wewin dentro de un templo estilo Hollow Knight",
      artista: "darklobo117",
      enlace: "https://www.twitch.tv/darklobo117",
    },
    {
      src: "img/fanarts/criaturas-nocturnas.webp",
      alt: "Dibujo de tres personajes jugando criaturas en una escena nocturna",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/fanarts/pongan-bachata.webp",
      alt: "Fanart: Wewin bailando con la frase «Pongan Bachata»",
      artista: "ryonikku",
      enlace: "https://www.twitch.tv/ryonikku",
    },
    {
      src: "img/fanarts/comic-comunidad.webp",
      alt: "Cómic de la comunidad: conversación entre amigos",
      artista: "eclipsenoctis",
      enlace: "https://www.twitch.tv/eclipsenoctis",
    },
    {
      src: "img/fanarts/batalla-pokemon.webp",
      alt: "Fanart de una batalla legendaria de Pokémon",
      artista: "daggercrosstv",
      enlace: "https://www.twitch.tv/daggercrosstv",
    },
    {
      src: "img/fanarts/boceto-tinta-chibi.webp",
      alt: "Boceto a tinta de dos personajes chibi",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/fanarts/retrato-pintado.webp",
      alt: "Retrato pintado de Wewin con playera roja",
      artista: "vtkairo",
      enlace: "https://www.twitch.tv/vtkairo",
    },
    {
      src: "img/fanarts/peluche-wewin.webp",
      alt: "Fanart estilo peluche de Wewin sentado",
      artista: "eclipsenoctis",
      enlace: "https://www.twitch.tv/eclipsenoctis",
    },
    {
      src: "img/fanarts/corbata-roja.webp",
      alt: "Ilustración anime de Wewin acomodando una corbata roja",
      artista: "arandaidai",
      enlace: "https://www.instagram.com/arandaidai/",
    },
    {
      src: "img/fanarts/boceto-lapiz.webp",
      alt: "Boceto a lápiz de un retrato hecho por la comunidad",
      artista: "koru",
      enlace: "",
    },
    {
      src: "img/fanarts/pixel-guerrero.webp",
      alt: "Pixel art de guerrero con espada (fanart)",
      artista: "loki_vt_",
      enlace: "https://www.twitch.tv/loki_vt_",
    },
    {
      src: "img/fanarts/poster-rincon-chisme.webp",
      alt: "Póster de «Rincón del chisme» by @wewinvt",
      artista: "frozenyogurt02",
      enlace: "https://www.twitch.tv/frozenyogurt02",
    },
    {
      src: "img/fanarts/wechi-bebe.webp",
      alt: "Wechi bebé: mascota cariñosa con su juguete",
      artista: "andromeda_vte",
      enlace: "https://www.twitch.tv/andromeda_vte",
    },
    {
      src: "img/fanarts/dino-pijama.webp",
      alt: "Fanart de Wewin con pijama de dinosaurio",
      artista: "cosmic_alexs",
      enlace: "https://www.twitch.tv/cosmic_alexs",
    },
    {
      src: "img/fanarts/cumpleanos-pixel.webp",
      alt: "Fanart pixel art de cumpleaños de Wewin: «Pongan bachata» con chibis de Red, Goku, Luffy y Edward",
      artista: "Josswarz",
      enlace: "",
    },
  ],
};
