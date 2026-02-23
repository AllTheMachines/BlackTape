---
phase: 10-communication-layer
plan: 05
subsystem: chat-ui
tags: [svelte, chat, nostr, ui-components, dms, rooms, listening-party, unfurl, ai-taste-bridge]
dependency_graph:
  requires: [10-02, 10-03, 10-04]
  provides: [chat-ui-components, chat-overlay-drawer, unified-message-panel, unfurl-preview, ai-dm-header]
  affects: [root-layout, artist-page, scene-rooms-ui, listening-party-ui]
tech_stack:
  added: []
  patterns: [svelte5-derived-function, css-slide-drawer, debounced-url-detection, slow-mode-countdown]
key_files:
  created:
    - src/lib/components/chat/ChatOverlay.svelte
    - src/lib/components/chat/ChatPanel.svelte
    - src/lib/components/chat/MessageList.svelte
    - src/lib/components/chat/MessageInput.svelte
    - src/lib/components/chat/UnfurlCard.svelte
    - src/lib/components/chat/TasteBridgeHeader.svelte
  modified: []
decisions:
  - "CSS right-offset slide drawer over dialog.showModal() — modal inert backdrop blocks page browsing"
  - "Mapped plan template CSS vars (--bg-secondary, --accent) to actual theme tokens (--bg-surface, --link-color, etc.)"
  - "$derived(() => fn) pattern for activeMessages/slowMode — callable derived for reactive Map lookups"
  - "markConversationRead removed from ChatPanel imports — imported but unused, cleaned up before commit"
metrics:
  duration: 3min
  completed_date: 2026-02-23
  tasks_completed: 2
  files_created: 6
  files_modified: 1
requirements_completed: [COMM-04, COMM-05, COMM-06]
---

# Phase 10 Plan 05: Chat UI Components Summary

Six Svelte 5 components forming the complete chat UI layer — fixed CSS drawer, unified DM/room/session panel, scrollable message list, URL-detecting message composer, inline Mercury link preview, and AI taste bridge header for DM threads.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ChatOverlay + MessageList + UnfurlCard | 9f394ef | ChatOverlay.svelte, MessageList.svelte, UnfurlCard.svelte |
| 2 | TasteBridgeHeader + ChatPanel + MessageInput | b420395 | TasteBridgeHeader.svelte, ChatPanel.svelte, MessageInput.svelte |

## What Was Built

### ChatOverlay.svelte
Fixed right-side CSS drawer (360px wide). Slides in from `right: -380px` to `right: 0` with a 0.25s ease transition. Uses `chatState.open` from `notifications.svelte.ts` via CSS class toggle — NOT `dialog.showModal()`. The `showModal()` approach creates an inert backdrop blocking page interaction, which would break the "chat while browsing" core requirement. Dynamic title from `chatState.view` (Messages / Scene Rooms / Listening Party).

### MessageList.svelte
Scrollable message history with `$effect` + `tick()` auto-scroll to bottom on new messages. Generic `Message` interface (id, senderPubkey, content, createdAt) compatible with all three comms module types (DmMessage, RoomMessage, SessionMessage). Own messages right-aligned using `color-mix(in oklch, ...)` accent background. Relative timestamps (just now / Nm / Nh / Nd). Pubkey display shortened to first 8 chars + ellipsis until full handle resolution is built.

### UnfurlCard.svelte
Inline Mercury link preview. Cover art (44×44px), title, description (if present), "mercury" badge in link color. Clicking navigates to the URL via `target="_self"`. Used both during message composition (in MessageInput) and planned for rendering within message history.

### MessageInput.svelte
Message composer with three concurrent concerns:
- **800ms debounced URL detection**: `extractMercuryUrls()` runs after 800ms of inactivity, `fetchUnfurlData()` fetches preview data, max 3 UnfurlCards shown
- **Slow mode enforcement**: countdown timer in send button (shows `Ns`), button disabled until timer expires
- **Keyboard send**: Enter sends, Shift+Enter inserts newline

### TasteBridgeHeader.svelte
Pinned AI context panel at top of DM threads. Calls `getTasteBridge(peerPubkey)` on mount. Shows loading state, collapses after reading via toggle button. Silent failure when `bridge.error` is set — no error shown in DM UI. Displays bridge explanation (italic) + conversation starters list.

### ChatPanel.svelte
Unified panel for DM threads, scene rooms, and listening party sessions. Routes active messages via `chatState.view`:
- `dm-thread` + `activeConversationPubkey` → `dmState.conversations`
- `room-view` + `activeRoomId` → `roomsState.messages.get(roomId)`
- `session-view` → `sessionsState.mySession ?? joinedSession`

Routes send handler to `sendDM` / `sendRoomMessage` / `sendPartyMessage` accordingly. Shows `TasteBridgeHeader` only in `dm-thread` view. Shows placeholder when no thread active.

## Decisions Made

### CSS Slide Drawer vs. dialog.showModal()
**Decision:** Use CSS `right` offset transition. **Rejected:** `dialog.showModal()`.

The `showModal()` approach creates an inert backdrop over the entire page — any content behind the modal becomes non-interactive. Mercury's core UX requirement is "chat while browsing" — user must be able to click links, scroll, and interact with content while the chat panel is open. CSS overlay achieves this; modal dialog cannot.

### CSS Variables Mapping
The plan template used placeholder variables. Mapped to actual Mercury theme tokens:
- `--bg-secondary` → `--bg-surface`
- `--bg-tertiary` → `--bg-elevated`
- `--border` → `--border-default`
- `--accent` → `--link-color`
- `--accent-dim` → `color-mix(in oklch, var(--link-color) 20%, transparent)`
- `--text-tertiary` → `--text-muted`

### $derived(() => fn) Pattern
Used for `activeMessages` and `slowMode` in ChatPanel. Produces a callable derived rather than a plain value. Valid Svelte 5 pattern when the derived result involves conditional lookups against reactive `Map` state — calling `activeMessages()` in the template re-evaluates reactively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Removed unused `markConversationRead` import from ChatPanel**
- **Found during:** Task 2
- **Issue:** ChatPanel imported `markConversationRead` from `dms.svelte.ts` but never called it — TypeScript allows unused imports but it's noise
- **Fix:** Removed from import statement
- **Files modified:** src/lib/components/chat/ChatPanel.svelte

**2. [Rule 1 - Bug] CSS variable mismatch — plan template used non-existent variables**
- **Found during:** Task 1 + 2
- **Issue:** Plan's code templates referenced `--bg-secondary`, `--bg-tertiary`, `--border`, `--accent`, `--accent-dim`, `--text-tertiary` — none exist in `src/lib/styles/theme.css`
- **Fix:** Mapped all to actual theme tokens during component creation
- **Files modified:** All 6 new component files

## Verification Results

1. `npm run check` exits 0 — 0 errors, 6 pre-existing warnings in unrelated files
2. ChatOverlay uses CSS `right: -380px` / `right: 0` transition — confirmed no dialog.showModal()
3. MessageInput has 800ms setTimeout before calling extractMercuryUrls — confirmed on line 29
4. ChatPanel imports and uses sendDM / sendRoomMessage / sendPartyMessage based on chatState.view — confirmed lines 39-44
5. ChatPanel renders TasteBridgeHeader when view is 'dm-thread' — confirmed
6. TasteBridgeHeader calls getTasteBridge(peerPubkey) on mount — confirmed via onMount
7. All 6 component files exist in src/lib/components/chat/ — confirmed

## Self-Check: PASSED
