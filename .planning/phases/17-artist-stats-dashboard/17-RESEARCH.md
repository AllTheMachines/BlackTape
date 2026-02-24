# Phase 17: Artist Stats Dashboard - Research

**Researched:** 2026-02-24
**Domain:** SvelteKit/Svelte 5 tab UI, SQLite query patterns, Rust/Tauri taste.db mutations
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stats live as a **secondary tab on the artist page** (alongside existing tabs like Overview/Releases)
- Tab is subtle — low visual weight, not competing with the main artist view
- Tab navigation handles back/forward naturally (clicking another tab returns to profile)
- Stats are only accessible from inside the artist page — not from search results or artist grid cards
- **Horizontal bar chart** — tags listed with proportional bars showing relative weight
- Show **all tags** (no cap, no "show more" — scroll if many)
- Each tag entry: **tag name + relative bar only** (no raw counts, no percentages)
- Tags are **clickable — clicking a tag runs a tag search** (natural Mercury discovery behavior)
- Displayed as **score + tier label** (e.g., "94 — Ultra Rare")
- Tier vocabulary: **Common / Niche / Rare / Ultra Rare**
- **Hero position** — top of the stats page, large and prominent (the headline stat)
- **No explanation** of how the score is calculated — the label says enough
- Rarest tag shown near the uniqueness score (per success criteria)
- Visit count **increments each time the artist page is opened** (each navigation event)
- Stored in **local SQLite only** — never shown in any UI
- No likes, follows, or engagement metrics are visible anywhere in the app

### Claude's Discretion
- Exact visual styling of the stats tab (label text, icon if any)
- Loading/skeleton state for stats page
- Exact layout spacing between uniqueness score hero and tag distribution section
- Color scheme for bar chart bars
- How "rarest tag" is displayed alongside the uniqueness score

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAT-01 | User can view a discovery stats page for any artist showing their uniqueness score, rarest tag, and tag distribution | Uniqueness score already computed by `getArtistUniquenessScore()`. Rarest tag needs new query against `tag_stats`. Tag distribution needs per-artist tag counts from `artist_tags`. All local SQLite — no API calls. |
| STAT-02 | User can see how many times they have personally visited an artist's profile page (local count) | Decision overrides STAT-02 display: visit count is tracked silently in `taste.db` but NEVER shown in UI. New `artist_visits` table in taste.db, new Rust command `record_artist_visit`, triggered in `onMount` of artist page. |
</phase_requirements>

---

## Summary

Phase 17 adds a Stats tab to the existing artist page and silently tracks artist page visits. The work splits cleanly into three streams: (1) a new Stats tab component with uniqueness hero and tag distribution bar chart, (2) two new SQLite queries (rarest tag, per-tag artist counts for distribution), and (3) a new `artist_visits` table in taste.db with a Rust command to increment counts on each page visit.

The existing `getArtistUniquenessScore()` function already computes the uniqueness score and tag count — this data is already returned by the `+page.ts` load function via `data.uniquenessScore` and `data.uniquenessTagCount`. The tier vocabulary used in `UniquenessScore.svelte` (Very Niche / Niche / Eclectic / Mainstream) differs from the locked user decision (Common / Niche / Rare / Ultra Rare). The Stats tab needs its own tier mapping aligned to the locked vocabulary — the existing `UniquenessScore.svelte` badge is a separate compact component for the header and is NOT the hero display.

The tag distribution bar chart is pure derived data: fetch the artist's tags with counts from `artist_tags`, sort by count, compute proportional bar widths as percentages of the max count. This is entirely client-side math — no new SQLite aggregate tables needed. Rarest tag = the tag with the lowest `artist_count` in `tag_stats` among the artist's tags.

