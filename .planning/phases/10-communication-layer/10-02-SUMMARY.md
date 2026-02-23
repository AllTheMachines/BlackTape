---
phase: 10-communication-layer
plan: 02
subsystem: messaging
tags: [nostr, nip17, gift-wrap, ndk, encrypted-dm, ai, svelte5, runes]

# Dependency graph
requires:
  - phase: 10-communication-layer/10-01
    provides: ndkState singleton, initNostr(), keypair identity
  - phase: 09-community-foundation
    provides: tasteProfile reactive state, getAiProvider() engine
provides:
  - NIP-17 encrypted DM send/receive via NDK gift-wrap
  - Chat overlay open/close state + unread badge counts
  - AI taste bridge — musical connection explanation + conversation starters
affects:
  - 10-03: ChatPanel.svelte will import chatState, dmState, tasteBridgeState
  - 10-04: RoomList and room-view components need notifState.roomUnread
  - 10-05: Full chat UI panel wires all these modules together

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NDK 3.x gift-wrap pattern: giftWrap(event, recipient) + giftUnwrap(event)"
    - "No-circular-dep unread update: dm/rooms modules write notifState directly"
    - "Session Map cache in $state: tasteBridgeState Map<pubkey, TasteBridgeResult>"
    - "AiProvider.complete() for all AI calls — never raw fetch or private field access"

key-files:
  created:
    - src/lib/comms/notifications.svelte.ts
    - src/lib/comms/dms.svelte.ts
    - src/lib/comms/ai-taste-bridge.ts
  modified:
    - src/lib/comms/index.ts

key-decisions:
  - "NDK 3.x uses standalone giftWrap/giftUnwrap functions, not NDKDMConversation class — plan referenced nonexistent API, auto-fixed to real API"
  - "AiProvider interface uses complete() method only — raw fetch with private fields incorrect, auto-fixed to provider.complete()"
  - "tasteProfile.tags (sorted by weight) not tasteState.topTags — correct module is src/lib/taste/profile.svelte.ts"
  - "notifications.svelte.ts has no imports from dms/rooms — dm/rooms write notifState.dmUnread directly to avoid circular deps"
  - "totalUnread is $derived — reactive sum of dmUnread + roomUnread, auto-updates when either changes"

patterns-established:
  - "Chat overlay view routing via chatState.view string enum (ChatView type)"
  - "Per-conversation AI cache: tasteBridgeState.get(peerPubkey) populated once per session"

requirements-completed: [COMM-04]

# Metrics
duration: 4min
completed: 2026-02-23
---

# Phase 10 Plan 02: DM System + AI Taste Bridge Summary

**NIP-17 gift-wrap encrypted DMs, reactive chat overlay state, and AI musical bridge explanation using NDK 3.x giftWrap/giftUnwrap helpers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-23T00:44:45Z
- **Completed:** 2026-02-23T00:49:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Chat overlay state module (notifications.svelte.ts) — open/close, view routing, unread badge counts with $derived totalUnread
- NIP-17 encrypted DM send/receive — gift-wrap encryption using NDK 3.x helpers, unread tracking, duplicate detection
- AI taste bridge — fetches peer taste profile from kind:30078 Nostr events, generates musical bridge + conversation starters via AiProvider.complete()

## Task Commits

Each task was committed atomically:

1. **Task 1: Notifications and chat overlay state module** - `be0fdc2` (feat)
2. **Task 2: NIP-17 encrypted DM module** - `e8ac04b` (feat)
3. **Task 3: AI taste bridge — musical context for DM conversations** - `5d482ab` (feat)

## Files Created/Modified
- `src/lib/comms/notifications.svelte.ts` — chatState, notifState, openChat(), closeChat(), totalUnread $derived
- `src/lib/comms/dms.svelte.ts` — dmState, sendDM() (giftWrap), subscribeToIncomingDMs() (giftUnwrap), markConversationRead()
- `src/lib/comms/ai-taste-bridge.ts` — tasteBridgeState Map, getTasteBridge() with Nostr profile fetch + AI completion
- `src/lib/comms/index.ts` — updated to re-export all new public symbols from all three modules

