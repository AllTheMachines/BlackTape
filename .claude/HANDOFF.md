# Work Handoff - 2026-02-27

## Current Task
Automated demo recording — run the full hyperspeed brief unattended while ffmpeg records the screen.

## What's Ready

All scripts written and tested (CDP connection verified):

| Script | Purpose |
|--------|---------|
| `tools/launch-cdp.mjs` | Launch mercury.exe with CDP on port 9224 |
| `tools/record-and-run.mjs` | **Main script**: fullscreen + ffmpeg record + full demo |
| `tools/record-demo.mjs` | Demo automation only (no recording) |
| `tools/snap.mjs` | One-shot screenshot |

## How to Run

```bash
# 1. Launch app with CDP (if not already running)
node tools/launch-cdp.mjs

# 2. Run the full automated recording
node tools/record-and-run.mjs
```

Output: `press-screenshots/demo-recording.mp4`

The script will:
1. Connect to the running app via CDP
2. Set the window to fullscreen via Tauri API
3. Start ffmpeg recording the desktop (gdigrab, 30fps, CRF 18)
4. Drive through the full demo brief: Search → Artist pages → Playback → Queue → Library → Discover → Time Machine → Style Map → KB → Service Priority
5. Stop ffmpeg and exit fullscreen when done

## Key Details

- CDP port: 9224
- ffmpeg: available at system PATH (v5.1, confirmed)
- Artist slugs confirmed in live DB: slowdive, the-cure, nick-cave-the-bad-seeds, godspeed-you-black-emperor, boris, grouper
- COUNT_MS = 1200ms per "count" (natural pace, will look good at 6x speedup)
- Discover uses `.tag-chip` buttons for genre, `#country-input` for ISO country codes (JP, FI, IS, US, DE)
- Time Machine uses `#year-slider` range input with ArrowRight key presses
- Queue/settings drag uses `page.dragAndDrop()` (HTML5 drag API)

## Known Risks / What Might Need Adjustment

- **Playback**: Embedded player requires Bandcamp/SoundCloud links — Slowdive should have these but GYBE may not. If player doesn't load, the playback section will still run but player bar may be empty
- **Queue remove button**: Only visible on hover — script hovers first then clicks `.queue-remove`
- **Style Map node click**: D3 `circle` nodes may not be individually clickable via CDP locators — script has fallback to just `count(3)` if click fails
- **Settings Streaming tab**: No data-testid on tab — uses `clickText('Streaming')` fallback
- **Library**: Needs saved albums to show in the pane — if library is empty, left pane will be empty

## CDP Launch Fix (discovered this session)
The `printf` bash command was corrupting paths: `\t` in `src-tauri\target` was becoming a tab character. Fixed by using the Write tool to create the batch file. Ultimately replaced with `launch-cdp.mjs` which uses Node.js `child_process.spawn` for reliable env var injection.

## Git Status
All 21 press screenshots committed. New scripts (launch-cdp.mjs, record-demo.mjs, record-and-run.mjs) are untracked — commit after the recording runs successfully.

## After Recording
```bash
git add tools/launch-cdp.mjs tools/record-demo.mjs tools/record-and-run.mjs tools/snap.mjs
git commit -m "chore: add demo recording scripts (CDP launch + automated demo)"
```

Then update BUILD-LOG.md with the session summary.
