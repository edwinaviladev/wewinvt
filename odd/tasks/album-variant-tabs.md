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
- [x] T5 `css/album.css`: dark showcase theme for everything on `/album` except the cards and site header. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T6 `album.html`, `js/album.js`, `css/album.css`, tests: one progress block with a bar split by rarity; series progress only with 2+ series. Route: delegated, same writer.
- [x] T7 `album.html`, `css/album.css`: filter toolbar, compact Novedades, rarity sections without boxes. Route: delegated, same writer.
- [x] T8 Verify contrast and layouts in a browser at desktop and phone widths. Route: inline.

## Acceptance criteria
- `/album` opens on Normales, showing only base cards; the Holo tab shows only Holo cards.
- Progress bar, series progress, rarity stats and catalog count only the active collection.
- Each tab keeps its own filter state.
- `/album?coleccion=holo` opens the Holo tab; an unknown value falls back to Normales. Switching tabs updates the URL without a new history entry.
- Tabs follow the ARIA tabs pattern, including arrow keys.
- Owned cards and the sealed packs count are unchanged; the card detail still opens.

- Redesign, chosen by the user as direction A, dark showcase: the page below the site header is dark; card artwork and revealed card faces are unchanged. Backs of undiscovered cards are dimmed so they recede on the dark page.
- Text and control contrast on the dark surfaces meets WCAG AA.
- One progress block shows the percentage, the count and a bar split by rarity with visible counts per rarity. Series progress appears only with 2 or more series.
- Filters sit in a left-aligned toolbar. Novedades takes clearly less height than its current 1,009px at 1280px wide. Rarity sections have no box.

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

- Review over `origin/master..174c4c6`: medium risk from `album.html`, user granted consent, reliability lens approved with no blocker.
- Non-blocking review findings, fixed at the user's request: the tab handler now leaves Alt, Ctrl and Meta shortcuts to the browser, and `test/album-tabs.test.mjs` runs the real `js/album.js` on a small DOM stub in place of the static source checks.
- Findings evidence: the modifier test failed before the fix; `node --test test/*.test.mjs` then gave 115 pass. Deliberately breaking collection scoping, filter restore and arrow wraparound each fails the new tests.
- Second review over `174c4c6..95e9c4c`: approved. Its finding, that removing the static checks dropped `role`, `aria-controls` and the hidden Holo button, is fixed with direct assertions; 116 pass.
- T5 a7a676c: dark showcase theme in `css/album.css` (tokens on `body.album-page`, header stays cream); node --test 116 pass.
- T6 c319d13: one progress block, bar split by rarity, series only with 2+; node --test 119 pass .
- T7 6c03efe: filter toolbar, boxless rarity sections and compact Novedades; node --test 119 pass.
- T8 local browser with seeded test data, removed afterwards: every text style outside the cards measures at least 4.5:1 against its background on both tabs and in the card detail. Header stays cream, focus ring is visible.
- T8 layout: at 1280px, Novedades is 463px high (was 1,009px), the page went from 6,297px to 5,411px, and the bar shows fills per rarity after a tab switch. At 375px there is no horizontal overflow and Novedades stacks at 843px.
- Review over `72ae54c..f3ce4d2`: medium risk from `album.html`, user granted consent, reliability lens approved with no blocker. Its three findings are resolved: bar segments now persist between renders, the carousel focus selector wins, and the criterion allows dimmed backs on undiscovered cards.
- Findings evidence: 121 tests pass. In a browser, `transitionrun` fires for the three segments whose width changes on a tab switch and none fires on a filter change; the keyboard-focused carousel has a -2px outline offset.
- Not verified: hover states by eye, the fill animation on first page load, a catalog with 2 or more series in a browser (covered by tests), real touch devices, production.

## Next step
The user decides on the pull request and whether card numbering should restart per album.
