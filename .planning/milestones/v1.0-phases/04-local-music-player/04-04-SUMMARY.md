---
phase: 04-local-music-player
plan: 04
subsystem: discovery-bridge
tags: [matching, fts5, discovery, unified-search, player]
dependency_graph:
  requires: [04-01, 04-02, 04-03]
  provides: [artist-matching, now-playing-discovery, unified-search]
  affects: [Player.svelte, search-page]
tech_stack:
  added: []
  patterns: [best-effort-matching, dynamic-import-isolation, tag-based-related-artists]
key_files:
  created:
    - src/lib/library/matching.ts
    - src/lib/components/NowPlayingDiscovery.svelte
  modified:
    - src/lib/components/Player.svelte
    - src/routes/search/+page.ts
    - src/routes/search/+page.svelte
decisions:
  - Artist name normalization strips "The", splits feat./ft./featuring/&, removes trailing qualifiers
  - matchArtistToIndex uses exact case-insensitive match priority, then trusts FTS5 ranking
  - Related artists found via first (most prominent) tag lookup — simple but effective
  - Discovery panel positioned above player bar with slide-up animation
  - Local library search is client-side filter on all tracks (fine for personal library sizes)
  - Web build gets empty localTracks array — no library on web, no breakage
metrics:
  duration: 4min
  completed: 2026-02-17
---

# Phase 4 Plan 4: Unified Discovery Summary

Artist name normalization and FTS5 matching bridge local file metadata to Mercury's 2.8M-artist index. Now-playing discovery panel shows matched artist with tags, country, and related artists via tag co-occurrence. Unified search shows local library tracks above discovery results.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Artist matching and now-playing discovery panel | `8f3d0ea` | matching.ts, NowPlayingDiscovery.svelte, Player.svelte |
| 2 | Unified search — local tracks in search results | `b54abdf` | +page.ts, +page.svelte |

## Implementation Details

### Artist Matching (matching.ts)

- `normalizeArtistName()`: strips leading "The", splits on feat./ft./featuring/&, removes trailing parentheticals like (Remastered) or [Deluxe]
- `matchArtistToIndex()`: normalizes name, runs FTS5 search via existing `searchArtists`, picks exact match first or trusts FTS5 ranking. All wrapped in try/catch — matching never blocks playback.
- `getRelatedArtists()`: takes first tag from matched artist, searches by tag, filters self, returns top 5. Simple approach powered by the existing tag data.

### Now-Playing Discovery (NowPlayingDiscovery.svelte)

- Reactive `$effect` triggers lookup when `artistName` prop changes
- Shows matched artist name (linked to /artist/{slug}), country, tags (as TagChip components)
- Related artists section with links to their artist pages
- Loading state with pulsing dot animation
- Graceful "Not found in Mercury index" when no match (not an error)

### Player Expanded View (Player.svelte)

- Added expand/collapse chevron button in controls-right section
- Expanded panel renders above player bar (`bottom: var(--player-height)`)
- Slide-up animation on open (0.2s ease-out)
- Panel imports NowPlayingDiscovery with current track's artist name
- z-index 199 (below player bar at 200, so bar stays on top)

### Unified Search (+page.ts, +page.svelte)

- Load function: in Tauri context, fetches all library tracks and filters by query (case-insensitive substring on artist, title, album)
- Web context: returns empty `localTracks` array alongside existing data
- "Your Library" section appears above discovery results when local matches exist
- Click plays track (sets queue from visible results)
- "See all in Library" link when >10 matches
- Section divider between local and discovery results
- When both sources have results, discovery section gets a "Discovery" label
- When only local matches, no "no artists found" message shown

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run check`: 0 errors, 0 warnings
- `npm run build`: production build succeeds, web bundle unaffected
- All dynamic imports correctly isolate Tauri dependencies from web build
- Unused import `isTauri` noted but kept for future conditional rendering if needed

## Self-Check: PASSED

- [x] `src/lib/library/matching.ts` exists (FOUND)
- [x] `src/lib/components/NowPlayingDiscovery.svelte` exists (FOUND)
- [x] `src/lib/components/Player.svelte` modified (FOUND)
- [x] `src/routes/search/+page.ts` modified (FOUND)
- [x] `src/routes/search/+page.svelte` modified (FOUND)
- [x] Commit `8f3d0ea` exists (FOUND)
- [x] Commit `b54abdf` exists (FOUND)
