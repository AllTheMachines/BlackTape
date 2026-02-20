# Phase 6: Discovery Engine - Research

**Researched:** 2026-02-20
**Domain:** SQLite composite ranking, tag co-occurrence, D3 force graphs, SvelteKit navigation
**Confidence:** HIGH (all primary techniques verified against official docs and working code in this codebase)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | User can browse and intersect tags | URL-driven multi-tag filter via `goto()` + `artist_tags` JOIN intersection query |
| DISC-02 | Composite discovery ranking — inverse popularity + tag rarity + scene freshness | SQLite computed score using artist_tags aggregate subqueries + `begin_year` for freshness |
| DISC-03 | Style map visualization shows tag relationships and clusters | D3 force-directed graph on pre-computed tag co-occurrence table; SVG for small graphs, canvas for large |
| DISC-04 | Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country) | Fast rowid-based random sampling; filter by `begin_year`, `country`, tag |
</phase_requirements>

## Summary

Phase 6 transforms Mercury from a search engine into a genuine discovery engine. The core mechanism is that uniqueness IS the ranking signal: niche artists rise, generic artists sink. All four requirements map onto existing SQLite schema capabilities — no new databases, no external services, no server-side compute. Everything runs in-query on `mercury.db` for both Cloudflare D1 (web) and local SQLite (desktop).

The fundamental data assets are already in place: 2.8M artists in `artists`, 672K artist-tag links in `artist_tags` (each with a `count` vote score), `begin_year` in `artists`, and the full-text search FTS5 virtual table. From these, every Phase 6 feature can be derived: tag intersection browsing uses multi-JOIN queries; the uniqueness/discovery score is a composite formula in SQL; the style map is computed from a pre-built co-occurrence table; crate digging uses fast rowid-based random sampling with filter constraints.

The style map is the one feature that needs a preprocessing step — computing and persisting tag co-occurrence data. This is a one-time pipeline addition that runs at DB build time and stores results in a `tag_cooccurrence` table shipped inside `mercury.db`. The D3 visualization should use SVG for initial implementation (simpler, sufficient for top-N tags), with canvas available as an upgrade if performance is inadequate for 500+ nodes.

**Primary recommendation:** Build the discovery ranking and tag intersection entirely in SQL on the existing schema. Add a `tag_cooccurrence` table at pipeline build time for the style map. Use D3 force simulation with Svelte 5 runes for the style map visualization. No new dependencies beyond `d3-force`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-force | 3.0.0 (part of d3 7.9.0) | Physics-based force simulation for style map layout | Official D3 module, well-documented, works with Svelte 5 via `onMount` + reactive state |
| SQLite (existing) | FTS5 built-in | All ranking, filtering, scoring | Already in mercury.db, all queries via DbProvider interface |
| better-sqlite3 (existing) | Pipeline use only | Pre-compute tag_cooccurrence at build time | Already in pipeline/ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intersection Observer API | Browser built-in | Infinite scroll trigger for Crate Digging Mode | Avoid scroll event listeners — use Intersection Observer |
| SvelteKit goto() | Built-in | URL-driven tag filter state (multi-tag intersection) | Standard SvelteKit pattern for shareable filter state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| d3-force SVG | d3-force Canvas | Canvas needed for 500+ nodes; SVG adequate for top-50 to top-100 tags |
| SQL composite score | Client-side JS scoring | SQL is far better — no N+1 query, works on both D1 and SQLite, sort happens in DB |
| SQLite random sampling via rowid | ORDER BY RANDOM() | ORDER BY RANDOM() is O(n log n) on 2.8M rows (~0.5s); rowid approach is ~0.001s |
| Pre-computed tag_cooccurrence table | On-demand co-occurrence JOIN | On-demand co-occurrence over 672K rows is expensive for interactive map; pre-compute wins |

