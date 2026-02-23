---
phase: 12-curator-blog-tools
plan: 01
subsystem: api
tags: [rss, atom, feed, rss-feeds, svelte, typescript, cloudflare-d1]

# Dependency graph
requires:
  - phase: 11-scene-building
    provides: "D1Provider pattern, scenes API structure, queries.ts with getArtistBySlug"
  - phase: 09-community-foundation
    provides: "Collections model (taste.db), curator concept"
provides:
  - "RSS 2.0 + Atom 1.0 feeds for artist pages, tags, collections, and curators"
  - "RssButton component for inline RSS subscription links"
  - "feed@5.2.0 + qrcode@1.5.4 packages installed (qrcode for Plan 02)"
affects:
  - "12-02 (embed widgets — qrcode package already installed)"
  - "12-03 (curator attribution — curator_features table empty-graceful handled)"

# Tech tracking
tech-stack:
  added:
    - "feed@5.2.0 — RSS 2.0 + Atom 1.0 + JSON Feed generation (TypeScript-native)"
    - "qrcode@1.5.4 — QR code SVG generation (used in Plan 02)"
    - "@types/qrcode@1.5.6 — TypeScript types for qrcode"
  patterns:
    - "RSS endpoint pattern: D1Provider + Feed class + format negotiation (?format=atom / Accept header)"
    - "Graceful empty feeds: return valid RSS with zero items + description rather than 404"

key-files:
  created:
    - "src/routes/api/rss/artist/[slug]/+server.ts"
    - "src/routes/api/rss/tag/[tag]/+server.ts"
    - "src/routes/api/rss/collection/[id]/+server.ts"
    - "src/routes/api/rss/curator/[handle]/+server.ts"
    - "src/lib/components/RssButton.svelte"
  modified:
    - "src/routes/artist/[slug]/+page.svelte"
    - "src/routes/discover/+page.svelte"
    - "package.json"

key-decisions:
  - "Cover art embedded in content:encoded HTML not as enclosure — feed package Item.image generates broken MIME type from URL string, content:encoded is what RSS readers actually display"
  - "Graceful empty feeds for collection (desktop-only) and curator (table not yet created) — returns valid RSS with descriptive message, not 404/500"
  - "feed@5.2.0 installed (plan specified 4.x) — same API surface, better TypeScript support in newer version"
  - "RssButton placed in artist name row (after FavoriteButton) and inline with scene-rooms button on discover page (single-tag filter only)"
  - "Cover art via coverartarchive.org/release-group/{mbid}/front-250 — best-effort, may 404, feed readers handle gracefully"

requirements-completed:
  - BLOG-03

# Metrics
duration: 8min
completed: 2026-02-23
---

# Phase 12 Plan 01: RSS/Atom Feeds Summary

**Four RSS/Atom feed endpoints (artist/tag/collection/curator) using the feed@5.2.0 package, with RssButton component on artist and discover pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T14:32:04Z
- **Completed:** 2026-02-23T14:43:02Z
- **Tasks:** 2
- **Files modified:** 8 (7 source + package.json)

## Accomplishments
- RSS 2.0 + Atom 1.0 feeds for 4 page types with format negotiation via `?format=atom` param or `Accept` header
- Tag feed returns up to 50 artists with cover art in content:encoded, ordered by tag vote count
- Collection and curator feeds return valid empty XML with descriptive messages (graceful degradation)
- RssButton component using standard RSS orange (#f26522) SVG icon
- qrcode package pre-installed for Plan 02 (embed widgets)

## Task Commits

1. **Task 1: Install feed + qrcode dependencies** - `4da3fa7` (chore)
2. **Task 2: Four RSS/Atom feed endpoints + RssButton component** - `a8fe49f` (feat)

**Plan metadata:** (final commit — this SUMMARY.md)

## Files Created/Modified
- `src/routes/api/rss/artist/[slug]/+server.ts` — Artist state snapshot feed, RSS 2.0 or Atom 1.0
- `src/routes/api/rss/tag/[tag]/+server.ts` — Tag feed with up to 50 artists as items
- `src/routes/api/rss/collection/[id]/+server.ts` — Graceful empty feed (collections are desktop-only)
- `src/routes/api/rss/curator/[handle]/+server.ts` — Curator featured artists, empty-graceful if table missing
- `src/lib/components/RssButton.svelte` — Reusable RSS icon link (RSS orange, aria-label)
- `src/routes/artist/[slug]/+page.svelte` — Added RssButton to artist name row
- `src/routes/discover/+page.svelte` — Added RssButton when single tag filter is active
- `package.json` — feed@5.2.0, qrcode@1.5.4, @types/qrcode@1.5.6 added

## Decisions Made
- **cover art via content:encoded, not enclosure** — The feed package's Item.image field generates an `<enclosure>` element with a broken MIME type (strips domain from URL when deriving type). Using `content:encoded` with an `<img>` HTML element is the correct approach and what RSS readers actually render.
- **Graceful empty feeds** — Both collection (desktop-only) and curator (curator_features table in Plan 03) return 200 with valid empty RSS + descriptive explanations, not 404. Feed readers that subscribe won't break during phased rollout.
- **RssButton on single-tag discover only** — When multiple tags are selected, a per-tag RSS URL would be ambiguous. Only show RSS button when exactly one tag is active.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken cover art enclosure in feed items**
- **Found during:** Task 2 (implementing RSS endpoints)
- **Issue:** feed package Item.image generates `<enclosure type="image//release-group/id/front-250">` — the MIME type is derived from URL path substring, stripping the domain, resulting in `image//path` which is invalid
- **Fix:** Removed `image` field from addItem() calls; embedded cover art as `<img>` in `content: htmlDesc` (renders as `<content:encoded>`) — standard RSS reader behavior, actually displays inline image
- **Files modified:** All four +server.ts files
- **Verification:** curl confirmed `<content:encoded>` with proper img tag, no broken enclosure element
- **Committed in:** a8fe49f (Task 2 commit)

**2. [Rule 1 - Bug] Fixed double-path feedLinks.rss in artist endpoint**
- **Found during:** Task 2 (testing artist RSS endpoint)
- **Issue:** `artistUrl.replace(SITE_URL, SITE_URL + '/api/rss/artist')` produced `https://mercury.example/api/rss/artist/artist/radiohead` (double "artist")
- **Fix:** Replaced with explicit `${SITE_URL}/api/rss/artist/${artist.slug}` string construction
- **Files modified:** `src/routes/api/rss/artist/[slug]/+server.ts`
- **Verification:** curl showed `atom:link href` is now correct URL
- **Committed in:** a8fe49f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in initial implementation)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- feed@5.2.0 installed instead of plan-specified 4.x — same API, newer version. No issues.
- Wrangler edge-caches RSS responses (Cache-Control: public, max-age=3600) making iterative testing require cache-busting params (`?nocache=1`)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RSS foundation in place for Plan 02 (embed widgets with QR codes — qrcode already installed)
- curator_features table query handled gracefully for Plan 03 (curator attribution — table will be created then)
- RssButton component ready for reuse on any future pages that need RSS subscription links

---
*Phase: 12-curator-blog-tools*
*Completed: 2026-02-23*
