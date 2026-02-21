# Phase 9: Community Foundation - Research

**Researched:** 2026-02-21
**Domain:** Identity, generative art, collections, import/export, data persistence
**Confidence:** HIGH (stack verified against project codebase; web sources corroborated)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Identity — Handle + Avatar**
- Handle is free choice — user types whatever they want. No uniqueness enforcement (local-first, no central authority to conflict against).
- Avatar system has three layers: generative default (pixel art generated from taste data), in-app pixel art editor (user can modify), and preset selection for quick pick.
- Identity is optional but prompted — the app works without it. Community features (when used) prompt creation. No nag screen on launch.
- Identity lives on a dedicated `/profile` page — handle, avatar, taste summary, collection. The place to see yourself the way others might.

**Collections (Shelves)**
- Multiple named collections — users create named shelves (e.g. "Favorites", "Rainy Day", "2024 Discoveries"). Not just one master collection.
- Collections contain artists AND releases (not tracks).
- Adding to collection: save button on artist/release pages — clicking shows your shelves, lets you pick one or create a new shelf inline.
- Collection view display: Claude's discretion — pick whatever is most consistent with existing Mercury card/grid patterns.

**Taste Fingerprint**
- Visual style: geometric constellation pattern — points and connections between taste tags and artists, like a star map of your music brain. Unique arrangement per user.
- Data driving the pattern: both taste profile + collection — listening behavior (tag weights, play history) AND curation choices (saved artists/releases). Most personal result.
- Updates automatically — always reflects current taste. Not a locked snapshot.
- Exportable as image — user can save and share their fingerprint (PNG/SVG export). Makes taste into a shareable artifact.

**Taste Matching**
- Phase 9 defers actual taste matching (connecting with other users) to Phase 10. No networking infrastructure in this phase.

**Import / Export**
- Import sources (all four): Spotify, Last.fm, Apple Music, CSV. Importing populates taste profile and/or collections from existing listening history.
- Export format: JSON full data dump — everything in one file: identity, collections, taste profile, listening history. Re-importable into Mercury.

**No Vanity Metrics**
- No follower counts, no like counts, no play counts anywhere in Phase 9 UI. Hard constraint.

### Claude's Discretion
- Collection view display style (grid vs list — match existing Mercury UI patterns)
- Exact pixel art editor toolset and grid size (16x16 or 32x32)
- The algorithm that generates the constellation fingerprint from taste data
- Specific API integration mechanics for Spotify/Last.fm/Apple Music import

### Deferred Ideas (OUT OF SCOPE)
- Template sharing (export/import + community browse of layout templates) — future phase
- Taste matching / radius feature (local to regional to global user discovery) — Phase 10
- Track-level playlists — future phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SOCIAL-01 | Opt-in user profiles with collections (anonymous browsing by default) | Identity system + profile page + `/profile` route; optional, prompted only on community feature use |
| SOCIAL-02 | Shareable exports — generated artifacts (images, files) from the desktop app | Taste Fingerprint PNG/SVG export via canvas.toDataURL + Tauri dialog + Rust file write |
| SOCIAL-03 | User-side tagging — listeners tag, sort, and group their own collections with personal taxonomy | Collections can carry user-defined shelf names; items tagged to shelves |
| SOCIAL-04 | Taste Fingerprint — generated visual pattern unique to each user's collection | D3 force simulation (headless tick pattern, same as existing StyleMap/GenreGraph); SVG rendered on canvas for export |
| SOCIAL-09 | Import from Spotify, Last.fm, Apple Music, CSV to bootstrap collections | Spotify PKCE OAuth; Last.fm API key (no OAuth needed for read); Apple MusicKit JS with Music User Token; CSV parse |
| SOCIAL-10 | Export all user data (collections, tags, writing) — your data is yours | JSON full dump via existing export pattern (history.ts export_play_history_to_path pattern) |

Note: COMM-01, COMM-02, COMM-03 referenced in phase description do not appear in REQUIREMENTS.md. The relevant requirements in scope are SOCIAL-01 through SOCIAL-04 plus SOCIAL-09 and SOCIAL-10. SOCIAL-05 through SOCIAL-08 are listed in REQUIREMENTS.md under Phase 9 but are not in the phase boundary described in CONTEXT.md — CONTEXT.md is the authoritative scope document.
</phase_requirements>

---

## Summary

Phase 9 builds identity, curation, and personal taste representation — all local-first, all optional. There are five distinct technical workstreams: (1) identity persistence (handle + avatar stored in taste.db), (2) a generative + editable pixel art avatar system, (3) the collections/shelves data layer with save-button UX on artist/release pages, (4) the Taste Fingerprint — a constellation SVG generated from taste data that exports as an image, and (5) import pipelines from Spotify, Last.fm, Apple Music, and CSV.