**Installation:**
```bash
npm install d3-force
```
(d3-force is the only new runtime dependency needed)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── routes/
│   ├── discover/              # New: tag browser + discovery ranking
│   │   ├── +page.svelte       # Tag intersection browser, discovery results
│   │   └── +page.ts           # Load: reads tags from URL, queries DB
│   ├── crate/                 # New: Crate Digging Mode
│   │   ├── +page.svelte       # Random-stack browsing with filters
│   │   └── +page.ts           # Load: random artists from filtered set
│   └── style-map/             # New: force-directed style map
│       ├── +page.svelte       # D3 canvas/SVG visualization
│       └── +page.ts           # Load: tag_cooccurrence data
├── lib/
│   ├── db/
│   │   └── queries.ts         # ADD: discovery queries (scoring, intersection, random)
│   └── components/
│       ├── TagFilter.svelte    # New: clickable tag intersection chips + active filters
│       ├── StyleMap.svelte     # New: D3 force graph component
│       └── UniquenessScore.svelte # New: artist uniqueness badge for artist page
```

### Pattern 1: URL-Driven Tag Intersection (DISC-01)

**What:** Multi-tag filter state lives in the URL as `?tags=shoegaze,post-rock`. Tags are intersected (AND logic) so results must have ALL selected tags. State managed via `page.url.searchParams` reading and `goto()` writing.

**When to use:** Any filter that should be shareable, bookmarkable, or navigable via browser history.

**Example:**
```typescript
// src/routes/discover/+page.ts
// Source: SvelteKit docs + project pattern (universal load fn)
import type { PageLoad } from './$types';
import { getProvider } from '$lib/db/provider';
import { isTauri } from '$lib/platform';

export const load: PageLoad = async ({ url, data }) => {
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

    if (!isTauri()) {
        return { ...data, tags };  // web: server provides artists
    }

    // Desktop: query local DB
    const db = await getProvider();
    const artists = tags.length > 0
        ? await getArtistsByTagIntersection(db, tags)
        : await getDiscoveryRankedArtists(db, 50);

    return { artists, tags };
};
```

```typescript
// src/routes/discover/+page.server.ts (web path)
import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';

export const load: PageServerLoad = async ({ url, platform }) => {
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
    const db = new D1Provider(platform!.env.DB);
    const artists = tags.length > 0
        ? await getArtistsByTagIntersection(db, tags)
        : await getDiscoveryRankedArtists(db, 50);
    return { artists, tags };
};
```

```typescript
// src/lib/db/queries.ts — tag intersection query
// Uses repeated JOINs (one per tag) — reliable for 2-5 tags
export async function getArtistsByTagIntersection(
    db: DbProvider,
    tags: string[],
    limit = 50
): Promise<ArtistResult[]> {
    if (tags.length === 0) return [];

    // Build N joins dynamically — one per tag
    const joins = tags.map((_, i) =>
        `JOIN artist_tags at${i} ON at${i}.artist_id = a.id AND at${i}.tag = ?`
    ).join('\n');

    const sql = `
        SELECT a.id, a.mbid, a.name, a.slug, a.country,
               (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
               (SELECT COUNT(DISTINCT tag) FROM artist_tags WHERE artist_id = a.id) AS tag_count
        FROM artists a
        ${joins}
        GROUP BY a.id
        ORDER BY tag_count ASC  -- fewer total tags = more niche = ranked higher
        LIMIT ?
    `;

    return db.all<ArtistResult>(sql, ...tags, limit);
}
```

**Adding/removing a tag (component):**
```typescript
// TagFilter.svelte — update URL without full page reload
import { goto } from '$app/navigation';
import { page } from '$app/stores';

function toggleTag(tag: string) {
    const current = $page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
    const updated = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];

    const params = new URLSearchParams($page.url.searchParams);
    if (updated.length > 0) {
        params.set('tags', updated.join(','));
    } else {
        params.delete('tags');
    }
    goto(`?${params}`, { keepFocus: true, noScroll: true, replaceState: false });
}
```

### Pattern 2: Composite Discovery Ranking Score (DISC-02)

**What:** A per-artist uniqueness score combining:
1. **Tag rarity** — inverse of how many artists share each tag (rare tags = high score)
2. **Tag count inverse** — fewer total tags = more specific = more niche
3. **Scene freshness** — artists active more recently get a small boost

**Formula (computed in SQL):**
```
discovery_score = (1.0 / total_tag_count) * avg_tag_rarity * freshness_modifier
```

Where:
- `total_tag_count` = number of tags the artist has (fewer = more niche)
- `avg_tag_rarity` = average `(1.0 / artists_per_tag)` across all tags (rarer tags = higher)
- `freshness_modifier` = `1.0 + (0.1 * CASE WHEN begin_year >= 2015 THEN 1 ELSE 0 END)`

**Implementation approach:** Pre-compute tag popularity statistics into a `tag_stats` table at pipeline build time. This avoids expensive subqueries on every page load.

```sql
-- Pipeline: pre-compute tag statistics (run in import.js, written to mercury.db)
CREATE TABLE IF NOT EXISTS tag_stats (
    tag TEXT PRIMARY KEY,
    artist_count INTEGER NOT NULL,  -- how many artists have this tag
    total_votes INTEGER NOT NULL    -- sum of all votes for this tag
);

