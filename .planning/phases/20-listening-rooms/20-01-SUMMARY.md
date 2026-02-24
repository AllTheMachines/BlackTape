---
phase: 20-listening-rooms
plan: 01
subsystem: comms
tags: [nostr, ndk, svelte5, reactive-state, ephemeral-events, websocket, youtube-embed]

# Dependency graph
requires:
  - phase: 16-sustainability-links
    provides: nostr.svelte.ts NDK singleton, ndkState, MERCURY_RELAYS
  - phase: 09-user-identity
    provides: generateAvatarSvg() from avatar.ts for participant avatars
provides:
  - listening-room.svelte.ts — complete room state machine with all Nostr I/O
  - roomState reactive $state object (isInRoom, isHost, activeVideoUrl, queue, participants)
  - openRoom, joinRoom, leaveRoom, setActiveVideo, submitSuggestion, retractSuggestion, approveQueueItem, rejectQueueItem, checkActiveRoom exported functions
  - /room/[channelId] route shell ready for Plan 02 UI
  - kind:30311 room lifecycle pattern, kind:20010/20011/20012 ephemeral event patterns
affects:
  - 20-listening-rooms (plans 02 and 03 import from listening-room.svelte.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "kind:30311 addressable events for room lifecycle (not kind:10311 replaceable) — guaranteed #d tag filter on all compliant relays"
    - "Record<string, T> instead of Map<string, T> for Svelte 5 $state deep reactivity"
    - "NDKKind double-cast: [20010, 20011, 20012] as unknown as NDKKind[] for custom ephemeral kinds"
    - "Module-level timer refs (_heartbeatTimer, _cleanupTimer) with explicit clearInterval in cleanup"
    - "Best-effort async profile fetch: ndk.getUser().fetchProfile().then().catch() fire-and-forget"
    - "Optimistic local state updates before Nostr publish for responsive UI"
    - "FIFO queue ordering by event.created_at (not arrival order) — handles out-of-order relay delivery"
    - "Queue items use state field (pending/retracted/approved/rejected) — never delete, filter on render"

key-files:
  created:
    - src/lib/comms/listening-room.svelte.ts
    - src/routes/room/[channelId]/+page.svelte
  modified:
    - BUILD-LOG.md

key-decisions:
  - "kind:30311 (addressable) used instead of STATE.md's kind:10311 (replaceable) — #d tag filter reliability is spec-guaranteed for addressable events; replaceable event tag filter behavior varies by relay implementation"
  - "participants as Record<string, RoomParticipant> not Map — Svelte 5 $state tracks plain object mutations but not Map.set() mutations"
  - "Heartbeat TTL: 30s interval, 75s expiry window (2.5x) — tolerates exactly one missed heartbeat before dropping participant"

patterns-established:
  - "Room state machine pattern: all Nostr I/O in one .svelte.ts module, no Tauri invoke(), state garbage-collected on leaveRoom()"
  - "Ephemeral kind triple (20010 video/20011 queue/20012 presence) + addressable 30311 lifecycle = complete room protocol"

requirements-completed: [ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 20 Plan 01: Listening Room Data Layer Summary

**Nostr room state machine with kind:30311 lifecycle, kind:20010/20011/20012 ephemeral video sync + queue + presence, and /room/[channelId] route scaffold**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T17:55:22Z
- **Completed:** 2026-02-24T17:58:29Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 updated)

## Accomplishments

- `listening-room.svelte.ts` (644 lines) — complete room state machine with all 9 exported functions and roomState reactive object
- kind:30311 addressable event for room lifecycle — more relay-reliable than STATE.md's kind:10311 per RESEARCH.md Pitfall 3
- kind:20010 video sync, kind:20011 jukebox queue, kind:20012 presence heartbeat — all with NDKKind double-cast
- 30s heartbeat timer + 10s presence cleanup (75s TTL) — full presence lifecycle management
- `/room/[channelId]/+page.svelte` route shell with all imports established for Plan 02 UI build
- 92/92 code checks pass, npm run check 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create listening-room.svelte.ts** - `ca81a2b` (feat)
2. **Task 2: Scaffold /room/[channelId] route page** - `de1437f` (feat)

**Plan metadata:** (committed with docs below)

## Files Created/Modified

- `src/lib/comms/listening-room.svelte.ts` — Room state machine: roomState $state, openRoom/joinRoom/leaveRoom/setActiveVideo/submitSuggestion/retractSuggestion/approveQueueItem/rejectQueueItem/checkActiveRoom, internal subscription + heartbeat + cleanup timers
- `src/routes/room/[channelId]/+page.svelte` — Route shell with all listening-room imports, onMount checkActiveRoom call, onDestroy leaveRoom
- `BUILD-LOG.md` — Entry documenting kind:30311 decision and auto-fix

## Decisions Made

- Used `kind:30311` (addressable, 30000-39999) instead of `kind:10311` (replaceable) for room lifecycle events. Reason: `#d` tag filtering is spec-guaranteed for addressable events; `#t` tag filtering on replaceable events is implementation-dependent and unreliable on some relays. This diverges from STATE.md's `kind:10311` decision but matches the RESEARCH.md recommendation (Pitfall 3: "Safest: use kind:30311").
- Used `Record<string, RoomParticipant>` instead of `Map<string, RoomParticipant>` for participants. Reason: Svelte 5 `$state` tracks plain object mutations deeply, but `Map.set()` does not trigger reactivity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: `$page.params.channelId` typed as `string | undefined`**
- **Found during:** Task 2 (Scaffold /room/[channelId] route page)
- **Issue:** `checkActiveRoom(channelId)` expects `string` but `$page.params.channelId` is `string | undefined` in SvelteKit's type system
- **Fix:** Added `if (channelId)` guard before the `checkActiveRoom()` call in onMount
- **Files modified:** src/routes/room/[channelId]/+page.svelte
- **Verification:** `npm run check` went from 1 error to 0 errors
- **Committed in:** de1437f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None beyond the TypeScript type error documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (Room UI) can import directly from listening-room.svelte.js — all functions and roomState available
- Plan 03 (Scene page integration) can call checkActiveRoom() to show "Room active" indicator
- STATE.md blocker on kind:10311 relay propagation is resolved — using kind:30311 eliminates the relay tag filter concern

---
*Phase: 20-listening-rooms*
*Completed: 2026-02-24*

## Self-Check: PASSED

- `src/lib/comms/listening-room.svelte.ts` — FOUND
- `src/routes/room/[channelId]/+page.svelte` — FOUND
- Commit ca81a2b — FOUND (git log confirms)
- Commit de1437f — FOUND (git log confirms)
- npm run check: 0 errors — VERIFIED
