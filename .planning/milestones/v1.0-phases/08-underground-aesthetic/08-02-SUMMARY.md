---
phase: 08-underground-aesthetic
plan: 02
subsystem: ui
tags: [paneforge, svelte5, layout, panels, sidebars, toolbar, templates]

# Dependency graph
requires:
  - phase: 08-01
    provides: preferences.svelte.ts with layout preference CRUD, theme engine state
provides:
  - PaneForge resizable panel infrastructure
  - Four layout template definitions (cockpit, focus, minimal) with sizes and autoSaveId
  - UserTemplateRecord type, expandUserTemplate, createUserTemplateRecord utilities
  - loadUserTemplates/saveUserTemplates persistence functions
  - PanelLayout.svelte: 3-pane/2-pane/single column conditional rendering
  - LeftSidebar.svelte: quick nav + discovery filters with debounced sidebar results
  - RightSidebar.svelte: context-aware panel (artist/genre/default modes)
  - ControlBar.svelte: 32px toolbar with search + layout switcher + theme dot
affects: [08-03, 08-04]

# Tech tracking
tech-stack:
  added: [paneforge]
  patterns:
    - PaneForge PaneGroup/Pane/PaneResizer for resizable split-panel UI
    - Snippet-based layout composition (sidebar, context, children snippets in PanelLayout)
    - TemplateConfig pattern for named layout presets with autoSaveId per-template size persistence
    - Context-aware right sidebar (switch content based on pagePath prop)
    - optgroup in select for user vs built-in template separation in ControlBar

key-files:
  created:
    - src/lib/theme/templates.ts
    - src/lib/components/PanelLayout.svelte
    - src/lib/components/LeftSidebar.svelte
    - src/lib/components/RightSidebar.svelte
    - src/lib/components/ControlBar.svelte
  modified:
    - src/lib/theme/preferences.svelte.ts
    - package.json

key-decisions:
  - "PaneForge chosen for resizable panel engine — built for SvelteKit, PaneGroup/Pane/PaneResizer primitives, autoSaveId for per-template localStorage size persistence"
  - "LayoutTemplate typed as string (not literal union) to accommodate user template IDs like 'user-1706123456789' alongside built-in IDs"
  - "LeftSidebar discovery controls filter sidebar panel only (per earlier user decision) — sidebar is a browse viewport, not a main content filter"
  - "RightSidebar queue in sidebar eliminates the floating Queue overlay in cockpit mode — always-visible, fits the workspace paradigm"
  - "Three built-in templates: cockpit (3-pane, default), focus (2-pane), minimal (single column)"

patterns-established:
  - "Snippet-based panel composition: PanelLayout accepts sidebar/context/children snippets for clean separation"
  - "TemplateConfig interface centralizes all layout sizing config — autoSaveId is unique per template for independent size persistence"
  - "Context-aware sidebar pattern: RightSidebar switches sections based on pagePath prop, not internal routing"

requirements-completed: [UX-01, UX-04]

# Metrics
duration: 12min
completed: 2026-02-21
---

# Phase 08 Plan 02: Panel Layout System Summary

**PaneForge resizable split-pane infrastructure with 4 new components (PanelLayout, LeftSidebar, RightSidebar, ControlBar) and 3 named layout templates (cockpit/focus/minimal) — cockpit is Mercury's default workspace feel**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-21T19:13:52Z
- **Completed:** 2026-02-21T20:22:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- PaneForge installed and importable; PanelLayout wraps PaneGroup/Pane/PaneResizer with collapsible sidebars
- Three built-in layout templates defined in templates.ts: cockpit (3-pane, default), focus (2-pane), minimal (single column)
- UserTemplateRecord type + CRUD (expandUserTemplate, createUserTemplateRecord, loadUserTemplates, saveUserTemplates) for user-created layout templates
- LeftSidebar: quick nav + tag input + decade selector + niche score dropdown + debounced result panel
- RightSidebar: context-aware (artist tags / genre subgenres-related-artists / now playing + queue + taste tags)
- ControlBar: 32px toolbar with search form, layout switcher select (built-ins + user optgroup), theme indicator dot

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PaneForge and create layout template definitions** - `eb0a2de` (feat)
2. **Task 2: Create PanelLayout, LeftSidebar, RightSidebar, ControlBar** - `149abf9` (feat)

## Files Created/Modified
- `src/lib/theme/templates.ts` — LayoutTemplate type, LAYOUT_TEMPLATES config, DEFAULT_TEMPLATE, TEMPLATE_LIST, UserTemplateRecord, expandUserTemplate, createUserTemplateRecord
- `src/lib/theme/preferences.svelte.ts` — Extended with loadUserTemplates and saveUserTemplates
- `src/lib/components/PanelLayout.svelte` — PaneForge wrapper rendering 3/2/1 pane layouts with collapsible sidebars
- `src/lib/components/LeftSidebar.svelte` — Quick nav + discovery filters + debounced sidebar result panel
- `src/lib/components/RightSidebar.svelte` — Context-aware content (artist/genre/default modes) + queue panel
- `src/lib/components/ControlBar.svelte` — 32px toolbar with search, layout switcher, theme indicator
- `package.json` — paneforge added to dependencies

## Decisions Made
- PaneForge chosen for resizable panel engine — built for SvelteKit, autoSaveId for per-template localStorage size persistence
- LayoutTemplate typed as `string` (not a literal union) to accommodate user template IDs alongside built-in IDs without cast overhead
- LeftSidebar discovery controls filter sidebar panel only (per earlier user decision) — sidebar is a parallel browse viewport
- RightSidebar queue replaces the floating Queue overlay in cockpit mode — permanently visible, no backdrop needed
- Three built-in templates: cockpit (3-pane, 22/56/22 defaults), focus (2-pane, 70/30), minimal (single column)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed dead `queueState.setQueue` property reference**
- **Found during:** Task 2 (RightSidebar.svelte implementation)
- **Issue:** Initial code tried to destructure `setQueue` from `queueState` object, but `setQueue` is a module-level exported function — not a property of the state object
- **Fix:** Removed the destructure and dead reference; the dynamic import pattern (`import('$lib/player/queue.svelte').then(...)`) already handles the function call correctly
- **Files modified:** src/lib/components/RightSidebar.svelte
- **Verification:** `npm run check` passed with 0 errors after fix
- **Committed in:** `149abf9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix necessary for TypeScript correctness. No scope creep — single incorrect property access removed.

## Issues Encountered
None — plan executed straightforwardly. PaneForge API matched the plan's assumed API (PaneGroup/Pane/PaneResizer imports from 'paneforge', all props as expected).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four components compile with 0 TypeScript errors
- PanelLayout is ready to slot into root layout (Plan 03's job)
- ControlBar, LeftSidebar, RightSidebar are standalone and testable
- templates.ts provides the full type infrastructure Plan 03 needs
- preferences.svelte.ts now handles user template persistence alongside existing layout/theme/streaming prefs

## Self-Check: PASSED

All files verified present:
- src/lib/theme/templates.ts: FOUND
- src/lib/components/PanelLayout.svelte: FOUND
- src/lib/components/LeftSidebar.svelte: FOUND
- src/lib/components/RightSidebar.svelte: FOUND
- src/lib/components/ControlBar.svelte: FOUND
- .planning/phases/08-underground-aesthetic/08-02-SUMMARY.md: FOUND

All commits verified in git log:
- eb0a2de (Task 1: PaneForge + templates): FOUND
- 149abf9 (Task 2: four components): FOUND

paneforge in package.json: ^1.0.2

---
*Phase: 08-underground-aesthetic*
*Completed: 2026-02-21*
