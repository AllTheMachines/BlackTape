---
phase: 12-curator-blog-tools
plan: 04
subsystem: ui
tags: [sveltekit, d1, rss, feed, discovery, curator]

requires:
  - phase: 12-curator-blog-tools (plans 01-03)
    provides: RSS feeds, embed widgets, RssButton component, curator_features D1 table, /api/curator-feature endpoint
provides:
  - /new-rising public discovery page with Newly Active + Gaining Traction two-tab view
  - /api/new-rising JSON endpoint (newArtists + gainingTraction + curatorArtists)
  - /api/rss/new-rising RSS/Atom feed for gaining-traction niche artists
  - Curator filter via ?curator= URL param on /new-rising
  - New & Rising nav link in web navigation
  - ARCHITECTURE.md Curator / Blog Tools section
  - docs/user-manual.md Curator Tools section
affects:
  - Phase 13 (any features referencing curator_features or new-rising page)
  - Future curator display features referencing /new-rising?curator= URL pattern

tech-stack:
  added: []
  patterns:
    - "Web-first +page.server.ts pattern (no +page.ts universal load) — Tauri shows empty state, data lives in D1"
    - "begin_year as recency proxy — no added_at column in artists table, documented in RESEARCH.md"
    - "AVG(1/NULLIF(tag_stats.artist_count,0)) as niche signal for gaining-traction ordering"

key-files:
  created:
    - src/routes/new-rising/+page.svelte
    - src/routes/new-rising/+page.server.ts
    - src/routes/api/new-rising/+server.ts
    - src/routes/api/rss/new-rising/+server.ts
  modified:
    - src/routes/+layout.svelte
    - ARCHITECTURE.md
    - docs/user-manual.md

key-decisions:
  - "Web-first pattern for /new-rising (+page.server.ts only, no universal load) — Tauri shows empty, web has D1 niche signal"
  - "begin_year >= currentYear-1 as recency proxy — no added_at column, honest approximation documented on page"
  - "New & Rising RSS feed returns gaining-traction list (not newly active) — most useful subscription for bloggers"
  - "All three queries (newArtists, gainingTraction, curatorArtists) individually try/caught — curator_features may not exist"

requirements-completed: [BLOG-01, BLOG-02, BLOG-03]

duration: 6min
completed: 2026-02-23
---

# Phase 12 Plan 04: New & Rising + Phase 12 Documentation Summary

**Public New & Rising discovery page with two niche-signal views (begin_year recency + AVG tag rarity), curator filter, RSS feed, and full Phase 12 Curator / Blog Tools documentation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T15:03:26Z
- **Completed:** 2026-02-23T15:09:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `/new-rising` page with Newly Active + Gaining Traction tabs, curator filter via `?curator=` param, RSS button
- `/api/new-rising` JSON endpoint returns all three artist lists with independent try/catch resilience
- `/api/rss/new-rising` serves gaining-traction artists as RSS 2.0 or Atom 1.0 (format negotiated by `?format=atom` or Accept header)
- "New & Rising" added to web nav between Discover and Scenes
- `ARCHITECTURE.md` Curator / Blog Tools section: embed widgets, RSS feeds, attribution, New & Rising, anti-patterns table
- `docs/user-manual.md` Curator Tools section: user-facing docs for embedding, RSS, New & Rising, attribution

## Task Commits

1. **Task 1: New & Rising page + API endpoint + RSS feed** - `2274244` (feat)
2. **Task 2: Document Phase 12 in ARCHITECTURE.md and user-manual.md** - `91412e3` (docs)

## Files Created/Modified

- `src/routes/new-rising/+page.svelte` — Two-tab discovery page with curator filter tab
- `src/routes/new-rising/+page.server.ts` — D1 queries: newly active + gaining traction + curator artists
- `src/routes/api/new-rising/+server.ts` — JSON API endpoint with same three queries
- `src/routes/api/rss/new-rising/+server.ts` — RSS/Atom feed using `feed` package, gaining-traction query
- `src/routes/+layout.svelte` — New & Rising nav link added to web nav
- `ARCHITECTURE.md` — Curator / Blog Tools section (80+ lines) with anti-patterns table
- `docs/user-manual.md` — Curator Tools section + Web vs Desktop table updated

## Decisions Made

- **Web-first pattern**: `/new-rising` uses only `+page.server.ts` (no universal `+page.ts` load for Tauri). The niche-rarity signal requires D1 `tag_stats` data — Tauri users see empty state. Consistent with scenes page pattern.
- **begin_year proxy for recency**: `begin_year >= currentYear - 1` is an approximation for "recently active" since the artists table has no `added_at` column. Honest footnote added on page: "Artists active since [year], ordered by..."
- **RSS serves gaining-traction list**: The RSS feed at `/api/rss/new-rising` serves the Gaining Traction list (not Newly Active) — niche discovery is the more useful subscription signal for a blogger.
- **Independent try/catch per query**: All three queries independently try/caught. This means if `curator_features` doesn't exist on an older DB version, the other two lists still render correctly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Phase 12 complete. All four plans shipped:
- Plan 01: RSS/Atom feeds (artist, tag, collection, curator) + RssButton component
- Plan 02: Embed widgets at /embed/artist/[slug] and /embed/collection/[id]
- Plan 03: Curator attribution (curator_features D1 table, /api/curator-feature, artist page credits)
- Plan 04: New & Rising page + API + RSS + Phase 12 documentation

Phase 13 can reference the curator system freely — curator_features table documented, /new-rising?curator= URL pattern established.

## Self-Check: PASSED

- src/routes/new-rising/+page.svelte: FOUND
- src/routes/new-rising/+page.server.ts: FOUND
- src/routes/api/new-rising/+server.ts: FOUND
- src/routes/api/rss/new-rising/+server.ts: FOUND
- ARCHITECTURE.md contains "Curator / Blog Tools": FOUND
- docs/user-manual.md contains "Curator Tools": FOUND
- Commit 2274244: FOUND (feat - Task 1)
- Commit 91412e3: FOUND (docs - Task 2)
- npm run check: 0 errors
- npm run build: success

---
*Phase: 12-curator-blog-tools*
*Completed: 2026-02-23*
