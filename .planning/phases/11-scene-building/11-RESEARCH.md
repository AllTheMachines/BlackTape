# Phase 11: Scene Building - Research

**Researched:** 2026-02-23
**Domain:** AI scene detection, scene pages, follow notifications, community curation, feature request mechanism
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**How scenes surface**
- Scenes have a **dedicated Scenes section/page** — a place you go to browse them, like a directory
- Scene pages show: **artists in the scene + top tracks + listener count**
- Scenes are named by inheriting the **dominant tag** (e.g., the strongest tag cluster becomes the scene name)
- Detection threshold: **meaningful listener overlap** across a few artists (quality signal — connected humans, not just tag co-occurrence)

**AI scene detection signals**
- Primary signal: **both tag clusters AND listener overlap** must reinforce each other — a scene requires artists with overlapping niche tags AND the same listeners collecting them
- Geography: **optional metadata** — don't use it for detection, but surface origin on scene pages if it's there
- "Emerging" means **novelty** — tag combinations not seen before, not just size or growth rate
- Surfacing: **random rotation within tiers** — most active scenes in one tier, emerging scenes in another, neither dominates (anti-rich-get-richer)

**User interactions on scene pages**
- Users can **follow a scene** to get notified when new artists join it
- Users can **suggest artists** that belong in a scene, even if AI didn't detect them — community curation feeds back as signal
- **No creation tools** this phase — scenes are purely AI-detected and displayed, not manually created
- Feature requests for creation tools (collaborative playlists, shared collections) surface via **a "request feature" link on relevant empty states** — simple vote counter

### Claude's Discretion
- Exact scene detection algorithm and thresholds (tag weight, listener overlap minimum)
- How artist suggestions are queued and reviewed before affecting scene membership
- Scene page layout details beyond the three content types (artists, tracks, listeners)
- Notification delivery mechanism for scene follows

### Deferred Ideas (OUT OF SCOPE)
- **Label collectives** — skipped entirely for Phase 11. Too vague without an organic community. Revisit when users have formed natural groupings and we can see what they actually want.
- **Creation tools** (collaborative playlists, shared collections, label pages) — deferred until community explicitly requests them. Feature request mechanism ships Phase 11, actual tools come later.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-07 | AI scene awareness — detects emerging scenes from collective listening patterns | Tag co-occurrence clustering on mercury.db + taste.db listener overlap; AI prompt for scene naming; computed at pipeline time or on-demand |
| COMM-08 | The underground is alive — scenes exist in Mercury that exist nowhere else | Anti-rich-get-richer rotation tier system; novelty detection (new tag combinations); niche-first display mirrors Discovery Engine philosophy |
</phase_requirements>

---

## Summary

Phase 11 builds on top of three completed systems: the tag co-occurrence infrastructure in mercury.db (tag_cooccurrence table from Phase 6), the taste profile system in taste.db (favorite_artists + play_history, Phase 9), and the Nostr communication layer (Phase 10). Scene detection works by clustering the tag co-occurrence graph to find dense niche sub-communities, then validating clusters by checking whether the same listeners collect multiple artists in that cluster — the "same people are into all of these" test. Scenes without listener overlap are just tag coincidences; scenes WITH overlap are real micro-communities.

Scene pages are a new top-level route (`/scenes`) with a directory of detected scenes plus individual scene pages (`/scenes/[slug]`). This mirrors the KB genre page pattern but is dynamically generated from live data rather than pipeline-built data. The three content types per scene (artists + top tracks + listener count) map directly to queries against existing data. Following a scene uses NIP-51 generic lists (kind 30001) via NDK to store follows on Nostr — no new backend needed. Artist suggestions are queued locally (taste.db) and surfaced as signal for future detection runs. The feature request counter is a simple in-memory (or D1-backed) vote tally — no authentication required, session-scoped.

The two key complexity areas are (1) the scene detection algorithm itself (which needs careful threshold selection to avoid both over-detection on tag overlap alone and under-detection by requiring too many shared listeners) and (2) the anti-rich-get-richer surfacing (which requires a two-tier display with random rotation within tiers, not simple popularity sorting). Both can be handled in frontend-side TypeScript with data from existing tables.

