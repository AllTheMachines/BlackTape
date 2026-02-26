---
phase: 28-ux-cleanup-scope-reduction
plan: 01
subsystem: ui
tags: [svelte, navigation, ux, scope-reduction]

# Dependency graph
requires: []
provides:
  - Scenes removed from left sidebar nav (hidden from new users, accessible via direct URL)
  - "Coming in v2" notice banner on Scenes page
  - "Coming in v2" notice banner on Listening Rooms page
affects: [28-07-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "v2-notice pattern: flex banner with accent badge + muted text, uses bg-4/b-1/t-3/acc design tokens"

key-files:
  created: []
  modified:
    - src/lib/components/LeftSidebar.svelte
    - src/routes/scenes/+page.svelte
    - src/routes/room/[channelId]/+page.svelte

key-decisions:
  - "Scenes removed from navGroups array only — route stays fully functional for users with direct bookmarks"
  - "Rooms and ActivityPub were never in the nav (confirmed absent) — no changes needed for those"
  - "v2-notice placed above main page content (before scenes-header div) so it's visible immediately on page load"
  - "v2-notice uses design system tokens throughout — no hardcoded colors, consistent with theme"

patterns-established:
  - "v2-notice pattern: use .v2-notice + .v2-badge for any future deferred-feature banners"

requirements-completed:
  - SCOPE-01
  - SCOPE-02
  - SCOPE-03

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 28 Plan 01: Scope Reduction Summary

**Scenes removed from nav and both deferred pages get honest "Coming in v2" banners using design tokens**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T19:57:22Z
- **Completed:** 2026-02-26T20:00:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Left sidebar nav simplified: Scenes link removed from Discover group, 10 nav items remain intact
- Scenes page: compact v2-notice banner above all existing content (amber badge + muted text)
- Room page: same banner pattern with Listening Rooms message
- All 164 code checks pass, 0 TypeScript/Svelte errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove deferred nav items from LeftSidebar** - `bdb9abd` (feat)
2. **Task 2: Add "coming in v2" notice to deferred pages** - `b3dc60c` (feat)

**Plan metadata:** committed with final state update (docs)

## Files Created/Modified
- `src/lib/components/LeftSidebar.svelte` — Removed /scenes from Discover navGroup
- `src/routes/scenes/+page.svelte` — Added v2-notice banner + CSS above existing content
- `src/routes/room/[channelId]/+page.svelte` — Added v2-notice banner + CSS above existing content

## Decisions Made
- Rooms and ActivityPub/DMs were confirmed absent from nav — only Scenes required removal
- v2-notice placed at top of page container (before scenes-header) so it's the first thing users see
- v2-notice CSS uses scoped style block — no global CSS changes needed, consistent with component-scoped pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- File had mixed/inconsistent line endings (CRLF + CR) — used Python byte-level editing to insert HTML and CSS without corrupting encoding. No functional impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Nav is clean: 10 items across Discover/Library/Account, no dead-end community features visible
- Deferred pages are honest: users landing via bookmarks see the v2-notice immediately
- Ready for remaining Phase 28 plans (bug fixes, polish)

---
*Phase: 28-ux-cleanup-scope-reduction*
*Completed: 2026-02-26*
