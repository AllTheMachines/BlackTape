---
phase: 29-streaming-foundation
plan: 01
subsystem: infra
tags: [svelte5, runes, state, persistence, streaming, sqlite, tauri]

# Dependency graph
requires:
  - phase: 28-polish
    provides: preferences.svelte.ts with ai_settings persistence pattern and streamingPref state
provides:
  - streamingState global reactive state (activeSource + serviceOrder)
  - StreamingSource type
  - setActiveSource / clearActiveSource mutation functions
  - loadServiceOrder / saveServiceOrder persistence functions
  - Service order loaded into streamingState on app boot
affects:
  - 29-02-settings-streaming-ui (reads streamingState.serviceOrder, calls saveServiceOrder)
  - 29-03-artist-badges (reads streamingState.activeSource)
  - 29-04-audio-coordination (calls setActiveSource / clearActiveSource)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level $state in .svelte.ts files for global reactive state (same as playerState)"
    - "ai_settings table (taste.db) as key-value store for user preferences via JSON serialization"
    - "Persistence functions follow load/save pairs with getInvoke() dynamic import pattern"
    - "Service order validated on load: array length === 4, all entries in KNOWN_SERVICES"

key-files:
  created:
    - src/lib/player/streaming.svelte.ts
  modified:
    - src/lib/theme/preferences.svelte.ts
    - src/routes/+layout.svelte

key-decisions:
  - "No new npm packages or Rust commands needed — entire plan uses existing ai_settings pattern"
  - "Service order defaults to bandcamp-first to align with discovery-first philosophy"
  - "Validation requires exactly 4 entries to prevent partial saves corrupting order"

patterns-established:
  - "streaming.svelte.ts: same module-level $state pattern as state.svelte.ts — no class, no store, just export const"
  - "loadServiceOrder falls back silently (catch returns DEFAULT_SERVICE_ORDER) — never throws to caller"

requirements-completed: [INFRA-01, INFRA-02, PLAYER-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 29 Plan 01: Streaming Foundation — State + Persistence Summary

**Global streamingState module with activeSource + serviceOrder, persistent via ai_settings, loaded on boot**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T00:22:45Z
- **Completed:** 2026-02-27T00:24:46Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `streaming.svelte.ts` — new global state module with `streamingState`, `StreamingSource` type, `setActiveSource`, and `clearActiveSource`, following exact module-level `$state` pattern of `state.svelte.ts`
- Added `loadServiceOrder` and `saveServiceOrder` to `preferences.svelte.ts` — reads/writes `streaming_service_order` key in ai_settings, validates 4-entry array, falls back to DEFAULT_ORDER
- Wired service order loading into `+layout.svelte` onMount Tauri block — after `loadStreamingPreference()`, loads order and writes to `streamingState.serviceOrder` so it survives app restarts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create streaming.svelte.ts state module** - `2d79ebd` (feat)
2. **Task 2: Add loadServiceOrder and saveServiceOrder to preferences.svelte.ts** - `019286d` (feat)
3. **Task 3: Wire service order loading into root layout boot** - `b0b0b38` (feat)

## Files Created/Modified

- `src/lib/player/streaming.svelte.ts` — New global streaming coordination state: StreamingSource type, streamingState object (activeSource + serviceOrder), setActiveSource, clearActiveSource
- `src/lib/theme/preferences.svelte.ts` — Appended loadServiceOrder and saveServiceOrder functions with streaming_service_order key and KNOWN_SERVICES validation
- `src/routes/+layout.svelte` — Added imports for streamingState and loadServiceOrder; wired service order load into isTauri() onMount block after loadStreamingPreference()

## Decisions Made

- No new npm packages or Rust commands required — the existing `get_all_ai_settings` / `set_ai_setting` Tauri invokes handle all persistence
- Default order is `['bandcamp', 'spotify', 'soundcloud', 'youtube']` — Bandcamp first to align with the discovery-first, artist-friendly philosophy
- Validation on load requires exactly 4 entries (prevents partial corrupted saves from being used); any invalid value falls back to DEFAULT_SERVICE_ORDER silently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `streamingState.serviceOrder` and `streamingState.activeSource` are live and boot-initialized — Plans 29-02, 29-03, and 29-04 can all proceed in parallel
- 29-02 (Settings drag-to-reorder UI) reads `streamingState.serviceOrder` and calls `saveServiceOrder`
- 29-03 (artist streaming badges) derives badge presence from `data.links` — no dependency on streamingState
- 29-04 (audio coordination) calls `setActiveSource` / `clearActiveSource` from EmbedPlayer

---
*Phase: 29-streaming-foundation*
*Completed: 2026-02-27*
