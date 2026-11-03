# Site improvements backlog

File locator: `odd/tasks/site-improvements.md`. Engram mirror: `odd/site-improvements/tasks`.

Audited against the current branch on 2026-11-03. P1-P4, C1-C3, L1 and A5 are implemented; unchecked items remain pending. The user chooses what to build next.

## Starting point
- `origin/master` includes the hardening work (PR #7). In production, `/worker.js`, `/README.md` and the image originals answer 404, `boceto-lapiz.webp` is 303924 bytes, and security and cache headers are live.
- No build step: plain HTML, CSS and JS on a Cloudflare Worker with static assets.
- Any new external origin must be added to the CSP in `_headers`. Twitch clips, for example, need their host in `frame-src`. Inline event handlers are blocked and fail `node --test`.
- Follow the visual direction in `upgrades.md` (Warm Editorial Manga, git-ignored in the main checkout). It asks to avoid a generic streamer or SaaS look.
- Keep the `prefers-reduced-motion` handling that already exists for any new animation.

## Out of scope
Card variants: the user deferred them. Do not add or propose new ones until the user brings them back.

## Evidence limit
These ideas come from the code and the published text. The pages were not reviewed visually, so look at them on desktop and mobile before deciding layout changes.

## Priority
- [x] P1 Remove "Prototipo" from the `sobre.html` title and description and the `overlay.html` back link.
- [x] P2 Show three real catalog cards in the home "Colección" section, fanned with `js/carta.js`.
- [x] P3 Fix the overlay URL in `js/overlay-config.js`: use the clean `/overlay` route on Cloudflare and retain `.html` for the local static server.
- [x] P4 Serve responsive gallery thumbnails with `srcset`: 320/640 px fanart and 64/128/256 px emote candidates where source dimensions allow. The lightbox still loads each original image.

## Copy
- [x] C1 Unify the voice. Rewrote the hero and "Colección" copy to match the humor in "Financia decisiones cuestionables" and "Quién es Wewin".
- [x] C2 Add a line of lore to the card detail. The approved Modo cool line appears in the album; other cards without lore show no placeholder.
- [x] C3 Keep the album's playful empty-state copy and give channel status errors a distinct voice: "Fuera de aire" when offline and "Interferencia" when Twitch cannot be queried.
- [ ] C4 Show the stream schedule converted to the visitor's time zone, keeping the current joke.

## Page composition
- [x] L1 Make the hero change when the channel is live, with the player in front and a clear indicator. `js/main.js` updates the signal panel and inserts the Twitch player when live.
- [ ] L2 Add a section of featured clips.
- [ ] L3 Add an artists page grouping work by artist with their links. Credits already exist in `js/data.js`.
- [ ] L4 Add gallery filters by artist or type of work.
- [ ] L5 Add filters for missing cards and rarity, plus progress per set. The album already groups by rarity and shows overall/per-rarity counts; these are not filters or per-set progress.
- [ ] L6 Give `/sobre` an OG image and add it to `sitemap.xml`.

## Visual design
- [ ] D1 Give the fanart mosaic hierarchy, with some pieces at double size. The gallery already uses CSS columns; deliberate double-size hierarchy remains.
- [ ] D2 Add manga details in separators: panels, onomatopoeia, screentones.
- [ ] D3 Check whether social previews render correctly. `og:image` points at a WebP, which some crawlers may not read. If they fail, publish a PNG again and update the meta tags and `.assetsignore`.

## Animation
- [ ] A1 Add page transitions with `@view-transition`, which need no JS. Not used today.
- [ ] A2 Move a card from the album grid into its detail view with View Transitions.
- [ ] A3 Add scroll reveals with `animation-timeline`, no libraries.
- [ ] A4 Give the hero avatar some life: a blink, or a reaction on hover.
- [x] A5 Make the pack opening build differently by rarity before the card shows. `js/sobre.js` adds pre-reveal anticipation for Epic and Legendary cards.

## Album mechanics
These touch the server redemption and existing collections, so design them carefully first.
- [ ] M1 Share a card as an image to Discord or X. Likely the best free promotion.
- [ ] M2 Add sets with a reward, such as a badge.
- [ ] M3 Add a public collection page per person, and later a collectors ranking.
- [ ] M4 Give duplicates a use, for example trading five for a pack.

## Open items from the hardening work
- [ ] H1 Exercise a full Twitch login, a real redemption, a full pack opening in `/overlay`, and the player with the channel live under the CSP. Not tested so far.
- [ ] H2 Check the browser console for CSP errors on production pages. Verified only under `wrangler dev`.
- [ ] H3 Four non-blocking review findings on `test/site-config.test.mjs`: the inline-handler regex can give false positives and miss cases; an image prefix stored in a constant goes unseen; a header repeated inside one rule is not detected; the ignore-rule matcher accepts unsupported syntax silently. The recommendation was to leave them unless one causes trouble.

## Next step
The first batch (P1, P2, P3 and C1), P4, C2 and C3 are complete. The next pending item by order is C4; the user chooses what to build next.
