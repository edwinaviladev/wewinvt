# Album variant tabs

File locator: `odd/tasks/album-variant-tabs.md`. Engram mirror: `odd/album-variant-tabs/tasks`.

## Objective
Separate normal cards from variants in `/album`, so each has its own album. Holo is the only variant today.

## Problem and why
The catalog holds a base and a Holo version of every card, mixed in one grid with one progress bar. The Holo chance is low, so Holo cards drag the overall percentage down, and the user wants them treated as a separate album.

## Scope and constraints
- Authorized by the user: tabs inside `/album`, one per collection, each with its own catalog, progress and filters. A separate page was rejected.
- Card ids, storage, sync, pack odds and `/sobre` do not change, so nobody's collection is affected.
- A new variant must appear as a new tab without restructuring the page.
- The Twitch redirect URI comes from `location.pathname`, so the page stays at `/album`.
- Vanilla JS with no dependencies. UI copy stays in Spanish, matching the site.
- CSP in `_headers` blocks inline handlers and scripts; `node --test` enforces it.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Delivery: `ask-on-risk`. Forecast is about 300 authored lines, on branch `feat/album-variant-tabs`.
- Push, pull request and merge remain the user's decisions.

## Tasks
- [x] T1 `js/album-filters.js`, tests: split the catalog into collections. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 `album.html`, `js/album.js`, `css/album.css`, tests: tabs with scoped catalog, progress and filters. Route: delegated, same writer.
- [ ] T3 `album.html`, `js/album.js`: Novedades belongs to the normal album and links to the Holo tab. Route: delegated, same writer.
- [ ] T4 Verify in a browser at desktop and phone widths. Route: inline.

## Acceptance criteria
- `/album` opens on Normales, showing only base cards; the Holo tab shows only Holo cards.
- Progress bar, series progress, rarity stats and catalog count only the active collection.
- Each tab keeps its own filter state.
- `/album?coleccion=holo` opens the Holo tab; an unknown value falls back to Normales. Switching tabs updates the URL without a new history entry.
- Tabs follow the ARIA tabs pattern, including arrow keys.
- Owned cards and the sealed packs count are unchanged; the card detail still opens.

## Checks
`node --test test/*.test.mjs`, plus a browser walk of both tabs at both widths.

## Progress and evidence
- T1 05d9cd1: collection helpers in AlbumFilters; node --test 103 pass.
- T2 (this commit): tabs, scoped render, per-collection filters, URL; node --test 107 pass.

## Next step
T3.
