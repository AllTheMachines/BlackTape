---
phase: 23-design-system-foundation
plan: "03"
subsystem: design-system
tags: [css-tokens, tag-chip, svelte, theme, global-styles, buttons, inputs, badges]
dependency_graph:
  requires:
    - phase: 23-01
      provides: design-tokens (--bg-*, --b-*, --t-*, --acc, --r)
  provides:
    - restyled-tag-chip (22px/2px-radius, active prop)
    - global-button-base-styles (button/.btn in theme.css)
    - global-input-select-styles (input/select/textarea in theme.css)
    - global-badge-styles (.badge/.source-badge/.nav-badge in theme.css)
    - global-tab-bar-styles (.tab-bar/.tab in theme.css)
  affects: [all-phase-23-plans, all-route-components, tag-surfaces]
tech-stack:
  added: []
  patterns:
    - global-element-styles-in-theme-css
    - design-token-only-component-styles
    - active-prop-for-chip-state
key-files:
  created: []
  modified:
    - src/lib/components/TagChip.svelte
    - src/lib/components/TagFilter.svelte
    - src/lib/styles/theme.css
    - tools/test-suite/manifest.mjs
key-decisions:
  - "fileContains() in test runner returns a function not a boolean — tests with negation must call returned function explicitly: !fileContains(path, str)()"
  - "Global button/input styles placed in theme.css (not a separate globals.css) — single file to maintain, inherits into Svelte scoped components intentionally"
  - "TagFilter keeps its own .tag-chip styles (parallel to TagChip.svelte) because it uses button elements not anchor elements — same visual spec, different element type"
patterns-established:
  - "Global element base: button, input, select, textarea inherit from theme.css — components get correct look without per-component CSS"
  - "Design token usage: no hardcoded colors anywhere — only --bg-*, --b-*, --t-*, --acc-* vars"
  - "Square radius: var(--r) = 2px on all interactive elements — no pill shapes (999px banned)"
requirements-completed: [DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05]
duration: ~4min
completed: "2026-02-25"
---

# Phase 23 Plan 03: Tag Chips + Global Interactive Styles Summary

**TagChip restyled to 22px/2px-radius square with active prop; 130-line global base in theme.css gives all buttons, inputs, badges, and tabs the v1.4 look without per-component CSS.**

## Performance

- **Duration:** ~4 minutes
- **Started:** 2026-02-24T23:34:56Z
- **Completed:** 2026-02-24T23:39:00Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- TagChip.svelte: pill radius (999px) gone, replaced with `var(--r)` (2px square), explicit 22px height, `--bg-4`/`--b-2`/`--t-3` color tokens, amber active state via new `active` prop
- theme.css: 130 lines of global element base styles — `button`/`.btn`, `.btn-icon`, `.btn-accent`, `.btn-ghost`, `.btn-sm`, input/select/textarea, `.badge`/`.source-badge`/`.nav-badge`, `.tab-bar`/`.tab` — all components that use bare HTML elements now inherit the right look
- TagFilter.svelte: all old OKLCH-era tokens (`--tag-bg`, `--tag-border`, `--text-muted`, `--border-default`, `--bg-hover`, 999px radius) replaced with v1.4 tokens matching the TagChip spec
- Test suite: 3 new P23 tests added, 96/96 code checks passing

## Task Commits

1. **Task 1: Restyle TagChip to 22px/2px-radius spec** - `7f174cd` (feat)
2. **Task 2: Global button/input/badge styles + TagFilter** - `3e2e7ee` (feat)

## Files Created/Modified

- `src/lib/components/TagChip.svelte` — 22px/2px-radius, design tokens throughout, added `active` prop
- `src/lib/components/TagFilter.svelte` — v1.4 token migration, matching chip spec with button elements
- `src/lib/styles/theme.css` — appended Mercury v1.4 global element base styles section
- `tools/test-suite/manifest.mjs` — added P23-09, P23-10, P23-11 test entries

## Decisions Made

- **fileContains() invocation pattern:** The `fileContains()` helper in the test runner returns a function, not a boolean. Tests using negation (`!fileContains(...)`) must call the returned function: `!fileContains(path, str)()`. Without the trailing `()`, the function object is truthy and `!truthy` is always false. This caught two initially failing tests (P23-09, P23-11) that were fixed before commit.
- **Global styles in theme.css:** Rather than a separate `globals.css` file, global element styles are appended to `theme.css`. Svelte scoped components can still override with local `<style>` blocks — the globals set the baseline. Single file is simpler to maintain.
- **TagFilter keeps parallel chip styles:** TagFilter uses `<button>` elements for tag chips (not `<a>` elements like TagChip.svelte) because they need `onclick` handlers and `disabled` state. Same visual spec, implemented in parallel within TagFilter's `<style>` block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test manifest syntax: fileContains() negation pattern**
- **Found during:** Task 2 verification (running test suite)
- **Issue:** Initial P23-09 and P23-11 test entries used `!fileContains(path, str)` — since `fileContains` returns a function (truthy), negating it always returned false regardless of file contents
- **Fix:** Changed to `!fileContains(path, str)()` — calling the returned function to get the actual boolean before negating. Also updated P23-10 to use `()()` pattern consistently (functionally equivalent for non-negated calls but more explicit)
- **Files modified:** `tools/test-suite/manifest.mjs`
- **Verification:** All 3 new tests passed after fix; 96/96 total passing
- **Committed in:** `3e2e7ee` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Test entry syntax error discovered during verification and fixed before commit. No scope creep.

## Issues Encountered

None — plan executed cleanly. Both tasks verified and committed atomically.

## Next Phase Readiness

- TagChip is the canonical chip component — all tag surfaces in the app now use v1.4 tokens
- Global button/input base in theme.css means Phases 24-27 components get correct baseline automatically
- TagFilter ready for any crate-dig or discovery page that needs tag filtering
- No blockers for next plan

---
*Phase: 23-design-system-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED
