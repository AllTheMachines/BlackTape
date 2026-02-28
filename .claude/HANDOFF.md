# Work Handoff - 2026-02-28

## Current Task
Working through open GitHub issues. Next up: **#50 — Discover page too slow** (pre-compute `uniqueness_score` in pipeline).

## Context
Steve's rule: fix open GitHub issues before starting new features. Working through the backlog in priority order.

## Progress

### Completed This Session
- **#53 Genre type classification** — genres like "Industrial Metal" no longer show city map. Queries use `COALESCE(type, 'genre')`, pipeline sets `type='genre'` for all Wikidata genres (133c8b7)
- **#54 Library covers** — Fixed 237 MB bulk load crash. Now uses:
  - `loadLibrary()` loads tracks+folders only (~500ms, was 9+ seconds)
  - New Rust cmd `get_cover_for_album(album, artist)` for single-album cover
  - `lazyLoadCover` Svelte action in LibraryBrowser uses IntersectionObserver
  - Covers appear ~1s after render as albums scroll into view (1110b29)
- **#54 Library release type grouping** — Albums/EPs/Singles groups (13a3844)
- **#63 Release page freeze** — MB fetch moved to onMount (cbb77dc)
- **#53 Genre map pan/zoom + in-place expansion + rotation bug** (cbb77dc, 9bd7b7c)

### Remaining (in order)
1. **#50** — Discover page slow load (pre-compute `uniqueness_score` in pipeline)
2. **#23** — Scene page local library not reflected
3. Then other open issues from the backlog

## Key Decisions
- Library covers: IntersectionObserver with rootMargin: '300px' — loads covers ~300px before scrolling into view
- No more `getAlbumCovers()` bulk call on startup — too large (237 MB for Steve's library)
- `lazyCovers` is `$state<Record<string, string>>({})` — property assignment is reactive in Svelte 5

## Relevant Files
- `src/lib/library/store.svelte.ts` — loadLibrary() now tracks/folders only; covers async comment
- `src/lib/components/LibraryBrowser.svelte` — lazyLoadCover action, lazyCovers state, getLoadedCover()
- `src/lib/library/scanner.ts` — getCoverForAlbum() TS wrapper
- `src-tauri/src/library/db.rs` — get_cover_for_album() Rust fn
- `src-tauri/src/scanner/mod.rs` — get_cover_for_album Tauri command
- `src-tauri/src/lib.rs` — registered

## Git Status
Clean. All changes committed. 191 tests passing, 0 failing.

## Next Steps for #50 (Discover slow load)
1. `gh issue view 50` — read the full issue
2. Check `getDiscoveryArtists` query in `src/lib/db/queries.ts` for N+1 or slow joins
3. Check if `uniqueness_score` is pre-computed in the DB or computed on-the-fly
4. If computed live: add it to the pipeline as a pre-computed column
5. Profile with timing test via CDP if needed

## Resume Command
After `/clear`, run `/resume` to continue.
