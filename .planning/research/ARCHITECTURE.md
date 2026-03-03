# Architecture Research: v1.7 Discovery Redesign Integration

**Domain:** Integrating Rabbit Hole navigation, World Map, Context Sidebar, AI Companion, and supporting data pipelines into existing SvelteKit + Tauri 2.0 desktop music discovery engine
**Researched:** 2026-03-03
**Confidence:** HIGH for frontend routing/component architecture (verified against codebase), HIGH for D1 data flow (existing patterns confirmed), HIGH for taste.db schema extensions (Rust code reviewed), MEDIUM for Leaflet integration (multiple patterns exist, SSR bypass confirmed for Tauri), MEDIUM for similar-artists pipeline (tag overlap approach is sound but query performance at 2.6M artists needs benchmarking)

---

## System Context: What Already Exists

Before defining what's new, here's the architecture being built on top of:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                       BlackTape Desktop (Tauri 2.0)                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  SvelteKit SPA (adapter-static)                                     │  │
│  │                                                                     │  │
│  │  Layout: Titlebar → ControlBar → PanelLayout                       │  │
│  │          PanelLayout = LeftSidebar | MainContent | RightSidebar     │  │
│  │          (PaneForge resizable, 3 templates: cockpit/focus/minimal)  │  │
│  │                                                                     │  │
│  │  Data Layer:                                                        │  │
│  │    DbProvider → HttpProvider → api.blacktape.org/query (D1)         │  │
│  │    Tauri invoke → taste.db (local, Rust/rusqlite)                   │  │
│  │    Tauri invoke → library.db (local, Rust/rusqlite)                 │  │
│  │    Live fetches → MusicBrainz API, Wikipedia, Cover Art Archive     │  │
│  │                                                                     │  │
│  │  AI Layer:                                                          │  │
│  │    AiProvider interface → LocalAiProvider (llama-server :8847/:8848) │  │
│  │                         → RemoteAiProvider (OpenAI-compatible API)   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────┐  ┌───────────────────────────────────────────┐  │
│  │  Rust Backend        │  │  llama-server sidecar                     │  │
│  │  taste.db (rusqlite) │  │  :8847 generation (Qwen2.5 3B)           │  │
│  │  library.db          │  │  :8848 embedding (Nomic)                  │  │
│  │  secrets (keyring)   │  └───────────────────────────────────────────┘  │
│  └──────────────────────┘                                                 │
└───────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐   ┌──────────────────────┐
│  Cloudflare D1      │   │  MusicBrainz API     │
│  2.6M artists       │   │  Releases, links     │
│  26M artist-tag     │   │  Rate: 1 req/sec     │
│  4K genres          │   └──────────────────────┘
│  10K tag cooccur    │
└─────────────────────┘
```

### Existing DB Tables (D1 - Discovery Index)

| Table | Rows | Purpose |
|-------|------|---------|
| `artists` | 2.6M | name, slug, mbid, country, begin_year, ended, uniqueness_score |
| `artist_tags` | 26M+ | artist_id FK, tag, count (vote weight) |
| `artists_fts` | virtual | FTS5 search on name + tags |
| `tag_stats` | ~100K | tag, artist_count (precomputed) |
| `tag_cooccurrence` | 10K | tag_a, tag_b, shared_artists |
| `genres` | 4,086 | Wikidata + MB genres with lat/lng, description, mb_tag bridge |
| `genre_relationships` | ~2,900 | from_id, to_id, rel_type (subgenre/influenced_by/scene_of) |

### Existing DB Tables (taste.db - Local)

| Table | Purpose |
|-------|---------|
| `taste_tags` | User's musical taste (tag + weight + source) |
| `taste_anchors` | Pinned artists |
| `favorite_artists` | Saved favorite artists |
| `play_history` | Track playback log |
| `artist_visits` | Silent visit counter |
| `artist_summaries` | Cached AI summaries |
| `collections` / `collection_items` | Named shelves |
| `ai_settings` | Key-value store (also used for spotify tokens, theme prefs, etc.) |

### Existing Routes

| Route | Status | v1.7 Impact |
|-------|--------|-------------|
| `/discover` | Keep | Entry point to Rabbit Hole via tag filter |
| `/style-map` | Replace | Route kept, content changes to redirect or Rabbit Hole |
| `/kb` | Replace | Route kept, content changes |
| `/kb/genre/[slug]` | Modify heavily | Becomes Rabbit Hole genre page |
| `/time-machine` | Replace | Decade filtering integrated into Rabbit Hole |
| `/crate` | Replace | Random entry becomes Rabbit Hole "Random" mode |
| `/artist/[slug]` | Enhance | Add similar artists section, Rabbit Hole navigation |
| `/search` | Keep | Existing search feeds into Rabbit Hole |
| `/explore` | Keep | AI NL queries, independent |

---

## Recommended Architecture: New Components & Routes

### New Routes

```
src/routes/
  rabbit-hole/
    +page.svelte              # Landing: search / continue / random entry points
    +page.ts                  # Load: recent history trail from taste.db
    artist/[slug]/
      +page.svelte            # Rabbit Hole artist view (NOT /artist/[slug])
      +page.ts                # Load: artist + similar artists + genre context
    genre/[slug]/
      +page.svelte            # Rabbit Hole genre view
      +page.ts                # Load: genre + sub-genres + key artists + neighbors
  world-map/
    +page.svelte              # Leaflet map with city pins
    +page.ts                  # Load: artists with geocoded cities, genre locations
