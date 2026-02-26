---
phase: 28-ux-cleanup-scope-reduction
plan: "03"
subsystem: ui
tags: [scene-detection, artist-links, musicbrainz, tauri, typescript]

# Dependency graph
requires:
  - phase: 28-02
    provides: artist page load function structure (categorizedLinks, streaming pref fix)

provides:
  - DEAD_DOMAINS blocklist (12 defunct domains) exported from categorize.ts
  - filterDeadLinks() function filtering CategorizedLink[] arrays
  - libraryArtistNames Set in detectScenes() — library as secondary scene signal
  - validateListenerOverlap() augmented with artistNames + libraryArtistNames params

affects:
  - Phase 28 Plan 07 (test manifest — may want tests for DEAD_DOMAINS and filterDeadLinks exports)
  - Any future scene detection changes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead domain blocklist: Set<string> of hostname strings, URL.hostname.replace(/^www\\./, '') for matching"
    - "Library-as-signal: invoke get_library_tracks with graceful try/catch, extract display names as lowercased Set"
    - "Secondary signal via name matching: when MBID-based matching is unavailable, display name comparison is the fallback"

key-files:
  created: []
  modified:
    - src/lib/scenes/detection.ts
    - src/lib/embeds/categorize.ts
    - src/routes/artist/[slug]/+page.ts

key-decisions:
  - "[28-03]: libraryArtistNames populated in detectScenes() not validateListenerOverlap() — function receives precomputed Set rather than fetching twice per cluster"
  - "[28-03]: filterDeadLinks applied inside if (mbLinksResponse.ok) block — import scope requires it; all 6 categories filtered in single for-of loop"
  - "[28-03]: Library name matching is case-insensitive toLowerCase().trim() — MusicBrainz display names may differ in capitalization from file tags"
  - "[28-03]: validateListenerOverlap() signature changed to accept (artistMbids, artistNames, libraryArtistNames) — callers updated; only one call site existed"

patterns-established:
  - "Graceful Tauri invoke fallback: wrap optional invoke calls in try/catch, proceed with empty Set/array on failure"
  - "Dead link filtering: silent removal (no error state, no placeholder) — cleaner UX than showing broken links"

requirements-completed: [BUG-23, BUG-27]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 28 Plan 03: Scene Detection Library Signal + Dead Link Filter Summary

**Library artist names as secondary scene signal (Bug #23) and dead domain blocklist silently filtering 12 defunct services from artist pages (Bug #27)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T20:03:50Z
- **Completed:** 2026-02-26T20:07:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Scene detection now surfaces scenes from local music library (album_artist/artist display name matching), not just explicitly favorited artists
- Artist external links silently drop geocities.com, myspace.com, grooveshark.com, and 9 other permanently-defunct domains before they reach the UI
- Both fixes are gracefully defensive — library unavailable = fallback to favorites-only; MB fetch fails = links unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix #23 — include local library artists in scene detection** - `ebefd02` (fix)
2. **Task 2: Fix #27 — filter dead/defunct link domains from artist pages** - `a8ba90e` (fix)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified

- `src/lib/scenes/detection.ts` — Added `get_library_tracks` invoke in `detectScenes()`, builds `libraryArtistNames` Set; `validateListenerOverlap()` signature extended with `artistNames` + `libraryArtistNames` params; name-based matching added alongside MBID check
- `src/lib/embeds/categorize.ts` — Added `DEAD_DOMAINS` Set (12 defunct hostnames) and `filterDeadLinks(links: CategorizedLink[]): CategorizedLink[]` exported function
- `src/routes/artist/[slug]/+page.ts` — Extended existing dynamic import to include `filterDeadLinks`; applied to all 6 categorized link categories inside `if (mbLinksResponse.ok)` block

## Decisions Made

- `libraryArtistNames` is built once in `detectScenes()` and passed to `validateListenerOverlap()` rather than fetching inside the function — avoids one Tauri invoke per cluster (30 clusters max)
- `filterDeadLinks` applied before streaming deduplication — order doesn't matter for correctness but this matches logical flow (categorize → filter dead → dedup streaming)
- `filterDeadLinks` placed inside `if (mbLinksResponse.ok)` block because the dynamic import bringing it into scope is also inside that block
- Library name match uses `toLowerCase().trim()` — tag metadata in audio files often differs in capitalization from MusicBrainz canonical names

## Deviations from Plan

None — plan executed exactly as written.

The one minor implementation choice: the plan suggested moving `filterDeadLinks` import inside the `if (mbLinksResponse.ok)` block alongside the existing import. The original plan text implied adding a separate import call, but combining into the existing destructure was cleaner and equivalent. This is not a deviation — the plan explicitly said to extend the existing import line.

## Issues Encountered

Minor scoping issue: first attempt placed the `filterDeadLinks` call outside the `if (mbLinksResponse.ok)` block, causing a TypeScript "Cannot find name" error since the import is scoped to that block. Fixed by moving the filter loop inside the block before its closing brace. One extra iteration with `npm run check` to confirm.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Bug #23 and Bug #27 resolved
- Phase 28 Plan 07 (test manifest) may add code checks for `DEAD_DOMAINS` export and `filterDeadLinks` export in categorize.ts
- `validateListenerOverlap()` is exported but its new signature is a breaking change — only one internal call site existed, already updated

## Self-Check: PASSED

- FOUND: src/lib/scenes/detection.ts (contains libraryArtistNames Set — confirmed 5 occurrences)
- FOUND: src/lib/embeds/categorize.ts (exports DEAD_DOMAINS Set and filterDeadLinks function)
- FOUND: src/routes/artist/[slug]/+page.ts (imports and applies filterDeadLinks)
- FOUND: .planning/phases/28-ux-cleanup-scope-reduction/28-03-SUMMARY.md
- FOUND commit: ebefd02 (fix(28-03): include local library artists in scene detection (#23))
- FOUND commit: a8ba90e (fix(28-03): filter dead/defunct link domains from artist pages (#27))
- npm run check: 0 errors, 8 warnings (pre-existing, not introduced by this plan)

---
*Phase: 28-ux-cleanup-scope-reduction*
*Completed: 2026-02-26*
