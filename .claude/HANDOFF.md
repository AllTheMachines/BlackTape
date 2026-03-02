# Work Handoff - 2026-03-02 01:15

## Current Task
Automated app video recording using /record-app skill — full app walkthrough of BlackTape. Pass 1 is UNUSABLE (captured full desktop). Need to redo as Pass 2 with app fullscreen.

## Context
Steve invoked `/record-app` to record a full walkthrough of the BlackTape desktop app. The recording pipeline uses Director (storyboard) → Cameraman (Playwright+FFmpeg) → Director (review) → Cutter (post-production). Pass 1 completed the entire pipeline but the final video shows the full desktop (VS Code, YouTube, taskbar) instead of just the app — because the app was never made fullscreen before FFmpeg started.

## Progress
### Completed
- `recording.config.json` created (tauri, CDP port 9224, 1920x1080, ffmpeg mode)
- Session folder: `app-recordings/2026-03-02_app-walkthrough/`
- Director generated storyboard: 19 scenes, ~109s target (storyboard.json is GOOD, reuse it)
- Cameraman Pass 1: all 19 scenes recorded (clips + screenshots exist but show windowed app on desktop)
- Director reviewed Pass 1: approved (but based on Playwright screenshots which only show WebView content, not the FFmpeg desktop capture)
- Cutter assembled `final/app-walkthrough.mp4` (68s, 25.5MB) — UNUSABLE

### Remaining
- **Redo recording as Pass 2** with app fullscreen before FFmpeg starts
- Director review of Pass 2
- Cutter post-production on Pass 2
- Verify final video shows ONLY the app
- Final delivery

## Critical Fix for Pass 2
The Cameraman MUST do these before starting FFmpeg:
1. Launch app: `node tools/launch-cdp.mjs`
2. Connect via Playwright: `chromium.connectOverCDP('http://127.0.0.1:9224')`
3. **Click maximize button**: `page.locator('button[aria-label="Maximize"]').click()`
4. **Minimize all other windows** — since `-i desktop` captures everything
5. Wait 2s for window to settle
6. THEN start FFmpeg with `-i desktop -framerate 30`
7. After recording: restore layout to Cockpit via `page.locator('#layout-switcher').selectOption('cockpit')`

## Key Decisions / Lessons
- **Don't modify app source code** for recording issues — Steve was explicit
- **Click UI buttons for window control** — Tauri API `plugin:window|maximize` requires permission not in capabilities. `button[aria-label="Maximize"]` works via Playwright.
- **`__TAURI__` global is NOT available** via CDP — only `__TAURI_INTERNALS__`. But titlebar buttons work fine.
- **FFmpeg uses `-i desktop`** per HYPERSPEED-RECORDING-BRIEF.md — means all other windows must be hidden
- **Restore app state after recording** — Cameraman switched layout to Focus and never restored it. User noticed sidebar was gone.
- **CDP port is 9224** (not 9222) — see `tools/launch-cdp.mjs`
- Reference script: `tools/record-and-run.mjs` shows the proven pattern (connect → fullscreen → ffmpeg → automate → stop)

## Relevant Files
- `app-recordings/2026-03-02_app-walkthrough/` — session folder
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — 19-scene storyboard (REUSE, don't regenerate)
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — needs pass 2 entry added
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass1.cjs` — Pass 1 script (reference, but needs fullscreen fix)
- `recording.config.json` — recording config
- `tools/record-and-run.mjs` — existing working recording script (reference)
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — recording brief with rules
- `C:/Users/User/.claude/skills/director/skill.md` — Director skill
- `C:/Users/User/.claude/skills/cameraman/skill.md` — Cameraman skill
- `C:/Users/User/.claude/skills/cutter/skill.md` — Cutter skill

## Git Status
Only `BUILD-LOG.md` modified (3 lines). All recording files in `app-recordings/` (gitignored for large files).

## Next Steps
1. Update manifest.json: add pass 2 entry, set `current_pass: 2`, set `director_approved: false`
2. Spawn Cameraman for Pass 2 with EXPLICIT fullscreen instructions (click maximize button + minimize other windows BEFORE ffmpeg)
3. Pass `--storyboard app-recordings/2026-03-02_app-walkthrough/storyboard.json` to skip Director generation
4. After Cameraman completes, extract frames from the video to VERIFY it shows only the app
5. If good, spawn Director for review
6. If approved, spawn Cutter
7. Verify final video, then deliver

## Resume Command
After running `/clear`, run `/resume` to continue.
