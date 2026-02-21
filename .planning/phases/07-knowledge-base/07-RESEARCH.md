# Phase 7: Knowledge Base - Research

**Researched:** 2026-02-21
**Domain:** Genre graph visualization, external data APIs, geographic mapping, DB schema extension, Time Machine UI
**Confidence:** HIGH (core stack verified), MEDIUM (Wikidata SPARQL patterns), HIGH (Wikipedia API — already in use)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Genre map format:**
- Hybrid model: graph as the overview/navigation layer, clicking a node opens a rich genre page
- Three node types: genres (global), scenes (geographic/temporal), cities — visually distinguished
- Graph is search-first: starts small, expands outward from a search or browse starting point. Never a hairball.
- Starting state: graph pre-loaded around the user's listening profile — their genres centered, related ones nearby
- Graph always stays visible (side panel or mini-map) while reading a genre page — user stays oriented

**Genre / scene pages:**
- Full editorial: description, origins, era, key artists (linked to Mercury profiles), iconic releases with embedded players, related scenes, timeline of key moments
- Scene pages include an actual geographic map pinning the city/region, with era/timeline alongside

**Content layers:**
- Seamlessly blended on the page — one unified view, no hard tabs between layers
- Source attribution shown inline (small badge or tooltip) but not architecturally divided
- Sparse pages (Layer 1 only): show what exists, then a clear "This genre has no description yet — know this scene? Write it." call to action
- External content (Layer 2) includes all types: YouTube documentaries/mini-docs, Wikipedia summaries + article links, iconic releases with embedded players
- AI summaries (Layer 3): short and punchy — 2-3 sentences that capture the vibe of the scene. People skim.

**Time Machine:**
- Standalone section of the app — its own view, not embedded per-genre
- Shows all three views together: animated genre graph evolution, year snapshot page ("1991 — What was happening"), and filtered artist/release list by year + genre
- Scrub control: decade buttons (60s › 70s › 80s etc.) with fine scrub within the selected decade
- Opening state: Claude's discretion

**Navigation & entry points:**
- Knowledge Base gets a dedicated top-level nav item AND every genre tag everywhere in the app is a contextual link — multiple ways in
- Artist pages: genre tags are KB links + an "Explore this scene →" panel below tags for the artist's primary genre/scene
- KB landing page: the genre graph, pre-centered on user's taste
- Liner Notes: expandable section below the release, collapsed by default — expands to show full credits, relationships, and production details

### Claude's Discretion
- Time Machine opening state — start at present and rewind, start at user's taste cluster, or a year picker; whatever feels right for the UX
- Exact graph rendering library and physics/layout algorithm
- Visual design language distinguishing genre vs scene vs city nodes
- Animation behavior when graph evolves in Time Machine

### Deferred Ideas (OUT OF SCOPE)
- Community editing mechanics (who can edit, edit history, revert, moderation) — community features are Phase 9+
- Genre page "mini-timeline" embedded on genre pages (for individual genre evolution) — could add in a future iteration; standalone Time Machine ships first
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KB-01 | Genre/scene map with navigable relationships (genres, scenes, movements, cities, eras) | D3-force graph extended for genre graph; new `genres` + `genre_relationships` DB tables; Wikidata SPARQL supplies hierarchy |
| KB-02 | Multi-layer content system (open data → links/embeds → AI summaries → community written) | Wikipedia REST API (`page/summary`) already used in project; existing AI engine reused for genre summaries; tag_stats + artist_tags supply Layer 1 |
| DISC-05 | Scene Maps — geographic + temporal visualization of music scenes using MusicBrainz location data | Leaflet.js + onMount pattern; area data already extracted in pipeline; Nominatim API for city geocoding at pipeline-build time |
| DISC-06 | Time Machine — browse releases by year, scrub timeline, filter by tags, watch genre evolution | Pure SvelteKit page; `begin_year` already on artists table; releases fetched live from MusicBrainz API by year; client-side D3 for graph animation |
| DISC-07 | Liner Notes — rich expandable credits, relationships, and production details on release pages | MusicBrainz API `inc=artist-credits+labels+recordings` already accessible via existing fetch pattern; expandable UI component |
</phase_requirements>

