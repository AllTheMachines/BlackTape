---
phase: 28-ux-cleanup-scope-reduction
plan: 02
subsystem: ui
tags: [svelte5, artist-page, links, streaming-preference, musicbrainz]

# Dependency graph
requires: []
provides:
  - "Official homepage links sort first in artist page Links section (Bug #26)"
  - "Artist page self-loads streaming preference on mount (Bug #41)"
affects: [artist-page, streaming-preferences, links-section]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "officialHomepageUrls Set pattern: track MB type during loop, sort after — avoids restructuring existing categorize logic"
    - "Artist page self-sufficient preference load: page calls loadStreamingPreference() in own onMount, not relying solely on layout async load"

key-files:
  created: []
  modified:
    - src/routes/artist/[slug]/+page.ts
    - src/routes/artist/[slug]/+page.svelte

key-decisions:
  - "[28-02] officialHomepageUrls Set declared before MB relations loop, sort added after loop closes — minimal change, no restructuring of categorize logic"
  - "[28-02] loadStreamingPreference() called fire-and-forget in artist page onMount — artist page self-sufficient; layout's load is bonus redundancy, not dependency"

patterns-established:
  - "Track-then-sort pattern: accumulate priority items in a Set during the loop, sort the array once after — avoids mutating order mid-loop"

requirements-completed:
  - BUG-26
  - BUG-41

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 28 Plan 02: Artist Page Link Sorting + Streaming Preference Race Fix Summary

**Official website link sorted first in artist Links section via officialHomepageUrls Set; streaming preference loaded in artist page onMount to fix first-render sort race**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-26T07:37:12Z
- **Completed:** 2026-02-26T07:38:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Artist official website link now appears before blog/social links in the Links section (Bug #26)
- Streaming preference guaranteed fresh on initial artist page render (Bug #41)
- Both fixes are non-breaking: zero new dependencies, zero architectural changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix #26 — sort official homepage link first within official category** - `9668e80` (fix)
2. **Task 2: Fix #41 — ensure streaming pref is respected on initial artist page render** - `cfc038a` (fix)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/routes/artist/[slug]/+page.ts` - Added `officialHomepageUrls` Set and post-loop sort on `categorizedLinks.official`
- `src/routes/artist/[slug]/+page.svelte` - Import `loadStreamingPreference`, call it fire-and-forget in `onMount` Tauri block

## Decisions Made
- Used a pre-loop Set to track official homepage URLs rather than changing the categorize utility — keeps the fix isolated to the artist page loader
- Fire-and-forget `loadStreamingPreference()` call in artist `onMount` — the existing `sortedStreamingLinks` `$derived` is correct; the bug was only that `streamingPref.platform` was still `''` during the first render tick when layout async load hadn't resolved yet

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Both bugs were straightforward fixes matching the plan's analysis. TypeScript check passed cleanly with 0 errors on both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Artist page links and streaming preference now correctly reflect user settings on first render
- Ready to proceed with remaining Phase 28 plans (03–07)

---
*Phase: 28-ux-cleanup-scope-reduction*
*Completed: 2026-02-26*

## Self-Check: PASSED

- `src/routes/artist/[slug]/+page.ts` — FOUND, contains `officialHomepageUrls`
- `src/routes/artist/[slug]/+page.svelte` — FOUND, imports `loadStreamingPreference`
- `.planning/phases/28-ux-cleanup-scope-reduction/28-02-SUMMARY.md` — FOUND
- Commit `9668e80` — FOUND (Task 1)
- Commit `cfc038a` — FOUND (Task 2)
