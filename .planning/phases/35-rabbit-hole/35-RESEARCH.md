# Phase 35: Rabbit Hole - Research

**Researched:** 2026-03-04
**Domain:** SvelteKit routing, in-place navigation, localStorage persistence, SQLite queries, streaming play integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Nav restructuring:**
- Style Map, Knowledge Base, Time Machine, and Dig are removed from nav — routes stay (links still work by URL) but nav links are gone
- Discover stays but its discovery modes sidebar is removed — no more left-panel mode switcher
- Nav order: Discover → Rabbit Hole → Library → Explore → Profile → Settings → About
- Nav label: "Rabbit Hole"

**Layout + chrome:**
- Full-page immersive layout — no left/right sidebars while inside the Rabbit Hole
- App titlebar remains visible (consistent with existing Tauri titlebar behavior)
- Minimal exit button only — no full app nav shown while exploring; single back/exit button to leave the Rabbit Hole
- Navigation within: in-place content swap — URL updates (e.g. `/rabbit-hole/artist/slug`, `/rabbit-hole/tag/ambient`) but content swaps without full page navigation

**Landing state:**
- Landing shows: search input (artists + genres/tags) + Random button
- Search finds both artists and genre/tag terms — picking an artist opens their card, picking a genre/tag opens the genre page
- Random button lands on a random artist card immediately

**Artist exploration card:**
- Shows: artist name (clickable → exits to `/artist/[slug]`), country/origin, tags, similar artists row, play button, Continue button
- Similar artists: horizontal row of up to 10 name chips — click to swap to that artist in-place
- Tracks: top 3 tracks shown by default; expand control reveals more (uses Phase 34 release cache)
- Play button: uses existing `streamingPref` logic — launches best available source inline in the player bar
- Continue button: picks a random similar artist and jumps to them; if no similar artists, falls back to a random artist sharing the primary tag

**Genre/tag exploration pages:**
- Opens in-place (same swap pattern)
- Shows: tag name, KB description if one exists, ~20 artists as name chips (random sample, re-landing gives fresh 20), row of related/similar tags
- No pagination — random 20 each time is intentional
- Artist chips follow the same click-to-swap pattern

**History trail:**
- Horizontal scrollable breadcrumb row at the top of the Rabbit Hole view
- Shows every artist card and genre page visited this session
- Trail items are clickable — jump back to any prior stop; items after clicked one remain (branching history, not linear truncation)
- Persisted to localStorage — survives app restart, resumes last session
- Cap: 20 items — oldest drop off the left as new ones are added

### Claude's Discretion
- Visual design of the artist card (spacing, typography, exact chip sizing)
- Exact transition/animation when content swaps in-place
- How "Related tags" are sourced (tag_cooccurrence table vs. artist overlap)
- How "top 3 tracks" are ordered (most recent release, highest MB track count, or cached order)
- Exact behavior when trail cap is hit (fade/shift animation as oldest drops off)
- Search autocomplete UX details (debounce timing, result grouping — artists vs. tags)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 35 builds a new `/rabbit-hole` route implementing an immersive click-through discovery experience. The core technical challenge is: (1) full-page layout override that suppresses the PanelLayout sidebars and nav while inside the Rabbit Hole, (2) in-place content swap with URL updates using SvelteKit's `goto()` pattern already used in Discover, (3) a localStorage-persisted history trail with branching behavior, and (4) unified search that queries both artists (FTS5) and tags.

The codebase already has all the key building blocks: `getSimilarArtists()` in queries.ts, `tag_cooccurrence` table for related tags, `searchArtistsAutocomplete()` for the landing search, `get_or_cache_releases` Tauri command for track data, and `streamingPref` + `setActiveSource` for the play button. The primary new work is architectural: the immersive layout shell, the unified search/browse state machine, the history trail store, and the new DB queries for genre pages.

The layout suppression is the most architecturally significant decision. The pattern mirrors `isEmbed` in `+layout.svelte` (line 37) — a `$derived` check on `$page.url.pathname.startsWith('/rabbit-hole')` bypasses PanelLayout and sidebars, rendering just Titlebar + Player + the Rabbit Hole's own chrome.