```

**Why separate `/rabbit-hole/artist/[slug]` from `/artist/[slug]`?**

The existing `/artist/[slug]` page is the full artist profile -- releases, links, bio, streaming embeds, queue management. It's a destination page. The Rabbit Hole artist view is a lightweight exploration card -- name, tags, similar artists, genre context, track samples. Different purpose, different data requirements, different layout. Trying to merge them into one page would create complex conditional rendering and make both worse.

The Rabbit Hole views link TO the full `/artist/[slug]` page via a "Full Profile" link. The full artist page links back into the Rabbit Hole via similar artists and tag clicks.

### New Components

```
src/lib/components/
  rabbit-hole/
    RabbitHoleNav.svelte      # Search + Continue + Random entry bar
    ArtistExploreCard.svelte  # Lightweight artist card for Rabbit Hole
    GenreExploreCard.svelte   # Genre card with description, subgenres, key artists
    SimilarArtistRow.svelte   # Clickable row: name, tags, uniqueness badge
    HistoryTrail.svelte       # Breadcrumb trail of exploration path
    DecadeFilter.svelte       # Clickable decade row (60s-20s), expandable to years
    TrackSample.svelte        # Track name + click-to-reveal source (lazy load)
  world-map/
    WorldMap.svelte           # Leaflet map wrapper (onMount dynamic import)
    CityPin.svelte            # Map pin with popup: city name, genre, artist count
    MapSidebar.svelte         # City detail panel: artists, genres in selected city
  ai/
    AiCompanion.svelte        # Persistent chat panel for discovery context
```

### Modified Components

| Component | Change |
|-----------|--------|
| `LeftSidebar.svelte` | Replace DISCOVERY_MODES array with Rabbit Hole + World Map. Remove Style Map, KB, Time Machine, Crate Dig links. |
| `RightSidebar.svelte` | Becomes the Context Sidebar. Add Rabbit Hole context (genre info, neighboring genres, similar artists preview). Add AI Companion panel (conditional on aiState.status === 'ready'). |
| `PanelLayout.svelte` | No structural changes needed. The 3-pane cockpit layout already provides Left + Main + Right. |
| `+layout.svelte` | Update header nav links (remove old discovery routes, add Rabbit Hole + World Map). |

---

## Data Flow: Feature by Feature

### 1. Similar Artists (Tag Overlap)

The backbone of the Rabbit Hole. Must be precomputed in the pipeline and stored in D1.

**Pipeline computation (new script: `pipeline/compute-similar-artists.mjs`):**

```
For each artist with tags:
  1. Get all tags for this artist (from artist_tags)
  2. For each tag, get all other artists with that tag
  3. Score each candidate by weighted tag overlap:
     similarity = SUM(1/artist_count_per_shared_tag) for shared tags
     (Rare shared tags contribute more -- same logic as uniqueness scoring)
  4. Store top 20 per artist in similar_artists table
