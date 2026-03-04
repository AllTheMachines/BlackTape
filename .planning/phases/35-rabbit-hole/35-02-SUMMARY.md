---
phase: 35-rabbit-hole
plan: "02"
subsystem: ui
tags: [svelte5, sveltekit, routing, layout, rabbit-hole, trail, navigation]

# Dependency graph
requires:
  - phase: 35-rabbit-hole
    plan: "01"
    provides: trail.svelte.ts store (loadTrail, trailState, jumpToTrailIndex)
provides:
  - isRabbitHole bypass in root layout (Titlebar+Player only, no nav/PanelLayout/footer)
  - src/routes/rabbit-hole/+layout.svelte (immersive shell: exit button + history trail + children)
  - src/routes/rabbit-hole/+layout.ts (prerender=false, ssr=false)
  - LeftSidebar DISCOVERY_MODES reduced to Discover only
  - Desktop nav: Rabbit Hole after Discover; Style Map/KB/Time Machine/Dig removed
affects: [35-03, 35-04, 35-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "{:else if isRabbitHole} branch in root layout — mirrors isEmbed pattern but keeps Titlebar+Player"
    - "Rabbit Hole sub-layout provides immersive chrome (exit + trail) for all /rabbit-hole/* pages"

key-files:
  created:
    - src/routes/rabbit-hole/+layout.svelte
    - src/routes/rabbit-hole/+layout.ts
  modified:
    - src/routes/+layout.svelte
    - src/lib/components/LeftSidebar.svelte

key-decisions:
  - "isRabbitHole keeps Titlebar and Player — Tauri chrome stays; nav/PanelLayout/footer suppressed"
  - "LeftSidebar DISCOVERY_MODES single-item array — mode switcher still renders correctly with 1 item"
  - "Legacy d3 graph pages (Style Map, KB, Time Machine, Crate Dig) removed from nav but not deleted — URLs still reachable"

patterns-established:
  - "Route bypass pattern: add {:else if isX} before {:else} in root layout to suppress standard chrome for specific route trees"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 35 Plan 02: Rabbit Hole Route Wiring Summary

**Root layout isRabbitHole bypass + immersive sub-layout shell with exit button and history trail, replacing legacy d3 nav links**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T14:07:22Z
- **Completed:** 2026-03-04T14:09:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Root layout now bypasses PanelLayout/header/footer for all `/rabbit-hole/*` routes while keeping Titlebar and Player visible
- Immersive shell (`+layout.svelte`) provides consistent chrome for all Rabbit Hole pages: exit button, scrollable history trail, page content
- Desktop nav cleaned up: Rabbit Hole added after Discover; Style Map, KB, Time Machine, Dig removed
- LeftSidebar DISCOVERY_MODES reduced to Discover only — mode switcher still works with single-item array

## Task Commits

Each task was committed atomically:

1. **Task 1: Root layout — add isRabbitHole bypass + restructure nav** - `632cae15` (feat)
2. **Task 2: LeftSidebar cleanup + Rabbit Hole sub-layout** - `b97f8504` (feat)

**Plan metadata:** committed with final docs commit

## Files Created/Modified
- `src/routes/+layout.svelte` - Added isRabbitHole derived; added {:else if isRabbitHole} branch; restructured desktop nav
- `src/lib/components/LeftSidebar.svelte` - DISCOVERY_MODES reduced to Discover only
- `src/routes/rabbit-hole/+layout.svelte` - New: immersive shell with exit button + history trail bar + children
- `src/routes/rabbit-hole/+layout.ts` - New: prerender=false, ssr=false for Tauri SPA

## Decisions Made
- isRabbitHole keeps Titlebar and Player — the Tauri window chrome must stay for app control; only the discovery/content nav is suppressed. This differs from isEmbed which strips everything.
- LeftSidebar DISCOVERY_MODES single-item array — the mode switcher grid still renders with a single Discover icon. Code is correct; the mode-switch-grid degrades gracefully to 1 item without any conditional changes.
- Legacy d3 graph routes (Style Map, Knowledge Base, Time Machine, Crate Dig) removed from nav but not deleted — still reachable by direct URL, intentionally preserved as fallback for v2.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Route wiring complete — all `/rabbit-hole/*` pages now get the immersive shell automatically
- Plans 35-03 through 35-05 can create pages under `/rabbit-hole/` and inherit this layout
- Trail store wired in sub-layout onMount — trail loads from localStorage on first visit

---
*Phase: 35-rabbit-hole*
*Completed: 2026-03-04*
