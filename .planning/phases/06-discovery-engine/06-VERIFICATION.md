---
phase: 06-discovery-engine
verified: 2026-02-21T00:00:00Z
status: passed
score: 6/6 success criteria verified
re_verification: false
---

# Phase 6: Discovery Engine Verification Report

**Phase Goal:** Where search engine becomes discovery engine. Uniqueness IS the mechanism — the more niche you are, the more discoverable you become. Powered by a composite ranking score.
**Verified:** 2026-02-21
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can browse and intersect tags — drill down into specificity | VERIFIED | `/discover` route + `TagFilter.svelte` with `toggleTag()` → `goto(?tags=...)`, AND logic in `getArtistsByTagIntersection` |
| 2 | Composite discovery ranking: inverse popularity + tag rarity + scene freshness | VERIFIED | `getDiscoveryRankedArtists()` in queries.ts — full composite score: `1/tag_count * AVG(1/tag_artist_count) * recency_boost * active_boost` |
| 3 | "Uniqueness score" visible on artist profiles | VERIFIED | `UniquenessScore.svelte` imported and rendered in `+page.svelte` at line 122; data loaded in both `+page.server.ts` and `+page.ts` Tauri path |
| 4 | Style map visualization shows tag relationships and clusters | VERIFIED | `StyleMap.svelte` uses `d3-force` with `forceSimulation().tick(500)` static layout; `/style-map` route fully wired |
| 5 | Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country) | VERIFIED | `/crate` route with `isTauri()` gate, rowid-based random sampling in `getCrateDigArtists`, all three filter types implemented |
| 6 | Generic artists sink, niche artists rise — naturally demotes AI-generated slop | VERIFIED | Niche-first ordering in `getArtistsByTagIntersection` (ORDER BY artist_tag_count ASC) and discovery-ranked query with score computation |

