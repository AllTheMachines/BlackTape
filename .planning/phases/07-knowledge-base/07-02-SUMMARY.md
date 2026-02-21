---
phase: 07-knowledge-base
plan: 02
subsystem: database
tags: [sqlite, typescript, queries, genre-graph, knowledge-base, dbprovider]

# Dependency graph
requires:
  - phase: 07-knowledge-base
    plan: 01
    provides: genres and genre_relationships tables in mercury.db with 2905 genres and 2712 relationships
  - phase: 06-discovery-engine
    provides: DbProvider interface pattern, ArtistResult type, artist_tags table with count column
provides:
  - getGenreSubgraph (centered subgraph query for genre graph expansion)
  - getGenreBySlug (full genre record for genre page server load)
  - getGenreKeyArtists (artists bridged via mb_tag → artist_tags)
  - getArtistsByYear (Time Machine year filter with optional tag filter)
  - getStarterGenreGraph (taste-personalized or top-connected starter graph)
  - getAllGenreGraph (full graph dump for GenreGraphEvolution animation)
  - GenreNode, GenreEdge, GenreGraph TypeScript interfaces
affects: [07-knowledge-base plans 03-05, genre pages, time machine, genre graph components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - All genre queries follow existing DbProvider + spread params pattern (same as searchArtists, getStyleMapData)
    - ArtistResult type reused for artist results — no new artist types created
    - Dynamic IN-clause placeholder generation (centerIds.map(() => '?').join(', ')) for variable-length arrays

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "getGenreKeyArtists uses at2.count (not at2.votes) to match actual artist_tags schema — plan spec had wrong column name"
  - "getStarterGenreGraph: taste tags matched against mb_tag column (slug bridge from genres to artist_tags), falls back to top-connected genres by genre_relationships count"
  - "getAllGenreGraph has no WHERE filter — full dump so client can animate evolution by inception_year client-side"
  - "getArtistsByYear uses conditional branch (tag present / absent) rather than dynamic WHERE to keep queries readable and avoid null parameter confusion"

patterns-established:
  - "Genre graph queries return GenreGraph { nodes, edges } — consistent shape usable by D3/force graph components"
  - "Subgraph expansion: center lookup first, then neighbor JOIN on genre_relationships, then edge query — three sequential DB calls"

requirements-completed: [KB-01, KB-02, DISC-05, DISC-06]

# Metrics
duration: 1min
completed: 2026-02-21
---

# Phase 07 Plan 02: Genre Query Functions Summary

**Six genre graph query functions (getGenreSubgraph, getGenreBySlug, getGenreKeyArtists, getArtistsByYear, getStarterGenreGraph, getAllGenreGraph) plus GenreNode/GenreEdge/GenreGraph interfaces appended to queries.ts**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-21T11:40:12Z
- **Completed:** 2026-02-21T11:41:44Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Three new TypeScript interfaces (GenreNode, GenreEdge, GenreGraph) added to the types section of queries.ts
- Six new query functions added under a "Genre graph queries (Phase 7)" section header
- All functions follow DbProvider + spread params pattern — no direct D1/SQLite imports
- getGenreKeyArtists bug fixed: plan spec used `at2.votes` but actual artist_tags schema uses `count`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add genre graph queries to queries.ts** - `8b67b07` (feat)

## Files Created/Modified
- `src/lib/db/queries.ts` - Added GenreNode, GenreEdge, GenreGraph interfaces and 6 genre query functions (239 lines added)

## Decisions Made

- **`at2.count` not `at2.votes`:** The plan spec specified `ORDER BY at2.votes DESC` in getGenreKeyArtists, but artist_tags table uses `count` column (per schema.sql). Auto-fixed under Rule 1.
- **getStarterGenreGraph fallback logic:** When no taste tags provided or none match genres.mb_tag, queries genre_relationships for most-connected from_id values — genres with the most outgoing edges are likely the "root" genres of major branches.
- **getAllGenreGraph no-filter design:** Full table dump with ORDER BY inception_year ASC NULLS LAST so the client receives genres in chronological order, ready for an animation sweep from earliest to latest.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong column name in getGenreKeyArtists ORDER BY**
- **Found during:** Task 1 (verifying schema against plan spec)
- **Issue:** Plan specified `ORDER BY at2.votes DESC` but artist_tags schema uses column `count`, not `votes`. This would have caused a SQL error at runtime.
- **Fix:** Changed `at2.votes` to `at2.count` to match actual schema
- **Files modified:** src/lib/db/queries.ts
- **Verification:** npm run check passes 0 errors; column name confirmed against pipeline/lib/schema.sql
- **Committed in:** 8b67b07 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — wrong column name)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered

None. TypeScript check passed with 0 errors (3 pre-existing warnings in crate page, unrelated to this plan).

## User Setup Required

None — no external service configuration required. Query functions are pure TypeScript additions.

## Next Phase Readiness

- All 6 genre query functions available for import by Phase 7 routes and components
- GenreNode/GenreEdge/GenreGraph types exportable for use in Svelte component props
- getGenreKeyArtists ready to bridge genre mb_tag → artist_tags for genre page artist listings
- getArtistsByYear ready for Time Machine page
- No blockers

---
*Phase: 07-knowledge-base*
*Completed: 2026-02-21*
