---
phase: 10-communication-layer
plan: "07"
subsystem: comms-integration
tags: [nostr, chat, layout, artist-page, discover-page, svelte5]
dependency_graph:
  requires: [10-05, 10-06]
  provides: [comms-accessible-from-all-pages]
  affects: [src/routes/+layout.svelte, src/routes/artist/[slug]/+page.svelte, src/routes/discover/+page.svelte]
tech_stack:
  added: []
  patterns: [root-layout-init, dynamic-import-lazy-load, getter-function-export]
key_files:
  created: []
  modified:
    - src/routes/+layout.svelte
    - src/lib/components/chat/ChatOverlay.svelte
    - src/lib/comms/notifications.svelte.ts
    - src/lib/comms/sessions.svelte.ts
    - src/routes/artist/[slug]/+page.svelte
    - src/routes/discover/+page.svelte
decisions:
  - "initNostr() called unconditionally (outside isTauri()) — IndexedDB available in all browsers, comms works on web too"
  - "totalUnread exported as getter function — Svelte 5 prohibits exporting $derived from .svelte.ts module files"
  - "activePublicSessions exported as getter function — same Svelte 5 module export rule"
  - "Scene rooms button on artist page uses data.artist.tags[0] (first tag = most prominent, established pattern)"
  - "Discover rooms button uses data.tags.length check (server data already loaded, no extra $page import needed)"
  - "ChatOverlay tabs: DMs / Rooms / Parties — RoomDirectory and SessionCreator lazy-imported to avoid circular deps"
metrics:
  duration: 4min
  completed: 2026-02-23
  tasks_completed: 2
  files_modified: 6
requirements: [COMM-04, COMM-05, COMM-06]
---

# Phase 10 Plan 07: Application Integration — Chat System Wired In

**One-liner:** Root layout initializes Nostr on mount, mounts ChatOverlay globally, and surfaces scene room discovery links on artist and discover pages.

## What Was Built

This plan connected all Phase 10 communication modules to the live application. Plans 01-06 built the infrastructure; Plan 07 wires it into user-accessible UI.

### Task 1: Root layout integration

**`src/routes/+layout.svelte`** updated with three additions:

1. **Nostr initialization** — `initNostr().then(() => subscribeToIncomingDMs()).catch(...)` called unconditionally in `onMount`. Runs on both web and Tauri. Fire-and-forget — layout render is never blocked.

2. **Chat nav button** — Added to both Tauri nav and web nav. Displays "Chat" label with a red badge showing unread count when `totalUnread() > 0`. Badge caps at "99+" for very active users.

3. **ChatOverlay mount** — `<ChatOverlay />` added at the root level (after `<Player />`). Present on every page. Slides in from the right when `chatState.open = true`.

**`src/lib/components/chat/ChatOverlay.svelte`** updated:
- Added DMs / Rooms / Parties tab navigation below the header
- View routing: rooms view lazy-imports RoomDirectory, sessions view lazy-imports SessionCreator, DM view renders ChatPanel directly
- `{#await import(...) then}` pattern prevents loading heavy modules until first use

### Task 2: Scene room discovery links

**`src/routes/artist/[slug]/+page.svelte`:** "Scene rooms for [primary tag]" button appears under the existing "Explore [tag] scene" link when artist has tags. Calls `openChat('rooms')` — opens the overlay directly in rooms view.

**`src/routes/discover/+page.svelte`:** "Scene rooms for this vibe" button appears between the TagFilter and results grid when `data.tags.length > 0`. Uses server-loaded data (no extra `$page` import). Calls `openChat('rooms')`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `$derived` cannot be exported from `.svelte.ts` module files**
- **Found during:** Task 1 (npm run build)
- **Issue:** Svelte 5's `compile-module` Vite plugin prohibits exporting `$derived` values from `.svelte.ts` files. `svelte-check` passes (type-only) but Vite build fails at the module compilation step. Two exports in pre-existing code triggered this when first imported by `+layout.svelte`.
- **Fix 1:** `notifications.svelte.ts` — `export const totalUnread = $derived(...)` changed to `export function totalUnread() { return notifState.dmUnread + notifState.roomUnread; }`. Callers updated to `totalUnread()`.
- **Fix 2:** `sessions.svelte.ts` — `export const activePublicSessions = $derived(...)` changed to `export function activePublicSessions() { return sessionsState.publicSessions.slice().sort(...); }`.
- **Files modified:** `src/lib/comms/notifications.svelte.ts`, `src/lib/comms/sessions.svelte.ts`
- **Commits:** included in f29c0b7

**2. [Minor plan deviation] Chat button label uses "Chat" text, not emoji**
- The plan template used a 💬 emoji for the chat button. Per CLAUDE.md: "Do not use emojis unless explicitly requested." Used "Chat" text label instead — cleaner, consistent with existing nav link style.

## Verification

1. `npm run check` — 0 errors (6 pre-existing warnings in unrelated files)
2. `npm run build` — exits 0, full production build succeeds
3. `initNostr` present in `src/routes/+layout.svelte` — confirmed
4. `ChatOverlay` present in `src/routes/+layout.svelte` template — confirmed
5. `totalUnread` present in `src/routes/+layout.svelte` badge logic — confirmed (as getter call)
6. `openChat` present in `src/routes/artist/[slug]/+page.svelte` — confirmed
7. `openChat` present in `src/routes/discover/+page.svelte` — confirmed

## Commits

| Hash | Message |
|------|---------|
| f29c0b7 | feat(10-07): wire Nostr init + ChatOverlay into root layout |
| fb253c5 | feat(10-07): add scene room discovery links on artist and discover pages |

## Self-Check: PASSED

- src/routes/+layout.svelte — FOUND
- src/lib/components/chat/ChatOverlay.svelte — FOUND
- src/lib/comms/notifications.svelte.ts — FOUND
- .planning/phases/10-communication-layer/10-07-SUMMARY.md — FOUND
- Commit f29c0b7 — FOUND
- Commit fb253c5 — FOUND
