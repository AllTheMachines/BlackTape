# Mercury — Technical Architecture

A comprehensive guide to how Mercury works, how its parts connect, and how data flows through the system. Written for developers who need to understand, modify, or extend the codebase.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Directory Structure](#directory-structure)
3. [Data Model](#data-model)
4. [Database Layer](#database-layer)
5. [Search System](#search-system)
6. [Artist Pages & External APIs](#artist-pages--external-apis)
7. [Embed System](#embed-system)
8. [Local Music Player](#local-music-player)
9. [Discovery Bridge](#discovery-bridge)
10. [Discovery Engine](#discovery-engine)
11. [Knowledge Base](#knowledge-base)
12. [Underground Aesthetic](#underground-aesthetic)
13. [Community Foundation](#community-foundation-phase-9)
14. [Communication Layer](#communication-layer-phase-10)
15. [Scene Building](#scene-building)
16. [Curator / Blog Tools](#curator--blog-tools)
17. [Build System](#build-system)
18. [Configuration Reference](#configuration-reference)
19. [AI Subsystem](#ai-subsystem)
20. [Module Dependency Map](#module-dependency-map)

---

## System Overview

Mercury is a music discovery engine for the desktop. It runs as a Tauri 2.0 application — a SvelteKit SPA rendered inside a Rust/WebView2 shell.

The core principle is **"the internet is the database"**: Mercury stores only a search index locally (artist names, tags, countries). Everything else — releases, cover art, streaming links, bios — is fetched live from public APIs (MusicBrainz, Wikipedia, Cover Art Archive). Audio is never hosted; it's always embedded from where it already lives (Bandcamp, Spotify, SoundCloud, YouTube).

```
┌──────────────────────────────────────────────────────────────────┐
│                       Mercury Desktop                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐          │
│  │ SvelteKit UI │  │ Tauri (Rust) │  │ HTML5 Audio   │          │
│  │  Search       │  │  Scanner     │  │  Local files  │          │
│  │  Artist pages │  │  library.db  │  │  via asset:// │          │
│  │  Library      │  │  taste.db    │  │               │          │
│  │  Explore (NL) │  │  AI sidecar  │  │               │          │
│  │  Player bar   │  │  IPC bridge  │  │               │          │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘          │
│         │                  │                                      │
│    mercury.db          library.db          taste.db               │
│    (2.8M artists)      (user's files)      (AI + taste profile)  │
│                                                                   │
│         ┌──────────────────────────────┐                         │
│         │  llama-server (sidecar)      │                         │
│         │  :8847 generation (Qwen2.5)  │                         │
│         │  :8848 embedding (Nomic)     │                         │
│         └──────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐    ┌──────────────────────┐
│   MusicBrainz API   │    │  Wikipedia REST API   │
│  Releases, links    │    │  Artist bios          │
└─────────────────────┘    └──────────────────────┘
```

---

## Directory Structure

```
Mercury/
├── src/                          # SvelteKit frontend
│   ├── lib/
│   │   ├── config.ts             # Project name (single variable for renaming)
│   │   ├── platform.ts           # isTauri() — Tauri webview detection via __TAURI_INTERNALS__
│   │   ├── bio.ts                # Wikipedia bio fetcher
│   │   ├── styles/theme.css      # CSS custom properties (dark theme)
│   │   ├── db/                   # Database abstraction layer
│   │   │   ├── provider.ts       # DbProvider interface + TauriProvider factory
│   │   │   ├── tauri-provider.ts # Tauri SQLite implementation (tauri-plugin-sql)
│   │   │   └── queries.ts        # All SQL queries (FTS5 search, tag search, lookup)
│   │   ├── embeds/               # Platform embed logic
│   │   │   ├── types.ts          # Platform types, link structures
│   │   │   ├── categorize.ts     # URL + MB relation categorization
│   │   │   ├── bandcamp.ts       # Bandcamp embed detection
│   │   │   ├── spotify.ts        # Spotify embed URLs
│   │   │   ├── soundcloud.ts     # SoundCloud oEmbed
│   │   │   └── youtube.ts        # YouTube embed URLs
│   │   ├── player/               # Audio playback (Tauri only)
│   │   │   ├── state.svelte.ts   # PlayerTrack interface + reactive state
│   │   │   ├── audio.svelte.ts   # HTML5 Audio engine + convertFileSrc
│   │   │   ├── queue.svelte.ts   # Queue state + navigation + repeat/shuffle
│   │   │   └── index.ts          # Barrel export
│   │   ├── library/              # Local music library (Tauri only)
│   │   │   ├── types.ts          # LocalTrack, MusicFolder, ScanProgress
│   │   │   ├── scanner.ts        # Tauri invoke wrappers (dynamic imports)
│   │   │   ├── store.svelte.ts   # Reactive library state + album grouping
│   │   │   ├── matching.ts       # Artist name normalization + FTS5 matching
│   │   │   └── index.ts          # Barrel export
│   │   ├── ai/                   # AI provider + prompts (all platforms)
│   │   │   ├── engine.ts         # AiProvider interface + singleton
│   │   │   ├── local-provider.ts # llama-server HTTP client
│   │   │   ├── remote-provider.ts# OpenAI-compatible API client
│   │   │   ├── prompts.ts        # Centralized prompt templates
│   │   │   ├── model-manager.ts  # Model download orchestration
│   │   │   ├── state.svelte.ts   # Reactive AI state ($state runes)
│   │   │   └── index.ts          # Barrel export
│   │   ├── taste/                # Taste profile (Tauri only)
│   │   │   ├── profile.svelte.ts # Reactive taste state
│   │   │   ├── favorites.ts      # Favorite artist CRUD
│   │   │   ├── signals.ts        # Taste tag computation
│   │   │   ├── embeddings.ts     # Embedding generation wrappers
│   │   │   └── index.ts          # Barrel export
│   │   └── components/           # Svelte components
│   │       ├── SearchBar.svelte
│   │       ├── ArtistCard.svelte
│   │       ├── TagChip.svelte
│   │       ├── ReleaseCard.svelte
│   │       ├── EmbedPlayer.svelte
│   │       ├── ExternalLink.svelte
│   │       ├── DatabaseSetup.svelte
│   │       ├── Player.svelte
│   │       ├── Queue.svelte
│   │       ├── LibraryBrowser.svelte
│   │       ├── FolderManager.svelte
│   │       ├── NowPlayingDiscovery.svelte
│   │       ├── AiRecommendations.svelte
│   │       ├── AiSettings.svelte
│   │       ├── FavoriteButton.svelte
│   │       ├── ExploreResult.svelte
│   │       ├── TasteEditor.svelte
│   │       ├── UniquenessScore.svelte
│   │       ├── StyleMap.svelte
│   │       ├── GenreGraph.svelte
│   │       ├── SceneMap.svelte
│   │       ├── GenreGraphEvolution.svelte
│   │       └── LinerNotes.svelte
│   └── routes/
│       ├── +layout.svelte        # Root layout (header, nav, player)
│       ├── +layout.ts            # SSR disabled via VITE_TAURI=1 (SPA mode)
│       ├── +page.svelte          # Landing page
│       ├── search/               # Search results
│       ├── artist/[slug]/        # Artist detail page
│       │   └── release/[mbid]/   # Release detail page (with LinerNotes)
│       ├── library/              # Local music library (Tauri only)
│       ├── explore/              # NL explore page (Tauri only)
│       ├── settings/             # Settings page (Tauri only)
│       ├── discover/             # Tag intersection browsing
│       ├── crate/                # Crate digging mode
│       ├── style-map/            # Style Map visualization
│       ├── kb/                   # Knowledge Base
│       │   ├── +page.svelte      # KB landing + genre graph
│       │   └── genre/[slug]/     # Genre/scene detail page
│       ├── time-machine/         # Year browser
│       └── api/                  # Utility server routes
│           ├── soundcloud-oembed/# SoundCloud oEmbed proxy (CORS workaround)
│           ├── unfurl/           # Mercury URL unfurl for Nostr comms
│           └── rss/collection/[id]/ # Collection RSS feed
├── src-tauri/                    # Tauri/Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # App setup, command registration
│       ├── scanner/
│       │   ├── mod.rs            # Tauri commands (scan, query, folder mgmt)
│       │   └── metadata.rs       # lofty-based audio metadata reader
│       ├── library/
│       │   ├── mod.rs            # Module entry
│       │   └── db.rs             # rusqlite schema + CRUD operations
│       └── ai/
│           ├── mod.rs            # Module declarations
│           ├── sidecar.rs        # llama-server lifecycle management
│           ├── taste_db.rs       # taste.db schema + CRUD
│           ├── embeddings.rs     # sqlite-vec + vector operations
│           └── download.rs       # Model download with streaming progress
├── tools/
│   └── build-log-viewer/         # OBS browser source for YouTube stream
├── BUILD-LOG.md                  # Documentary record of all decisions
├── ARCHITECTURE.md               # This file
└── CLAUDE.md                     # AI assistant context
```

---

## Data Model

### Discovery Index (mercury.db)

Contains 2.8 million artists sourced from MusicBrainz data dumps. This is the search index — it does NOT store releases, links, or audio.

**artists** — One row per MusicBrainz artist.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Internal ID |
| mbid | TEXT UNIQUE | MusicBrainz ID (UUID) |
| name | TEXT | Artist name |
| slug | TEXT | URL-safe slug (e.g., `radiohead`) |
| type | TEXT | Person, Group, Orchestra, etc. |
| country | TEXT | ISO country code |
| begin_year | INTEGER | Year formed/born |
| ended | INTEGER | 0 = active, 1 = disbanded/deceased |

**artist_tags** — Tags (genres/styles) with vote counts from MusicBrainz.

| Column | Type | Description |
|--------|------|-------------|
| artist_id | INTEGER FK | References artists.id |
| tag | TEXT | Tag name (e.g., `shoegaze`) |
| count | INTEGER | Community vote count |

**artists_fts** — FTS5 virtual table for full-text search.

| Column | Source |
|--------|--------|
| name | Artist name (tokenized with porter stemmer + unicode61) |
| tags | All tags concatenated |

**tag_stats** — Pre-computed per-tag popularity statistics. Built at pipeline time to avoid slow GROUP BY against 672K artist_tags rows at query time.

| Column | Type | Description |
|--------|------|-------------|
| tag | TEXT PK | Tag name |
| artist_count | INTEGER | Number of artists with this tag |

**tag_cooccurrence** — Pre-computed co-occurrence edges between tag pairs. Built at pipeline time. Used by the Style Map visualization.

| Column | Type | Description |
|--------|------|-------------|
| tag_a | TEXT | First tag (CHECK tag_a < tag_b — canonical ordering, no duplicate edges) |
| tag_b | TEXT | Second tag |
| shared_artists | INTEGER | Number of artists tagged with both |

Filters applied at build time: both tags must have `artist_count >= 2`, pairs must have `shared_artists >= 5`, total limited to 10,000 rows to prevent combinatorial explosion.

**genres** — Genre and scene nodes for the Knowledge Base graph.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| slug | TEXT UNIQUE | URL-safe identifier (e.g., `shoegaze`) |
| name | TEXT | Display name |
| type | TEXT | `genre`, `scene`, or `city` |
| wikidata_id | TEXT | Wikidata QID for description fetching |
| description | TEXT | Wikipedia extract or null |
| inception_year | INTEGER | Year the genre/scene emerged |
| origin_lat | REAL | Latitude of geographic origin |
| origin_lng | REAL | Longitude of geographic origin |
| mb_tag | TEXT | Bridge to `artist_tags.tag` for key-artist lookup |

**genre_relationships** — Directed edges between genre nodes.

| Column | Type | Description |
|--------|------|-------------|
| from_id | INTEGER FK | References genres.id |
| to_id | INTEGER FK | References genres.id |
| rel_type | TEXT | `subgenre`, `influenced_by`, or `scene_of` |

### Local Library (library.db)

Separate database managed by Rust (rusqlite). Stores metadata from the user's local audio files.

**local_tracks** — One row per audio file.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| path | TEXT UNIQUE | Absolute file path (forward slashes) |
| title | TEXT | Track title from metadata |
| artist | TEXT | Artist name from metadata |
| album | TEXT | Album name |
| album_artist | TEXT | Album artist (for compilations) |
| track_number | INTEGER | Track number within disc |
| disc_number | INTEGER | Disc number |
| genre | TEXT | Genre tag |
| year | INTEGER | Release year |
| duration_secs | REAL | Duration in seconds |
| file_modified | INTEGER | File modification timestamp |
| created_at | TEXT | When the track was scanned |

**music_folders** — User-registered music directories.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| path | TEXT UNIQUE | Absolute folder path |
| added_at | TEXT | When the folder was added |

### Why Two Databases?

- **mercury.db** is managed by `tauri-plugin-sql` (via sqlx) — used for the 2.8M-artist discovery index.
- **library.db** is managed by `rusqlite` — used for local track metadata written by the Rust scanner.

They use different SQLite bindings because both link against `libsqlite3-sys`. Using the same version (0.28) of that C library avoids linker conflicts. The two databases serve fundamentally different purposes and never interact at the SQL level.

---

## Database Layer

### DbProvider Interface

All database queries go through an abstract interface:

```typescript
// src/lib/db/provider.ts
export interface DbProvider {
    all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
    get<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}
```

### Implementation

**TauriProvider** (`tauri-provider.ts`) — Wraps `@tauri-apps/plugin-sql`. Lazy singleton — database connection opens on first query. Opens `mercury.db` from the app data directory (`%APPDATA%/com.mercury.app/` on Windows).

### Factory

```typescript
export async function getProvider(): Promise<DbProvider> {
    // Returns TauriProvider singleton. Uses dynamic import to defer
    // loading @tauri-apps/api until the first DB query.
}
```

### Query Functions

All queries live in `src/lib/db/queries.ts`:

| Function | Purpose |
|----------|---------|
| `searchArtists(db, query, limit)` | FTS5 full-text search with LIKE fallback |
| `searchByTag(db, tag, limit)` | Find artists by tag, ordered by vote count |
| `getArtistBySlug(db, slug)` | Single artist lookup by URL slug |
| `sanitizeFtsQuery(input)` | Strip FTS5 special characters from user input |

FTS5 search uses the porter stemmer and unicode61 tokenizer. Exact name matches are boosted above FTS5 rank results via a `CASE` expression in the `ORDER BY`.

---

## Search System

### Data Flow

```
User types query
    → SearchBar.svelte calls goto('/search?q=...')
    → +page.ts queries local mercury.db via TauriProvider
    → Also queries library.db for local track matches
    → +page.svelte renders "Your Library" section + ArtistCard grid
```

### Search Modes

- **Artist search** (`mode=artist`): FTS5 MATCH on artist name. Exact matches boosted first, then FTS5 rank. Falls back to LIKE if query has only special characters.
- **Tag search** (`mode=tag`): Exact match on `artist_tags.tag`, ordered by tag vote count descending.

---

## Artist Pages & External APIs

Artist pages combine local index data with live API calls:

```
/artist/[slug]
    ├── Local: Artist name, tags, country, type (from mercury.db)
    ├── Live: Releases + cover art (MusicBrainz API + Cover Art Archive)
    ├── Live: External links (MusicBrainz API, categorized)
    └── Live: Bio snippet (Wikipedia REST API)
```

### MusicBrainz API Calls

Made client-side from `+page.ts` (best-effort — page renders from local DB data alone if any fetch fails):

- **Releases** — `GET https://musicbrainz.org/ws/2/release-group?artist={mbid}&inc=url-rels&type=album|single|ep`. Cover art URLs constructed from Cover Art Archive (`https://coverartarchive.org/release-group/{mbid}/front-250`). Streaming links extracted from release-level URL relationships.
- **Links** — `GET https://musicbrainz.org/ws/2/artist/{mbid}?inc=url-rels`. Categorized by MB relationship type (streaming, social, official, info, support) with domain-based fallback.

### Link Categorization

Links are categorized in two steps:

1. **MB relationship type** → semantic category (e.g., `'streaming'` → `streaming`, `'social network'` → `social`)
2. **Domain fallback** for links without a type (e.g., `bandcamp.com` → `bandcamp` platform)

Display labels are generated from URLs with friendly name mapping (e.g., `open.spotify.com` → "Spotify").

---

## Embed System

Mercury embeds players from four platforms. No audio is ever hosted.

### Platform Priority

```typescript
const PLATFORM_PRIORITY = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];
```

The first available platform in this order becomes the auto-playing embed on the artist page.

### How Embeds Work

| Platform | Method | Notes |
|----------|--------|-------|
| Bandcamp | URL detection | Looks for `*.bandcamp.com` or `/album/` patterns |
| Spotify | URL transform | `open.spotify.com/artist/X` → embed iframe URL |
| SoundCloud | oEmbed API | Routed through local `/api/soundcloud-oembed` server route to avoid CORS |
| YouTube | URL transform | `youtube.com/watch?v=X` → embed iframe URL |

Each platform module exports functions to detect URLs and generate embed-ready URLs or HTML.

---

## Local Music Player

The player system has four layers, each in its own module:

### Layer 1: Rust Scanner Backend (`src-tauri/src/scanner/`)

Handles file system traversal and metadata extraction:

- **walkdir** recursively traverses user-selected directories
- **lofty 0.23** reads metadata from 8 audio formats: MP3, FLAC, OGG, M4A, AAC, WAV, Opus, WavPack
- **rusqlite** writes track metadata to `library.db`
- Progress streamed to frontend via Tauri `Channel<ScanProgress>` (batched every 50 files)

**Tauri Commands:**

| Command | Purpose |
|---------|---------|
| `scan_folder(path, on_progress)` | Scan directory, read metadata, store in DB |
| `get_library_tracks()` | Return all tracks from library.db |
| `get_music_folders()` | Return registered music directories |
| `add_music_folder(path)` | Register a new music directory |
| `remove_music_folder(path)` | Unregister a music directory |

**Managed State:** `LibraryState(Mutex<Connection>)` — thread-safe rusqlite connection initialized in Tauri's `setup()` callback.

### Layer 2: Audio Engine (`src/lib/player/audio.svelte.ts`)

Module-scoped HTML5 `Audio` element with Tauri asset protocol:

```
Local file path → convertFileSrc() → asset:// URL → HTMLAudioElement
```

- Audio element created lazily on first `playTrack()` call
- Event listeners sync with `playerState` (timeupdate, loadedmetadata, ended, play, pause)
- `ended` event dynamically imports `queue.svelte` to call `playNext()` (avoids circular dependency)
- Volume, seek, mute state managed here

**Key exports:** `playTrack`, `pause`, `resume`, `togglePlayPause`, `seek`, `setVolume`, `toggleMute`

### Layer 3: Queue System (`src/lib/player/queue.svelte.ts`)

Track queue with navigation and repeat modes:

- `setQueue(tracks, startIndex)` — Replace queue and start playing
- `playNext()` / `playPrevious()` — Navigate with repeat mode handling
- Repeat modes: `none` (stop at end), `all` (loop), `one` (repeat current)
- Previous: restarts current track if >3 seconds in, otherwise goes to previous

### Layer 4: UI Components

- **Player.svelte** — Fixed bottom bar with track info, transport controls (SVG icons), seek bar, volume slider, "Discover" button, queue toggle
- **Queue.svelte** — Slide-in sidebar showing the track queue with jump-to, remove, and clear
- **LibraryBrowser.svelte** — Album grid with expandable track lists. Click-to-play via `setQueue()`
- **FolderManager.svelte** — Add/remove/rescan music folder UI

### State Management

Player and library state use Svelte 5 module-level runes (`$state`). Files that use `$state` outside `.svelte` components must have the `.svelte.ts` extension:

```
state.svelte.ts   → playerState    (current track, playback state)
queue.svelte.ts   → queueState     (track list, index, shuffle, repeat)
store.svelte.ts   → libraryState   (tracks, folders, scan progress, sort)
```

These are module-scoped singletons — they persist across page navigations. The HTML5 Audio element is also module-scoped, ensuring audio continues playing during SvelteKit client-side navigation.

---

## Discovery Bridge

The discovery bridge connects local file metadata to Mercury's 2.8M-artist search index.

### Artist Matching (`src/lib/library/matching.ts`)

When a local track is playing, the artist name from file metadata is matched against the index:

1. **Normalize** — Strip "The ", split on feat./ft./featuring/&, remove trailing `(Remastered)` or `[Deluxe]`
2. **FTS5 search** — Query the discovery index with the normalized name
3. **Pick best match** — Exact case-insensitive match gets priority, otherwise trust FTS5 ranking
4. **Best-effort** — All matching wrapped in try/catch. Failure never blocks playback.

### Now-Playing Discovery (`NowPlayingDiscovery.svelte`)

Reactive panel triggered by `$effect` when the playing artist changes:

- Shows matched artist name (linked to `/artist/{slug}`), country, and tags (as clickable `TagChip` components)
- Related artists found via tag co-occurrence: takes the first (most prominent) tag, searches for other artists with the same tag, returns top 5
- Graceful "Not found in Mercury index" when no match

### Unified Search

In Tauri mode, the search page queries both data sources:

```
Search query
    ├── mercury.db → ArtistResult[] (discovery index)
    └── library.db → LocalTrack[] (local files, client-side filter)

Search results page:
    ├── "Your Library" section (local track matches, click-to-play)
    ├── Section divider
    └── "Discovery" section (ArtistCard grid)
```

Local library search is a client-side filter on all tracks (case-insensitive substring match on artist, title, album). This is fine for personal library sizes.

---

## Discovery Engine

The Discover page (`/discover`) is Mercury's primary browsing interface. Instead of searching for a known artist, users browse by intersecting tags — starting broad and narrowing down to find niche artists they wouldn't have thought to search for.

### How It Works

1. **Tag cloud** — The page loads the top 100 tags by artist count from `tag_stats` (pre-computed in the data pipeline).
2. **Tag intersection** — Clicking a tag adds it to the URL as `?tags=tagname`. Clicking a second tag adds it: `?tags=shoegaze,post-rock`. The filter is AND logic — only artists with ALL selected tags appear.
3. **Niche-first ordering** — Tag intersection results are ordered by `artist_tag_count ASC` (fewest total tags first). Artists with fewer tags are more niche, which Mercury surfaces first.
4. **Discovery ranking** — When no tags are selected, the page shows a discovery-ranked list of 50 artists. The composite score rewards: rare tags (low `artist_count`), low total tag count, recent origin (post-2010), and active status (not ended).

### URL State

Tag state lives entirely in the URL. This makes discover pages shareable and bookmarkable. `TagFilter.svelte` reads the current URL via the `page` store and uses `goto()` to mutate it on each click — no page reload, just URL update and SvelteKit's reactive re-load.

```
/discover                       → discovery-ranked top 50
/discover?tags=shoegaze         → artists tagged 'shoegaze', niche-first
/discover?tags=shoegaze,post-rock → intersection, niche-first
```

### Components

- **`TagFilter.svelte`** — Renders the tag chip cloud. Active tags shown in a separate "Filtering by:" row above the cloud. Chips for tags not yet active are disabled at 5-tag max (dynamic JOIN limit). `toggleTag()` handles add/remove via `goto()`.
- **`ArtistCard.svelte`** — Reused from search page. Displays artist name (link), country, and top 5 tags as `TagChip` components.
- **`UniquenessScore.svelte`** — Small pill badge rendered in the artist page header. Maps a raw decimal score (0.0001–0.01+ range) to four human-readable tiers: Very Niche, Niche, Eclectic, Mainstream. Badge hidden when score is null (artists with no tags). Sits in the `artist-name-row` alongside the artist name and FavoriteButton.

### Data Flow

```
URL ?tags param
    └── +page.ts → getProvider() → TauriProvider
            → getPopularTags(100) + getArtistsByTagIntersection | getDiscoveryRankedArtists
```

### Query Functions (queries.ts)

| Function | Purpose |
|----------|---------|
| `getPopularTags(db, limit)` | Top tags from `tag_stats` by `artist_count DESC` |
| `getArtistsByTagIntersection(db, tags, limit)` | AND-logic multi-tag filter, niche-first. Dynamic JOIN per tag. Capped at 5 tags. |
| `getDiscoveryRankedArtists(db, limit)` | Composite score: rarity + recency + active status |
| `getArtistUniquenessScore(db, artistId)` | Per-artist uniqueness badge score — average inverse tag popularity, scaled. |
| `getCrateDigArtists(db, filters, limit)` | Random artist sampling with filters. Rowid-based for O(limit) performance. |
| `getStyleMapData(db, tagLimit)` | Top-N tags as nodes + co-occurrence pairs as edges for style map visualization. |

The tag intersection uses dynamic JOIN construction — one `JOIN artist_tags` per tag, with the tag value as a bound parameter. This avoids SQL injection and is capped at 5 tags.

### Style Map (`/style-map`)

A force-directed graph visualization of how music genres relate to each other.

**How it works:**

1. `getStyleMapData(db, 50)` returns the top 50 tags as nodes and their co-occurrence pairs as edges.
2. `StyleMap.svelte` receives these nodes and edges as props, runs D3's force simulation headlessly (no animation loop), and renders a static SVG.
3. Clicking a tag node navigates to `/discover?tags=<tag>`, making the style map a visual entry point to tag-filtered discovery.

**D3 headless simulation pattern:**

```typescript
const simulation = forceSimulation(simNodes)
    .force('link', forceLink(simLinks).id(d => d.id).strength(d => d.strength * 0.4))
    .force('charge', forceManyBody().strength(-120))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius(d => nodeRadius(d.artistCount) + 8));

// Run to static completion — no continuous rerenders
simulation.tick(500);
const settled = simulation.nodes() as LayoutNode[];
simulation.stop();

// Assign computed positions once — no reactive updates during simulation
layoutNodes = settled;
```

`simulation.tick(500)` runs 500 iterations synchronously, no `on('tick')` callback needed. The result is a single Svelte state assignment after all physics has settled. Zero layout thrashing.

**Node sizing:** Log scale (`Math.log10(artistCount) * 8`, clamped 6–30px) prevents dominant popular tags from consuming the entire canvas.

**Data flow:**

```
/style-map
    └── +page.ts → TauriProvider → getStyleMapData(50)
```

### Crate Digging Mode (`/crate`)

Tauri-only route for serendipitous discovery. Displays 20 random artists from the database, with optional filters for tag, decade range, and country. Uses rowid-based random sampling (O(limit), not O(total_rows)) with a wrap-around fallback. Re-fetch without URL update — wandering is ephemeral, not bookmarkable.

### Navigation

The header shows `Discover`, `Style Map`, `Dig`, `Library`, `Explore`, `Settings`. The `Dig` link leads to `/crate`. All links use the same `.nav-link` CSS class.

### Anti-Patterns (Avoided)

| Anti-pattern | Why avoided | Alternative used |
|---|---|---|
| `ORDER BY RANDOM()` on artists table | O(total_rows) — catastrophic at 2.8M rows | Rowid-based random sampling: `a.id > randomStart` with wrap-around fallback |
| On-demand co-occurrence JOIN | `JOIN artist_tags at2 ON at.tag = at2.tag` across 672K rows at query time | Pre-computed `tag_cooccurrence` table in pipeline |
| D3 DOM manipulation inside Svelte | `on('tick')` callback would trigger 500+ reactive state updates during layout | Headless `simulation.tick(500)` — no reactive wiring, single assignment after stop |
| Subquery array parameters for style map edges | Passing large tag arrays as params fails at scale | Subquery IN for edge filtering avoids the parameter count issue |

---

## Knowledge Base

The Knowledge Base is Mercury's genre and scene encyclopedia — a structured graph of musical genres, scenes, and cities with linked artist data, geographic context, and descriptive content.

### Overview

Four content layers blend seamlessly on each genre/scene page:

1. **Open data** — Wikidata/Wikipedia descriptions, inception years, geographic origins
2. **Links and embeds** — Key artists linking to their Mercury profiles
3. **AI summaries** — 2–3 sentence vibe summaries generated by the local model (Tauri only, best-effort)
4. **Community writing** — Explicitly deferred to Phase 9+

Source attribution is shown as a small badge or tooltip — no hard tabs between layers.

### Routes

| Route | Purpose |
|-------|---------|
| `/kb` | Landing page — genre graph overview + navigation entry point |
| `/kb/genre/[slug]` | Genre or scene detail page — description, artists, relationships, map |
| `/time-machine` | Year browser — browse Mercury's catalog by decade and year |

### Components

| Component | Purpose |
|-----------|---------|
| `GenreGraph.svelte` | D3 force-directed graph of genre relationships. Headless `tick(300)` pattern (same as StyleMap — no `on('tick')` wiring). Three node types: genre (circle, accent), scene (diamond, warm-orange), city (dashed circle, teal). Subgenre edges 0.4 strength/solid; influenced_by 0.15 strength/dashed. |
| `SceneMap.svelte` | Leaflet map showing the geographic origin of a scene. Dynamically imported inside `onMount` (Leaflet requires the DOM). Leaflet CSS injected via `document.head` link rather than Vite dynamic import. |
| `LinerNotes.svelte` | Expandable release credits panel on release pages. Collapsed by default — zero network cost on page load. On expand, lazy-fetches MusicBrainz release-group browse endpoint. Shows artist credits, label info, catalog numbers, and per-track recording credits. |
| `GenreGraphEvolution.svelte` | Time-animated genre graph on the Time Machine page. Uses `from_id`/`to_id` fields (not D3's mutated `.source`/`.target`) for O(1) edge filtering via `Set<number>`. |

### DB Tables (mercury.db)

**genres** — Genre and scene metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| slug | TEXT UNIQUE | URL-safe identifier (e.g., `shoegaze`) |
| name | TEXT | Display name |
| type | TEXT | `genre` (global), `scene` (geographic/temporal), or `city` (origin location) |
| wikidata_id | TEXT | Wikidata QID (e.g., `Q188451`) for data fetching |
| description | TEXT | Wikipedia extract or null |
| inception_year | INTEGER | Year the genre/scene emerged |
| origin_lat | REAL | Latitude of geographic origin (for scenes/cities) |
| origin_lng | REAL | Longitude of geographic origin (for scenes/cities) |
| mb_tag | TEXT | Slug bridge to `artist_tags.tag` (same format — direct join, no mapping table) |

**genre_relationships** — Directed edges between genre/scene nodes.

| Column | Type | Description |
|--------|------|-------------|
| from_id | INTEGER FK | Source genre (references genres.id) |
| to_id | INTEGER FK | Target genre (references genres.id) |
| rel_type | TEXT | `subgenre`, `influenced_by`, or `scene_of` |

### Pipeline Phase G

`pipeline/build-genre-data.mjs` runs at DB build time (not at runtime):

1. **Wikidata SPARQL** — Queries Q188451 (music genre) via SPARQL for all subclass/parent (P279), influenced-by (P737), inception year (P571), and country of origin (P495) relationships.
2. **Nominatim geocoding** — Converts country/city names to lat/lng coordinates. Rate-limited to 1 req/sec (1100ms delay). Coordinates baked into the DB — never fetched at runtime.
3. **Graceful degradation** — Exits 0 with a warning if Wikidata is unreachable. Zero crash risk in automated pipeline runs.

### Query Functions (queries.ts)

| Function | Purpose |
|----------|---------|
| `getGenreSubgraph(db, genreId, limit)` | Neighbors of a genre up to `limit` (default 30) — prevents hairball rendering |
| `getGenreBySlug(db, slug)` | Single genre lookup by URL slug |
| `getGenreKeyArtists(db, genreId, limit)` | Artists linked via `mb_tag` → `artist_tags.tag` join, ordered by `count DESC` |
| `getArtistsByYear(db, year, tag, limit)` | Artists by `begin_year`, optionally filtered by tag — used by Time Machine |
| `getStarterGenreGraph(db, tasteTags)` | Initial KB graph seeded by user's taste tags. Falls back to top-connected genres when no taste tags match |
| `getAllGenreGraph(db)` | Full genres table ordered by `inception_year ASC` — used by Time Machine evolution animation |

### Anti-Patterns (Knowledge Base)

The following patterns were discovered and explicitly avoided during Phase 7:

| Anti-pattern | Why avoided | Alternative used |
|---|---|---|
| Geocoding at runtime | Nominatim rate limit: 1 req/sec. Runtime calls would add 1+ second latency per scene page load | Nominatim called at pipeline build time — coordinates baked into `genres.origin_lat/lng` |
| Full genre graph at once | 2000+ genres renders as an illegible hairball | `getGenreSubgraph` always uses `LIMIT 30` neighbors — always a neighborhood, never a global view |
| Leaflet top-level import | `import L from 'leaflet'` requires the DOM to be ready | `await import('leaflet')` inside `onMount` — Leaflet only loads after component mount |

---

## Underground Aesthetic

Phase 8 adds three subsystems: a taste-based OKLCH theme engine, a resizable panel workspace layout, and a streaming platform preference.

### Theme Engine

**Files:** `src/lib/theme/palette.ts`, `src/lib/theme/engine.svelte.ts`, `src/lib/theme/preferences.svelte.ts`

Three modes:

| Mode | Behavior |
|------|----------|
| `default` | No overrides — static OKLCH values in `theme.css` apply |
| `taste` | Hue derived from user's top taste tags via djb2 hash |
| `manual` | User-chosen hue from slider in Settings |

**Tag-to-hue mapping (`palette.ts`):**

1. Filter taste tags to those with `weight > 0`
2. Sort by weight descending, take top 5
3. Sort alphabetically (same tags → same hue, always)
4. Join with `'|'` and hash via djb2-style polynomial hash
5. Modulo 360 → hue angle

**Palette generation (`palette.ts → generatePalette`):**

Returns 14 OKLCH values as a `Record<string, string>` keyed by CSS custom property name (e.g., `--bg-base`, `--link-color`). Text colors (`--text-*`) are intentionally excluded — they remain achromatic at fixed lightness for WCAG AA readability regardless of the generated hue.

**Applying the palette (`engine.svelte.ts → applyPalette`):**

```
generatePalette(hue)
    → root.style.setProperty(key, value) × 14
    → adds CSS transition to :root (smooth 0.5s fade)
    → removes transition after 600ms (no permanent overhead)
```

`clearPalette` removes all 14 properties, reverting to `theme.css` static defaults.

**Preference storage:**

All theme preferences use the existing `ai_settings` key-value table in `taste.db`:

| Key | Values |
|-----|--------|
| `theme_mode` | `taste` \| `manual` \| `default` |
| `theme_manual_hue` | `0`..`360` as string |
| `preferred_platform` | `bandcamp` \| `spotify` \| `soundcloud` \| `youtube` \| `''` |
| `layout_template` | `cockpit` \| `focus` \| `minimal` \| `user-{timestamp}` |
| `user_layout_templates` | JSON array of `UserTemplateRecord` |

**Initialization flow:**

```
root layout onMount (Tauri only)
    → loadThemePreferences() → { mode, manualHue }
    → initTheme(tasteProfile.tags, themePrefs)
        → applyPalette() or clearPalette() based on mode

$effect: tasteProfile.isLoaded && themeState.mode === 'taste'
    → updateThemeFromTaste(tasteProfile.tags) → recompute + reapply
```

Theme engine only runs in Tauri. `theme.css` OKLCH values serve as the static defaults when no palette is applied.

### Panel Layout

**Files:** `src/lib/components/PanelLayout.svelte`, `src/lib/components/LeftSidebar.svelte`, `src/lib/components/RightSidebar.svelte`, `src/lib/components/ControlBar.svelte`, `src/lib/theme/templates.ts`, `src/lib/theme/layout-state.svelte.ts`

**PaneForge** provides resizable split panes (`PaneGroup`, `Pane`, `PaneResizer`). Each template has a unique `autoSaveId` — PaneForge uses `localStorage` to persist panel sizes independently per template.

**Built-in templates:**

| ID | Label | Panes | Description |
|----|-------|-------|-------------|
| `cockpit` | Cockpit | 3 (22/56/22 default) | Full workspace: left nav + main + right context |
| `focus` | Focus | 2 (70/30 default) | Main content + context sidebar |
| `minimal` | Minimal | 1 (100%) | Classic single-column layout |

**`PanelLayout.svelte`** — Renders the correct pane split based on the `template` prop. Accepts three Svelte snippets: `sidebar` (LeftSidebar), `context` (RightSidebar), `children` (page content). Tauri-only, gated in root layout via `{#if tauriMode}`.

**`LeftSidebar.svelte`** — Quick navigation links + discovery filters (tag input, decade selector, niche score dropdown). Discovery controls query `/api/search` and render results inside the sidebar panel — this is a parallel browse viewport, not a main content filter.

**`RightSidebar.svelte`** — Context-aware panel. Switches content based on the current page path:
- `/artist/*` — Related tags from the artist page + queue panel
- `/kb/genre/*` — Subgenres, related genres, key artists
- Default — Now playing info + queue + taste tag summary

**`ControlBar.svelte`** — 32px toolbar positioned between the site header and PanelLayout. Left: search form. Right: layout switcher dropdown + theme indicator dot. The layout switcher shows built-in templates in one `<optgroup>` and user templates in "My Layouts".

**`layoutState` (layout-state.svelte.ts)** — Shared reactive module-level state (`$state`) for `template` (active template ID) and `userTemplates` (user-created template records). Used by both root layout (reads template for PanelLayout/ControlBar) and settings page (reads/writes template selection and user template list). Keeps both in sync without prop drilling.

**User Templates:**

Users can save the current layout as a named template from Settings. User templates are stored as `UserTemplateRecord` (id + label + basePanes) in `taste.db` under `user_layout_templates`. At runtime, `expandUserTemplate()` converts a record to a full `TemplateConfig` using the nearest built-in template as the size default. User templates appear in the ControlBar dropdown under "My Layouts" and in the Settings layout picker.

### Streaming Preference

**Implementation of EMBED-02.**

The user's preferred streaming platform is stored in `taste.db` (`preferred_platform` key) and surfaced as the reactive `streamingPref.platform` state in `preferences.svelte.ts`.

Two components respect the preference:

**`EmbedPlayer.svelte`** — `orderedPlatforms` derived: preferred platform moved to index 0, then default `PLATFORM_PRIORITY` order. The embed loop renders in this order, so the preferred platform's embed appears first.

**Artist page Listen On bar** — `sortedStreamingLinks` derived: link whose `label.toLowerCase()` includes the platform string sorts to the front. Label-based matching handles variants ('Spotify', 'Spotify (streaming)').

Sorting happens client-side only in the `+page.ts` load function.

**Settings page** — `src/routes/settings/+page.svelte` is the full configuration interface for all three Phase 8 subsystems. New sections appear above the existing AI Settings section:

1. **Appearance** — Theme mode radio (Default / Taste / Custom) + hue slider (Custom mode only)
2. **Layout** — Built-in template picker + user template list + save-as-template UI
3. **Streaming Preference** — Platform dropdown

All changes apply immediately (live preview) and persist to `taste.db` via the existing preference save functions.

### Anti-Patterns (Underground Aesthetic)

| Anti-pattern | Why avoided | Alternative used |
|---|---|---|
| Applying PanelLayout unconditionally | Some pages need simple single-column layout | `{#if tauriMode}` gate in root layout — gated on the Tauri context check |
| Overriding `--text-*` in OKLCH palette | Hue-dependent text lightness breaks WCAG AA contrast | Text colors excluded from `TASTE_PALETTE_KEYS` — stay at fixed achromatic lightness |
| Storing layout template in both localStorage and taste.db | Causes drift between two sources of truth | PaneForge uses localStorage for panel _sizes_ (fine, read by PaneForge directly); template _selection_ goes in taste.db only |
| Duplicating layout template state in settings | Two separate `$state` variables go out of sync | `layoutState` shared module exports a single reactive object imported by both root layout and settings |

---

## Community Foundation (Phase 9)

### Identity System

User identity is pseudonymous and local-first — no central server, no account creation required. Identity is optional and prompted, not required.

**Data store:** `taste.db` (extended with new tables in Phase 9)

**New tables:**
- `user_identity` — key/value store for handle, avatar_mode, avatar_data, avatar_seed
- `collections` — named shelves (id, name, created_at, updated_at)
- `collection_items` — items in shelves (collection_id, item_type artist|release, item_mbid, item_name, item_slug, added_at). UNIQUE constraint prevents duplicates.

**Avatar system:** Three modes stored in `user_identity.avatar_mode`:
- `generative` — DiceBear pixel-art SVG from taste seed (top 5 tags alphabetically joined, same djb2 approach as taste theming)
- `edited` — 16×16 pixel grid stored as JSON array in `user_identity.avatar_data`
- `preset` — reserved for future bundled presets

### Collections (Shelves)

Collections contain artists and releases (not tracks — shelves are for curation, not playback). Artists and releases can be saved from their respective pages via the Save to Shelf dropdown. Items stored with denormalized `item_name` and `item_slug` to avoid per-item DB lookups on collection display.

**Rust commands:** `get_collections`, `create_collection`, `delete_collection`, `rename_collection`, `get_collection_items`, `add_collection_item`, `remove_collection_item`, `is_in_collection`, `get_all_collection_items`

### Taste Fingerprint

A constellation SVG generated from the user's top 15 taste tags and top 10 favorite artists using D3 force simulation (headless tick(300) + stop — same pattern as StyleMap and GenreGraph). Node positions initialized in a circle before simulation for determinism — same taste data always produces the same layout. Exportable as PNG via canvas.toDataURL + save_base64_to_file Tauri command.

### Import Pipelines

Four import sources, all Tauri-only:
- **Spotify** — PKCE OAuth via `@fabianlars/tauri-plugin-oauth` (localhost redirect server). Returns top 50 artists. User provides their own Spotify Client ID.
- **Last.fm** — Public API, API key only. Paginates `user.getRecentTracks` at 200/page, caps at 50 pages. Returns artists by play count.
- **Apple Music** — MusicKit JS (loaded on demand, same lazy pattern as Leaflet). User provides Developer Token (JWT). Returns saved library artists.
- **CSV** — Client-side parse of any CSV with Artist column. Native string processing.

Import results are matched to Mercury index via `match_artists_batch` Rust command (single IPC round-trip for N artist names). Matched artists are added to a new "Imported from [Platform]" collection.

### Data Export

`exportAllUserData()` collects all user data (identity, collections, items, taste tags, anchors, favorites, play history) via Promise.all and writes to a JSON file via `write_json_to_path` Tauri command (accepts `path: String, json: String`). Full re-import not yet implemented (Phase 10+).

### Anti-Patterns (Community Foundation)

| Anti-Pattern | Correct Approach |
|---|---|
| Separate DB for identity/collections | All user data in taste.db — one DB, clean backup story |
| Central uniqueness enforcement for handles | No central server — handles can collide, that's fine |
| Animating D3 force simulation | Headless tick(300) + stop — no reactive on('tick') updates |
| Persisting OAuth access tokens | Session-only in $state — tokens expire, don't store them |
| Loading MusicKit JS unconditionally | Lazy script injection on import start only |

---

## Communication Layer (Phase 10)

Mercury's communication layer is built on the Nostr protocol — a decentralized, open messaging protocol with zero server cost. Users communicate through WebSocket relays operated by the open Nostr community. Mercury ships with a curated relay list; no Mercury-operated infrastructure is required.

### Protocol: Nostr via NDK

**Why Nostr:** The only protocol that satisfies all three communication layers (encrypted DMs, persistent scene rooms, ephemeral sessions) with zero server cost. Mercury rooms are scoped to the global Nostr network via the `['t', 'mercury']` tag convention.

| Layer | Nostr NIP | Kind | Storage |
|-------|-----------|------|---------|
| Encrypted DMs | NIP-17 (gift-wrap) | kind:1059 | Relay-stored, E2E encrypted |
| Scene Rooms | NIP-28 | kind:40/41/42/43/44 | Relay-stored, client-moderated |
| Listening Parties | NIP-01 ephemeral + NIP-40 | kind:20001/20002 | NOT stored by relays |

### Module Structure

```
src/lib/comms/
├── index.ts                # Public API re-exports
├── keypair.ts              # Nostr keypair generation + IndexedDB persistence
├── nostr.svelte.ts         # NDK singleton, relay pool, ndkState ($state)
├── dms.svelte.ts           # NIP-17 encrypted DM send/receive
├── rooms.svelte.ts         # NIP-28 scene rooms CRUD + real-time messages
├── sessions.svelte.ts      # Ephemeral listening party sessions
├── moderation.ts           # AI safety filter, flag/kick/ban/slow mode
├── notifications.svelte.ts # Chat overlay state + unread badge counts
└── unfurl.ts               # Mercury URL detection + unfurl fetch util

src/lib/components/chat/
├── ChatOverlay.svelte       # Root drawer (fixed-right, CSS transition, not dialog modal)
├── ChatPanel.svelte         # Unified DM + room message panel
├── MessageList.svelte       # Scrollable message history
├── MessageInput.svelte      # Composer with URL detection + slow mode
├── UnfurlCard.svelte        # Inline Mercury link preview
├── RoomDirectory.svelte     # Scene room browse/search/join
├── RoomCreator.svelte       # Room creation form (AI gate check)
├── AiGatePrompt.svelte      # Friendly AI configuration prompt
├── SessionCreator.svelte    # Listening party creation
└── ModerationQueue.svelte   # Room owner flag review panel

src/routes/api/
└── unfurl/+server.ts        # POST — OG metadata fetch for Mercury URL previews in comms
```

### Identity

Each Mercury user generates a Nostr keypair (secp256k1) on first communication init. The keypair is stored as raw Uint8Array in IndexedDB (not localStorage — better isolation). The user's Mercury handle (from Phase 9 profile) becomes their Nostr display name. The keypair is permanent — it IS the user's communication identity.

### AI Gate for Room Creation

Configuring an AI model is required to CREATE a room (not to join or participate). This ensures every room has AI moderation coverage from day one. The gate check:
1. Read `aiState.enabled` before showing the room creation form
2. If not enabled: render `AiGatePrompt.svelte` — explains the requirement and links to Settings
3. If enabled: run `checkRoomNameSafety(name)` before publishing the room to Nostr

The AI moderation check uses the user's configured provider (same provider used for taste features). For OpenAI API users: calls the free `/v1/moderations` endpoint. For local model users: falls back to a keyword-pattern filter (moderation is best-effort in this case).

### Ephemeral Sessions — Zero Persistence Guarantee

Listening party sessions use Nostr kinds 20001/20002 (ephemeral range — relays MUST NOT store). Architectural guarantee: `sessions.svelte.ts` contains ZERO Tauri `invoke()` calls. Session data lives only in Svelte `$state` for the overlay's lifetime. `endSession()` sets both `mySession` and `joinedSession` to `null` — complete wipe.

### Mercury Room Scoping

All Mercury scene rooms include `['t', 'mercury']` as a required tag at creation. Room discovery queries always filter `#t: ['mercury']` to avoid seeing rooms from other Nostr applications. Genre taxonomy tags are added alongside the mercury scope tag.

### Anti-Patterns

| Don't | Do Instead | Why |
|-------|-----------|-----|
| `localStorage` for keypair | IndexedDB (`idb` package) | localStorage is readable by any same-origin JS |
| NIP-04 (`kind: 4`) for DMs | NIP-17 gift-wrap via NDK standalone `giftWrap` | NIP-04 leaks conversation graph (who you talk to) |
| `dialog.showModal()` for chat | CSS fixed-right drawer | `showModal()` creates inert backdrop blocking page interaction |
| Store session messages to taste.db | Leave in $state only | Ephemeral sessions must have zero persistence |
| `polling` for new messages | NDK `ndk.subscribe()` | Nostr uses WebSocket — subscriptions deliver events in real time |
| Omit `['t', 'mercury']` tag | Always include it on room create | Without it, Mercury rooms are indistinguishable from global Nostr rooms |
| Show error on missing AI for room creation | `AiGatePrompt.svelte` | Users need to understand WHY and HOW to configure AI |

### Relay Strategy

Mercury ships with a hardcoded relay list of 4–5 well-known public relays. NDK's outbox model selects the optimal relay per operation. No Mercury-operated relay is required. If relay spam becomes a problem, the `['t', 'mercury']` scoping convention provides a filter layer; a Mercury-specific relay can be added later without protocol changes.

---

## Scene Building

### Overview

Scenes are music micro-communities detected automatically from collective listening data. They emerge from the intersection of niche tag clusters and listener overlap — not editorial curation, not user creation. A scene exists when the same people collect the same niche artists.

### Detection Algorithm

Scene detection runs client-side in the Tauri desktop app using existing infrastructure:

1. **Pass 1 — Tag cluster seeds**: Query `tag_cooccurrence` for niche tag pairs (artist_count < 200 per tag, shared_artists >= 5). Returns up to 200 seed pairs.
2. **Pass 2 — Cluster grouping**: Merge overlapping tag pairs into clusters (union-find). Tags sharing one or more members form the same cluster.
3. **Pass 3 — Artist lookup**: For each cluster, fetch artists tagged with all (up to 3) cluster tags from `artists` + `artist_tags`.
4. **Pass 4 — Listener validation**: Check how many scene artists appear in the user's `favorite_artists` (taste.db). Minimum 2 favorites = scene is validated.
5. **Pass 5 — Novelty**: Check if any scene tag matches a `genres.mb_tag` in the Knowledge Base. No match = `is_emerging = true`.

Detection runs once per session start. Results cached in `detected_scenes` (taste.db). Re-runs when triggered by new favorites or manual refresh.

### Anti-Rich-Get-Richer Display

Scenes directory splits into two tiers displayed in random order (Fisher-Yates shuffle):
- **Emerging**: `is_emerging = true` OR `listener_count <= 2` — novel, less established
- **Active**: not emerging AND `listener_count > 2` — established micro-communities

Scenes are NEVER sorted by listener count. This prevents popular scenes from always dominating the directory (the rich-get-richer trap).

### Data Model

**taste.db tables** (user-local):
- `detected_scenes` — cached detection results (slug, name, tags JSON, artist_mbids JSON, listener_count, is_emerging, detected_at)
- `scene_follows` — scenes the user follows (slug, followed_at)
- `scene_suggestions` — artist suggestions submitted by user (scene_slug, artist_mbid, artist_name)
- `feature_requests` — vote counts for deferred creation tools (feature_id, vote_count, last_voted)

### Interactions

- **Follow a scene**: Writes to `scene_follows` (taste.db) + publishes NIP-51 kind 30001 list to Nostr relays with `d='mercury-scenes'`. Local state is authoritative; Nostr is optional social layer.
- **Suggest an artist**: Queued in `scene_suggestions`. Appears on scene page as "community suggested." Feeds into next detection run as weighted input.
- **Feature request vote**: Upvotes a deferred creation tool idea. Stored in `feature_requests` (Tauri) or localStorage (web).

### Routes

- `/scenes` — Scene directory with two-tier display
- `/scenes/[slug]` — Scene detail: artists, listener count, tags, async AI description

### Anti-Patterns

| Anti-Pattern | Why Avoided |
|---|---|
| Sort scenes by listener_count | Rich-get-richer — niche scenes become invisible |
| Detect scenes on every page load | Expensive multi-join queries; cache in taste.db instead |
| Tag co-occurrence only (no listener validation) | Tag overlap without shared listeners is coincidence, not scene |
| Block page render on AI description | AI generation takes 2-10s; async slot pattern used (effectiveBio model) |
| Running scene detection on every page load | Expensive multi-join queries; cache in taste.db instead |

---

## Curator / Blog Tools

Phase 12 adds surfaces for music bloggers and curators — embeddable widgets, RSS feeds, attribution tracking, and a public New & Rising discovery page.

### Embed Widgets

Dedicated routes at `/embed/artist/[slug]` and `/embed/collection/[id]` serve minimal artist/collection cards with their own layout (`/embed/+layout.svelte` — replaces root layout via `+layout@.svelte`, no Mercury nav/player/chat). Dark/light mode auto-detected via `window.matchMedia('(prefers-color-scheme: dark)')` inside the iframe context.

Embed snippet generation: `src/lib/curator/embed-snippet.ts` — `generateEmbedSnippets(embedUrl, title, curatorHandle?)` returns both an `<iframe>` snippet and a `<script>` + `<div data-src>` snippet. The artist page (`/artist/[slug]`) shows a copy-paste embed UI with format toggle and QR code generation.

QR code generation: `src/lib/curator/qr.ts` — `generateQrSvg(url, dark?)` wraps the `qrcode` npm package, returns SVG string for inline rendering via `{@html}`. Client-side only (dynamic import).

### RSS Feed

One RSS route remains: `/api/rss/collection/[id]` — exports a user's collection as an RSS/Atom feed. Format negotiated by `?format=atom` URL param or `Accept` header. Uses the `feed` npm package (not hand-rolled XML — handles character escaping for artist names with `&`, `<`, quotes).

RssButton component: `src/lib/components/RssButton.svelte` — renders the standard RSS orange icon as an anchor.

### Curator Attribution

mercury.db table: `curator_features (id, artist_mbid, curator_handle, featured_at, source)` with `UNIQUE(artist_mbid, curator_handle)` to deduplicate.

Attribution trigger: when a blogger includes `data-curator="[handle]"` in the script-tag embed snippet, `embed.js` fires a GET to `/api/curator-feature?artist=[mbid]&curator=[handle]`. Input validation: handle must match `/^[\w\-\.]{1,50}$/`, MBID must match UUID format. Returns 200 regardless of outcome (fire-and-forget).

Display: artist page `+page.ts` queries curator_features from local mercury.db (wrapped in try/catch — table may not exist on older DB versions). Renders as "Discovered by @handle" list linking to `/new-rising?curator=[handle]`.

### New & Rising Page

`/new-rising` — queries local mercury.db directly from `+page.ts`.

Two views:
- **Newly Active**: `WHERE begin_year >= (currentYear - 1) AND ended = 0` — proxy for "recently active" (no `added_at` column in artists table). Ordered by begin_year DESC.
- **Gaining Traction**: same recency filter, ordered by average tag rarity (`AVG(1.0 / NULLIF(tag_stats.artist_count, 0))`) — surfaces niche artists accumulating unique tag combinations.

Curator filter: `/new-rising?curator=[handle]` shows a third tab with artists featured by that curator (from curator_features table).

### Anti-Patterns (Curator / Blog Tools)

| Anti-Pattern | Why Wrong | Correct Approach |
|-------------|-----------|-----------------|
| Hand-rolled RSS XML | Artist names with `&`, `<`, `'` break feed parsers | Always use `feed` npm package |
| Root layout in /embed/* routes | Mercury nav/player/chat break the iframe card | `/embed/+layout.svelte` via `+layout@.svelte` breaks out of root layout |
| `prefers-color-scheme` via postMessage | Unnecessary — iframe reads OS preference directly | `window.matchMedia` inside the embed page |
| Blocking artist page on curator attribution | Attribution load failure breaks core page | try/catch with empty array fallback |
| Using `MBID` from embed URL client-side | embed.js only knows the slug from the URL path | `/api/curator-feature` accepts `slug` as alternative to MBID for lookups |

---

## Build System

### Development

```bash
npm run dev            # Vite dev server (SvelteKit SPA, no Rust)
cargo tauri dev        # Starts Vite dev server + compiles Rust in debug mode
npm run check          # TypeScript + Svelte validation
```

### Production Build

```bash
cargo tauri build      # Compiles Rust + runs SvelteKit build + bundles NSIS installer
```

### Build Pipeline

1. `beforeBuildCommand` in `tauri.conf.json` runs `npx cross-env TAURI_ENV=1 VITE_TAURI=1 npm run build`
   - `VITE_TAURI=1` disables SSR in `+layout.ts` — the app becomes a client-rendered SPA
   - `adapter-static` outputs static files with `index.html` fallback to `build/`
2. Tauri compiles Rust code, bundles with the static frontend
3. NSIS installer created for Windows distribution

### Signing

The app uses Tauri's updater plugin with a minisign key pair:

- **Private key:** `~/.tauri/mercury.key` (no password)
- **Public key:** Embedded in `tauri.conf.json` updater config

---

## Configuration Reference

### Environment Variables

Both are set automatically by Tauri's `beforeBuildCommand` / `beforeDevCommand` in `tauri.conf.json`:

| Variable | Purpose |
|----------|---------|
| `VITE_TAURI=1` | Disables SSR in `+layout.ts` — makes the app a client-rendered SPA |
| `TAURI_ENV=1` | Set at build time (legacy; `svelte.config.js` always uses `adapter-static` now) |

### Key Config Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Project name + tagline. THE single variable for renaming. |
| `src-tauri/tauri.conf.json` | Window size, security, build commands, updater |
| `src-tauri/capabilities/default.json` | Tauri permission grants (dialog, SQL, etc.) |
| `svelte.config.js` | Always `adapter-static` with `index.html` fallback |
| `src/lib/styles/theme.css` | All CSS custom properties (colors, spacing, typography) |

### CSS Custom Properties (theme.css)

The entire visual system is driven by CSS custom properties. Key groups:

- `--bg-*` — Background colors (base, surface, elevated, hover)
- `--text-*` — Text colors (primary, secondary, muted, accent)
- `--border-*` — Border colors (subtle, default, hover)
- `--space-*` — Spacing scale (xs through 2xl)
- `--player-*` — Player bar height, background, border
- `--progress-*` — Seek/volume bar colors

---

## AI Subsystem

The AI subsystem adds local intelligence to Mercury Desktop. It is entirely opt-in — disabled by default, with no impact on users who don't enable it.

### Architecture Overview

```
┌────────────────────────────────────┐
│         SvelteKit Frontend         │
│                                    │
│  ai/engine.ts ← AiProvider        │
│       │             interface      │
│       ▼                            │
│  ┌────────────┐  ┌──────────────┐  │
│  │   Local     │  │   Remote     │  │
│  │  Provider   │  │  Provider    │  │
│  │ (localhost) │  │ (configurable│  │
│  └─────┬──────┘  │  API URL)    │  │
│        │         └──────────────┘  │
└────────┼───────────────────────────┘
         │ HTTP (OpenAI-compatible)
         ▼
┌─────────────────────────┐
│  llama-server (sidecar) │
│  Managed by Rust/Tauri   │
│                          │
│  :8847 — Generation      │
│    Qwen2.5 3B (~2GB)    │
│                          │
│  :8848 — Embedding       │
│    Nomic Embed v1.5      │
│    (~137MB)              │
└─────────────────────────┘
```

Two llama-server instances run as Tauri sidecars (via `tauri-plugin-shell`), managed by Rust code in `src-tauri/src/ai/sidecar.rs`. The frontend communicates with them via OpenAI-compatible HTTP API on localhost. This same API format allows swapping in a remote provider (any OpenAI-compatible endpoint).

### taste.db Schema

A third database alongside mercury.db and library.db. Managed by rusqlite (same as library.db). Stores AI settings, taste profile data, and vector embeddings.

**ai_settings** — Key-value store for AI configuration and user preferences.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | Setting name (e.g., `ai_enabled`, `provider_type`) |
| value | TEXT | Setting value |

Phase 8 added these keys:

| Key | Values | Purpose |
|-----|--------|---------|
| `theme_mode` | `taste` \| `manual` \| `default` | Theme engine mode |
| `theme_manual_hue` | `0`..`360` as string | Manual hue slider value |
| `layout_template` | `cockpit` \| `focus` \| `minimal` \| `user-{ts}` | Active layout template |
| `preferred_platform` | `bandcamp` \| `spotify` \| `soundcloud` \| `youtube` \| `''` | Streaming platform preference |
| `user_layout_templates` | JSON array | User-created layout template records |

**taste_tags** — Tags with weights derived from listening behavior and manual curation.

| Column | Type | Description |
|--------|------|-------------|
| tag | TEXT PK | Tag name (e.g., `shoegaze`) |
| weight | REAL | -1.0 to 1.0 (negative = dislike) |
| source | TEXT | `library`, `favorite`, or `manual` |

**taste_anchors** — Pinned artists that anchor the taste profile.

| Column | Type | Description |
|--------|------|-------------|
| mbid | TEXT PK | MusicBrainz artist ID |
| name | TEXT | Artist name (display) |

**favorite_artists** — Artists the user has explicitly favorited.

| Column | Type | Description |
|--------|------|-------------|
| mbid | TEXT PK | MusicBrainz artist ID |
| name | TEXT | Artist name |
| slug | TEXT | URL slug for linking |
| created_at | TEXT | When favorited |

**artist_embeddings** — 768-dimensional vectors via sqlite-vec `vec0` virtual table.

| Column | Type | Description |
|--------|------|-------------|
| rowid | INTEGER PK | Vector table row ID |
| embedding | FLOAT[768] | Nomic Embed v1.5 vector |

**artist_embedding_map** — Maps MBIDs to vector table row IDs.

| Column | Type | Description |
|--------|------|-------------|
| mbid | TEXT PK | MusicBrainz artist ID |
| rowid | INTEGER | References artist_embeddings.rowid |

### Why Three Databases?

- **mercury.db** — Discovery index (2.8M artists). Managed by `tauri-plugin-sql` (sqlx).
- **library.db** — Local audio file metadata. Managed by `rusqlite`.
- **taste.db** — AI settings, taste profile, embeddings. Managed by `rusqlite`.

taste.db is separate because it's exclusively AI-related data that has no reason to mix with the scanner's track metadata in library.db or the shared discovery index in mercury.db.

### Provider Pattern

```typescript
// src/lib/ai/engine.ts
export interface AiProvider {
    complete(messages: Array<{role: string, content: string}>): Promise<string>;
    embed(text: string): Promise<number[]>;
    isReady(): Promise<boolean>;
}
```

Two implementations:

- **LocalAiProvider** (`local-provider.ts`) — HTTP client for llama-server on localhost. Generation on port 8847, embedding on port 8848. Uses OpenAI-compatible `/v1/chat/completions` and `/v1/embeddings` endpoints.
- **RemoteAiProvider** (`remote-provider.ts`) — Configurable OpenAI-compatible API endpoint. User provides URL and optional API key in Settings.

Module-level singleton via `getAiProvider()` / `setAiProvider()`. Components check `getAiProvider()` to determine if AI is available before rendering AI features.

### Model Management

Models are downloaded from HuggingFace in GGUF format:

1. User enables AI in Settings → triggers download prompt
2. `model-manager.ts` orchestrates download via Tauri command
3. Rust `download.rs` uses `reqwest` with streaming — progress reported every ~1MB via Tauri `Channel`
4. Files download to temp path (`.downloading` extension), renamed on completion for crash safety
5. After download, sidecar starts and health polling begins (500ms intervals, 60s timeout)
6. PID files written to app data dir for orphan detection on restart

### AI Features

**Artist Page — FavoriteButton:** Heart toggle in the artist header. Persists to taste.db `favorite_artists` table. Favorites weighted 2x in taste signal computation.

**Artist Page — AiRecommendations:** "You might also like" section. Gated on `getAiProvider()` + `tasteProfile.hasEnoughData` (5+ favorites OR 20+ library tracks). Uses generation model with temperature 0.7 for creative variety. Session-level Map cache keyed by artist MBID.

**Artist Page — AI Bio Fallback:** When Wikipedia bio is unavailable, AI generates a brief summary. Uses `effectiveBio` pattern: `data.bio || aiBio` — Wikipedia always takes priority. Temperature 0.5 for factual tone.

**Explore Page:** Natural language query interface at `/explore`. User types a query (e.g., "find me something like Boards of Canada but darker"), generation model produces a curated numbered list. Response parsed line-by-line with regex (more reliable than structured JSON). DB matching runs in parallel via `Promise.all`. Refinement supported up to 5 exchanges. Temperature 0.8 for creative variety. Taste tags shown as italic subtitle hint.

**Settings Page:** AI toggle, model download with progress, provider configuration (local/remote). Taste Profile editor shown when AI is enabled.

**Taste Editor:** Tag weight sliders (-1.0 to 1.0), source badges (library/favorite/manual), add/remove tags, artist anchors. Adjusting a weight changes source to `manual` — user-touched tags survive recomputation. Gated on `aiState.enabled`.

### Taste Profile System

Taste signals are computed from two sources:

1. **Library artists** — Matched against discovery index via `matching.ts`, weighted 1x
2. **Favorite artists** — Explicitly saved by user, weighted 2x

Tags tracked by source: `library`, `favorite`, `manual`. Recomputation clears computed tags (library/favorite) but preserves manual tags — user overrides are never lost.

**Threshold:** `MINIMUM_TASTE_THRESHOLD` = 5 favorites OR 20+ library tracks. Below this, recommendations and taste-aware features are disabled (no cold-start guessing).

**Embeddings:** 768-dimensional vectors from Nomic Embed v1.5, stored via sqlite-vec `vec0` virtual table. `artist_embedding_map` table provides MBID-to-rowid mapping. Zero-copy `f32` vector to blob conversion via `zerocopy::IntoBytes`. `unchecked_transaction()` used for batch embedding storage to avoid double mutable borrow on `Mutex<Connection>`.

---

## Module Dependency Map

```
                    ┌─────────────┐
                    │  +layout    │
                    │  .svelte    │
                    └──────┬──────┘
                           │ renders + AI init
              ┌────────────┼────────────┬──────────────┐
              ▼            ▼            ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
        │  Pages   │ │  Header  │ │  Player  │ │ AI State  │
        │ (routes) │ │  (nav)   │ │ .svelte  │ │ .svelte.ts│
        └────┬─────┘ └──────────┘ └────┬─────┘ └─────┬─────┘
             │                         │              │
     ┌───────┼───────┬────────┐  ┌─────┼──────┐      │
     ▼       ▼       ▼        ▼  ▼     ▼      ▼      ▼
  search  artist  library  explore/ audio queue NowPlay  ai/
  page    page    page     settings engine state ing    engine
     │     │ │       │         │     │     │      │      │
     │     │ │       │         │     │     │      │   ┌──┴──┐
     │     │ │       │         ▼     │     │      │   ▼     ▼
     │     │ │       │      taste/   │     │      │ Local Remote
     │     │ │       │      profile  │     │      │ Prov. Prov.
     │     │ │       │      signals  │     │      │   │
     │     │ │       │      favs     │     │      │   ▼
     │     │ │       │         │     │     │      │ llama-server
     ▼     ▼ ▼       ▼         ▼     ▼     ▼      ▼  (sidecar)
  ┌──────────────────────┐  ┌─────────────────────┐  ┌──────────┐
  │    db/ module         │  │  library/ module     │  │ ai/ Rust │
  │  provider → queries   │  │  scanner → store     │  │ sidecar  │
  │  TauriProvider        │  │  types → matching    │  │ taste_db │
  └──────────┬───────────┘  └──────────┬──────────┘  │ embed    │
             │                         │              │ download │
             ▼                         ▼              └────┬─────┘
        mercury.db               library.db                │
     (tauri-plugin-sql)         (rusqlite/Rust)            ▼
             │                         │              taste.db
             ▼                         ▼           (rusqlite/Rust)
      ┌─────────────┐          ┌──────────────┐         │
      │ 2.8M artists│          │ User's local │         ▼
      │ + tags      │          │ audio files  │   ┌───────────┐
      └─────────────┘          └──────────────┘   │ AI prefs  │
                                                   │ Favorites │
                                                   │ Taste tags│
                                                   │ Embeddings│
                                                   └───────────┘
```

### Import Rules

1. **Components** import from barrel exports (`$lib/player`, `$lib/library`, `$lib/ai`, `$lib/taste`)
2. **Pages** import components and call load functions
3. **`db/`** is imported by pages and by `library/matching.ts`
4. **`player/`** is self-contained; `audio.svelte.ts` dynamically imports `queue.svelte.ts` to break circular deps
5. **`library/`** imports from `player/` (to set queue on track click) and from `db/` (for artist matching)
6. **`ai/`** is imported by explore page, artist page components, and settings page. Module-level singleton via `getAiProvider()`
7. **`taste/`** imports from `ai/` (for embeddings), `db/` (for artist lookup), and `library/` (for signal computation). Imported by artist page and settings page
8. **Tauri dependencies** (`@tauri-apps/*`) are always dynamically imported — never at the top level, to allow deferred loading after Tauri initializes

---

*Last updated: 2026-02-24 — After Phase 14 (full web/Cloudflare purge — Tauri-desktop-only codebase).*
