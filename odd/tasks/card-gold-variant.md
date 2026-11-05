# Card Gold variant

File locator: `odd/tasks/card-gold-variant.md`. Engram mirror: `odd/card-gold-variant/tasks`.

## Objective
Add a collectible Gold variant, rarer than Holo, with a premium black lacquer and gold look and its own reveal moment.

## Problem and why
Holo is the only special variant. The user wants a premium tier, approved the look in a working mockup, and approved a 2% chance.

## Scope and constraints
- Every card gets a Gold version: base 88, Holo 10, Gold 2 per card. Holo keeps its 10%.
- Gold entries go last in the catalog, because the card number comes from `catalogo.indexOf` and interleaving would renumber existing cards. Existing ids do not change.
- Legendaria is already golden, so Gold must stay clearly different: black lacquer plates, liquid gold frame, art deco pattern.
- Rarity stays legible: stars keep their count and rarity color.
- Motion moves with `transform` only, on the existing tilt engine. Twinkle runs only on active cards. `prefers-reduced-motion` turns decorative motion off.
- Out of scope: the "Variantes Holo" showcase in Novedades, and pack odds per rarity.
- Vanilla CSS and JS with no dependencies. UI strings in the project's Spanish.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Branch `feat/card-gold-variant`, stacked on `feat/site-dark-palette` so that pull request stays separate.
- Delivery: `single-pr`. Forecast is about 300 authored lines. Push, pull request and merge remain the user's decisions.

## Tasks
- [x] T1 `js/sobre-data.js`, `js/carta.js`, `css/sobre.css`, `css/album.css`, tests: Gold catalog entries and card look. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 `js/sobre.js`, `js/album.js`, `css/sobre.css`, tests: Gold sways like Holo and has its own reveal effect. Route: delegated, same writer.
- [x] T3 Verify in a browser: `/album` Gold tab, `/sobre` reveal, `/overlay`, phone width. Route: inline. Reduced motion is covered by tests and a CSS readback only, not by a live emulation.

## Acceptance criteria
- The catalog holds one Gold entry per card, all after the existing entries, and existing cards keep their ids and numbers.
- Variant weights per card are 88, 10 and 2.
- `/album` shows a Gold tab with no album-specific code for it.
- Gold cards show the gold frame, plates, foil, pattern and glints on emotes and fanarts of all four rarities, and read differently from a base Legendaria.
- Revealing a Gold card in `/sobre` plays the light sweep, gold dust and ribbon. Other cards reveal as before.
- With reduced motion there is no twinkle, sweep or dust, and the card stays legible.

## Checks
`node --test test/*.test.mjs`, plus the T3 browser walk.

## Progress and evidence
- T1 `b3f60f7`: 120 catalog entries with one Gold per card after every existing entry; weights 88/10/2; `.album-seccion .card[data-variante="gold"]` keeps the glow in the album. `node --test test/*.test.mjs`: 138 pass, 0 fail.
- T2 `324c400`: `CartaWewin.esEspecial` replaces the Holo sway checks; `efectosGold` adds the sweep, dust and ribbon. Epic and Legendary ribbons read `¡Épica Gold!` and `¡Legendaria Gold!` instead of the plain rarity ribbon. Long ribbon text gets a smaller font. 145 pass, 0 fail, rerun by the parent.
- T3 local browser with forced draws, using `/album`, `/sobre` and `/overlay` from a static server without `/api`:
  - `/album`: tabs read Normales 0/40, Holo 0/40, Gold 40/40; the Gold glow is applied; no horizontal overflow at desktop or 375px.
  - `/sobre`: Gold cards flip, `is-barrido` is applied, and the ribbon reads `¡Legendaria Gold!`. At 375px the ribbon text fits at 26px with no overflow.
  - `/overlay`: the simulated redemption shows Gold cards one by one with the ribbon, and its text settles centered.
- Reduced motion: unit tests cover no dust with the ribbon kept, and `css/sobre.css` hides glints and sweep. Not emulated live, because the browser tool cannot set that preference.
- Not checked: real phone performance of the `color-dodge` layers, and draws through the deployed worker.

- Native review over `3bac0e2..f619b91`: granted, one reliability lens, approved, acknowledged. Three non-blocking findings:
  - Glint delays lost the cascade, so all four twinkled together. Confirmed and fixed after the review.
  - Rarity sparks under reduced motion: dismissed, because `Chispas.emitir` already returns early when `REDUCED` is set (`js/sobre.js:413`).
  - Gold markup had no repeatable test: added one. The reveal call sites still rely on the browser walk.

## Next step
User decides on push and pull request.
