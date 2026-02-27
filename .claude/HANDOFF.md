# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capture all 21 screens into `static/press-screenshots/v5/`

## Context
Running a full screenshot + QA pass of the v1.7 app for press/documentation. Script is running in background (task ID: `bgvizbfw0`). 10 of 21 screenshots captured.

## Progress

### Completed (10/21)
- `search-electronic-grid.png` ✓
- `search-jazz-grid.png` ✓
- `search-psychedelic-rock-grid.png` ✓
- `search-autocomplete.png` ✓
- `artist-slowdive-discography.png` ✓
- `artist-the-cure-discography.png` ✓ (bug: 500 error page captured)
- `artist-nick-cave-discography.png` ✓ (bug: likely 500 error)
- `artist-overview-tab.png` ✓ (bug: no overview tab found on any artist)
- `release-page-player.png` ✓ (bug: no release links found — now fixed)
- `player-bar-source.png` ✓ (bug: no platform pills)

### In Progress
- **Script running** — background task `bgvizbfw0`
- Screen 11 (queue panel): reconnected fresh CDP, navigating to `/artist/slowdive`, polling for release links

### Remaining (screens 11-21)
11. queue-panel.png — in progress (Slowdive, polling for releases)
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

## Root Cause Discovered

**The artist page has NO "Discography" tab.** Tabs are: Overview, Stats, About. The discography is in the Overview tab (the DEFAULT), loaded async via MusicBrainz API (2 sequential API calls, takes 5-20s).

**Previous failures (screens 9, 10, 11) were caused by:**
1. `tryClick` for non-existent Discography tab — wasted 3s, did nothing
2. Only waiting 2500ms — not enough for MB API response
3. `page.evaluate()` hanging on stale CDP session after many navigations
4. `navigateToArtist()` search-navigate pattern corrupting CDP state

## Key Fixes Applied This Session

1. **`alreadyDone()` on screens 8-10** — all skip cleanly on re-run
2. **`reconnectCDP()` before screens 9 and 11** — fresh Tauri instance guarantees clean state
3. **Direct slug navigation** — removed `navigateToArtist()` for screens 9-11, use `/artist/slowdive` etc. directly
4. **`safeEval()` helper** — `Promise.race(page.evaluate(...), 3s timeout)` prevents hanging
5. **Release link polling** — polls `a[href*="/release/"]` every 800ms up to 25 iterations (20s max)
6. **Removed bogus Discography tab click** — no such tab exists

## App Bugs Found (not script bugs)
- `/artist/the-cure` returns h1="500" — MusicBrainz API lookup failing
- `/artist/nick-cave-the-bad-seeds` same issue
- Artist overview tab has no content on any tested artist (Slowdive, Grouper, Boris, etc.) — feature not populated
- Release pages: no play/queue album buttons found (may be app feature not implemented)
- Platform pills not appearing on artist pages (links tab feature may need more load time)

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script
- `static/press-screenshots/v5/` — Output directory (10 files)
- `BUILD-LOG.md` — Has `<!-- status -->` block (needs cleanup when session ends)

## Next Steps

**Option A — Wait for script to finish:**
Check task `bgvizbfw0` output:
```
type "C:\Users\User\AppData\Local\Temp\claude\D--Projects-Mercury\tasks\bgvizbfw0.output"
```
Then check screenshots: `ls static/press-screenshots/v5/`

**Option B — If screen 11 hangs on release links:**
The `safeEval()` should timeout after 3s and retry. After 20s total, it'll log "No release links for Slowdive (timeout 20s)" and try Grouper, then Nick Cave. If all fail, it saves a bug screenshot.

The real fix needed is to understand WHY `a[href*="/release/"]` doesn't appear even after the MB API call. From the source: the discography renders when `data.releases.length > 0`. If the MB API returns 0 release groups for Slowdive (unlikely — they have 4 albums), or if the API fails silently, the section won't render.

**Option C — If script completes screens 12-21:**
Screens 12-21 are all pure route navigation (no artist API dependency), should work cleanly.

**After all 21 shots:**
1. Check `ls static/press-screenshots/v5/` — should have 21 files
2. Commit: `git add static/press-screenshots/v5/ BUILD-LOG.md tools/take-screenshots-v1.7.mjs && git commit -m "chore: v1.7 press screenshots + QA log"`
3. Update BUILD-LOG.md with session summary (remove status block)
4. Clear HANDOFF.md

## Resume Command
After running `/clear`, run `/resume` to continue.
