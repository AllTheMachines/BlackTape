---
phase: 19-static-site-generator
plan: 02
subsystem: ui
tags: [svelte5, tauri, dialog, state-machine, site-gen, @tauri-apps/plugin-dialog]

# Dependency graph
requires:
  - phase: 19-01
    provides: generate_artist_site and open_in_explorer Rust commands with their exact signatures
provides:
  - SiteGenDialog.svelte — 5-state UI dialog wrapping the Rust site generator
affects:
  - 19-03 (plan 03 wires this dialog into the artist page and adds test manifest entries)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tauri invoke pattern: lazy import @tauri-apps/api/core inside async functions, never at module level"
    - "Dialog dismiss: backdrop click + Escape key (handleBackdropClick + handleBackdropKeydown)"
    - "Svelte 5 svelte-ignore: use underscore_format (a11y_click_events_have_key_events), not hyphen-format"

key-files:
  created:
    - src/lib/components/SiteGenDialog.svelte
  modified:
    - BUILD-LOG.md

key-decisions:
  - "Dialog is Tauri-only — no isTauri guard inside component itself; parent artist page gates with {#if tauriMode}"
  - "country/type/begin_year/ended passed as null/false — not available in dialog props, Rust structs accept null"
  - "Backdrop click dismisses only when target === currentTarget (prevents card clicks from closing dialog)"

patterns-established:
  - "5-state dialog machine: confirming / picking / generating / success / error"
  - "Rust payload mapping: camelCase JS props snake_cased to match Rust struct field names (coverArtUrl -> cover_art_url)"

requirements-completed: [SITE-01, SITE-02]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 19 Plan 02: SiteGenDialog.svelte Summary

**Svelte 5 dialog component with 5-state machine wrapping the Rust static site generator: confirm preview → OS folder picker → generation spinner → success (open folder) / error**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T15:29:04Z
- **Completed:** 2026-02-24T15:31:19Z
- **Tasks:** 1
- **Files modified:** 1 (+ BUILD-LOG.md)

## Accomplishments
- Created `SiteGenDialog.svelte` — self-contained Svelte 5 component, 373 lines
- Full 5-state machine: `confirming | picking | generating | success | error`
- OS native folder picker via `@tauri-apps/plugin-dialog` (directory mode)
- Invokes `generate_artist_site` with artist payload mapped to Rust struct shape (camelCase → snake_case)
- Success state shows output path + cover count + "Open folder" via `open_in_explorer` invoke
- All 4 required `data-testid` attributes for test suite verification
- Mercury dark theme: `#1c1c1c` card, CSS spinner animation, primary/secondary button styles
- 0 errors, 0 new warnings — all 92 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SiteGenDialog.svelte with full state machine** - `4e8fdd8` (feat)

**Plan metadata:** (included in upcoming docs commit)

## Files Created/Modified
- `src/lib/components/SiteGenDialog.svelte` - 5-state export dialog; wraps generate_artist_site and open_in_explorer Rust commands
- `BUILD-LOG.md` - Phase 19 Plan 02 entry added

## Decisions Made
- Dialog has no `isTauri` guard — component is Tauri-only by design, parent page handles the guard
- `country`, `type`, `begin_year`, and `ended` passed as `null`/`false` because dialog props don't include artist metadata beyond name/slug/tags/mbid; the Rust struct accepts null for all these
- Backdrop click dismisses only when `e.target === e.currentTarget` so clicking inside the card doesn't dismiss

## Deviations from Plan

None — plan executed exactly as written. One minor auto-fix during execution: updated the `svelte-ignore` directive from deprecated hyphen-format (`a11y-click-events-have-key-events`) to Svelte 5 underscore-format (`a11y_click_events_have_key_events`), and added `tabindex="-1"` and `onkeydown` to satisfy the a11y interactive focus warning. Both were Rule 1 auto-fixes (warning-producing code) made inline.

## Issues Encountered
- The plan's verification script used shell `!` escape that failed in bash — ran the check inline with `--input-type=module` instead. Not a code issue.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- SiteGenDialog.svelte is complete and verified
- Plan 03 needs to: import and render this component in the artist page (behind `{#if tauriMode}`), add a "Generate site" button to trigger it, and add the P19-06 through P19-09 test manifest entries

---
*Phase: 19-static-site-generator*
*Completed: 2026-02-24*
