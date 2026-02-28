# Work Handoff - 2026-02-28

## Current Task
Fixed `tools/record-and-run.mjs` so ffmpeg captures the BlackTape app window instead of the full desktop.

## Context
The demo recording tool (`record-and-run.mjs`) was capturing the full desktop with VS Code on top, because ffmpeg was using `gdigrab` with `-i desktop`. The fix was to switch to window-title capture (`-i title=BlackTape`) and ensure the app has focus before recording starts.

## Progress
### Completed
- Changed ffmpeg input from `-i desktop` to `-i title=BlackTape`
- Removed `-video_size`, `-offset_x`, `-offset_y` flags (not applicable for window capture)
- Added `await page.bringToFront()` after fullscreen call
- Bumped default nav settle from 2500ms to 3500ms (helps with tab click timeouts)

### In Progress
- Nothing in progress — fix is done, hasn't been tested yet

### Remaining
- Test the recording: `node tools/launch-cdp.mjs` then `node tools/record-and-run.mjs`
- If window title doesn't match: check exact title with `ffmpeg -f gdigrab -list_devices true -i dummy` and update `title=BlackTape` accordingly
- Delete the bad recording at `press-screenshots/demo-recording.mp4` after a good one is made

## Key Decisions
- Window capture via `title=BlackTape` is cleaner than full-desktop — no need for `-video_size`/offsets
- `page.bringToFront()` ensures the Playwright/CDP-connected page has OS focus before ffmpeg starts

## Relevant Files
- `tools/record-and-run.mjs` — the demo recording script (modified)
- `tools/launch-cdp.mjs` — launches app with CDP on port 9224 (run first)
- `press-screenshots/demo-recording.mp4` — bad output from previous run (VS Code captured)

## Git Status
- `BUILD-LOG.md` — modified (uncommitted log entries)
- `parachord-reference` — submodule modified content
- `tools/record-and-run.mjs` and `tools/record-demo.mjs` are untracked (new files, not yet staged)

## Next Steps
1. Run `node tools/launch-cdp.mjs` to start the app with CDP
2. Run `node tools/record-and-run.mjs` to test the recording
3. If ffmpeg errors on window title, run `ffmpeg -f gdigrab -list_devices true -i dummy 2>&1` to find exact title
4. If recording works, commit `tools/record-and-run.mjs` and `tools/record-demo.mjs`

## Resume Command
After running `/clear`, run `/resume` to continue.
