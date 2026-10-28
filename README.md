# WewinVT — portal del canal de Twitch 🎮🍫

Página web de **wewinvt** hecha 100% con HTML, CSS y JavaScript vanilla.
Sin frameworks, sin build, sin dependencias: abre, edita y despliega.

## Estructura

```
wewinvt/
├── index.html            Inicio: hero, "Quién es Wewin", panel "en vivo" con horario,
│                         y redes sociales (incluye Discord, Ko-fi y Streamloots)
├── emotes.html           Galería de emotes y fanarts (lightbox + créditos de artista)
├── cartas.html           Sección de cartas: en construcción (sin enlace en la nav)
├── 404.html              Página de error (la sirven GitHub Pages y Cloudflare Pages)
├── favicon.webp          Favicon del sitio
├── .gitignore            Ignora old/, cachés de herramientas y basura del sistema
├── robots.txt            Indica el sitemap (dominio wewinvt.com)
├── sitemap.xml           Mapa de páginas para buscadores (URLs limpias)
├── css/
│   ├── styles.css        Layout: tarjetas, hero, galerías, lightbox, nuevas secciones
│   └── paleta-chocolate.css  Paleta "Chocolate y playera roja" (se carga después)
├── js/
│   ├── data.js           Datos: emotes, fanarts (con artista/enlace), horario del canal
│   ├── main.js           Menú, animaciones, panel "en vivo" (timeout + respaldo),
│   │                     reproductor de Twitch y tarjeta de horario
│   └── gallery.js        Render de galerías, créditos y lightbox (solo en emotes.html)
├── img/
│   ├── og-wewin.webp     Imagen 1200×630 para compartir en redes
│   ├── emotes/           Emotes optimizados en WebP
│   └── fanarts/          Fanarts optimizados en WebP
└── fanarts y emotes/     Carpeta original con los archivos fuente (respaldo, sin referencias)
```

## Paleta

La paleta activa es **"Chocolate y playera roja"**: cacao oscuro de fondo, crema de texto,
rojo playera para botones y acentos, caramelo para metas, Monster blanco para enlaces.
Definida en `css/paleta-chocolate.css` (se carga después de `styles.css`, que mantiene el layout).
Twitch conserva su morado oficial (`#a970ff`).

## Cómo verlo en local

- Abrir `index.html` directamente en el navegador, o
- Servir la carpeta: `python -m http.server 8000` y visitar `http://localhost:8000`.
- Los enlaces internos son relativos (`index.html`, `emotes.html`): funcionan igual
  en local (file://) que desplegados. Las URLs limpias (`/`, `/emotes`, `/cartas`)
  también responden en producción y ahí apuntan el sitemap y los `canonical`.

## Cómo desplegar

### Cloudflare Pages (recomendado, usando wewinvt.com)

1. Sube el proyecto a un repositorio de GitHub/GitLab (HTML, css/, js/, img/, favicon, robots.txt, sitemap.xml; `old/` y la carpeta fuente quedan fuera del repo por `.gitignore`).
2. En Cloudflare: *Workers & Pages → Create → Pages → Connect to Git* y elige el repositorio.
3. En *Build settings* deja todo en blanco:
   - **Framework preset:** `None`
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
4. Deploy. Cloudflare Pages sirve `404.html` en rutas que no existen y responde
   `https://wewinvt.com/emotes` y `/cartas` directamente.
5. En *Custom domains* agrega `wewinvt.com` y `www.wewinvt.com`.

Si despliegas el Worker con Wrangler y `assets.directory` apunta a la raíz,
`.assetsignore` excluye `.git` del paquete estático.

### GitHub Pages (alternativa)

1. En *Settings → Pages*, elige la rama (`main`) y la carpeta raíz.
   En GH Pages los enlaces `/emotes` requieren que el dominio sea raíz (con `wewinvt.com`).

## Cosas útiles de este diseño

- **Indicador "en vivo"**: consulta la señal pública de Twitch con la API de IVR
  (con tiempo límite de 5 s) y usa `decapi.me` como respaldo. Si el canal está en
  directo, inserta el reproductor de Twitch en el panel. Cachea la respuesta 60 s.
  Cuando la consulta falla, muestra el estado de respaldo con el próximo stream
  según `js/data.js` (si hay horario definido).
- **Horario de streams**:editar `js/data.js → horario`. Si el arreglo de días está
  vacío, la tarjeta no se muestra.
- **Créditos de emotes y fanarts**: campos `artista` y `enlace` en `js/data.js`
  (párrafo bajo la miniatura y autor como enlace en el lightbox); mientras estén
  vacíos, no se muestra crédito (el lightbox muestra la descripción).
- **Imágenes**: las páginas cargan WebP; los emotes animados conservan la animación.
  Los originales se mantienen para poder volver a convertirlos.
- **OG para compartir**: `img/og-wewin.webp` (1200×630) y metadatos Open Graph/Twitter
  con URL absoluta en las tres páginas públicas.

## Créditos

- Avatar (modelo y rig en pixel): **[@Mr_pokati](https://x.com/Mr_pokati)** 🎨
- Overlays y emotes: **@shinyvibes_art** · Emotes: **@VtKairo**
- Fanarts: comunidad de Wewin. 🎨
