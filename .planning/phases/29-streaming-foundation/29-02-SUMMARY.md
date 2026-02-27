---
phase: 29-streaming-foundation
plan: "02"
subsystem: ui
tags: [svelte5, drag-and-drop, settings, streaming, persistence]

# Dependency graph
requires:
  - phase: 29-01
    provides: streamingState.serviceOrder reactive state + saveServiceOrder() persistence function
provides:
  - Settings page Streaming section with drag-to-reorder service priority list
  - reorderServices() — mutates streamingState.serviceOrder and persists via saveServiceOrder
affects:
  - 29-03
  - 29-04
  - 30-spotify-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drag-and-drop list with dragSrcIdx + isDragTarget state (same as Queue.svelte pattern)"
    - "fire-and-forget async persist: saveServiceOrder(order) called inline, not awaited"

key-files:
  created: []
  modified:
    - src/routes/settings/+page.svelte

key-decisions:
  - "Used var(--bg-3), var(--b-1), var(--r) CSS tokens to match existing settings sections — no new tokens introduced"
  - "Streaming section placed immediately after existing Streaming Preference section (before Identity) for logical grouping"
  - "SERVICE_LABELS map defined as const (not let $state) — static lookup, no reactivity needed"

patterns-established:
  - "Service order drag state: dragSrcIdx + isDragTarget as nullable number $state — same pattern as Queue.svelte"

requirements-completed: [INFRA-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 29 Plan 02: Streaming Foundation — Settings UI Summary

**Drag-to-reorder streaming service priority list added to Settings, writing to streamingState.serviceOrder and persisting via saveServiceOrder on every drop**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T00:27:29Z
- **Completed:** 2026-02-27T00:28:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added "Streaming" settings-section with `service-order-list` containing 4 draggable rows (Bandcamp, Spotify, SoundCloud, YouTube)
- Each row has `⠿` drag-grip icon and service name text; drag-over visual feedback via accent border
- `reorderServices()` splices a copy of `streamingState.serviceOrder`, assigns back, and calls `saveServiceOrder` fire-and-forget
- Added `saveServiceOrder` to the existing preferences import line; added `streamingState` import from `$lib/player/streaming.svelte`
- npm run check: 0 errors, 183/183 code tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Streaming section with drag-to-reorder to Settings page** - `07e96bf` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified
- `src/routes/settings/+page.svelte` - Added Streaming section with drag-to-reorder UI, drag state variables, SERVICE_LABELS constant, reorderServices function, and CSS for service-order-list/service-row/drag-grip/service-name

## Decisions Made
- Used existing design tokens (`var(--bg-3)`, `var(--b-1)`, `var(--r)`, `var(--acc)`) rather than the plan's suggested `var(--bg-elevated)` / `var(--card-radius)` — these don't exist in this codebase; matched to what the file actually uses.

## Deviations from Plan

None — plan executed exactly as written, with one minor CSS token substitution (see Decisions Made above) to match existing file conventions.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `streamingState.serviceOrder` is now user-configurable and persisted — Plans 29-03 and 29-04 can consume it
- 29-03 (artist streaming badges) and 29-04 (audio coordination + player bar badge) are both ready to execute

---
*Phase: 29-streaming-foundation*
*Completed: 2026-02-27*
