# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capture all 21 screens into `static/press-screenshots/v5/`

## Context
Running a full screenshot + QA pass of the v1.7 app. 5 of 21 screens are done. The CDP/WebView2 approach is fundamentally broken for this — every run gets through screens 1-5 (now skipped) and crashes on screen 6 with "Fatal: eval timeout". The approach needs to change.

## Progress

### Completed
- Built `tools/take-screenshots-v1.7.mjs` (full script for all 21 screens)
- Added skip-if-exists to `save()` so re-runs skip already-done screens
- Added `ensureAlive()` + `reconnectCDP()` for crash recovery
- Added `evalWithTimeout()` wrapper and monkey-patched `page.evaluate` with 8s timeout
- **5 screenshots saved** in `static/press-screenshots/v5/`:
  - `search-electronic-grid.png` ✓
  - `search-jazz-grid.png` ✓
  - `search-psychedelic-rock-grid.png` ✓
  - `search-autocomplete.png` ✓
  - `artist-slowdive-discography.png` ✓

### In Progress
- **BLOCKED** — script crashes at screen 6 every single time

### Remaining
Screens 6–21 still need capture:
6. artist-the-cure-discography.png
7. artist-nick-cave-discography.png
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

## Root Cause Analysis

The crash is **not a script bug** — it's a fundamental CDP/WebView2 reliability issue.

**What happens:**
1. Script connects to Tauri via CDP (WebView2 remote debugging)
2. `goto()` navigates by setting `window.location.href` via `page.evaluate()`
3. Setting location.href destroys the current page context → the evaluate() never resolves
4. After navigation, the new page's evaluate() context takes >8s to become available
5. The monkey-patched 8s timeout fires → "Fatal: eval timeout"

**Why screens 1-5 worked but 6 doesn't:**
Screens 1-5 navigate to `/search?q=...` (SPA route change, same page context). Screen 6 uses `navigateToArtist()` which does TWO navigations (search page → artist page), which causes double context destruction.

## The Fix (DO THIS NEXT)

**Switch from CDP/Tauri to Playwright's own browser + dev server.**

Instead of connecting to the Tauri binary via CDP, launch a regular Playwright Chromium browser directly to `http://localhost:5173`. The app content is identical — Tauri just wraps it. The screenshots won't have the desktop window chrome but the UI content is the same.

**Changes needed in `tools/take-screenshots-v1.7.mjs`:**

1. Remove Tauri binary launch + CDP connection entirely
2. Replace `launchTauri()` with:
```js
async function launchBrowser() {
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  page = await context.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  console.log('Browser ready:', page.url());
}
```
3. Change all `goto(page, '/route', ms)` to use `page.goto('http://localhost:5173/route')` — Playwright's native navigation handles page context correctly, never hangs
4. Remove monkey-patch, evalWithTimeout, reconnectCDP — no longer needed
5. Keep all the screen capture logic (it's all correct)

The dev server is already running on port 5173. This approach is simpler, faster, and stable.

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script (heavily modified, see below)
- `static/press-screenshots/v5/` — Output directory (5 files so far)
- `BUILD-LOG.md` — Has uncommitted status block

## Git Status
```
modified: BUILD-LOG.md               (status block — uncommitted)
modified: tools/take-screenshots-v1.7.mjs   (CDP fixes that didn't work)
modified: parachord-reference        (submodule, ignore)
```

## Next Steps

1. **Rewrite `launchTauri()` → `launchBrowser()`** using Playwright's native Chromium launch (not CDP). Remove all CDP-specific code.
2. **Change `goto()` helper** to use `page.goto('http://localhost:5173' + route)` instead of `page.evaluate(r => { window.location.href = r; }, route)` — this is the real fix.
3. **Remove monkey-patch + evalWithTimeout** — these were band-aids for the wrong problem.
4. **Run the script** — dev server is already running on 5173, just needs the browser approach.
5. **After all 21 shots**: commit everything and update BUILD-LOG.md.

## Resume Command
After running `/clear`, run `/resume` to continue.
