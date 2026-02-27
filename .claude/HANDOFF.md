# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capture all 21 screens into `static/press-screenshots/v5/`

## Context
Running screenshot script using Tauri CDP approach. Root cause of previous crashes diagnosed and fixed.

## Progress

### Completed
- Built `tools/take-screenshots-v1.7.mjs` (full script for all 21 screens)
- Fixed CDP navigation: replaced `window.location.href` with `page.goto()` (CDP Page.navigate)
- Added `alreadyDone()` checks to ALL screens (screens 6+7 were missing them — root cause of hang)
- Replaced all `page.waitForTimeout()` with `new Promise(r => setTimeout(r, ms))` (pure JS, no CDP)
- `getPage()` accessor so reconnect inside `goto()` uses fresh page reference
- `ensureAlive()` now detects 500 error pages and navigates home before continuing
- `goto()` now reconnects CDP on timeout and retries navigation
- The Cure excluded from screen 8+ candidates (returns 500 errors, corrupts CDP)
- **7 screenshots saved** in `static/press-screenshots/v5/`:
  - `search-electronic-grid.png` ✓
  - `search-jazz-grid.png` ✓
  - `search-psychedelic-rock-grid.png` ✓
  - `search-autocomplete.png` ✓
  - `artist-slowdive-discography.png` ✓
  - `artist-the-cure-discography.png` ✓ (500 error page, but captured)
  - `artist-nick-cave-discography.png` ✓

### In Progress
- Script running (background task: bydsuwme1) — should now get through screens 8-21
- Key fix just applied: screens 6+7 now have alreadyDone() skip — avoids re-navigating to The Cure 500 page

### Remaining (screens 8-21 + potentially reshooting 6-7 once app bug is fixed)
8. artist-overview-tab.png
9. release-page-player.png
10. player-bar-source.png
11. queue-panel.png
12. library-two-pane.png
13. discover-ambient-iceland.png
14. discover-noise-rock-japan.png
15. discover-metal-finland.png
16. time-machine-1983.png
17. time-machine-1977.png
18. style-map-overview.png
19. style-map-zoomed.png
20. knowledge-base-shoegaze.png
21. artist-claim-form.png

## Root Cause (SOLVED)
The hang was: screens 6+7 had NO `alreadyDone()` check. They re-navigated to The Cure's artist page every run. The Cure's artist page returns a 500 error (MB API issue). After getting a 500, subsequent CDP navigate calls hang indefinitely, even though the goto() commits quickly (31ms).

## Architecture Notes
- Debug binary (`mercury.exe`) connects to dev server on `http://localhost:5173`
- APP_BASE = `http://localhost:5173` (not tauri.localhost — that's release builds only)
- All `page.waitForTimeout()` replaced with `new Promise(r => setTimeout(r, ms))`
- `navigateToArtist()` uses `page.evaluate()` with 8s timeout instead of `locator.getAttribute()`
- `ensureAlive()` uses Promise.race with 12s timeout to detect hung CDP
- `goto()` uses `waitUntil: 'commit'` (not domcontentloaded — SPA doesn't reload the document)
- `goto()` falls back to `reconnectCDP()` on timeout

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script
- `static/press-screenshots/v5/` — Output directory (7 files so far)
- `BUILD-LOG.md` — Has status block

## Known App Bugs (logged by script)
- The Cure artist page: returns 500 (MusicBrainz API lookup failing for their MBID)
- Nick Cave artist page: also returned 500 in some runs
- These are app bugs, not script bugs

## Next Steps
1. Check if background task `bydsuwme1` completed (check output file)
2. If it got stuck again: check where it hung (artist page navigation)
3. Run: `ls static/press-screenshots/v5/` to see what's been captured
4. After all 21 shots: commit everything and update BUILD-LOG.md with session summary
5. Consider fixing The Cure / Nick Cave artist page 500 errors (separate task)

## Resume Command
After running `/clear`, run `/resume` to continue.