INSERT INTO tag_stats (tag, artist_count, total_votes)
SELECT tag, COUNT(*) as artist_count, SUM(count) as total_votes
FROM artist_tags
GROUP BY tag;
```

```sql
-- Discovery ranking query using pre-computed tag_stats
-- Source: derived from verify.js co-occurrence pattern + confirmed SQLite docs
SELECT
    a.id, a.mbid, a.name, a.slug, a.country,
    (SELECT GROUP_CONCAT(at2.tag, ', ') FROM artist_tags at2 WHERE at2.artist_id = a.id) AS tags,
    -- Composite score: lower total tags + rarer tags + recent = higher rank
    (
        1.0 / NULLIF(
            (SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id),
            0
        )
        *
        (
            SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
            FROM artist_tags at3
            JOIN tag_stats ts ON ts.tag = at3.tag
            WHERE at3.artist_id = a.id
        )
        *
        CASE WHEN a.begin_year >= 2010 THEN 1.2 ELSE 1.0 END
        *
        CASE WHEN a.ended = 0 THEN 1.1 ELSE 1.0 END
    ) AS discovery_score
FROM artists a
WHERE a.id IN (SELECT DISTINCT artist_id FROM artist_tags)  -- must have at least one tag
ORDER BY discovery_score DESC
LIMIT ?
```

**Uniqueness score for artist profile (DISC-02 visible badge):**
```sql
-- Single-artist uniqueness score (for artist page badge)
SELECT
    a.id,
    (
        SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
        FROM artist_tags at3
        JOIN tag_stats ts ON ts.tag = at3.tag
        WHERE at3.artist_id = a.id
    ) * 100.0 AS uniqueness_score  -- 0-100 scale
FROM artists a
WHERE a.slug = ?
```

### Pattern 3: Style Map (DISC-03)

**What:** Force-directed graph showing tag nodes connected by co-occurrence strength. Tags that frequently appear on the same artists are attracted together. Rendered with D3 force simulation inside a Svelte component.

**Pre-computation (pipeline build time):**
```sql
-- tag_cooccurrence table — added to pipeline/lib/schema.sql
-- Source: verify.js already has this query working
CREATE TABLE IF NOT EXISTS tag_cooccurrence (
    tag_a TEXT NOT NULL,
    tag_b TEXT NOT NULL,
    shared_artists INTEGER NOT NULL,
    PRIMARY KEY (tag_a, tag_b),
    CHECK (tag_a < tag_b)  -- canonical ordering prevents duplicates
);

INSERT INTO tag_cooccurrence (tag_a, tag_b, shared_artists)
SELECT t1.tag, t2.tag, COUNT(*) as shared_artists
FROM artist_tags t1
JOIN artist_tags t2 ON t1.artist_id = t2.artist_id AND t1.tag < t2.tag
WHERE t1.count >= 2 AND t2.count >= 2
GROUP BY t1.tag, t2.tag
HAVING shared_artists >= 5  -- minimum edge weight to avoid noise
ORDER BY shared_artists DESC
LIMIT 10000;  -- cap at 10K edges to keep DB size manageable
```

**Svelte 5 + D3 force simulation pattern:**
```typescript
// Source: datavisualizationwithsvelte.com + D3 official docs (d3-force 7.9.0)
// StyleMap.svelte

import { onMount } from 'svelte';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

interface TagNode extends SimulationNodeDatum {
    id: string;
    artistCount: number;
    x?: number;
    y?: number;
}