```

**New D1 table: `similar_artists`**

| Column | Type | Description |
|--------|------|-------------|
| artist_id | INTEGER FK | Source artist |
| similar_id | INTEGER FK | Similar artist |
| score | REAL | Similarity score (higher = more similar) |
| shared_tags | TEXT | Comma-separated shared tag names |

**Index:** `CREATE INDEX idx_similar_artist ON similar_artists(artist_id, score DESC);`

**Scale concern:** 2.6M artists x 20 similar = 52M rows. This is large for D1. Mitigations:
- Only compute for artists that HAVE tags (~672K artists have at least one tag per tag_stats)
- This brings it to ~13.4M rows -- still substantial but within D1 limits (10GB database size, no row limit)
- Query pattern is always `WHERE artist_id = ? ORDER BY score DESC LIMIT N` which hits the index perfectly

**Data flow at runtime:**

```
/rabbit-hole/artist/[slug]
  +page.ts:
    1. getArtistBySlug(db, slug)           → artist data
    2. getSimilarArtists(db, artist.id, 20) → similar_artists JOIN artists
    3. getArtistGenres(db, artist.id)       → genres linked via mb_tag bridge
    Return: { artist, similarArtists, genres }
```

**New query function in queries.ts:**

```typescript
export async function getSimilarArtists(
  db: DbProvider, artistId: number, limit = 20
): Promise<ArtistResult[]> {
  return db.all<ArtistResult>(
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
            sa.score, sa.shared_tags
     FROM similar_artists sa
     JOIN artists a ON a.id = sa.similar_id
     WHERE sa.artist_id = ?
     ORDER BY sa.score DESC
     LIMIT ?`,
    artistId, limit
  );
}
```

### 2. Rabbit Hole Navigation Pattern

**URL-driven, SvelteKit standard routing.**

Every exploration click is a `goto()` to a new route. SvelteKit handles history natively. The browser back/forward buttons are the primary navigation mechanism -- no custom history stack needed.

```
User clicks "Radiohead" similar artist on "Thom Yorke" page:
  goto('/rabbit-hole/artist/radiohead')

  SvelteKit:
    - Pushes to browser history
    - Runs +page.ts load function
    - Renders new page content
    - Back button returns to /rabbit-hole/artist/thom-yorke
```

**History Trail (breadcrumb) -- taste.db persistence:**

The trail is NOT browser history (that's session-scoped). The trail is a persistent record of the user's exploration path stored in taste.db.

**New taste.db table: `exploration_history`**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| item_type | TEXT | 'artist' or 'genre' |
| item_slug | TEXT | URL slug |
| item_name | TEXT | Display name |
| visited_at | INTEGER | Unix timestamp |
| session_id | TEXT | Groups visits into exploration sessions |

**New Rust commands:**

```rust
#[tauri::command]
pub fn add_exploration_visit(item_type: String, item_slug: String, item_name: String,
                             session_id: String, state: State<TasteDbState>) -> Result<(), String>

#[tauri::command]
pub fn get_exploration_history(limit: i64, state: State<TasteDbState>)
  -> Result<Vec<ExplorationVisit>, String>

#[tauri::command]
pub fn get_current_session(state: State<TasteDbState>)
  -> Result<Vec<ExplorationVisit>, String>
```

**Session management:** A session is a continuous exploration. A new session starts when:
- User opens Rabbit Hole landing page
- User clicks "Random" (new thread)
- More than 30 minutes elapsed since last visit

**HistoryTrail.svelte** reads the current session and renders a clickable breadcrumb. Clicking any breadcrumb entry navigates via `goto()`.

### 3. World Map (Leaflet Integration)

**Leaflet must be dynamically imported** because it depends on `window` which doesn't exist during SSR. Since BlackTape is adapter-static (SPA), SSR is already disabled, but the import still needs to be in `onMount` to avoid Vite bundling issues.

**Component pattern:**

```svelte
<!-- WorldMap.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Map, Marker } from 'leaflet';

  let mapContainer: HTMLDivElement;
  let map: Map;

  interface Props {
    cities: Array<{ lat: number; lng: number; name: string; artist_count: number; genres: string }>;
    onCityClick: (city: { lat: number; lng: number; name: string }) => void;
  }
  let { cities, onCityClick }: Props = $props();

  onMount(async () => {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    map = L.map(mapContainer).setView([30, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '(c) CartoDB',
      maxZoom: 18
    }).addTo(map);

    // Add city markers
    for (const city of cities) {
      L.circleMarker([city.lat, city.lng], { radius: Math.min(city.artist_count / 10, 20) })
        .bindPopup(`<b>${city.name}</b><br>${city.artist_count} artists`)
        .on('click', () => onCityClick(city))
        .addTo(map);
    }
  });

  onDestroy(() => { map?.remove(); });
</script>
```

**Tile provider:** CartoDB Dark Matter tiles match BlackTape's dark aesthetic. Free tier, no API key needed.

**Data sources for map pins:**

1. **Genre locations** (already in D1): `genres` table has `origin_lat`, `origin_lng` for ~40% of genres. These are the primary pins.
2. **Artist cities** (NEW - pipeline work): Wikidata SPARQL for artist origin cities via MBID. New columns on `artists` table.

**New D1 columns on `artists`:**

| Column | Type | Description |
|--------|------|-------------|
| origin_city | TEXT | City name (e.g., "Manchester") |
| origin_lat | REAL | Latitude |
| origin_lng | REAL | Longitude |

**Pipeline script: `pipeline/geocode-artists.mjs`**

```
1. Query Wikidata SPARQL for all MusicBrainz artists with P19 (place of birth) or P740 (work location)
2. Extract city name + coordinates
3. UPDATE artists SET origin_city=?, origin_lat=?, origin_lng=? WHERE mbid=?
```

Coverage will be partial (well-known artists only). Estimated: 100K-300K artists geocoded out of 2.6M.

**New query functions:**

```typescript
export async function getArtistsByCity(db: DbProvider, lat: number, lng: number, radiusKm: number, limit = 50)
export async function getCityArtistCounts(db: DbProvider, limit = 500)  // For map pins
export async function getGenreLocations(db: DbProvider)  // Already partially available via genres table
```

**World Map page data flow:**

```
/world-map/+page.ts:
  1. getCityArtistCounts(db, 500)        → city pins for initial map view
  2. getGenreLocations(db)               → genre pins (from genres table)
  Return: { cities, genreLocations }

User clicks a city pin:
  → MapSidebar.svelte appears
  → Fetches getArtistsByCity(db, lat, lng, 50, 20)
  → Shows artists with "Jump to Rabbit Hole" links
```

### 4. Context Sidebar Enhancement

The existing `RightSidebar.svelte` already has page-path-aware rendering. It shows different content for artist pages vs genre pages vs default. The enhancement is:

**New rendering modes:**

```typescript
// RightSidebar.svelte — enhanced path detection
const isRabbitHoleArtist = $derived(pagePath.startsWith('/rabbit-hole/artist/'));
const isRabbitHoleGenre = $derived(pagePath.startsWith('/rabbit-hole/genre/'));
const isWorldMap = $derived(pagePath === '/world-map');
```

**Rabbit Hole Artist Context:**
- Similar artists preview (top 5, clickable)
- Genre chips (clickable into Rabbit Hole genre view)
- "Full Profile" link to /artist/[slug]
- AI Companion panel (if AI ready)

**Rabbit Hole Genre Context:**
- Sub-genres (clickable)
- Parent genres (clickable)
- Neighboring genres (clickable)
- Key artists (clickable into Rabbit Hole artist view)
- AI Companion panel (if AI ready)

**World Map Context:**
- Selected city info
- Artists in selected city
- Genres associated with city
- "Explore in Rabbit Hole" link

**Data passing pattern:**

The RightSidebar currently receives `pagePath` and optional `artistData` / `genreData` props from `+layout.svelte`. The Rabbit Hole pages need to pass their loaded data to the sidebar.

**Recommended approach: Svelte 5 module-level reactive state.**

```typescript
// src/lib/rabbit-hole/context.svelte.ts
export const rabbitHoleContext = $state({
  type: null as 'artist' | 'genre' | null,
  artistData: null as RabbitHoleArtistData | null,
  genreData: null as RabbitHoleGenreData | null,
  similarArtists: [] as ArtistResult[],
  neighboringGenres: [] as GenreNode[]
});
```

Each Rabbit Hole page sets this state in its `onMount` or reactive `$effect`. The RightSidebar reads from it. This avoids prop-drilling through the layout.

### 5. AI Companion Integration

**Not a new route. A panel inside RightSidebar, visible only when aiState.status === 'ready'.**

**Component: `AiCompanion.svelte`**

```
┌──────────────────────────────┐
│  AI Companion                │
│  ─────────────────────────── │
│  [Current context: Shoegaze] │
│                              │
│  User: "What's heavier?"     │
│  AI: "Try post-metal..."     │
│    → [Neurosis] [Isis]       │
│                              │
│  [Ask something...]     [>]  │
└──────────────────────────────┘
```

**Data flow:**

```
1. User types question in AiCompanion input
2. Build prompt:
   - System: INJECTION_GUARD + "You are a music discovery assistant..."
   - Context: current page type (artist/genre), current tags, neighboring genres
   - User: the question
3. Call getAiProvider().complete(prompt, { maxTokens: 300, temperature: 0.7 })
4. Parse response for artist/genre references
5. Render response with clickable links to Rabbit Hole pages
```

**Artist/genre name resolution in AI responses:**

The AI will return artist names in its text. These need to be matched against the D1 index to create clickable links. Reuse the existing `matchArtistInDb()` pattern from `/explore/+page.svelte`:

```typescript
async function matchArtistInDb(name: string): Promise<string | null> {
  const db = await getProvider();
  const results = await searchArtists(db, name, 3);
  // Exact case-insensitive match preferred
  return results.find(r => r.name.toLowerCase() === name.toLowerCase())?.slug ?? results[0]?.slug ?? null;
}
```

**Context awareness pattern:**

```typescript
// In AiCompanion.svelte
import { rabbitHoleContext } from '$lib/rabbit-hole/context.svelte';

let contextDescription = $derived(() => {
  if (rabbitHoleContext.type === 'artist') {
    const a = rabbitHoleContext.artistData;
    return `Currently viewing artist "${a?.name}". Tags: ${a?.tags}. Similar artists: ${rabbitHoleContext.similarArtists.map(s => s.name).join(', ')}`;
  }
  if (rabbitHoleContext.type === 'genre') {
    const g = rabbitHoleContext.genreData;
    return `Currently viewing genre "${g?.name}". Subgenres: ${rabbitHoleContext.neighboringGenres.map(n => n.name).join(', ')}`;
  }
  return 'User is on the discovery landing page.';
});
```

### 6. History Trail Persistence

**Stored in taste.db** (not localStorage). Reasons:
- taste.db already has the user's profile data, play history, visit tracking
- Persists across app restarts (localStorage does too, but taste.db is backed up)
- Can be queried efficiently with SQL (e.g., "show last 50 visits across all sessions")
- Consistent with existing patterns (play_history, artist_visits are both in taste.db)

The `exploration_history` table schema is defined above in section 2.

**"Continue" feature on Rabbit Hole landing:**

```
/rabbit-hole/+page.ts:
  1. invoke('get_exploration_history', { limit: 10 })
  2. Group by session_id, show most recent session first
  3. Each session shows: starting point → last point, timestamp
  4. Click → goto('/rabbit-hole/artist/{slug}') or goto('/rabbit-hole/genre/{slug}')
```

### 7. Track/Release Caching Layer

**Stored in taste.db** (not a separate cache.db). Reasons:
- Avoids another Rust Mutex<Connection> in managed state
- taste.db already has schema migration in `init_taste_db()`
- Cache is user-local data (different users may fetch different releases)
- Can be cleared without affecting the discovery index

**New taste.db tables:**

```sql
CREATE TABLE IF NOT EXISTS cached_releases (
    artist_mbid TEXT NOT NULL,
    release_mbid TEXT NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    type TEXT,
    cover_art_url TEXT,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (artist_mbid, release_mbid)
);
CREATE INDEX IF NOT EXISTS idx_cached_releases_artist ON cached_releases(artist_mbid);

CREATE TABLE IF NOT EXISTS cached_release_links (
    release_mbid TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (release_mbid, platform)
);

CREATE TABLE IF NOT EXISTS cached_tracks (
    release_mbid TEXT NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    duration_ms INTEGER,
    PRIMARY KEY (release_mbid, position)
);

CREATE TABLE IF NOT EXISTS cached_artist_bios (
    artist_mbid TEXT PRIMARY KEY,
    bio TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
);
```

**Cache invalidation:** TTL-based. If `fetched_at` is older than 30 days, re-fetch. MusicBrainz data doesn't change frequently.

**New Rust commands:**

```rust
#[tauri::command] pub fn get_cached_releases(artist_mbid: String, ...) -> Result<Vec<CachedRelease>, String>
#[tauri::command] pub fn cache_releases(artist_mbid: String, releases: Vec<CachedRelease>, ...) -> Result<(), String>
#[tauri::command] pub fn get_cached_bio(artist_mbid: String, ...) -> Result<Option<CachedBio>, String>
#[tauri::command] pub fn cache_bio(artist_mbid: String, bio: String, ...) -> Result<(), String>
```

**Frontend caching layer (`src/lib/cache/releases.ts`):**

```typescript
export async function getReleasesWithCache(artistMbid: string, fetchFn: typeof fetch): Promise<ReleaseGroup[]> {
  // 1. Check taste.db cache via Tauri invoke
  const cached = await invoke('get_cached_releases', { artistMbid });
  if (cached && cached.length > 0 && !isStale(cached[0].fetched_at, 30)) {
    return cached;
  }

  // 2. Fetch live from MusicBrainz
  const live = await fetchReleasesFromMB(artistMbid, fetchFn);

  // 3. Cache for next time (fire-and-forget)
  invoke('cache_releases', { artistMbid, releases: live }).catch(() => {});

  return live;
}
```

### 8. Decade Filtering

**Not a separate component with its own data source.** Decade filtering is a UI control that modifies query parameters on whatever page it's on.

**DecadeFilter.svelte:**

```svelte
<script lang="ts">
  interface Props {
    availableDecades: string[];  // e.g., ['60s', '70s', '80s', '90s', '00s', '10s', '20s']
    selectedDecade: string | null;
    selectedYear: number | null;
    onDecadeChange: (decade: string | null) => void;
    onYearChange: (year: number | null) => void;
  }
</script>
```

Renders a row of decade buttons. Clicking one filters the current view. Clicking again deselects. Long-press or second click expands into individual years within that decade.

**Integration:** Used in Rabbit Hole genre pages and the main Discover page. The parent page passes available decades (computed from artist begin_year data) and handles the filter callback by updating URL params via `goto()`.

---

## Component Boundaries & Communication

```
┌──────────────────────────────────────────────────────────────────┐
│ +layout.svelte                                                    │
│   ┌──────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│   │ LeftSidebar  │  │ MainContent       │  │ RightSidebar    │  │
│   │              │  │ (route children)  │  │                 │  │
│   │ - Rabbit Hole│  │                   │  │ Context panel:  │  │
│   │ - World Map  │  │ /rabbit-hole/*    │  │ - Genre info    │  │
│   │ - Library    │  │ /world-map        │  │ - Similar       │  │
│   │ - Explore    │  │ /artist/*         │  │ - AI Companion  │  │
│   │ - Profile    │  │ /discover         │  │ - Queue         │  │
│   │ - Settings   │  │ /search           │  │                 │  │
│   └──────────────┘  └───────────────────┘  └─────────────────┘  │
│                                                                   │
│   Shared state (module-level $state):                            │
│   - rabbitHoleContext (context.svelte.ts)                         │
│   - aiState (ai/state.svelte.ts)                                 │
│   - playerState (player/state.svelte.ts)                         │
│   - tasteProfile (taste/profile.svelte.ts)                       │
└──────────────────────────────────────────────────────────────────┘
```

**Communication patterns:**

| From | To | Mechanism |
|------|----|-----------|
| Rabbit Hole page → RightSidebar | Module-level `rabbitHoleContext` $state | Reactive, no props needed |
| RightSidebar → Rabbit Hole page | `goto()` navigation (links) | Standard SvelteKit routing |
| AI Companion → Rabbit Hole page | `goto()` for artist/genre links in responses | Standard SvelteKit routing |
| World Map → Rabbit Hole | `goto('/rabbit-hole/artist/...')` links | Standard SvelteKit routing |
| HistoryTrail → taste.db | Tauri invoke | Same pattern as play_history |
| Any page → D1 | `getProvider()` → `HttpProvider` | Existing pattern, unchanged |

---

## Pipeline Work Required

Three pipeline scripts need to be created/run BEFORE the frontend features can work:

### Script 1: `pipeline/compute-similar-artists.mjs`

**Input:** Existing `artists` + `artist_tags` + `tag_stats` tables in D1 DB
**Output:** New `similar_artists` table in D1 DB
**Algorithm:**

```
For each artist_id in (SELECT DISTINCT artist_id FROM artist_tags):
  tags = SELECT tag, count FROM artist_tags WHERE artist_id = ?
  candidates = {}

  For each tag in tags:
    weight = 1.0 / tag_stats[tag].artist_count  // rare tags weigh more
    co_artists = SELECT artist_id FROM artist_tags WHERE tag = ? AND artist_id != source
    For each co_artist:
      candidates[co_artist] += weight

  top_20 = sort candidates by score DESC, take 20
  INSERT INTO similar_artists (artist_id, similar_id, score, shared_tags)
```

**Performance:** This is O(artists * avg_tags * avg_artists_per_tag). For 672K tagged artists with avg 5 tags and avg 500 artists per tag, that's ~1.7 billion comparisons. Must be run against a local SQLite copy (not D1 API). Use better-sqlite3 for speed. Expected runtime: 30-60 minutes.

**Must run BEFORE:** Any Rabbit Hole frontend work that shows similar artists.

### Script 2: `pipeline/geocode-artists.mjs`

**Input:** MusicBrainz MBIDs from artists table
**Output:** `origin_city`, `origin_lat`, `origin_lng` columns on artists table
**Method:** Wikidata SPARQL queries for P19 (place of birth) / P740 (work location)

**Must run BEFORE:** World Map feature.

### Script 3: Add new tables to D1 upload

After computing similar_artists locally, the table needs to be included in the D1 database upload. The existing pipeline builds `mercury.db` locally, then it's uploaded to D1.

---

## Suggested Build Order

Based on dependency analysis:

```
Phase 1: Pipeline (no frontend dependency)
  ├── 1a. Compute similar artists table
  ├── 1b. Geocode artist cities from Wikidata
  └── 1c. Upload updated DB to D1

Phase 2: Core Rabbit Hole (depends on Phase 1a)
  ├── 2a. New routes: /rabbit-hole, /rabbit-hole/artist/[slug], /rabbit-hole/genre/[slug]
  ├── 2b. New queries: getSimilarArtists, getArtistGenres
  ├── 2c. Rabbit Hole landing page (search/continue/random)
  ├── 2d. Artist explore card + similar artist rows
  ├── 2e. Genre explore card + subgenre/neighbor navigation
  └── 2f. Update LeftSidebar navigation

Phase 3: History & Context (depends on Phase 2)
  ├── 3a. exploration_history table in taste.db + Rust commands
  ├── 3b. HistoryTrail component
  ├── 3c. rabbitHoleContext module-level state
  ├── 3d. RightSidebar Rabbit Hole context rendering
  └── 3e. Decade filter component + integration

Phase 4: World Map (depends on Phase 1b)
  ├── 4a. Leaflet dynamic import + WorldMap.svelte
  ├── 4b. Map page with city pins + genre pins
  ├── 4c. City detail sidebar
  └── 4d. Cross-links to Rabbit Hole

Phase 5: AI Companion (depends on Phase 3c)
  ├── 5a. AiCompanion.svelte component
  ├── 5b. Context-aware prompt building
  ├── 5c. Response parsing with artist/genre link resolution
  └── 5d. Integration into RightSidebar

Phase 6: Caching & Polish
  ├── 6a. Track/release cache tables in taste.db + Rust commands
  ├── 6b. Frontend caching layer (releases.ts)
  ├── 6c. TrackSample lazy-load component
  └── 6d. Old route redirects (style-map → rabbit-hole, etc.)
```

**Key dependency chain:** Pipeline (similar artists) must complete before any Rabbit Hole artist page can show similar artists. Pipeline (geocoding) must complete before World Map. Everything else in the frontend can be stubbed/mocked during development.

**Parallelizable:** Phase 1 (pipeline) and Phase 2 (route scaffolding with mock data) can start in parallel. Phase 4 (World Map) is independent of Phase 3 (History/Context). Phase 5 (AI Companion) needs Phase 3c's shared state but nothing else from Phase 3.

---

## Patterns to Follow

### Pattern 1: URL-Driven State (established)

All discovery state lives in the URL. Tag filters, search queries, genre slugs, artist slugs -- all in the URL. This makes every state shareable and bookmarkable. The Rabbit Hole continues this pattern: `/rabbit-hole/artist/radiohead`, `/rabbit-hole/genre/shoegaze?decade=90s`.

### Pattern 2: Module-Level $state Singletons (established)

Global reactive state uses Svelte 5 `$state` in `.svelte.ts` files. PlayerState, aiState, tasteProfile, queueState all follow this. The new `rabbitHoleContext` follows the same pattern.

### Pattern 3: Dynamic Imports for Platform-Specific Code (established)

Tauri invoke, Leaflet, and other browser/platform-specific code is always dynamically imported. The codebase consistently uses `const { invoke } = await import('@tauri-apps/api/core');` inside functions, never at module top-level.

### Pattern 4: Best-Effort External APIs (established)

All MusicBrainz/Wikipedia fetches are wrapped in try/catch with graceful degradation. The page always renders from local data; external data enriches it. The Rabbit Hole follows this: similar artists (local D1) always show; tracks/releases (live MB fetch) are progressive enhancement.

### Pattern 5: DbProvider Abstraction (established)

All new D1 queries go through the DbProvider interface. New query functions are added to `queries.ts`. No raw SQL outside that file.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Custom History Stack

**What:** Building a custom navigation history array in JavaScript instead of using SvelteKit's built-in routing.
**Why bad:** Duplicates browser history, breaks back/forward buttons, creates state sync bugs, adds complexity.
**Instead:** Use `goto()` for navigation. Browser history is the history stack. Persist exploration trail to taste.db for "Continue" feature only.

### Anti-Pattern 2: Merging Rabbit Hole + Full Artist Page

**What:** Trying to make `/artist/[slug]` serve double duty as both the full profile and the lightweight exploration card.
**Why bad:** The full artist page loads releases, links, bio, streaming sources -- heavy data. The Rabbit Hole view needs to be lightweight (similar artists, tags, genre context). Conditional rendering makes both worse and complicates the load function.
**Instead:** Separate routes. Link between them.

### Anti-Pattern 3: Real-Time Similar Artists Computation

**What:** Computing similar artists at query time instead of precomputing in the pipeline.
**Why bad:** The tag overlap computation across 2.6M artists is expensive. Even with indexes, joining artist_tags against itself for every page load would add 500ms+ latency.
**Instead:** Precompute in pipeline, store in `similar_artists` table, query by index.

### Anti-Pattern 4: Storing History in localStorage

**What:** Using localStorage for the exploration trail.
**Why bad:** Not queryable (no "show sessions from last week"), not backed up with taste.db, different API pattern from everything else in the app.
**Instead:** taste.db via Tauri invoke, consistent with play_history and artist_visits.

### Anti-Pattern 5: Leaflet at Top-Level Import

**What:** `import L from 'leaflet'` at the top of a .svelte file.
**Why bad:** Leaflet accesses `window` on import. Even though BlackTape is SPA-only (no SSR), Vite may still analyze the import during build. Dynamic import in `onMount` is the safe pattern.
**Instead:** `const L = await import('leaflet')` inside `onMount()`.

---

## Scalability Considerations

| Concern | Current (2.6M artists) | At 5M artists | At 10M artists |
|---------|----------------------|----------------|-----------------|
| similar_artists table | ~13.4M rows, ~500MB | ~26M rows, ~1GB | ~52M rows, ~2GB |
| D1 query latency | <50ms (indexed) | <50ms (indexed) | <100ms (index may not fit RAM) |
| Pipeline compute time | ~45 min | ~2 hours | ~6 hours |
| Geocoding coverage | ~15% of artists | ~12% (diminishing returns) | ~10% |
| Map pin density | Manageable | Need clustering | Must cluster |

**Leaflet clustering:** At >500 city pins, use `leaflet.markercluster` for performance. Already a known pattern -- install `leaflet.markercluster` alongside `leaflet`.

---

## Sources

- [Using Leaflet with SvelteKit - Stanislav Khromov](https://khromov.se/using-leaflet-with-sveltekit/) -- Dynamic import pattern, SSR workaround
- [Shallow routing -- SvelteKit Docs](https://svelte.dev/docs/kit/shallow-routing) -- pushState/replaceState for history
- [State management -- SvelteKit Docs](https://kit.svelte.dev/docs/state-management) -- Svelte 5 module-level state patterns
- Codebase: `src/lib/db/queries.ts` (existing query patterns), `src/lib/db/provider.ts` (DbProvider interface), `src-tauri/src/ai/taste_db.rs` (taste.db schema), `src/lib/components/RightSidebar.svelte` (context panel patterns), `src/routes/explore/+page.svelte` (AI NL query pattern)
- `docs/discovery-redesign-research.md` -- Design decisions and data audit from 2026-03-03 conversation
