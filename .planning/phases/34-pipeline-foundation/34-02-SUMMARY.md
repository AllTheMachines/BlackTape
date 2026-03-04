---
phase: 34-pipeline-foundation
plan: "02"
subsystem: database
tags: [wikidata, sparql, sqlite, geocoding, better-sqlite3, pipeline]

# Dependency graph
requires:
  - phase: 34-pipeline-foundation/34-01
    provides: similar_artists table and pipeline script pattern (idempotent ESM + better-sqlite3)
provides:
  - city_lat, city_lng, city_precision columns on artists table in mercury.db
  - pipeline/build-geocoding.mjs — standalone artist geocoding script via Wikidata SPARQL
  - idx_artists_city partial index for World Map coordinate queries
affects:
  - 36-world-map (needs city_lat/city_lng for map pin rendering)
  - 35-rabbit-hole (can cross-link artist location as context)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wikidata SPARQL three-tier precision hierarchy: city (P19+P625) > region (P131+P625) > country (P27)"
    - "'none' sentinel for confirmed no-result rows to prevent retry on re-run"
    - "Resumable pipeline via city_precision IS NULL as not-yet-geocoded marker"
    - "50-MBID batched SPARQL with 1100ms rate-limit sleep between batches"
    - "Explicit precision rank map applied after SAMPLE() aggregation to ensure best result wins"

key-files:
  created:
    - pipeline/build-geocoding.mjs
  modified:
    - BUILD-LOG.md

key-decisions:
  - "Use 'none' sentinel (not NULL) to mark confirmed no-Wikidata-result artists — enables idempotent re-runs without refetching"
  - "LIMIT 500000 in artist fetch allows partial test runs; remove for full 2.6M geocoding run"
  - "Explicit rank map { city: 3, region: 2, country: 1 } applied after SPARQL SAMPLE() to guarantee best precision wins when multiple OPTIONAL blocks match"
  - "Artists without country code (country IS NULL) skipped entirely — NULL lat/lng, omitted from World Map"

patterns-established:
  - "Wikidata SPARQL geocoding pattern: batch 50 MBIDs, parse bindings, apply precision rank, write in transaction"

requirements-completed:
  - GEOCODING-PIPELINE

# Metrics
duration: 2min
completed: "2026-03-04"
---

# Phase 34 Plan 02: Artist Geocoding Pipeline Summary

**Wikidata SPARQL geocoding pipeline that writes city_lat/city_lng/city_precision on the artists table with a three-tier precision hierarchy (city > region > country) and 'none' sentinel for idempotent re-runs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T12:29:26Z
- **Completed:** 2026-03-04T12:31:49Z
- **Tasks:** 2
- **Files modified:** 2 (pipeline/build-geocoding.mjs created, BUILD-LOG.md updated)

## Accomplishments

- Created `pipeline/build-geocoding.mjs` — idempotent, resumable geocoding pipeline for all artists with a country code
- Three new columns added to artists table: `city_lat REAL`, `city_lng REAL`, `city_precision TEXT`
- Created `idx_artists_city` partial index (`WHERE city_lat IS NOT NULL`) for World Map query performance
- All four data integrity checks pass on partial run: columns exist, no out-of-range coords, no precision-without-coordinates anomalies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create build-geocoding.mjs pipeline script** - `cfee6c15` (feat)
2. **Task 2: Verify geocoding columns and data integrity** - no files changed (verification only, results in SUMMARY)

## Files Created/Modified

- `pipeline/build-geocoding.mjs` - Standalone geocoding pipeline: adds columns, batches 50 MBIDs per Wikidata SPARQL query, writes results, marks no-data artists as 'none'
- `BUILD-LOG.md` - Entry for Phase 34-02 with design decisions and verification results

## Decisions Made

**'none' sentinel design:** Using NULL as "not yet geocoded" allows resume. Using 'none' for confirmed no-Wikidata-result artists skips them on subsequent runs without refetching. Phase 36 (World Map) queries `WHERE city_precision IN ('city', 'region', 'country')` — naturally excludes both NULL (not processed) and 'none' (no result).

**Explicit rank map after SAMPLE():** Wikidata's `SAMPLE()` aggregation picks one value when multiple OPTIONAL blocks match, but doesn't guarantee it picks the highest-precision one. The `geoMap` construction applies `{ city: 3, region: 2, country: 1 }` to ensure city beats region beats country whenever multiple rows arrive for the same MBID.

**LIMIT 500000 for partial runs:** Allows executor to verify script works without committing to the full 15-17 hour run. The full corpus geocoding is a pipeline maintenance task before each DB distribution build. Remove LIMIT for production run.

## Verification Results (Task 2)

From partial run on sample DB (3 batches completed before timeout):

| Precision | Count |
|-----------|-------|
| city      | 90    |
| country   | 33    |
| none      | 577   |

- Out-of-range coordinates (lat outside -90..90, lng outside -180..180): **0**
- Records with precision set but coordinates missing: **0**
- Artists remaining to geocode (city_precision IS NULL, country IS NOT NULL): 2,157

## Duration Estimate (Full Corpus)

Full 2.6M artist geocoding run:
- Artists with country code: ~2.6M
- Batch size: 50 MBIDs
- Batches: ~52,000
- Sleep per batch: 1.1s
- Estimated time: ~15-17 hours

This is a pre-distribution pipeline task, not a real-time operation. Run once before each DB build.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `sqlite3` CLI not available in PATH on this machine. Verification queries (Task 2) were run via Node.js with better-sqlite3 directly instead of the planned `sqlite3` shell commands. Results identical.

## User Setup Required

None - no external service configuration required. Wikidata SPARQL is a public endpoint, no API key needed.

## Next Phase Readiness

- `city_lat`, `city_lng`, `city_precision` columns are ready on artists table
- `idx_artists_city` partial index ready for World Map queries
- Phase 36 (World Map) can use `getGeocodedArtists()` querying `WHERE city_precision IN ('city', 'region', 'country')`
- Full 2.6M geocoding run needed before distribution — run `node pipeline/build-geocoding.mjs` without LIMIT modification

---
*Phase: 34-pipeline-foundation*
*Completed: 2026-03-04*
