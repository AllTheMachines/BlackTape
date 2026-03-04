# Phase 34: Pipeline Foundation - Research

**Researched:** 2026-03-04
**Domain:** SQLite precomputation pipeline, Wikidata SPARQL geocoding, MusicBrainz API caching
**Confidence:** HIGH (pipeline patterns), MEDIUM (Wikidata SPARQL at scale), HIGH (MB API)

---

## Summary

This phase adds three precomputed data layers to mercury.db and taste.db. All three follow established patterns already proven in this codebase:

**Workstream 1 — Similar Artists:** Pure SQLite computation using the existing `artist_tags` table. Jaccard similarity (intersection / union of tag sets) is the right formula — computable entirely in SQL using self-JOIN + aggregation. Scale concern: 2.6M artists could produce trillions of pairs, but the inverted-index pattern (only compare artists who share at least one tag) collapses the problem to a manageable candidate set. The `tag_cooccurrence` table already uses this exact approach as a blueprint.

**Workstream 2 — City Geocoding:** The codebase already contains a full working Wikidata SPARQL + geocoding pipeline in `build-genre-data.mjs`. The artist geocoding script is the artist-scale analog of that. Critical constraint: Wikidata SPARQL has a hard 60-second timeout per query, which means bulk-all-artists-at-once queries will fail. The approach must paginate or batch using `VALUES` clauses (50–100 MBIDs at a time). Fallback hierarchy: city → region → country centroid using the `city_precision` column.

**Workstream 3 — Track/Release Cache:** The existing `+page.ts` already fetches MB release-groups per artist on every page load (1 req/sec enforced). This workstream moves that fetch result into taste.db on first visit, making subsequent visits instant. The Rust side already has all the infrastructure (taste.db, Tauri commands, reqwest client). The new piece is: a cache table in taste.db, a Tauri command `get_or_cache_releases`, and a TS wrapper in the artist page load.

**Primary recommendation:** Implement all three as standalone `.mjs` pipeline scripts for the mercury.db workstreams (similar artists + geocoding) and as a new Tauri Rust command + taste.db table for the track cache. Follow existing patterns exactly — no new dependencies needed for any workstream.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Similar artists — scale & filtering:**
- Store top 10 similar artists per artist
- Filter weak matches — only store pairs above a meaningful overlap threshold (researcher picks specific threshold; e.g. ≥2 shared tags or Jaccard ≥ 0.1)
- Symmetric — if A→B is stored, B→A is always stored too
- Similarity score stored internally for ranking, not displayed to users
- Artists with no meaningful similarity get no similar list (empty section in Rabbit Hole, not forced filler)

**City geocoding — scope & storage:**
- Attempt to geocode all artists that have a country code (the full 2.6M)
- Wikidata SPARQL is the data source (MB area IDs → Wikidata → lat/lng + city name)
- Storage: add `city_lat`, `city_lng`, and `city_precision` columns directly to the `artists` table in mercury.db
- `city_precision` values: `'city'` | `'region'` | `'country'` — so World Map can render pins differently by confidence level
- Fallback for artists with no city-level Wikidata data: use country centroid (still appear on World Map, just at lower precision = `'country'`)
- Artists with no country code at all: null lat/lng, omitted from World Map

**Track/release caching:**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (already installed in pipeline/) | SQLite from Node.js pipeline scripts | Already used by build-tag-stats.mjs, import.js — no new dependency |
| rusqlite | (already in Cargo.toml) | SQLite from Rust (taste.db) | Already used by taste_db.rs — no new dependency |
| reqwest | (already in Cargo.toml) | HTTP client for MB API in Rust | Already used by enrichment.rs for MB API calls |
| Node.js fetch (built-in) | Node 18+ | HTTP for Wikidata SPARQL from pipeline scripts | Already used by build-genre-data.mjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | — | All computation is SQL + standard HTTP | All three workstreams use only what's already in the project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jaccard similarity | Cosine similarity over TF-IDF tag vectors | Jaccard is simpler, computable in pure SQL without external libs. Cosine requires float vector arithmetic, needs a JS library, and produces nearly identical ranking for tag overlap use cases. Use Jaccard. |
| Wikidata SPARQL | Nominatim geocoding (city name → lat/lng) | Nominatim does not know about MusicBrainz area UUIDs — requires intermediate city name lookup. Wikidata directly maps MB area GIDs to coordinates via P982. Build-genre-data.mjs already proved the SPARQL approach works. |
| On-demand fetch in Rust | Prefetch during pipeline build | Contradicts the locked decision: mercury.db ships lean, no MB API calls at build time. On-demand is correct. |