---

## Summary

Phase 7 builds the genre encyclopedia layer that makes Mercury genuinely unique. Unlike the existing Style Map (which is a tag co-occurrence visualization), this Knowledge Base introduces *editorial genre entities* with their own pages, relationships, and layered content. The core technical challenge is threefold: (1) populating a genre graph from Wikidata's hierarchical SPARQL data, (2) extending the existing D3-force graph pattern to support a search-first interactive genre map with a persistent side panel, and (3) adding geographic visualization (Leaflet) for scene pages.

The good news: the project already has all the primitives needed. The Wikipedia REST API `page/summary` endpoint is already used in `src/lib/bio.ts` — the same pattern applies to genre pages. The D3-force graph is already used in the Style Map component — Phase 7 extends it with zoom/pan, click-to-navigate, and node-type visual differentiation. The AI engine (`src/lib/ai/engine.ts`) already abstracts AI generation and just needs a new genre-summary prompt added to `prompts.ts`. The pipeline already extracts `area` and `artist` tables from MusicBrainz dumps — scene geography data is latent in the data we already have.

The main new work: a pipeline step to build a `genres` table from Wikidata SPARQL + MusicBrainz tags, geocoding of area names (Nominatim API at pipeline-build time, stored as lat/lng in DB), Leaflet integration for scene maps, and the Time Machine UI (pure SvelteKit, uses `begin_year` from artists + live MusicBrainz release queries by year). Liner Notes is the simplest: MusicBrainz already returns credits via `inc=artist-credits+labels+recordings` — it just needs a collapsible UI component on release pages.

**Primary recommendation:** Extend the existing D3-force + DB provider + Wikipedia API patterns already established. Add a pipeline phase (Phase G) to build genre/relationship tables from Wikidata. Use Leaflet (dynamic import in onMount) for scene maps. Reuse the AI engine for genre summaries.

---

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-force | already installed | Genre graph physics simulation | Already used in StyleMap.svelte — zero new dependency |
| leaflet | ~1.9.x | Geographic scene maps | Industry standard, SSR-safe via dynamic import, free tiles from OpenStreetMap |
| better-sqlite3 | already installed | Pipeline genre data build step | Already used in all pipeline scripts |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| leaflet | ^1.9.4 | City/region pins on scene pages | Scene pages only — dynamic import in onMount |

### APIs (no npm packages needed)
| API | Endpoint | Purpose | Auth |
|-----|----------|---------|------|
| Wikidata SPARQL | `https://query.wikidata.org/sparql` | Genre hierarchy + subgenre relationships + influenced-by | None — public, no auth |
| Wikipedia REST | `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` | Genre descriptions (Layer 2) | None — already used in bio.ts |
| MusicBrainz API | `https://musicbrainz.org/ws/2/release?...` | Year-filtered releases for Time Machine; Liner Notes credits | None — rate-limited to 1 req/sec |
| Nominatim | `https://nominatim.openstreetmap.org/search` | City name → lat/lng (pipeline only, not runtime) | None — 1 req/sec, User-Agent required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leaflet | Mapbox GL JS | Mapbox requires API key + paid tier for volume; Leaflet is free forever |
| Wikidata SPARQL | Manual genre data | Wikidata has ~2,000+ classified music genres with parent/child relationships; hand-curating is not feasible |
| Nominatim at pipeline time | Geocoding at runtime | Runtime geocoding would add latency + API calls per page load; pipeline-time means zero runtime cost |
| D3-force for Time Machine | Timeline animation library | D3-force already exists in project; animating nodes between time snapshots is the same physics engine |

