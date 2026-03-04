# Phase 34: Pipeline Foundation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Precompute data into the SQLite DB that Phase 35+ (Rabbit Hole, World Map) will query:
1. Similar artists — precompute tag-overlap similarity for all artists
2. City geocoding — Wikidata SPARQL to get city-level lat/lng for all artists
3. Track/release caching layer — store MB track data in taste.db after first fetch

Creating the Rabbit Hole UI, World Map, or any artist navigation UI is out of scope for this phase. This phase is infrastructure only.

</domain>

<decisions>
## Implementation Decisions

### Similar artists — scale & filtering
- Store top 10 similar artists per artist
- Filter weak matches — only store pairs above a meaningful overlap threshold (researcher picks specific threshold; e.g. ≥2 shared tags or Jaccard ≥ 0.1)
- Symmetric — if A→B is stored, B→A is always stored too
- Similarity score stored internally for ranking, not displayed to users
- Artists with no meaningful similarity get no similar list (empty section in Rabbit Hole, not forced filler)

### City geocoding — scope & storage
- Attempt to geocode all artists that have a country code (the full 2.6M)
- Wikidata SPARQL is the data source (MB area IDs → Wikidata → lat/lng + city name)
- Storage: add `city_lat`, `city_lng`, and `city_precision` columns directly to the `artists` table in mercury.db
- `city_precision` values: `'city'` | `'region'` | `'country'` — so World Map can render pins differently by confidence level
- Fallback for artists with no city-level Wikidata data: use country centroid (still appear on World Map, just at lower precision = `'country'`)
- Artists with no country code at all: null lat/lng, omitted from World Map

### Track/release caching
- Cache location: `taste.db` (user-specific DB, keeps mercury.db a clean distributed artifact)
- Strategy: purely on-demand — first visit to an artist page fetches from MusicBrainz API and caches; subsequent visits are instant
- No pre-seeding in pipeline — mercury.db ships lean, no MB API calls during build
- No expiry — cached data persists forever (MB track lists change slowly; simplest implementation)
- Cache scope: full release list + top tracks per release (supports both Rabbit Hole preview and full discography views)

### Claude's Discretion
- Exact similarity scoring formula (Jaccard coefficient, weighted overlap, or cosine — researcher to evaluate and recommend)
- Specific overlap threshold for filtering weak matches
- Pipeline script structure (standalone scripts following build-tag-stats.mjs pattern, or integrated steps)
- Wikidata SPARQL query design and rate limiting
- taste.db schema for the track cache table(s)
- Handling of MB API rate limits (1 req/sec) for the on-demand cache

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline/build-tag-stats.mjs` — standalone pipeline script pattern; new similar_artists and geocoding scripts should follow the same pattern (connect to pipeline/data/mercury.db, run SQL, log progress)
- `tools/compute-uniqueness.mjs` — adds a precomputed column to the artists table (uniqueness_score); geocoding columns (city_lat, city_lng, city_precision) follow the same alter-table-then-update pattern
- `src/lib/db/queries.ts` — all DB queries follow the DbProvider interface; new similar artist and World Map queries will extend this file

### Established Patterns
- Precomputed columns on `artists` table: `uniqueness_score` already exists as a precomputed pipeline output. Geocoding columns follow the same pattern.
- `tag_cooccurrence` table: tag-to-tag similarity with shared_artists count. The `similar_artists` table is the artist-to-artist analog.
- `taste.db`: already used for AI summaries, taste profiles, embeddings. Track cache goes here alongside existing user-specific data.
- Pipeline phase structure: import.js handles the main MB data import; standalone enhancement scripts (build-tag-stats.mjs, compute-uniqueness.mjs) run after and enhance the DB. Similar artists and geocoding fit this pattern.

### Integration Points
- `pipeline/data/mercury.db` — receives new columns (city_lat, city_lng, city_precision) and new table (similar_artists)
- `taste.db` — receives new track cache table(s)
- `src/lib/db/queries.ts` — new query functions for: get similar artists by artist ID, get artists with geocoordinates (for World Map), get cached tracks (from taste.db)
- Phase 35 (Rabbit Hole) will call getSimilarArtists(artistId) → expects similar_artists table populated
- Phase 36 (World Map) will call getGeocodedArtists() → expects city_lat/city_lng/city_precision columns populated

</code_context>

<specifics>
## Specific Ideas

No specific implementation references from discussion — all three workstreams use standard patterns from the existing pipeline.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 34-pipeline-foundation*
*Context gathered: 2026-03-04*
