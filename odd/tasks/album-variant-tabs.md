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
- [x] T3 `album.html`, `js/album.js`: Novedades belongs to the normal album and links to the Holo tab. Route: delegated, same writer.
- [x] T4 Verify in a browser at desktop and phone widths. Route: inline.

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
- T2 1b258b9: tabs, scoped render, per-collection filters, URL; node --test 107 pass.
- T3 f3b1614: Novedades on Normales only, Holo link; node --test 108 pass.
- T4 local browser at 1024px, with seeded test data removed afterwards: Normales 3/40 showing only base cards and Holo 1/40 showing only Holo cards, with progress, series and stats scoped to the tab; packs count unchanged at 7.
- T4 filters: Holo `legendaria` plus only-missing showed 4 cards, Normales stayed unfiltered, and the Holo filters came back on return. Clearing affected only the active tab.
- T4 keyboard and URL: ArrowLeft and End switch tabs and move focus; the URL becomes `?coleccion=holo` or empty with no new history entry. `Ver álbum Holo` activates and focuses the tab.
- T4 fallback: an HTML payload in `?coleccion=` opens Normales and nothing is injected. The Holo empty message shows when no Holo card is owned. The card detail opens on a Holo card and closes with Escape.
- T4 phone at 375px: no horizontal overflow, tabs 44px tall.
- The only console errors are 404s for `/api/config`, which the local static server does not serve.
- Line endings of `js/album-filters.js` restored to LF after T1 converted them to CRLF.
- Not verified: Twitch login and sync with a real account, real touch devices, production. Returning from the Twitch login opens Normales, as accepted in T2.
- Card faces still number across the whole catalog, for example `#080` and `S1 · 80`, while each tab counts 40.

## Next step
The user decides on push and pull request, and on whether card numbering should restart per album.
