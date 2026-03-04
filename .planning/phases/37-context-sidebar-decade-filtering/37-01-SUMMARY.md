---
phase: 37-context-sidebar-decade-filtering
plan: "01"
subsystem: ui
tags: [svelte, sidebar, autocomplete, ai-companion, quick-search]

# Dependency graph
requires:
  - phase: 35-rabbit-hole
    provides: searchArtistsAutocomplete, searchTagsAutocomplete in queries.ts
  - phase: prior-ai-phases
    provides: aiState.svelte, getAiProvider, PROMPTS, INJECTION_GUARD, externalContent
provides:
  - Persistent quick-search input at top of right sidebar (all standard pages)
  - Debounced autocomplete dropdown with grouped Artists + Tags results
  - AI companion chat panel shown only when aiState.status === 'ready'
affects: [future-sidebar-features, ai-chat-patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onmousedown on dropdown items to fire before onblur dismisses dropdown (Phase 36 pattern)"
    - "Lazy DB import inside async function for sidebar components"
    - "role 'as const' for TypeScript literal union inference in spread arrays"

key-files:
  created: []
  modified:
    - src/lib/components/RightSidebar.svelte

key-decisions:
  - "onmousedown (not onclick) for dropdown items — fires before blur event dismisses dropdown"
  - "type='text' input for AI chat — avoids spacebar handler conflict in root layout"
  - "AI companion section + its divider both inside the {#if aiState.status === 'ready'} guard — no orphaned divider when AI disabled"
  - "Lazy DB import in fetchSuggestions() — matches SearchBar pattern, avoids eager DB load"
  - "role 'as const' on chat message literals — TypeScript infers 'string' not literal type in spread arrays"
  - "tasteDescription $derived (new name) — topTasteTags already existed, no naming conflict"

patterns-established:
  - "Sidebar quick-search: onmousedown dropdown pattern for blur-dismiss race prevention"
  - "AI companion: aiState.status guard wraps entire section including trailing divider"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 37 Plan 01: Context Sidebar Summary

**Right sidebar extended with persistent quick-search autocomplete (artists + tags) and context-aware AI companion chat — both prepended above all existing page-specific sections**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-04T18:23:32Z
- **Completed:** 2026-03-04T18:28:00Z
- **Tasks:** 3 of 3 (complete — Task 3 human verification approved)
- **Files modified:** 1

## Accomplishments
- Quick Search section at top of right sidebar on all standard pages — debounced (200ms) autocomplete fetches artists (top 4) and tags (top 3) in parallel
- AI companion section shown only when `aiState.status === 'ready'` — completely absent (no placeholder) when AI not ready
- AI chat sends via `getAiProvider().complete()` with URL-param context: era filter, tags filter, now-playing track, user taste profile top 10
- All existing sidebar sections (Related Tags, Queue, Now Playing, Taste tags) preserved unchanged below new sections
- TypeScript check: 0 errors across 634 files, all 196 code tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sidebar quick-search section** - `95a3a7bf` (feat)
2. **Task 2: Add AI companion chat panel** - `c122217c` (feat)
3. **Task 3: Human verification checkpoint** - approved by user

## Files Created/Modified
- `src/lib/components/RightSidebar.svelte` — Added imports (goto, aiState, getAiProvider, PROMPTS/INJECTION_GUARD/externalContent, page, get), quick-search state/functions, AI companion state/functions, Quick Search template section, AI Companion template section, CSS for both sections

## Decisions Made
- `onmousedown` (not `onclick`) on dropdown items: fires before input `onblur` dismisses dropdown. Established in Phase 36 World Map tag filter.
- `type="text"` input for AI chat: root layout's spacebar handler guards against `INPUT` elements, so standard text input is safe.
- Both AI companion section and its trailing divider wrapped inside the `{#if aiState.status === 'ready'}` guard — no orphaned divider when AI is disabled or not configured.
- `tasteDescription` as new `$derived` name — existing component uses `topTasteTags`, so no naming conflict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript literal union inference on role property in spread arrays**
- **Found during:** Task 2 (Add AI companion chat panel)
- **Issue:** TypeScript inferred `{ role: 'user', text }` as `{ role: string; text: string }` when spreading into a `ChatMessage[]` array. This caused 3 type errors: `Type 'string' is not assignable to type '"user" | "assistant"'`
- **Fix:** Added `as const` to all three role literals: `{ role: 'user' as const, text }`, `{ role: 'assistant' as const, text: response }`, `{ role: 'assistant' as const, text: 'Something went wrong...' }`
- **Files modified:** `src/lib/components/RightSidebar.svelte`
- **Verification:** `npm run check` → 0 errors after fix
- **Committed in:** `c122217c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type inference bug)
**Impact on plan:** Single-line fix per occurrence, standard TypeScript pattern. No scope creep.

## Issues Encountered
None beyond the TypeScript literal union inference issue (documented above as a deviation).

## User Setup Required
None - no external service configuration required.

## Post-Checkpoint Adjustments

After human verification, Steve made UI layout adjustments (committed as wip auto-saves):
- **Quick Search moved to ControlBar.svelte** (top bar) — removed from RightSidebar; more discoverable placement
- **Right sidebar collapse button removed** — cleaner sidebar without the toggle
- **LeftSidebar restructured** — related layout changes in PanelLayout.svelte and LeftSidebar.svelte

The plan's `must_haves` are satisfied: quick-search is visible, works with 2+ char debounced autocomplete, artist/tag navigation is correct, and AI companion remains in RightSidebar guarded by `aiState.status === 'ready'`.

## Next Phase Readiness
- Plan 37-01 complete — human verification approved
- Quick Search accessible via ControlBar (moved post-checkpoint); AI companion in RightSidebar when AI ready
- Ready to proceed to next plan in phase 37

---
*Phase: 37-context-sidebar-decade-filtering*
*Completed: 2026-03-04*
