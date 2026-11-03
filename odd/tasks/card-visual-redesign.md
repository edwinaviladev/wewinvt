# Card visual redesign

## Objective
Give the collectible cards and the pack a much richer look, inspired by the feel of mobile TCG apps, with WewinVT's own identity. No art, logos or marks from Pokémon.

## Problem
The cards feel plain, the pack explosion does not convince, and the Holo never reacts: the CSS reads `--mx`/`--my`/`--rx`/`--ry` but no script sets them. `/album` also runs infinite animations on all 80 cards, including off-screen ones.

## Decision
Accepted by the user: the "Tinta y brasa" direction, as shown in the interactive prototype (https://claude.ai/artifact/QSQ55ieXcHySYjMu7zHP8L). Black lacquer frame, metal by rarity, art as a manga panel on paper, red and black back, foil pack torn along a line of light, canvas particles, Holo Prisma driven by pointer or tilt.

## Scope and constraints
- Authorized: `js/sobre.js`, `js/album.js`, new shared `js/carta.js`, `css/sobre.css`, `css/album.css`, `sobre.html`, `overlay.html`, `album.html`.
- Out of scope: `js/sorteo.js`, weights, catalog (`js/sobre-data.js`), `worker.js`. No push or deploy.
- In a real redemption the overlay shows the cards returned by the server.
- Artist credits stay visible on every card and on the pack.
- Animate `transform` and `opacity` wherever possible. Nothing heavy runs on off-screen cards.
- Respect `prefers-reduced-motion`, including `css/album.css`.
- No dependencies and no build step. Comments and identifiers in Spanish, matching the code around them.

## Configuration
- TDD: off (source: no project configuration). Runner: `node --test`.
- Delivery strategy: `ask-on-risk`. Forecast: above 400 authored changed lines, because the card, pack and effect layers are rewritten. Chain strategy pending: to be asked when the user requests a pull request. Commits stay local until then.
- Branch: `feat/card-visual-redesign`, from `origin/master`, in the worktree `../wewinvt-worktrees/card-visual-redesign`.
- Receipt-driven development: on (global).

## Tasks
- [x] T1 Cards, back and Holo Prisma with a shared engine (`js/carta.js`, card section of `css/sobre.css`, fonts in the three pages). Route: delegated (writer trigger, 2+ non-trivial files). Commit: `328c9b0`, shared with T2 because the card and pack rewrite only works as one change.
- [x] T2 Pack, tear sequence, canvas particles and rarity reveal (`js/sobre.js`, `sobre.html`, `overlay.html`, pack and effect sections of `css/sobre.css`). Also fixes the "← Volver al álbum" overlap on mobile. Route: delegated. Commit: `328c9b0`.
- [x] T3 Album integration, overlay sequence and reduced motion (`js/album.js`, `css/album.css`, overlay rules). Route: delegated. Commits: `328c9b0` (overlay, reduced motion in `css/sobre.css`), `217c8eb` (album).
- [ ] T4 Browser verification on desktop and mobile with captures of each key state. Route: inline by the parent.

## Acceptance criteria
- The six requested points are implemented and seen working in `/album`, `/sobre` and `/overlay`, on desktop and mobile.
- Back, pack, opening and cards of each rarity, base and Holo, are captured.
- On mobile, "← Volver al álbum" no longer overlaps "Álbum".
- `window.SobreOverlay.canje({ usuario: "demo" })` runs the whole sequence, including on a transparent background.
- With reduced motion there is no tilt, sway or particles, and the flow still completes.
- Off-screen cards in `/album` run no animation and no script updates.

## Checks
- `node --test` (baseline on `4175caf`: 18 pass).
- `gentle-ai review assess` after each work-unit commit.

## Progress
T1 to T3 written and smoke-checked by the writer: `node --test` 18 pass; `/sobre`, `/overlay` and `/album` run on desktop and mobile width, and the overlay sequence returned to idle. `/album` is stale between `328c9b0` and `217c8eb`.

## Next step
T4: parent verifies in the browser and captures each key state.
