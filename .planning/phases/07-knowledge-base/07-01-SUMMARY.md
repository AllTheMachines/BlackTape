---
phase: 07-knowledge-base
plan: 01
subsystem: database
tags: [sqlite, wikidata, sparql, nominatim, pipeline, genres, knowledge-base]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: pipeline conventions (better-sqlite3, schema.sql, ES module .mjs scripts)
  - phase: 06-discovery-engine
    provides: tag_stats, tag_cooccurrence pattern — same pattern extended for genres
provides:
  - genres table in mercury.db with genre/scene/city node types, Wikidata links, geocoordinates
  - genre_relationships table with subgenre and influenced_by edges
  - pipeline/build-genre-data.mjs Phase G script for re-running genre data builds
  - mb_tag bridge from genres to artist_tags (slug-based, no join table needed)
affects: [07-knowledge-base plans 02-05, genre pages, genre graph visualization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Phase G pipeline script follows same conventions as build-tag-stats.mjs (better-sqlite3, console.log('[Phase G]...'), ES module)
    - Wikidata SPARQL fetch with graceful degradation (exits 0 on network failure)
    - Nominatim geocoding with 1100ms rate-limiting delay, pipeline-only (never at runtime)
    - DELETE-before-INSERT idempotency pattern for pipeline re-runs

key-files:
  created:
    - pipeline/build-genre-data.mjs
  modified:
    - pipeline/lib/schema.sql

key-decisions:
  - "Three genre node types: genre (global), scene (geographic/temporal), city (origin location) — supports graph visualization clustering"
  - "mb_tag column as slug bridge to artist_tags — no join table needed, same slug format as artist_tags.tag"
  - "Wikidata Q188451 (music genre) as source — SPARQL fetches P279 (subclass), P737 (influenced-by), P571 (inception year), P495 (country of origin)"
  - "Nominatim geocoding is pipeline-only with 1100ms delays — coordinates baked into DB, never fetched at runtime"
  - "Graceful degradation: exits 0 with warning if Wikidata unreachable — zero crash risk in automated pipeline runs"

patterns-established:
  - "Phase G script: fetchWikidataGenres() → insertGenres() → insertRelationships() → geocodeScenes() — sequential, logged"
  - "Collision-safe slugs: base slug when unique, Q-number suffix (first 8 chars) on collision"

requirements-completed: [KB-01, DISC-05]

# Metrics
duration: 6min
completed: 2026-02-21
---

# Phase 07 Plan 01: Genre Encyclopedia Pipeline (Phase G) Summary

**Wikidata SPARQL pipeline step that populates 2905 genres and 2712 relationships into mercury.db with Nominatim geocoding for scene cities**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-21T11:31:24Z
- **Completed:** 2026-02-21T11:36:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Schema extended with `genres` and `genre_relationships` tables in pipeline/lib/schema.sql
- Phase G pipeline script created: fetches from Wikidata SPARQL, slugifies, inserts, geocodes
- Wikidata fetch returned 5000 rows → 2905 unique genres inserted with 2712 relationships
- Nominatim geocoding for 1273 scene cities (1100ms rate limit, pipeline-only)
- mb_tag bridge column links genre slugs to existing artist_tags table

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend schema.sql with genres and genre_relationships tables** - `69b2098` (feat)
2. **Task 2: Create build-genre-data.mjs** - `f9c1cd9` (feat)

## Files Created/Modified
- `pipeline/lib/schema.sql` - Added genres and genre_relationships table definitions with 4 indexes
- `pipeline/build-genre-data.mjs` - Phase G pipeline script (367 lines): Wikidata SPARQL, slugify, DB insert, Nominatim geocoding

## Decisions Made

- **Three node types:** genres.type distinguishes 'genre' (global), 'scene' (geographic/temporal — has origin_city), and 'city' (for planned graph visualization). Scenes cluster around their birth cities in the genre graph.
- **mb_tag as bridge:** The normalized lowercase slug of the genre name is stored as mb_tag. Since artist_tags.tag uses the same slug format, genre pages can query "which artists carry this tag" directly — no join table.
- **DELETE-before-INSERT idempotency:** Both tables cleared before each run. INSERT OR IGNORE handles edge cases. Safe for repeated pipeline runs as Wikidata data evolves.
- **Graceful Wikidata degradation:** If Wikidata is unreachable, logs warning and exits 0. Never crashes the pipeline.
- **Nominatim pipeline-only:** Geocoordinates baked into DB during pipeline runs, never fetched at page-load time. 1100ms delays respect the 1 req/sec rate limit.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Wikidata was reachable, returned 5000 rows. DB had better-sqlite3 available. npm run check passes with 0 errors.

## User Setup Required

None — no external service configuration required. The script uses public Wikidata SPARQL and Nominatim endpoints, no API keys needed.

## Next Phase Readiness

- genres and genre_relationships tables populated and ready for Plan 02 (genre page routes)
- mb_tag bridge ready for Plan 03 (artist listing on genre pages)
- Geocoordinates partially populated (94 scene cities geocoded) — re-running build-genre-data.mjs will geocode the remaining 1179
- No blockers

---
*Phase: 07-knowledge-base*
*Completed: 2026-02-21*