**Primary recommendation:** Compute scenes client-side in the Tauri app from taste.db + mercury.db data; cache results in taste.db. Web path shows server-computed scene snapshots via new D1 API route. Use `tag_cooccurrence` and `favorite_artists` as primary signals with no new Rust required.

---

## Standard Stack

### Core (All Existing — No New Dependencies Required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit routes | Existing | New `/scenes` route + `/scenes/[slug]` | Same pattern as KB, discover, search routes |
| `src/lib/db/queries.ts` | Existing | Scene detection queries against mercury.db | All DB access goes through DbProvider |
| `@nostr-dev-kit/ndk` | Existing (Phase 10) | NIP-51 kind 30001 for scene follows | Already initialized via `ndkState` |
| `taste.db` (rusqlite) | Existing | Store scene follows + artist suggestions + feature requests | All user data lives in taste.db |
| `src/lib/ai/prompts.ts` | Existing | Scene naming + description generation prompt | Follows existing PROMPTS object pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/ai/engine.ts` (AiProvider) | Existing | Generate scene summaries/names | Tauri only, gated on `aiState.enabled` |
| `src-tauri/src/ai/taste_db.rs` | Existing | New tables for scene data in taste.db | Artist suggestions + scene follow cache |
| D1 (Cloudflare) | Existing | Server-side scene snapshot route for web | Web-only, `/api/scenes` endpoint |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NIP-51 for scene follows | Local taste.db only | NIP-51 makes follows visible across Nostr; local-only would work but misses social signal potential. NIP-51 preferred per established Phase 10 direction. |
| Pre-computed scenes in pipeline | On-demand detection | Pipeline requires rebuild to update; on-demand reacts to live data. Hybrid: detect at session start, cache in taste.db. |
| Full Louvain graph clustering | Simple threshold on tag_cooccurrence | Louvain is overkill for 10K tag pairs; threshold-based clustering is deterministic and auditable. Use threshold approach. |

**Installation:** No new packages required. All dependencies already in project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── scenes/
│   │   ├── detection.ts         # Scene detection algorithm
│   │   ├── types.ts             # DetectedScene, SceneArtist interfaces
│   │   ├── state.svelte.ts      # $state for scenes list (reactive)
│   │   └── index.ts             # Barrel export
│   └── components/
│       ├── SceneCard.svelte     # Scene directory card
│       └── SceneSuggestion.svelte # "Suggest an artist" UI
└── routes/
    ├── scenes/
    │   ├── +page.svelte         # Scene directory (two tiers: active + emerging)
    │   ├── +page.server.ts      # Web: D1 scene snapshot query
    │   ├── +page.ts             # Universal: Tauri detection, web passthrough
    │   └── [slug]/
    │       ├── +page.svelte     # Scene detail page
    │       ├── +page.server.ts  # Web: scene artists + listener count
    │       └── +page.ts         # Universal load
```

In `src-tauri/src/ai/taste_db.rs`:
- New tables: `detected_scenes`, `scene_artists`, `scene_follows`, `scene_suggestions`, `feature_requests`
- New Tauri commands: `get_detected_scenes`, `save_detected_scenes`, `follow_scene`, `unfollow_scene`, `suggest_scene_artist`, `get_scene_suggestions`, `upvote_feature_request`

### Pattern 1: Tag Co-Occurrence Cluster Detection

**What:** Find groups of niche tags that share many artists AND those artists share listeners.
**When to use:** Run once per session start (Tauri), or on-demand for web snapshot.

The detection runs in two passes:

**Pass 1 — Tag cluster seeds:** Find dense niche tag pairs from `tag_cooccurrence` where both tags have low `artist_count` (niche threshold) and high `shared_artists` (co-occurrence threshold). These seed candidates.

**Pass 2 — Listener overlap validation:** For each seed cluster, check whether the same users have collected (favorited) multiple artists from the cluster. This is the mercury signal — if the same listeners are collecting across the cluster, it's a real scene.

