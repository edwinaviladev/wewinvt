# Site dark palette

File locator: `odd/tasks/site-dark-palette.md`. Engram mirror: `odd/site-dark-palette/tasks`.

## Objective
Use one dark palette across the public site, based on the `/album` dark showcase.

## Problem and why
Three palettes coexist: cream on home, gallery, artists and 404; charcoal on `/album` under a cream header; black and red on `/sobre`. The user wants a single identity and chose dark for the whole site.

## Scope and constraints
- In scope: `index.html`, `emotes.html`, `artistas.html`, `album.html`, `404.html`, `sobre.html`, including the site header and footer.
- Out of scope: `overlay.html` and `overlay-config.html`, which look exactly as they do today. Both load `css/sobre.css`.
- Card artwork and revealed card faces do not change. The pack, card effects and rarity colors on `/sobre` keep their look; only the page palette changes.
- Palette source: `#1f1d1b` page, `#2a2724` surface, `#3d3935` hairline, `#8a8279` control border, `#f5f0e8` text, `#b5ada2` muted, `#d4635b` accent, `#e8857e` accent text, `#1f1d1b` on accent.
- Fanarts and emotes keep a light mat behind them, because transparent art with black lines would disappear on charcoal.
- Vanilla CSS with no dependencies. CSP in `_headers` blocks inline handlers and scripts; `node --test` enforces it.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Branch `feat/site-dark-palette`, stacked on `feat/album-variant-tabs` so the album pull request stays separate.
- Delivery: `single-pr`, chosen because the change is one coherent restyle mostly in CSS. Forecast is about 400 authored lines.
- Push, pull request and merge remain the user's decisions.

## Tasks
- [ ] T1 `css/paleta-editorial.css`, `css/album.css`, tests: one source of palette tokens, dark by default, with `/album` reading from it. Route: delegated (writer trigger, 2+ non-trivial files).
- [ ] T2 `css/styles.css`, `css/paleta-editorial.css`, `css/home-cards.css`, `css/gallery-filters.css`, `css/artistas.css`, page metas: home, gallery, artists, 404, header and footer. Route: delegated, same writer.
- [ ] T3 `sobre.html`, `css/sobre.css`, tests: `/sobre` page palette, leaving both overlay pages untouched. Route: delegated, same writer.
- [ ] T4 Verify every page in a browser at desktop and phone widths, including contrast and the overlay pages. Route: inline.

## Acceptance criteria
- Every in-scope page uses the same page, surface, text and accent colors, including its header and footer, and no cream area remains except art mats.
- Text meets WCAG AA (4.5:1) and control borders and focus rings meet 3:1 on every in-scope page.
- Emotes, fanarts and the header logo stay clearly visible.
- `overlay.html` and `overlay-config.html` render with the same computed colors as before.
- `theme-color` matches the page on all in-scope pages.
- No horizontal overflow at 375px on any in-scope page.

## Checks
`node --test test/*.test.mjs`, plus a browser walk of all pages at both widths with a computed contrast audit.

## Progress and evidence
None yet.

## Next step
T1.
