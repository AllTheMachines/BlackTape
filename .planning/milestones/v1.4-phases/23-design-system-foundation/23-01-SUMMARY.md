---
phase: 23-design-system-foundation
plan: "01"
subsystem: design-system
tags: [css-tokens, tauri, titlebar, theme, window-chrome]
dependency_graph:
  requires: []
  provides: [design-tokens, custom-titlebar]
  affects: [all-phase-23-plans, layout]
tech_stack:
  added: []
  patterns: [css-custom-properties, tauri-drag-region, getCurrentWindow-api]
key_files:
  created:
    - src/lib/components/Titlebar.svelte
  modified:
    - src/lib/styles/theme.css
    - src-tauri/tauri.conf.json
    - src/routes/+layout.svelte
    - tools/test-suite/manifest.mjs
decisions:
  - "Dynamic import of @tauri-apps/api/window (not static) to avoid SSR errors in dev mode"
  - "PROJECT_NAME imported from config.ts in Titlebar (not hardcoded) to honor single-variable naming rule"
  - "Window controls use async handlers with dynamic import to keep Tauri API calls lazy"
metrics:
  duration: "~3 minutes"
  completed: "2026-02-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 23 Plan 01: Design Token Foundation + Custom Titlebar Summary

**One-liner:** 25 CSS custom properties (`--bg-*`, `--b-*`, `--t-*`, `--acc`, layout dims) added to `theme.css`, plus a custom Tauri drag-region titlebar with window controls replacing native OS chrome.

## What Was Built

### Task 1 — Design tokens in theme.css

Added the complete Mercury v1.4 design system token set to `src/lib/styles/theme.css` alongside existing OKLCH variables (both coexist, no removal). Tokens added:

- **7 background layers:** `--bg-0` (#080808) through `--bg-6` (#323232) — from window base to active/pressed
- **5 border tokens:** `--b-0` through `--b-3`, plus `--b-acc` (rgba amber at 30% opacity)
- **3 text tokens:** `--t-1` (#e0e0e0), `--t-2` (#888), `--t-3` (#464646)
- **3 accent tokens:** `--acc` (#c4a55a warm amber), `--acc-bg`, `--acc-bg-h`
- **3 layout dims:** `--sidebar` (192px), `--topbar` (42px), `--player` (66px)
- **1 radius:** `--r` (2px square corners)
- Updated `font-family` to Inter stack, `font-size` to 13px

### Task 2 — Custom Titlebar + decorations: false

**`src/lib/components/Titlebar.svelte`:** 28px tall bar replacing OS window chrome.
- `data-tauri-drag-region` on the wrapper div for window dragging
- Logo: `PROJECT_NAME` in uppercase amber (`var(--acc)`), imported from config.ts
- Window controls (−, □, ×) outside drag region — `isTauri()` gated
- Dynamic import of `getCurrentWindow` from `@tauri-apps/api/window` — avoids SSR issues
- Close button hover: `#c0392b` red background
- All colors from design tokens: `var(--bg-1)`, `var(--b-1)`, `var(--t-3)`, `var(--bg-4)`, `var(--t-2)`

**`src-tauri/tauri.conf.json`:** Added `"decorations": false` to `app.windows[0]`.

**`src/routes/+layout.svelte`:** Titlebar mounted as first element in `{:else}` block, `{#if tauriMode}` gated, above loading bar and `<header>`.

**`tools/test-suite/manifest.mjs`:** Added P23-01 through P23-04 code checks. All 93 tests pass.

## Verification

- `npm run check`: 0 errors, 8 pre-existing warnings (unrelated)
- `node tools/test-suite/run.mjs --code-only`: 93/93 passed (4 new P23 tests all green)
- Plan verification scripts: all passed

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing critical functionality] Dynamic import of Tauri API**
- **Found during:** Task 2
- **Issue:** Static `import { getCurrentWindow } from '@tauri-apps/api/window'` would fail in web/dev mode (no Tauri context). The plan didn't specify how to handle this.
- **Fix:** Used dynamic `await import('@tauri-apps/api/window')` inside async button handlers — only executes inside Tauri context (behind `isTauri()` guard anyway, but belt-and-suspenders)
- **Files modified:** `src/lib/components/Titlebar.svelte`

**2. [Rule 2 - Missing critical functionality] Test manifest entries**
- **Found during:** Task 2 verification
- **Issue:** Plan specified `node tools/test-suite/run.mjs --phase 23 --code-only` as verification command, but no P23 tests existed in manifest yet.
- **Fix:** Added P23-01 through P23-04 to `tools/test-suite/manifest.mjs` immediately after completing the tasks — per project protocol (add tests after every phase).
- **Files modified:** `tools/test-suite/manifest.mjs`

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 — Design tokens | `774fee7` | `src/lib/styles/theme.css`, `BUILD-LOG.md` |
| Task 2 — Titlebar + decorations | `da7ab13` | `src/lib/components/Titlebar.svelte`, `src-tauri/tauri.conf.json`, `src/routes/+layout.svelte`, `tools/test-suite/manifest.mjs`, `BUILD-LOG.md` |

## Self-Check: PASSED
