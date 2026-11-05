# Artists section improvements

File locator: `odd/tasks/artists-section-improvements.md`. Engram mirror: `odd/artists-section-improvements/tasks`.

## Objective
Turn `/artistas` from a long listing into a showcase: compact, with works that open and profiles that are easy to reach.

## Problem and why
Production review of `/artistas` (1024px wide, 13 artists, 40 works, no console errors):
- The page is 5,615px tall. 8 of 13 artists have one work, and each takes a full-width row that is mostly empty.
- Works are not clickable and 4 of 40 descriptions are cut with no way to read them in full.
- The profile link is only the artist name, with no hint of the platform.
- The count says `9 obras` instead of splitting emotes and fanarts.
- The gallery has an artist filter, but it cannot be opened from a link, so the two pages do not connect.

## Scope and constraints
- Authorized by the user: compact cards, clickable works in a lightbox, clearer headers, and a gallery deep link.
- Artists stay in alphabetical order, so the page does not read as a ranking.
- `Josswarz` and `koru` have no profile in `js/data.js`. They get no profile button, and no profile is guessed.
- Vanilla JS with no dependencies. UI copy stays in Spanish, matching the site.
- CSP in `_headers` blocks inline handlers and scripts; `node --test` enforces it.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Delivery: `ask-on-risk`. Forecast is about 350 authored lines, on branch `feat/artists-section-improvements`.
- Push, pull request and merge remain the user's decisions.

## Tasks
- [x] T1 `js/artistas.js`, `css/artistas.css`, tests: compact card grid and useful headers. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 `artistas.html`, `js/artistas.js`, `css/artistas.css`, tests: works open in a lightbox. Route: delegated, same writer.
- [x] T3 `js/gallery.js`, `js/artistas.js`, tests: `emotes.html?artista=<name>` deep link and `Ver en galería`. Route: delegated, same writer.
- [x] T4 Verify in a browser at desktop and phone widths. Route: inline. Accepted change: the walk found layout defects the tests could not see, fixed in `css/artistas.css`.

## Acceptance criteria
- Artists with fewer than 4 works share rows; artists with 4 or more use the full width. Order stays alphabetical.
- The page is clearly shorter than 5,615px at 1024px wide, with no horizontal overflow at 375px.
- Each header shows split counts, such as `6 emotes · 3 fanarts`, and a labelled profile link where one exists.
- Each work is a keyboard-usable button that opens a lightbox with the large image and full description.
- The lightbox moves only within that artist's works, closes with Escape, and returns focus to the work.
- `emotes.html?artista=<name>` applies the filter; an unknown name is ignored and shows the full gallery.
- Named artists link to their filtered gallery; `Anónimo` does not.

## Checks
`node --test test/*.test.mjs`, plus a browser walk of `/artistas` and the filtered gallery at both widths.

## Progress and evidence
- Baseline before the changes: `/artistas` 5,615px tall at 1024px wide.
- T1 0978891: 88 tests pass (`node --test test/*.test.mjs`). Existing heading-link assertions in `test/artistas.test.mjs` updated.
- T2 65effee: 92 tests pass.
- T3 ca3699d: 96 tests pass.

- T4 local browser, after the fixes: `/artistas` 5,615px to 3,902px at 1024px wide, 7,717px to 6,647px at 375px, no horizontal overflow, no console errors.
- T4 fixes: works stacked in one column in narrow cards, so the first pass only reached 4,928px; phone height had risen to 8,126px; the lightbox caption was 187px wide and covered the phone arrows.
- T4 lightbox: opens by click, moves within the artist with wrap, closes with Escape, returns focus; arrows hidden for a single work.
- T4 deep link: `?artista=vtkairo` selects the filter and shows 9 works; `?artista=nadie` is ignored and shows 40.
- Not verified: real touch devices, and production, since nothing is deployed.
- Review assessment over `master..HEAD`: medium risk from `artistas.html`, `review_due: false`, reason `under_budget`, so no native review ran.

## Next step
The user decides on push and pull request. `Josswarz` and `koru` get a profile button once the user supplies their profiles.