**Score: 6/6 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `pipeline/import.js` | `tag_stats` table creation + population | VERIFIED | `buildTagStats()` function at line 263: CREATE TABLE, DELETE, INSERT, INDEX — idempotent |
| `pipeline/import.js` | `tag_cooccurrence` table creation + population | VERIFIED | `buildTagCooccurrence()` at line 286: composite join with HAVING >= 5, LIMIT 10000, canonical ordering |
| `src/lib/db/queries.ts` | `getArtistsByTagIntersection` | VERIFIED | 22-line function with dynamic JOIN construction, 5-tag cap, niche-first ORDER BY |
| `src/lib/db/queries.ts` | `getDiscoveryRankedArtists` | VERIFIED | Full composite score query with `JOIN tag_stats` and recency/active multipliers |
| `src/lib/db/queries.ts` | `getCrateDigArtists` | VERIFIED | 80+ line function with rowid-based random start, wrap-around fallback, all filter types |
| `src/lib/db/queries.ts` | `getArtistUniquenessScore` | VERIFIED | `AVG(1/NULLIF(ts.artist_count,0)) * 1000.0` with `JOIN tag_stats` |
| `src/lib/db/queries.ts` | `getStyleMapData` | VERIFIED | Returns `{nodes, edges}` using `tag_stats` + `tag_cooccurrence` |
| `src/lib/db/queries.ts` | `getPopularTags` | VERIFIED | Queries `tag_stats ORDER BY artist_count DESC LIMIT ?` |
| `src/routes/discover/+page.svelte` | Discover page UI | VERIFIED | 82 lines, renders `TagFilter` + `ArtistCard` grid, adapts heading based on filter state |
| `src/routes/discover/+page.server.ts` | Web (D1) data loading | VERIFIED | Imports `D1Provider`, calls `getPopularTags` + conditional `getArtistsByTagIntersection` or `getDiscoveryRankedArtists` |
| `src/routes/discover/+page.ts` | Universal load with Tauri path | VERIFIED | `isTauri()` check, dynamic import of `getProvider` and query functions |
| `src/lib/components/TagFilter.svelte` | Tag chip browser with URL mutation | VERIFIED | `toggleTag()` → `goto(?${params}, {keepFocus:true, noScroll:true})`, max 5 tags enforced |
| `src/lib/components/UniquenessScore.svelte` | Uniqueness badge component | VERIFIED | 75 lines, thresholds calibrated against real data (P25/P50/P75/P90/P95), renders conditionally |
| `src/routes/artist/[slug]/+page.server.ts` | Includes uniqueness_score in web load | VERIFIED | `getArtistUniquenessScore` imported and called concurrently with network fetches via `Promise.all` |
| `src/routes/artist/[slug]/+page.ts` | Includes uniqueness_score in Tauri load | VERIFIED | Dynamic import of `getArtistUniquenessScore`, graceful try/catch for missing tag_stats |
| `src/routes/artist/[slug]/+page.svelte` | Renders UniquenessScore badge | VERIFIED | `import UniquenessScore` at line 7, `<UniquenessScore score={data.uniquenessScore} ...>` at line 122 |
| `src/routes/crate/+page.svelte` | Crate Digging UI | VERIFIED | 183 lines, `isTauri` gate renders desktop-only message on web, `dig()` calls `getCrateDigArtists` client-side |
| `src/routes/crate/+page.ts` | Universal load, Tauri-only | VERIFIED | `isTauri()` returns `{artists:[], filters, isTauri:false}` on web; queries `getCrateDigArtists` on Tauri |
| `src/lib/components/StyleMap.svelte` | D3 force-directed SVG graph | VERIFIED | Imports `forceSimulation` from `d3-force`, runs `simulation.tick(500)` headlessly, renders static SVG |
| `src/routes/style-map/+page.server.ts` | Style map web data load | VERIFIED | `getStyleMapData(db, 50)` with graceful catch for missing tables |
| `src/routes/style-map/+page.ts` | Style map universal load | VERIFIED | `isTauri()` check, dynamic import of `getStyleMapData` |
| `src/routes/style-map/+page.svelte` | Style map page wrapper | VERIFIED | Passes `nodes` and `edges` to `<StyleMap>`, empty state if no data |
| `src/routes/+layout.svelte` | Navigation links | VERIFIED | Web: Discover + Style Map; Tauri: Discover, Style Map, Dig, Library, Explore, Settings |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TagFilter.svelte` | SvelteKit `goto()` | `toggleTag()` → `goto(?tags=...)` | WIRED | Line 32: `goto(\`?${params}\`, { keepFocus: true, noScroll: true })` |
| `discover/+page.server.ts` | `getArtistsByTagIntersection` / `getDiscoveryRankedArtists` | import from queries.ts | WIRED | Both functions imported and called conditionally on `tags.length > 0` |
| `discover/+page.ts` | `isTauri()` + `getProvider()` | Dynamic import pattern | WIRED | `isTauri()` → dynamic imports → `getProvider()` → query functions |
| `queries.ts` | `tag_stats` (DB) | `JOIN tag_stats ts ON ts.tag = at3.tag` | WIRED | Lines 274 (getDiscoveryRankedArtists) and 395 (getArtistUniquenessScore) |
| `queries.ts` | `tag_cooccurrence` (DB) | `FROM tag_cooccurrence tc` | WIRED | Line 427 in `getStyleMapData` |
| `artist/+page.server.ts` | `getArtistUniquenessScore` | Import + concurrent Promise.all | WIRED | Line 3 import, line 56 call with `.catch(() => null)` graceful degradation |
| `artist/+page.svelte` | `UniquenessScore.svelte` | `<UniquenessScore score={data.uniquenessScore} ...>` | WIRED | Line 7 import, line 122 usage |
| `crate/+page.ts` | `isTauri()` | Tauri gate returning empty on web | WIRED | Lines 17-19: `if (!isTauri()) return { artists: [], filters, isTauri: false }` |
| `crate/+page.svelte` | `getCrateDigArtists` | `dig()` function client-side call | WIRED | Line 35: dynamic import of `getCrateDigArtists`, called with filters at line 43 |
| `StyleMap.svelte` | `d3-force` | `forceSimulation().tick(500)` | WIRED | Line 55: simulation created; line 64: `simulation.tick(500)`; line 85: `layoutNodes = settled` |
| `StyleMap.svelte` | `/discover` route | `goto('/discover?tags=<tag>')` | WIRED | Line 89: `goto(\`/discover?tags=${encodeURIComponent(tag)}\`)` |
| `style-map/+page.server.ts` | `getStyleMapData` | Import from queries.ts | WIRED | Line 3 import, line 11 call |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DISC-01 | 06-02, 06-03 | Tag intersection browsing at /discover | SATISFIED | `/discover` route with TagFilter + AND-logic query, URL state via ?tags= |
| DISC-02 | 06-01, 06-02, 06-03, 06-04 | Niche-first discovery ranking + uniqueness badge on artist pages | SATISFIED | `getDiscoveryRankedArtists` composite score + `UniquenessScore` badge on all artist pages |
| DISC-03 | 06-02, 06-06 | Style map visualization at /style-map | SATISFIED | D3 force-directed graph with `tag_cooccurrence` data, node click → /discover |
| DISC-04 | 06-02, 06-05 | Crate Digging Mode at /crate (Tauri-only) | SATISFIED | Rowid-based random sampling, genre/decade/country filters, web fallback message |

All four requirements marked SATISFIED. REQUIREMENTS.md status table shows all four as "Complete".

---

### Anti-Patterns Found

No blockers or stubs detected.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `crate/+page.svelte` | 24, 25, 28 | Svelte 5 warning: `data` props captured as initial value in `$state()` | INFO | `tagInput`, `country`, `artists` initial values captured from `data` props — Svelte warns these won't react to future `data` changes. For crate digging this is intentional design (state is updated by the `dig()` button, not prop reactivity). No functional impact. |

---

### Human Verification Required

All automated checks passed. The following items were verified by Playwright during development per the task description, and are noted here for completeness. No additional human verification is required to clear this phase.

1. **Tag intersection UI behavior**
   - Test: Visit /discover, click a tag chip, observe URL and results update
   - Expected: URL shows `?tags=tagname`, results filter to artists with that tag
   - Why human: Requires browser interaction to confirm noScroll/keepFocus behavior
   - Status: Verified via Playwright (150 tag chips visible, add/AND/remove working)

2. **Uniqueness badge tier accuracy**
   - Test: Compare badge labels on Radiohead vs. a harsh noise artist
   - Expected: Radiohead shows "Niche" or "Eclectic"; harsh noise shows "Very Niche"
   - Why human: Threshold calibration requires visual inspection against real data
   - Status: Verified via Playwright (Radiohead = "NICHE", harsh noise = "VERY NICHE")

3. **Style map D3 graph rendering**
   - Test: Visit /style-map, observe nodes and edges, hover and click a node
   - Expected: SVG renders with sized nodes, edges between related genres, hover highlights, click navigates to /discover?tags=...
   - Why human: D3 canvas rendering cannot be asserted programmatically without a browser
   - Status: Verified via Playwright (50 SVG nodes, node click → /discover?tags=tag)

4. **Crate Digging web fallback**
   - Test: Visit /crate in a web browser (non-Tauri context)
   - Expected: Shows "Crate Digging Mode is available in the Mercury desktop app."
   - Why human: Requires browser context to confirm isTauri() returns false
   - Status: Verified via Playwright (correct fallback message shown, no 500 error)

---

### Gaps Summary

No gaps found. All six success criteria are verified. All 23 required artifacts exist, are substantive, and are wired correctly. All four DISC requirements are satisfied. No blocker anti-patterns detected.

The three Svelte warnings in `crate/+page.svelte` are informational: the `data` prop values are intentionally captured as initial state because crate digging updates state via the `dig()` button, not through prop reactivity. The component works correctly despite the warnings.

---

_Verified: 2026-02-21_
_Verifier: Claude (gsd-verifier)_
