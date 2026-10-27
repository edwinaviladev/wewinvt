# WewinVT — portal del canal de Twitch 🎮

Página web de **wewinvt** hecha 100% con HTML, CSS y JavaScript vanilla.
Sin frameworks, sin build, sin dependencias: abre, edita y despliega.

## Estructura

```
wewinvt/
├── index.html            Inicio: descripción del canal, señal "en vivo" y redes sociales
├── emotes.html           Galería de emotes y fanarts (con lightbox)
├── cartas.html           Sección de cartas: en construcción, no disponible por ahora
├── 404.html              Página de error (la sirven automáticamente GitHub Pages y Cloudflare Pages)
├── favicon.png           Favicon del sitio
├── .gitignore            Ignora old/, cachés de herramientas y basura del sistema
├── robots.txt            Indica el sitemap (dominio wewinvt.com)
├── sitemap.xml           Mapa de páginas para buscadores
├── css/
│   └── styles.css        Hoja de estilos compartida (paleta Tokyo Night)
├── js/
│   ├── data.js           Listas de emotes y fanarts (rutas + alt) y datos del canal
│   ├── main.js           Menú móvil, animaciones de scroll e indicador "en vivo"
│   └── gallery.js        Render de galerías y lightbox (solo en emotes.html)
└── fanarts y emotes/     Carpeta original con las imágenes del canal (emotes/ y fanarts/)
```

## Cómo verlo en local

Cualquiera de estas opciones:

- Abrir `index.html` directamente en el navegador (doble clic).
- Servir la carpeta: `python -m http.server 8000` y visitar `http://localhost:8000`.
- Con Node: `npx serve .`

## Cómo desplegar

### Cloudflare Pages (recomendado, usando wewinvt.com)

1. Sube el proyecto a un repositorio de GitHub/GitLab (incluye **todos** los archivos de la raíz: HTML, css/, js/, favicon.png, robots.txt, sitemap.xml y la carpeta `fanarts y emotes`).
2. En Cloudflare: *Workers & Pages → Create → Pages → Connect to Git* y elige el repositorio.
3. En *Build settings* deja todo en blanco:
   - **Framework preset:** `None`
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
4. Deploy. Cloudflare Pages sirve `404.html` automáticamente en rutas que no existen.
5. En *Custom domains* agrega `wewinvt.com` y `www.wewinvt.com`; Cloudflare administra el DNS con solo apuntar los nameservers del dominio.

### GitHub Pages (alternativa)

1. En *Settings → Pages*, elige la rama (`main`) y la carpeta raíz (`/root`).
2. GitHub Pages también sirve `404.html` automáticamente.
   Todas las referencias son rutas relativas, así que funciona igual en el dominio raíz o en un subdirectorio (`usuario.github.io/wewinvt/`).

## Cómo editar contenido

### Agregar un emote o fanart
1. Copia la imagen a `fanarts y emotes/emotes/` o `fanarts y emotes/fanarts/`.
2. Agrega la entrada correspondiente en `js/data.js` (array `emotes` o `fanarts`):
   - `src`: ruta codificada como URL, sustituyendo los espacios por `%20`.
   - `alt`: descripción breve de la imagen (importante para accesibilidad).
   - `gif: true` (solo emotes animados, agrega el badge "GIF").

### Cambiar las redes sociales
Edita las tarjetas al final de `index.html` (sección `#redes`). Cada una es un
`<a class="social-card">` con su URL y su texto.

### Textos de la página
Todo el texto vive directo en los HTML: título y descripción del canal en
`index.html`, textos de cada página en su propio archivo.

## Cosas útiles de este diseño

- **Indicador "en vivo"**: se consulta la señal pública de Twitch con la API de
  IVR (`api.ivr.fi`, abierta y con CORS) y como respaldo `decapi.me`. Cuando está
  en directo muestra título, juego, espectadores y tiempo en vivo; cachea la
  respuesta 60 segundos para no saturar. No requiere tokens ni backend:
  la versión anterior del portal dependía de un servidor Laravel `/api/stream/status`.

## Créditos

- Emotes y fanarts: comunidad de Wewin. 🎨
- Paleta “Tokyo Night”, heredada de la versión anterior del portal.