The project already has all the right foundation: taste.db with Mutex<Connection> in Tauri, the Svelte 5 $state rune pattern for reactive global state (.svelte.ts files), d3-force already installed, export-to-file patterns in history.ts, and a provider pattern for cross-platform DB access. Phase 9 extends taste.db with new tables, adds a `/profile` SvelteKit route, builds five Svelte components for avatar editing and fingerprint rendering, and wires up four OAuth/API import flows.

The hardest parts: (1) Spotify PKCE in Tauri requires tauri-plugin-oauth (localhost redirect server) since Spotify does not accept custom URI schemes as redirect URLs; (2) Apple Music import requires a Developer Token (JWT) signed with a private key — the most complex auth of the four; (3) The Taste Fingerprint algorithm needs a deterministic layout so the same taste always produces the same constellation — use a seeded PRNG with the same djb2 approach already in palette.ts.

**Primary recommendation:** Extend taste.db for all new data (identity, collections, collection items). Use DiceBear @dicebear/pixel-art for the generative avatar default (seed from taste tags, outputs SVG). Build the Taste Fingerprint as a pure SVG using D3 force simulation with headless tick(300) — same pattern as StyleMap.svelte and GenreGraph.svelte. Export fingerprint via canvas element with drawImage on the SVG blob. Import Spotify with PKCE + tauri-plugin-oauth. Import Last.fm with API key only (public endpoint). Import Apple Music with MusicKit JS + Music User Token. Parse CSV client-side with native browser APIs.

---

## Standard Stack

### Core (already installed — no new installs required for most features)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-force | ^3.0.0 | Constellation fingerprint layout | Already installed; used by StyleMap + GenreGraph; headless tick pattern established |
| rusqlite | 0.31 | taste.db schema extensions | Already in Cargo.toml; identity + collections tables added to taste.db init |
| @tauri-apps/plugin-dialog | ^2.6.0 | File save dialog for fingerprint export | Already installed; used by history.ts export flow |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dicebear/core | ^9.x | Generative avatar base | Seeded pixel-art avatar generation from taste tags |
| @dicebear/pixel-art | ^9.2.4 | Pixel-art avatar style | The specific style used for Mercury avatars |
| @fabianlars/tauri-plugin-oauth | ^2.x | OAuth localhost redirect server | Spotify PKCE — Spotify does not accept custom URI schemes |
| tauri-plugin-oauth (Rust) | 2 | Rust side of OAuth plugin | Paired with JS package above |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DiceBear pixel-art | Hand-rolled canvas pixel art | DiceBear: zero implementation cost, CC0 license, deterministic from seed, SVG output. Hand-rolled: more control over exact look but weeks of work |
| tauri-plugin-oauth | tauri-plugin-deep-link | Deep links require Spotify to accept custom URI scheme redirect; Spotify only accepts http:// or https:// redirects — localhost server is the only option |
| D3 force for fingerprint | p5.js, custom canvas draw | D3 is already installed and the headless tick(300) pattern is established in the project |
| Native fetch for Last.fm | lastfm-ts-api library | Last.fm API is a simple REST+API-key endpoint; native fetch is sufficient, no need for a wrapper |

**Installation:**
```bash
# JS packages
npm install @dicebear/core @dicebear/pixel-art @fabianlars/tauri-plugin-oauth

# Cargo.toml addition
# tauri-plugin-oauth = "2"
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 9 (extending existing structure):

```
src-tauri/src/ai/
├── taste_db.rs          # EXTEND: add identity + collections tables and commands
└── collections.rs       # NEW: collections CRUD Tauri commands

src/lib/
├── taste/
│   ├── profile.svelte.ts    # EXTEND: add identity fields to state
│   ├── collections.svelte.ts # NEW: reactive collections state + CRUD wrappers
│   └── import/
│       ├── spotify.ts       # NEW: Spotify PKCE + top artists/tracks fetch
│       ├── lastfm.ts        # NEW: Last.fm API fetch + pagination
│       ├── apple.ts         # NEW: Apple MusicKit JS auth + library fetch
│       └── csv.ts           # NEW: CSV parse + normalize
├── identity/
│   └── avatar.ts            # NEW: DiceBear generation + pixel editor state

src/routes/
├── profile/
│   └── +page.svelte         # NEW: /profile page (handle, avatar, fingerprint, collections)
└── settings/
    └── +page.svelte         # EXTEND: add Identity + Collections import sections

