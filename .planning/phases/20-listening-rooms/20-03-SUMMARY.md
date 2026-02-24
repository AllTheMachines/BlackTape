---
phase: 20-listening-rooms
plan: 03
subsystem: comms
tags: [nostr, svelte5, scene-page, test-manifest, discovery]

# Dependency graph
requires:
  - phase: 20-01
    provides: checkActiveRoom() from listening-room.svelte.ts
  - phase: 20-02
    provides: /room/[channelId] route (link target for room-join/start buttons)
provides:
  - Scene page room-indicator with join/start buttons
  - PHASE_20 test manifest with 18 entries (P20-01 through P20-18)
  - Completed Phase 20 test coverage for all code-checkable behaviors
affects:
  - 20-listening-rooms (fulfills ROOM-01 — user can discover rooms from scene page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "roomStatus initial value 'checking' hides indicator during async check — no layout shift"
    - "Best-effort Tauri-only onMount check: try/catch, fail to 'none' silently"
    - "skip method in test manifest for multi-instance Nostr interactions — cannot be headlessly automated"

key-files:
  created:
    - tools/test-suite/manifest.mjs (PHASE_20 block added)
  modified:
    - src/routes/scenes/[slug]/+page.svelte
    - BUILD-LOG.md

key-decisions:
  - "roomStatus starts as 'checking' (not 'none') so the entire indicator block is hidden during the async check — avoids a 'Start listening room' flash on every page load"

patterns-established:
  - "Scene page pattern: Tauri-gated async feature check in onMount with 'checking' initial state prevents layout shift"

requirements-completed: [ROOM-01]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 20 Plan 03: Scene Page Room Discovery Summary

**Scene page gains room-indicator with checkActiveRoom() call, join/start links to /room/[slug], and test manifest PHASE_20 covering all 18 Phase 20 behaviors**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T18:02:00Z
- **Completed:** 2026-02-24T18:05:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 updated — manifest)

## Accomplishments

- Scene page now calls `checkActiveRoom(scene.slug)` in onMount — Tauri only, best-effort
- Room indicator shows pulsing green dot + "Room active" + "Join" when a room is live
- Room indicator shows "Start listening room" link when no room is active
- Both buttons navigate to `/room/[slug]` — consistent entry point regardless of state
- `roomStatus` starts as `'checking'` — entire block hidden during check (no layout shift)
- PHASE_20 manifest constant with 18 entries (P20-01 through P20-18) added to manifest.mjs
- ALL_TESTS includes `...PHASE_20` — all 17 code checks pass immediately
- 131/131 code checks pass, npm run check 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add room discovery indicator to scene page** - `81d1eea` (feat)
2. **Task 2: Add Phase 20 test manifest entries** - `f86d201` (feat)

**Plan metadata:** (committed with docs below)

## Files Created/Modified

- `src/routes/scenes/[slug]/+page.svelte` — Added: checkActiveRoom/openRoom imports, goto import, roomStatus/roomHostPubkey state, onMount room check, handleStartRoom(), room-indicator template block with data-testids, CSS for room-indicator, room-active-dot pulse animation, join/start button styles
- `tools/test-suite/manifest.mjs` — Added: PHASE_20 constant (18 entries P20-01 through P20-18), ...PHASE_20 spread in ALL_TESTS before BUILD
- `BUILD-LOG.md` — Entry documenting Plan 03 scene page integration

## Decisions Made

- `roomStatus` initial value is `'checking'` (not `'none'`). The template renders the entire room-indicator block only when `roomStatus !== 'checking'`, so the indicator is completely hidden during the async checkActiveRoom() call. This avoids showing "Start listening room" on every page load for a fraction of a second before the check resolves.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Phase 20 Status

All three plans complete:
- Plan 01: Listening room data layer (listening-room.svelte.ts + /room route shell)
- Plan 02: Room UI (full room page with host/guest controls, queue, participants)
- Plan 03: Scene page integration (room-indicator discovery point + test manifest)

Phase 20 delivers the complete listening rooms feature: users can discover active rooms from scene pages, join as guests, or start new rooms as hosts. Full Nostr-based sync via kind:30311/20010/20011/20012 events.

---
*Phase: 20-listening-rooms*
*Completed: 2026-02-24*

## Self-Check: PASSED

- `src/routes/scenes/[slug]/+page.svelte` — FOUND
- `tools/test-suite/manifest.mjs` — FOUND (PHASE_20 added)
- `.planning/phases/20-listening-rooms/20-03-SUMMARY.md` — FOUND
- Commit 81d1eea — FOUND (git log confirms)
- Commit f86d201 — FOUND (git log confirms)
- npm run check: 0 errors — VERIFIED
- node tools/test-suite/run.mjs --code-only --phase 20: 17/17 pass — VERIFIED
