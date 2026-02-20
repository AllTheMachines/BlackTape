# Mercury — Technical Architecture

A comprehensive guide to how Mercury works, how its parts connect, and how data flows through the system. Written for developers who need to understand, modify, or extend the codebase.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Dual Runtime Architecture](#dual-runtime-architecture)
3. [Directory Structure](#directory-structure)
4. [Data Model](#data-model)
5. [Database Layer](#database-layer)
6. [Search System](#search-system)
7. [Artist Pages & External APIs](#artist-pages--external-apis)
8. [Embed System](#embed-system)
9. [Local Music Player](#local-music-player)
10. [Discovery Bridge](#discovery-bridge)
11. [Discovery Engine](#discovery-engine)
12. [Build System](#build-system)
13. [Configuration Reference](#configuration-reference)
14. [AI Subsystem](#ai-subsystem)
15. [Module Dependency Map](#module-dependency-map)

---

## System Overview

Mercury is a music discovery engine that runs on two platforms from a single codebase:

- **Web** — SvelteKit on Cloudflare Pages + D1 (SQLite). Server-rendered, publicly accessible.
- **Desktop** — SvelteKit inside Tauri 2.0 (Rust). Client-rendered SPA with local SQLite, local audio playback, and a folder scanner.

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

## Dual Runtime Architecture

### How It Works

SvelteKit serves as the shared UI framework. At build time, an environment variable determines which adapter and runtime path to use:

| Aspect | Web | Desktop |
|--------|-----|---------|
| Adapter | `adapter-cloudflare` | `adapter-static` (SPA fallback) |
| SSR | Enabled | Disabled (`ssr = false`) |
| Database | Cloudflare D1 | Local SQLite via `tauri-plugin-sql` |
| API calls | Server routes (`+page.server.ts`) | Client-side fetch + Tauri IPC |
| Audio | Embedded iframes (Bandcamp, etc.) | HTML5 Audio + asset protocol |
| Detection | `isTauri()` returns `false` | `isTauri()` returns `true` |

### Platform Detection

```typescript
// src/lib/platform.ts
export function isTauri(): boolean {
    return typeof window !== 'undefined'
        && window.__TAURI_INTERNALS__ !== undefined;
}
```

Tauri 2.0 injects `__TAURI_INTERNALS__` into the webview. This check is zero-import (no `@tauri-apps/api` needed) and works at any point in the component lifecycle.

### SSR Toggle

```typescript
// src/routes/+layout.ts
export const ssr = import.meta.env.VITE_TAURI !== '1';
```

Vite replaces `import.meta.env.VITE_TAURI` at compile time. When building for Tauri, `VITE_TAURI=1` is set, making `ssr = false` — the entire app becomes a client-rendered SPA.

### Adapter Selection

```javascript
// svelte.config.js
const isDesktop = process.env.TAURI_ENV === '1';
const adapter = isDesktop
    ? adapterStatic({ fallback: 'index.html' })
    : adapterCloudflare({ ... });
```

### Universal Load Functions

Each page has up to two load functions:

- **`+page.server.ts`** — Runs on the Cloudflare server (web only). Accesses D1 via `platform.env.DB`.
- **`+page.ts`** — Runs everywhere. In Tauri mode, takes over entirely. In web mode, passes through server data.

```typescript
// src/routes/search/+page.ts
export const load: PageLoad = async ({ url, data }) => {
    if (!isTauri()) {
        return { ...data, localTracks: [] };  // Web: use server data
    }
    // Desktop: query local database directly
    const provider = await getProvider();
    const results = await searchArtists(provider, q);
    // ...
};
```

### Dynamic Imports

All Tauri-specific dependencies use dynamic imports to avoid breaking the web build:

```typescript
// Only loaded when running inside Tauri
const { invoke } = await import('@tauri-apps/api/core');
const { convertFileSrc } = await import('@tauri-apps/api/core');
const { open } = await import('@tauri-apps/plugin-dialog');
```

This ensures `@tauri-apps/*` packages are tree-shaken from the Cloudflare bundle.

---

## Directory Structure

```
Mercury/
├── src/                          # SvelteKit frontend
│   ├── lib/
│   │   ├── config.ts             # Project name (single variable for renaming)
│   │   ├── platform.ts           # isTauri() detection
│   │   ├── bio.ts                # Wikipedia bio fetcher
│   │   ├── styles/theme.css      # CSS custom properties (dark theme)
│   │   ├── db/                   # Database abstraction layer
│   │   │   ├── provider.ts       # DbProvider interface + factory
│   │   │   ├── d1-provider.ts    # Cloudflare D1 implementation
│   │   │   ├── tauri-provider.ts # Tauri SQLite implementation
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
│   │       └── UniquenessScore.svelte
│   └── routes/
│       ├── +layout.svelte        # Root layout (header, nav, player)
│       ├── +layout.ts            # SSR toggle
│       ├── +page.svelte          # Landing page
│       ├── search/               # Search results
│       ├── artist/[slug]/        # Artist detail page
│       ├── library/              # Local music library (Tauri only)
│       ├── explore/              # NL explore page (Tauri only)
│       ├── settings/             # Settings page (Tauri only)
│       └── api/                  # Server-side API routes (web only)
│           ├── search/
│           ├── soundcloud-oembed/
│           └── artist/[mbid]/
│               ├── links/
│               └── releases/
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

- **mercury.db** is managed by `tauri-plugin-sql` (via sqlx) — used for the 2.8M-artist discovery index. Shared schema with Cloudflare D1.
- **library.db** is managed by `rusqlite` — used for local track metadata written by the Rust scanner.

They use different SQLite bindings because both link against `libsqlite3-sys`. Using the same version (0.28) of that C library avoids linker conflicts. The two databases serve fundamentally different purposes and never interact at the SQL level.

---

## Database Layer

### DbProvider Interface

All database queries go through an abstract interface, allowing the same query code to work with both Cloudflare D1 and local SQLite:

```typescript
// src/lib/db/provider.ts
export interface DbProvider {
    all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
    get<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}
```

### Implementations

**D1Provider** (`d1-provider.ts`) — Wraps Cloudflare's D1 binding. Created in `+page.server.ts` routes from `platform.env.DB`.

**TauriProvider** (`tauri-provider.ts`) — Wraps `@tauri-apps/plugin-sql`. Lazy singleton — database connection opens on first query. Opens `mercury.db` from the app data directory (`%APPDATA%/com.mercury.app/` on Windows).

### Factory

```typescript
export async function getProvider(): Promise<DbProvider> {
    // Returns TauriProvider in desktop, throws in web (D1Provider created explicitly)
}
```

The factory uses dynamic imports to avoid loading `@tauri-apps/api` in the web build.

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

### Data Flow: Web

```
User types query
    → SearchBar.svelte calls goto('/search?q=...')
    → SvelteKit fetches +page.server.ts via __data.json
    → Server queries D1 via D1Provider
    → +page.ts passes server data through
    → +page.svelte renders ArtistCard grid
```

### Data Flow: Desktop

```
User types query
    → SearchBar.svelte calls goto('/search?q=...')
    → +page.ts detects isTauri()
    → Queries local mercury.db via TauriProvider
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

Made via server routes (web) or client-side fetch (desktop):

- **`/api/artist/[mbid]/releases`** — Fetches release groups with types (Album, EP, Single). Cover art URLs constructed from Cover Art Archive (`https://coverartarchive.org/release-group/{mbid}/front-250`). Streaming links extracted from release-level URL relationships.
- **`/api/artist/[mbid]/links`** — Fetches artist-level URL relationships. Categorized by MB relationship type (streaming, social, official, info, support) with domain-based fallback.

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
| SoundCloud | oEmbed API | Proxied through `/api/soundcloud-oembed` to avoid CORS |
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

- **`TagFilter.svelte`** — Renders the tag chip cloud. Active tags shown in a separate "Filtering by:" row above the cloud. Chips for tags not yet active are disabled at 5-tag max (D1 bound parameter limit). `toggleTag()` handles add/remove via `goto()`.
- **`ArtistCard.svelte`** — Reused from search page. Displays artist name (link), country, and top 5 tags as `TagChip` components.
- **`UniquenessScore.svelte`** — Small pill badge rendered in the artist page header. Maps a raw decimal score (0.0001–0.01+ range) to four human-readable tiers: Very Niche, Niche, Eclectic, Mainstream. Badge hidden when score is null (artists with no tags). Sits in the `artist-name-row` alongside the artist name and FavoriteButton.

### Data Flow

```
URL ?tags param
    │
    ├── Web (SSR via D1)
    │   ├── +page.server.ts → D1Provider → getPopularTags(100) + getArtistsByTagIntersection | getDiscoveryRankedArtists
    │   └── +page.ts → passes server data through unchanged
    │
    └── Desktop (Tauri SPA)
        ├── +page.server.ts → not executed (ssr=false)
        └── +page.ts → isTauri() → getProvider() → TauriProvider → same query functions
```

### Query Functions (queries.ts)

| Function | Purpose |
|----------|---------|
| `getPopularTags(db, limit)` | Top tags from `tag_stats` by `artist_count DESC` |
| `getArtistsByTagIntersection(db, tags, limit)` | AND-logic multi-tag filter, niche-first. Dynamic JOIN per tag. Capped at 5 tags. |
| `getDiscoveryRankedArtists(db, limit)` | Composite score: rarity + recency + active status |
| `getArtistUniquenessScore(db, artistId)` | Per-artist uniqueness badge score — average inverse tag popularity, scaled. Works on both D1 and TauriProvider. |
| `getCrateDigArtists(db, filters, limit)` | Random artist sampling with filters. Rowid-based for O(limit) performance. |
| `getStyleMapData(db, tagLimit)` | Top-N tags as nodes + co-occurrence pairs as edges for style map visualization. |

The tag intersection uses dynamic JOIN construction — one `JOIN artist_tags` per tag, with the tag value as a bound parameter. This avoids SQL injection while staying within D1's bound parameter limits.

---

## Build System

### Web Build

```bash
npm run build          # Builds with adapter-cloudflare
npm run check          # TypeScript + Svelte validation
```

Deployed to Cloudflare Pages. D1 database handles search queries server-side.

### Desktop Build

```bash
npm run build:desktop  # TAURI_ENV=1 VITE_TAURI=1 vite build
cargo tauri build      # Compiles Rust + bundles NSIS installer
```

Or for development:

```bash
cargo tauri dev        # Starts Vite dev server + compiles Rust in debug mode
```

### Build Adapter Selection

```
TAURI_ENV=1  → adapter-static (SPA with index.html fallback)
(default)    → adapter-cloudflare (SSR on Cloudflare Workers)
```

### Tauri Build Pipeline

1. `beforeBuildCommand` runs `npx cross-env TAURI_ENV=1 VITE_TAURI=1 npm run build`
2. SvelteKit outputs static files to `build/`
3. Tauri compiles Rust code, bundles with the static frontend
4. NSIS installer created for Windows distribution

### Signing

The app uses Tauri's updater plugin with a minisign key pair:

- **Private key:** `~/.tauri/mercury.key` (no password)
- **Public key:** Embedded in `tauri.conf.json` updater config

---

## Configuration Reference

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_TAURI=1` | Vite/SvelteKit | Disables SSR, enables Tauri code paths |
| `TAURI_ENV=1` | svelte.config.js | Selects adapter-static over adapter-cloudflare |

### Key Config Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Project name + tagline. THE single variable for renaming. |
| `src-tauri/tauri.conf.json` | Window size, security, build commands, updater |
| `src-tauri/capabilities/default.json` | Tauri permission grants (dialog, SQL, etc.) |
| `svelte.config.js` | Adapter selection (Cloudflare vs static) |
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

The AI subsystem adds local intelligence to Mercury Desktop. It is entirely opt-in — disabled by default, with no impact on users who don't enable it. The web build has no AI components.

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

**ai_settings** — Key-value store for AI configuration.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | Setting name (e.g., `ai_enabled`, `provider_type`) |
| value | TEXT | Setting value |

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

- **mercury.db** — Discovery index (2.8M artists). Managed by `tauri-plugin-sql` (sqlx). Shared schema with Cloudflare D1.
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
  │  D1 or TauriProvider  │  │  types → matching    │  │ taste_db │
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
8. **Tauri dependencies** are always dynamically imported — never at the top level

---

*Last updated: 2026-02-20 — After Phase 6 Plan 4 (Uniqueness Score Badge) completion.*