**Primary recommendation:** Implement the Stats tab as a new `ArtistStats.svelte` component, add two new query functions to `queries.ts`, add one new taste.db table + Rust command for visit tracking, and wire up the tab toggle in `+page.svelte`. No new npm packages. No new Rust crates.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 | (project version) | Reactive tab UI, bar chart rendering | Project standard |
| SvelteKit | (project version) | Page load function, route params | Project standard |
| rusqlite | (project version) | taste.db writes (artist_visits) | Established pattern in taste_db.rs |
| `$lib/db/queries.ts` | n/a | New query functions for stats data | All DB queries live here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `TauriProvider` / `getProvider()` | n/a | Read from mercury.db | Read-only queries for tag stats |
| Tauri `invoke` | n/a | Write to taste.db via Rust command | Visit counter increment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure CSS bar chart | Canvas / SVG chart library | CSS bars are zero-dep, sufficient for horizontal proportional bars. Library adds complexity for no gain. |
| Tauri `invoke` for visit tracking | Direct `query_mercury_db` write | taste.db writes go through dedicated Rust commands — not through the generic mercury.db passthrough. |

**Installation:**
No new packages. Zero new npm dependencies (confirmed by v1.3 decision in STATE.md).

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── ArtistStats.svelte       # new — stats tab content
│   └── db/
│       └── queries.ts               # add getArtistTagDistribution(), getArtistRarestTag()
└── routes/
    └── artist/[slug]/
        ├── +page.ts                 # add artist_visits increment call
        └── +page.svelte             # add tab toggle, import ArtistStats
src-tauri/
└── src/
    └── ai/
        └── taste_db.rs              # add artist_visits table + record_artist_visit command
```

### Pattern 1: Tab Toggle in Svelte 5 (existing artist page)
**What:** A `$state` variable tracks the active tab. No router changes — tabs are pure UI state within the artist page.
**When to use:** The CONTEXT.md specifies "tab navigation handles back/forward naturally (clicking another tab returns to profile)." This means tabs are UI-only state, not URL-based routes, consistent with the existing artist page pattern.
**Example:**
```typescript
// In +page.svelte <script>
let activeTab = $state<'overview' | 'stats'>('overview');
```
```html
<!-- Tab bar -->
<div class="tab-bar">
  <button class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>
    Overview
  </button>
  <button class:active={activeTab === 'stats'} onclick={() => activeTab = 'stats'}>
    Stats
  </button>
</div>