**Installation:**
```bash
npm install leaflet
npm install -D @types/leaflet
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── routes/
│   ├── kb/                          # Knowledge Base landing (genre graph)
│   │   ├── +page.svelte             # Genre graph view + search
│   │   ├── +page.server.ts          # Load genre nodes/edges from D1
│   │   └── +page.ts                 # Universal (Tauri passthrough)
│   ├── kb/genre/[slug]/             # Genre/scene page
│   │   ├── +page.svelte             # Layered content + scene map (if scene)
│   │   ├── +page.server.ts          # Genre data + Wikipedia summary + key artists
│   │   └── +page.ts                 # Universal (Tauri passthrough)
│   ├── time-machine/                # Standalone Time Machine
│   │   ├── +page.svelte             # Year scrubber + graph animation + artist list
│   │   └── +page.server.ts          # Year-filtered artist list
│   └── artist/[slug]/
│       └── +page.svelte             # Liner Notes expandable section added here
├── lib/
│   ├── components/
│   │   ├── GenreGraph.svelte        # Extended StyleMap with search-first, side-panel, node types
│   │   ├── SceneMap.svelte          # Leaflet city pin map (dynamic import in onMount)
│   │   ├── LinerNotes.svelte        # Expandable credits section
│   │   └── TimeMachine.svelte       # Year scrubber + animated graph
│   └── db/
│       └── queries.ts               # Add genre queries (getGenreBySlug, getGenreGraph, etc.)
pipeline/
├── build-genre-data.mjs             # New: Phase G — Wikidata SPARQL + geocoding
└── lib/
    └── schema.sql                   # Extended with genres + genre_relationships + area_coords
```

### Pattern 1: Genre Graph (Extended StyleMap)
**What:** Extends the existing `StyleMap.svelte` D3-force pattern with search-first expansion, persistent mini-map panel, and three visually distinct node types (genre/scene/city).
**When to use:** KB landing page + persistent panel while reading genre pages.
**Example:**
```typescript
// Extension of existing StyleMap.svelte pattern (src/lib/components/StyleMap.svelte)
// Key additions:
// 1. focusNode prop — starts graph centered on specific genre
// 2. Three node types with distinct visual treatment
// 3. Click navigates to /kb/genre/[slug] (same goto() pattern)
// 4. expandFromNode(mbid) — fetches neighbors, adds to simulation

// D3 force simulation tick pattern (already established):
simulation.tick(500); // static layout, zero DOM thrashing
const settled = simulation.nodes() as LayoutNode[];
simulation.stop();
// Then assign to $state — single reactive update

// Node type visual differentiation (Claude's discretion):
// genre nodes: circle (existing)
// scene nodes: diamond/rotated rect
// city nodes: smaller circle with border dash
```

