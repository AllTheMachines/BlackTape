---
phase: 23-design-system-foundation
plan: "02"
subsystem: design-system
tags: [css-tokens, controlbar, sidebar, player, chrome, tauri]
dependency_graph:
  requires: [23-01]
  provides: [restyled-topbar, restyled-sidebar, restyled-player]
  affects: [all-routes, layout-chrome]
tech_stack:
  added: []
  patterns: [css-custom-properties, grouped-nav, amber-active-state]
key_files:
  created: []
  modified:
    - src/lib/components/ControlBar.svelte
    - src/lib/components/LeftSidebar.svelte
    - src/lib/components/Player.svelte
    - src/routes/+layout.svelte
    - tools/test-suite/manifest.mjs
decisions:
  - "LeftSidebar nav grouped into Discover/Library/Account sections with Unicode icons — matches mockup spec exactly"
  - "Header hidden via class:hidden={tauriMode} rather than removed — preserves web fallback unchanged"
  - "Player control buttons use filled bg-4 box style (not borderless ghost) — matches mockup spec"
  - "Play button uses acc-bg + b-acc + acc pattern (amber accent box) instead of solid background"
metrics:
  duration: "~7 minutes"
  completed: "2026-02-25"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 5
---

# Phase 23 Plan 02: Chrome Surfaces Summary

**One-liner:** ControlBar, LeftSidebar, and Player all restyled to the v1.4 token vocabulary — layered dark grey panel backgrounds, 1px `--b-1` dividers, amber `--acc` active states — the visual frame now matches the mockup spec.

## What Was Built

### Task 1 — ControlBar restyle + layout header hidden

**`src/lib/components/ControlBar.svelte`:** Full restyle from OKLCH-era tokens to v1.4 design system:
- Height: `var(--topbar)` (42px, was 32px), background `--bg-1`, bottom border `--b-1`
- Gap and padding converted to literal pixel values per spec (8px gap, 0 12px padding)
- Search form: container gets `--bg-4` background + `--b-2` border + `var(--r)` radius; focus turns `--acc` amber via `:focus-within`
- Nav input (address bar): `--bg-4` + `--b-2` + `var(--r)`, height 26px (was 22px)
- Layout select: `--bg-4` + `--b-2` + `var(--r)`, `--t-2` color, 26px height
- Theme indicator: upgraded from plain link to 26×26 filled button-style box (`--bg-4` + `--b-2` + `var(--r)`)
- All `--space-*` spacing tokens, `--bg-surface`, `--border-subtle`, `--text-*`, `--bg-elevated`, `--border-default`, `--bg-hover` replaced

**`src/routes/+layout.svelte`:** Added `class:hidden={tauriMode}` to `<header>` + `.hidden { display: none; }` in scoped styles. The ControlBar is the topbar in Tauri mode — the old header is redundant there. Web fallback (`{:else}` branch) is completely untouched.

### Task 2 — LeftSidebar grouped nav

**`src/lib/components/LeftSidebar.svelte`:** Complete rework of navigation structure and styles:

Navigation grouped into three sections:
- **Discover:** ◉ Discover, ⬡ Style Map, ◈ Knowledge Base, ◷ Time Machine, ▦ Crate Dig, ◎ Scenes
- **Library:** ▤ Library, ◬ Explore
- **Account:** ◐ Profile, ⚙ Settings, ◌ About

Section labels: 9px uppercase `--t-3` text with 0.12em letter-spacing.

Nav items: 28px height, `--t-3` color at rest, 2px left border (transparent → `--acc` amber on active state). Active item: `#1c1c1c` background, `--t-1` text, amber icon.

Discovery filters section: tag input uses `--bg-4` + `--b-2` + `var(--r)`. Tag chips use same pattern. Remove buttons use `--t-3` color.

All old OKLCH-era tokens (`--bg-base`, `--border-subtle`, `--text-muted`, `--bg-elevated`, `--border-default`, `--bg-hover`, `--text-secondary`, `--text-accent`, `--text-primary`, `--tag-bg`, `--tag-text`, `--tag-border`) removed from scoped styles.

