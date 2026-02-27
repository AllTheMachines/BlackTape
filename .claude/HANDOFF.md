# Work Handoff - 2026-02-27

## Current Task
v1.7 screenshot session — capturing all 21 screens into `static/press-screenshots/v5/`

## Context
Running a full screenshot + QA pass of the v1.7 app. Steve provided a detailed spec (21 screens with specific bug fixes from v1.6). The script uses Tauri binary + CDP (Playwright). Screens 1-3 are now saved successfully after fixing the mode=tag issue.

## Progress

### Completed
- Committed BUILD-LOG.md from previous session
- Created `static/press-screenshots/v5/` output directory
- Wrote `tools/take-screenshots-v1.7.mjs` (full rewrite of v1.6 script)
- Fixed critical bug: screens 1-3 now use `mode=tag` (searchByTag) instead of `mode=artist` (FTS name search) — this was why jazz returned 0 results in v1.6
- Fixed: `scrollToDiscovery()` helper scrolls past local library section to show the discovery grid
- Fixed: `locator.fill()` replaces `keyboard.type()` for autocomplete (more reliable Svelte event dispatch)
- **3 screenshots saved** in `static/press-screenshots/v5/`:
  - `search-electronic-grid.png` ✓ (50 cards, 42 images loaded)
  - `search-jazz-grid.png` ✓ (50 cards, 48 images loaded — duplicate track bug still present: "You Ain't Really Down (Jazzanova's Hey Baby Remix) ×3")
  - `search-psychedelic-rock-grid.png` ✓ (50 cards, 38 images loaded)

### In Progress
- Script failing at **screen 4 (autocomplete)** — then CDP crashes

### Remaining
- Screens 4–21 still need to be captured:
  4. search-autocomplete.png
  5. artist-slowdive-discography.png
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

## Key Decisions / Root Causes Found

### Screen 4 (Autocomplete) — TWO bugs to fix in script:
1. **Home page has async DB check** — SearchBar only renders when `dbStatus === 'ready'`. The home page `+page.svelte` shows `<div class="loading"><p>Loading...</p></div>` while checking, then renders `<SearchBar size="large" />` only when ready. The 4000ms `isVisible()` timeout wasn't enough (or the DB check was taking longer). **Fix:** Wait for `dbStatus=ready` by polling for `input[type="search"]` with a longer timeout (8000ms), OR navigate to `/search?q=` (search page) instead of `/` — the search page always has a SearchBar visible.

2. **CDP dies after autocomplete attempt** — After logging "Search input not found on home page", `page.screenshot()` times out with 15000ms exceeded. This means WebView2 crashed or froze. The crash seems to happen after many navigations. The timing suggests the CDP connection becomes unstable after ~3-4 page navigations.

### Search mode clarification (confirmed):
- `mode=tag` → calls `searchByTag(provider, q)` → returns artists with that tag ✓ CORRECT for genre discovery grids
- `mode=artist` → calls `searchArtists(provider, q)` → FTS on artist names (wrong for "jazz", "electronic" etc.)
- "electronic" with mode=artist returned 50 results because many artist names contain "electronic"
- "jazz" with mode=artist returned 0 because no artists are named "jazz"

### Jazz duplicate tracks bug:
"You Ain't Really Down (Jazzanova's Hey Baby Remix)" appears ×3 in local library section. This is a data/library bug (not code). The screenshot scrolls past this to show the discovery grid, but the bug exists in the local library.

### CDP stability:
The WebView2 CDP crashes after extended use. Consider splitting the script into batches, or adding a CDP reconnect mechanism. The crash pattern: works for ~3-5 screens, then freezes on screenshot.

## Relevant Files
- `tools/take-screenshots-v1.7.mjs` — Main screenshot script (heavily modified)
- `static/press-screenshots/v5/` — Output directory (3 files so far)
- `src/routes/+page.svelte` — Home page (has async dbStatus check before SearchBar renders)
- `src/lib/components/SearchBar.svelte` — `input[type='search']`, placeholder="Search artists..." or "Search by tag..."
- `src/routes/search/+page.ts` — Search modes: `mode=tag` calls `searchByTag`, `mode=artist` calls `searchArtists`
- `BUILD-LOG.md` — Has uncommitted status block update

## Git Status
```
modified: BUILD-LOG.md               (status block update — uncommitted)
modified: tools/take-screenshots-v1.7.mjs   (full rewrite)
modified: static/press-screenshots/v5/search-electronic-grid.png   (new/updated)
modified: static/press-screenshots/v5/search-jazz-grid.png         (new/updated)
modified: static/press-screenshots/v5/search-psychedelic-rock-grid.png  (new/updated)
```

## Next Steps

1. **Fix screen 4 in script**: Change autocomplete test to use search page instead of home page:
   ```js
   await goto(page, '/search?q=Slo&mode=artist', 4000);
   // SearchBar is always visible on search page — no async DB check
   const searchInput = page.locator('input[type="search"]').first();
   await searchInput.fill('Slow');
   // poll for dropdown...
   ```
   OR: On home page, poll for `input[type="search"]` with longer timeout (10000ms) to wait past DB check.

2. **Fix CDP stability**: Add try/catch around each screen block so one failure doesn't abort the run. If CDP dies, catch the error and continue to next screen (saving a blank/error placeholder if needed). Critical — current script aborts completely if CDP dies mid-run.

3. **Re-run script** from screen 4 onward (screens 1-3 already saved, don't need to retake).

4. **After all 21 shots saved**: Compare against v1.6 shots, update slideshow in `src/routes/+page.svelte` with new strong shots.

5. **Commit everything**: `git add tools/take-screenshots-v1.7.mjs static/press-screenshots/v5/ BUILD-LOG.md && git commit -m "feat: v1.7 screenshot session + press-screenshots/v5"`

## Resume Command
After running `/clear`, run `/resume` to continue.
