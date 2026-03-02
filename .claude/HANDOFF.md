# Work Handoff - 2026-03-02 02:15

## Current Task
App video recording — Pass 3 script is READY. Dry run passed all 41 scenes. Need to run the actual recording.

## Context
Steve invoked `/record-app` for a full BlackTape walkthrough. Pass 1 & 2 failed (desktop/task-view leaked into FFmpeg captures). Pass 3 has two proven fixes:
1. **Win32 SetWindowPos** instead of MinimizeAll/Tauri fullscreen — sets mercury window to 0,0 at 1920x1080 with HWND_TOPMOST
2. **Primary monitor FFmpeg** — `-offset_x 0 -offset_y 0 -video_size 1920x1080` because second monitor at Y=-768 leaked into bare `-i desktop`

Steve redirected the script from the old 19-scene storyboard to a new approach: **30 artists + visual highlights**. The new script is modeled after `record-and-run.mjs` — hardcoded flow, no action interpreter.

## What's Done
- `cameraman-pass3.cjs` — fully written, dry run PASSED (41/41 scenes)
- `window-fullscreen.ps1` — Win32 API to set mercury to 1920x1080 + TOPMOST (proven working)
- Verify frame confirmed: clean 1920x1080 capture showing only the app
- Playback selectors fixed: uses `platform-pill-spotify`, `.spotify-track-play`, `.play-btn`, `play-album-btn` (only tries first 3 artists then gives up)

## Script Structure (41 scenes)
- `00-app-launch` — navigate to /, press screenshot
- `01` through `30` — all 30 artists from HYPERSPEED-RECORDING-BRIEF roster (scroll discography, click release, stats tab, overview tab)
- `style-map-1/2/3` — 3 rounds of pan/zoom/click-node
- `kb-shoegaze/post-punk/ambient/jazz` — 4 Knowledge Base genre explorations
- `discover-tags` — tag cloud intersection filtering
- `crate-dig` — random grid browsing
- `player-bar-finale` — slow sweep across retro FX

## Key Files
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs` — THE SCRIPT TO RUN
- `app-recordings/2026-03-02_app-walkthrough/window-fullscreen.ps1` — Win32 fullscreen helper
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — OLD storyboard (not used by pass3)
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — recording manifest
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — the recording brief (artist roster, rules)

## Lessons Learned
- **`__TAURI__` global is NOT available via CDP** — `withGlobalTauri` not enabled in tauri.conf.json. `record-and-run.mjs`'s fullscreen code silently failed (optional chaining swallowed it).
- **MinimizeAll() minimizes the target app too** — and re-maximizing via PowerShell triggers Windows task-view overlay
- **Multi-monitor: FFmpeg `-i desktop` captures the entire virtual screen** — this machine has a second monitor at Y=-768 (1366x768 above primary 1920x1080). Must use `-offset_x 0 -offset_y 0 -video_size 1920x1080`.
- **Win32 SetWindowPos works** — ShowWindow(SW_RESTORE) → SetForegroundWindow → SetWindowPos(HWND_TOPMOST, 0, 0, 1920, 1080) is the proven approach.
- **`play-all-btn` doesn't exist on artist pages** — use `platform-pill-spotify`, `.spotify-track-play`, or `.play-btn` (player bar)
- **`taskkill /f /im` has MSYS path issues** — use `powershell -Command "Stop-Process -Name mercury -Force"` instead
- **FFmpeg `2>/dev/null` doesn't work on Windows** — use `stdio: ['ignore','ignore','ignore']` in execSync
- **Leave the app in Cockpit layout** — Steve's explicit instruction, handled in finally block

## Next Steps
1. **Run the recording**: `node app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs` (no --dry flag)
2. After recording, verify the first clip's frame
3. Director review of clips
4. Cutter post-production
5. Final delivery

## Resume Command
After running `/clear`, run `/resume` to continue.
