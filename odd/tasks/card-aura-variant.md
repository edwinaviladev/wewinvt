# Card Aura variant

File locator: `odd/tasks/card-aura-variant.md`. Engram mirror: `odd/card-aura-variant/tasks`.

## Objective
Add a collectible Aura variant: energy that comes out of the card, colored by rarity, with its own reveal moment.

## Problem and why
Holo and Gold change the card surface. The user wants a variant that shows energy around each card, and approved the look in a working prototype using the real card code and art.

## Scope and constraints
- Every card gets an Aura version. Weights per card: base 84, Holo 10, Aura 4, Gold 2. Holo and Gold keep their odds; Aura comes out of base.
- Aura entries go last in the catalog, after Gold, because the card number comes from `catalogo.indexOf`. Existing ids and numbers do not change. The catalog grows from 120 to 160.
- All four rarities get the full strong effect (user decision): halo, border ring, two flame layers, 12 embers, burst. Rarity reads through color, stars and ribbon, not through intensity.
- Colors: comun icy white `#bcdcff` / `#ffffff` (user approved, it no longer matches the site's beige Common), rara `#34e6c0` / `#dcfff6`, epica `#a764ff` / `#f1e4ff`, legendaria `#ff8a2c` / `#fff0b8`.
- Flames and embers run only on `.is-viva` cards; at rest the halo and ring stay still. `prefers-reduced-motion` shows a still halo and ring only. No live SVG filters per frame.
- `@keyframes aura` already exists for the pre-reveal charge, so Aura keyframes use other names.
- Out of scope: the "Variantes Holo" showcase in Novedades, and pack odds per rarity.
- Vanilla CSS and JS with no dependencies. UI strings in the project's Spanish.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Branch `feat/card-aura-variant`, stacked on `feat/card-gold-variant`, which is not merged yet.
- Delivery: `single-pr`. Forecast is about 350 authored lines. Push, pull request and merge remain the user's decisions.

## Tasks
- [x] T1 `js/sobre-data.js`, `js/carta.js`, `css/sobre.css`, `css/album.css`, tests: Aura catalog entries, markup and look. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 `js/sobre.js`, `css/sobre.css`, tests: Aura reveal effect, replacing the `gold` boolean with the variant. Route: delegated, same writer.
- [x] T3 Verify in a browser: `/sobre` reveal, `/album` Aura tab, `/overlay`, phone width, horizontal overflow. Route: inline, including the small fixes it found. Reduced motion is covered by tests and a CSS readback only.

## Acceptance criteria
- The catalog holds one Aura entry per card, after every existing entry, and existing cards keep their ids and numbers.
- Variant weights per card are 84, 10, 4 and 2.
- `/album` shows an Aura tab with no album-specific code for it.
- Aura is hidden until the card is revealed, and is not clipped by the card face.
- Revealing an Aura card in `/sobre` plays the wave, the burst and one ribbon: `¡Aura!`, `¡Épica Aura!` or `¡Legendaria Aura!`. Other cards reveal as before.
- With reduced motion there are no flames, embers, wave or burst, and the ribbon stays.
- The aura causes no horizontal page scroll.

## Checks
`node --test test/*.test.mjs`, plus the T3 browser walk.

## Progress and evidence
- T1 `1b7d16f`: 160 catalog entries with one Aura per card after every existing entry; weights 84/10/4/2. `node --test test/*.test.mjs`: 160 pass, 0 fail.
- T2 `67fa995`: `efectosRareza` takes the variant; `efectosAura` adds the wave, burst and ribbon. 171 pass, 0 fail, rerun by the parent.
- T3 `beb4191`: the browser walk found three bugs the prototype could not show, all fixed. 173 pass, 0 fail.
  - The album clipped the halo at section edges, because `content-visibility: auto` paints inside the box. Aura sections now grow by the energy's reach without moving the cards.
  - `overflow-x: clip` on `body` computed to a scrollable `hidden`, next to its `overflow-y: auto`. The rule moved to `#album-contenido`.
  - Flames crossed the card face during the flip, because both shared one 3D space. The Aura layers now live outside `.card__incl` and copy its tilt.
  - The phone carousel clipped flames in a band. `.hand` now grows with Aura, without moving the cards.
- T3 local browser with forced draws and test data on a local static server without `/api`:
  - `/album`: tabs read Normales 0/40, Holo 0/40, Gold 0/40, Aura 40/40; no card is live at rest; waking one shows flames; no sideways scroll at desktop or 375px; the detail view shows the aura.
  - `/sobre`: the aura stays hidden until the flip; wave, burst and one ribbon per card, reading `¡Épica Aura!` and `¡Legendaria Aura!`. At 375px the card position is unchanged and `Abrir otro sobre` still takes the click.
  - `/overlay`: the simulated redemption shows Aura cards one by one with their ribbon, and flames no longer cover the face.
- Reduced motion: unit tests cover no burst with the ribbon kept, and `css/sobre.css` hides flames, embers and wave. Not emulated live.
- Not checked: real phone performance of the flame layers, and draws through the deployed worker. `worker.js` reads the same catalog, so real redemptions roll Aura only after it is deployed.
- Known gap: from reading `js/album-share.js`, the share PNG prints the "Aura" label but no energy layers. It treats every variant the same way. Not run in the browser.

## Next step
Native review, then the user decides on push and pull request. `feat/card-gold-variant` is not merged yet, so this branch carries Gold too.