<!-- Content panels -->
{#if activeTab === 'overview'}
  <!-- existing artist page content -->
{:else}
  <ArtistStats artistId={data.artist.id} score={data.uniquenessScore} tagCount={data.uniquenessTagCount} />
{/if}
```

### Pattern 2: New Query Functions in queries.ts
**What:** Two new exported async functions following the established DbProvider pattern.
**When to use:** All mercury.db reads go through `queries.ts`. The TauriProvider generic passthrough (`query_mercury_db`) handles arbitrary SQL — no new Rust command needed for reads.

```typescript
// Source: pattern from getArtistUniquenessScore() in queries.ts

/** Tag with its artist count, for distribution bar chart */
export interface ArtistTagStat {
  tag: string;
  artist_count: number;  // from tag_stats — how many artists have this tag globally
  count: number;         // artist's own tag count (MusicBrainz vote count)
}

/**
 * Return all tags for an artist with their global artist_count from tag_stats.
 * Used to compute the proportional bar chart and identify the rarest tag.
 * Orders by global artist_count ASC so rarest tag is first.
 */
export async function getArtistTagDistribution(
  db: DbProvider,
  artistId: number
): Promise<ArtistTagStat[]> {
  return db.all<ArtistTagStat>(
    `SELECT at.tag, COALESCE(ts.artist_count, 0) AS artist_count, at.count
     FROM artist_tags at
     LEFT JOIN tag_stats ts ON ts.tag = at.tag
     WHERE at.artist_id = ?
     ORDER BY COALESCE(ts.artist_count, 0) ASC`,
    artistId
  );
}
```

The rarest tag is simply `distribution[0]` (lowest `artist_count`) when ordered ASC. No separate query needed.

### Pattern 3: Horizontal Bar Chart (Pure CSS)
**What:** Tag distribution as a proportional bar chart. Each bar width = `(max_artist_count / tag.artist_count) * 100%` normalized inversely — or more directly: bars represent how rare the tag is (inverse of `artist_count`).

Wait — re-reading the CONTEXT.md: "relative bar only" showing "proportional bars showing relative weight." The weight here is the tag's presence on this artist, not its global rarity. The bar represents how strongly this tag is associated with the artist (i.e., the MusicBrainz vote `count` field on `artist_tags`).

```typescript
// In ArtistStats.svelte
let maxCount = $derived(Math.max(...distribution.map(d => d.count), 1));

// Bar width for each tag:
// barWidth = (tag.count / maxCount) * 100 + '%'
```

Tags are sorted by `count DESC` for display (highest MusicBrainz votes first = most representative tags at top). The rarest tag (by `artist_count` in `tag_stats`) is shown in the hero section near the score — it's a separate stat, not from the bar chart sort order.

**Tag click behavior:** Use `TagChip` component (already links to `/search?q=tag&mode=tag`) or a plain anchor `href="/search?q={encodeURIComponent(tag)}&mode=tag"`. Do NOT use `TagChip` component because it also shows a count badge — the stats page bars replace that. Use a plain clickable span/anchor.

### Pattern 4: Visit Counter (Rust + taste.db)
**What:** New `artist_visits` table in taste.db, new `#[tauri::command] record_artist_visit`, called from `onMount` in artist page.
**When to use:** All taste.db writes go through dedicated Rust commands. The generic `query_mercury_db` passthrough is READ-ONLY against mercury.db. Visit counter is a write to taste.db — must use invoke pattern.

```rust
// In taste_db.rs — add to init_taste_db() CREATE batch:
CREATE TABLE IF NOT EXISTS artist_visits (
    artist_mbid TEXT PRIMARY KEY,
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visited INTEGER NOT NULL
);

// New command:
#[tauri::command]
pub fn record_artist_visit(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    conn.execute(
        "INSERT INTO artist_visits (artist_mbid, visit_count, last_visited) VALUES (?1, 1, ?2)
         ON CONFLICT(artist_mbid) DO UPDATE SET
           visit_count = visit_count + 1,
           last_visited = excluded.last_visited",
        params![artist_mbid, now],
    ).map_err(|e| format!("Failed to record artist visit: {}", e))?;
    Ok(())
}
```

Frontend call in `+page.svelte` `onMount`:
```typescript
// In onMount, inside the tauriMode block (silently fire-and-forget):
if (tauriMode) {
  (async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('record_artist_visit', { artistMbid: data.artist.mbid });
    } catch {
      // Silent — visit tracking is best-effort
    }
  })();
}
```

### Pattern 5: Tier Vocabulary Mapping (Stats Hero vs. Badge)
**What:** The existing `UniquenessScore.svelte` badge uses (Very Niche / Niche / Eclectic / Mainstream) — this is the compact header badge. The Stats tab hero needs the locked vocabulary (Ultra Rare / Rare / Niche / Common) with numeric score display.
**When to use:** The Stats tab has its OWN tier display function. Do NOT change `UniquenessScore.svelte` — the badge in the artist header is a separate, established component.

```typescript
// In ArtistStats.svelte — maps score to locked vocabulary
function getStatsTier(score: number | null): string {
  if (!score || score <= 0) return 'Common';
  // Thresholds from UniquenessScore.svelte calibrated to real distribution
  if (score >= 100) return 'Ultra Rare';
  if (score >= 8) return 'Rare';
  if (score >= 0.36) return 'Niche';
  return 'Common';
}

// Hero display:
// "{score.toFixed(0)} — {tier}"
// e.g. "94 — Ultra Rare"
```

The score displayed is `data.uniquenessScore` (already available from load function). No additional query needed.

### Anti-Patterns to Avoid
- **Triggering new API calls on stats tab open:** All stats data is local SQLite only. Fetching anything from MusicBrainz or other APIs on stats tab open violates the success criteria.
- **Changing `UniquenessScore.svelte`:** The header badge uses a different tier vocabulary by design. Keep the badge as-is; the stats hero uses the locked vocab.
- **URL-based tab routing:** Do not use SvelteKit route params for tab state. The existing artist page has no sub-routes — tabs are `$state` only.
- **Sorting bar chart by global rarity:** Bars show tag weight for this artist (MusicBrainz vote count), not global rarity. Rarity is a separate stat shown in the hero, not in the bar chart order.
- **Using `query_mercury_db` for taste.db writes:** `query_mercury_db` is READ-ONLY for mercury.db. Visit tracking writes go through a dedicated Rust command.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tag click navigation | Custom router | `href="/search?q=tag&mode=tag"` anchor | Already established Mercury pattern (see TagChip.svelte line 14) |
| Bar width computation | Complex charting library | CSS `width: calc(barWidth%)` | Horizontal proportional bars need no library — pure CSS |
| Uniqueness score computation | New SQL | `data.uniquenessScore` already from load | Already computed by `getArtistUniquenessScore()` in `+page.ts` |
| Write DB abstraction | DbProvider extension | Direct `invoke('record_artist_visit', ...)` | taste.db writes are all direct invoke — TauriProvider is read-only mercury.db |

**Key insight:** The "don't touch mercury.db for writes" principle is fundamental. Mercury.db is a read-only search index. taste.db is the writable user-data store. All new writable data goes to taste.db via Rust commands.

---

## Common Pitfalls

### Pitfall 1: Null score when artist has no tags
**What goes wrong:** `data.uniquenessScore` is `null` for artists with no tags. Hero display crashes or shows "NaN — Common".
**Why it happens:** `getArtistUniquenessScore()` returns `null` when no tags exist (COALESCE returns 0, but the query gracefully handles it as 0).
**How to avoid:** Guard all score displays with null check. Show "No tag data" or hide the stats tab entirely for tagless artists.
**Warning signs:** During testing, search for artists with no tags and visit their artist page.

### Pitfall 2: MercuryDbState lock contention with visit tracking
**What goes wrong:** Visit tracking could accidentally go through `query_mercury_db` (mercury.db) instead of `TasteDbState` (taste.db).
**Why it happens:** Confusion between the two database states. Mercury.db is read-only catalog; taste.db is the writable user store.
**How to avoid:** `record_artist_visit` command MUST use `tauri::State<'_, TasteDbState>`, not `MercuryDbState`. Double-check the state type in the Rust command signature.

### Pitfall 3: Tab refactoring breaks existing page layout
**What goes wrong:** Wrapping the entire existing artist page content in an `{#if activeTab === 'overview'}` block causes layout regressions — the artist header, listen bar, and other sections disappear when switching tabs.
**Why it happens:** The tab content boundary is ambiguous — does the header belong to the tab or to the page?
**How to avoid:** Only the BODY sections go into tabs, not the artist header. The header (name, tags, bio, links, streaming, support) stays always-visible. The tab bar sits between the header and the body content. The "overview" tab content = discography + embed widget + AI recs + links sections. The "stats" tab = ArtistStats component.

### Pitfall 4: lib.rs invoke_handler not updated
**What goes wrong:** New `record_artist_visit` Rust command compiles but is unreachable — Tauri returns "command not found" error at runtime.
**Why it happens:** Every new `#[tauri::command]` must be added to `tauri::generate_handler![]` in `lib.rs`.
**How to avoid:** After adding the command to `taste_db.rs`, immediately add it to the `invoke_handler` list in `lib.rs`. The list is at line 105.

### Pitfall 5: Tag distribution query returning wrong "rarest tag"
**What goes wrong:** Rarest tag shown in hero is wrong — it's the rarest by MusicBrainz vote count rather than by global artist prevalence.
**Why it happens:** Two different "count" concepts: `artist_tags.count` (MB votes for this tag on this artist) vs. `tag_stats.artist_count` (how many artists globally have this tag).
**How to avoid:** Rarest tag = lowest `tag_stats.artist_count` among this artist's tags. Query orders by `tag_stats.artist_count ASC` — first result is rarest. The `artist_tags.count` column is used for bar chart proportions only.

---

## Code Examples

### Query: Tag Distribution with Rarest Tag
```typescript
// Source: pattern from getArtistUniquenessScore() in src/lib/db/queries.ts

export interface ArtistTagStat {
  tag: string;
  artist_count: number; // global: how many artists have this tag (from tag_stats)
  count: number;        // local: MusicBrainz vote count for this tag on this artist
}

export async function getArtistTagDistribution(
  db: DbProvider,
  artistId: number
): Promise<ArtistTagStat[]> {
  return db.all<ArtistTagStat>(
    `SELECT at.tag,
            COALESCE(ts.artist_count, 1) AS artist_count,
            at.count
     FROM artist_tags at
     LEFT JOIN tag_stats ts ON ts.tag = at.tag
     WHERE at.artist_id = ?
     ORDER BY COALESCE(ts.artist_count, 1) ASC`,
    artistId
  );
}
// distribution[0].tag = rarest tag (lowest global artist_count)
// For bar chart: sort by at.count DESC; width = (tag.count / maxCount) * 100
```

### Rust: artist_visits Table Schema
```rust
// Add to the CREATE TABLE IF NOT EXISTS batch in init_taste_db()
CREATE TABLE IF NOT EXISTS artist_visits (
    artist_mbid TEXT PRIMARY KEY,
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visited INTEGER NOT NULL
);
```

### Rust: record_artist_visit Command
```rust
// In taste_db.rs — full command
#[tauri::command]
pub fn record_artist_visit(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    conn.execute(
        "INSERT INTO artist_visits (artist_mbid, visit_count, last_visited)
         VALUES (?1, 1, ?2)
         ON CONFLICT(artist_mbid) DO UPDATE SET
           visit_count = visit_count + 1,
           last_visited = excluded.last_visited",
        params![artist_mbid, now],
    ).map_err(|e| format!("Failed to record artist visit: {}", e))?;
    Ok(())
}
```

### Svelte: ArtistStats Component Skeleton
```svelte
<script lang="ts">
  import type { DbProvider } from '$lib/db/provider';
  import type { ArtistTagStat } from '$lib/db/queries';

  let {
    artistId,
    score,
    tagCount
  }: {
    artistId: number;
    score: number | null;
    tagCount: number;
  } = $props();

  let distribution = $state<ArtistTagStat[]>([]);
  let loading = $state(true);

  // Tier mapping — locked vocabulary from CONTEXT.md
  function getTier(s: number | null): string {
    if (!s || s <= 0) return 'Common';
    if (s >= 100) return 'Ultra Rare';
    if (s >= 8) return 'Rare';
    if (s >= 0.36) return 'Niche';
    return 'Common';
  }

  let tier = $derived(getTier(score));
  let rarestTag = $derived(distribution[0]?.tag ?? null); // lowest artist_count = first after ASC sort
  let maxCount = $derived(Math.max(...distribution.map(d => d.count), 1));

  // Sort for bar chart: highest MusicBrainz vote count first
  let chartTags = $derived([...distribution].sort((a, b) => b.count - a.count));

  import { onMount } from 'svelte';
  onMount(async () => {
    const { getProvider } = await import('$lib/db/provider');
    const { getArtistTagDistribution } = await import('$lib/db/queries');
    const provider = await getProvider();
    distribution = await getArtistTagDistribution(provider, artistId);
    loading = false;
  });
</script>

{#if loading}
  <div class="stats-loading">Loading stats…</div>
{:else}
  <!-- Hero: score + tier -->
  <div class="stats-hero">
    <span class="stats-score">{score !== null ? Math.round(score) : '—'}</span>
    <span class="stats-sep">—</span>
    <span class="stats-tier">{tier}</span>
  </div>

  <!-- Rarest tag -->
  {#if rarestTag}
    <div class="stats-rarest">
      Rarest tag:
      <a href="/search?q={encodeURIComponent(rarestTag)}&mode=tag" class="stats-tag-link">{rarestTag}</a>
    </div>
  {/if}

  <!-- Tag distribution bar chart -->
  {#if chartTags.length > 0}
    <div class="tag-distribution">
      {#each chartTags as item}
        <div class="tag-row">
          <a href="/search?q={encodeURIComponent(item.tag)}&mode=tag" class="tag-label">
            {item.tag}
          </a>
          <div class="tag-bar-track">
            <div
              class="tag-bar-fill"
              style="width: {(item.count / maxCount) * 100}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
```

### Svelte: lib.rs Handler Registration
```rust
// In lib.rs invoke_handler — add after existing taste_db commands:
ai::taste_db::record_artist_visit,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tauri-plugin-sql for DB access | Direct rusqlite via `query_mercury_db` / typed commands | Phase 9+ (v1.2) | Plugin hung on production builds; direct rusqlite is the established pattern |
| External API for stats | Local SQLite only | By design (v1.3 STAT requirement) | No network dependency for stats page load |

**Deprecated/outdated:**
- `tauri-plugin-sql` for mercury.db: Do not use `Database.load()` — use `query_mercury_db` invoke or typed commands (TauriProvider bypasses the plugin entirely).

---

## Open Questions

1. **Tab vs. section layout boundary**
   - What we know: Header (name, meta, tags, bio, support links, streaming) stays always-visible. Tabs appear after the header.
   - What's unclear: Does "AI Recommendations" section belong in "overview" tab or always-visible?
   - Recommendation: Put AiRecommendations and Embed Widget in the "overview" tab (they are secondary content, same as discography). The always-visible section is the artist header only.

2. **Stats tab label text**
   - What we know: "subtle — low visual weight." Claude's discretion on exact label text.
   - What's unclear: "Overview" vs "Profile" for the first tab; "Stats" vs "Discover" vs "Insights" for the second.
   - Recommendation: "Overview" and "Stats" — minimal, clear, consistent with other Mercury UI text.

3. **Score display when null (artist with no tags)**
   - What we know: `uniquenessScore` is null when no tags exist. STAT-01 requires a stats page.
   - What's unclear: Should the Stats tab be hidden entirely for tagless artists, or show a "No tag data" state?
   - Recommendation: Show the Stats tab always, but display "No tag data" in the hero when score is null. The tab itself is always accessible — discovery stats are still a valid concept even when empty.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/routes/artist/[slug]/+page.ts` — confirmed `data.uniquenessScore` and `data.uniquenessTagCount` already computed by load function; no additional queries needed for score
- Codebase: `src/lib/db/queries.ts` — confirmed `getArtistUniquenessScore()`, `tag_stats` table schema with `artist_count`, `artist_tags` table with `tag` + `count` columns
- Codebase: `src/lib/components/UniquenessScore.svelte` — confirmed tier thresholds (100/8/0.36) calibrated against real distribution (P25=0.36, P50=1.47, P75=8.4, P90=107, P95=334)
- Codebase: `src-tauri/src/ai/taste_db.rs` — confirmed `TasteDbState` pattern, `init_taste_db()` CREATE batch, `INSERT OR REPLACE` / `ON CONFLICT DO UPDATE` patterns
- Codebase: `src-tauri/src/lib.rs` — confirmed `invoke_handler` list at line 105; every new command must be registered there
- Codebase: `src/lib/components/TagChip.svelte` — confirmed tag click URL: `/search?q={encodeURIComponent(tag)}&mode=tag`
- Codebase: `.planning/PROCESS.md` — confirmed TEST-PLAN section required in every PLAN.md; `data-testid` required for testable elements

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions: All locked decisions verified against codebase architecture — all are technically feasible with zero new npm packages
- STATE.md: Confirmed "Zero new npm packages needed for v1.3" decision from v1.3 planning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external libraries needed; all patterns already exist in codebase
- Architecture: HIGH — tab pattern, query pattern, Rust command pattern all verified against existing code
- Pitfalls: HIGH — null score, lock contention, lib.rs registration all verified as real failure modes from codebase inspection

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable stack, 30-day window)