**Installation:** No new dependencies for any workstream.

---

## Architecture Patterns

### Recommended Project Structure
```
pipeline/
├── build-tag-stats.mjs          # existing — tag stats + tag_cooccurrence
├── build-similar-artists.mjs    # NEW — similar_artists table (follows same pattern)
├── build-geocoding.mjs          # NEW — city_lat/city_lng/city_precision on artists table

src-tauri/src/
├── ai/
│   ├── taste_db.rs              # existing — add track cache table to init_taste_db()
│   └── track_cache.rs           # NEW — get_or_cache_releases Tauri command

src/lib/db/
└── queries.ts                   # existing — add getSimilarArtists(), getGeocodedArtists()
```

### Pattern 1: Pipeline Script (Similar Artists)
**What:** Standalone .mjs script that connects to mercury.db and runs pure SQL — no external API calls, no new npm dependencies.
**When to use:** Any computation that is entirely self-contained in the existing data.

```javascript
// Source: pipeline/build-tag-stats.mjs (existing pattern — copy verbatim for structure)
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'mercury.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000');

// ... SQL computation ...
db.close();
console.log('Done.');
```

### Pattern 2: Alter-Table-Then-Update (Geocoding Columns)
**What:** Check if column exists before ALTER TABLE — idempotent, safe to re-run.
**When to use:** Adding precomputed columns to an existing large table.

```javascript
// Source: pipeline/build-tag-stats.mjs (uniqueness_score section — identical pattern)
const hasCol = db.prepare(
  "SELECT COUNT(*) as n FROM pragma_table_info('artists') WHERE name='city_lat'"
).get().n > 0;

if (!hasCol) {
  db.exec("ALTER TABLE artists ADD COLUMN city_lat REAL;");
  db.exec("ALTER TABLE artists ADD COLUMN city_lng REAL;");
  db.exec("ALTER TABLE artists ADD COLUMN city_precision TEXT;");
}
```

### Pattern 3: Wikidata SPARQL Batch Query
**What:** Fetch Wikidata entities in batches of 50 using VALUES clause to stay under the 60-second timeout. Build-genre-data.mjs already demonstrates the fetch pattern.
**When to use:** Any bulk Wikidata lookup by known entity IDs.

```javascript
// Source: pipeline/build-genre-data.mjs (fetchWikidataGenres pattern adapted for batches)
const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury; music discovery tool)';

async function fetchWikidataBatch(mbidBatch) {
  // P434 = MusicBrainz artist ID, P19 = place of birth, P625 = coordinate location
  // P17 = country, P131 = located in administrative entity (city/region fallback)
  const valuesClause = mbidBatch.map(id => `"${id}"`).join(' ');
  const sparql = `
    SELECT ?mbid ?lat ?lng ?cityLabel ?precision WHERE {
      VALUES ?mbid { ${valuesClause} }
      ?artist wdt:P434 ?mbid .
      OPTIONAL {
        ?artist wdt:P19 ?birthPlace .
        ?birthPlace wdt:P625 ?coord .
        ?birthPlace rdfs:label ?cityLabel .
        FILTER(LANG(?cityLabel) = "en")
        BIND("city" AS ?precision)
        BIND(geof:latitude(?coord) AS ?lat)
        BIND(geof:longitude(?coord) AS ?lng)
      }
      OPTIONAL {
        ?artist wdt:P27 ?country .
        ?country wdt:P625 ?countryCoord .
        BIND("country" AS ?precision)
        BIND(geof:latitude(?countryCoord) AS ?lat)
        BIND(geof:longitude(?countryCoord) AS ?lng)
      }
    }
  `;

  const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(sparql)}`;
  const resp = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT }
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data?.results?.bindings ?? [];
}
```

### Pattern 4: Jaccard Similarity via SQL Self-JOIN
**What:** Compute Jaccard coefficient between artist tag sets using SQL, avoiding O(n²) full pairs by exploiting the shared-tag inverted index.
**When to use:** Pairwise similarity over set membership stored in a join table.

```sql
-- Source: derived from tag_cooccurrence approach in build-tag-stats.mjs
-- Step 1: Find candidate pairs (artists sharing at least 1 tag)
-- Step 2: Compute intersection and union sizes
-- Step 3: Filter by Jaccard threshold + top-K per artist

