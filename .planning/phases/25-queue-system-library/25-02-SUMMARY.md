---
phase: 25-queue-system-library
plan: "02"
subsystem: player/queue/surfaces
tags: [queue, TrackRow, search, release, artist, play-album, play-all, Svelte5]
dependency_graph:
  requires:
    - src/lib/components/TrackRow.svelte (Phase 25-01)
    - src/lib/player/queue.svelte.ts (Phase 25-01)
  provides:
    - src/routes/search/+page.svelte (TrackRow-powered local track results)
    - src/routes/artist/[slug]/release/[mbid]/+page.svelte (Play Album / Queue Album stub buttons)
    - src/routes/artist/[slug]/+page.svelte (Top Tracks section with Play All / Queue All)
  affects:
    - All three track-facing surfaces now share the TrackRow interaction pattern
tech_stack:
  added: []
  patterns:
    - $derived array for contextTracks fed to TrackRow (search page allPlayerTracks)
    - tauriMode-gated UI blocks for queue actions that depend on local library
    - Stub handlers with clear deferred comments for unimplemented MB-to-local matching
    - topPlayerTracks $state array populated by future local matching phase
key_files:
  created: []
  modified:
    - src/routes/search/+page.svelte
    - src/routes/artist/[slug]/release/[mbid]/+page.svelte
    - src/routes/artist/[slug]/+page.svelte
decisions:
  - Search page allPlayerTracks built as $derived (not computed inline) for clean TrackRow contextTracks prop
  - Release page Play Album / Queue Album are intentional UI stubs — MB tracks lack local paths; matching deferred per CONTEXT.md
  - Artist page topPlayerTracks initialized as empty $state array — will be populated when local-to-MB matching lands
  - Top Tracks section placed above Discography in overview tab — establishes UI hierarchy now, wired later
  - handlePlayAll/handleQueueAll guard: Play All is a no-op when topPlayerTracks is empty (correct behavior)
metrics:
  duration: ~4 min
  completed: 2026-02-25
  tasks_completed: 2
  files_modified: 3
---

# Phase 25 Plan 02: TrackRow Surface Integration Summary

TrackRow wired into search results; Play Album / Queue Album stub buttons on release page; Top Tracks section with Play All / Queue All on artist page.

## What Was Built

### Task 1: Wire TrackRow into search results + Play Album buttons on release page

**Search page (`src/routes/search/+page.svelte`):**
- Removed: inline `<button class="local-track-row">` blocks, `playLocalTrack()` async function, `formatDuration()` helper (now provided by TrackRow internally)
- Added: `import TrackRow from '$lib/components/TrackRow.svelte'`
- Added: `allPlayerTracks = $derived(...)` — maps `data.localTracks.slice(0, MAX_LOCAL_RESULTS)` via `toPlayerTrack()` for TrackRow `contextTracks` prop
- Each local track now renders as `<TrackRow track={toPlayerTrack(track)} index={i} contextTracks={allPlayerTracks} showArtist={true} showDuration={true} data-testid="search-track-row" />`
- Removed per-row CSS classes that TrackRow handles internally (`.local-track-row`, `.local-track-info`, `.local-track-title`, `.local-track-meta`, `.local-track-duration`, `.local-meta-sep`)

**Release page (`src/routes/artist/[slug]/release/[mbid]/+page.svelte`):**
- Added `handlePlayAlbum()` and `handleQueueAlbum()` stub functions with clear comments explaining the deferred MusicBrainz-to-local-library matching constraint
- Added `{#if tauriMode}` block with `<div class="album-actions" data-testid="album-actions">` containing:
  - `<button data-testid="play-album-btn">Play Album</button>` — filled amber (`.btn-play-album`)
  - `<button data-testid="queue-album-btn">+ Queue Album</button>` — ghost/outline (`.btn-queue-album`)
- Block placed inside `hero-info` div, after `action-rows`, before the tracklist section
- Added CSS: `.album-actions`, `.btn-play-album` (amber filled, `var(--acc)`), `.btn-queue-album` (transparent with `var(--b-2)` border)

### Task 2: Wire TrackRow into artist top tracks + Play All / Queue All

**Artist page (`src/routes/artist/[slug]/+page.svelte`):**

The artist page overview has no existing top-tracks list (only release cards). Added a new stub Top Tracks section:

- Added imports: `setQueue`, `addToQueue` from `$lib/player/queue.svelte`; `type PlayerTrack` from `$lib/player/state.svelte`
- Added `let topPlayerTracks = $state<PlayerTrack[]>([])` — placeholder array for future local library matching
- Added `handlePlayAll()` — calls `setQueue(topPlayerTracks, 0)` when tracks available
- Added `handleQueueAll()` — loops `addToQueue(t)` for each track
- Added `{#if tauriMode}` block with `<div class="top-tracks-section" data-testid="top-tracks-section">`:
  - Header row: "Top Tracks" label + `<button data-testid="play-all-btn">Play All</button>` + `<button data-testid="queue-all-btn">+ Queue All</button>`
  - Stub paragraph explaining local track matching is deferred
- Section placed in `tab-content-overview`, above the discography section
- Added CSS: `.top-tracks-section`, `.top-tracks-header`, `.section-label`, `.top-tracks-actions`, `.btn-play-all` (amber filled), `.btn-queue-all` (ghost), `.top-tracks-stub`

## Verification

- `npm run check`: 0 errors, 593 files (8 pre-existing warnings, unrelated)
- Pre-commit hook test suite: 114 passed, 0 failed across both commits
- TEST-PLAN checks (P25-07 through P25-11): all pass

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- `src/routes/search/+page.svelte` — contains `TrackRow` import, `allPlayerTracks` derived, `data-testid="search-track-row"`
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — contains `data-testid="play-album-btn"`, `data-testid="queue-album-btn"`, stub handlers with deferred comments
- `src/routes/artist/[slug]/+page.svelte` — contains `data-testid="play-all-btn"`, `data-testid="queue-all-btn"`, `setQueue`, `addToQueue` imports

Commits exist:
- `d828239` — feat(25-02): wire TrackRow into search results + Play Album buttons on release page
- `f0dfa5e` — feat(25-02): add Top Tracks section with Play All / Queue All to artist page
