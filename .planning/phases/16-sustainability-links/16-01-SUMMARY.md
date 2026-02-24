---
phase: 16-sustainability-links
plan: 01
subsystem: ui
tags: [svelte5, mastodon, fediverse, sharetomastodon, artist-page, scene-page, sustainability]

# Dependency graph
requires:
  - phase: 15-link-pipeline
    provides: categorizedLinks.support array from categorize.ts already populated
provides:
  - Artist page Support section rendering Patreon/Ko-fi/crowdfunding links with icons
  - Mastodon share button in artist page header linking to sharetomastodon.github.io
  - Mastodon share button in scene page header linking to sharetomastodon.github.io
affects: [16-02, 17-artist-stats-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "$derived pre-encodes URLs to avoid encodeURIComponent in template expressions"
    - "category !== 'support' guard in LINK_CATEGORY_ORDER loop prevents double render of funding links"
    - "Support links rendered in dedicated section separate from generic links block"
    - "Share buttons always visible (not in isTauri() guard) — cross-platform"

key-files:
  created: []
  modified:
    - src/routes/artist/[slug]/+page.svelte
    - src/routes/scenes/[slug]/+page.svelte

key-decisions:
  - "Used sharetomastodon.github.io as universal Mastodon instance router — no Mercury-side instance config needed"
  - "Support section positioned after generic links block, hidden entirely when data.categorizedLinks.support is empty"
  - "Share button placed outside isTauri() guard — visible on all platforms (locked decision from CONTEXT.md)"
  - "mastodonShareUrl and sceneMastodonShareUrl use $derived to pre-encode URL — avoids template pitfall with nested template literals"

patterns-established:
  - "supportIcon(): platform name substring matching for icon selection (patreon/ko-fi/kickstarter/opencollective)"

requirements-completed: [SUST-01, SUST-02]

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 16 Plan 01: Sustainability Links (Part 1) Summary

**Artist funding links rendered in dedicated Support section with platform icons, plus one-click Mastodon share on both artist and scene pages via sharetomastodon.github.io**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-24T10:28:12Z
- **Completed:** 2026-02-24T10:33:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Artist page now renders Patreon/Ko-fi/crowdfunding links in a distinct "Support" section with platform-specific icons (♥ Patreon, ☕ Ko-fi, etc.), hidden when empty
- Generic links loop now guards `category !== 'support'` to prevent double rendering of funding links
- Both artist page and scene page have a Mastodon share anchor button that links to sharetomastodon.github.io with pre-populated text including artist/scene name and mercury:// deep link
- All changes pass `npm run check` with 0 errors (72/72 test suite passes on both commits)

## Task Commits

Each task was committed atomically:

1. **Task 1: Artist page — Support section and share button** - `382ee4e` (feat)
2. **Task 2: Scene page — Mastodon share button** - `14eeade` (feat)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified
- `src/routes/artist/[slug]/+page.svelte` - Added mastodonShareUrl derived, supportIcon() helper, category !== 'support' guard in links loop, Support section block, share-mastodon-btn anchor, CSS for both
- `src/routes/scenes/[slug]/+page.svelte` - Added sceneMastodonShareUrl derived (nullable guard), share-mastodon-btn anchor in scene-title-row outside isTauri() block, CSS

## Decisions Made
- Mastodon share uses sharetomastodon.github.io as a universal redirect service — the user picks their instance on that page, no Mercury-side instance configuration needed
- `mastodonShareUrl` built as `$derived` rather than inline in the template to avoid the encodeURIComponent-in-nested-template-literal pitfall
- `hasAnyLinks` derived left unchanged (it includes support in its check, which is correct — if only support links exist the links section wrapper still shows; support links just render separately)
- Share button is outside any `{#if isTauri()}` block per locked decision in CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- File uses CRLF line endings + tabs, which caused the Edit tool to fail on string matching. Used Python-based file replacement as a workaround to handle the exact byte content.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 Plan 01 complete. Support section and Mastodon share for artists/scenes are live.
- Phase 16 Plan 02 (About screen support links + Backer Credits) can proceed independently.

---
*Phase: 16-sustainability-links*
*Completed: 2026-02-24*
