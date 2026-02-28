# Work Handoff - 2026-02-28

## Problem
`record-and-run.mjs` recorded VS Code instead of the app. ffmpeg captured full desktop with VS Code on top. The app went fullscreen but VS Code covered it.

## Fix Needed (one line in record-and-run.mjs)
In `tools/record-and-run.mjs`, find the ffmpeg spawn args and change:
```js
'-i', 'desktop',
```
to:
```js
'-i', 'title=BlackTape',
```
This tells gdigrab to capture only the mercury/BlackTape window by title.

If `title=BlackTape` doesn't work (window title may differ), try:
- `title=Mercury`
- `title=BlackTape — ` (with space)

**Also add `page.bringToFront()` right after fullscreen** so the app is focused before ffmpeg starts.

## Also: Tab clicks failing
The `[data-testid="tab-stats"]` clicks all timeout. Likely the page needs more settle time. Increase nav settle from 3000ms to 5000ms in the `nav()` function, or add a `waitForSelector` before clicking tabs.

## To Re-run
```bash
# 1. Kill existing mercury
node tools/launch-cdp.mjs

# 2. Run recording (after fixing ffmpeg window title)
node tools/record-and-run.mjs
```

## Uncommitted Files
- `tools/record-demo.mjs`
- `tools/record-and-run.mjs`
- `press-screenshots/demo-recording.mp4` (bad recording — VS Code)

## CDP Tools Ready
- `tools/launch-cdp.mjs` — launch app with CDP
- `tools/snap.mjs` — one-shot screenshot
- `tools/record-and-run.mjs` — demo recording (needs fix above)
