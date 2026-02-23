---
phase: 10-communication-layer
plan: "03"
subsystem: comms
tags: [nostr, nip-28, scene-rooms, moderation, ai-safety]
dependency_graph:
  requires: [10-01]
  provides: [NIP-28-scene-rooms, room-moderation, AI-safety-filter]
  affects: [src/lib/comms/index.ts]
tech_stack:
  added: []
  patterns: [nip-28-kind40-channels, svelte5-state-runes, ai-moderation-gate, client-enforced-moderation]
key_files:
  created:
    - src/lib/comms/moderation.ts
    - src/lib/comms/rooms.svelte.ts
  modified:
    - src/lib/comms/index.ts
decisions:
  - "getAiProvider() is synchronous — no await needed; corrected from plan pseudocode"
  - "response.json() requires explicit TypeScript cast for strict mode; cast added for OpenAI moderation response"
  - "Mercury scope tag ['t', 'mercury'] on every kind:40 prevents rooms appearing in generic Nostr clients"
  - "Banned users filtered client-side on message receipt in subscribeToRoom() event handler"
metrics:
  duration: 4min
  completed: "2026-02-23"
  tasks: 2
  files: 3
---

# Phase 10 Plan 03: NIP-28 Scene Rooms + Moderation Summary

NIP-28 scene room system with AI-gated creation and client-side moderation: Mercury-scoped kind:40 channels, kind:42 real-time messaging, AI content safety filter via OpenAI /v1/moderations + keyword fallback, and full moderation toolkit (flag/delete/kick/ban/slow mode/co-mod).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AI moderation module for room safety | f396c68 | src/lib/comms/moderation.ts, src/lib/comms/index.ts |
| 2 | NIP-28 scene rooms state module | 55239ef | src/lib/comms/rooms.svelte.ts, src/lib/comms/index.ts |

## What Was Built

### `src/lib/comms/moderation.ts`

AI-gated content safety filter and owner moderation tools:

- **`checkRoomNameSafety(name)`** — tries OpenAI `/v1/moderations` (free for API-key users), falls back to keyword pattern scan (`/\b(spam|slur|abuse|hate|csam|cp)\b/i`). Returns `{ safe: boolean; reason?: string }`. Fails open when AI not configured.
- **`flagMessage(channelId, eventId)`** — silent flag stored in `flaggedMessages` Map, visible only to room owner in ModerationQueue.
- **`deleteRoomMessage(channelId, messageEventId)`** — publishes kind:43 NIP-28 hide event.
- **`kickUser(channelId, userPubkey)`** — publishes kind:44 NIP-28 mute event.
- **`banUser(channelId, userPubkey)`** — records in `bannedUsers` client-side Map + kicks.
- **`setSlowMode(channelId, seconds)`** — configures minimum seconds between user messages (0 = off). Options: 30s, 2min, 5min, 15min.
- **`appointModerator(channelId, userPubkey)`** — records co-moderator in `roomModerators` Map.
- **`isRoomArchived(lastMessageAt, createdAt)`** — true if inactive for 30+ days.
- All moderation state reactive via `$state` Svelte 5 runes.

### `src/lib/comms/rooms.svelte.ts`

NIP-28 scene rooms with Mercury namespace scoping:

- **`SceneRoom` interface** — id, name, description, tags, ownerPubkey, createdAt, lastMessageAt, memberCount, archived.
- **`RoomMessage` interface** — id, senderPubkey, content, createdAt, channelId.
- **`roomsState`** — reactive singleton: rooms array, messages Map, activeSubscriptions Set, loading flag.
- **`createRoom(name, tags, description)`** — AI safety gate → kind:40 publish with `['t', 'mercury']` scope tag + genre tags → optimistic local update → returns channelId.
- **`loadRooms(filterTag?)`** — fetchEvents with `#t: ['mercury']` (+ optional genre), parses kind:40 content, excludes archived rooms, sorts newest first.
- **`subscribeToRoom(channelId)`** — kind:42 subscription, client-side ban filter on message receipt, notifState.roomUnread increment, returns cleanup function.
- **`sendRoomMessage(channelId, content)`** — kind:42 with NIP-28 `['e', channelId, '', 'root']` tag, optimistic local update.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed synchronous getAiProvider() call pattern**
- **Found during:** Task 1 (moderation.ts)
- **Issue:** Plan pseudocode showed `await getAiProvider()` but the function in `$lib/ai/engine.ts` is synchronous (returns `AiProvider | null`). Awaiting a non-Promise is technically a no-op in JS, but incorrect and misleading.
- **Fix:** Used `getAiProvider()` without await, matching the established pattern from `ai-taste-bridge.ts`. Also corrected import source to `$lib/ai/engine.js` (not `state.svelte.js`) since `getAiProvider` lives in engine, not state.
- **Files modified:** src/lib/comms/moderation.ts
- **Commit:** f396c68

**2. [Rule 1 - Bug] Added explicit TypeScript type cast for response.json()**
- **Found during:** Task 1, npm run check exit code 1
- **Issue:** `response.json()` returns `unknown` in strict TypeScript. The OpenAI moderation result needed an explicit cast to access `.results?.[0]?.flagged`.
- **Fix:** Added inline cast `as { results?: Array<{ flagged?: boolean }> }` — same pattern used throughout the codebase for external API responses.
- **Files modified:** src/lib/comms/moderation.ts
- **Commit:** f396c68 (part of same task, fixed before commit)

## Verification Results

1. `npm run check` exits 0 — 0 errors (6 pre-existing warnings in unrelated files)
2. `src/lib/comms/rooms.svelte.ts` exists — createRoom, loadRooms, subscribeToRoom, sendRoomMessage exported
3. `src/lib/comms/moderation.ts` exists — all 8 functions + 4 state objects + 2 constants exported
4. `['t', 'mercury']` tag confirmed at line 75 in rooms.svelte.ts in createRoom()
5. `checkRoomNameSafety()` confirmed called at line 66 in createRoom() before publish
6. `bannedUsers` filter confirmed at line 172 in subscribeToRoom() event handler

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/comms/moderation.ts
- FOUND: src/lib/comms/rooms.svelte.ts
- FOUND: src/lib/comms/index.ts (updated)

Commits verified:
- FOUND: f396c68 (feat(10-03): add AI moderation module for scene room safety)
- FOUND: 55239ef (feat(10-03): implement NIP-28 scene rooms state module)