### Pattern 2: Wikidata SPARQL Genre Fetch (Pipeline)
**What:** Fetch genre hierarchy at pipeline-build time and store in DB. Not fetched at runtime.
**When to use:** `pipeline/build-genre-data.mjs` — run once, produces `genres` + `genre_relationships` tables.
**Example:**
```javascript
// Source: https://query.wikidata.org/sparql (verified endpoint)
// Fetch all music genres with parent relationships + inception date + origin location

const SPARQL_QUERY = `
SELECT DISTINCT ?genre ?genreLabel ?parentGenre ?parentLabel ?inceptionYear ?originLabel WHERE {
  ?genre wdt:P31 wd:Q188451 .                    # instance of: music genre
  OPTIONAL { ?genre wdt:P279 ?parentGenre . }     # subclass of (parent genre)
  OPTIONAL { ?genre wdt:P571 ?inception .
             BIND(YEAR(?inception) as ?inceptionYear) }
  OPTIONAL { ?genre wdt:P495 ?origin .            # country of origin
             ?origin rdfs:label ?originLabel .
             FILTER(LANG(?originLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 5000
`;

const response = await fetch(
  `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL_QUERY)}`,
  { headers: { 'Accept': 'application/sparql-results+json',
                'User-Agent': 'Mercury/0.1.0' } }
);
const { results } = await response.json();
// results.bindings[].genreLabel.value = genre name
// results.bindings[].parentLabel.value = parent genre name
// results.bindings[].inceptionYear.value = year string or undefined
```

### Pattern 3: Wikipedia Genre Summary (Runtime, Layer 2)
**What:** Reuse exact same pattern as `src/lib/bio.ts` — fetch Wikipedia page/summary by genre name.
**When to use:** Genre page load (`+page.server.ts`), cached via Cloudflare Cache API.
**Example:**
```typescript
// Source: src/lib/bio.ts (already verified, already in production)
// Same endpoint, same User-Agent, same pattern — just different article titles
const response = await fetch(
  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(genreName)}`,
  { headers: { 'User-Agent': 'Mercury/0.1.0', Accept: 'application/json' } }
);
const data = await response.json() as { extract?: string; thumbnail?: { source: string } };
// data.extract = paragraph text (Layer 2 description)
// data.thumbnail = optional image
// Wrap in try/catch — best-effort, page renders without it
```

### Pattern 4: Leaflet Scene Map (Runtime, Client-Only)
**What:** Leaflet map showing city pin for scene origin. Dynamic import in onMount to avoid SSR window errors.
**When to use:** Scene genre pages that have geographic coordinates stored in DB.
**Example:**
```typescript
// Source: https://khromov.se/using-leaflet-with-sveltekit/ (verified pattern)
// File: src/lib/components/SceneMap.svelte
import { onMount, onDestroy } from 'svelte';

let { lat, lng, cityName }: { lat: number; lng: number; cityName: string } = $props();
let mapElement: HTMLDivElement;
let map: any = null;

onMount(async () => {
  const L = await import('leaflet');
  // CSS must be imported too — do it inline in <style> block
  map = L.map(mapElement).setView([lat, lng], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.marker([lat, lng]).addTo(map).bindPopup(cityName);
});

onDestroy(() => map?.remove());
```
```svelte
<style>
  @import 'leaflet/dist/leaflet.css';
</style>
```

### Pattern 5: Geocoding at Pipeline-Build Time (Nominatim)
**What:** Convert area names (from MusicBrainz) to lat/lng once at pipeline time, store in DB. Never geocode at runtime.
**When to use:** `pipeline/build-genre-data.mjs` Phase G, geocoding city/area names for scene nodes.
**Example:**
```javascript
// Source: https://nominatim.org/release-docs/latest/api/Search/ (verified endpoint)
// Rate limit: 1 req/sec max. Must include User-Agent.
async function geocodeCity(cityName) {
  await new Promise(r => setTimeout(r, 1100)); // respect 1 req/sec
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(cityName)}&format=json&limit=1&featuretype=city`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mercury/0.1.0' } });
  const results = await resp.json();
  if (!results[0]) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}
```

### Pattern 6: Liner Notes (MusicBrainz API `inc=` parameter)
**What:** Fetch full credits from MusicBrainz using existing API infrastructure. Displayed in collapsible section.
**When to use:** Release detail pages — expanded on click, collapsed by default.
**Example:**
```typescript
// MusicBrainz API already used in src/routes/api/artist/[mbid]/releases/+server.ts
// Add inc= parameters to get full credits:
const url = `https://musicbrainz.org/ws/2/release/${releaseMbid}` +
  `?inc=artist-credits+labels+recordings&fmt=json`;
// Returns: release.artist-credit[].artist.name, release.label-info[],
//          release.media[].tracks[].recording.artist-credit[]
// Rate limit: 1100ms between requests (already enforced in existing API routes)
```

### Pattern 7: Time Machine — Year-Filtered Artists
**What:** Artists filtered by `begin_year` from existing DB. No new data needed.
**When to use:** Time Machine view, filtered by year + genre tag.
**Example:**
```typescript
// Extension of existing query patterns in src/lib/db/queries.ts
export async function getArtistsByYear(
  db: DbProvider, year: number, tag?: string, limit = 50
): Promise<ArtistResult[]> {
  const where = tag
    ? `a.begin_year = ? AND EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)`
    : `a.begin_year = ?`;
  const params = tag ? [year, tag, limit] : [year, limit];
  return db.all<ArtistResult>(
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists a WHERE ${where}
     ORDER BY a.name LIMIT ?`, ...params
  );
}
```

### DB Schema Extension (New Tables)
```sql
-- Genre encyclopedia entities
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,             -- URL slug: "berlin-techno"
  name TEXT NOT NULL,                    -- Display name: "Berlin Techno"
  type TEXT NOT NULL DEFAULT 'genre',    -- 'genre' | 'scene' | 'city'
  wikidata_id TEXT,                      -- Q-number for enrichment
  wikipedia_title TEXT,                  -- Wikipedia article title for summary fetch
  inception_year INTEGER,               -- Year genre emerged
  origin_city TEXT,                      -- City name (for scene nodes)
  origin_lat REAL,                       -- Geocoded latitude (for scene maps)
  origin_lng REAL,                       -- Geocoded longitude (for scene maps)
  mb_tag TEXT                            -- Corresponding MusicBrainz tag (bridge to artist_tags)
);

-- Genre parent/child + influenced-by relationships
CREATE TABLE IF NOT EXISTS genre_relationships (
  from_id INTEGER NOT NULL REFERENCES genres(id),
  to_id INTEGER NOT NULL REFERENCES genres(id),
  rel_type TEXT NOT NULL DEFAULT 'subgenre', -- 'subgenre' | 'influenced_by' | 'scene_of'
  PRIMARY KEY (from_id, to_id, rel_type)
);

CREATE INDEX IF NOT EXISTS idx_genre_slug ON genres(slug);
CREATE INDEX IF NOT EXISTS idx_genre_mb_tag ON genres(mb_tag);
CREATE INDEX IF NOT EXISTS idx_genre_rel_from ON genre_relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_genre_rel_to ON genre_relationships(to_id);
```

### Anti-Patterns to Avoid
- **Geocoding at runtime:** Nominatim rate limit is 1 req/sec. Geocode all cities at pipeline-build time and store lat/lng. Never call Nominatim from a page load.
- **Rendering the full genre graph at once:** Wikidata has 2,000+ genres. Load/render only the relevant subgraph (neighbors of selected node), matching the "search-first, never a hairball" constraint. Use `LIMIT` on graph edge queries.
- **Loading Leaflet on non-scene pages:** Leaflet is heavy (~40KB CSS + JS). Only import it on scene genre pages that have `origin_lat` set. Guard with `{#if genre.origin_lat}`.
- **D3-force live ticking on genre graph:** Established project pattern is `simulation.tick(500)` to static completion, then assign to `$state`. Never wire `on('tick')` to reactive state — causes continuous re-renders.
- **Fetching Wikipedia at runtime without caching:** Wikipedia summaries should be cached at the Cloudflare Cache API layer (existing 24hr TTL pattern from artist bio fetches).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Genre hierarchy data | Manual curation / CSV | Wikidata SPARQL | ~2,000+ genres with parent/child relationships, free, CC0 |
| City coordinates | Custom geocoder | Nominatim (pipeline time) | Free, OpenStreetMap data, proven 1-req/sec API |
| Genre map physics | Custom force layout | d3-force (already installed) | Already proven in StyleMap.svelte; tick(500) pattern is established |
| Geographic map display | SVG pins on image | Leaflet.js | Zoom, pan, proper tile rendering, SSR-safe pattern documented |
| Wikipedia summaries | Custom article parser | Wikipedia REST `/page/summary` | Already used in bio.ts; returns clean extract, no HTML parsing |
| Time Machine release data | Storing releases in DB | MusicBrainz live API | Mercury's architecture: "internet is the database" — releases fetched live, not stored |

**Key insight:** Every "new" capability in Phase 7 has a proven implementation pattern already established in the project. The discipline is to recognize and extend these patterns rather than building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Wikidata SPARQL Timeout
**What goes wrong:** Complex genre hierarchy queries time out at Wikidata's public endpoint (30-second limit).
**Why it happens:** Unbounded `wdt:P279*` (zero-or-more) traversals can explode.
**How to avoid:** Use `LIMIT 5000` on the query. Fetch genres in paginated batches using `OFFSET`. Filter to `wdt:P31 wd:Q188451` (instance of music genre) rather than traversing all subclasses.
**Warning signs:** Query takes more than 10 seconds in the Wikidata SPARQL playground.

### Pitfall 2: Leaflet "window is not defined" in SSR
**What goes wrong:** Importing leaflet at module level causes SvelteKit SSR build to fail.
**Why it happens:** Leaflet accesses `window` at import time, not just at use time.
**How to avoid:** Always use `const L = await import('leaflet')` inside `onMount`. Never top-level import.
**Warning signs:** Build error containing "window is not defined" or "document is not defined".

### Pitfall 3: Genre Slug Collisions
**What goes wrong:** Multiple Wikidata genres map to the same slug (e.g., "rock" appears in multiple contexts).
**Why it happens:** Slugifying genre names produces collisions for short/common words.
**How to avoid:** Use the same pattern as artists: append first 8 chars of Wikidata Q-number when slug already exists. `slug = genreSlug + '-' + qdataId.slice(1, 9)`.
**Warning signs:** Unique constraint violation in `INSERT OR IGNORE INTO genres`.

### Pitfall 4: MusicBrainz Tag → Genre Mismatch
**What goes wrong:** `artist_tags` uses free-form tag strings; Wikidata genres use canonical names. "berliner electronic" != "Berlin techno".
**Why it happens:** MusicBrainz tags are user-contributed and messy; Wikidata genre names are editorial.
**How to avoid:** Build `mb_tag` as a normalized lowercase slug on the genres table. Use fuzzy matching (lowercase + strip punctuation) when linking artist_tags to genres. Accept partial coverage — not every MB tag will have a Wikidata genre.
**Warning signs:** Zero artists returned for any genre page.

### Pitfall 5: Nominatim Rate Limit Violation
**What goes wrong:** Pipeline script gets 429 errors after a few hundred cities.
**Why it happens:** Nominatim public API allows max 1 request/second.
**How to avoid:** Use 1100ms delay between requests in pipeline geocoding loop. Cache results (skip cities already in DB). Run geocoding as a separate idempotent pipeline step.
**Warning signs:** HTTP 429 responses from nominatim.openstreetmap.org.

### Pitfall 6: D1 Free Tier DB Size (500MB limit)
**What goes wrong:** Adding full Wikidata genre data + geocoordinates pushes DB over 500MB free tier limit.
**Why it happens:** Existing DB is already 778MB uncompressed (53% compressed = ~366MB actual). Genre tables add modest data — ~2,000 genres is tiny.
**How to avoid:** Genre data is small (~2,000 rows); no risk. `genre_relationships` at most ~10,000 rows. Well within limits.
**Warning signs:** Not a real risk for this phase given genre data volume.

### Pitfall 7: D3-Force Graph "Hairball"
**What goes wrong:** Rendering all 2,000+ genres at once creates an unreadable mess.
**Why it happens:** Force simulation with too many nodes becomes visually noisy.
**How to avoid:** Load only a neighborhood subgraph: selected genre + its direct parents/children/siblings (depth 2 max). Start with taste-relevant genres (top 20 from user's taste profile). `LIMIT` graph queries to 50 nodes max.
**Warning signs:** User reports the graph is "unreadable" or "too cluttered".

---

## Code Examples

Verified patterns from official sources:

### Wikidata SPARQL Fetch (Pipeline — verified endpoint)
```javascript
// Source: https://query.wikidata.org/sparql (Wikidata public SPARQL endpoint)
// Used in: pipeline/build-genre-data.mjs

async function fetchWikidataGenres() {
  const query = `
    SELECT DISTINCT ?genre ?genreLabel ?parentGenre ?parentGenreLabel ?inceptionYear ?originLabel WHERE {
      ?genre wdt:P31 wd:Q188451 .
      OPTIONAL { ?genre wdt:P279 ?parentGenre . }
      OPTIONAL {
        ?genre wdt:P571 ?inception .
        BIND(YEAR(?inception) AS ?inceptionYear)
      }
      OPTIONAL {
        ?genre wdt:P495 ?origin .
        ?origin rdfs:label ?originLabel .
        FILTER(LANG(?originLabel) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 5000
  `;

  const resp = await fetch(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`,
    { headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Mercury/0.1.0 (music discovery; contact@example.com)'
    }}
  );
  return resp.json(); // { results: { bindings: [...] } }
}
```

### Wikipedia Genre Summary (Runtime — same as bio.ts)
```typescript
// Source: src/lib/bio.ts (already in production, HIGH confidence)
// Pattern is identical — just different article title input
async function fetchGenreWikipediaSummary(genreName: string): Promise<string | null> {
  try {
    const title = encodeURIComponent(genreName.replace(/ /g, '_'));
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { headers: { 'User-Agent': 'Mercury/0.1.0', Accept: 'application/json' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json() as { extract?: string; thumbnail?: { source: string } };
    return data.extract ?? null;
  } catch { return null; }
}
```

### Genre Graph Query (D1 — new query)
```typescript
// Source: existing queries.ts patterns — extended
// Load subgraph centered on a genre: the genre + its immediate neighbors
export async function getGenreSubgraph(
  db: DbProvider, genreSlug: string
): Promise<{ nodes: GenreNode[]; edges: GenreEdge[] }> {
  const center = await db.get<GenreNode>(
    `SELECT id, slug, name, type, inception_year FROM genres WHERE slug = ?`, genreSlug
  );
  if (!center) return { nodes: [], edges: [] };

  const neighbors = await db.all<GenreNode>(
    `SELECT DISTINCT g.id, g.slug, g.name, g.type, g.inception_year
     FROM genre_relationships gr
     JOIN genres g ON g.id IN (gr.from_id, gr.to_id)
     WHERE (gr.from_id = ? OR gr.to_id = ?) AND g.id != ?
     LIMIT 30`, center.id, center.id, center.id
  );

  const edges = await db.all<GenreEdge>(
    `SELECT from_id, to_id, rel_type FROM genre_relationships
     WHERE from_id = ? OR to_id = ?`, center.id, center.id
  );

  return { nodes: [center, ...neighbors], edges };
}
```

### Liner Notes Fetch (MusicBrainz API)
```typescript
// Source: MusicBrainz API docs — inc= parameter pattern
// Added to: src/routes/api/artist/[mbid]/releases/+server.ts or new endpoint
async function fetchReleaseCredits(releaseMbid: string) {
  const url = `https://musicbrainz.org/ws/2/release/${releaseMbid}` +
    `?inc=artist-credits+labels+recordings&fmt=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mercury/0.1.0' }
  });
  if (!resp.ok) return null;
  return resp.json();
  // .artist-credit[].artist.name — main credits
  // .label-info[].label.name — record labels
  // .media[].tracks[].recording.artist-credit — per-track credits
}
```

### Leaflet Scene Map Component Skeleton
```svelte
<!-- Source: https://khromov.se/using-leaflet-with-sveltekit/ (verified pattern) -->
<!-- File: src/lib/components/SceneMap.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  let { lat, lng, cityName, zoom = 10 }:
    { lat: number; lng: number; cityName: string; zoom?: number } = $props();

  let mapEl: HTMLDivElement;
  let map: any = null;

  onMount(async () => {
    const L = await import('leaflet');
    map = L.map(mapEl).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(cityName).openPopup();
  });

  onDestroy(() => { map?.remove(); map = null; });
</script>

<div bind:this={mapEl} class="scene-map"></div>

<style>
  @import 'leaflet/dist/leaflet.css';
  .scene-map { height: 300px; width: 100%; border-radius: 8px; }
</style>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Genre tags as flat strings | Genre entities with relationships (Wikidata) | Phase 7 | Tags become navigable nodes with history, parents, children |
| Style Map (tag co-occurrence) | Genre Map (editorial hierarchy) | Phase 7 | Users can traverse genre trees, not just see clusters |
| Artist bio from Wikipedia | Genre pages from Wikipedia + AI + community | Phase 7 | Same bio.ts pattern, new entity type |
| Artist area as country string | Area with geocoordinates for scene maps | Phase 7 | Pipeline adds lat/lng column; existing `area` data reused |

**Existing infrastructure that Phase 7 reuses:**
- `bio.ts` Wikipedia REST API pattern — reused verbatim for genre summaries
- `StyleMap.svelte` D3-force pattern — extended for genre graph
- `ai/engine.ts` + `prompts.ts` — new `genreSummary` prompt added
- `artist.begin_year` + `artist_tags` — Time Machine filter is already in the data
- `pipeline/build-tag-stats.mjs` — model for new `build-genre-data.mjs` pipeline step

---

## Open Questions

1. **Wikidata → MusicBrainz tag bridge quality**
   - What we know: Wikidata genre names and MB artist tags are both user-contributed but use different conventions
   - What's unclear: What % of MB tags will fuzzy-match to Wikidata genres? Could be 40% or 80%
   - Recommendation: Accept partial coverage day one. Tags without genre matches still link to KB search. Measure coverage after first pipeline run.

2. **MusicBrainz area data: city-level precision**
   - What we know: `begin_area` exists on artist records; the `area` table has `name` but NOT coordinates
   - What's unclear: How many artists have city-level (not just country-level) `begin_area` data?
   - Recommendation: Geocode all area names in pipeline. Use Nominatim with `featuretype=city`. Accept that some areas are country-level and show country pin instead.

3. **Time Machine: Live release data feasibility**
   - What we know: MusicBrainz API rate limit is 1 req/sec; Time Machine needs year-filtered releases
   - What's unclear: MusicBrainz API supports `release?date=YYYY` searches but this is a live fetch, not DB-resident
   - Recommendation: Time Machine shows artists from local DB (instant, uses `begin_year`) and optionally fetches iconic releases for the selected year from MusicBrainz API (lazy-loaded, best-effort, cached). The artist list is the core data; releases are enrichment.

4. **Wikidata rate limits and caching strategy**
   - What we know: Pipeline runs Wikidata SPARQL once — no runtime calls
   - What's unclear: If Wikidata changes (genres added/updated), how often do we re-run?
   - Recommendation: Re-run `build-genre-data.mjs` with each DB rebuild. Genre data is stable; monthly cadence is fine.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/bio.ts` — Wikipedia REST API `page/summary` endpoint (in production, verified)
- `src/lib/components/StyleMap.svelte` — D3-force pattern for graph (in production, verified)
- `src/lib/ai/engine.ts` + `src/lib/ai/prompts.ts` — AI generation engine (in production, verified)
- `src/lib/db/queries.ts` — All existing query patterns (in production, verified)
- `pipeline/build-tag-stats.mjs` — Pipeline pattern (in production, verified)
- `pipeline/lib/schema.sql` — Current DB schema (verified)
- `pipeline/lib/tables.js` — Area table columns: `id, gid, name, type` (verified — no coordinates)
- Cloudflare D1 docs (`developers.cloudflare.com/d1/platform/limits/`) — 500MB free / 10GB paid; ALTER TABLE supported
- MusicBrainz API docs (`musicbrainz.org/doc/MusicBrainz_API`) — genre/all endpoint, 1 req/sec rate limit
- MusicBrainz Area docs (`musicbrainz.org/doc/Area`) — areas have name, type, ISO codes but NOT coordinates
- MusicBrainz Place docs (`musicbrainz.org/doc/Place`) — places have lat/lng; places link to areas

### Secondary (MEDIUM confidence)
- Wikidata SPARQL endpoint `https://query.wikidata.org/sparql` — verified public endpoint, no auth required
- Wikidata music genre properties: P31 (instance of Q188451), P279 (subclass of / parent), P571 (inception), P495 (country of origin), P737 (influenced by)
- SPARQL query example: `linkedwiki.com/query/Get_the_subgenres_of_Jazz` — shows correct P31/P279 pattern
- Leaflet + SvelteKit onMount pattern: `khromov.se/using-leaflet-with-sveltekit/` — verified, widely used
- Nominatim API `https://nominatim.openstreetmap.org/search` — free, 1 req/sec, `featuretype=city` param

### Tertiary (LOW confidence — flag for validation)
- Wikidata coverage of music genres: estimated "~2,000+" — actual count unverified without running SPARQL query
- % of MusicBrainz tags that fuzzy-match Wikidata genre names — unknown until pipeline test run
- Nominatim city-level geocoding success rate for music scene cities — unverified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — D3, Leaflet, Wikipedia API, MusicBrainz API all verified; all have working examples in the codebase or in official docs
- Architecture: HIGH — all patterns are extensions of existing proven code; no novel infrastructure
- Wikidata SPARQL: MEDIUM — endpoint verified, properties confirmed, but query coverage untested
- Pitfalls: HIGH — all pitfalls derived from verified technical constraints (API rate limits, SSR behavior, D1 limits)
- Genre data coverage: LOW — actual MB tag → Wikidata genre match rate unknown until pipeline runs

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable stack; MusicBrainz/Wikidata APIs are stable, Leaflet 1.x is long-term stable)