### Task 3 — Player bar restyle

**`src/lib/components/Player.svelte`:** Style block completely updated to v1.4 tokens. Svelte/JS logic untouched:

- Bar: `--bg-1` background (was `--player-bg`), `--b-1` top border (was `--player-border`), `var(--player)` height (was `--player-height`), `0 14px` padding, 12px gap
- Track title: `--t-1`, 11px (was 0.85rem + `--text-primary`)
- Track meta: `--t-3`, 10px (was 0.75rem + `--text-secondary`)
- Transport buttons: 24×24, `--bg-4` bg, `--b-2` border, `var(--r)` radius, `--t-3` color (was borderless ghost style)
- Small buttons: 22×22 (shuffle, repeat, mute, queue)
- Play button: 28×28, `--acc-bg` background, `--b-acc` border, `--acc` color (was solid white circle)
- Active state (shuffle/repeat/discover): `--acc-bg` + `--b-acc` + `--acc` (was `--progress-color`)
- Seek bar: 3px, `background: var(--b-2)`, `accent-color: var(--acc)`, no border-radius
- Volume bar: 64px, `background: var(--b-2)`, `--t-2` thumb
- Expanded panel: `--bg-1` background, `--b-1` top border, `var(--player)` offset
- Discover button: converted from `border-radius: 12px` pill to box with `var(--r)` — matches design system
- All `--player-bg`, `--player-border`, `--progress-color`, `--progress-bg`, `--text-*`, `--border-*`, `--space-*` removed

**`tools/test-suite/manifest.mjs`:** Added P23-05 through P23-08 code checks for all three Plan 02 deliverables.

## Verification

- Plan verification scripts: all passed
- `node tools/test-suite/run.mjs --phase 23 --code-only`: 8/8 passed (P23-05 through P23-08 all green)
- `node tools/test-suite/run.mjs --code-only`: 100/100 passed (no regressions)
- `npm run check`: 0 errors, 8 pre-existing warnings (unrelated)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit hook test failures from concurrent Plan 03 session**
- **Found during:** Task 2 commit attempt
- **Issue:** Tests P23-09 and P23-11 were added to the manifest by a concurrent Plan 03 session, but the corresponding Plan 03 code wasn't yet committed to HEAD — causing the pre-commit hook to fail during my Task 2 commit
- **Fix:** The issue self-resolved when the Plan 03 commits appeared in the git history. No manual intervention required — just re-attempted the commit after the hook passed
- **Files modified:** None (no change needed; tests were already passing)
- **Commit:** N/A

**2. [Rule 2 - Missing] Added P23-05 through P23-08 test manifest entries**
- **Found during:** Task 3
- **Issue:** Plan TEST-PLAN section specified tests P23-05 through P23-08 for the Plan 02 deliverables, but they didn't exist in the manifest yet
- **Fix:** Added all four tests to `tools/test-suite/manifest.mjs` using the correct `fileContains(...)()` invocation pattern (curried function call)
- **Files modified:** `tools/test-suite/manifest.mjs`
- **Commit:** `d42ae13`

### Execution Context

**Parallel session interference:** A concurrent GSD session was executing Plan 03 simultaneously. This caused:
- Plan 03 Task 1 (`7f174cd`) was committed before my Plan 02 Task 1
- My LeftSidebar changes were bundled into the Plan 03 Task 2 commit (`3e2e7ee`) rather than a standalone Plan 02 commit
- Pre-commit hook failures during my first Task 2 attempt

Despite the interleaving, all Plan 02 deliverables are correctly committed and all tests pass.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 — ControlBar + layout header | `981bd50` | `src/lib/components/ControlBar.svelte`, `src/routes/+layout.svelte` |
| Task 2 — LeftSidebar grouped nav | bundled in `3e2e7ee` | `src/lib/components/LeftSidebar.svelte` |
| Task 3 — Player bar + test manifest | `d42ae13` | `src/lib/components/Player.svelte`, `tools/test-suite/manifest.mjs` |

## Self-Check: PASSED
