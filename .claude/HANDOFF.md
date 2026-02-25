# Work Handoff — 2026-02-25 (Night)

## Session Summary

Fixed two major bugs:
1. **IPC blob freeze** — library load was transferring all cover art blobs (up to 350MB) over IPC on every search and library load. Fixed with SQL-filtered search + separate album-level cover query.
2. **"Not responding" freeze** — all library Rust commands were `pub fn` (synchronous), running on the WebView2 COM thread (Windows message pump). Made them all `async`. Also moved `loadLibrary()` from `+page.ts` to `onMount` + added loading overlay.

Everything is committed. App is running in dev mode (`npm run tauri dev` backgrounded, process still alive).

## Current State

- **App:** Running in dev mode, no code changes pending
- **Git:** Clean except `BUILD-LOG.md` (auto-save only, no actual changes to commit)
- **All tests:** 164/164 passing, 43/43 Rust tests passing, 0 TS errors

## Open GitHub Issues

- **#3** — Dark background + low-contrast typography (visual accessibility) — untouched
- **#15** — MusicBrainz live update strategy (enhancement/planning) — untouched

## Closed Issues — What Was Actually Done

| # | What was done |
|---|---------------|
| #1 | Artist name in LibraryBrowser → clickable link to artist profile |
| #2 | Closed as obsolete (filter bar removed in v1.3 redesign) |
| #4 | Discover page switched to compact list (no broken image squares) |
| #5 | Back button added to ControlBar in Tauri mode |
| #6 | Time Machine slider capped at current year |
| #7 | Crate Dig country filter fixed (Svelte 5 select binding bug) |
| #8 | Library cover art — separate album-level cover query, no per-track blobs |
| #9 | Profile 500 error — `$state()` in `.ts` file, renamed to `.svelte.ts` |
| #10 | Volume persisted to localStorage |
| #11 | Search autocomplete keyboard navigation (arrow keys, Enter, Escape) |
| #12 | Spacebar toggles play/pause globally instead of restarting |
| #13 | Duplicate streaming links deduplicated by hostname |
| #14 | Play All / Queue All on artist page — **disabled with tooltip only, NOT implemented** |

## Notable: #14 is Not Really Fixed

Issue #14 (Play All / Queue All on artist page) was closed with just disabled buttons + "Library track matching coming soon" tooltip. The actual feature — cross-referencing MusicBrainz tracks against local library — is not built. Steve may want to reopen or track this separately.

## Key Architecture Decisions Made This Session

- Library load: tracks come without cover art; covers come separately via `get_album_covers()` (one per album-artist group)
- `libraryState.coverMap: Map<string, string>` keyed by `"artist|||album"`
- `groupByAlbum(tracks, coverMap?)` — optional second param
- All library Tauri commands are now `async` — they run on tokio, not the main thread
- `loadLibrary()` sets `isLoading = true/false`; library page shows overlay while loading
- Navigation to library no longer blocks on data (instant SvelteKit transition)

## Relevant Files

- `src-tauri/src/scanner/mod.rs` — all commands now `async`
- `src-tauri/src/library/db.rs` — `get_all_tracks()` strips cover art, `get_album_covers()` added
- `src/lib/library/store.svelte.ts` — `isLoading`, `coverMap`, `buildCoverMap()`, `groupByAlbum(tracks, coverMap?)`
- `src/lib/library/types.ts` — `AlbumCover` interface added
- `src/routes/library/+page.ts` — minimal, no `loadLibrary()` call
- `src/routes/library/+page.svelte` — loading overlay, `loadLibrary()` in `onMount`
- `src/routes/search/+page.ts` — uses `searchLocalTracks()` (SQL filter, no blobs)

## Next Steps (Steve's Call)

1. Verify the fixes feel smooth in the running app
2. Decide whether to tackle open issues (#3 contrast, #14 Play All) or move to next milestone work
3. `#14` specifically — if Steve wants Play All to actually work, it needs a local library track matcher (match MB recording → local file by title/artist)

## Resume Command

After `/clear`, run `/resume`.
