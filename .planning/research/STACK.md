# Stack Research

**Domain:** v1.7 The Rabbit Hole -- unified discovery redesign for existing Tauri 2.0 desktop music search engine
**Researched:** 2026-03-03
**Confidence:** HIGH (SvelteKit navigation patterns, SQLite tag similarity, Leaflet clustering), MEDIUM (Wikidata SPARQL geocoding coverage for artists), LOW (exact Wikidata query timeout behavior at scale)

---

## Context: What Already Exists (Do Not Re-Add)

This is a subsequent-milestone document. Everything below is already installed and working.

| Already Present | Version | Notes |
|-----------------|---------|-------|
| SvelteKit (Svelte 5) | `^5.49.2` | Runes, snippets, `$derived`, `$state`, `$effect` |
| Tauri 2.0 | `^2.10.0` | Rust backend, WebView2, IPC |
| `@tauri-apps/plugin-sql` | `^2.3.2` | SQLite for mercury.db + taste.db |
| `leaflet` | `^1.9.4` | Already used in `SceneMap.svelte` (dynamic import) |
| `@types/leaflet` | `^1.9.21` | TypeScript types for Leaflet |
| `paneforge` | `^1.0.2` | Resizable panel layout (three-pane in `PanelLayout.svelte`) |
| `d3-force` | `^3.0.0` | Graph visualizations (being retired for Rabbit Hole, code stays) |
| `idb` | `^8.0.3` | IndexedDB wrapper (used for Nostr keypair storage) |
| `better-sqlite3` | in pipeline | Pipeline uses this for offline DB building |
| `$app/navigation` | SvelteKit | `goto()`, `invalidateAll()` already in use |
| `history.back()` | DOM API | Already in layout back button |
| AI engine | llama.cpp sidecar | Qwen2.5 3B + Nomic Embed, taste.db for embeddings |
| reqwest | `^0.12` Rust | HTTP client in Rust backend |
| Cloudflare Workers | D1 API | Artist claim backend, discovery DB API |
| `src/lib/embeds/` | -- | Spotify, YouTube, SoundCloud, Bandcamp embed handling |
| `src/lib/player/` | -- | Complete player module with queue management |

---

## New Stack Additions for v1.7

### 1. Tag-Based Artist Similarity (Pipeline)

**Technology:** Pure SQL in `better-sqlite3` pipeline -- no new dependencies

**Algorithm: TF-IDF Weighted Jaccard**

Use TF-IDF weighted Jaccard similarity, not raw Jaccard or simple co-occurrence. Rationale:

- **Raw Jaccard** (`|A intersection B| / |A union B|`) treats all tags equally. Two artists sharing "rock" and "electronic" (common tags applied to 500K+ artists) score the same as two sharing "shoegaze" and "dreampop" (niche tags on ~2K artists each). This is useless for discovery.
- **Simple co-occurrence count** has the same problem -- dominated by popular tags.
- **TF-IDF weighted Jaccard** weights each tag by `log(N / df)` where N = total artists and df = number of artists with that tag. Sharing a rare tag like "witch house" contributes far more than sharing "rock." This aligns with BlackTape's core value: uniqueness is rewarded.

**Implementation approach (all in SQL + pipeline JS):**

```sql
-- Step 1: Precompute IDF weights (already have tag_stats with artist_count)
-- IDF = ln(total_artists / artist_count) for each tag

-- Step 2: For each artist pair sharing tags, compute weighted similarity:
-- weighted_jaccard = SUM(min(w_a, w_b)) / SUM(max(w_a, w_b))
-- where w = tag_count * idf_weight for each shared tag

-- Step 3: Store top 20 similar artists per artist
CREATE TABLE IF NOT EXISTS similar_artists (
  artist_id INTEGER NOT NULL,
  similar_id INTEGER NOT NULL,
  score REAL NOT NULL,
  shared_tags TEXT,  -- comma-separated shared tags for display
  PRIMARY KEY (artist_id, similar_id)
);
CREATE INDEX IF NOT EXISTS idx_similar_artist ON similar_artists(artist_id, score DESC);
```

**Why 20 per artist:** The Rabbit Hole shows 5-10 similar artists per page. 20 gives enough depth for pagination and randomization without bloating the DB. At 2.6M artists, even if only 500K have enough tags for meaningful similarity, that is 10M rows -- roughly 200-400MB. Acceptable for a desktop app DB.