## Decisions Made
- NDK 3.0.0 exports `giftWrap()` and `giftUnwrap()` as standalone functions — `NDKDMConversation` referenced in the plan does not exist. Real API produces identical NIP-17 outcome.
- `AiProvider.complete()` is the correct interface method — `provider.baseUrl`/`apiKey`/`model` are private fields of `RemoteAiProvider`, not part of the interface.
- `tasteProfile` from `$lib/taste/profile.svelte.ts` is the correct reactive taste state module. It has `.tags[]` (with weight), `.favorites[]`, not `.topTags`/`.topArtists`.
- No-circular-dependency design honored: notifications.svelte.ts imports nothing from dms or rooms; those modules write `notifState.dmUnread` directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NDKDMConversation does not exist in NDK 3.x**
- **Found during:** Task 2 (NIP-17 encrypted DM module)
- **Issue:** Plan called `new NDKDMConversation(ndk, [recipient]).sendMessage(content)` — this class does not exist in NDK 3.0.0. NDK 3.x provides `giftWrap(event, recipient)` and `giftUnwrap(event, sender, signer)` as standalone async functions.
- **Fix:** Created kind:14 NDKEvent manually, called `giftWrap(dmEvent, recipient)` to seal+wrap, called `wrapped.publish()`. Subscribe uses `giftUnwrap(event, undefined, signer)` to decrypt incoming kind:1059 events.
- **Files modified:** src/lib/comms/dms.svelte.ts
- **Verification:** `npm run check` 0 errors; NDK exports verified via `node -e "const ndk = require('@nostr-dev-kit/ndk'); console.log(Object.keys(ndk).filter(...))"` — `giftWrap`, `giftUnwrap`, `wrapEvent` all present.
- **Committed in:** e8ac04b (Task 2 commit)

**2. [Rule 1 - Bug] AiProvider interface has no baseUrl/apiKey/model fields**
- **Found during:** Task 3 (AI taste bridge)
- **Issue:** Plan code accessed `provider.baseUrl`, `provider.apiKey`, `provider.model` and did raw fetch — but those are private fields of `RemoteAiProvider`, not part of the `AiProvider` interface. The interface only exposes `complete()`, `embed()`, `isReady()`.
- **Fix:** Replaced raw fetch block with `provider.complete(prompt, { temperature: 0.7, maxTokens: 200 })` — works with both local llama-server and remote API providers.
- **Files modified:** src/lib/comms/ai-taste-bridge.ts
- **Verification:** `npm run check` 0 errors.
- **Committed in:** 5d482ab (Task 3 commit)

**3. [Rule 1 - Bug] tasteState.topTags import from wrong module**
- **Found during:** Task 3 (AI taste bridge)
- **Issue:** Plan imported `tasteState` from `$lib/ai/state.svelte.js` and accessed `.topTags`/`.topArtists` — neither the export name nor the fields exist. The correct module is `$lib/taste/profile.svelte.ts` exporting `tasteProfile` with `.tags[]` and `.favorites[]`.
- **Fix:** Import `tasteProfile` from `$lib/taste/profile.svelte.js`. Sort `.tags` by weight descending, take top 8, map to `.tag` string. Take top 5 `.favorites` and map to `.artist_name`.
- **Files modified:** src/lib/comms/ai-taste-bridge.ts
- **Verification:** `npm run check` 0 errors.
- **Committed in:** 5d482ab (Task 3 commit)

**4. [Rule 1 - Bug] getAiProvider imported from wrong module**
- **Found during:** Task 3 (AI taste bridge)
- **Issue:** Plan imported `getAiProvider` from `$lib/ai/state.svelte.js` — it's not there. `getAiProvider()` lives in `$lib/ai/engine.ts` (and is re-exported via `$lib/ai/index.ts`).
- **Fix:** Changed import to `from '$lib/ai/engine.js'`.
- **Files modified:** src/lib/comms/ai-taste-bridge.ts
- **Verification:** `npm run check` 0 errors; grep confirms `getAiProvider` present in engine.ts exports.
- **Committed in:** 5d482ab (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 bugs — plan referenced nonexistent APIs)
**Impact on plan:** All fixes necessary for correct operation. Final behavior matches plan intent exactly. No scope creep.

## Issues Encountered
None beyond the API mismatches documented as deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- dmState, chatState, notifState, tasteBridgeState all ready for ChatPanel.svelte (Plan 05)
- subscribeToIncomingDMs() should be called in root layout onMount after initNostr()
- getTasteBridge(peerPubkey) called from ChatPanel when dm-thread view opens
- tasteBridgeState.get(pubkey) read reactively to show bridge header + starters

---
*Phase: 10-communication-layer*
*Completed: 2026-02-23*