-- Jaccard = |intersection| / |union| = shared_tags / (tags_a + tags_b - shared_tags)
-- Uses temp table approach same as uniqueness_score computation for speed

CREATE TEMP TABLE _artist_tag_counts AS
  SELECT artist_id, COUNT(*) as tag_count FROM artist_tags GROUP BY artist_id;
CREATE INDEX _atc_idx ON _artist_tag_counts(artist_id);

CREATE TABLE IF NOT EXISTS similar_artists (
  artist_id     INTEGER NOT NULL REFERENCES artists(id),
  similar_id    INTEGER NOT NULL REFERENCES artists(id),
  score         REAL NOT NULL,
  PRIMARY KEY (artist_id, similar_id)
);
DELETE FROM similar_artists;

-- Candidate pairs via shared tags, then Jaccard in one pass
INSERT OR REPLACE INTO similar_artists (artist_id, similar_id, score)
WITH candidates AS (
  SELECT
    t1.artist_id,
    t2.artist_id AS similar_id,
    COUNT(*) AS shared
  FROM artist_tags t1
  JOIN artist_tags t2
    ON t1.tag = t2.tag AND t1.artist_id < t2.artist_id
  GROUP BY t1.artist_id, t2.artist_id
  HAVING shared >= 2   -- threshold: adjust based on data distribution
),
scored AS (
  SELECT
    c.artist_id,
    c.similar_id,
    c.shared * 1.0 / (a1.tag_count + a2.tag_count - c.shared) AS jaccard
  FROM candidates c
  JOIN _artist_tag_counts a1 ON a1.artist_id = c.artist_id
  JOIN _artist_tag_counts a2 ON a2.artist_id = c.similar_id
  WHERE c.shared * 1.0 / (a1.tag_count + a2.tag_count - c.shared) >= 0.1
),
-- Top 10 per artist (both directions for symmetry)
ranked_forward AS (
  SELECT artist_id, similar_id, jaccard,
    ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY jaccard DESC) AS rn
  FROM scored
),
ranked_backward AS (
  SELECT similar_id AS artist_id, artist_id AS similar_id, jaccard,
    ROW_NUMBER() OVER (PARTITION BY similar_id ORDER BY jaccard DESC) AS rn
  FROM scored
)
SELECT artist_id, similar_id, jaccard FROM ranked_forward WHERE rn <= 10
UNION
SELECT artist_id, similar_id, jaccard FROM ranked_backward WHERE rn <= 10;
```

### Pattern 5: Tauri Command for On-Demand Cache (Rust)
**What:** Check taste.db cache → if miss, fetch from MB API → store → return. The existing enrichment.rs demonstrates the MB API call pattern.
**When to use:** Any on-demand network fetch that should be cached in taste.db.

```rust
// Source: pattern derived from enrichment.rs (MB API + taste_db.rs cache structure)
#[tauri::command]
pub async fn get_or_cache_releases(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<CachedRelease>, String> {
    // 1. Check cache
    let cached = {
        let conn = state.0.lock().map_err(|e| format!("Lock: {}", e))?;
        get_cached_releases(&conn, &artist_mbid)?
    };
    if !cached.is_empty() {
        return Ok(cached);
    }

    // 2. Fetch from MB API (1 req/sec — caller manages timing)
    let client = reqwest::Client::builder()
        .user_agent("Mercury/0.1.0 (https://github.com/user/mercury)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP: {}", e))?;

    let url = format!(
        "https://musicbrainz.org/ws/2/release-group?artist={}&inc=url-rels&type=album|single|ep&fmt=json&limit=100",
        artist_mbid
    );
    // ... fetch, parse, store in taste.db, return ...
}
```

### Anti-Patterns to Avoid
- **Full pairwise O(n²) Jaccard:** Never compute all pairs directly across 2.6M artists. The inverted-index approach (join on shared tag) collapses this to only pairs that actually share tags.
- **Single SPARQL query for all 2.6M artists:** Wikidata has a hard 60-second timeout. Any query touching all artists at once will fail. Always batch with VALUES clauses (50 per batch) and sleep 1100ms between requests.
- **Fetching MB API during pipeline build:** Contradicts the locked decision. mercury.db ships clean. MB track data goes in taste.db via on-demand fetch only.
- **Storing score as TEXT in similar_artists:** Score must be REAL for ORDER BY to work correctly. TEXT ordering of floats is wrong.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inverted index for tag overlap | Custom in-memory bitset or hash map | SQL self-JOIN on artist_tags (shared tag acts as natural inverted index) | SQLite handles this efficiently — already proven by tag_cooccurrence computation |
| Jaccard coefficient | Custom set library | Pure SQL arithmetic: shared / (a + b - shared) | No floating-point library needed — standard SQL arithmetic is sufficient |
| SPARQL pagination | Custom cursor management | Wikidata SPARQL + VALUES batching (50 per query) | Wikidata has no cursor — VALUES batching is the documented approach |
| HTTP rate limiting | Custom token bucket | `await sleep(1100)` between requests | MB API limit is 1 req/sec per IP, same as build-genre-data.mjs already does |
| taste.db table creation | Runtime migration checks | Add to `init_taste_db()` execute_batch (idempotent CREATE IF NOT EXISTS) | Every other taste.db table uses this pattern — it runs on every app start |

**Key insight:** All computation in this phase is achievable with SQL arithmetic and standard HTTP. No new npm packages or Rust crates are needed for any of the three workstreams.

---

## Common Pitfalls

### Pitfall 1: SPARQL Timeout on Full Artist Corpus
**What goes wrong:** Writing a SPARQL query that asks for all 2.6M artists' coordinates in one request. The query times out at 60 seconds with no data returned.
**Why it happens:** Wikidata SPARQL has a hard 60s per-query limit. Unfiltered artist queries join millions of Wikidata entities.
**How to avoid:** Batch using VALUES clauses — 50 MBIDs per query, 1100ms sleep between batches. Store results after each batch so progress is not lost on crash. This is exactly how build-genre-data.mjs handles scene geocoding.
**Warning signs:** SPARQL returns HTTP 200 with an error body mentioning "Query timeout."

### Pitfall 2: Jaccard Denominator of Zero
**What goes wrong:** Division by zero when `tag_count_a + tag_count_b - shared = 0`. This can only happen if both artists have zero tags each, which shouldn't pass the candidate filter — but defensive coding matters.
**Why it happens:** Artists with no tags in artist_tags still exist in artists table.
**How to avoid:** Pre-filter with `WHERE tag_count > 0` in the _artist_tag_counts temp table. Use `NULLIF(denominator, 0)` in the Jaccard division.

### Pitfall 3: Symmetry Not Stored
**What goes wrong:** Only storing A→B pairs from the scored set, not B→A. Rabbit Hole queries for "artists similar to B" return nothing even though B is in A's list.
**Why it happens:** The SQL candidate query uses `t1.artist_id < t2.artist_id` to avoid duplicates — necessary for performance, but means only one direction is naturally in the result.
**How to avoid:** Use UNION to insert both directions in the final INSERT (see Pattern 4 above). The locked decision requires symmetry.

### Pitfall 4: MB Rate Limit in Track Cache
**What goes wrong:** User opens 5 artist pages in quick succession; the on-demand cache fires 5 MB API requests simultaneously, triggering 503 rate limit errors.
**Why it happens:** MB API enforces 1 req/sec per IP. Concurrent Tauri async commands each fire immediately.
**How to avoid:** Use a simple in-memory flag or Mutex in the Tauri state to serialize MB fetches. If cache miss, check lock → if locked, wait then re-check cache (another command may have just fetched it). Alternatively, debounce at the TS layer before invoking.

### Pitfall 5: Wikidata P434 Coverage Gap
**What goes wrong:** Many MusicBrainz artists don't have corresponding Wikidata items with P434 (MusicBrainz artist ID). The SPARQL query returns nothing for them.
**Why it happens:** Wikidata coverage of MB artists is incomplete — only notable artists have Wikidata items.
**How to avoid:** This is expected and correct behavior. Artists with no Wikidata match get null lat/lng and are omitted from World Map. The fallback hierarchy (city → region → country centroid) only applies to artists that DO have Wikidata items but lack city-level data.

### Pitfall 6: similar_artists Table Missing Index
**What goes wrong:** `getSimilarArtists(artistId)` scans the entire table on every artist page load — slow at scale.
**Why it happens:** Forgetting to add an index on `artist_id` after INSERT.
**How to avoid:** Create index `idx_similar_artists_artist_id ON similar_artists(artist_id)` immediately after table creation, before any data INSERT.

### Pitfall 7: Pipeline Script Column Duplication on Re-Run
**What goes wrong:** Running `build-geocoding.mjs` twice causes "duplicate column name" error on ALTER TABLE.
**Why it happens:** ALTER TABLE fails if column already exists in SQLite.
**How to avoid:** Check `PRAGMA table_info('artists')` for column existence before ALTER TABLE. The build-tag-stats.mjs script already does this for `uniqueness_score` — use the identical guard.

---

## Code Examples

Verified patterns from existing codebase:

### Existing SPARQL Fetch Pattern (from build-genre-data.mjs)
```javascript
// Source: pipeline/build-genre-data.mjs lines 129-155
async function fetchWikidataGenres() {
  const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(SPARQL_QUERY)}`;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT
      }
    });
    if (!response.ok) {
      console.warn(`[Phase G] Wikidata returned HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data?.results?.bindings ?? [];
  } catch (err) {
    console.warn(`[Phase G] Wikidata unreachable: ${err.message}`);
    return [];
  }
}
```

### Existing Idempotent Column Add Pattern (from build-tag-stats.mjs)
```javascript
// Source: pipeline/build-tag-stats.mjs lines 66-70
const hasUniqueness = db.prepare(
  "SELECT COUNT(*) as n FROM pragma_table_info('artists') WHERE name='uniqueness_score'"
).get().n > 0;
if (!hasUniqueness) {
  db.exec("ALTER TABLE artists ADD COLUMN uniqueness_score REAL DEFAULT 0;");
}
```

### Existing MB API Call Pattern in Rust (from enrichment.rs)
```rust
// Source: src-tauri/src/enrichment.rs lines 96-100
let client = reqwest::Client::builder()
    .user_agent("BlackTape/0.3.0 (https://github.com/nicholasgasior/blacktape)")
    .timeout(Duration::from_secs(10))
    .build()
    .map_err(|e| format!("HTTP client error: {}", e))?;

