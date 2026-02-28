# Work Handoff - 2026-02-28

## Current Task
Working through open GitHub issues (bugs first, then enhancements).

## Completed This Session
- **#59** — About page feedback form → Cloudflare Worker (c70ffbd)
- **#58** — Hid "View backers" link on About page
- **Spotify scope fix** — Added `user-top-read` to OAuth scopes
- **#63 partial** — Added 10s AbortController timeout to MusicBrainz fetch (f96b75d)
- **#53 partial** — Genre type now lat/lng-based, origin_city shown, Genre Map shows inline graph (f96b75d)
- **#57** — Cannot reproduce (download works). Closed.

## Issues To Tackle Next (in order)

### #53 — Genre Map still broken (Steve feedback after fix)
Two new complaints from Steve after the inline GenreGraph was added:

1. **Clicking a genre node opens a city map** — `handleNodeClick` in `GenreGraph.svelte` calls `goto('/kb/genre/' + node.slug)`. If that genre has `origin_lat` (scene type), the genre page shows `SceneMap` (the Leaflet city map). Steve lands on a "city map" when he expected to see another genre page.
   - Fix options:
     a. On the genre detail page, pass `onNodeClick` to `GenreGraph` that does an in-place subgraph expansion (re-query the clicked genre's neighbors and update the graph) instead of navigating
     b. OR: scroll to top of the same page and load the new genre in-place without full navigation

2. **No pan/zoom on the genre graph** — The SVG is fixed-size with no interaction beyond hover/click. Steve can't explore. The full Style Map has drag, but the inline genre map doesn't.
   - Fix: add mouse drag panning + scroll wheel zoom to `GenreGraph.svelte` (same pattern as StyleMap.svelte which already has zoom)

3. **"Just a part of the whole genre map"** — the inline graph only shows immediate neighbors (subgraph). Steve expected to be able to explore outward.
   - Fix: when a node is clicked in the inline genre map, expand the graph to include THAT node's neighbors (in-place graph expansion) instead of navigating away

**Recommended approach for #53 Genre Map:**
- On the genre detail page, pass `onNodeClick` handler to `GenreGraph` that:
  1. Fetches the clicked genre's subgraph via `getGenreSubgraph(db, clickedSlug)`
  2. Merges the new nodes/edges into the existing graph state
  3. Re-runs the D3 simulation with the expanded data
  4. Updates the `focusSlug` to the clicked genre
  5. Does NOT navigate away
- Add pan (mousedown+drag on SVG background) + scroll zoom to `GenreGraph.svelte`
- Keep the "Explore in full Style Map →" link as the escape hatch to the full interactive map

### #63 — App freeze on album cover click (STILL REPRODUCIBLE)
- Steve confirmed freeze on Radiohead page, specifically multi-release cards like "5 Album Set"
- Timeout fix (10s) was added but not sufficient — freeze happens before timeout
- Theory 1: coverartarchive.org redirect for certain release groups hangs WebView2 (image load)
- Theory 2: MB query returns huge payload for box-set release groups (many releases/tracks/rels)
- Next steps:
  1. Find the MBID for Radiohead "5 Album Set" and test the MB API response size
  2. Check if `<img src="https://coverartarchive.org/release-group/MBID/front-500">` hangs in WebView2 for box sets (CAA returns 404 for some release groups → WebView2 may hang on redirect chain)
  3. Possible fix: move cover art to an `onMount` fetch with AbortController, show placeholder until resolved

### #54 — Library/Crate Dig missing covers + no release type grouping
- Artist cards show only text initials (S, RP, CC) — no cover art loaded
- Library has no Albums/EPs/Singles grouping
- Some releases show no title

### #50 — Discover page too slow
- Root cause: `getDiscoveryArtists` fast-path JOINs 2.6M artists × artist_tags × tag_stats, GROUP BY all artists, ORDER BY computed expression — no index can help
- Fix plan: pre-compute `uniqueness_score` in `build-tag-stats.mjs`, store in `artists` table, query becomes trivial `ORDER BY uniqueness_score DESC LIMIT 50`
- Needs: schema change + pipeline update + runtime `ALTER TABLE artists ADD COLUMN uniqueness_score REAL DEFAULT 0` migration

## Key Files
- `src/lib/components/GenreGraph.svelte` — add pan/zoom + onNodeClick expansion logic
- `src/routes/kb/genre/[slug]/+page.svelte` — pass onNodeClick to GenreGraph, handle in-place expansion
- `src/routes/kb/genre/[slug]/+page.ts` — may need to expose a way to re-query subgraph
- `src/lib/db/queries.ts` — `getGenreSubgraph` already exists, use it for expansion
- `src/lib/components/StyleMap.svelte` — reference for zoom/pan pattern (D3 zoom)
- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — release page with MB fetch + cover art

## Resume Command
After running `/clear`, run `/resume` to continue.