src/lib/components/
├── TasteFingerprint.svelte  # NEW: constellation SVG + export
├── AvatarEditor.svelte      # NEW: pixel art editor grid
├── AvatarPreview.svelte     # NEW: renders SVG from DiceBear or edited data
├── CollectionShelf.svelte   # NEW: collection view + add-to-shelf button
└── ImportWizard.svelte      # NEW: multi-step import flow (platform select → auth → preview → confirm)
```

### Pattern 1: Extending taste.db for Identity and Collections

**What:** Add new tables to taste.db in `init_taste_db()` using the same `CREATE TABLE IF NOT EXISTS` pattern already used for taste_tags, favorite_artists, etc.

**When to use:** Any new persistent user data in Tauri — always extends taste.db, not a new database file. Keeps the single-file backup story clean.

**New tables:**
```rust
// In ai/taste_db.rs — init_taste_db() execute_batch extension
"
CREATE TABLE IF NOT EXISTS user_identity (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Keys: handle, avatar_seed, avatar_data (JSON pixels if edited), avatar_mode (generative|edited|preset)

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,          -- UUID or timestamp-based like user templates
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,      -- 'artist' or 'release'
    item_mbid TEXT NOT NULL,      -- artist MBID or release group MBID
    item_name TEXT NOT NULL,      -- denormalized for display without extra lookup
    item_slug TEXT,               -- for routing
    added_at INTEGER NOT NULL,
    UNIQUE(collection_id, item_type, item_mbid)
);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_mbid ON collection_items(item_mbid);
"
```

### Pattern 2: Reactive Collections State (Svelte 5)

**What:** Mirror the existing `tasteProfile` $state pattern — a module-level `$state` object in a `.svelte.ts` file, loaded by Tauri invoke on app startup.

**When to use:** All user-facing reactive data. Same pattern used for `tasteProfile`, `aiState`, `themeState`, `layoutState`.

```typescript
// src/lib/taste/collections.svelte.ts
// Source: project pattern — mirrors profile.svelte.ts

export interface Collection {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  item_count?: number;
}

export interface CollectionItem {
  id: number;
  collection_id: string;
  item_type: 'artist' | 'release';
  item_mbid: string;
  item_name: string;
  item_slug: string | null;
  added_at: number;
}

export const collectionsState = $state({
  collections: [] as Collection[],
  isLoaded: false
});

export async function loadCollections(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const collections = await invoke<Collection[]>('get_collections');
    collectionsState.collections = collections;
    collectionsState.isLoaded = true;
  } catch {
    collectionsState.isLoaded = true;
  }
}
```

### Pattern 3: Taste Fingerprint — Headless D3 Force (Established Pattern)

**What:** Generate a constellation SVG using D3 force simulation with `simulation.tick(300)` (headless, no animation). Nodes = top taste tags + top collection artists. Edges = tag co-occurrence relationships. Same approach as StyleMap.svelte and GenreGraph.svelte in the project.

**When to use:** The Taste Fingerprint component. Run once on mount or when taste data changes.

```typescript
// Source: project pattern — mirrors StyleMap.svelte headless tick approach
// Source: datavisualizationwithsvelte.com/basics/force-simulations

import { forceSimulation, forceCenter, forceCollide, forceLink, forceManyBody } from 'd3-force';

interface FingerprintNode {
  id: string;
  type: 'tag' | 'artist';
  weight: number;  // determines node size
  x?: number;
  y?: number;
}

interface FingerprintLink {
  source: string;
  target: string;
  strength: number;
}

function buildFingerprint(
  tags: TasteTag[],
  artists: FavoriteArtist[],
  width: number,
  height: number
): { nodes: FingerprintNode[]; links: FingerprintLink[] } {
  // Take top 15 tags + top 10 artists
  const tagNodes = tags.slice(0, 15).map(t => ({
    id: t.tag, type: 'tag' as const, weight: t.weight
  }));
  const artistNodes = artists.slice(0, 10).map(a => ({
    id: a.artist_mbid, type: 'artist' as const, weight: 1.0
  }));
  const nodes = [...tagNodes, ...artistNodes];

  // Links between tags that co-occur in artist catalog (use project tag_cooccurrence data)
  // Or simpler: use tag-to-artist links from taste profile for lines

  const simulation = forceSimulation(nodes)
    .force('center', forceCenter(width / 2, height / 2))
    .force('charge', forceManyBody().strength(-30))
    .force('collide', forceCollide().radius(d => (d as FingerprintNode).weight * 8 + 6));

  // Headless: run all ticks at once — no on('tick') reactive updates
  simulation.tick(300);
  simulation.stop();

  return { nodes, links: [] };
}
```

**Seeded determinism:** The constellation's node positions are determined by the force simulation's alpha decay schedule, which is deterministic when the initial node ordering is consistent. Sort nodes by weight descending before passing to simulation to guarantee the same taste data always produces the same layout. (D3 force simulation uses initial positions of [0,0] unless set — so position is fully determined by node order and force parameters.)

### Pattern 4: Avatar Generation with DiceBear

**What:** Use `@dicebear/core` + `@dicebear/pixel-art` to generate an SVG avatar from a seed string derived from the user's taste profile. Same djb2 hash approach as palette.ts — top 5 taste tags joined → seeded.

**When to use:** Generative default avatar layer. Runs client-side with no network request.

```typescript
// Source: dicebear.com/styles/pixel-art — offline JS library mode
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

