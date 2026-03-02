# Work Handoff - 2026-03-02 11:30

## Current Task
App video recording — `/record-app` workflow COMPLETE. Final video delivered. Ready for Step 9 delivery summary or next work.

## Context
Steve invoked `/record-app` for a full BlackTape walkthrough. Passes 1-3 failed due to FFmpeg gdigrab capture issues (multi-monitor bleed, VS Code z-order overlap). Pass 4 switched to CDP renderer capture (`Page.captureScreenshot`), which captures directly from the Chromium renderer — completely independent of window z-order. Director approved pass 4, Cutter assembled the final video.

## Progress
### Completed
- Researched window capture approaches (gdigrab limitations, OBS Windows.Graphics.Capture, CDP)
- Benchmarked CDP capture methods: Playwright page.screenshot (~14fps), raw CDP captureScreenshot (~20fps), screencast (~3fps)
- Created `cameraman-pass4.cjs` using raw CDP capture at 15fps, JPEG q60, piped to FFmpeg
- Fixed H.264 even-dimension issue (added `-vf crop=trunc(iw/2)*2:trunc(ih/2)*2`)
- Fixed pipe error handling (added `proc.stdin.on('error')` suppress)
- **Pass 4 recorded**: 41 clips, 430MB total, 1904x1070, H.264, 15fps
- Extracted checkpoint screenshots from all 41 clips
- Updated manifest with pass 4 data
- **Director review**: APPROVED — 37/41 scenes pass, 4 excluded (kb-ambient blank, player-bar-finale error, style-map-2/3 wrong page)
- **Cutter post-production**: COMPLETE — 37 scenes assembled with crossfade transitions
- **Final video**: `app-recordings/2026-03-02_app-walkthrough/final/app-walkthrough.mp4` — 5m25s, 162MB, 4.2Mbps

### Remaining
- BUILD-LOG.md needs updating with the full recording session summary
- Optional: re-record the 4 excluded scenes if Steve wants them
- The `/record-app` Step 9 (Delivery) summary was given inline — workflow is complete

## Key Decisions
- CDP renderer capture chosen over gdigrab — completely avoids window z-order issues on Windows
- Raw CDP `Page.captureScreenshot` with `optimizeForSpeed: true` chosen as fastest method (~50ms/frame)
- 15fps target chosen (achievable with CDP overhead)
- JPEG q60 for capture frames (good balance of speed vs quality)
- Director excluded 4 scenes rather than requesting another pass (lenient threshold, pass 4 was final allowed)
- Crossfade transitions chosen for the walkthrough style

## Relevant Files
- `app-recordings/2026-03-02_app-walkthrough/final/app-walkthrough.mp4` — FINAL VIDEO
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — full session metadata
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — 41-scene storyboard v3
- `app-recordings/2026-03-02_app-walkthrough/cut-spec.json` — Director's cut spec (37 scenes)
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass4.cjs` — CDP capture script
- `app-recordings/2026-03-02_app-walkthrough/takes/pass-4/` — 41 individual clip files
- `app-recordings/2026-03-02_app-walkthrough/press/` — 66 press screenshots across all passes

## Git Status
- `BUILD-LOG.md` modified (not staged, +3 lines)
- Recording files are in gitignored `takes/` and `final/` directories
- Metadata files (manifest, storyboard, cut-spec) are committable

## Lessons Learned This Session
1. FFmpeg gdigrab `-i title=` captures screen at window position on Windows 10/11 — other windows bleed through
2. No FFmpeg-native solution for true per-window background capture on Windows
3. Raw CDP `Page.captureScreenshot` with `optimizeForSpeed: true` is fastest (~50ms/frame)
4. CDP `Page.startScreencast` is much slower due to ack backpressure (~3fps)
5. H.264 requires even dimensions — add `-vf "crop=trunc(iw/2)*2:trunc(ih/2)*2"` when viewport may be odd
6. Must handle pipe errors when FFmpeg exits early — `proc.stdin.on('error', () => {})` prevents crash

## Next Steps
1. Update BUILD-LOG.md with recording session summary
2. Optionally commit metadata files (manifest, storyboard, cut-spec)
3. Whatever Steve wants to work on next — the recording is done

## Resume Command
After running `/clear`, run `/resume` to continue.