**Primary recommendation:** Build the Rabbit Hole as a self-contained layout shell within `src/routes/rabbit-hole/+layout.svelte`, not a patch to the root layout. This keeps the bypass clean and isolates Rabbit Hole chrome from the rest of the app.

---

## Standard Stack

### Core (all already in use — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.x (Svelte 5) | Routing + page structure | Project stack |
| `goto()` from `$app/navigation` | built-in | In-place URL update | Already used in Discover (`keepFocus: true, noScroll: true`) |
| `$page` from `$app/stores` | built-in | Reactive URL reading | Used throughout |
| `localStorage` | browser native | History trail persistence | Used for queue, volume, streaming prefs |
| `tauri-plugin-sql` / DbProvider | project pattern | SQLite queries | All DB access goes through DbProvider |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `invoke` from `@tauri-apps/api/core` | Tauri 2 | Calling `get_or_cache_releases` Rust command | Fetching track list for artist card |
| `streamingPref` from `$lib/theme/preferences.svelte` | project | Streaming platform preference | Play button routing |
| `setActiveSource` from `$lib/player/streaming.svelte` | project | Activating embed player | Play button integration |

**Installation:** No new packages required. All dependencies are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/routes/rabbit-hole/
├── +layout.svelte          # Rabbit Hole shell: immersive chrome, history trail, exit button
├── +layout.ts              # (empty or minimal — no server load needed for layout)
├── +page.svelte            # Landing: search input + Random button
├── artist/
│   └── [slug]/
│       └── +page.svelte    # Artist exploration card
└── tag/
    └── [slug]/
        └── +page.svelte    # Genre/tag exploration page
```

### Pattern 1: Sub-layout for Immersive Chrome Override

**What:** A `src/routes/rabbit-hole/+layout.svelte` that renders its own chrome (exit button, history trail) and passes `children` directly — bypassing the root layout's PanelLayout and sidebars.

**When to use:** When a route subtree needs a completely different shell (no sidebars, no nav, minimal chrome). This is the same mechanism the `/embed` routes use.

**How it works:** SvelteKit layouts are hierarchical. The root layout (`+layout.svelte`) always renders, but Rabbit Hole gets its own sub-layout on top. The immersive effect comes from the ROOT layout detecting the route and NOT rendering PanelLayout/sidebars.

**Implementation — root layout change:**
```typescript
// In +layout.svelte (root)
let isEmbed = $derived($page.url.pathname.startsWith('/embed'));
let isRabbitHole = $derived($page.url.pathname.startsWith('/rabbit-hole'));
```

Then wrap the PanelLayout block:
```svelte
{#if isEmbed || isRabbitHole}
  {@render children()}
{:else if tauriMode}
  <ControlBar ... />
  <PanelLayout ...>
    {@render children()}
  </PanelLayout>
{:else}
  <main class:has-player={showPlayer}>
    {@render children()}
  </main>
{/if}
```

The Rabbit Hole sub-layout then provides its own chrome (exit button, history trail) and renders its `children`.

### Pattern 2: In-Place Content Swap with URL Updates

**What:** `goto()` with `{ keepFocus: true, noScroll: true }` — already used in Discover — updates the URL and triggers SvelteKit's page load but prevents scroll reset.

**When to use:** Every click on a similar artist chip, genre chip, Continue button, or trail item.

**Example (established project pattern from `/discover`):**
```typescript
// Source: src/routes/discover/+page.svelte line 68
goto(buildUrl({ tags: updated }), { keepFocus: true, noScroll: true });

// Rabbit Hole equivalent:
goto(`/rabbit-hole/artist/${slug}`, { keepFocus: true, noScroll: true });
goto(`/rabbit-hole/tag/${encodeURIComponent(tag)}`, { keepFocus: true, noScroll: true });
```

**Key insight:** Because routes are `+page.svelte` files with `+page.ts` load functions, SvelteKit re-runs the load and swaps the page component on navigation. The history trail is maintained in Svelte state (not in the URL), so it persists across these swaps.

### Pattern 3: History Trail as Reactive $state with localStorage Sync

**What:** A Svelte 5 `$state` object in a dedicated store file (`src/lib/rabbit-hole/trail.svelte.ts`) that mirrors the queue persistence pattern exactly.

**When to use:** Tracking visited artists/tags with branching behavior and session persistence.

**Implementation:**
```typescript
// Source: Mirrors src/lib/player/queue.svelte.ts pattern

export type TrailItem =
  | { type: 'artist'; slug: string; name: string }
  | { type: 'tag'; slug: string; name: string };

const TRAIL_KEY = 'mercury:rabbit-hole-trail';
const TRAIL_CAP = 20;

export const trailState = $state({
  items: [] as TrailItem[],
  currentIndex: -1
});

export function pushTrailItem(item: TrailItem): void {
  // Branching: items after currentIndex are NOT truncated
  // (per spec: "items after the clicked one remain in the trail")
  // Simply push, enforce cap by dropping from left
  trailState.items = [...trailState.items, item].slice(-TRAIL_CAP);
  trailState.currentIndex = trailState.items.length - 1;
  saveTrail();
}

export function jumpToTrailIndex(index: number): void {
  // Jump back — does NOT remove subsequent items
  trailState.currentIndex = index;
  saveTrail();
}

function saveTrail(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRAIL_KEY, JSON.stringify({
      items: trailState.items,
      currentIndex: trailState.currentIndex
    }));
  } catch { /* storage unavailable */ }
}

