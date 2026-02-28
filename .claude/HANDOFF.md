# Work Handoff - 2026-02-28

## Current Task
Bug-bashing open v1.4 Spotify issues — fixed keyboard input and UI confusion.

## Completed This Session
- **Input keyboard fix** — `main-pane` scroll container was stealing keyboard events from inputs (WebView2 + scrollable div implicit focus bug). Fixed by adding `tabindex="-1"` to `.main-pane` in `PanelLayout.svelte`.
- **SpotifySettings improvements:**
  - Added "Re-authorize" button (replaces useless "Done" button in connected state)
  - Fixed `$state(reactiveValue)` read-only bug — changed to `$effect` with initialized flag
  - Added `focusWindow()` on input mousedown (Tauri Win32 focus safety)
  - Removed confusing dashboard mockup — users thought it was real input fields
  - Fixed race condition: `$effect` instead of `onMount` for clientId pre-fill

## App State
- App running via `node tools/launch-cdp.mjs` (CDP on port 9224)
- All changes reloaded, visible in app
- No Spotify client ID stored in DB (user needs to enter fresh)

## Next Steps (Spotify Issue Dependency Chain)
1. **Steve tests Spotify OAuth**: Settings > Spotify > enter Client ID > Authorize
   - Needs Spotify Desktop running + Spotify Developer app with redirect URI `http://127.0.0.1`
2. **#61** — Streaming preference settings don't apply (dropdown + drag order disconnected from embed ordering)
3. **#49** — Release page: no streaming links, no play buttons on tracks

## Key Files Changed This Session
- `src/lib/components/SpotifySettings.svelte` — Re-authorize button, $effect init, focusWindow, mockup removed
- `src/lib/components/PanelLayout.svelte` — tabindex="-1" on main-pane (keyboard fix)
- `CLAUDE.md` — added "never ask Steve to run the app" rule
- `memory/MEMORY.md` — same rule added

## Resume Command
Run `/resume` after `/clear`
