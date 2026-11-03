# Card API integrity

## Objective
Only real stream redemptions can write to a viewer's online collection.

## Problem
`/api/canje` trusts a client-sent `broadcasterId`, so any Twitch user can self-authorize and write cards to any collection. `POST /api/coleccion` accepts arbitrary ids, and cards are rolled in the browser.

## Decision
Accepted by the user: online collections change only through stream redemptions. `POST /api/coleccion` is removed, `/sobre` stays a local demo, and a signed-in album shows the cloud collection. Local-only cards are not uploaded.

## Scope and constraints
- Authorized: `worker.js`, `wrangler.jsonc`, `.assetsignore`, `js/sobre-data.js`, new `js/sorteo.js`, `js/sobre.js`, `js/album.js`, `sobre.html`, `overlay.html`, `album.html`, `README.md`, `test/`.
- Out of scope: deployment, cleanup of existing KV data, other audit findings.
- No dependencies and no build step. Tests use `node --test`.

## Configuration
- TDD: off (source: no project configuration). Runner: `node --test test/`.
- Delivery strategy: `ask-on-risk`. Forecast: about 400 authored changed lines.
- Branch: `fix/card-api-integrity`, based on `feat/card-holo-showcase`.

## Tasks
- [x] T1 Share the pack roll between browser and Worker. Route: delegated (writer trigger, 2+ non-trivial files).
- [x] T2 Harden the Worker: fixed broadcaster, server-side roll, idempotent redemptions, no client writes. Route: delegated.
- [x] T3 Adapt overlay and album to the new contract. Route: delegated.
- [x] T4 Verify with tests and a browser check of the overlay demo. Route: delegated tests, inline browser check.

## Acceptance criteria
- A token whose user is not `BROADCASTER_ID` gets 403 from `/api/canje`, whatever the body says.
- Missing `BROADCASTER_ID` or `CLIENT_ID` fails closed.
- Client-sent cards are ignored; awarded ids come from the catalog.
- Replaying a `canjeId` returns the same result without adding cards.
- `POST /api/coleccion` no longer writes.
- The overlay shows the cards the server awarded; demo redemptions stay local.
- The signed-in album shows cloud data and uploads nothing.

## Progress
T1 to T4 complete on the branch. Not pushed or deployed.

## Verification evidence
- Commits: e729712 (T1, T2), 0e4cf37 (T3), plus the follow-up commit carrying this document.
- `node --test`: 14 pass, 0 fail, using a stubbed Twitch validate and fake KV.
- `wrangler dev --local` (workerd): `/api/canje` without token 401, `POST /api/coleccion` 404, `/odd` and `/test` assets 404.
- Browser: overlay demo and `/sobre` made no API calls; album without a session shows local data.
- Not tested: a real redemption with a live broadcaster token, and a signed-in album against real data.
- Runner correction: `node --test test/` fails on Node 24; the working command is `node --test`.

- Native review: medium risk, reliability lens, approved and acknowledged on lineage review-1436c4b3a78f37fb.

## Open advisory findings
Non-blocking and not fixed:
- A failed idempotency marker write returns 500 after cards are saved, so the overlay retry can award a second pack (worker.js:196-202). This conflicts with the replay criterion.
- Any non-OK Twitch validate response becomes 401, so a transient outage skips the retry (worker.js:81).
- A canjeId is marked seen before the queue capacity check, so a dropped redemption cannot be redelivered (js/sobre.js:893-898).
- KV has no atomic check, so concurrent replays can both pass (worker.js:181).
- The real redemption path in the overlay has no runtime proof (js/sobre.js:758-774).

## Next step
User decision on the advisory fixes, then push and deploy. Existing KV data is not cleaned.