export function generateAvatarSvg(seed: string): string {
  const avatar = createAvatar(pixelArt, {
    seed,
    size: 64,
    // pixelArt style: deterministic from seed
  });
  return avatar.toString(); // returns SVG string
}

// Seed derivation (same pattern as tasteTagsToHue in palette.ts):
export function tasteTagsToAvatarSeed(tags: TasteTag[]): string {
  const top5 = tags
    .filter(t => t.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map(t => t.tag)
    .join('|');
  return top5 || 'mercury-default';
}
```

### Pattern 5: Pixel Art Editor (Claude's Discretion — 16x16)

**What:** A 16x16 grid of clickable cells, each storing a color (or transparent). State is a flat `Uint32Array(256)` (RGBA per pixel) or a simple `string[]` of CSS color values. Rendered as an HTML table or SVG grid. No external library needed — this is ~100 lines of Svelte.

**Grid size decision:** 16x16 is the right choice. Large enough for recognizable pixel art, small enough that the array is trivial (256 cells). 32x32 would be 1024 cells and produce a finer avatar than needed for a lo-fi identity system.

**Editor tools:** Color picker (HTML `<input type="color">`), eraser (sets to transparent), pencil (active tool), and flood fill (optional). Keep simple.

```svelte
<!-- AvatarEditor.svelte pattern -->
<script lang="ts">
  const GRID = 16;
  let pixels = $state(Array(GRID * GRID).fill('transparent'));
  let selectedColor = $state('#ffffff');
  let tool: 'pencil' | 'eraser' = $state('pencil');

  function paint(index: number) {
    pixels[index] = tool === 'pencil' ? selectedColor : 'transparent';
  }
</script>

<div class="pixel-grid" style="grid-template-columns: repeat({GRID}, 1fr)">
  {#each pixels as color, i}
    <div
      class="pixel"
      style="background: {color}"
      onmousedown={() => paint(i)}
      onmouseenter={(e) => e.buttons === 1 && paint(i)}
      role="button"
      tabindex="-1"
    ></div>
  {/each}
</div>
```

**Storage:** Serialize pixel array as JSON string, store in `user_identity` table under key `avatar_data`. Mode key `avatar_mode` distinguishes generative/edited/preset.

### Pattern 6: Fingerprint Export (PNG via Canvas)

**What:** Convert the fingerprint SVG to a PNG and trigger Tauri file save dialog. Same flow as `exportPlayHistory` in history.ts.

```typescript
// Source: MDN — HTMLCanvasElement.toDataURL()
// Source: project pattern — history.ts export_play_history_to_path

export async function exportFingerprintAsPng(svgElement: SVGElement): Promise<void> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    // Fill dark background to match Mercury aesthetic
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, 800, 800);
    ctx.drawImage(img, 0, 0, 800, 800);
    URL.revokeObjectURL(url);

    const pngData = canvas.toDataURL('image/png');
    const base64 = pngData.split(',')[1];

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        defaultPath: 'mercury-taste-fingerprint.png',
        filters: [{ name: 'PNG Image', extensions: ['png'] }]
      });
      if (path) {
        await invoke('save_base64_to_file', { path, data: base64 });
      }
    } catch {
      // Web fallback: download blob directly
      const a = document.createElement('a');
      a.href = pngData;
      a.download = 'mercury-taste-fingerprint.png';
      a.click();
    }
  };
  img.src = url;
}
```

Note: Requires a new Rust command `save_base64_to_file` (or reuse/adapt the `export_play_history_to_path` pattern). Base64 decoding + file write is trivial in Rust with `std::fs::write`.

### Pattern 7: Spotify Import (PKCE + tauri-plugin-oauth)

**What:** Spotify does not accept custom URI scheme redirects — only `http://` or `https://` URLs. For Tauri desktop, use `tauri-plugin-oauth` which spins up a temporary localhost server to catch the redirect code, then exchanges it for tokens.

**Scopes needed:** `user-top-read` (top artists/tracks) + `user-read-recently-played` (last 50 tracks)

**Flow:**
1. Generate PKCE code verifier + challenge (crypto.subtle.digest, standard browser crypto)
2. Call `tauri-plugin-oauth`'s `start()` to get a localhost redirect URL (e.g. `http://localhost:3003/callback`)
3. Open Spotify auth URL in external browser (use Tauri shell `open()`)
4. `tauri-plugin-oauth` captures the redirect, emits URL event with code
5. Exchange code for access token (POST to `https://accounts.spotify.com/api/token`)
6. Fetch `/me/top/artists?limit=50&time_range=medium_term` and `/me/top/tracks?limit=50`
7. Map Spotify artist names → Mercury MBID via `matchArtistToIndex` (existing function in library/matching.ts)
8. Add matched artists to taste profile + optionally to a new "Imported from Spotify" collection

