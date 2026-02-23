---
phase: 06-discovery-engine
plan: 02
subsystem: database
tags: [sqlite, typescript, queries, discovery, tag-intersection, crate-digging, style-map, uniqueness-score]

# Dependency graph
requires:
  - phase: 06-discovery-engine
    plan: 01
    provides: tag_stats and tag_cooccurrence tables in mercury.db (pre-computed at pipeline build time)
provides:
  - getPopularTags() — top tags by artist_count from tag_stats
  - getArtistsByTagIntersection() — AND logic multi-tag filter, niche-first ordering
  - getDiscoveryRankedArtists() — composite score ranking (rarity + recency + active)
  - getCrateDigArtists() — rowid-based random sampling with optional filters and wrap-around fallback
  - getArtistUniquenessScore() — per-artist uniqueness badge score (0–1000 scale)
  - getStyleMapData() — top-N tag nodes + co-occurrence edges for style map visualization
  - CrateFilters, StyleMapNode, StyleMapEdge, UniquenessResult TypeScript types
affects:
  - 06-discovery-engine (plans 3+ implement UI pages that call these query functions)
  - Any Discover page, crate dig page, style map visualization, artist uniqueness badge

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Rowid-based random sampling (a.id > randomStart) for fast crate digging on large tables
    - Wrap-around fallback pattern for random sampling near table end
    - Subquery-based IN filtering to avoid D1 bound parameter limits
    - Dynamic JOIN construction (one JOIN per tag) for AND-logic tag intersection
    - NULLIF + COALESCE guards for division-by-zero safety in scoring queries

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "Rowid-based random sampling for crate digging — O(limit) not O(total_rows), with wrap-around fallback for table end edge case"
  - "Subquery IN for style map edge filtering — avoids D1 bound parameter limits vs passing tag array as params"
  - "Tag intersection capped at 5 tags — D1 safety limit on bound parameters per query"

patterns-established:
  - "All discovery queries go through DbProvider — identical signatures work on D1 (web) and TauriProvider (desktop)"
  - "NULLIF(x, 0) for all division operations in scoring queries — prevents division-by-zero without CASE branching"
  - "Dynamic SQL construction (JOIN per tag) in getCrateDigArtists and getArtistsByTagIntersection — parameterized, not string-interpolated values"

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04]

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 6 Plan 02: Discovery Query Functions Summary

**Six new DbProvider query functions covering tag intersection browsing, discovery ranking, random crate digging with filters, artist uniqueness scoring, and style map data — all in queries.ts**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-20T22:38:58Z
- **Completed:** 2026-02-20T22:43:00Z
- **Tasks:** 2
- **Files modified:** 2 (src/lib/db/queries.ts, BUILD-LOG.md)

## Accomplishments

- Added six discovery query functions to queries.ts — the complete DB query layer for all Phase 6 discovery features
- Added four TypeScript types (CrateFilters, StyleMapNode, StyleMapEdge, UniquenessResult) for type-safe query results
- All queries work identically through DbProvider on both Cloudflare D1 (web) and TauriProvider (desktop)
- npm run check passes with 0 errors, 0 warnings across 349 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tag intersection and discovery ranking queries** - `558eb3e` (feat)
2. **Task 2: Add crate digging, uniqueness score, and style map queries** - `953d942` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified

- `src/lib/db/queries.ts` — Added 4 types + 6 async functions (259 lines added)
- `BUILD-LOG.md` — Entry 023 documenting decisions and verification results

## Decisions Made

- **Rowid-based random sampling for crate digging:** `ORDER BY RANDOM()` scans the entire table. `a.id > randomStart` reads only the tail — effectively O(limit) not O(total_rows). Wrap-around fallback fills remaining slots when random position lands near the end of the ID space.

- **Subquery IN for style map edges:** Passing top-N tag names as bound params would hit D1 parameter limits at tagLimit >= 100. Using `IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)` keeps it to a single param, DB-side filtering handles the rest.

- **Tag intersection capped at 5:** D1 has bound parameter limits. Dynamically building one JOIN per tag is safe up to 5 — adequate for practical multi-tag filtering, documented in code.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All six discovery query functions ready and type-checked
- Phase 6 Plan 3 (Discover page UI — tag browser, intersection results) can proceed immediately
- getStyleMapData() ready for the style map visualization plan
- getCrateDigArtists() ready for crate digging UI plan
- getArtistUniquenessScore() ready to be wired into the artist page badge

## Self-Check: PASSED

- src/lib/db/queries.ts: FOUND
- 06-02-SUMMARY.md: FOUND
- commit 558eb3e: FOUND
- commit 953d942: FOUND

---
*Phase: 06-discovery-engine*
*Completed: 2026-02-20*
