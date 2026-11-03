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
- [ ] T1 `.assetsignore`: exclude non-site files and unused originals. Route: inline (one mechanical file).
- [ ] T2 `_headers`: CSP, HSTS, nosniff, Referrer-Policy, cache policy; `js/overlay-config.js` extracted;
      `test/site-config.test.mjs`. Route: inline (design already resolved while exploring).
- [ ] T3 Compress oversized images. Route: delegated (long-session backstop; visual comparison work).
- [ ] T4 Verify under `wrangler dev` in the browser, confirm 404s.

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
Pending.

## Next step
T1 and T2 commit, then T3.
