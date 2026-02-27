# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capture all 21 screens into `static/press-screenshots/v5/`

## Context
Running a full screenshot + QA pass of the v1.7 app for press/documentation. 19/21 screenshots captured. Script crashed at screen 20 (Knowledge Base) with "Target page, context or browser has been closed" after a CDP reconnect. Need 2 more: `knowledge-base-shoegaze.png` and `artist-claim-form.png`.

## Progress

### Completed (19/21)
- `search-electronic-grid.png` ✓
- `search-jazz-grid.png` ✓
- `search-psychedelic-rock-grid.png` ✓
- `search-autocomplete.png` ✓
- `artist-slowdive-discography.png` ✓
- `artist-the-cure-discography.png` ✓ (bug: 500 error page)
- `artist-nick-cave-discography.png` ✓ (bug: 500 error page)
- `artist-overview-tab.png` ✓ (bug: no overview content on any artist)
- `release-page-player.png` ✓ (bug: no release links found)
- `player-bar-source.png` ✓ (bug: no platform pills)
- `queue-panel.png` ✓ (had 12 cached items from prior run)
- `library-two-pane.png` ✓ (expected bug: no local music folder)
- `discover-ambient-iceland.png` ✓ (50 results)
- `discover-noise-rock-japan.png` ✓ (41 results)
- `discover-metal-finland.png` ✓ (50 results)
- `time-machine-1983.png` ✓ (50 artists, post-punk filter)
- `time-machine-1977.png` ✓ (50 artists, punk filter)
- `style-map-overview.png` ✓
- `style-map-zoomed.png` ✓ (bug: zoom transform unchanged)

### In Progress
Nothing running. Script crashed, needs re-run.

### Remaining (2/21)
20. `knowledge-base-shoegaze.png` — crashed during this screen
21. `artist-claim-form.png` — never reached

## Key Decisions & Root Causes Found

### Artist page — NO Discography tab
The artist page tabs are **Overview / Stats / About** only. There is NO separate Discography tab. The discography section lives inside the Overview tab and is loaded async via TWO sequential MusicBrainz API calls (can take 5-20s). This explains why all prior scripts failed to find release links — they weren't waiting long enough.

### Why release links still fail after fix
Even with 20s polling, `a[href*="/release/"]` never appears. Root cause: MusicBrainz rate-limiting. After dozens of API calls during this session (3 calls per artist page × many artists × many reconnects), the MB API is refusing/timing out requests. The discography just never loads.

### page.evaluate() hangs
After many navigations and CDP reconnects, `page.evaluate()` without a timeout hangs indefinitely. Fixed with `safeEval()` pattern: `Promise.race([page.evaluate(fn), new Promise(rej => setTimeout(rej, 3000))])`

### navigateToArtist() corrupts CDP state
Using search → artist-card → artist-page causes state corruption after artist page visits. Fixed by using direct slug navigation (`/artist/slowdive` etc.) for screens 9-11.

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script (heavily modified this session)
- `static/press-screenshots/v5/` — Output directory (19 files)
- `BUILD-LOG.md` — Has `<!-- status -->` block (needs cleanup when session ends)
- `src/routes/artist/[slug]/+page.ts` — Artist page load function (3 MB API calls, async)
- `src/routes/artist/[slug]/+page.svelte` — Tab structure: overview/stats/about (NO discography tab)

## Script State
Screens 1-11 have `alreadyDone()` wrappers — they skip instantly.
Screens 12-19 have NO `alreadyDone()` wrappers — they re-run but `save()` skips existing files. Takes ~2-3 minutes to re-run these before reaching screen 20.

**Last edit before context ran out:** Added `alreadyDone('queue-panel.png')` wrapper to screen 11 (closing brace NOT added yet — script may be syntactically broken). Check line ~736 in the script.

## Git Status
```
M  BUILD-LOG.md           (status block update, needs cleanup at session end)
M  tools/take-screenshots-v1.7.mjs  (heavily modified)
?? static/press-screenshots/v5/  (9 new files this session)
```
Previously captured (already committed or untracked from earlier):
- artist-*.png, search-*.png, player-bar-source.png, release-page-player.png

## Next Steps

### 1. Fix script syntax first
Check that screen 11's `alreadyDone()` wrapper is complete. Open `tools/take-screenshots-v1.7.mjs` around line 736 and verify it has:
```js
console.log('\n--- 11. Queue panel ---');
if (alreadyDone('queue-panel.png')) { console.log('  ⊘ skip'); } else {
  await reconnectCDP();
  ...
  await save(page, 'queue-panel.png');
} // end screen 11   ← this closing brace may be missing
```

### 2. Add alreadyDone for screens 12-19 (optional but speeds things up)
Each screen 12-19 block can be wrapped to save ~3 min:
```js
if (alreadyDone('library-two-pane.png')) { console.log('  ⊘ skip'); } else { ... }
```
Files that exist: library-two-pane, discover-ambient-iceland, discover-noise-rock-japan, discover-metal-finland, time-machine-1983, time-machine-1977, style-map-overview, style-map-zoomed

### 3. Fix screen 20 crash
Screen 20 (line ~1009) crashes with "Target page closed" after a reconnect.
Fix: add `reconnectCDP()` before screen 20, and change `page.evaluate` to `getPage().evaluate` at line 1018.
```js
console.log('\n--- 20. Knowledge Base: post-punk ---');
await reconnectCDP(); // fresh start
...
const kbChecks = await getPage().evaluate(() => { ... }); // not page.evaluate
```

### 4. Run the script
```bash
cd /d/Projects/Mercury && node tools/take-screenshots-v1.7.mjs
```

### 5. After all 21 done
```bash
git add static/press-screenshots/v5/ BUILD-LOG.md tools/take-screenshots-v1.7.mjs
git commit -m "chore: v1.7 press screenshots + QA pass"
```
Then update BUILD-LOG.md with session summary and remove the `<!-- status -->` block.

## Resume Command
After running `/clear`, run `/resume` to continue.
