# Work Handoff - 2026-03-02 08:55

## Current Task
App video recording — Pass 3 COMPLETE. 41 clips recorded with window capture mode. Ready for Director review + Cutter post-production.

## Context
Steve invoked `/record-app` for a full BlackTape walkthrough. Passes 1 & 2 failed (desktop/task-view leaked into FFmpeg captures). Pass 3 switched to **window capture mode** (`-i title=BlackTape`) so Steve can work in other apps. Recording is done — next steps are review and assembly.

## Progress
### Completed
- `cameraman-pass3.cjs` — written, debugged, and successfully executed
- `window-fullscreen.ps1` — Win32 API to set mercury to 1920x1080 (no TOPMOST)
- **41/41 scenes recorded** — 61MB total, zero failures, zero 0-byte files
- 14 press screenshots captured
- record-app skill updated with all lessons learned
- Bug found and fixed: gdigrab window capture produces odd dimensions (1904x1071) → libx264/yuv420p fails silently with 0 bytes. Fixed with `-vf "crop=trunc(iw/2)*2:trunc(ih/2)*2"`

### Remaining
- Director review of clips (checkpoint screenshots in takes/pass-3/)
- Cutter post-production (assemble clips into final video)
- Final delivery

## Key Decisions
- **Window capture (`-i title=BlackTape`) instead of desktop capture** — no TOPMOST, Steve can work in other apps
- **Crop filter required** for even dimensions when encoding to h264
- **Limitation discovered**: gdigrab `-i title=` captures what's visually on screen at the window's position, NOT the window's own buffer. Other windows overlapping the app WILL appear in the recording. Steve can work on his second monitor safely (Y=-768, above primary).

## Key Files
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs` — the recording script (fully working)
- `app-recordings/2026-03-02_app-walkthrough/window-fullscreen.ps1` — Win32 fullscreen helper (no TOPMOST)
- `app-recordings/2026-03-02_app-walkthrough/takes/pass-3/` — 41 clips + verify frames
- `app-recordings/2026-03-02_app-walkthrough/press/` — 51 press screenshots
- `C:/Users/User/.claude/commands/record-app.md` — updated skill with all lessons
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — the recording brief (artist roster)

## Lessons Added to record-app Skill
1. Window capture produces odd dimensions due to DWM invisible borders → must crop for h264
2. Log FFmpeg stderr errors, not just frame progress — silent failures are devastating
3. gdigrab `-i title=` captures screen content at window position, not window buffer
4. All previous lessons from passes 1 & 2 (see skill file for full list)

## Git Status
- `BUILD-LOG.md` modified (auto-save hook)
- 3 new untracked press screenshots (49-discover, 50-crate-dig, 51-player-bar)
- Takes directory is gitignored

## Next Steps
1. **Review clips** — spot-check a few clips (extract frames from middle of artist scenes, style-map, KB)
2. **Director review** — spawn Director agent to review checkpoint screenshots
3. **Cutter post-production** — assemble 41 clips into final video
4. **Final delivery** — output path, update manifest

## Resume Command
After running `/clear`, run `/resume` to continue.