// Rate limit enforcement: tokio::time::sleep(Duration::from_millis(1100)).await;
```

### Existing taste.db Table Creation Pattern (from taste_db.rs)
```rust
// Source: src-tauri/src/ai/taste_db.rs — init_taste_db() execute_batch
// Add new table to the existing execute_batch call — CREATE TABLE IF NOT EXISTS is idempotent
// New table for track cache:
CREATE TABLE IF NOT EXISTS release_group_cache (
    artist_mbid TEXT NOT NULL,
    release_group_mbid TEXT NOT NULL,
    title TEXT NOT NULL,
    release_type TEXT,          -- 'Album' | 'EP' | 'Single' | 'Other'
    first_release_year INTEGER,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (artist_mbid, release_group_mbid)
);
CREATE INDEX IF NOT EXISTS idx_rgc_artist ON release_group_cache(artist_mbid);
```

### Existing DbProvider Query Pattern (from queries.ts)
```typescript
// Source: src/lib/db/queries.ts — all query functions follow this pattern
export interface SimilarArtistResult {
    id: number;
    mbid: string;
    name: string;
    slug: string;
    score: number;
}

export async function getSimilarArtists(
    db: DbProvider,
    artistId: number,
    limit = 10
): Promise<SimilarArtistResult[]> {
    return db.all<SimilarArtistResult>(
        `SELECT a.id, a.mbid, a.name, a.slug, sa.score
         FROM similar_artists sa
         JOIN artists a ON a.id = sa.similar_id
         WHERE sa.artist_id = ?
         ORDER BY sa.score DESC
         LIMIT ?`,
        artistId,
        limit
    );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fetching releases on every artist page load (live MB API) | On-demand cache in taste.db (first visit only) | Phase 34 (this phase) | Artist page loads instantly on repeat visits |
| No artist similarity data | Precomputed top-10 similar artists in similar_artists table | Phase 34 (this phase) | Rabbit Hole feature becomes possible |
| No geocoordinates on artists | city_lat/city_lng/city_precision columns on artists table | Phase 34 (this phase) | World Map feature becomes possible |

**Existing analogs in codebase:**
- `uniqueness_score`: precomputed pipeline column on artists table — exact pattern for geocoding columns
- `tag_cooccurrence`: pairwise precomputed table from artist_tags — exact structural analog for `similar_artists`
- `artist_summaries`: on-demand computed data cached in taste.db — same caching philosophy as track cache

---

## Wikidata SPARQL Query Design (Researcher Recommendation)

The optimal SPARQL query for artist geocoding chains: MB artist ID (P434) → Wikidata entity → place of birth (P19) → coordinate location (P625). The city name comes from `rdfs:label` on the birth place entity.

**Precision hierarchy in one query:**
```sparql
SELECT ?mbid (SAMPLE(?lat) AS ?lat) (SAMPLE(?lng) AS ?lng)
       (SAMPLE(?cityName) AS ?cityName) (SAMPLE(?precisionVal) AS ?precisionVal)
WHERE {
  VALUES ?mbid { "mbid-1" "mbid-2" ... "mbid-50" }
  ?artist wdt:P434 ?mbid .
  OPTIONAL {
    ?artist wdt:P19 ?birthCity .
    ?birthCity wdt:P625 ?cityCoord .
    ?birthCity rdfs:label ?cityLabelRaw .
    FILTER(LANG(?cityLabelRaw) = "en")
    BIND(geof:latitude(?cityCoord) AS ?lat)
    BIND(geof:longitude(?cityCoord) AS ?lng)
    BIND(STR(?cityLabelRaw) AS ?cityName)
    BIND("city" AS ?precisionVal)
  }
  OPTIONAL {
    ?artist wdt:P27 ?country .
    ?country wdt:P625 ?countryCoord .
    BIND(geof:latitude(?countryCoord) AS ?lat)
    BIND(geof:longitude(?countryCoord) AS ?lng)
    BIND("country" AS ?precisionVal)
  }
}
GROUP BY ?mbid
```

**Batch strategy:** 50 MBIDs per VALUES clause. Sleep 1100ms between batches. Checkpoint progress to DB every 1000 artists so the script can resume after network failure.

---

## Similarity Threshold Recommendation

Based on the local mercury.db sample (10,000 artists, max 17 tags per artist, most having 5–12 tags):

**Recommended threshold:** Jaccard ≥ 0.15 AND shared_tags ≥ 2

Rationale:
- Jaccard ≥ 0.1 alone could include near-zero overlaps for artists with many tags (e.g., 1 shared tag out of 10 each = Jaccard 0.0909)
- shared_tags ≥ 2 eliminates coincidental single-tag matches (e.g., both tagged "rock" — too broad)
- Combined filter produces meaningful genre proximity without forcing spurious connections
- Artists with no qualifying pairs correctly get no similar list (satisfies locked decision)

At full 2.6M scale with ~672K artist-tag rows (extrapolated from sample), the SQL computation should complete in 5–15 minutes using the temp table approach.

---

## Open Questions

1. **Wikidata SPARQL batch size optimization**
   - What we know: 50 per batch is the recommended starting point from existing documentation
   - What's unclear: Whether the timeout is per-query CPU time or wall time, and whether artist-by-MBID queries are cheap enough to go higher (100–200)
   - Recommendation: Start at 50, test with 200 and monitor response times in the actual script

2. **Jaccard at full 2.6M artist scale**
   - What we know: The tag_cooccurrence approach scales well; the local sample has 724 artists with tags producing manageable output
   - What's unclear: Whether the self-JOIN on artist_tags at 35M+ rows (full DB) will complete in reasonable time or requires a two-pass approach
   - Recommendation: Test on the full DB after Phase F runs on full data. The HAVING shared >= 2 filter dramatically reduces candidates. If slow, add LIMIT to the candidate CTE or process in artist_id range batches.

3. **taste.db track cache schema: release_groups vs individual tracks**
   - What we know: The locked decision says "full release list + top tracks per release"
   - What's unclear: Whether to store JSON blobs per release or normalized rows per track
   - Recommendation: Use two tables — `release_group_cache` (one row per release group) and `release_track_cache` (one row per track, FK to release group). Normalized is queryable; JSON blobs would require parsing in Rust every time.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, pytest.ini, or test directories found |
| Config file | Wave 0 gap — needs creation |
| Quick run command | (none yet) |
| Full suite command | (none yet) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| (none provided) | similar_artists table populated with symmetric pairs | manual-only | Verify via SQLite query on mercury.db | No |
| (none provided) | Jaccard scores ≥ threshold for all stored pairs | manual-only | SQLite assertion query | No |
| (none provided) | city_lat/city_lng/city_precision columns on artists | manual-only | PRAGMA table_info check | No |
| (none provided) | release_group_cache hit on second artist page load | manual-only | Manual UI test + DB inspection | No |

Note: This phase is entirely infrastructure (pipeline scripts + Rust commands). Unit tests for SQL pipeline scripts are not standard in this codebase and would require spinning up an in-memory SQLite with fixture data. The most practical validation is: run the pipeline scripts against mercury.db and inspect output counts. The planner should include explicit SQLite verification steps in each task.

### Wave 0 Gaps
- [ ] No test framework configured — pipeline scripts are validated by inspecting DB row counts post-run
- [ ] Rust command unit tests not standard in this codebase (taste_db.rs has no tests)

*(Existing infrastructure: no test files detected for pipeline scripts or taste_db commands. Validation happens by running scripts and querying the DB.)*

---

## Sources

### Primary (HIGH confidence)
- `pipeline/build-tag-stats.mjs` (project codebase) — pipeline script pattern, tag_cooccurrence SQL approach
- `pipeline/build-genre-data.mjs` (project codebase) — Wikidata SPARQL fetch pattern, sleep-based rate limiting
- `src-tauri/src/ai/taste_db.rs` (project codebase) — taste.db init pattern, table creation idiom
- `src-tauri/src/enrichment.rs` (project codebase) — MB API call pattern in Rust, 1100ms rate limit
- `src/routes/artist/[slug]/+page.ts` (project codebase) — current MB release-group fetch format
- `src/lib/db/queries.ts` (project codebase) — DbProvider pattern for new query functions
- MusicBrainz API docs (https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) — 1 req/sec per IP confirmed, User-Agent required
- MusicBrainz API docs (https://musicbrainz.org/doc/MusicBrainz_API) — browse endpoint, limit=100, offset pagination

### Secondary (MEDIUM confidence)
- Wikidata properties confirmed: P434 (MusicBrainz artist ID), P19 (place of birth), P625 (coordinate location), P27 (country of citizenship) — from Wikidata property pages
- Wikidata SPARQL 60-second timeout — from multiple community sources (lists.wikimedia.org discussion threads, phabricator)
- VALUES clause batch approach for SPARQL under timeout constraint — from community discussions on wikidata-l

### Tertiary (LOW confidence)
- Jaccard threshold recommendation (≥0.15 AND ≥2 shared tags) — derived from inspection of local sample data, not tested on full 2.6M corpus. Flag for tuning during implementation.

---

## Metadata

**Confidence breakdown:**
- Similar artists pipeline: HIGH — pure SQL, existing pattern proven, no external dependencies
- City geocoding: MEDIUM — Wikidata SPARQL works (proven by build-genre-data.mjs) but batch sizing at 2.6M scale is untested
- Track/release cache: HIGH — Rust pattern proven in enrichment.rs, MB API behavior confirmed
- Threshold recommendation: LOW — needs empirical tuning on full corpus

**Research date:** 2026-03-04
**Valid until:** 2026-09-01 (Wikidata property IDs are stable; MB API rate limits rarely change)
