---
phase: 31-v1-prep
plan: 01
status: complete
completed: 2026-02-27
---

# Plan 31-01 Summary: Community Feature UI Removal

## What Was Done

Removed all community feature surfaces from visible UI across 4 files. Code preserved — only render paths and unused imports deleted. Fixed localhost → 127.0.0.1 in Spotify instructions.

### Files Modified

**`src/routes/+layout.svelte`**
- Removed 4 imports: `initNostr`, `subscribeToIncomingDMs`, `totalUnread/chatState/openChat`, `ChatOverlay`
- Removed Nostr init call from `onMount` (3 lines including comment)
- Removed Scenes nav link from Tauri nav
- Removed Chat button from Tauri nav (12 lines)
- Removed Scenes nav link from web nav
- Removed Chat button from web nav (3 lines)
- Removed `<ChatOverlay />` render block (2 lines)
- Removed dead CSS: `.nav-chat-btn`, `.nav-chat-btn:hover/.active`, `.nav-badge`

**`src/routes/artist/[slug]/+page.svelte`**
- Removed `openChat/chatState` import
- Removed `openRoomsForArtist()` function (5 lines)
- Removed `explore-scene-panel` div with "Explore {tag} scene →" link (8 lines)
- Removed `scene-rooms-hint` section with "Scene rooms for {tag}" button (6 lines)
- Removed dead CSS: `.explore-scene-panel`, `.explore-scene-link`, `.explore-scene-link:hover`, `.scene-rooms-hint`, `.rooms-link`, `.rooms-link:hover`

**`src/routes/settings/+page.svelte`**
- Removed `FediverseSettings` import
- Removed `<div class="section-separator"></div><FediverseSettings />` render block
- Fixed `http://localhost` → `http://127.0.0.1` in Spotify import card description

**`src/routes/crate/+page.svelte`**
- Removed `openChat/chatState` import
- Removed "Open scene room →" button (4 lines)

**`tools/test-suite/manifest.mjs`**
- Added 12 PHASE_31 test assertions (all passing)
- Marked P10-05 (Scenes nav) and P11-05 (Chat nav) as skipped — superseded by P31

## Test Results

- 12/12 P31 tests passing
- Full code-only suite: 193 passing, 0 failing
- `npm run check`: 0 errors

## Key Decision

Community feature code is 100% preserved in `$lib/comms/` and related components. Only the render paths into the UI were removed. No architectural changes — pure subtraction.
