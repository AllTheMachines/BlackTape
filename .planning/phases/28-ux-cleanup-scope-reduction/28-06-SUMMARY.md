---
phase: 28-ux-cleanup-scope-reduction
plan: "06"
subsystem: search-ux, sidebar-nav
tags: [polish, search, ux, sidebar, discovery]
dependency_graph:
  requires: [28-01]
  provides: [search-type-selector, discovery-sidebar-switcher]
  affects: [src/routes/search, src/lib/components/LeftSidebar.svelte]
tech_stack:
  added: []
  patterns: [url-param-driven-type, derived-active-mode, compact-icon-switcher]
key_files:
  created: []
  modified:
    - src/routes/search/+page.svelte
    - src/routes/search/+page.ts
    - src/lib/components/LeftSidebar.svelte
decisions:
  - SearchType alias covers all 4 modes; 'type=' URL param parsed alongside legacy 'mode=' for backward compat
  - Song mode returns empty artist results — local library tracks section surfaces the matches
  - Label mode bypasses intent parsing — explicit user intent takes priority
  - Discovery sidebar uses pathname.startsWith() to detect active mode — same isActive() helper already in file
  - navGroups entry for Discover points at DISCOVERY_MODES (shared constant) avoiding duplication
metrics:
  duration_secs: 290
  completed_date: "2026-02-26"
  tasks_completed: 2
  files_changed: 3
---

# Phase 28 Plan 06: Search Type Selector + Discovery Sidebar Summary

Search type chips added to the search page (Artist / Labels / Songs), plus the discovery sidebar now shows a condensed mode switcher when you're on any discovery route.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add search type selector to search page | d905c10 | src/routes/search/+page.svelte, src/routes/search/+page.ts |
| 2 | Simplify discovery sidebar — show active mode only | 9d301cf | src/lib/components/LeftSidebar.svelte |

## What Was Built

### Task 1 — Search Type Selector

The search page had no explicit way to filter by type. Users had to use hidden query syntax (`label:`) or just guess. Now three chips sit above the SearchBar:

- **Artists** — default; covers artist name search + tag mode
- **Labels** — routes to `searchByLabel()` directly, bypasses intent parsing
- **Songs** — sets `results = []`, surfaces only local library tracks

`+page.ts` now parses a `type=` URL param alongside the legacy `mode=` param. The new `SearchType = 'artist' | 'tag' | 'label' | 'song'` type covers all four query paths. Backward compat preserved — old `?mode=tag` URLs still work.

`+page.svelte` uses `as const` tuple iteration for the chip group. The active state logic: `type='artist'` covers both `mode='artist'` and `mode='tag'` since tag search is still "artists by tag."

### Task 2 — Discovery Sidebar Simplification

Five nav links listed simultaneously created noise. The new pattern:

**When on a discovery route** (pathname starts with `/discover`, `/style-map`, `/kb`, `/time-machine`, `/crate`):
- The active mode name + icon displayed prominently
- Other 4 modes accessible as 22x22px icon-only buttons with title tooltips
- Visual: active mode button gets amber fill

**When off all discovery routes**: full 5-link list shown unchanged (acts as entry point).

`DISCOVERY_MODES` constant centralizes the route/label/icon data. Shared with both the compact switcher and the fallback full-list. `activeDiscoveryMode` derived using the existing `isActive()` helper.

## Verification

- `npm run check`: 0 errors, 9 warnings (all pre-existing)
- `node tools/test-suite/run.mjs --code-only`: 164/164 passed
- `grep -c "search-type-selector" src/routes/search/+page.svelte` → 2 (div + CSS class)
- `grep -c "discovery-mode-switcher" src/lib/components/LeftSidebar.svelte` → 2 (template + CSS)
- `grep -c "DISCOVERY_MODES" src/lib/components/LeftSidebar.svelte` → 5

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/routes/search/+page.svelte` — exists, contains `search-type-selector`
- `src/routes/search/+page.ts` — exists, contains `'label' | 'song'`
- `src/lib/components/LeftSidebar.svelte` — exists, contains `discovery-mode-switcher` and `DISCOVERY_MODES`
- Commit `d905c10` — verified in git log
- Commit `9d301cf` — verified in git log