**Performance note:** The pairwise comparison across 2.6M artists is O(n^2) if done naively. The pipeline must filter: only compare artists with >= 3 tags, and only consider pairs that share at least 1 tag (use the existing `artist_tags` join). This brings it down to millions of pairs, not trillions. Batch in transactions of 50K rows. Expected pipeline runtime: 10-30 minutes on the full dataset.

**Confidence:** HIGH -- this is standard information retrieval math, runs in existing SQLite pipeline, no new dependencies.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SQL in `better-sqlite3` | (existing) | Precompute TF-IDF weighted Jaccard similarity | Zero new dependencies; runs in existing pipeline; IDF weighting critical for niche-first discovery |

---

### 2. Leaflet Marker Clustering (World Map)

**Technology:** `leaflet.markercluster` v1.5.3 + `@types/leaflet.markercluster` v1.5.6

The World Map needs to display thousands of artist/scene pins that cluster when zoomed out and expand when zoomed in. Leaflet.markercluster is THE standard plugin for this -- maintained by the Leaflet organization itself, compatible with Leaflet 1.9.x.

**Why this specific plugin:**
- Official Leaflet ecosystem plugin (not a random fork)
- Handles 50K+ markers with smooth animated clustering
- Spiderfying for overlapping markers at close zoom
- Custom cluster icons (can style with BlackTape's amber/dark theme)
- Stable at 1.5.3 (last release 2022, but Leaflet 1.x itself is equally stable -- both are mature, not abandoned)

**Integration with existing SceneMap.svelte:**
The existing `SceneMap.svelte` already does dynamic `import('leaflet')` (correct for SSR avoidance in Tauri). The World Map component will follow the same pattern and additionally import markercluster:

```typescript
const L = (await import('leaflet')).default;
await import('leaflet.markercluster');
// L.markerClusterGroup() is now available on L
```

**CSS loading:** The existing pattern loads Leaflet CSS via a dynamically inserted `<link>` tag. MarkerCluster needs two additional CSS files (`MarkerCluster.css` and `MarkerCluster.Default.css`). Override `MarkerCluster.Default.css` with custom dark-theme cluster styles instead of loading the default blue/green.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `leaflet.markercluster` | `1.5.3` | Cluster city/artist pins on World Map | Official Leaflet plugin; handles 50K+ markers; animated cluster/expand |
| `@types/leaflet.markercluster` | `1.5.6` | TypeScript types for markercluster | DefinitelyTyped maintained; matches 1.5.x |

**Confidence:** HIGH -- Leaflet.markercluster is the de facto standard. Version 1.5.3 with Leaflet 1.9.4 is a well-tested combination.

---

### 3. Wikidata SPARQL for Artist City Geocoding (Pipeline)

**Technology:** HTTP fetch to `https://query.wikidata.org/sparql` -- no new dependencies

The pipeline already queries Wikidata SPARQL for genre data (`build-genre-data.mjs`). The same pattern extends to artist geocoding. Key Wikidata properties:

| Property | Description | Use |
|----------|-------------|-----|
| `P434` | MusicBrainz artist ID | Join Wikidata items to our artist MBIDs |
| `P19` | Place of birth | Primary source for artist origin city |
| `P740` | Location of formation | For bands (formed in city X) |
| `P625` | Coordinate location | Get lat/lng from the city entity |

**SPARQL query pattern:**

```sparql
SELECT ?mbid ?cityLabel ?lat ?lng WHERE {
  ?item wdt:P434 ?mbid .          # Has MusicBrainz artist ID
  { ?item wdt:P19 ?city }         # Place of birth
  UNION
  { ?item wdt:P740 ?city }        # OR location of formation
  ?city wdt:P625 ?coords .        # City has coordinates
  BIND(geof:latitude(?coords) AS ?lat)
  BIND(geof:longitude(?coords) AS ?lng)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
```

**Critical constraints:**
- **Wikidata SPARQL has a 60-second query timeout.** A single query for all 2.6M artists will fail. Must batch.
- **Rate limit:** Be polite. The existing pipeline uses `USER_AGENT` and delays. Follow the same pattern.
- **Coverage:** Not all 2.6M artists have Wikidata entries. Estimate ~200K-400K artists have P434 on Wikidata. Of those, maybe 60-80% have P19 or P740 with geocoded cities. Expected yield: ~150K-300K artists with city-level coordinates.
- **Batching strategy:** Query in batches of 500-1000 MBIDs using `VALUES ?mbid { "mbid1" "mbid2" ... }` clause. Process all 2.6M MBIDs in ~3000-5000 batches with 2-second delays between requests. Total pipeline time: ~2-3 hours.

**Schema addition:**

```sql
-- Add to artists table (migration in pipeline)
ALTER TABLE artists ADD COLUMN origin_city TEXT;
ALTER TABLE artists ADD COLUMN origin_lat REAL;
ALTER TABLE artists ADD COLUMN origin_lng REAL;
```

**Why not Nominatim (like genre geocoding)?** The genre pipeline uses Nominatim to geocode scene city names. For artists, Wikidata gives us coordinates directly via P625 on the birth city entity. No need for a second geocoding step. Simpler and avoids Nominatim's 1 req/sec rate limit on 300K lookups.

**Confidence:** MEDIUM -- the SPARQL query pattern is well-documented and the existing pipeline proves it works. Coverage estimate is uncertain; could be higher or lower. Pipeline should log coverage stats.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Wikidata SPARQL endpoint | N/A (HTTP API) | Geocode artist origin cities via MBID lookup | Already proven in genre pipeline; direct coordinates via P625; no new dependencies |

---

### 4. SvelteKit Navigation for Rabbit Hole (Click-Through Exploration)

**Technology:** Standard SvelteKit routing + `goto()` + `pushState()` -- no new dependencies

The Rabbit Hole is an infinite click-through experience where every artist/genre page is a departure point. The navigation pattern is:

**Architecture decision: Use standard SvelteKit `goto()` navigation, NOT shallow routing.**

Rationale:
- **Shallow routing** (`pushState` from `$app/navigation`) is designed for modals and overlays -- rendering another page's content inside the current page without navigating. The Rabbit Hole is full page navigation, not overlays.
- **`goto()`** already works correctly with SvelteKit's routing. Each click creates a real history entry. Back/forward buttons work natively. No custom history stack needed.
- The existing layout already has a `history.back()` button in `+layout.svelte`.

**Rabbit Hole navigation pattern:**

```
/rabbit-hole                    -- Entry page (search, continue, random)
/rabbit-hole/artist/[slug]      -- Artist page within rabbit hole context
/rabbit-hole/genre/[slug]       -- Genre page within rabbit hole context
```

**Why separate routes from `/artist/[slug]`?** The Rabbit Hole artist page has different content than the main artist page: no full discography, no stats tab, no claim form. It shows: name, tags, description, similar artists, similar genres, and a track list from similar artists. A different `+page.svelte` with a different `+page.ts` load function. The context sidebar and AI companion are specific to the Rabbit Hole layout.

**History trail ("Continue" feature):**

Store the exploration trail in a Svelte store backed by `localStorage`:

```typescript
// src/lib/discovery/history.svelte.ts
interface TrailEntry {
  type: 'artist' | 'genre';
  slug: string;
  name: string;
  timestamp: number;
}

// Persists across sessions via localStorage
// Max 200 entries, FIFO eviction
// Renders as the "Continue" list on the entry page
```

No new library needed. `$state` with `localStorage` persistence is the existing pattern (used by queue, streaming prefs, taste profile).

**Confidence:** HIGH -- uses only existing SvelteKit APIs. The routing pattern is standard.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| SvelteKit `goto()` | (existing) | Page-to-page navigation with browser history | Native history support; no custom stack needed |
| `localStorage` | (DOM API) | Persist exploration trail across sessions | Already used for queue, prefs; simple FIFO buffer |

---

### 5. Context Sidebar (Right Panel)

**Technology:** Existing `paneforge` v1.0.2 -- no new dependencies

The existing `PanelLayout.svelte` already implements a three-pane layout with collapsible left sidebar, main content, and collapsible right sidebar. The context sidebar IS the right pane. It already accepts a `context` snippet:

```svelte
<PanelLayout template="cockpit">
  {#snippet sidebar()}...{/snippet}
  {#snippet context()}
    <!-- THIS IS WHERE CONTEXT SIDEBAR CONTENT GOES -->
    <ContextSidebar {currentPage} />
  {/snippet}
  Content here
</PanelLayout>
```

The right pane already has:
- Collapsible with expand/collapse buttons
- `autoSaveId` for persisting pane sizes
- `minSize` and `defaultSize` configuration
- Styled with the existing dark theme CSS custom properties

**What is actually needed:** A new `ContextSidebar.svelte` component (pure Svelte, no library) that receives the current page context and renders genre info, related items, descriptions. This is a UI component, not a stack decision.

**Confidence:** HIGH -- infrastructure already exists. Only needs a content component.

---

### 6. AI Companion (Persistent Chat Panel)

**Technology:** Existing AI engine + Svelte store -- no new dependencies

The AI companion is not a separate system. It reuses the existing AI infrastructure:
- `$lib/ai/engine.ts` -- `getAiProvider()`, prompt/completion interface
- `$lib/ai/prompts.ts` -- prompt templates with injection guards
- `$lib/ai/state.svelte.ts` -- AI readiness state
- taste.db Rust backend -- caching via `artist_summaries` table pattern

**Companion architecture:**

```
ContextSidebar (right pane)
  |-- ContextInfo (genre info, related items)
  |-- AiCompanionChat (only if AI connected)
       |-- Message history (Svelte $state, sessionStorage)
       |-- Input field
       |-- Uses getAiProvider().complete() with page context
```

The chat history lives in `sessionStorage` (cleared on app close -- not persistent across sessions). The AI receives the current page context (artist name, tags, genre name) injected into the system prompt.

**Why sessionStorage, not localStorage?** AI conversation context is ephemeral -- it makes sense tied to the current exploration session, not persisted forever. The history trail (Continue feature) handles cross-session persistence for navigation.

**Confidence:** HIGH -- reuses existing AI engine with a new UI component. No new libraries.

---

### 7. Track/Release Caching Layer

**Technology:** Rust-side SQLite cache in taste.db -- no new dependencies

The existing release/link API endpoints (`/api/artist/[mbid]/releases`, `/api/artist/[mbid]/links`) fetch from MusicBrainz with rate limiting (1100ms). Currently they use Cloudflare Cache API (only works when deployed to CF Workers, which this is not -- it is a Tauri desktop app). The `platform?.caches` check silently fails in Tauri, so every page visit re-fetches from MB.

**Solution: Cache in taste.db via Tauri Rust commands.**

The pattern already exists: `mb_album_cache` in library.db caches MB album lookups for the local library scanner. Extend taste.db with:

```sql
CREATE TABLE IF NOT EXISTS mb_release_cache (
  artist_mbid TEXT NOT NULL,
  response_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (artist_mbid)
);

CREATE TABLE IF NOT EXISTS mb_link_cache (
  artist_mbid TEXT NOT NULL,
  response_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (artist_mbid)
);
```

**Cache strategy:**
- **TTL:** 7 days (releases/links don't change frequently)
- **Eviction:** On fetch, check `cached_at`. If > 7 days, re-fetch and update. Otherwise return cached JSON.
- **Flow:** Frontend calls Rust command `get_cached_releases(mbid)` -> Rust checks cache -> if miss, frontend fetches from MB API -> calls `cache_releases(mbid, json)` -> Rust stores.

**Why Rust/taste.db, not frontend-only?** The existing taste.db is the established place for user-specific cached data (artist summaries, embeddings, taste profile). Keeping caches here means they survive app updates and are backed up with the rest of the user's data.

**Confidence:** HIGH -- follows the exact same pattern as `mb_album_cache` and `artist_summaries`.

---

### 8. Decade Filtering UI

**Technology:** Pure Svelte component -- no new dependencies

A row of clickable decade buttons (60s, 70s, 80s, 90s, 00s, 10s, 20s) that filter content. Click a decade to expand into individual years. This is a pure UI component.

The existing Discover page already has era filtering via URL params (`goto(buildUrl({ era: newEra }))`). The decade component wraps this existing pattern with a better UI.

**Confidence:** HIGH -- pure Svelte, no library needed.

---

## Installation

```bash
# Only TWO new packages needed (everything else is already installed)
npm install leaflet.markercluster
npm install -D @types/leaflet.markercluster
```

That is it. Two packages total. Everything else reuses existing infrastructure.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| TF-IDF weighted Jaccard (SQL) | Cosine similarity on embedding vectors (sqlite-vec) | Embeddings require AI model to be running. Tag similarity works for ALL users, even without AI installed. Pipeline precomputation means zero runtime cost. |
| TF-IDF weighted Jaccard (SQL) | Raw Jaccard similarity | Raw Jaccard is dominated by common tags. Two artists sharing "rock" would score similarly to two sharing "witch house" -- useless for niche-first discovery. |
| TF-IDF weighted Jaccard (SQL) | MinHash approximation | MinHash is for when pairwise comparison is infeasible (billions of items). With filtering (>= 3 tags, shared-tag join), the artist comparison space is ~millions, not trillions. Exact computation is tractable in the pipeline. |
| `leaflet.markercluster` | `supercluster` (Mapbox) | Supercluster is for Mapbox GL JS, not Leaflet. Would require replacing the entire mapping stack. Leaflet.markercluster is the native solution. |
| `leaflet.markercluster` | Custom clustering logic | Reinventing marker clustering is weeks of work for an inferior result. The plugin handles edge cases (spiderfying, animation, chunk loading) that are hard to get right. |
| Standard SvelteKit routing | Custom history stack with shallow routing | SvelteKit's built-in routing already handles history entries correctly. A custom stack adds complexity for no benefit. `goto()` + browser back/forward is the right pattern. |
| Standard SvelteKit routing | Single-page with component swapping | Loses URL sharing, browser history, and SvelteKit's load functions. Would fight the framework instead of using it. |
| Wikidata SPARQL direct (P625 coordinates) | Nominatim geocoding from artist "area" name | Wikidata gives coordinates directly on the city entity. Nominatim would require a separate geocoding step at 1 req/sec on ~300K lookups = 83+ hours. Wikidata batching does it in ~2-3 hours. |
| Wikidata SPARQL batched | Wikidata full dump download | The full Wikidata dump is 100GB+. We only need ~300K entries. SPARQL batching is dramatically more efficient for this use case. |
| taste.db Rust cache | Frontend Cache API / Service Worker | This is a Tauri desktop app, not a web app. Service Workers work in WebView2 but add complexity. Rust-side SQLite cache is simpler, proven (mb_album_cache pattern), and persists correctly. |
| taste.db Rust cache | `idb` (IndexedDB) | idb is already installed but only used for Nostr keypair storage. All other caching goes through taste.db. Adding a second caching layer in IndexedDB creates inconsistency. Stay with the established pattern. |
| `sessionStorage` for AI chat | `localStorage` for AI chat | Chat context is ephemeral to the exploration session. Persisting it forever wastes space and creates stale context. The history trail (Continue) handles cross-session persistence for navigation. |
| `paneforge` (existing) | Custom CSS split panes | PaneForge is already installed, integrated in PanelLayout, and working. The right pane already supports the context snippet. No reason to replace it. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `leaflet-supercluster` / Mapbox GL JS | Wrong mapping library. BlackTape uses Leaflet, not Mapbox. | `leaflet.markercluster` (native Leaflet plugin) |
| Any new JS similarity library (e.g. `ml-distance`) | Adds runtime dependency for something that should be precomputed in the pipeline. | Pure SQL computation at pipeline time |
| `svelte-navigator` or `svelte-routing` | SvelteKit has its own router. Adding a second router creates conflicts. | SvelteKit `goto()` + standard routes |
| Custom infinite scroll library | The Rabbit Hole pages are discrete, not infinite scroll. Each click is a new page load. | Standard SvelteKit page navigation |
| D3 for the World Map | D3 is being retired from active use (the graph views are going away). Leaflet handles maps. | Leaflet + markercluster |
| `react-leaflet-markercluster` | React wrapper. This is Svelte. | `leaflet.markercluster` (vanilla JS, works with any framework) |
| External geocoding APIs (Google Maps, Mapbox) | Costs money. Wikidata is free and already proven in this pipeline. | Wikidata SPARQL |
| A full graph database (Neo4j, etc.) for similar artists | Massive overkill. The similar_artists table in SQLite handles this perfectly. | SQLite table with precomputed scores |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `leaflet.markercluster@1.5.3` | `leaflet@1.9.4` | Tested and stable. Both are mature 1.x releases. |
| `@types/leaflet.markercluster@1.5.6` | `@types/leaflet@1.9.21` | Types extend L.MarkerClusterGroup from leaflet types. |
| `paneforge@1.0.2` | `svelte@5.49.2` | PaneForge 1.0 was built for Svelte 5. Already working. |
| `better-sqlite3` (pipeline) | Node.js 18+ | Already in use. Pipeline additions are pure SQL. |

---

## Stack Summary by Feature

| Feature | New Dependencies | New DB Tables | Pipeline Work | Frontend Work |
|---------|-----------------|---------------|---------------|---------------|
| Similar Artists | None | `similar_artists` | TF-IDF weighted Jaccard computation | Display on artist pages |
| World Map | `leaflet.markercluster` + types | None (uses `origin_lat/lng` on artists) | Wikidata geocoding | New WorldMap.svelte component |
| Artist Geocoding | None | `origin_city/lat/lng` columns on `artists` | Wikidata SPARQL batch queries | None (consumed by World Map) |
| Rabbit Hole Nav | None | None | None | New routes + ContextSidebar component |
| Context Sidebar | None | None | None | New ContextSidebar.svelte using existing paneforge |
| AI Companion | None | None | None | New AiCompanionChat.svelte using existing AI engine |
| Track/Release Cache | None | `mb_release_cache`, `mb_link_cache` in taste.db | None | Rust cache commands + frontend integration |
| Decade Filtering | None | None | None | New DecadeFilter.svelte component |

**Total new npm packages: 2** (`leaflet.markercluster` + `@types/leaflet.markercluster`)
**Total new DB tables: 3** (`similar_artists` in mercury.db, `mb_release_cache` + `mb_link_cache` in taste.db)
**Total new DB columns: 3** (`origin_city`, `origin_lat`, `origin_lng` on `artists`)

---

## Sources

- [SvelteKit Shallow Routing docs](https://svelte.dev/docs/kit/shallow-routing) -- confirmed pushState/replaceState API for modal patterns (not needed for Rabbit Hole; standard goto() is correct)
- [SvelteKit $app/navigation docs](https://svelte.dev/docs/kit/$app-navigation) -- confirmed goto() with replaceState, keepFocus, noScroll options
- [Wikidata Property P434](https://www.wikidata.org/wiki/Property:P434) -- MusicBrainz artist ID property, confirmed for SPARQL joins
- [Wikidata MusicBrainz example queries](https://wiki.musicbrainz.org/User:Reosarevok/Wikidata_Example_Queries) -- real SPARQL patterns combining P434 with geographic properties
- [Wikidata SPARQL query limits](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits) -- 60-second hard timeout, batching required
- [Leaflet.markercluster GitHub](https://github.com/Leaflet/Leaflet.markercluster) -- official Leaflet plugin, v1.5.3
- [@types/leaflet.markercluster npm](https://www.npmjs.com/package/@types/leaflet.markercluster) -- v1.5.6, DefinitelyTyped maintained
- [PaneForge GitHub](https://github.com/svecosystem/paneforge) -- v1.0.0+ for Svelte 5
- [Ben Frederickson: Distance Metrics for Fun and Profit](https://www.benfrederickson.com/distance-metrics/) -- TF-IDF weighting for tag-based similarity (MEDIUM confidence -- blog post, but math is standard IR)
- [Jaccard Similarity with TF-IDF in music recommendation](https://arxiv.org/pdf/1704.03844) -- academic validation of TF-IDF weighted tag similarity for music (MEDIUM confidence -- 2017 paper, approach is well-established)
- Existing codebase: `pipeline/import.js`, `pipeline/build-genre-data.mjs`, `src/lib/components/SceneMap.svelte`, `src/lib/components/PanelLayout.svelte`, `src-tauri/src/library/db.rs` -- verified existing patterns for caching, Wikidata SPARQL, Leaflet dynamic import, and panel layout

---
*Stack research for: v1.7 The Rabbit Hole -- Discovery Redesign*
*Researched: 2026-03-03*