**Important limitation:** Spotify API only returns ~50 recently played tracks. Full listening history requires requesting a data export from Spotify directly (30-day delay). Mercury import uses the API's top artists/tracks as a proxy for history.

**Spotify app registration:** User must register a Spotify app at developer.spotify.com and provide their Client ID to Mercury's import settings. This is a known UX friction point for open-source desktop apps that can't ship a shared Client ID. Mercury should document this clearly.

```typescript
// Source: Spotify PKCE docs + tauri-plugin-oauth README pattern
// src/lib/taste/import/spotify.ts

async function generatePKCE() {
  const verifier = generateRandomString(128);
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

export async function startSpotifyImport(clientId: string): Promise<void> {
  const { start, onUrl } = await import('@fabianlars/tauri-plugin-oauth');
  const { verifier, challenge } = await generatePKCE();

  const port = await start(); // starts localhost server, returns port
  const redirectUri = `http://localhost:${port}/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-top-read user-read-recently-played',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;

  // Open in external browser
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(authUrl);

  // Wait for redirect
  const redirectUrl = await new Promise<string>((resolve) => {
    onUrl((url) => resolve(url));
  });

  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) throw new Error('No auth code in redirect');

  // Exchange code for token
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  const tokens = await tokenRes.json();

  // Fetch top artists
  const artistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const artistsData = await artistsRes.json();
  // Process artistsData.items → match to Mercury index
}
```

### Pattern 8: Last.fm Import (API Key, No OAuth)

**What:** Last.fm's `user.getRecentTracks` endpoint is public — only requires an API key (no OAuth flow). User provides their Last.fm username + a Last.fm API key. Paginate through all scrobbles (page=1..N, limit=200 per page) to collect listening history.

**Rate limiting:** Last.fm error code 29 = rate limited, but no documented threshold. Stay under 5 requests/second. Paginate with 200ms delays.

```typescript
// src/lib/taste/import/lastfm.ts
export async function importFromLastFm(username: string, apiKey: string): Promise<void> {
  let page = 1;
  let totalPages = 1;
  const artistCounts = new Map<string, number>();

  do {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=200&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();

    totalPages = parseInt(data.recenttracks['@attr'].totalPages, 10);
    const tracks: any[] = data.recenttracks.track;

    for (const track of tracks) {
      const artistName = track.artist['#text'];
      if (artistName) {
        artistCounts.set(artistName, (artistCounts.get(artistName) ?? 0) + 1);
      }
    }

    page++;
    if (page <= totalPages) await new Promise(r => setTimeout(r, 200)); // rate limit guard
  } while (page <= totalPages);

  // Top artists by scrobble count → match to Mercury index → add to taste profile
  const sorted = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100);
  // ... matchArtistToIndex for each, add as favorites or collection items
}
```

### Pattern 9: Apple Music Import (MusicKit JS)

**What:** Apple Music is the most complex of the four. Requires: (1) a Developer Token (JWT signed with an Apple Music key — requires Apple Developer membership and a MusicKit key), and (2) a Music User Token obtained through MusicKit JS in-browser authorization. The Music User Token expires after ~6 months with no automatic refresh.

**Simplification for Mercury:** Because this requires the user to have an Apple Developer account to generate a Developer Token, this should be documented as an "advanced" import. The UX can be: user pastes their Developer Token → MusicKit JS authenticates → fetch library.

**Note:** Apple Music API returns `recently-played` (25 items) and `history/heavy-rotation` resources but does NOT expose a full scrobble history like Last.fm. The most useful endpoint is `me/library/artists` (full library of saved artists).

```typescript
// src/lib/taste/import/apple.ts
// Uses MusicKit JS loaded via script tag (same pattern as Leaflet CSS injection in map)

