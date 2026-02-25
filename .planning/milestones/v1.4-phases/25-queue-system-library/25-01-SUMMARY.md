---
phase: 25-queue-system-library
plan: "01"
subsystem: player/queue
tags: [queue, localStorage, persistence, TrackRow, components, Svelte5]
dependency_graph:
  requires: []
  provides:
    - src/lib/player/queue.svelte.ts (restoreQueueFromStorage, playNextInQueue, isQueueActive, reorderQueue, localStorage persistence)
    - src/lib/components/TrackRow.svelte (reusable track row with hover Play/Queue)
  affects:
    - All track surfaces (search, artist, release, library) in subsequent plans
tech_stack:
  added: []
  patterns:
    - localStorage serialization for Svelte 5 $state (serialize tracks+currentIndex on every mutation)
    - CSS-only hover state swap (track-num opacity to play-icon opacity, no JS state)
    - isQueueActive() gate pattern for play-vs-insert-next routing
key_files:
  created:
    - src/lib/components/TrackRow.svelte
  modified:
    - src/lib/player/queue.svelte.ts
decisions:
  - saveQueueToStorage called in every mutation to ensure consistency regardless of which code path triggers the change
  - playNextInQueue inserts at currentIndex+1 then plays immediately — does not replace queue, preserves context
  - isQueueActive checks both tracks.length > 0 AND playerState.isPlaying — paused queue should NOT trigger insert-next behavior
  - TrackRow hover swap is pure CSS (opacity transitions) — no JS state needed, simpler and more performant
  - queue-btn uses opacity 0/1 (not display none/flex) to maintain layout space and enable smooth transition
metrics:
  duration: ~2 min
  completed: 2026-02-25
  tasks_completed: 2
  files_modified: 2
---

# Phase 25 Plan 01: Queue Foundations Summary

Queue localStorage persistence and reusable TrackRow component with CSS-only Spotify-style hover interaction.

## What Was Built

### Task 1: Queue persistence + insert-next behavior (`src/lib/player/queue.svelte.ts`)

Added localStorage persistence wired into every queue mutation and three new exported primitives:

**Persistence:**
- `saveQueueToStorage()` — internal, serializes `{tracks, currentIndex}` to `localStorage.setItem('mercury:queue', ...)`
- `loadQueueFromStorage()` — internal, parses stored JSON, restores `queueState.tracks` + `queueState.currentIndex` + `playerState.currentTrack`; does NOT auto-play (`isPlaying` stays `false`); wrapped in try/catch for corrupt data
- `restoreQueueFromStorage()` — exported; calls `loadQueueFromStorage()`; will be called from root layout on mount

**New primitives:**
- `playNextInQueue(track)` — inserts `track` at `currentIndex + 1`, sets `currentIndex` to that position, calls `playTrack(track)`; preserves rest of queue
- `isQueueActive(): boolean` — returns `queueState.tracks.length > 0 && playerState.isPlaying`; gating condition used by TrackRow's play handler
- `reorderQueue(from, to)` — splices track to new position with three-case `currentIndex` adjustment (same-track, track-before-current, track-after-current)

All existing mutations (setQueue, addToQueue, addToQueueNext, removeFromQueue, clearQueue, playNext, playPrevious) now call `saveQueueToStorage()` after their state changes.

### Task 2: TrackRow reusable component (`src/lib/components/TrackRow.svelte`)

New component implementing the Spotify-style track row interaction across all track surfaces.

**Layout:**
- Flex row, `min-height: 36px`, full width
- Left column (28px): track number in `--t-2`; play icon (filled SVG triangle, `--acc`) overlaid at same position
- Middle (flex: 1): track title (`--t-1`), optional artist/album subtitle (`--t-2`, `0.75em`)
- Optional duration (`--t-3`, tabular-nums, 0.75rem)
- Trailing `+ Queue` button (`opacity: 0` default)

**CSS-only hover swap:** `.track-row:hover .track-num { opacity: 0 }` + `.track-row:hover .play-icon { opacity: 1 }` — no JavaScript state involved.

**Behavior:**
- Row click: `handlePlay()` — calls `playNextInQueue(track)` if `isQueueActive()`, else `setQueue(contextTracks ?? [track], index)`
- Queue button click: `addToQueue(track)` with `e.stopPropagation()`
- Active track: title gets `color: var(--acc)` when `queueState.currentIndex` points to a track with matching `.path`

**Props:** `track`, `index`, `contextTracks?`, `showArtist?` (false), `showAlbum?` (false), `showDuration?` (true), `data-testid?`

**Test IDs:** outer `.track-row` div gets `data-testid={testId ?? 'track-row'}`; queue button gets `data-testid="queue-btn"`

## Verification

- `npm run check`: 0 errors, 593 files (8 pre-existing warnings, unrelated)
- Pre-commit hook test suite: 114 passed, 0 failed across both commits

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- `src/lib/player/queue.svelte.ts` — contains `restoreQueueFromStorage`, `localStorage`, `playNextInQueue`, `isQueueActive`, `reorderQueue`
- `src/lib/components/TrackRow.svelte` — exists, contains `queue-btn`, imports `addToQueue`

Commits exist:
- `0f3c484` — feat(25-01): queue persistence + new queue primitives
- `ab2d02a` — feat(25-01): TrackRow reusable component with hover Play/Queue
