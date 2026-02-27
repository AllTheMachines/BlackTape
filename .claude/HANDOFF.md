# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capture all 21 screens into `static/press-screenshots/v5/`

## Context
Running a full screenshot + QA pass of the v1.7 app for press/documentation. CDP/WebView2 crashes were debugged and largely fixed. Script is actively running in background. 7 of 21 screenshots captured.

## Progress

### Completed
- `search-electronic-grid.png` ✓
- `search-jazz-grid.png` ✓
- `search-psychedelic-rock-grid.png` ✓
- `search-autocomplete.png` ✓
- `artist-slowdive-discography.png` ✓
- `artist-the-cure-discography.png` ✓ (500 error page captured — app bug)
- `artist-nick-cave-discography.png` ✓ (likely 500 error page — app bug)

### In Progress
- **Script running** — background task `bydsuwme1`
- Last seen: navigated to `/artist/nick-cave-the-bad-seeds` for screen 8 (overview tab)
- Screen 8 is iterating candidates: Slowdive (no overview tab), GY!BE (no results), Grouper (no overview tab), Nick Cave (navigated, waiting...)
- Nick Cave's artist page likely also returns 500. The `waitForDiscographyCovers` 18s timeout will expire, then `ensureAlive()` before screen 9 will detect+reset
- After screen 8, screens 9-21 should run. Screens 13-21 (Discover, Time Machine, Style Map, KB, Claim Form) don't need artist navigation — expect them to be stable.

### Remaining (screens 8-21)
8. artist-overview-tab.png — in progress
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

## Key Decisions & Fixes Applied This Session

1. **CDP navigation fix**: replaced `window.location.href` via `page.evaluate()` with `page.goto()` (CDP Page.navigate). Previous approach destroyed the JS context on every navigation.

2. **`alreadyDone()` checks missing on screens 6+7**: Root cause of most hangs. Screens 6+7 re-navigated to The Cure's 500-error page every run, corrupting the CDP session. Fixed by wrapping those screens in `alreadyDone()` blocks like screen 5.

3. **Pure JS timers**: All `page.waitForTimeout()` replaced with `new Promise(r => setTimeout(r, ms))`. CDP-based timers hang when the session is unstable.

4. **Auto-reconnect**: `goto()` now catches timeouts, calls `reconnectCDP()`, and retries. Proved working (Grouper search reconnected successfully).

5. **`ensureAlive()` upgraded**: Uses `Promise.race` with 12s timeout. Detects h1="500" error pages and navigates home before continuing.

6. **`getPage()` accessor**: Module-level `page` variable accessed via `getPage()` inside `goto()` to get fresh reference after reconnects (avoids parameter shadowing).

7. **The Cure excluded from screen 8+ candidates**: Returns 500 from MusicBrainz API, corrupts CDP.

## App Bugs Found (not script bugs)
- `/artist/the-cure` returns h1="500" — MusicBrainz API lookup failing for their MBID
- `/artist/nick-cave-the-bad-seeds` likely same issue
- These artists should also be excluded from screens 9-11 candidate lists

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script (heavily modified this session)
- `static/press-screenshots/v5/` — Output directory (7 files)
- `BUILD-LOG.md` — Has `<!-- status -->` block (needs cleanup when session ends)

## Git Status
```
modified: BUILD-LOG.md    (status block update — uncommitted)
modified: parachord-reference (submodule, ignore)
tools/take-screenshots-v1.7.mjs is NOT tracked by git (it's in .gitignore or untracked — check)
```

## Next Steps

**Option A — Let it run:**
Wait for background task `bydsuwme1` to finish. Check output:
```
type "C:\Users\User\AppData\Local\Temp\claude\D--Projects-Mercury\tasks\bydsuwme1.output"
```
Then check what screenshots landed: `ls static/press-screenshots/v5/`

**Option B — If stuck again on Nick Cave (screen 8):**
Kill the task, add Nick Cave to excluded list in screen 8 candidates, also check screens 9-11 candidate lists and remove The Cure + Nick Cave from those too. Then rerun.

**Option C — If screens 9-21 fail:**
The release page (screen 9) uses `page.locator('a[href*="/release/"]').first().getAttribute()` — this locator call can hang just like the old artist card lookup. Replace with `page.evaluate(() => document.querySelector('a[href*="/release/"]')?.getAttribute('href'))` if needed.

**After all 21 shots:**
1. Commit everything: `git add BUILD-LOG.md tools/take-screenshots-v1.7.mjs && git commit -m "v1.7 screenshot pass"`
2. Update BUILD-LOG.md with session summary (remove status block)
3. Update HANDOFF.md (clear it)

## Resume Command
After running `/clear`, run `/resume` to continue.
