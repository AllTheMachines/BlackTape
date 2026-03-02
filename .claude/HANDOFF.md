# Work Handoff - 2026-03-02 10:45

## Current Task
App video recording — Pass 4 ready to run. CDP capture tested and working. Script created, tested, verified.

## Context
Steve invoked `/record-app` for a full BlackTape walkthrough. Passes 1-3 failed due to FFmpeg gdigrab capture issues (multi-monitor bleed, VS Code z-order overlap). Steve said "just record the window" — researched the topic and switched to CDP renderer capture.

## What Was Done This Session
1. **Researched window capture** — gdigrab can't capture behind other windows on Windows 10/11 (DWM composites at screen position). OBS uses Windows.Graphics.Capture API. No FFmpeg-native solution exists.
2. **Chose CDP renderer capture** — `Page.captureScreenshot` via raw CDP session captures directly from Chromium's renderer, completely independent of window z-order.
3. **Benchmarked approaches:**
   - Playwright `page.screenshot()`: ~69ms/frame (~14fps)
   - Raw CDP `Page.captureScreenshot` with `optimizeForSpeed`: ~50ms/frame (~20fps) — **winner**
   - CDP `Page.startScreencast` (push-based): only 3.4fps due to ack backpressure — rejected
4. **Created `cameraman-pass4.cjs`** using raw CDP capture at 15fps target, JPEG q60, piped to FFmpeg via `image2pipe`
5. **Integration tested** — 15-second single-scene recording: 226 frames, exactly 15fps, clean Slowdive artist page, 1.4MB output, H.264 confirmed

## What Needs to Happen Next

### 1. Run pass 4
```
node app-recordings/2026-03-02_app-walkthrough/cameraman-pass4.cjs
```
- 41 scenes, ~25 minutes
- Window does NOT need to be in foreground — can use other apps during recording
- App will be launched by the script (`node tools/launch-cdp.mjs`)

### 2. Check resolution
- Current viewport is 1200x800 (default window size)
- The script calls `applyFullscreen()` which sets window to 1920x1080 — viewport should be ~1920x1050ish
- If higher res is needed, may need to set viewport explicitly via CDP

### 3. Director review (Step 7e)
- Extract checkpoint screenshots from pass 4 clips
- Update manifest with actual clip paths
- Spawn Director agent for review

### 4. Cutter post-production (Step 8)
- Director writes cut-spec.json
- Spawn Cutter agent to assemble final video

### 5. Delivery (Step 9)

## Key Files
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass4.cjs` — **READY TO RUN** (raw CDP capture)
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs` — previous version (gdigrab, broken)
- `app-recordings/2026-03-02_app-walkthrough/test-cdp-capture.cjs` — first capture test (page.screenshot)
- `app-recordings/2026-03-02_app-walkthrough/test-cdp-screencast.cjs` — screencast test (rejected, too slow)
- `app-recordings/2026-03-02_app-walkthrough/test-cdp-optimized.cjs` — benchmark all methods
- `app-recordings/2026-03-02_app-walkthrough/test-pass4-single-scene.cjs` — integration test (15fps confirmed)
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — 41-scene storyboard v3
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — needs pass 4 entry added
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — the recording brief

## Skill Workflow Position
Step 7 (Feedback Loop):
- pass_number = 4 (final pass allowed)
- Capture method: raw CDP `Page.captureScreenshot` via image2pipe to FFmpeg
- After pass 4: Director review → if approved, Cutter → Delivery

## Lessons Learned This Session
1. FFmpeg gdigrab `-i title=WindowTitle` captures screen content at window position on Windows 10/11 (DWM composition) — other windows bleed through
2. FFmpeg gdigrab `-i desktop` requires foreground, captures entire virtual desktop without offset/size constraints
3. No FFmpeg-native solution exists for true per-window background capture on Windows
4. OBS uses Windows.Graphics.Capture API for behind-window capture
5. Raw CDP `Page.captureScreenshot` with `optimizeForSpeed: true` is fastest (~50ms/frame vs 69ms Playwright wrapper)
6. CDP `Page.startScreencast` is much slower than pull-based screenshots due to ack backpressure (~3fps)
7. JPEG quality doesn't significantly affect capture speed (q40 vs q85 = ~2ms difference) — rendering dominates

## Git Status
- BUILD-LOG.md modified (not committed)
- Test files and cameraman-pass4.cjs created (untracked, in gitignored takes dirs + session folder)

## Resume Command
After running `/clear`, run `/resume` to continue.
