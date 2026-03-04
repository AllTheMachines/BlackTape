---
phase: 35-rabbit-hole
plan: "01"
subsystem: database
tags: [sqlite, queries, svelte5, state, localStorage]

# Dependency graph
requires:
  - phase: 34-pipeline-foundation
    provides: tag_cooccurrence table, artist_tags table, similar_artists table — all queried by the new functions
provides:
  - Five Rabbit Hole query functions exported from src/lib/db/queries.ts
  - Trail history store with localStorage persistence at src/lib/rabbit-hole/trail.svelte.ts
affects:
  - 35-02 (landing page will use searchTagsAutocomplete, getRandomArtist)
  - 35-03 (artist card will use getRandomArtistByTag, getSimilarArtists)
  - 35-04 (genre page will use getRelatedTags, getArtistsByTagRandom)
  - 35-05 (trail breadcrumb will import trailState, pushTrailItem, jumpToTrailIndex)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Offset-based random selection: COUNT(*) then LIMIT 1 OFFSET random — avoids ORDER BY RANDOM() on large sets"
    - "CASE WHEN tag_a = ? THEN tag_b ELSE tag_a END — returns the 'other' tag from symmetric co-occurrence rows"
    - "$state at module level (Svelte 5 runes) for shared reactive state without Svelte stores"
    - "localStorage persistence mirrors queue.svelte.ts STORAGE_KEY pattern"

key-files:
  created:
    - src/lib/rabbit-hole/trail.svelte.ts
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "Offset-based random over ORDER BY RANDOM(): count first, then pick offset window — O(count) not O(n log n)"
  - "TRAIL_CAP=20 enforced by slice(-20) on push — oldest item dropped when cap exceeded"
  - "jumpToTrailIndex moves pointer only — subsequent items NOT removed (branching history, not stack truncation)"
  - "searchTagsAutocomplete uses LIKE 'query%' not FTS5 — tag_stats is a small lookup table, prefix LIKE is appropriate"
  - "getRandomArtist wrap-around: if near end of table, fallback to first tagged artist (no infinite loop risk)"

patterns-established:
  - "Rabbit Hole queries section added to queries.ts after World Map section — all Phase 35 queries grouped together"
  - "All five functions gracefully return [] or null in catch blocks — safe to call before full pipeline run"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 35 Plan 01: Rabbit Hole Data Layer Summary

**Five query functions (tag autocomplete, random artist, random-by-tag, related tags, tag-random artists) plus a localStorage-persisted Svelte 5 trail store for navigation history**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T14:03:05Z
- **Completed:** 2026-03-04T14:05:11Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Extended `src/lib/db/queries.ts` with five new exported async functions covering all Rabbit Hole data needs
- Created `src/lib/rabbit-hole/` directory and `trail.svelte.ts` — the Wave 1 shared state all Wave 2 UI plans will import
- All functions degrade gracefully (try/catch → [] or null) — safe before full pipeline run
- `npm run check` passes with 0 errors on both tasks; all 196 test suite assertions still pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add five query functions to queries.ts** - `89fd8962` (feat)
2. **Task 2: Create trail store (trail.svelte.ts)** - `d8e30954` (feat)

## Files Created/Modified
- `src/lib/db/queries.ts` — Added searchTagsAutocomplete, getRandomArtist, getRandomArtistByTag, getRelatedTags, getArtistsByTagRandom
- `src/lib/rabbit-hole/trail.svelte.ts` — New file: TrailItem type, trailState ($state), pushTrailItem, jumpToTrailIndex, loadTrail, clearTrail

## Decisions Made
- **Offset-based random selection** for all random-by-tag queries: COUNT(*) first, then LIMIT 1 OFFSET random_int. This avoids the `ORDER BY RANDOM()` full-sort pitfall noted in 35-RESEARCH.md, which is slow on 26M+ tag associations.
- **CASE WHEN in getRelatedTags**: tag_cooccurrence rows are symmetric (tag_a < tag_b alphabetically). The CASE WHEN always returns the tag that is NOT the queried tag, regardless of which column it lives in. Simpler than a UNION.
- **jumpToTrailIndex does not truncate**: Clicking a prior trail item moves `currentIndex` but leaves subsequent items intact. Future UI can show "you were here" with branching paths. The plan is explicit about this behavior.
- **TRAIL_CAP=20 via slice(-20)**: Pure functional approach — `[...items, newItem].slice(-TRAIL_CAP)` — no mutation, no index arithmetic.
- **`$state` at module level**: Svelte 5 runes work at module scope without a component context. No import needed — compiler macro.

## Deviations from Plan

None — plan executed exactly as written. The section comment above `getGeocodedArtists` had a wrong phase reference ("Phase 36") which was corrected to "Phase 34" as a trivial copy fix (not a deviation, just an inaccuracy in an existing comment).

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All five query functions ready for import: `import { searchTagsAutocomplete, getRandomArtist, getRandomArtistByTag, getRelatedTags, getArtistsByTagRandom } from '$lib/db/queries'`
- Trail store ready for import: `import { trailState, pushTrailItem, jumpToTrailIndex, loadTrail, clearTrail } from '$lib/rabbit-hole/trail.svelte'`
- Wave 2 plans (35-02 through 35-05) can proceed without any data layer gaps

---
*Phase: 35-rabbit-hole*
*Completed: 2026-03-04*
