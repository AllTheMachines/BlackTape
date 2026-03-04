---
phase: 34-pipeline-foundation
plan: "04"
subsystem: database
tags: [sqlite, typescript, queries, similar-artists, geocoding, world-map, rabbit-hole]

# Dependency graph
requires:
  - phase: 34-01
    provides: similar_artists table (artist_id, similar_id, score) in mercury.db
  - phase: 34-02
    provides: city_lat, city_lng, city_precision columns on artists table in mercury.db
provides:
  - getSimilarArtists(db, artistId, limit?) — exported from src/lib/db/queries.ts, returns SimilarArtistResult[]
  - getGeocodedArtists(db, limit?) — exported from src/lib/db/queries.ts, returns GeocodedArtist[]
  - SimilarArtistResult interface — id, mbid, name, slug, score
  - GeocodedArtist interface — id, mbid, name, slug, country, tags, city_lat, city_lng, city_precision
affects:
  - 35-rabbit-hole (getSimilarArtists)
  - 36-world-map (getGeocodedArtists)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Graceful degradation: try/catch around queries for tables/columns that may not exist yet (pre-pipeline-run)"
    - "DbProvider abstraction: all new queries use db.all<T> via DbProvider interface"

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "Both functions degrade gracefully via try/catch returning [] when tables/columns don't exist — safe to call before pipeline has been run"
  - "getGeocodedArtists ORDER BY city_precision ASC sorts alphabetically: 'city' before 'country' before 'region' — frontend should sort by explicit precision rank if render order matters for z-index"
  - "GeocodedArtist.city_precision union type is 'city' | 'region' | 'country' — matches locked decision from Plan 02 ('none' sentinel excluded from query results by WHERE clause)"

patterns-established:
  - "Graceful degradation pattern: wrap queries against v1.7 pipeline tables in try/catch returning [] — allows app to run without full pipeline"

requirements-completed:
  - QUERY-FUNCTIONS

# Metrics
duration: 2min
completed: "2026-03-04"
---

# Phase 34 Plan 04: Query Functions Summary

**getSimilarArtists and getGeocodedArtists TypeScript query functions with graceful degradation for pre-pipeline state**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T12:39:53Z
- **Completed:** 2026-03-04T12:41:10Z
- **Tasks:** 2 (executed together — types in same section)
- **Files modified:** 1

## Accomplishments

- Added `SimilarArtistResult` and `GeocodedArtist` TypeScript interfaces to the Types section of queries.ts
- Added `getSimilarArtists(db, artistId, limit=10)` — JOINs similar_artists + artists, ordered by score DESC, try/catch degrades to []
- Added `getGeocodedArtists(db, limit=50000)` — queries artists WHERE city_precision IN ('city','region','country') AND lat/lng NOT NULL, try/catch degrades to []
- `npm run check` passes with 0 errors (20 pre-existing warnings unchanged)
- All 196 existing test suite checks pass

## Copy-Paste Ready: Function Signatures

```typescript
// Phase 35 (Rabbit Hole) — import this:
import { getSimilarArtists, type SimilarArtistResult } from '$lib/db/queries';

// Phase 36 (World Map) — import this:
import { getGeocodedArtists, type GeocodedArtist } from '$lib/db/queries';

// Usage:
const similar = await getSimilarArtists(db, artistId, 10);
// similar: SimilarArtistResult[] — [{id, mbid, name, slug, score}, ...]
// Returns [] if similar_artists table doesn't exist (pre-pipeline)

const mapped = await getGeocodedArtists(db, 50000);
// mapped: GeocodedArtist[] — [{id, mbid, name, slug, country, tags, city_lat, city_lng, city_precision}, ...]
// Returns [] if city_lat/city_lng columns don't exist (pre-pipeline)
```

## Copy-Paste Ready: Type Definitions

```typescript
/** Similar artist result from precomputed similar_artists table. */
export interface SimilarArtistResult {
    id: number;
    mbid: string;
    name: string;
    slug: string;
    score: number;  // Jaccard similarity score, 0.0–1.0
}

/** Artist with geocoordinates for World Map rendering. */
export interface GeocodedArtist {
    id: number;
    mbid: string;
    name: string;
    slug: string;
    country: string | null;
    tags: string | null;
    city_lat: number;
    city_lng: number;
    /**
     * Precision level:
     * - 'city'    = place-of-birth city coordinate (highest precision)
     * - 'region'  = administrative region/state coordinate (mid precision)
     * - 'country' = country centroid fallback (lowest precision)
     */
    city_precision: 'city' | 'region' | 'country';
}
```

## Table Requirements

- `getSimilarArtists` requires: `similar_artists` table in mercury.db (built by Plan 01 `pipeline/build-similar-artists.mjs`)
- `getGeocodedArtists` requires: `city_lat`, `city_lng`, `city_precision` columns on `artists` table (built by Plan 02 `pipeline/build-geocoding.mjs`)

## Notes for Downstream Phases

- `city_precision` union is exactly `'city' | 'region' | 'country'` — 'none' (confirmed no Wikidata match) is excluded by the WHERE clause
- `city_precision ASC` sorts alphabetically: 'city' < 'country' < 'region'. If World Map needs precision-ranked z-order, sort client-side using a rank map `{ city: 3, region: 2, country: 1 }`
- `getSimilarArtists` limit defaults to 10 (enough for a "You might also like" section), override for wider exploration
- `getGeocodedArtists` limit defaults to 50000 — enough to load the full mapped dataset in a single call for client-side map rendering

## Task Commits

Both tasks executed in a single consistent pass (types added to the same Types section simultaneously):

1. **Tasks 1+2: SimilarArtistResult, GeocodedArtist types + getSimilarArtists, getGeocodedArtists functions** - `4a002567` (feat)

**Plan metadata:** _(docs commit pending)_

## Files Created/Modified

- `src/lib/db/queries.ts` — added SimilarArtistResult interface, GeocodedArtist interface, getSimilarArtists function, getGeocodedArtists function (92 lines added)

## Decisions Made

- Both functions degrade gracefully via try/catch returning `[]` — consistent with the plan's requirement and safe to call before the pipeline has been run against the full 2.6M-artist DB
- Types placed in the existing `// Types` section with the other interfaces (before `parseSearchIntent`)
- Functions placed at end of file with phase-labeled section comments (`// Rabbit Hole queries` and `// World Map queries`)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Self-Check

- [x] `src/lib/db/queries.ts` exists and contains both functions
- [x] Commit `4a002567` exists
- [x] `npm run check` passed with 0 errors
- [x] All 196 test suite checks pass

## Self-Check: PASSED

## Next Phase Readiness

- Phase 35 (Rabbit Hole) can import `getSimilarArtists` and `SimilarArtistResult` from `$lib/db/queries`
- Phase 36 (World Map) can import `getGeocodedArtists` and `GeocodedArtist` from `$lib/db/queries`
- Both functions are safe to call before the full pipeline run (return empty arrays)
- No blockers.

---
*Phase: 34-pipeline-foundation*
*Completed: 2026-03-04*