interface TagLink extends SimulationLinkDatum<TagNode> {
    source: string | TagNode;
    target: string | TagNode;
    strength: number;
}

let nodes = $state<TagNode[]>([]);
let links = $state<TagLink[]>([]);

onMount(() => {
    const simulation = forceSimulation(nodes)
        .force('link', forceLink(links).id((d: TagNode) => d.id).strength(d => d.strength / 100))
        .force('charge', forceManyBody().strength(-30))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide().radius(d => Math.sqrt(d.artistCount) + 5));

    // Run simulation to completion (static layout)
    simulation.tick(300);

    // Extract positions after settling
    nodes = simulation.nodes();

    simulation.stop();
});
```

**Rendering approach:**
- Use SVG for initial implementation (up to top-100 tags by artist_count)
- Data: fetch top-50 tags by artist count + all co-occurrence edges between them (queryable from `tag_cooccurrence`)
- Clicking a tag node navigates to `/discover?tags=<tag>`

### Pattern 4: Crate Digging Mode (DISC-04)

**What:** Serendipitous random browsing. User picks filters (genre/decade/country), gets a shuffled stack of artists from that slice. "Flip" to next batch.

**Fast random sampling (verified pattern from 2025 research):**
```typescript
// src/lib/db/queries.ts
export async function getCrateDigArtists(
    db: DbProvider,
    filters: { tag?: string; decadeMin?: number; decadeMax?: number; country?: string },
    limit = 20
): Promise<ArtistResult[]> {
    // Step 1: get max rowid (fast — uses index)
    const maxRow = await db.get<{ max_id: number }>(
        `SELECT MAX(id) as max_id FROM artists`
    );
    if (!maxRow) return [];

    // Step 2: generate random start point in application code
    const randomStart = Math.floor(Math.random() * maxRow.max_id);

    // Build WHERE clause from filters
    const whereClauses: string[] = [`a.id > ?`];
    const params: unknown[] = [randomStart];

    if (filters.tag) {
        whereClauses.push(`EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)`);
        params.push(filters.tag);
    }
    if (filters.decadeMin) {
        whereClauses.push(`a.begin_year >= ?`);
        params.push(filters.decadeMin);
    }
    if (filters.decadeMax) {
        whereClauses.push(`a.begin_year < ?`);
        params.push(filters.decadeMax);
    }
    if (filters.country) {
        whereClauses.push(`a.country = ?`);
        params.push(filters.country);
    }

    const where = whereClauses.join(' AND ');
    params.push(limit);

    const results = await db.all<ArtistResult>(
        `SELECT a.id, a.mbid, a.name, a.slug, a.country,
                (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
         FROM artists a
         WHERE ${where}
         LIMIT ?`,
        ...params
    );

    // If not enough results (hit the end of the table), wrap around
    if (results.length < limit / 2) {
        const fallback = await db.all<ArtistResult>(
            `SELECT a.id, a.mbid, a.name, a.slug, a.country,
                    (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
             FROM artists a
             WHERE a.id <= ?
             ${filters.tag ? `AND EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)` : ''}
             ORDER BY RANDOM()
             LIMIT ?`,
            randomStart,
            ...(filters.tag ? [filters.tag] : []),
            limit - results.length
        );
        return [...results, ...fallback];
    }

    return results;
}
```

### Pattern 5: Routing Structure

Phase 6 adds three new routes. All follow the existing universal load function pattern (web uses `+page.server.ts` with D1, desktop uses `+page.ts` with TauriProvider). The discover route also works on web — tag browsing doesn't require Tauri. Crate Digging Mode and Style Map are desktop-only (gated with `isTauri()` check, same pattern as Library/Explore).

**Navigation additions (header, Tauri-only):**
- "Discover" link (works on web too — same as search but browse-first)
- "Dig" link (Tauri-only — crate digging mode)
- "Style Map" link (Tauri-only — visualization)

### Anti-Patterns to Avoid

- **On-demand co-occurrence JOIN**: Don't run the `tag_a JOIN tag_b` query at request time. It joins 672K rows × 672K rows. Pre-compute into `tag_cooccurrence` at pipeline time.
- **ORDER BY RANDOM() on full artists table**: For a 2.8M row table this is ~0.5s. Use the rowid random-start pattern instead.
- **Client-side scoring**: Don't fetch all artists and score in JS. Score in SQL — the DB is already doing the JOIN work and can sort the result set in one pass.
- **D3 DOM manipulation inside Svelte**: Don't use D3 selections to mutate the DOM. Let D3 compute positions, let Svelte render. Store node `x, y` in reactive state, bind to SVG attributes.
- **Reactive D3 simulation on every tick**: Running `simulation.on('tick', () => { nodes = [...simulation.nodes()] })` on every frame causes 60fps Svelte rerenders. Instead: `simulation.tick(300)` then `nodes = simulation.nodes()` once — static layout.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force-directed graph layout | Custom physics engine | d3-force | Velocity Verlet integration, multiple force types, battle-tested |
| URL state management for filters | Custom store + history API | SvelteKit goto() + page.url.searchParams | Built into SvelteKit, handles SSR, browser back/forward, shareable URLs |
| Tag statistics at query time | Inline COUNT(*) subqueries per tag | Pre-computed `tag_stats` table | Avoids 672K-row aggregation on every discovery page load |
| Infinite scroll detection | Scroll event + position math | Intersection Observer API | Built-in, zero cost, fires correctly with virtual scroll containers |

**Key insight:** The most expensive operations in this phase are tag co-occurrence computation and random sampling on 2.8M rows. Both are solved by moving computation to pipeline time (co-occurrence) and avoiding full-table reads (rowid random sampling). The query patterns are simple SQL once the right pre-computations exist.

## Common Pitfalls

### Pitfall 1: Tag Intersection Query Breaks on D1

**What goes wrong:** Dynamic JOIN generation works fine in SQLite locally but D1's bound parameter limit (100 max) means queries with too many tags could theoretically fail. Additionally, D1's query size limit is 100KB.

**Why it happens:** D1 enforces SQLite limits strictly. The dynamic JOIN approach generates one join clause and one bind parameter per tag.

**How to avoid:** Cap tag intersection at 5 concurrent tags in the UI. At 5 tags, the query is well within all limits. Display a "max 5 tags" indicator in the TagFilter component.

**Warning signs:** D1 errors about "too many bindings" or "query too long" in web mode.

### Pitfall 2: co-occurrence Table Makes DB Too Large

**What goes wrong:** The full unrestricted co-occurrence query generates potentially millions of edges between tags. If stored naively, this could add hundreds of MB to mercury.db.

**Why it happens:** 672K artist-tag rows can form many unique tag pairs.

**How to avoid:** Apply double filter at pipeline time: (1) `count >= 2` on each tag (removes noisy votes), (2) `HAVING shared_artists >= 5` (removes weak connections), (3) `LIMIT 10000` edges max. Result is a few MB at most.

**Warning signs:** mercury.db growing significantly during pipeline run, or `tag_cooccurrence` row count > 100K.

### Pitfall 3: D3 Force Simulation Causes Continuous Svelte Rerenders

**What goes wrong:** Wiring D3 simulation `on('tick')` to Svelte `$state` causes a rerender every simulation frame — 60fps × number of nodes = layout thrashing.

**Why it happens:** D3 simulations have an `alpha` that decays over time. Each tick fires a callback, and if that callback sets reactive state, Svelte rerenders.

**How to avoid:** Never wire `simulation.on('tick')` to `$state`. Instead: run simulation headlessly with `simulation.tick(300)`, then extract final positions with `simulation.nodes()`, assign once to `$state`. The map is static — it doesn't need live physics.

**Warning signs:** CPU pegged at 100% when viewing the style map, or choppy animation.

### Pitfall 4: Uniqueness Score Returns NULL for Artists Without Tags

**What goes wrong:** The discovery ranking query uses `AVG(1.0 / ts.artist_count)` over the artist's tags. Artists with zero tags produce a NULL score, which sorts unpredictably.

**Why it happens:** `AVG()` of an empty set is NULL in SQLite. `1.0 / NULL` is also NULL. NULLIF() further produces NULL.

**How to avoid:** The WHERE clause `WHERE a.id IN (SELECT DISTINCT artist_id FROM artist_tags)` ensures only tagged artists appear in discovery results. Alternatively, use `COALESCE(score, 0)` in the ORDER BY. Add a test case for artists with no tags.

**Warning signs:** Some artists always appear at the top or bottom of discovery results regardless of actual uniqueness.

### Pitfall 5: Crate Digging "Dry Patches" at End of Table

**What goes wrong:** The rowid random-start approach (`WHERE id > ?`) can return very few results when `randomStart` is near the maximum rowid. The remaining rows may all be filtered out by tag/country/decade constraints.

**Why it happens:** The artist table has 2.8M artists but they're not uniformly distributed by country/decade/tag. Some slices (e.g., "Iceland + 2000s + folk") have sparse coverage in high-rowid ranges.

**How to avoid:** Implement the wrap-around fallback: if results < limit/2, issue a second query for `id <= randomStart` with `ORDER BY RANDOM() LIMIT (limit - results.length)`. This ensures the stack always fills, at the cost of one extra query in edge cases.

**Warning signs:** Crate digging for specific filters frequently returns fewer than 5 artists.

### Pitfall 6: Style Map Data Too Large for D1 Edge Cases

**What goes wrong:** Loading tag_cooccurrence rows for the style map via the web (D1) returns potentially thousands of rows in a single D1 response. D1 has a 2MB row size limit and overall response limits.

**Why it happens:** The style map endpoint fetches all co-occurrence edges to draw the graph client-side.

**How to avoid:** Limit the style map data fetch: top-50 tags by artist_count = at most 50*49/2 = ~1225 possible edges. At the cap, this is comfortably under D1 limits. The query should apply a `WHERE ts.artist_count >= threshold` filter to only include tags that appear in the top-N most common.

**Warning signs:** Style map page fails to load on web but works on desktop.

## Code Examples

### Query: Popular Tags List (for tag browser starting state)
```sql
-- Source: verify.js + SQLite official docs (GROUP BY confirmed in D1 docs)
SELECT ts.tag, ts.artist_count, ts.total_votes
FROM tag_stats ts
ORDER BY ts.artist_count DESC
LIMIT 100
```

### Query: Artists with Specific Tag Set Intersected + Discovery Ranked
```sql
-- Source: derived from existing searchByTag query in queries.ts
SELECT
    a.id, a.mbid, a.name, a.slug, a.country,
    (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
    (
        SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id
    ) AS artist_tag_count
FROM artists a
JOIN artist_tags at0 ON at0.artist_id = a.id AND at0.tag = ?    -- tag 1
JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?    -- tag 2
GROUP BY a.id
ORDER BY artist_tag_count ASC  -- fewer tags = more niche = first
LIMIT 50
```

### Query: Style Map Nodes and Edges
```sql
-- Nodes: top 50 tags
SELECT ts.tag, ts.artist_count
FROM tag_stats ts
ORDER BY ts.artist_count DESC
LIMIT 50;

-- Edges: co-occurrence between top-50 tags
SELECT tc.tag_a, tc.tag_b, tc.shared_artists
FROM tag_cooccurrence tc
WHERE tc.tag_a IN (/* top-50 tags */) AND tc.tag_b IN (/* top-50 tags */)
ORDER BY tc.shared_artists DESC
```

### Query: Single Artist Uniqueness Score
```sql
-- Source: composite of artist lookup pattern + tag_stats
SELECT
    a.mbid,
    ROUND(
        COALESCE(
            (SELECT AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000.0
             FROM artist_tags at3
             JOIN tag_stats ts ON ts.tag = at3.tag
             WHERE at3.artist_id = a.id),
            0
        ),
        1
    ) AS uniqueness_score,
    (SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id) AS tag_count
FROM artists a
WHERE a.slug = ?
```

### Pipeline: Build tag_stats and tag_cooccurrence
```javascript
// pipeline/import.js additions (better-sqlite3, synchronous API)
// Source: verify.js co-occurrence query already verified working

// tag_stats
db.exec(`
    CREATE TABLE IF NOT EXISTS tag_stats (
        tag TEXT PRIMARY KEY,
        artist_count INTEGER NOT NULL,
        total_votes INTEGER NOT NULL
    );
    INSERT OR REPLACE INTO tag_stats (tag, artist_count, total_votes)
    SELECT tag, COUNT(*) as artist_count, SUM(count) as total_votes
    FROM artist_tags
    GROUP BY tag;
`);

// tag_cooccurrence (from verify.js — confirmed working)
db.exec(`
    CREATE TABLE IF NOT EXISTS tag_cooccurrence (
        tag_a TEXT NOT NULL,
        tag_b TEXT NOT NULL,
        shared_artists INTEGER NOT NULL,
        PRIMARY KEY (tag_a, tag_b)
    );
    INSERT OR REPLACE INTO tag_cooccurrence (tag_a, tag_b, shared_artists)
    SELECT t1.tag, t2.tag, COUNT(*) as shared_artists
    FROM artist_tags t1
    JOIN artist_tags t2 ON t1.artist_id = t2.artist_id AND t1.tag < t2.tag
    WHERE t1.count >= 2 AND t2.count >= 2
    GROUP BY t1.tag, t2.tag
    HAVING shared_artists >= 5
    ORDER BY shared_artists DESC
    LIMIT 10000;
    CREATE INDEX IF NOT EXISTS idx_cooccurrence_tag_a ON tag_cooccurrence(tag_a);
    CREATE INDEX IF NOT EXISTS idx_cooccurrence_tag_b ON tag_cooccurrence(tag_b);
`);
```

### Svelte 5: TagFilter Component URL Management
```typescript
// TagFilter.svelte — Source: SvelteKit docs + GitHub issue #13746 pattern
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';

function toggleTag(tag: string) {
    const currentUrl = get(page).url;
    const currentTags = currentUrl.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
    const MAX_TAGS = 5;

    let updated: string[];
    if (currentTags.includes(tag)) {
        updated = currentTags.filter(t => t !== tag);
    } else if (currentTags.length < MAX_TAGS) {
        updated = [...currentTags, tag];
    } else {
        return; // at max, don't add
    }

    const params = new URLSearchParams(currentUrl.searchParams);
    if (updated.length > 0) {
        params.set('tags', updated.join(','));
    } else {
        params.delete('tags');
    }

    goto(`?${params}`, { keepFocus: true, noScroll: true });
}
```

### Svelte 5: Static D3 Force Layout
```typescript
// StyleMap.svelte — Source: datavisualizationwithsvelte.com + D3 docs
import { onMount } from 'svelte';
import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    type SimulationNodeDatum
} from 'd3-force';

