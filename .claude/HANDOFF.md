# Work Handoff - 2026-02-25

## Current Task
Fixing all 14 open GitHub issues autonomously (AllTheMachines/Mercury repo)

## Context
User asked to work through all GitHub issues autonomously while they were away. There are 14 issues from a Feb 25 UAT session plus 2 older issues from Feb 23. Context ran out mid-session, so this handoff saves state to resume.

## Progress

### Completed
- **#6 Time Machine slider**: Capped slider max at current year (`THIS_YEAR = new Date().getFullYear()`), both in the UI (`max={Math.min(activeDecade.end, THIS_YEAR)}`) and the DB query (added `AND a.begin_year <= strftime('%Y', 'now')` to both branches of `getArtistsByYear` in `src/lib/db/queries.ts`)

### In Progress
- Nothing mid-edit — the two fixes above are complete but not yet committed.

### Remaining (in priority order)
1. **#12 Spacebar restarts playback** — Need to:
   - Add global `keydown` handler to `src/routes/+layout.svelte` that calls `togglePlayPause()` when spacebar pressed and no text input is focused
   - Remove `' '` (spacebar) from TrackRow's keydown handler in `src/lib/components/TrackRow.svelte` line 64 — currently `if (e.key === 'Enter' || e.key === ' ') handlePlay()` — spacebar on a focused track row calls `setQueue()` which restarts playback
2. **#13 Duplicate streaming links (two Deezer entries)** — In `src/routes/artist/[slug]/+page.ts`, deduplicate `categorizedLinks.streaming` by hostname after building the array. The current `seen` Set deduplicates by full URL but not by domain.
3. **#11 Search autocomplete no keyboard nav** — Add `activeIndex` state + `keydown` handler to `src/lib/components/SearchBar.svelte` for arrow keys (↑/↓), Enter (select), Escape (close).
4. **#10 Volume not persisted** — In `src/lib/player/audio.svelte.ts`, save volume to `localStorage` in `setVolume()` and restore in `initAudio()`.
5. **#7 Crate dig decade filter broken** — In `src/routes/crate/+page.svelte`, change `bind:value={selectedDecade}` (object binding) to bind to index or label string, then look up the decade object. Svelte 5 object binding on `<select>` can be unreliable. Also verify country filter actually calls `dig()` correctly.
6. **#5 Back nav broken in Tauri** — In Tauri mode, the header (which has the back button) is hidden (`class:hidden={tauriMode}`). Add a back button to `src/lib/components/ControlBar.svelte`.
7. **#14 Play All/Queue All do nothing** — `topPlayerTracks` in `src/routes/artist/[slug]/+page.svelte` is always empty (stub). Disable the buttons when empty and add tooltip "Library track matching coming soon" OR remove the buttons entirely until the feature is ready.
8. **#9 Profile page 500** — Profile page code looks correct. Might be transient. Check if the issue reproduces — if not, close as "cannot reproduce / transient."
9. **#4 Discover empty gray boxes** — ArtistCard has no image loading. This requires a feature addition. Low priority unless quick win possible.
10. **#3 Dark theme / typography** — Design enhancement, skip or defer.
11. **#8 Library cover art** — Needs Rust changes to read embedded ID3 tags. Skip for now.
12. **#2 Library filter bar non-functional** (2 days old) — **OBSOLETE**. The filter/tag bar no longer exists in the redesigned `LibraryBrowser.svelte`. Close this issue.
13. **#1 Library clicking artist shows albums** (2 days old) — Still partially valid: the `album-list-artist` text in `LibraryBrowser.svelte` is not clickable. Make it navigate to `/search?q={album.artist}` or look up the artist slug.

## Key Decisions
- Issues #2 is obsolete — the library filter bar was removed in a redesign. Close it on GitHub.
- Issue #9 (Profile 500) is likely transient — verify before spending time on it.
- Issues #3, #4, #8 are larger feature work — defer unless they have a quick fix.
- For #12 (spacebar): the root cause is TrackRow's keydown handler consuming spacebar AND triggering `setQueue()` which restarts the track. Fix both: (1) global handler for space → togglePlayPause, (2) remove space from TrackRow keydown.

## Relevant Files
- `src/routes/time-machine/+page.svelte` — Fixed (issue #6): slider capped, `THIS_YEAR` const
- `src/lib/db/queries.ts` — Fixed (issue #6): `getArtistsByYear` now filters `begin_year <= current_year`
- `src/lib/components/TrackRow.svelte:64` — Needs fix (#12): remove `' '` from keydown handler
- `src/routes/+layout.svelte` — Needs fix (#12): add global spacebar → togglePlayPause handler
- `src/routes/artist/[slug]/+page.ts` — Needs fix (#13): deduplicate streaming links by hostname
- `src/lib/components/SearchBar.svelte` — Needs fix (#11): add keyboard nav to autocomplete
- `src/lib/player/audio.svelte.ts` — Needs fix (#10): persist volume to localStorage
- `src/routes/crate/+page.svelte` — Needs fix (#7): fix decade select binding
- `src/lib/components/ControlBar.svelte` — Needs fix (#5): add back button
- `src/routes/artist/[slug]/+page.svelte:233-238` — Needs fix (#14): disable Play All/Queue All when no tracks
- `src/lib/components/LibraryBrowser.svelte:70-73` — Needs fix (#1): make artist name clickable

## Git Status
```
modified: BUILD-LOG.md
modified: src/lib/db/queries.ts          (+2 lines: future year filter in getArtistsByYear)
modified: src/routes/time-machine/+page.svelte  (+3/-2: THIS_YEAR const, slider max capped)
```

## Next Steps
1. Commit the two completed fixes (#6)
2. Fix #12 (spacebar): edit TrackRow.svelte and +layout.svelte
3. Fix #13 (duplicate streaming): edit artist/[slug]/+page.ts
4. Fix #11 (autocomplete keyboard): edit SearchBar.svelte
5. Fix #10 (volume persist): edit audio.svelte.ts
6. Fix #7 (crate dig): edit crate/+page.svelte
7. Fix #5 (back button): edit ControlBar.svelte
8. Fix #14 (Play All stub): edit artist/[slug]/+page.svelte
9. Close #2 as obsolete: `gh issue close 2 --repo AllTheMachines/Mercury --comment "Obsolete: the filter/tag bar was removed in the library redesign."`
10. Run `npm run check` to verify all TypeScript/Svelte checks pass
11. Close each issue on GitHub as fixed

## Resume Command
After running `/clear`, run `/resume` to continue seamlessly.