export async function loadMusicKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).MusicKit) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function importFromAppleMusic(developerToken: string): Promise<void> {
  await loadMusicKit();
  const MK = (window as any).MusicKit;

  await MK.configure({ developerToken, app: { name: 'Mercury', build: '1.0' } });
  const music = MK.getInstance();
  await music.authorize(); // opens Apple sign-in

  // Fetch user's saved library artists
  const res = await music.api.music('/v1/me/library/artists', { limit: 100 });
  const artists = res.data?.data ?? [];
  // artists[].attributes.name → match to Mercury index
}
```

**Practical guidance:** Given the complexity of Apple Developer Token generation, Mercury should: (1) provide clear documentation about what's needed, (2) accept the token as user input (they generate it outside Mercury using Apple's tools), and (3) implement the fetch with graceful failure if MusicKit is blocked (CSP or network).

**CSP note:** Tauri's Tauri context already has `CSP null` (documented decision in STATE.md) — MusicKit JS loaded from Apple CDN will work in Tauri. Web context may block it.

### Pattern 10: CSV Import

**What:** Accept a CSV file with at minimum an Artist Name column. Parse client-side using the browser's built-in text processing (no library needed for simple CSV). Map to Mercury index via `matchArtistToIndex`.

**CSV format to accept (flexible):**
- Last.fm export format: `Artist,Album,Track,Date`
- Mercury export format: artist name column in JSON
- Generic: any CSV with an "Artist" or "artist" column header

```typescript
// src/lib/taste/import/csv.ts
export function parseCsvArtists(csvText: string): string[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const artistCol = headers.findIndex(h => h === 'artist' || h === 'artist name');
  if (artistCol === -1) throw new Error('No Artist column found');

  const names = new Set<string>();
  for (const line of lines.slice(1)) {
    // Simple CSV parse: split on comma, handle quoted fields minimally
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols[artistCol]) names.add(cols[artistCol]);
  }
  return [...names];
}
```

### Anti-Patterns to Avoid

- **Separate database for identity/collections:** Keep everything in taste.db. The existing pattern uses one DB for all user data. A second DB adds complexity without benefit.
- **Centralizing identity (server-side uniqueness enforcement):** The CONTEXT.md decision is explicit — no central authority. Handles can collide; that's fine in Phase 9.
- **Animating the D3 force simulation on every tick:** Use `simulation.tick(300)` + `simulation.stop()` then render static SVG, not `simulation.on('tick', update)`. Prevents Svelte state update flood (established project pattern).
- **Loading MusicKit JS unconditionally:** Inject only when the user starts an Apple Music import. Same pattern as Leaflet CSS injection (Phase 7 decision).
- **Storing tokens/credentials persistently:** OAuth access tokens and API keys entered for import should be session-only (in memory / $state). Don't persist Spotify access tokens — they expire in 1 hour and we don't need them after import.
- **Requiring identity before any feature works:** CONTEXT.md is explicit — identity is optional and prompted, never required. The `/profile` route must work gracefully with empty identity state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generative pixel-art avatar | Custom seeded raster art generator | @dicebear/pixel-art | 6000+ stars, CC0 licensed, TypeScript, deterministic from seed, SVG output, no network needed |
| Spotify OAuth PKCE + redirect | Custom localhost server + token exchange | @fabianlars/tauri-plugin-oauth | The redirect server pattern is subtle — binding to ports, handling CORS, process cleanup — the plugin handles all of this for Tauri 2 |
| CSV parsing with quoted fields | Custom regex CSV parser | Native split with quote strip or papa-parse (optional) | Full RFC 4180 CSV has edge cases (commas in quotes, escaped quotes, multiline). For Last.fm export format specifically, basic split is fine. If user-supplied arbitrary CSV, consider papaparse. |
| Force layout from scratch | Custom spring simulation | d3-force (already installed) | D3's force layout is battle-tested, handles edge repulsion, collision, centering correctly |

**Key insight:** The avatar system is a generative art problem that deserves a library. DiceBear is specifically designed for seeded deterministic avatar generation with multiple styles; the pixel-art style is exactly what Mercury wants.

---

## Common Pitfalls

### Pitfall 1: Spotify "50 tracks" history limitation
**What goes wrong:** Developers assume `/me/player/recently-played` gives full scrobble history. It returns a maximum of 50 tracks.
**Why it happens:** Spotify doesn't expose full listening history via API — you need to request a data export (30-day delay) to get the full CSV.
**How to avoid:** Use `/me/top/artists?time_range=medium_term&limit=50` for a meaningful taste signal instead of recently played. Document this limitation clearly in the import UI.
**Warning signs:** Users expecting their full 5-year listening history to be imported.

### Pitfall 2: Apple Music Developer Token complexity
**What goes wrong:** Developer assumes the user can just "sign in" with Apple. Actually requires: Apple Developer account ($99/year), a MusicKit key generated in the Developer portal, and a JWT signed with that key (ES256 algorithm, 6-month max expiry).
**Why it happens:** Apple's auth model is stricter than most OAuth flows — you need a signed JWT as the "client credential", not just a client ID.
**How to avoid:** Provide clear documentation in the import UI. Accept the Developer Token as user input (they generate it via Apple's tooling or a community tool). Consider marking Apple Music import as "Advanced" in the UI.
**Warning signs:** Implementing MusicKit JS and getting "Authorization token is invalid" errors without a properly signed JWT.

### Pitfall 3: DiceBear SVG in Svelte — CSP issues
**What goes wrong:** DiceBear outputs an SVG string with inline `<style>` tags. Some CSP configurations block inline styles.
**Why it happens:** Tauri has `CSP null` (deliberate decision per STATE.md) so this isn't a problem in the desktop app. Web context would block it.
**How to avoid:** Set `avatar_mode` to generative only in Tauri context. For web, render avatar as a data URI via `avatar.toDataUri()` or skip avatar display.
**Warning signs:** Avatar not rendering in web preview build.

### Pitfall 4: D3 force simulation — non-deterministic positions
**What goes wrong:** Running `simulation.tick(300)` produces different node positions each run because D3's forceSimulation initializes nodes with random jitter (`Math.random()` for initial velocity).
**Why it happens:** D3 applies small random perturbations at initialization to break symmetry. The same input data does NOT guarantee the same output layout unless initial positions are fixed.
**How to avoid:** Pre-assign initial positions to nodes in a deterministic pattern (e.g. arrange in a circle based on index) before passing to simulation. Then the simulation converges from a deterministic start.
```typescript
// Assign deterministic initial positions before simulation:
const angle = (2 * Math.PI * i) / nodes.length;
node.x = centerX + 100 * Math.cos(angle);
node.y = centerY + 100 * Math.sin(angle);
```
**Warning signs:** Fingerprint looks different every time the profile page loads.

### Pitfall 5: Collection item denormalization — missing display data
**What goes wrong:** Collection items stored with only MBID — rendering the collection requires a database lookup or API call for each item's name, cover art, etc.
**Why it happens:** Normalizing fully would require keeping artist/release data in taste.db (duplicating mercury.db data).
**How to avoid:** Denormalize `item_name` and `item_slug` at insert time (copy from the page the user was on when they clicked Save). This is sufficient for collection display without extra lookups. Cover art still fetched live from Cover Art Archive as needed.
**Warning signs:** Collection page with blank artist names or slow load because each item triggers a MusicBrainz API call.

### Pitfall 6: tauri-plugin-oauth — port conflicts
**What goes wrong:** `tauri-plugin-oauth`'s `start()` fails if the chosen port is already in use.
**Why it happens:** The plugin tries default port 1420 or similar; dev server may be on it.
**How to avoid:** Use the plugin's random port mode — call `start()` without a specific port and use the returned port number to construct the redirect URI. The plugin returns the actual port it bound to.
**Warning signs:** OAuth flow fails silently on first try, works on second (port freed between attempts).

---

## Code Examples

### Save Base64 to File (new Rust command needed)

```rust
// Source: project pattern — mirrors export_play_history_to_path approach
// In ai/taste_db.rs or a new ui_commands.rs