export function loadTrail(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TRAIL_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.items)) {
      trailState.items = data.items;
      trailState.currentIndex = typeof data.currentIndex === 'number'
        ? data.currentIndex : data.items.length - 1;
    }
  } catch { /* ignore */ }
}
```

**Load trail in the Rabbit Hole sub-layout's `onMount`:**
```typescript
onMount(() => {
  loadTrail();
});
```

### Pattern 4: Unified Search (Artists + Tags)

**What:** Landing search queries both FTS5 artists and tag_stats in a single debounced input, returning grouped results.

**When to use:** The landing page search input.

**Approach:** Two parallel queries — `searchArtistsAutocomplete()` (already exists) + new tag search against `tag_stats`. Render results in two groups: "Artists" and "Genres/Tags". This mirrors the SearchBar.svelte pattern (200ms debounce).

```typescript
// New query needed in queries.ts:
export async function searchTagsAutocomplete(
  db: DbProvider,
  query: string,
  limit = 8
): Promise<Array<{ tag: string; artist_count: number }>> {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  return db.all(
    `SELECT tag, artist_count FROM tag_stats
     WHERE tag LIKE ?
     ORDER BY artist_count DESC
     LIMIT ?`,
    normalized + '%',
    limit
  );
}
```

**For the landing "Random" button:** Use the existing rowid-based random pattern from `getCrateDigArtists()`:
```typescript
// New query needed in queries.ts:
export async function getRandomArtist(db: DbProvider): Promise<ArtistResult | null> {
  const maxRow = await db.get<{ max_id: number }>(`SELECT MAX(id) as max_id FROM artists`);
  if (!maxRow) return null;
  const randomId = Math.floor(Math.random() * maxRow.max_id) + 1;
  return db.get<ArtistResult>(
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists a
     WHERE a.id >= ? AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
     LIMIT 1`,
    randomId
  );
}
```

### Pattern 5: Related Tags Query

**What:** Sourcing "related tags" for genre pages from `tag_cooccurrence`.

**Recommendation (Claude's Discretion):** Use `tag_cooccurrence` — it's already populated and designed exactly for this. Artist overlap (counting artists shared between tags) would require a heavier join query and produces the same semantic result.

```typescript
// New query needed in queries.ts:
export async function getRelatedTags(
  db: DbProvider,
  tag: string,
  limit = 12
): Promise<Array<{ tag: string; shared_artists: number }>> {
  return db.all(
    `SELECT
       CASE WHEN tc.tag_a = ? THEN tc.tag_b ELSE tc.tag_a END AS tag,
       tc.shared_artists
     FROM tag_cooccurrence tc
     WHERE tc.tag_a = ? OR tc.tag_b = ?
     ORDER BY tc.shared_artists DESC
     LIMIT ?`,
    tag, tag, tag, limit
  );
}
```

### Pattern 6: Random Artists by Tag (Continue button fallback)

**What:** When an artist has no similar artists, Continue picks a random artist sharing the primary tag.

```typescript
// New query needed in queries.ts:
export async function getRandomArtistByTag(
  db: DbProvider,
  tag: string,
  excludeId: number
): Promise<ArtistResult | null> {
  return db.get<ArtistResult>(
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(t.tag, ', ') FROM artist_tags t WHERE t.artist_id = a.id) AS tags
     FROM artist_tags at1
     JOIN artists a ON a.id = at1.artist_id
     WHERE at1.tag = ? AND a.id != ?
     ORDER BY RANDOM()
     LIMIT 1`,
    tag, excludeId
  );
}
```

### Pattern 7: Track Data from Tauri Cache

**What:** Fetching release/track data for artist cards via the `get_or_cache_releases` Tauri command.

**When to use:** "Top 3 tracks" section of the artist card; expand control reveals more.

**Ordering recommendation (Claude's Discretion):** Use the cached order (releases ordered by `first_release_year DESC` from the Rust query) and tracks in track_number order within each release. This is what the cache already returns — no additional sorting logic needed.

```typescript
// In artist card component:
let releases = $state<CachedRelease[]>([]);
let expanded = $state(false);
const TOP_N = 3;

async function loadTracks(artistMbid: string) {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    releases = await invoke<CachedRelease[]>('get_or_cache_releases', {
      artistMbid
    });
  } catch {
    // Best-effort — tracks not available
  }
}
```

**Important:** `get_or_cache_releases` returns `CachedRelease[]` (releases, not tracks). Tracks are in `release_track_cache` in taste.db. The Tauri command fetches both but only returns releases. For the "top 3 tracks" view, the Rabbit Hole needs tracks too — check if a separate Tauri command exists or if tracks can be queried from taste.db via tauri-plugin-sql.

**Mitigation:** The artist card's "top 3 tracks" can display the top 3 releases instead of individual tracks — "top 3 albums/singles" is a usable fallback. Or, a new Tauri command `get_cached_tracks` can be added. This is a task-level decision.

### Pattern 8: Play Button Integration

**What:** The play button launches the best available streaming source using the existing `streamingPref` + `setActiveSource` infrastructure.

**How:** The artist card's play button needs the artist's streaming links — same as the artist page. These are stored in `artist_links` table. Since the Rabbit Hole artist card is lighter than the full artist page, fetch links lazily when the card loads.

```typescript
// The artist page uses: data.links from +page.ts server load
// The Rabbit Hole artist card needs to fetch links in the browser
// (all DB access is client-side in Tauri — no server load needed)

