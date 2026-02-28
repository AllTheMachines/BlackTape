# Work Handoff - 2026-02-28

## Current Task
Fix #53: genre type classification — genres with `origin_lat` incorrectly showing as "scene" with Leaflet city map.

## Context
Steve reported "Industrial Metal" opens a city map when navigating to its KB genre page. The SQL queries compute `type` as `CASE WHEN origin_lat IS NOT NULL THEN 'scene' ELSE 'genre' END` — but most genres have an origin city recorded in Wikidata, so they get `type='scene'` and the genre detail page renders the SceneMap (Leaflet) component. A scene (like "Seattle scene") is a location-based community; a genre (like "Industrial Metal") is a style that happens to have a city of origin.

## Progress

### Completed This Session
- **#53 Genre Map — pan/zoom** — `GenreGraph.svelte`: scroll-wheel zoom toward cursor, mousedown drag panning, grab cursor, Reset View button, hint text (cbb77dc)
- **#53 Genre Map — in-place expansion** — clicking a node in the inline graph on KB genre pages now merges that node's subgraph in-place instead of navigating away (cbb77dc)
- **#53 Genre Map — rotation bug** — Fixed infinite re-simulation loop caused by `$effect` tracking `layoutNodes` as a reactive dependency; fixed with `untrack()` (9bd7b7c)
- **#63 Release page freeze** — Moved MB fetch from `+page.ts` (blocks navigation) to `+page.svelte` onMount (non-blocking); navigation is now instant (cbb77dc)

### In Progress
- **#53 Genre type classification** — genres like "Industrial Metal" show a Leaflet city map because `origin_lat IS NOT NULL` incorrectly marks them as scenes.

### Remaining (in order)
1. **Fix #53 scene vs genre classification** — see Next Steps below
2. **#54** — Library/Crate Dig missing covers + no release type grouping
3. **#50** — Discover page too slow (pre-compute `uniqueness_score` in pipeline)
4. **#23** — Scene page local library not reflected

## Key Decisions
- Genre map nodes: clicking expands in-place (no navigation). `onNodeClick` prop passed from genre detail page calls `handleGraphNodeClick` which merges neighbor subgraph via `getGenreSubgraph`.
- `prevPositions` Map in GenreGraph preserves D3 node positions across re-simulations so existing nodes don't jump when new ones are added.
- `untrack(() => layoutNodes.length > 0)` in the `$effect` prevents the effect from re-running when `layoutNodes` is set by `runSimulation()` — breaking what was an infinite loop.
- Release page: `+page.ts` returns only `{ mbid, slug }`. All MB fetch logic moved to `loadRelease()` in `+page.svelte` onMount.

## The Bug to Fix Next

**Root cause:** In `src/lib/db/queries.ts`, four queries compute:
```sql
CASE WHEN origin_lat IS NOT NULL THEN 'scene' ELSE 'genre' END AS type
```
Lines: 764, 774, 806, 917, 957.

This was introduced to fix a pipeline bug where the pipeline set `type='scene'` for ANY genre with `origin_city`. But the coordinate-based override is also wrong — genres like Industrial Metal have `origin_lat` because their Wikidata entry records a city of origin, but they're not geographic scenes.

**The genres table has an actual `type` column.** The pipeline sets it. Check what values it contains:
```bash
# Find pipeline script that populates genres:
grep -rn "INSERT.*genres\|type.*scene\|genre.*type" /d/Projects/Mercury/tools/ --include="*.mjs" | grep -v node_modules
```

**Fix options (in order of preference):**

1. **Use the actual DB `type` column** — if the pipeline sets correct values (`'genre'`, `'scene'`, `'city'`), just do:
   ```sql
   COALESCE(type, 'genre') AS type
   ```
   Replace all four `CASE WHEN origin_lat...` expressions with this.

2. **Require explicit scene marker** — only treat as scene if `type = 'scene'` in the DB AND `origin_lat IS NOT NULL`:
   ```sql
   CASE WHEN type = 'scene' AND origin_lat IS NOT NULL THEN 'scene'
        WHEN type = 'city' THEN 'city'
        ELSE 'genre' END AS type
   ```

3. **Fix the isScene check in the page** — as a quick workaround, check the genre's name contains "scene" or a city name pattern. But this is fragile — don't prefer this.

**Also check:** Does the `genres` table `type` column actually have `'scene'` values for real scenes (like "Seattle scene", "Madchester")? If not, the pipeline may need a fix too.

## Relevant Files
- `src/lib/db/queries.ts` — lines 764, 774, 806, 917, 957 — all four `CASE WHEN origin_lat` expressions need fixing
- `src/routes/kb/genre/[slug]/+page.svelte` — `isScene` derived checks `data.genre.type === 'scene'` — this is correct once queries return right types
- `src/lib/components/GenreGraph.svelte` — fully updated (pan/zoom, in-place expansion, rotation fix)
- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — simplified to return only `{ mbid, slug }`
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — `loadRelease()` in onMount

## Git Status
Only `BUILD-LOG.md` has uncommitted changes (auto-save noise). No code changes pending.

## Next Steps
1. Read `src/lib/db/queries.ts` around line 764 to confirm column name is `type`
2. Search pipeline scripts for how `type` is set: `grep -rn "type.*scene\|'scene'" /d/Projects/Mercury/tools/ --include="*.mjs"`
3. If pipeline sets correct values → change all four queries to `COALESCE(type, 'genre') AS type`
4. If pipeline is wrong → fix pipeline AND queries
5. Reload: `node tools/reload.mjs`
6. Test: navigate to "Industrial Metal" KB page — should show NO city map, just genre info + related genres + inline graph
7. Test: navigate to a real scene (like a city-named scene) — SHOULD show city map
8. Run `npm run check` and commit

## Resume Command
After running `/clear`, run `/resume` to continue.