#[tauri::command]
pub fn save_base64_to_file(path: String, data: String) -> Result<(), String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    std::fs::write(&path, bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}
// Cargo.toml: base64 = "0.22"
```

### Profile Page — Identity State Integration

```svelte
<!-- src/routes/profile/+page.svelte (Tauri-only page, same gating as library) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/platform';
  import { tasteProfile } from '$lib/taste/profile.svelte';
  import { collectionsState, loadCollections } from '$lib/taste/collections.svelte';
  import TasteFingerprint from '$lib/components/TasteFingerprint.svelte';
  import AvatarPreview from '$lib/components/AvatarPreview.svelte';

  let handle = $state('');
  let tauriMode = $state(false);

  onMount(async () => {
    tauriMode = isTauri();
    if (!tauriMode) return;

    const { invoke } = await import('@tauri-apps/api/core');
    handle = await invoke<string | null>('get_identity_value', { key: 'handle' }) ?? '';
    if (!collectionsState.isLoaded) await loadCollections();
  });
</script>

{#if !tauriMode}
  <p class="desktop-only">Profile is available in the desktop app.</p>
{:else}
  <div class="profile-page">
    <AvatarPreview />
    <h1>{handle || 'Anonymous'}</h1>
    <TasteFingerprint />
    <!-- Collections list -->
  </div>
{/if}
```

### Full Data Export (JSON dump)

```typescript
// src/lib/taste/import/index.ts
// Extends existing export pattern from history.ts

export async function exportAllUserData(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');

  const [identity, collections, items, tasteTags, favorites, playHistory] = await Promise.all([
    invoke<Record<string, string>>('get_all_identity'),
    invoke<Collection[]>('get_collections'),
    invoke<CollectionItem[]>('get_all_collection_items'),
    invoke<TasteTag[]>('get_taste_tags'),
    invoke<FavoriteArtist[]>('get_favorite_artists'),
    invoke<PlayRecord[]>('get_play_history', { limit: null }),
  ]);

  const dump = {
    version: 1,
    exported_at: new Date().toISOString(),
    identity,
    collections,
    collection_items: items,
    taste_tags: tasteTags,
    favorites,
    play_history: playHistory,
  };

  const json = JSON.stringify(dump, null, 2);

  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({
      defaultPath: 'mercury-data-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (path) {
      await invoke('export_play_history_to_path', { path, json });
      // Reuses existing Rust command — it just writes string to path
    }
  } catch {
    // Web fallback
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'mercury-data-export.json'; a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spotify implicit grant flow | PKCE (no client secret) | Nov 27, 2025 (Spotify deprecated implicit grant) | Must use PKCE — the old approach no longer works |
| Sprite-sheet pixel art avatars | Algorithmic generation (DiceBear) | ~2021 | No asset management needed; infinite unique avatars |
| Server-side D3 force layout | Browser headless tick | D3 v5+ | No server needed; same quality layout |
| D3 DOM manipulation | Headless tick + Svelte rendering | D3 v6+ | No layout thrashing; declarative Svelte rendering |

**Deprecated/outdated:**
- Spotify implicit grant flow: Deprecated November 27, 2025. Use PKCE.
- Apple Music User Tokens: No automatic refresh (expires ~6 months). User must re-authorize periodically — this is an Apple platform limitation, not a Mercury bug.

---

## Open Questions

1. **Spotify Client ID UX**
   - What we know: Spotify PKCE requires a Client ID that the app developer registers at developer.spotify.com. Open-source apps can't ship a shared Client ID without it appearing in public source.
   - What's unclear: Should Mercury ship a "shared" Client ID (community managed) or require each user to create their own app? A shared ID creates rate limit and ToS risk.
   - Recommendation: Require users to provide their own Client ID. Document the process. This is the same approach used by other open-source Spotify integrations (e.g. Spotify TUI, SpotiFlyer). Present it as a one-time setup step in the import wizard.

2. **Import re-run behavior — deduplication**
   - What we know: `collection_items` has `UNIQUE(collection_id, item_type, item_mbid)` constraint — duplicate inserts on re-import will be silently ignored via `INSERT OR IGNORE`.
   - What's unclear: When user re-imports from Spotify after 3 months of listening, should new artists be appended only or should weights be updated?
   - Recommendation: Append-only (INSERT OR IGNORE). Taste weights come from the live profile recomputation pipeline, not from import. Keep import simple.

3. **Avatar editor and DiceBear — which takes priority on the profile page?**
   - What we know: Three layers — generative default, in-app editor, preset selection.
   - What's unclear: Is the edited version shown in place of the generative one, or alongside it?
   - Recommendation: `avatar_mode` key in `user_identity` determines which is shown: `generative` (DiceBear from seed), `edited` (user-drawn pixels stored as JSON), `preset` (one of N preset pixel art images shipped with the app). Profile page shows whichever is active.

4. **matchArtistToIndex availability for import flows**
   - What we know: `matchArtistToIndex` in `src/lib/library/matching.ts` does case-insensitive name lookup against mercury.db via Tauri invoke. It's designed for local file artist matching.
   - What's unclear: Performance when matching 50-200 artist names from Spotify/Last.fm — each match is a separate invoke call.
   - Recommendation: Batch the matching — add a `match_artists_batch` Rust command that accepts an array of names and returns an array of MBIDs in one invoke round-trip. This avoids 50-200 individual IPC calls.

---

## Sources

### Primary (HIGH confidence)
- Project source code (`src/lib/taste/`, `src-tauri/src/ai/taste_db.rs`, `src/lib/theme/palette.ts`, `package.json`, `Cargo.toml`) — existing patterns, dependencies, and architecture
- [DiceBear pixel-art style docs](https://www.dicebear.com/styles/pixel-art/) — seeding, output format, offline library use
- [MDN HTMLCanvasElement.toDataURL()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL) — PNG export method
- [tauri-plugin-oauth README](https://github.com/FabianLars/tauri-plugin-oauth) — Tauri 2 compatible, localhost redirect server approach
- [D3 force simulation docs](https://d3js.org/d3-force/simulation) — headless tick pattern
- [datavisualizationwithsvelte.com force simulations tutorial](https://datavisualizationwithsvelte.com/basics/force-simulations) — Svelte 5 + D3 headless tick pattern

### Secondary (MEDIUM confidence)
- [Spotify PKCE flow docs](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) — implementation steps, scopes
- [Spotify rate limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits) — rolling 30-second window
- [Last.fm user.getRecentTracks API](https://www.last.fm/api/show/user.getRecentTracks) — parameters, pagination (max 200/page)
- [Apple Music API docs](https://developer.apple.com/documentation/applemusicapi) — token requirements, library endpoints

### Tertiary (LOW confidence — flag for validation)
- Apple Music User Token expiry (~6 months, no auto-refresh): reported in community discussions and blog posts, not explicitly in official docs. Validate before building the UI text around this limitation.
- Spotify "top 50 tracks" limitation: documented in API reference but the exact behavior of the `time_range` parameter (short/medium/long term) and what "top" means algorithmically is partially opaque.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against project codebase + official docs
- Architecture: HIGH — patterns directly derived from existing project code (taste_db.rs, profile.svelte.ts, history.ts)
- Pitfalls: MEDIUM-HIGH — Spotify/Apple limitations verified via official docs; D3 non-determinism is a known D3 behavior; other pitfalls from direct code analysis
- Import flows: MEDIUM — API mechanics verified; exact error handling and edge cases are LOW confidence until implemented

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable libraries; Spotify OAuth migration already completed Nov 2025 so no pending breaking changes)
