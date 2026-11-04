# Site bug sweep: console and visual errors

File locator: `odd/tasks/site-bug-sweep.md`. Engram mirror: `odd/site-bug-sweep/tasks`.

## Objective
Fix the console and visual errors found by walking the production site at desktop and phone widths.

## Problem and why
The user reported several errors. All 81 tests passed, so none of these were covered:
- Every page logs a CSP error because Cloudflare Web Analytics injects a beacon the CSP blocks.
- `/artistas` renders thumbnails at 140x1280 and the page is about 20,000px tall.
- `/emotes` renders each emote tile about 1,360px tall at every width.
- The lightbox credit is white text on a white pill, so it cannot be read.
- `/sobre` shows a `modo prueba` control to the public, which can force legendary cards into the local collection.
- The gallery draws doubled rules under the header and under the filters.

Root cause of the two layout bugs: commit `2b21f34` added `width` and `height` attributes to the
images, and the CSS for those images never set `height: auto`, so the attribute height won.

## Scope and constraints
- The user asked to work on `master` and to commit and push there directly, with no branch or pull request.
- `overlay.html` keeps its test controls: it is the stream setup tool.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test test/*.test.mjs`.
- Delivery: `single-pr` equivalent, direct to `master`. Forecast is under 400 authored lines.

## Tasks
- [x] T1 `_headers`: allow the Cloudflare Web Analytics beacon. Route: inline (one mechanical file).
- [x] T2 `css/styles.css`, `css/artistas.css`: fix emote and artist image sizing. Route: inline (one-line rules).
- [x] T3 `css/paleta-editorial.css`, `css/gallery-filters.css`: lightbox caption contrast and doubled rules. Route: inline.
- [x] T4 `sobre.html`, `js/sobre.js`: show test controls only with `?debug=1`. Route: inline.
- [x] T5 Verify in the browser at desktop and phone widths, then after deploy on production.

## Acceptance criteria
- No CSP error in the console on any public page.
- No rendered image is stretched against its natural ratio on any public page.
- The lightbox credit is readable.
- `/sobre` shows no test control unless `?debug=1` is present; `overlay.html` still shows it.

## Checks
`node --test test/*.test.mjs`, plus a browser walk of each page.

## Progress and evidence
- T1 `9e5c8a0`, T2 `40f5f05`, T3 `db542b6`, T4 `a9a247e`. Tests sit with each fix in `test/site-bug-sweep.test.mjs`.
- All four new tests failed before the fixes. `node --test test/*.test.mjs`: 85 pass, 0 fail.
- Local browser, desktop: emote tile 1,360px to 166px, `/emotes` page 7,740px to 4,463px, `/artistas` page 20,529px to 5,615px.
- Local browser, 375px: `/emotes` page 19,192px to 10,138px, tile 211px, no horizontal overflow.
- Lightbox credit readable at both widths. `.dev` is hidden on `/sobre`, visible with `?debug=1` and on `overlay.html`.
- T5 production, after deploy, in a fresh tab: no console errors on `/artistas` and `/emotes`, beacon answers 200,
  `/artistas` image 140x140 and page 5,615px, `/emotes` tile 166px and page 4,462px, `/sobre` test controls hidden.
- Review assessment: medium risk from `_headers`, `review_due: false`, reason `under_budget`, so no native review ran.
- Returning browsers can see the old layout for up to 10 minutes, the `max-age` of `/css/*`.

## Next step
None. Feature complete.
