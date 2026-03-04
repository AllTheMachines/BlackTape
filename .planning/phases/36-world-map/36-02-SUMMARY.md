---
phase: 36-world-map
plan: "02"
subsystem: ui
tags: [svelte, sveltekit, layout, routing, navigation]

# Dependency graph
requires:
  - phase: 35-rabbit-hole
    provides: isRabbitHole layout bypass pattern that isWorldMap mirrors exactly
provides:
  - isWorldMap derived variable in root layout
  - World Map layout branch (full-viewport, no cockpit shell)
  - World Map nav item in Tauri nav
affects:
  - 36-world-map (subsequent plans in this phase use this bypass)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isWorldMap bypass: same Titlebar + children + Player pattern as isRabbitHole — suppresses nav, ControlBar, PanelLayout, footer for /world-map/* routes"

key-files:
  created: []
  modified:
    - src/routes/+layout.svelte

key-decisions:
  - "isWorldMap mirrors isRabbitHole exactly — same Titlebar + children + Player structure, no cockpit shell"
  - "World Map nav link is Tauri-only — added to {#if tauriMode} nav block only, no web counterpart (feature requires SQLite)"
  - "Active state uses $page.url.pathname.startsWith('/world-map') — consistent with Rabbit Hole pattern"

patterns-established:
  - "isWorldMap pattern: $derived($page.url.pathname.startsWith('/world-map')) — use for all /world-map/* route detection"

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 36 Plan 02: World Map Layout Bypass Summary

**isWorldMap bypass added to root layout — World Map gets full-viewport treatment identical to Rabbit Hole (Titlebar + children + Player, no cockpit shell)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T15:23:35Z
- **Completed:** 2026-03-04T15:24:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `isWorldMap` derived variable using `$page.url.pathname.startsWith('/world-map')` pattern
- Added `{:else if isWorldMap}` template branch: Titlebar + UpdateBanner + CriticalUpdateModal (Tauri-gated) + children + Player — identical structure to isRabbitHole
- Added "World Map" nav link after Rabbit Hole in Tauri nav with active state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isWorldMap bypass and nav item to root layout** - `81b80fbc` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `src/routes/+layout.svelte` - Added isWorldMap variable, template branch, and nav item (16 insertions)

## Decisions Made
- isWorldMap mirrors isRabbitHole exactly — same Titlebar + children + Player structure, no cockpit shell. No reason to deviate from the established pattern.
- World Map nav link is Tauri-only (inside `{#if tauriMode}` block). The world map feature requires SQLite/tauri-plugin-sql and has no web counterpart.
- Active state detection uses `$page.url.pathname.startsWith('/world-map')` — consistent with how Rabbit Hole handles multi-segment routes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Layout bypass is complete — any /world-map/* route now renders full-viewport (Titlebar + page content + Player only)
- Plan 03 can build the world map page itself, relying on this bypass being in place
- No blockers or concerns

## Self-Check: PASSED

- `src/routes/+layout.svelte` — FOUND
- `.planning/phases/36-world-map/36-02-SUMMARY.md` — FOUND
- Commit `81b80fbc` — FOUND

---
*Phase: 36-world-map*
*Completed: 2026-03-04*
