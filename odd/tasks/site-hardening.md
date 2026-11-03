# Site hardening: published files, images, headers

File locator: `odd/tasks/site-hardening.md`. Engram mirror: `odd/site-hardening/tasks`.

## Objective
Publish only what the site uses, shrink oversized images, and add security headers and a cache policy.

## Problem and why
A production audit on 2026-11-03 found server code and docs answering 200, a 4.4 MB unused original,
a 1.8 MB image on `emotes.html`, no CSP, HSTS, `X-Content-Type-Options` or `Referrer-Policy`, and
`max-age=0` on every asset including images.

## Scope and constraints
- Base: `origin/master`, branch `chore/site-hardening`. No push or deploy without the user's request.
- Do not change `js/sorteo.js`, the catalog, or the API behavior of `worker.js`.
- The card redesign the brief warned about is already merged in `origin/master` (PR #6), so the
  card files are current here; they are still not edited.
- TDD: no project or session configuration found, so ordinary functional checks. Runner: `node --test`.
- Delivery: `ask-on-risk`; forecast under 400 authored lines (binary images excluded).

## Tasks
- [x] T1 `.assetsignore`: exclude non-site files and unused originals. Route: inline (one mechanical file).
- [x] T2 `_headers`: CSP, HSTS, nosniff, Referrer-Policy, cache policy; `js/overlay-config.js` extracted;
      `test/site-config.test.mjs`. Route: inline (design already resolved while exploring).
- [x] T3 Compress oversized images. Route: delegated (long-session backstop; visual comparison work).
- [x] T4 Verify under `wrangler dev` in the browser, confirm 404s.

## Decisions
- `_headers` over `worker.js`: Cloudflare applies it to static assets, and matched assets do not invoke
  the Worker, so API behavior stays untouched.
- Inline script in `overlay-config.html` moved to a file: its hash would depend on the exact bytes and
  line endings. The one-line `js` class script in `<head>` stays inline, allowed by hash.
- `style-src 'unsafe-inline'` stays: `overlay-config.html` has a `<style>` block and style attributes,
  and `js/album.js` renders one.
- Every png, jpg and gif is excluded: none is referenced by HTML, CSS, JS or meta tags, and OG meta
  already points at `img/og-wewin.webp`.
- HSTS without `includeSubDomains` or `preload`: other subdomains were not audited.

## Acceptance and checks
`node --test`; pages load under `wrangler dev` with no CSP errors; excluded paths answer 404.

## Progress and evidence
- `node --test`: 26 pass, 0 fail.
- Review of 669c61c approved with three non-blocking findings on `test/site-config.test.mjs`, all fixed at the
  user's request: references checked against the real ignore rules, overlap check tolerant of CRLF and
  covering every header, inline handlers detected. Each check failed when its defect was injected.
- `wrangler dev` (4.156.2): 23 excluded paths answer 404; headers present on assets and on the 404 page;
  `/api/config` is unchanged and carries none of them.
- Browser: `/`, `/album`, `/sobre`, `/overlay`, `/overlay-config`, `/emotes` and the 404 page load with no CSP
  violations and no broken images. Allowed in practice: ivr.fi, decapi.me, helix, channel logo, player
  frame, EventSub WebSocket (`session_welcome`). Negative control: fetch to example.com was blocked and logged.
- Images (bytes): boceto-lapiz 1843530 to 303924; abrazo 249730 to 41964; pensar-sonrojo 225186 to 126448
  (8 frames kept); batalla-pokemon 214154 to 135908; dino-pijama 195674 to 65452; angel-halo 193696 to 129308.
- Not exercised: a full Twitch login and real redemption events; the player frame with the channel live.
- Only confirmable after deploy: HSTS over HTTPS, edge cache behavior, production 404s.

## Next step
User decides on push, pull request and deploy.
