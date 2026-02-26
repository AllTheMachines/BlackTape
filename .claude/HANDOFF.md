# Work Handoff — 2026-02-26

## Current Task
Press screenshots — v2 fixes. Nearly done. One remaining item: KB genre graph.

## Progress

### Completed This Session
- ✅ Implemented Wikipedia thumbnail loading in `ArtistCard.svelte` (new `src/lib/wiki-thumbnail.ts`)
- ✅ Card grid images now load (time machine: 10, crate dig: 11, search: 42 images loaded)
- ✅ Fixed discover country filter bug — full country names required (e.g. "Finland" not "FI")
- ✅ Discover filter shots all returning 50 results: doom+Finland, black metal+Norway, post-punk+UK, krautrock+Germany
- ✅ Merged KB genre data into live AppData DB: 2906 genres, 2733 relationships
  - Script: `pipeline/merge-genre-data.cjs` (DROP old schema, CREATE new, copy from pipeline/data/mercury.db)
- ✅ Updated `tools/take-press-screenshots.mjs` with all fixes + keeper logic

### Keepers (DO NOT OVERWRITE)
- `discover-niche-filters-shoegaze-japan.png`
- `artist-niche-badge-obscure.png`
- `artist-stats-tab.png`

### Still Broken
- ❌ `knowledge-base-genre-graph.png` — KB page still shows "Genre data not yet available" despite 2906 genres being in the live DB. The Node.js query works fine (confirmed 50 nodes returned). Silent error in the Tauri IPC path somewhere. Rust init does NOT recreate the genres table. The `query_mercury_db` is a generic passthrough.

## KB Debug Next Steps
1. Check if the binary needs a recompile to pick up new DB state (try `cargo build` and rerun)
2. OR: inspect the `getStarterGenreGraph` query — it uses 40 spread params which might hit a Tauri IPC serialization limit
3. OR: Add console.error logging to KB `+page.ts` catch block temporarily, retake screenshot, check WebView2 devtools
4. If still broken after 15 min: skip KB shot entirely — the other 17 shots are all good

## Files Changed This Session
- `src/lib/wiki-thumbnail.ts` — NEW: cached Wikipedia thumbnail fetcher
- `src/lib/components/ArtistCard.svelte` — added $effect to load wiki thumbnail, img tag in art area
- `tools/take-press-screenshots.mjs` — full rewrite with: keeper skip logic, UI-based country filters, image wait helper, KB skip on empty
- `pipeline/merge-genre-data.cjs` — NEW: merges genres from pipeline/data/mercury.db into live AppData DB

## Current Screenshot State
All 18 files in `press-screenshots/v2/`. Most are now correct. Only `knowledge-base-genre-graph.png` may still be broken.

## After Screenshots Are Done
Execute Phase 28: `/gsd:execute-phase 28`

## Git Status
Uncommitted: ArtistCard.svelte, wiki-thumbnail.ts, take-press-screenshots.mjs, merge-genre-data.cjs, BUILD-LOG.md

## Resume Command
After `/clear`, run `/resume`