import { streamingPref } from '$lib/theme/preferences.svelte';
import { setActiveSource } from '$lib/player/streaming.svelte';

function handlePlay() {
  // Find best link matching streamingPref.platform
  const pref = streamingPref.platform;
  const bestLink = findBestLink(artistLinks, pref);
  if (bestLink) {
    setActiveSource(bestLink.platform as StreamingSource, artistName);
    // Trigger embed player — same as artist page
  }
}
```

**Simpler approach:** Since the Rabbit Hole play button says "play on Spotify/Bandcamp/etc." the simplest implementation is to find the preferred link and open it externally (shell.open) rather than inline embed. This avoids managing embed state inside the Rabbit Hole. The CONTEXT doesn't specify inline embed, just "inline in the player bar" — meaning the player bar shows "playing via Spotify," and Spotify Desktop handles the actual audio.

### Anti-Patterns to Avoid

- **Don't patch the root layout with complex Rabbit Hole logic.** Use the sub-layout (`src/routes/rabbit-hole/+layout.svelte`) to contain all Rabbit Hole chrome. The root layout only needs `isRabbitHole` to suppress PanelLayout.
- **Don't use `{#key currentArtistSlug}` to swap content.** Use SvelteKit's built-in page navigation (goto) — it handles component lifecycle correctly.
- **Don't fetch ALL similar artists eagerly.** The `getSimilarArtists` query already caps at 10 — use that limit.
- **Don't add the history trail to the URL.** Trail is session state, not URL state. localStorage is the right persistence layer.
- **Don't use `ORDER BY RANDOM()` for large tables without the rowid trick.** `ORDER BY RANDOM()` is O(n) on SQLite. Use the rowid-based pattern from `getCrateDigArtists()` for random artist selection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Artist autocomplete | Custom FTS search | `searchArtistsAutocomplete()` in queries.ts | Already debounced, FTS5-powered, handles sanitization |
| Trail persistence | Custom localStorage abstraction | Direct localStorage (mirror queue pattern) | queue.svelte.ts is the proven pattern — copy exactly |
| Random artist selection | `Math.random()` on result array | Rowid-based random (from `getCrateDigArtists`) | O(1) vs O(n); avoids loading full table |
| Similar artists | Tag overlap JOIN query | `getSimilarArtists(db, artistId, 10)` | Already exists, gracefully degrades |
| Tag co-occurrence | COUNT(artist overlap) JOIN | `tag_cooccurrence` table + `getRelatedTags` query | Pre-computed, indexed, O(1) |
| In-place navigation | `replaceState()` / history API directly | `goto()` with `keepFocus: true, noScroll: true` | SvelteKit manages the page lifecycle correctly |

---

## Common Pitfalls

### Pitfall 1: Root Layout Footer and Nav Bleeding Into Rabbit Hole

**What goes wrong:** The `<footer>` and `<header>` in the root layout render for every route, including `/rabbit-hole`. Even with PanelLayout suppressed, the header (with nav) and footer still show.

**Why it happens:** The root layout wraps all routes. `isEmbed` only skips everything; Rabbit Hole needs a middle ground (Titlebar stays, header/nav/footer go away, PanelLayout goes away).

**How to avoid:** In root `+layout.svelte`, add `isRabbitHole` check to suppress `<header>` and `<footer>`:
```svelte
{#if !isEmbed && !isRabbitHole}
  <header>...</header>
{/if}
```
The Titlebar component is rendered separately (already inside `{#if tauriMode}` before PanelLayout) and stays visible. Player is always rendered if active — also stays.

**Warning signs:** Nav links visible while inside Rabbit Hole; footer appearing at bottom.

### Pitfall 2: Trail State Lost on Full-Page Navigation

**What goes wrong:** If the user clicks the artist name chip (exits to `/artist/[slug]`), the trail state in memory is lost when they return.

**Why it happens:** `trailState` is Svelte reactive state — it lives as long as the module is imported. But a full navigation AWAY from Rabbit Hole and back triggers re-import in some scenarios.

**How to avoid:** Load trail from localStorage in the Rabbit Hole sub-layout's `onMount`. The localStorage backup ensures the trail is always recoverable. Test: navigate away → back → trail should restore.

### Pitfall 3: `get_or_cache_releases` Network Latency on First Load

**What goes wrong:** First visit to an artist card may stall for 1–2 seconds while MB API fetches release groups. Subsequent visits are instant (cached).

**Why it happens:** The Tauri command fetches from MB API on cache miss. The 1100ms sleep between track fetches means a full fetch for 10 releases takes 11+ seconds.

**How to avoid:** Show releases immediately (from cache if available); show a loading indicator if not. Display the top 3 releases when they arrive; don't block artist card rendering. The artist card should render with name/tags/similar artists immediately, with tracks loading asynchronously.

### Pitfall 4: `ORDER BY RANDOM()` Scaling Issue for Genre Pages

**What goes wrong:** `SELECT ... FROM artists WHERE tag = ? ORDER BY RANDOM() LIMIT 20` is slow when the tag has thousands of artists.

**Why it happens:** SQLite must generate a random key for every qualifying row before limiting.

**How to avoid:** Use the rowid-based random pattern (same as `getCrateDigArtists`). Or: fetch a count, pick random offset, use LIMIT/OFFSET. For genre pages with "random 20 artists":
```sql
SELECT a.id, a.mbid, a.name, a.slug, a.country,
       (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
FROM artist_tags at1
JOIN artists a ON a.id = at1.artist_id
WHERE at1.tag = ?
  AND a.id >= (SELECT CAST(MAX(artist_id) * RANDOM() AS INT) FROM artist_tags WHERE tag = ?)
ORDER BY a.id
LIMIT 20
```
If result count < 20, wrap around from the beginning.

### Pitfall 5: TagChip Navigation Conflict

**What goes wrong:** The existing `TagChip.svelte` links to `/search?q=tag&mode=tag` — if used inside Rabbit Hole, clicking a tag exits the Rabbit Hole.

**Why it happens:** TagChip's `href` is hardcoded to `/search`.

**How to avoid:** Don't reuse TagChip directly inside Rabbit Hole for navigable tags. Either:
- Create a `RabbitHoleTagChip.svelte` that calls `goto('/rabbit-hole/tag/...')` instead
- Or pass an `onclick` handler prop to override navigation (TagChip currently doesn't support this — `clickable` prop renders an `<a>` with hardcoded href)

The CONTEXT already notes: "TagChip.svelte — can be adapted for in-Rabbit-Hole tag navigation."

### Pitfall 6: LeftSidebar Discovery Modes Show Rabbit Hole as Discovery Mode

**What goes wrong:** LeftSidebar's `DISCOVERY_MODES` array drives the mode switcher. If `/rabbit-hole` is not in that array, navigating there causes the sidebar to show "full link list" mode (the else branch at line 128 of LeftSidebar.svelte). But the sidebar shouldn't show at all inside Rabbit Hole.

**How to avoid:** The root layout suppresses PanelLayout for Rabbit Hole — the LeftSidebar is inside PanelLayout, so it won't render. This resolves itself via the Pitfall 1 fix.

---

## Code Examples

Verified patterns from existing codebase:

### In-Place Navigation (from Discover)
```typescript
// Source: src/routes/discover/+page.svelte, line 68
goto(buildUrl({ tags: updated }), { keepFocus: true, noScroll: true });
```

### localStorage Persistence (from Queue)
```typescript
// Source: src/lib/player/queue.svelte.ts
const STORAGE_KEY = 'mercury:queue';
function saveQueueToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* Storage unavailable */ }
}
```

### getSimilarArtists (from Phase 34)
```typescript
// Source: src/lib/db/queries.ts, line 1007
export async function getSimilarArtists(
  db: DbProvider,
  artistId: number,
  limit = 10
): Promise<SimilarArtistResult[]> {
  try {
    return await db.all<SimilarArtistResult>(
      `SELECT a.id, a.mbid, a.name, a.slug, sa.score
       FROM similar_artists sa
       JOIN artists a ON a.id = sa.similar_id
       WHERE sa.artist_id = ?
       ORDER BY sa.score DESC
       LIMIT ?`,
      artistId, limit
    );
  } catch {
    return []; // gracefully degrades pre-pipeline
  }
}
```

### isEmbed Pattern (root layout bypass reference)
```svelte
<!-- Source: src/routes/+layout.svelte, line 37 and 152 -->
let isEmbed = $derived($page.url.pathname.startsWith('/embed'));
...
{#if isEmbed}
  {@render children()}
{:else}
  <!-- full layout -->
{/if}
```

### Rowid-Based Random (from CrateDigArtists)
```typescript
// Source: src/lib/db/queries.ts, line 607
const maxRow = await db.get<{ max_id: number }>(`SELECT MAX(id) as max_id FROM artists`);
if (!maxRow) return [];
const randomStart = Math.floor(Math.random() * maxRow.max_id);
```

### Tag Co-occurrence Structure
```sql
-- From getStyleMapData in queries.ts (line 752)
SELECT tc.tag_a, tc.tag_b, tc.shared_artists
FROM tag_cooccurrence tc
WHERE tc.tag_a IN (...) AND tc.tag_b IN (...)
ORDER BY tc.shared_artists DESC
```

### Streaming Play Integration
```typescript
// Source: src/lib/player/streaming.svelte.ts, line 78
export function setActiveSource(source: StreamingSource, label?: string): void {
  streamingState.activeSource = source;
  streamingState.streamingLabel = label ?? null;
  if (source === 'spotify') { startSpotifyPolling(); }
  else { stopSpotifyPolling(); }
}
```

---

## Navigation Architecture Detail

The Rabbit Hole uses **SvelteKit's normal page routing** (not client-side state-only). Each "view" is a real route:

| URL | Page Component | Purpose |
|-----|----------------|---------|
| `/rabbit-hole` | `+page.svelte` | Landing (search + random button) |
| `/rabbit-hole/artist/[slug]` | `artist/[slug]/+page.svelte` | Artist exploration card |
| `/rabbit-hole/tag/[slug]` | `tag/[slug]/+page.svelte` | Genre/tag page |

The sub-layout (`rabbit-hole/+layout.svelte`) wraps all three, providing:
- Exit button (→ `/discover` or `history.back()`)
- History trail horizontal scroll bar
- `onMount`: load trail from localStorage

The `+page.ts` load functions for artist and tag pages do the DB queries (same as other routes). Since this is Tauri (adapter-static SPA), all loads run in the browser — no `+page.server.ts` files.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SvelteKit 4 `$page.data` pattern | Svelte 5 `$state` + `$derived` runes | v1.5 | All new components use runes |
| Direct `import('@tauri-apps/api')` | `await import(...)` in onMount | Current | Always lazy import Tauri APIs |
| `let` variables for reactive state | `$state()` / `$derived()` | Svelte 5 migration | All state is rune-based |

**Deprecated/outdated:**
- Svelte 4 `$: derived` syntax: not used in this project — all new code uses `$derived()`
- `on:click` directive: project uses `onclick=` attribute syntax (Svelte 5)

---

## Nav Changes Summary

### In `src/routes/+layout.svelte` (desktop nav, lines 181–191):
**Remove:** Style Map, Knowledge Base, Time Machine, Dig links
**Add:** Rabbit Hole link after Discover
**Add:** `isRabbitHole` derived + suppress header/footer/PanelLayout

### In `src/lib/components/LeftSidebar.svelte`:
**Remove:** Style Map, Knowledge Base, Time Machine, Crate Dig from `DISCOVERY_MODES` array
**Remove:** Rabbit Hole from DISCOVERY_MODES (Rabbit Hole has its own full layout — no sidebar)
**Result:** Discover is the only "discovery mode" remaining; the mode switcher shows just Discover

### In `src/routes/discover/+page.svelte`:
**Remove:** The inner `discover-filter-panel` aside (left filter sidebar within the page) — the CONTEXT says "discovery modes sidebar is removed." However, re-reading: the "discovery modes sidebar" is the LEFT PANEL MODE SWITCHER (Style Map / KB / Time Machine / Crate Dig), which is in LeftSidebar.svelte, not in discover/+page.svelte. The discover page's own filter panel (tags, country, era) is NOT being removed — that's distinct from the discovery mode switcher.

**Clarification:** The LeftSidebar mode switcher (DISCOVERY_MODES) is what gets removed. The discover page's filter panel stays.

---

## Open Questions

1. **Track display in artist card: releases or individual tracks?**
   - What we know: `get_or_cache_releases` returns `CachedRelease[]`. Individual tracks are in `release_track_cache` (taste.db), but no frontend query or Tauri command fetches them directly.
   - What's unclear: Does a new Tauri command need to be created for track-level data, or does "top 3 tracks" mean "top 3 releases"?
   - Recommendation: Define "top 3 tracks" as top 3 releases (albums/singles) in planning. If individual tracks are desired, plan a new Tauri command `get_cached_tracks(artist_mbid)` as a sub-task.

2. **Artist links for play button: how to fetch from Rabbit Hole?**
   - What we know: `artist_links` table exists. The artist page's `+page.ts` loads links via server-side query. In Tauri (SPA), this runs in browser. The Rabbit Hole `artist/[slug]/+page.ts` can do the same query.
   - What's unclear: Should the play button show ALL streaming links, or just open the preferred one? If inline embed, which embed type?
   - Recommendation: Load links in `+page.ts` load function. Play button opens preferred platform link via `shell.open` (external, not embed) since embedding inside the immersive layout adds complexity. This is consistent with the CONTEXT: "launches best available source inline in the player bar" — i.e., shows it's playing in the player bar, but the actual audio is in Spotify/etc.

3. **Exit button behavior: history.back() vs. fixed route?**
   - What we know: CONTEXT says "single back/exit button to leave the Rabbit Hole." `history.back()` might go to a previous Rabbit Hole page rather than exiting.
   - Recommendation: Exit button always navigates to `/discover` (or whichever was the last non-Rabbit-Hole page). Store the "entry point" URL in the Rabbit Hole sub-layout state on mount.

---

## Validation Architecture

> workflow.nyquist_validation key absent from config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (Playwright installed but no test files exist) |
| Config file | None |
| Quick run command | `npm run check` (TypeScript + Svelte check) |
| Full suite command | `npm run check` |

### Phase Requirements → Test Map

| Behavior | Test Type | Command | Notes |
|----------|-----------|---------|-------|
| TypeScript compiles without errors | type-check | `npm run check` | Covers all new .svelte + .ts files |
| Nav links updated correctly | manual | Visual inspection in Tauri app | Nav is Svelte template — no unit test |
| In-place navigation updates URL | manual | Navigate between artists in Rabbit Hole | Verify URL changes, content swaps |
| History trail persists across restart | manual | Close + reopen app, verify trail | localStorage behavior |
| History trail cap at 20 items | manual | Navigate 25 times, count items | Trail should show last 20 |
| Random button lands on artist card | manual | Click Random N times, verify artist loads | |
| Similar artists chips navigate in-place | manual | Click similar artist chips | URL updates, content swaps |
| Genre page shows random 20 artists | manual | Visit same tag twice, compare lists | Should differ |
| Trail branching (items not truncated) | manual | Visit A→B→C, click A in trail, visit D; B and C remain | |

### Sampling Rate
- **Per task commit:** `npm run check`
- **Per wave merge:** `npm run check`
- **Phase gate:** `npm run check` green + manual walkthrough in Tauri app before `/gsd:verify-work`

### Wave 0 Gaps
No test files needed — this phase has no automated unit/integration tests. TypeScript checking (`npm run check`) is the automated gate. All behavioral validation is manual.

*(If the project adds vitest in future, the DB query functions in queries.ts — `getRelatedTags`, `getRandomArtist`, `getRandomArtistByTag`, `searchTagsAutocomplete` — are pure async functions suitable for unit testing with an in-memory SQLite.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/routes/+layout.svelte` — layout bypass pattern (`isEmbed`)
- Direct codebase inspection: `src/lib/db/queries.ts` — all existing queries, `getSimilarArtists`, `tag_cooccurrence` usage
- Direct codebase inspection: `src/lib/player/queue.svelte.ts` — localStorage persistence pattern
- Direct codebase inspection: `src/routes/discover/+page.svelte` — `goto()` in-place navigation pattern
- Direct codebase inspection: `src/lib/components/LeftSidebar.svelte` — DISCOVERY_MODES structure to be modified
- Direct codebase inspection: `src/lib/components/TagChip.svelte` — hardcoded `/search` href (pitfall source)
- Direct codebase inspection: `src/lib/player/streaming.svelte.ts` — `setActiveSource` API
- Direct codebase inspection: `src-tauri/src/ai/track_cache.rs` — `get_or_cache_releases` command shape
- Direct codebase inspection: `.planning/phases/35-rabbit-hole/35-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `src/routes/kb/genre/[slug]/+page.svelte` — sub-route pattern, lazy DB loading in browser
- `src/lib/scenes/detection.ts` — `tag_cooccurrence` JOIN patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries, no new installs
- Architecture: HIGH — all patterns are proven in existing codebase
- New DB queries: HIGH — all follow established patterns in queries.ts
- Layout suppression: HIGH — directly mirrors the `isEmbed` pattern
- Pitfalls: HIGH — identified from direct code reading, not speculation
- Track/play integration: MEDIUM — open questions around tracks vs. releases and play button behavior

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — stable stack, no external dependencies)