```typescript
// Source: derived from existing mercury.db schema + taste.db (Phase 6/9 patterns)

export interface DetectedScene {
    slug: string;           // dominant tag as slug
    name: string;           // dominant tag, capitalized
    tags: string[];         // all tags in the cluster (niche-first)
    artistMbids: string[];  // artists in the scene
    listenerCount: number;  // users with 2+ artists from scene in favorites
    isEmerging: boolean;    // tag combination never seen before threshold
    detectedAt: number;     // unix timestamp
}

/**
 * Pass 1: Find niche tag cluster seeds from tag_cooccurrence.
 * Both tags must be niche (artist_count < nicheThreshold).
 * Co-occurrence must be strong (shared_artists >= overlapMin).
 */
export async function findTagClusterSeeds(
    db: DbProvider,
    nicheThreshold = 500,     // tags with > 500 artists aren't niche enough
    overlapMin = 3            // at least 3 shared artists required
): Promise<Array<{ tag_a: string; tag_b: string; shared_artists: number }>> {
    return db.all(
        `SELECT tc.tag_a, tc.tag_b, tc.shared_artists
         FROM tag_cooccurrence tc
         JOIN tag_stats ts_a ON ts_a.tag = tc.tag_a
         JOIN tag_stats ts_b ON ts_b.tag = tc.tag_b
         WHERE ts_a.artist_count < ?
           AND ts_b.artist_count < ?
           AND tc.shared_artists >= ?
         ORDER BY tc.shared_artists DESC
         LIMIT 200`,
        nicheThreshold,
        nicheThreshold,
        overlapMin
    );
}

/**
 * Pass 2: Get artists for a tag pair (the candidate scene roster).
 */
export async function getTagPairArtists(
    db: DbProvider,
    tag_a: string,
    tag_b: string,
    limit = 20
): Promise<ArtistResult[]> {
    return db.all<ArtistResult>(
        `SELECT a.id, a.mbid, a.name, a.slug, a.country,
                (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
         FROM artists a
         JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?
         JOIN artist_tags at2 ON at2.artist_id = a.id AND at2.tag = ?
         ORDER BY at1.count DESC
         LIMIT ?`,
        tag_a, tag_b, limit
    );
}
```

### Pattern 2: Listener Overlap Validation (Taste-Side)

**What:** Check whether multiple artists in a candidate scene are collected by the same users.
**When to use:** After Pass 1, validate each candidate before promoting to a scene.

In Tauri: query `favorite_artists` in taste.db to find overlap. On web: use the Nostr relay data (public favorites published in Phase 10.1's taste profile publish) — but web detection is best-effort.

```typescript
// Source: derived from taste.db favorite_artists table (Phase 9 pattern)
// In Tauri: invoke Rust to check overlap in taste.db
// Minimum: at least 2 of the candidate artists in favorites = "connected listener"

async function validateListenerOverlap(
    candidateArtistMbids: string[],
    minSharedFavorites = 2    // at least 2 artists from scene in user's favorites
): Promise<number> {
    // Returns count of user's favorite artists that appear in the candidate scene
    // If >= minSharedFavorites, scene has listener-level validation
    const invoke = await getInvoke();
    const favorites = await invoke<FavoriteArtist[]>('get_favorite_artists');
    const favoriteMbids = new Set(favorites.map(f => f.artist_mbid));
    return candidateArtistMbids.filter(mbid => favoriteMbids.has(mbid)).length;
}
```

**Note:** For a single-user desktop app, "listener overlap" validation is necessarily local — we validate that the *current user* collects multiple artists from the scene. When there are many users (web), community overlap can be computed from aggregated follow data.

### Pattern 3: Anti-Rich-Get-Richer Tier Display

**What:** Two-tier display on the Scenes directory — active scenes (established) and emerging scenes (novel tag combinations). Random rotation within each tier.
**When to use:** The Scenes landing page.

```typescript
// Source: established Mercury pattern (crate dig random rotation, Phase 6)

function partitionScenes(scenes: DetectedScene[]): {
    active: DetectedScene[];
    emerging: DetectedScene[];
} {
    // Emerging: isEmerging=true OR listenerCount <= lowThreshold
    const emerging = scenes.filter(s => s.isEmerging || s.listenerCount <= 2);
    const active = scenes.filter(s => !s.isEmerging && s.listenerCount > 2);
    return {
        // Shuffle both tiers — no popularity ordering within tier
        active: shuffleArray(active),
        emerging: shuffleArray(emerging)
    };
}

function shuffleArray<T>(arr: T[]): T[] {
    // Fisher-Yates — deterministic within session, varied across sessions
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
```

### Pattern 4: Scene Follow via NIP-51

**What:** Store user's followed scenes as a NIP-51 generic list (kind 30001) on Nostr. Scene ID = the scene's slug.
**When to use:** When user clicks "Follow this scene" on a scene page.

```typescript
// Source: NDK event publishing pattern (Phase 10, rooms.svelte.ts)
// NIP-51 kind 30001 "Generic list" — user's list of followed Mercury scenes
// d tag = 'mercury-scenes' to namespace from other NIP-51 lists

export async function followScene(sceneSlug: string): Promise<void> {
    const { ndk } = ndkState;
    if (!ndk) return; // graceful noop if Nostr not connected

    const { NDKEvent } = await import('@nostr-dev-kit/ndk');

    // Fetch current list first (to append, not overwrite)
    const existing = await ndk.fetchEvent({
        kinds: [30001],
        authors: [ndkState.pubkey ?? ''],
        '#d': ['mercury-scenes']
    });

    const currentTags = existing?.tags ?? [];
    const alreadyFollowing = currentTags.some(
        t => t[0] === 't' && t[1] === sceneSlug
    );
    if (alreadyFollowing) return;

    const event = new NDKEvent(ndk);
    event.kind = 30001;
    event.content = '';
    event.tags = [
        ['d', 'mercury-scenes'],
        ...currentTags,
        ['t', sceneSlug]
    ];
    await event.publish();
}
```

### Pattern 5: Artist Suggestion Queue

**What:** Users suggest artists for a scene; suggestions queue locally, feed back as signal.
**When to use:** On scene detail page when user believes an artist belongs but AI missed them.

Implementation: New `scene_suggestions` table in taste.db. Rust command `suggest_scene_artist(scene_slug, artist_mbid, artist_name)`. Suggestions affect future detection runs by temporarily boosting the co-occurrence weight of the suggested artist's tags with the scene's tags.

### Pattern 6: Feature Request Counter

**What:** Simple upvote counter on "empty state" UI for deferred creation tools (collaborative playlists, etc.).
**When to use:** Shown when user reaches a page/action where a creation tool would be useful.

Keep it stateless and simple — no authentication, no backend required for v1. Store votes in `taste.db` (`feature_requests` table) locally. On web: cookie-scoped session counter only. Do NOT build a full voting system — this is a signal capture mechanism, not a product decision tool.

```typescript
// Local taste.db approach: INSERT OR REPLACE with session deduplication
// feature_requests(id TEXT PRIMARY KEY, count INTEGER, last_voted INTEGER)
// Web: store in localStorage keyed by feature ID, report count in logs
```

### Anti-Patterns to Avoid

- **Computing scenes on every page load:** Run detection once per session start, cache in taste.db `detected_scenes` table. Re-run only when triggered (new favorites, manual refresh).
- **Using only tag co-occurrence without listener validation:** Tag overlap produces false positives (jazz + blues = coincidence, not scene). Require listener overlap signal.
- **Sorting scenes by listenerCount:** This is exactly the rich-get-richer pattern. Use tier + random rotation.
- **Blocking on AI for scene names:** Scene name = dominant tag name, capitalized. AI description is optional, generated async, not required for display.
- **Requiring Nostr connection for scene follows (local state):** Mirror the NIP-51 follow in taste.db too. If Nostr fails, local follow state still works.
- **Attempting to detect scenes on web from scratch:** Web path gets a server-computed snapshot from a new D1 API route; only the Tauri desktop app runs live detection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scene follow persistence | Custom DB table with sync | NIP-51 kind 30001 + taste.db mirror | NDK already installed; NIP-51 is the open standard for lists |
| Graph clustering | Louvain, DBSCAN, etc. | Threshold-based tag pair detection on existing `tag_cooccurrence` | tag_cooccurrence already computed at pipeline time; threshold approach is deterministic and sufficient for 10K edges |
| Scene name generation | Custom ML model | Dominant-tag-name + optional AI summary from existing AiProvider | AiProvider already wired; tag names are descriptive enough |
| Listener count (web) | User tracking / analytics | Nostr event author deduplication on kind 30001 events | No tracking; count unique NIP-51 authors who follow the scene |

**Key insight:** Mercury already has all the raw materials — tag co-occurrence, taste profiles, Nostr protocol. Scene building assembles these rather than inventing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Scene Detection Produces Too Many or Too Few Scenes

**What goes wrong:** With nicheThreshold=500, overlapMin=3, you might get 0 scenes (thresholds too strict) or 200 scenes (thresholds too loose, every tag pair qualifies).
**Why it happens:** The thresholds are guesses without real user data. At launch, with few users, there will be no multi-user listener overlap validation possible — local-user-only validation applies.
**How to avoid:** Start with conservative thresholds (nicheThreshold=200, overlapMin=5). Show "No scenes detected yet — invite friends to build them" empty state gracefully. Don't hard-fail.
**Warning signs:** Scene directory is empty or has 100+ entries on first run.

### Pitfall 2: NIP-51 List Gets Overwritten on Each Follow

**What goes wrong:** Each "follow scene" call creates a new kind 30001 event without fetching the existing one first — each follow replaces the entire list, losing prior follows.
**Why it happens:** NDK event publishing replaces parameterized replaceable events (kind 30001 with same 'd' tag). Must fetch first, then republish with merged tags.
**How to avoid:** Always `fetchEvent` the current list before publishing. If fetch fails, read from taste.db mirror instead.
**Warning signs:** User can only follow one scene — each new follow clears the previous.

### Pitfall 3: AI Scene Description Blocks Page Render

**What goes wrong:** Scene detail page awaits AI description before rendering — creates visible latency.
**Why it happens:** AI generation takes 2-10 seconds depending on model load.
**How to avoid:** Render the page immediately with tag name, artists, listener count. Load AI description async into a slot that fills in after. Same `effectiveBio` pattern as artist pages.
**Warning signs:** Scene page has noticeable delay before any content appears.

### Pitfall 4: Scene Slug Collisions with Genre KB Slugs

**What goes wrong:** A detected scene "shoegaze" has the same slug as the KB genre page `/kb/genre/shoegaze`. Route conflicts or user confusion.
**Why it happens:** Scenes inherit dominant tag as slug. Tags are also used as KB genre slugs.
**How to avoid:** Scene route prefix is `/scenes/` (not `/kb/`). Different URL space — no collision. Cross-link from KB genre pages to their corresponding scene if one exists.
**Warning signs:** 404s or wrong page rendered when navigating between KB and Scenes.

### Pitfall 5: Web Path Tries to Run Client-Side Detection

**What goes wrong:** `+page.ts` tries to run detection logic in web context without taste.db access — crashes or returns empty.
**Why it happens:** Detection queries taste.db (Tauri only). Without the isTauri() guard, web execution attempts the same path.
**How to avoid:** In `+page.ts`, isTauri() check is mandatory. Web path gets server data from `+page.server.ts`. Same universal load pattern as discover, kb, style-map routes.
**Warning signs:** Web console error "Cannot read 'get_favorite_artists' of undefined" or similar.

### Pitfall 6: D1 Bound Parameter Limit for Scene Artist Queries

**What goes wrong:** Passing all scene artist MBIDs as bound params when querying for scene artist details fails on D1 if > 100 artists.
**Why it happens:** D1 has limits on bound parameters per query. Same issue as tag intersection (capped at 5 tags in Phase 6).
**How to avoid:** Use subquery IN pattern (same as tag_cooccurrence edge filtering in Style Map). Store scene artist MBIDs as a JSON blob in the D1 scenes table; fetch in batches.
**Warning signs:** D1 "too many bound values" error in web path.

---

## Code Examples

### Scene Detection Entry Point

```typescript
// Source: derived from taste/signals.ts + db/queries.ts patterns (Phase 9 + Phase 6)
// src/lib/scenes/detection.ts

export async function detectScenes(): Promise<DetectedScene[]> {
    const db = await getProvider();
    const scenes: DetectedScene[] = [];

    // Pass 1: find niche tag cluster seeds
    const seeds = await findTagClusterSeeds(db, 200, 5);

    // Group seeds into candidate scenes (tag pairs sharing 3+ tags = same cluster)
    const clusters = groupTagPairsIntoClusters(seeds);

    for (const cluster of clusters) {
        // Get artists for this cluster
        const artists = await getClusterArtists(db, cluster.tags, 20);
        if (artists.length < 3) continue; // min 3 artists = scene, not coincidence

        // Validate with local listener overlap (Tauri: taste.db favorites)
        const overlap = await validateListenerOverlap(artists.map(a => a.mbid));

        // Dominant tag = tag with lowest artist_count (most niche)
        const dominantTag = cluster.tags[0];

        scenes.push({
            slug: dominantTag,
            name: capitalize(dominantTag.replace(/-/g, ' ')),
            tags: cluster.tags,
            artistMbids: artists.map(a => a.mbid),
            listenerCount: overlap, // number of user's favorites in this scene
            isEmerging: isNovelTagCombination(cluster.tags),
            detectedAt: Math.floor(Date.now() / 1000)
        });
    }

    return scenes;
}
```

### Scene Page Route (Universal Load Pattern)

```typescript
// Source: same universal load pattern as /discover, /kb, /style-map (Phase 6/7)
// src/routes/scenes/+page.ts

import type { PageLoad } from './$types';
import { isTauri } from '$lib/platform';

export const load: PageLoad = async ({ data }) => {
    if (!isTauri()) {
        // Web: use server-computed scene snapshot from +page.server.ts
        return { ...data };
    }

    // Tauri: run detection live
    const { detectScenes } = await import('$lib/scenes/detection');
    const scenes = await detectScenes();

    return { scenes };
};
```

### taste.db Schema Additions (Rust)

```rust
// Source: same pattern as taste_db.rs init_taste_db() (Phase 5/9)
// New tables appended to the existing CREATE TABLE IF NOT EXISTS batch

CREATE TABLE IF NOT EXISTS detected_scenes (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tags TEXT NOT NULL,      -- JSON array of tag strings
    artist_mbids TEXT NOT NULL, -- JSON array of MBIDs
    listener_count INTEGER NOT NULL DEFAULT 0,
    is_emerging INTEGER NOT NULL DEFAULT 0, -- 0/1 boolean
    detected_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_follows (
    scene_slug TEXT PRIMARY KEY,
    followed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_slug TEXT NOT NULL,
    artist_mbid TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    suggested_at INTEGER NOT NULL,
    UNIQUE(scene_slug, artist_mbid)
);

CREATE TABLE IF NOT EXISTS feature_requests (
    feature_id TEXT PRIMARY KEY,
    vote_count INTEGER NOT NULL DEFAULT 0,
    last_voted INTEGER NOT NULL
);
```

### AI Scene Naming Prompt

```typescript
// Source: follows prompts.ts PROMPTS object pattern (Phase 5/7)
// Add to PROMPTS object in src/lib/ai/prompts.ts

sceneDescription: (sceneName: string, tags: string[], artistNames: string[]) =>
    `Write a single evocative sentence (max 20 words) describing the "${sceneName}" music scene.
Tags associated with this scene: ${tags.slice(0, 5).join(', ')}.
Example artists: ${artistNames.slice(0, 3).join(', ')}.
Capture the vibe — something a fan would recognise immediately. No scene names, no genre jargon as nouns.`
```

### Novelty Detection (isEmerging)

```typescript
// "Emerging" = tag combination not seen before in known KB genres
// Simple approach: check whether the tag cluster maps to any existing genres.mb_tag

async function isNovelTagCombination(
    tags: string[],
    db: DbProvider
): Promise<boolean> {
    // If none of the scene's tags match a known KB genre mb_tag, it's novel
    const placeholders = tags.slice(0, 3).map(() => '?').join(', ');
    const known = await db.get<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM genres WHERE mb_tag IN (${placeholders})`,
        ...tags.slice(0, 3)
    );
    return (known?.cnt ?? 0) === 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-built scene pages from editorial curation | AI-detected scenes from listener overlap + tag co-occurrence | Phase 11 (this phase) | Scenes emerge from data, not editorial opinion |
| NIP-28 rooms for community scenes | NIP-51 generic lists for scene follows | Phase 11 | NIP-51 is the open standard for user lists; rooms are for chat, not follow lists |
| Popularity-sorted scene listings | Tier-based random rotation (anti-rich-get-richer) | Phase 11 | Preserves underground scene discoverability |

**Deprecated/outdated approaches avoided:**
- Louvain or k-means clustering: overkill for deterministic tag-pair detection with 10K edges
- Separate scene DB: all user scene data goes in taste.db (established pattern)
- Custom notification push: scene follow notifications delivered via Nostr subscription to NIP-51 list changes

---

## Open Questions

1. **Multi-user listener overlap for web deployment**
   - What we know: taste.db is local-only; there is no central user database
   - What's unclear: How does the web path compute listener counts across users without a user database?
   - Recommendation: Web path shows scenes computed from Nostr public data (taste profiles published to relays in Phase 10.1). Use unique NIP-51 kind 30001 authors who list the scene as a proxy for listener count. If no Nostr data available, show scenes from tag co-occurrence only with listener_count = 0.

2. **Detection frequency and caching strategy**
   - What we know: Detection is expensive (multiple DB queries + AI); should not run on every page load
   - What's unclear: When to invalidate the cache in taste.db?
   - Recommendation: Detect once per session start (Tauri onMount in root layout), cache result in `detected_scenes` table with `detected_at` timestamp. Re-detect if cache is older than 24 hours OR when the user adds a new favorite (which changes the overlap signal).

3. **Artist suggestion review workflow**
   - What we know: User suggestions should "feed back as signal" but scenes are AI-detected
   - What's unclear: Does a suggestion immediately add the artist to the scene, or does it require a threshold (e.g., 3 suggestions)?
   - Recommendation: Suggestions go into the `scene_suggestions` table immediately. They appear on the scene page as "Community suggested" artists (visually distinct). They feed into the next detection run as weighted input. No moderation queue needed for MVP — the signal is low-stakes.

4. **COMM-07/08 requirement IDs**
   - What we know: These IDs are referenced in ROADMAP.md but not formally defined in a REQUIREMENTS.md for v1.1 (no v1.1 REQUIREMENTS.md exists yet)
   - What's unclear: Exact formal requirement text
   - Recommendation: Treat Phase 11 success criteria from ROADMAP.md as the requirement definition: AI scene awareness + underground is alive. Create REQUIREMENTS.md entries during planning.

---

## Sources

### Primary (HIGH confidence)
- `D:/Projects/Mercury/src/lib/db/queries.ts` — tag_cooccurrence schema, existing query patterns
- `D:/Projects/Mercury/src-tauri/src/ai/taste_db.rs` — taste.db schema, Rust table creation patterns
- `D:/Projects/Mercury/src/lib/comms/rooms.svelte.ts` — NDK event creation/publishing pattern
- `D:/Projects/Mercury/src/lib/comms/nostr.svelte.ts` — NDK singleton, ndkState pattern
- `D:/Projects/Mercury/src/lib/ai/prompts.ts` — AI prompt pattern for scene descriptions
- `D:/Projects/Mercury/ARCHITECTURE.md` — Anti-patterns, dual runtime architecture, D1 bound parameter limits

### Secondary (MEDIUM confidence)
- [NIP-51 specification](https://nips.nostr.com/51) — Kind 30001 generic lists, 'd' tag format, follow sets
- [Nostr protocol NIPs](https://github.com/nostr-protocol/nips/blob/master/51.md) — Current NIP-51 status and kind numbers

### Tertiary (LOW confidence — needs validation)
- WebSearch results on Louvain community detection for tag clustering — verified approach is overkill for this use case; threshold-based detection recommended instead
- nicheThreshold=200, overlapMin=5 — initial threshold values are educated guesses; will need tuning once real user data exists

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are existing project code; no new packages
- Architecture patterns: HIGH — follows established Mercury patterns (universal load, taste.db, NDK events)
- Detection algorithm: MEDIUM — thresholds are educated guesses; algorithm structure is sound but parameter tuning requires real data
- NIP-51 scene follows: MEDIUM — NIP-51 is well-specified but NDK's handling of kind 30001 parametrized replaceable events needs verification at implementation time
- Pitfalls: HIGH — based on exact same issues encountered in Phases 6, 9, 10

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (30 days — stable dependencies; thresholds may need revision with user feedback)