interface TagNode extends SimulationNodeDatum {
    id: string;
    artistCount: number;
}

interface TagEdge {
    source: string;
    target: string;
    strength: number; // normalized shared_artists
}

let { nodes: rawNodes, edges: rawEdges } = $props<{
    nodes: Array<{ tag: string; artistCount: number }>;
    edges: Array<{ tag_a: string; tag_b: string; shared_artists: number }>;
}>();

let layoutNodes = $state<(TagNode & { x: number; y: number })[]>([]);
let width = $state(800);
let height = $state(600);

onMount(() => {
    const simNodes: TagNode[] = rawNodes.map(n => ({ id: n.tag, artistCount: n.artistCount }));
    const maxShared = Math.max(...rawEdges.map(e => e.shared_artists), 1);
    const simLinks = rawEdges.map(e => ({
        source: e.tag_a,
        target: e.tag_b,
        strength: e.shared_artists / maxShared
    }));

    const simulation = forceSimulation(simNodes)
        .force('link', forceLink(simLinks)
            .id((d: any) => d.id)
            .strength((d: any) => d.strength * 0.3))
        .force('charge', forceManyBody().strength(-80))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide().radius((d: any) => Math.sqrt(d.artistCount) * 2 + 10));

    // Run to completion — static layout, no continuous rerenders
    simulation.tick(500);
    layoutNodes = simulation.nodes() as (TagNode & { x: number; y: number })[];
    simulation.stop();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ORDER BY RANDOM()` for random rows | Rowid-based random start in app code | Documented 2025 | 500x faster on 2M+ row tables |
| D3 selecting/manipulating DOM in Svelte | D3 computes, Svelte renders | Svelte 4-5 era | Eliminates ownership conflicts, cleaner code |
| `simulation.on('tick', updateState)` | `simulation.tick(N)` then extract once | Svelte 5 best practice | Eliminates 60fps rerender cycles |
| On-demand aggregation queries | Pre-computed statistics tables | Standard SQLite practice | 10-100x faster page loads |

**Current D3 version:** d3-force is part of D3 7.9.0 (confirmed from d3js.org docs). The `d3-force` subpackage can be installed independently.

## Open Questions

1. **Tag_cooccurrence query runtime at pipeline build time**
   - What we know: The verify.js co-occurrence query works and returns results for the top-15 pairs
   - What's unclear: How long the full co-occurrence computation takes with the 10K-edge limit. On a 672K-row table joining itself, this could take 5-60 seconds.
   - Recommendation: Add the build step to pipeline/import.js with a console progress indicator. If it's too slow, add a minimum threshold: `WHERE t1.count >= 5` instead of `>= 2`.

2. **Web discovery page behavior**
   - What we know: Discover (tag browsing) works on web. Crate Digging and Style Map are Tauri-only.
   - What's unclear: Whether the discovery ranking query with `tag_stats` JOIN will be fast enough on D1 for the web page.
   - Recommendation: Test with D1 after shipping. The `tag_stats` pre-computation means no expensive aggregation at query time — should be adequate.

3. **Uniqueness score display format**
   - What we know: The score is a composite of rarity factors — the raw value is a small decimal
   - What's unclear: What range of values the score produces in practice (depends on actual tag distribution)
   - Recommendation: Display as a percentile rank rather than raw score (e.g., "top 5% most niche"). Compute percentile client-side from the discovery results set, or pre-compute in a pipeline step.

4. **Style map — tags with no co-occurrence data**
   - What we know: Some tags may be present in `tag_stats` but absent from `tag_cooccurrence` if they never appear with other common tags
   - What's unclear: How many isolated nodes this creates in the graph, and whether it looks good or cluttered
   - Recommendation: Filter the style map to only show tags that appear in at least one co-occurrence edge. Isolated nodes add visual noise without information value.

## Sources

### Primary (HIGH confidence)
- `D:/Projects/Mercury/pipeline/verify.js` — Co-occurrence query already working, verified at pipeline run time
- `D:/Projects/Mercury/src/lib/db/queries.ts` — Existing query patterns, DbProvider interface
- `D:/Projects/Mercury/ARCHITECTURE.md` — DbProvider, FTS5, dual-runtime, universal load function patterns
- `https://sqlite.org/fts5.html` — FTS5 bm25(), rank, UNINDEXED columns
- `https://d3js.org/d3-force` — d3-force 7.9.0 API (forceSimulation, forces, tick)
- `https://developers.cloudflare.com/d1/platform/limits/` — D1 limits (100 bound params, 100KB SQL, 30s timeout)

### Secondary (MEDIUM confidence)
- `https://datavisualizationwithsvelte.com/basics/force-simulations` — Svelte 5 + D3 force integration pattern (simulation.tick(300) approach)
- `https://alexwlchan.net/2025/fast-sqlite-samples/` — Fast random SQLite sampling via rowid (2025, verified with benchmarks)
- `https://github.com/sveltejs/kit/issues/13746` — Reactive URL search params with Svelte 5 runes (official SvelteKit issue, community-verified pattern)
- `https://svelte.dev/docs/svelte/svelte-reactivity` — SvelteURLSearchParams reactive class

### Tertiary (LOW confidence)
- WebSearch results on music tag co-occurrence / niche scoring — general direction confirmed but no authoritative source for exact formula

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — d3-force is official D3 module; SQLite queries verified against existing codebase; D1 limits confirmed from official docs
- Architecture: HIGH — patterns follow established phase 2-5 patterns in this codebase exactly
- Pitfalls: MEDIUM — some pitfalls derived from first-principles analysis (e.g., dry patch fallback); others confirmed from documentation (D1 limits, NULL handling)
- Style map data size: MEDIUM — estimated from constraints; actual size depends on tag distribution

**Research date:** 2026-02-20
**Valid until:** 2026-05-20 (stable technologies — SQLite, D3, SvelteKit APIs don't change rapidly)
