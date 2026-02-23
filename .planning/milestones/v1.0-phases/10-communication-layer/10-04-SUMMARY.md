---
phase: 10-communication-layer
plan: 04
subsystem: ui
tags: [nostr, ndk, svelte5, ephemeral, listening-party, nip-01, nip-40]

# Dependency graph
requires:
  - phase: 10-communication-layer
    plan: 01
    provides: ndkState singleton + initNostr() NDK connection with 4-relay pool

provides:
  - sessionsState: Svelte $state reactive object for active/joined/public session tracking
  - createSession(): create public (Nostr-announced) or private (invite-code) listening party
  - joinSession(): join session by ID, announce presence via kind:20002
  - sendPartyMessage(): ephemeral kind:20001 message with NIP-40 expiration tag
  - endSession(): complete state wipe — mySession + joinedSession set to null
  - loadPublicSessions(): discover active public parties from kind:20002 relay events
  - activePublicSessions: $derived sorted list of public sessions

affects: [10-05, comms-overlay-ui, artist-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ephemeral Nostr events (kind:20001/20002) for zero-persistence real-time state"
    - "NIP-40 expiration tags on all published events (1hr TTL belt-and-suspenders)"
    - "NDKKind double cast (as unknown as NDKKind[]) for ephemeral kinds not in NDK enum"
    - "Optimistic local state update after publish — same pattern as rooms.svelte.ts"
    - "Module-level Map for subscription cleanup handles (_sessionSubs)"

key-files:
  created:
    - src/lib/comms/sessions.svelte.ts
  modified:
    - src/lib/comms/index.ts

key-decisions:
  - "NDKKind enum doesn't include ephemeral kinds 20001/20002 — double cast (as unknown as NDKKind[]) required when numeric literal types don't overlap with enum members"
  - "activePublicSessions uses .slice().sort() to avoid mutating $state array in-place — defensive copy before sort"
  - "Ephemeral kind:20001 for session messages, kind:20002 for announcements/presence — avoids collision with NIP-28 channel kinds (40/42)"
  - "Session ID format: first 8 chars of host pubkey + timestamp — unique, human-readable prefix for debugging"
  - "endSession() preserves publicSessions list — it's the discovery index, not session-specific data"

patterns-established:
  - "Ephemeral session pattern: $state only, no Tauri invoke, no taste.db persistence"
  - "NIP-40 expiration tag on every ephemeral publish as belt-and-suspenders relay hint"

requirements-completed: [COMM-06]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 10 Plan 04: Ephemeral Listening Party Sessions Summary

**Nostr ephemeral session system (kind:20001/20002) for real-time listening parties with zero persistence — state lives only in Svelte $state, endSession() wipes everything**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T00:57:16Z
- **Completed:** 2026-02-23T01:00:12Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- sessions.svelte.ts: full ephemeral session lifecycle (create / join / message / end / discover)
- Zero Tauri invoke() calls — architectural constraint enforced at module design level
- NIP-40 expiration tags (1hr TTL) on every published Nostr event for relay cleanup hints
- endSession() performs complete state wipe — messages, participants, and context gone on call
- loadPublicSessions() + activePublicSessions for session discovery feed

## Task Commits

Each task was committed atomically:

1. **Task 1: Ephemeral sessions module (zero persistence, NIP-01 kind 20000+)** - `e5e5fbb` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

- `src/lib/comms/sessions.svelte.ts` — Ephemeral listening party sessions: createSession, joinSession, sendPartyMessage, endSession, loadPublicSessions, sessionsState, activePublicSessions
- `src/lib/comms/index.ts` — Added all sessions exports and type re-exports

## Decisions Made

- NDKKind enum doesn't include ephemeral kinds 20001/20002 — double cast `as unknown as NDKKind[]` required since TypeScript rejects direct cast when numeric literal types don't overlap with enum members
- Used `activePublicSessions = $derived(sessionsState.publicSessions.slice().sort(...))` with defensive `.slice()` copy before sort — avoids in-place mutation of reactive $state array
- Ephemeral kind:20001 for session messages, kind:20002 for announcements/presence — deliberate separation from NIP-28 channel kinds (40, 42) to avoid any collision with rooms module
- Session ID format: first 8 chars of host pubkey + timestamp milliseconds — unique, deterministic, provides human-readable pubkey prefix for debugging sessions
- `endSession()` preserves the `publicSessions` discovery list — it's the global discovery index, not data belonging to the ended session

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NDKKind enum type mismatch for ephemeral kinds 20001/20002**
- **Found during:** Task 1 (sessions module implementation) — `npm run check` revealed errors
- **Issue:** NDK's `NDKKind` enum only includes named kinds (40, 42, etc.) — numeric literals 20001/20002 don't overlap with enum members, making direct cast insufficient. TypeScript error: "Conversion of type '(20002 | 20001)[]' to type 'NDKKind[]' may be a mistake..."
- **Fix:** Used double cast pattern `as unknown as NDKKind[]` which TypeScript accepts as intentional escape hatch. Added `import type { NDKKind }` from ndk package. Two locations: `_subscribeToSessionMessages()` and `loadPublicSessions()`
- **Files modified:** src/lib/comms/sessions.svelte.ts
- **Verification:** `npm run check` exits 0 with zero errors after fix
- **Committed in:** e5e5fbb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type system bug)
**Impact on plan:** Required fix for TypeScript correctness. NDK simply hasn't added the NIP-01 ephemeral kind range to its enum yet. Double cast is the correct workaround — same approach used throughout the Nostr ecosystem for custom kinds.

## Issues Encountered

None beyond the NDKKind type mismatch documented in Deviations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- sessions.svelte.ts provides the full session primitive for any UI layer
- Ready for integration into comms overlay, artist pages, and chat sidebar
- activePublicSessions $derived export ready for session discovery feed components

---
*Phase: 10-communication-layer*
*Completed: 2026-02-23*
