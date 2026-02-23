---
phase: 12-curator-blog-tools
plan: 02
subsystem: ui
tags: [svelte5, sveltekit, embed, iframe, qrcode, blogger-tools]

requires:
  - phase: 12-curator-blog-tools plan 01
    provides: qrcode@1.5.4 package installed; curator/ lib directory pattern

provides:
  - /embed/* routes isolated from root layout via SvelteKit +layout@.svelte reset
  - Artist card embed at /embed/artist/[slug] — minimal, dark/light adaptive
  - Collection embed placeholder at /embed/collection/[id]
  - generateEmbedSnippets() utility in src/lib/curator/embed-snippet.ts
  - generateQrSvg() utility in src/lib/curator/qr.ts
  - Copy-paste embed UI on artist page with QR code generation
  - GET /embed.js bootstrap script for script-tag embed variant

affects:
  - 12-curator-blog-tools plan 03 (curator-feature API accepts slug param per embed.js attribution design)
  - Any future page that wants to embed Mercury content on external sites

tech-stack:
  added: []
  patterns:
    - "+layout@.svelte for SvelteKit layout chain reset (embed routes get no Mercury chrome)"
    - "onerror as Svelte 5 event handler (e) => {} not HTML string attribute"
    - "Dynamic import in handleQrClick — lazy loads QR module client-side only, avoids SSR bundling"
    - "IIFE pattern for embed.js bootstrap — no dependencies, works on any blogger site"
    - "src/routes/embed.js/ directory name produces /embed.js URL path in SvelteKit"

key-files:
  created:
    - src/routes/embed/+layout@.svelte
    - src/routes/embed/artist/[slug]/+page.server.ts
    - src/routes/embed/artist/[slug]/+page.svelte
    - src/routes/embed/collection/[id]/+page.svelte
    - src/lib/curator/embed-snippet.ts
    - src/lib/curator/qr.ts
    - src/routes/embed.js/+server.ts
  modified:
    - src/routes/artist/[slug]/+page.svelte

key-decisions:
  - "+layout@.svelte (not +layout.svelte) breaks SvelteKit layout inheritance — embed routes get no Mercury nav/player/chat"
  - "D1 has no bio column — using top-4 tags joined with ' · ' as bio snippet per Phase 12 design decision"
  - "onerror on img tag uses Svelte 5 event handler syntax (e) => { } not HTML string — plan's onerror=string form fails in Svelte 5"
  - "Collection embed shows honest placeholder (desktop-required) not error page — per research open question 4"
  - "embed.js fires attribution ping using slug extracted from embed URL path — /api/curator-feature?slug=&curator= (Plan 03 must accept slug param)"
  - "QR generation uses lazy dynamic import in click handler — avoids SSR bundling, client-side only"
  - "SvelteKit route named embed.js via directory src/routes/embed.js/ — produces /embed.js URL path"

requirements-completed:
  - BLOG-01

duration: 8min
completed: 2026-02-23
---

# Phase 12 Plan 02: Embed Widget System Summary

**Embeddable iframe artist cards at /embed/artist/[slug] isolated from Mercury chrome via SvelteKit layout reset, with copy-paste snippet UI and QR code generation on artist pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T14:42:39Z
- **Completed:** 2026-02-23T14:50:39Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `/embed/*` routes use `+layout@.svelte` to fully break out of the Mercury root layout — no nav, player, chat overlay, or Mercury styles leak into the embed iframe
- Artist card at `/embed/artist/[slug]` shows cover art (graceful if missing), artist name as link, tag-derived bio snippet, top-5 tags as pills, country, listen link, Mercury attribution — adapts to light/dark via `prefers-color-scheme` matchMedia
- Collection embed at `/embed/collection/[id]` shows honest "requires desktop app" placeholder card (consistent styling)
- `generateEmbedSnippets()` utility produces both iframe HTML and script-tag HTML for any embed URL
- `generateQrSvg()` utility uses qrcode package with dynamic import for client-side-only execution
- Artist page has collapsible embed UI: iframe/script toggle, copy button, QR code generation inline
- `GET /embed.js` endpoint serves IIFE bootstrap script that injects iframe from `data-src` attribute and fires attribution ping when `data-curator` is present

## Task Commits

1. **Task 1: Embed layout + artist card + collection embed** - `8aa3062` (feat)
2. **Task 2: Embed snippet utility + QR utility + artist page embed UI** - `0f86fcc` (feat)
3. **Task 3: GET /embed.js script-tag embed bootstrap** - `d61ce59` (feat)

## Files Created/Modified
- `src/routes/embed/+layout@.svelte` — Layout reset; opts out of root layout for all /embed/* routes
- `src/routes/embed/artist/[slug]/+page.server.ts` — D1 query for artist embed data; tag-derived bio
- `src/routes/embed/artist/[slug]/+page.svelte` — Artist card; dark/light matchMedia; graceful cover art
- `src/routes/embed/collection/[id]/+page.svelte` — Desktop-required placeholder card
- `src/lib/curator/embed-snippet.ts` — generateEmbedSnippets() returning {iframe, scriptTag}
- `src/lib/curator/qr.ts` — generateQrSvg() using qrcode package, dynamic import for SSR safety
- `src/routes/embed.js/+server.ts` — GET /embed.js with CORS header and 24hr cache
- `src/routes/artist/[slug]/+page.svelte` — Added embed UI section with copy button and QR generation

## Decisions Made
- Used `+layout@.svelte` (SvelteKit layout chain reset) instead of `+layout.svelte` (which inherits root layout) — this was the critical architectural choice for clean embed isolation
- Bio snippet is derived from top-4 tags joined with " · " — D1 has no bio column, and this gives the card meaningful descriptor text without a live API call
- `onerror` on the cover art img uses Svelte 5 event handler syntax `(e) => { }` — the plan's HTML string form `onerror="this.style.display='none'"` is invalid in Svelte 5
- embed.js attribution ping uses slug-based lookup (`?slug=&curator=`) — Plan 03 Task 1 must accept slug as alternative to artist MBID param

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] onerror attribute on img uses Svelte 5 handler syntax**
- **Found during:** Task 1 (artist card page)
- **Issue:** Plan specified `onerror="this.style.display='none'"` — this is an HTML string attribute, invalid in Svelte 5 which requires event handlers to be JS expressions
- **Fix:** Changed to `onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}`
- **Files modified:** src/routes/embed/artist/[slug]/+page.svelte
- **Verification:** npm run check 0 errors
- **Committed in:** 8aa3062 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — Svelte 5 event handler syntax)
**Impact on plan:** Required fix for correctness. Plan was written with Svelte 4 HTML event attribute syntax.

## Issues Encountered
None beyond the Svelte 5 onerror fix documented above.

## Next Phase Readiness
- Plan 03 (curator-feature API) must accept `slug` query param as alternative to `artist` MBID — the embed.js attribution ping uses `/api/curator-feature?slug=&curator=` because only the slug is in the embed URL path
- All embed infrastructure is complete and functional

---
*Phase: 12-curator-blog-tools*
*Completed: 2026-02-23*

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git log.

| Item | Status |
|------|--------|
| src/routes/embed/+layout@.svelte | FOUND |
| src/routes/embed/artist/[slug]/+page.server.ts | FOUND |
| src/routes/embed/artist/[slug]/+page.svelte | FOUND |
| src/routes/embed/collection/[id]/+page.svelte | FOUND |
| src/lib/curator/embed-snippet.ts | FOUND |
| src/lib/curator/qr.ts | FOUND |
| src/routes/embed.js/+server.ts | FOUND |
| .planning/phases/12-curator-blog-tools/12-02-SUMMARY.md | FOUND |
| Commit 8aa3062 (Task 1) | FOUND |
| Commit 0f86fcc (Task 2) | FOUND |
| Commit d61ce59 (Task 3) | FOUND |
