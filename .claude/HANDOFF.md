# Work Handoff - 2026-02-27

## Current Task
Manual screenshot session — capture remaining 6 screens for v1.7 press screenshots into `press-screenshots/v5/`

## Context
v5 screenshot run had 500 errors on all artist pages. Root cause found and fixed: the v1.7 script used `page.goto()` (Playwright hard navigation) which tears down the WebView2/Tauri bridge context. v1.6 used `window.location.href` (SPA navigation) which keeps the bridge alive. Fixed the goto() function and switched artist pages to direct slug navigation.

## Progress

### Completed (15/21 — already in press-screenshots/v5/)
- search-electronic-grid.png ✓
- search-jazz-grid.png ✓
- search-psychedelic-rock-grid.png ✓
- search-autocomplete.png ✓
- discover-ambient-iceland.png ✓
- discover-noise-rock-japan.png ✓
- discover-metal-finland.png ✓
- library-two-pane.png ✓
- player-bar-source.png ✓
- queue-panel.png ✓
- release-page-player.png ✓
- style-map-overview.png ✓
- style-map-zoomed.png ✓
- time-machine-1977.png ✓
- time-machine-1983.png ✓

### Remaining (6/21)
1. `artist-slowdive-discography.png` — navigate to Slowdive artist page
2. `artist-the-cure-discography.png` — navigate to The Cure artist page
3. `artist-nick-cave-discography.png` — navigate to Nick Cave artist page
4. `artist-overview-tab.png` — any artist, Overview tab with content
5. `knowledge-base-shoegaze.png` — /kb/genre/post-punk (or similar with description)
6. `artist-claim-form.png` — /claim page

## Key Decisions
- **Root cause of 500s**: `page.goto()` = hard browser navigation = destroys Tauri invoke bridge. `window.location.href` = SPA navigation = keeps bridge alive. Fixed in goto() function.
- **Direct slug navigation**: Artist pages now go directly to `/artist/slug` instead of through search results page.
- **Confirmed slugs from live DB** (`C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db`):
  - Slowdive → `slowdive`
  - The Cure → `the-cure`
  - Nick Cave & the Bad Seeds → `nick-cave-the-bad-seeds`
  - Godspeed You! Black Emperor → `godspeed-you-black-emperor`
- **Output folder**: `D:/Projects/Mercury/press-screenshots/v5/` (NOT static/press-screenshots/v5/)
- **Manual session**: Script auto-run was blocked by user. Switched to manual: Steve navigates, Claude screenshots via CDP.

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Screenshot script (fixed: goto uses window.location.href, direct slug nav, correct OUT path)
- `tools/snap.mjs` — NEW: one-shot screenshot tool (`node tools/snap.mjs filename.png`)
- `press-screenshots/v5/` — Output folder (15 good files, 6 still needed)
- `BUILD-LOG.md` — Has uncommitted changes (status block, needs cleanup at session end)

## CDP Setup
The app must be launched with CDP enabled via env var. The `snap.mjs` tool connects to port 9224.

**Launch command** (run in cmd.exe, NOT bash — env var must be set in same shell):
```
taskkill /f /im mercury.exe
set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9224
D:\Projects\Mercury\src-tauri\target\debug\mercury.exe
```
Then verify CDP: `curl http://127.0.0.1:9224/json/version`

**Take a screenshot**: `node tools/snap.mjs filename.png`

## Manual Session Workflow
Steve navigates to the right place in the app, says "ready", Claude runs:
```bash
cd /d/Projects/Mercury && node tools/snap.mjs <filename.png>
```

### Navigation instructions for each remaining screen:

1. **artist-slowdive-discography.png**
   - Type "Slowdive" in homepage search → click Slowdive in autocomplete/results

2. **artist-the-cure-discography.png**
   - Type "The Cure" in homepage search → click The Cure

3. **artist-nick-cave-discography.png**
   - Type "Nick Cave" in homepage search → click "Nick Cave & the Bad Seeds"

4. **artist-overview-tab.png**
   - Go to any working artist page → click "Overview" tab → confirm there's content

5. **knowledge-base-shoegaze.png**
   - Click "Knowledge Base" in left nav → navigate to any genre with a description

6. **artist-claim-form.png**
   - Click "Profile" or navigate to /claim page (artist claim form)

## Git Status
```
M  BUILD-LOG.md       (status block — clean up at session end)
?? tools/snap.mjs     (new file, untracked)
```
Note: `tools/take-screenshots-v1.7.mjs` changes were already staged/committed in earlier auto-saves.

## After All 6 Done
```bash
git add press-screenshots/v5/ tools/snap.mjs tools/take-screenshots-v1.7.mjs BUILD-LOG.md
git commit -m "chore: v1.7 press screenshots complete + script fixes"
```
Then update BUILD-LOG.md with session summary and remove `<!-- status -->` block.

## Resume Command
After running `/clear`, run `/resume` to continue.
