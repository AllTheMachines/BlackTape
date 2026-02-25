---
phase: 27-search-knowledge-base
plan: 03
subsystem: search
tags: [svelte, typescript, search, intent-parsing, ui]

# Dependency graph
requires:
  - phase: 27-01
    provides: "parseSearchIntent, searchByCity, searchByLabel, SearchIntent type"
provides:
  - "Search page intent routing — city/label queries routed to correct query function"
  - "Intent confirmation chip — City:/Label: chip above results for intent-parsed queries"
  - "Per-result match badges — matchReason prop set to City/Label/Tag/Name match"
  - "Intent-aware results summary text"
affects:
  - src/routes/search/+page.ts
  - src/routes/search/+page.svelte
  - 27-05 (test manifest — P27-10..P27-14 verify this plan's artifacts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intent routing pattern: parseSearchIntent result dispatches to typed query function before results returned"
    - "EMPTY_INTENT constant for all empty/error return paths — avoids redundant object literals"
    - "Ternary chain for matchReason — reads like a priority list (city > label > tag > name)"

key-files:
  created: []
  modified:
    - src/routes/search/+page.ts
    - src/routes/search/+page.svelte

key-decisions:
  - "Tag mode bypasses intent parsing — mode toggle is explicit user intent, intent object stays 'artist' type for chip display"
  - "EMPTY_INTENT constant defined at module level for all empty/error return paths"
  - "data-testid removed from ArtistCard call — component does not spread restProps; testid in plan spec was aspirational"

requirements-completed: [SRCH-02, SRCH-03, SRCH-04]

# Metrics
duration: ~4min
completed: 2026-02-25
---

# Phase 27 Plan 03: Search Intent Routing + Match Badges Summary

**City/label intent routing wired into search +page.ts; intent chip + matchReason badges rendered in +page.svelte**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-25T09:00:23Z
- **Completed:** 2026-02-25T09:04:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `+page.ts` now imports and calls `parseSearchIntent(q)` on every non-tag search, routing to `searchByCity`, `searchByLabel`, or `searchArtists` based on detected intent
- `intent` field returned in page data across all code paths (empty query, error, and success) using a typed `SearchIntent` object
- `+page.svelte` renders a `.intent-chip-bar` with a `.intent-chip` (data-testid="intent-chip") for city and label searches — shows "City: Berlin" or "Label: Warp Records" with a × clear link
- Every result card passed a `matchReason` prop: "City match", "Label match", "Tag match: {tag}", or "Name match"
- Results summary paragraph updated to show intent-aware text: "Showing artists from {entity}" / "Showing artists on {entity}"

## Task Commits

Each task was committed atomically:

1. **Task 1: Update search +page.ts with intent routing** - `962a772` (feat)
2. **Task 2: Update search +page.svelte with intent chips and match badges** - `c00d419` (feat)

**Plan metadata:** (included in docs commit after SUMMARY)

## Files Created/Modified

- `src/routes/search/+page.ts` - Added parseSearchIntent/searchByCity/searchByLabel imports, intent routing, EMPTY_INTENT constant, intent in all return shapes
- `src/routes/search/+page.svelte` - Added intent-chip-bar/intent-chip block, intent-aware matchReason prop on ArtistCard, intent-aware results summary, CSS for intent chip styles

## Decisions Made

- **Tag mode bypasses intent parsing:** When `mode === 'tag'`, the intent object is set to `{ type: 'artist', raw: q, entity: q }` — tag mode is an explicit user toggle and has its own routing path. The intent object is for city/label chip display only.
- **EMPTY_INTENT constant:** Defined at module level to avoid repeating `{ type: 'artist', raw: '', entity: '' }` in three return paths. Clean and DRY.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed data-testid from ArtistCard call**
- **Found during:** Task 2
- **Issue:** Plan spec included `data-testid="search-result-card"` on `<ArtistCard>` but the component does not accept arbitrary HTML attributes (no `$$restProps` spread). Caused a TypeScript error: "Object literal may only specify known properties, and 'data-testid' does not exist in type '$$ComponentProps'."
- **Fix:** Removed `data-testid` from the `<ArtistCard>` call. The P27-14 test checks for `matchReason` prop presence which is correctly implemented.
- **Files modified:** `src/routes/search/+page.svelte`
- **Commit:** `c00d419`

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03 artifacts are ready for testing in Plan 05 (test manifest)
- P27-10..P27-14 tests from the plan's TEST-PLAN section are ready to be added to the manifest
- P27-15 and P27-16 are correctly marked as skip (require running desktop app)

## Self-Check: PASSED

All files exist and all commits verified:
- `src/routes/search/+page.ts` - FOUND
- `src/routes/search/+page.svelte` - FOUND
- `.planning/phases/27-search-knowledge-base/27-03-SUMMARY.md` - FOUND
- Commit `962a772` - FOUND
- Commit `c00d419` - FOUND

---

*Phase: 27-search-knowledge-base*
*Completed: 2026-02-25*
