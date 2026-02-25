# Work Handoff - 2026-02-25 (Evening)

## Current Task
Fix app freeze/crash caused by loading all cover art blobs over IPC on every search and library load.

## Context
The app freezes and crashes because `get_library_tracks` returns ALL 2345 tracks including their embedded cover art base64 blobs (50-150KB each = up to 350MB). This was being called on every search query (client-side filter) and on every library load. Two separate but related fixes are needed.

## Progress

### Completed
- **Search fix** (critical — was causing crash on "Radiohead" search):
  - `db.rs` — added `search_tracks()`: SQL LIKE filter on title/artist/album, returns `LocalTrack` with `cover_art_base64: None`
  - `db.rs` — added `AlbumCover` struct + `get_album_covers()`: one cover per (album, album_artist) group
  - `scanner/mod.rs` — added `search_local_tracks` and `get_album_covers` Tauri commands
  - `lib.rs` — registered both new commands
  - `scanner.ts` — added `searchLocalTracks()` and `getAlbumCovers()` TS wrappers
  - `+page.ts` — replaced `getLibraryTracks()` + client filter with `searchLocalTracks(q)` (one SQL call, no blobs)

### In Progress
- Rust has NOT been compiled/tested yet — changes are written but `cargo test` not run
- Library loading fix is NOT done yet (see Remaining)

### Remaining
1. **Verify Rust compiles**: run `cargo test` in `src-tauri/`
2. **Library loading fix** (prevents scroll freeze/crash):
   - Modify `get_all_tracks()` in `db.rs` to NOT return `cover_art_base64` (set to `None`)
   - Update `store.svelte.ts` `loadLibrary()` to also call `getAlbumCovers()` in parallel
   - Update `groupByAlbum()` to accept a cover map `Map<string, string>` as second param (keyed by `"album|||albumArtist"`)
   - Update `library/types.ts` to export `AlbumCover` interface
   - Update all `loadLibrary()` call sites in `scanFolder()` to also reload covers
3. **Close resolved GitHub issues**: #4 (Discover gray boxes — fixed) and #8 (Library cover art — fixed)
4. **Commit** all changes
5. **Restart app** and test search + library scroll

## Key Decisions
- Search fix uses SQL filtering in Rust — no more "load everything and filter in JS"
- Library cover fix uses separate `get_album_covers` query (one cover per album, not per track) — much smaller payload
- `LocalTrack.cover_art_base64` stays `null` in track list queries; covers come from album-level query only
- The `groupByAlbum` function will be updated to accept an optional `coverMap` parameter

## Relevant Files
- `src-tauri/src/library/db.rs` — added `AlbumCover`, `search_tracks()`, `get_album_covers()` — MODIFIED, needs `get_all_tracks` also updated to strip cover art
- `src-tauri/src/scanner/mod.rs` — added two new Tauri commands — MODIFIED
- `src-tauri/src/lib.rs` — registered new commands — MODIFIED
- `src/lib/library/scanner.ts` — added two TS wrappers — MODIFIED
- `src/routes/search/+page.ts` — now uses `searchLocalTracks()` — MODIFIED, DONE
- `src/lib/library/store.svelte.ts` — needs `loadLibrary()` updated to call `getAlbumCovers()`, `groupByAlbum()` needs cover map param — NOT YET MODIFIED
- `src/lib/library/types.ts` — may need `AlbumCover` interface added — NOT YET MODIFIED

## Git Status
6 files modified, not staged:
- BUILD-LOG.md (+3)
- src-tauri/src/lib.rs (+2)
- src-tauri/src/library/db.rs (+74)
- src-tauri/src/scanner/mod.rs (+20)
- src/lib/library/scanner.ts (+15)
- src/routes/search/+page.ts (net -9, simplified)

## Next Steps
1. `cd src-tauri && cargo test` — verify Rust compiles with new commands
2. Modify `get_all_tracks()` in `db.rs` to strip `cover_art_base64` (set to `None`, don't select it)
3. Update `store.svelte.ts`: `loadLibrary()` calls `getAlbumCovers()` alongside tracks, passes cover map into `groupByAlbum()`
4. Update `groupByAlbum()` signature: `groupByAlbum(tracks, coverMap?)` — look up cover from map by `"album|||albumArtist"` key
5. `npm run check` — verify TS/Svelte
6. Close GitHub issues #4 and #8 via `gh issue close`
7. Update BUILD-LOG.md
8. Commit everything
9. Restart app and test

## Resume Command
After `/clear`, run `/resume` to continue.
