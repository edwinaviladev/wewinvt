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
- [x] T1 `css/paleta-editorial.css`, `css/album.css`, tests: one source of palette tokens, dark by default, with `/album` reading from it. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 `css/styles.css`, `css/paleta-editorial.css`, `css/home-cards.css`, `css/gallery-filters.css`, `css/artistas.css`, page metas: home, gallery, artists, 404, header and footer. Route: delegated, same writer.
- [x] T3 `sobre.html`, `css/sobre.css`, tests: `/sobre` page palette, leaving both overlay pages untouched. Route: delegated, same writer.
- [x] T4 Verify every page in a browser at desktop and phone widths, including contrast and the overlay pages. Route: inline.

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
- T1 `a0cd58a`: tokens in `css/paleta-editorial.css` are the single source (added control, accent-text, on-accent, surface-hover, art-mat); `/album` aliases point at them; cream-header workaround removed; duplicate color tokens removed from `css/styles.css`. `node --test test/*.test.mjs`: 123 pass, 0 fail.
- T2 `3e2b219`: home, gallery, artists, 404, header and footer on tokens; art mats on logo, avatar, home gallery, emote and fanart tiles, lightbox image, artist works and 404 emote; `theme-color` #1F1D1B on five pages. 126 pass, 0 fail.
- T3 `c56a9eb`: `body.sobre-page` plus a scoped palette block in `css/sobre.css` (no `paleta-editorial.css` load, so fonts and layout stay); `theme-color` updated; overlay pages guarded by tests. 128 pass, 0 fail.
- T4 local browser, 1280px and 375px, on index, emotes, artistas, album and 404: `#1f1d1b` page and header; every text style outside the cards measures at least 4.5:1; no horizontal overflow; no broken images. The only light areas left are art mats, the skip link and small rarity markers.
- T4 `/sobre`: charcoal gradient page with the pack unchanged and no overflow. The audit's four low ratios there were false positives, since it compares against white when the background is a gradient; these colors measure about 7.5:1 on the page color.
- T4 overlays: `css/sobre.css` only gained `body.sobre-page` rules, with no lines removed. `overlay.html` and `overlay-config.html` keep `#100b0a`, `--bg` `#120c0d` and `--rojo` `#d3142f`, and no HTML or JS changed there.
- T4 also checked: lightbox mat, mobile menu with a real tap, and 404 emote mat.
- Returning browsers can see the old palette until cached CSS expires, as happened locally; `/css/*` has a 10-minute `max-age` in production.
- Review over `f3fdebe..65b8fdb`: medium risk, user granted consent, reliability lens approved with no blocker. Its three test suggestions are added to `test/site-palette.test.mjs`: the `/sobre` palette copy matches the shared tokens, legacy aliases resolve on every page using `css/styles.css`, and the light color guard scans `css/styles.css`. 130 pass; six deliberate breakages each fail the suite.
- Not verified: hover states by eye, the full pack opening on `/sobre`, real touch devices, production. Tiles show their light mat while lazy images load.

## Next step
The user decides on push and pull request.
