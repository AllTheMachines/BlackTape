---
phase: 27-search-knowledge-base
plan: 02
subsystem: ui
tags: [svelte5, typescript, autocomplete, debounce, fts5, search]

# Dependency graph
requires:
  - phase: 27-search-knowledge-base
    plan: 01
    provides: "searchArtistsAutocomplete() FTS5 prefix query — the data layer powering this dropdown"
provides:
  - "SearchBar.svelte with debounced autocomplete dropdown (200ms, 2+ chars, artist mode only)"
  - "Artist name suggestions with primary genre tag — name + tag displayed per row"
  - "Direct navigation to /artist/{slug} on suggestion click — bypasses search results page"
  - "Blur/mousedown ordering solved: onmousedown fires before onblur, 150ms blur delay"
affects:
  - 27-03 (search page intent routing uses same SearchBar, autocomplete is now live)
  - 27-05 (test manifest — P27-06 through P27-09 verify this plan's deliverables)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onmousedown on dropdown items (not onclick) — fires before input blur, prevents dropdown closing before click registers"
    - "handleBlur with 150ms setTimeout — gives onmousedown time to fire before showSuggestions = false"
    - "Dynamic import of db provider + query inside async function — avoids SSR issues; same pattern as other Tauri-gated DB calls"
    - "Debounced input handler with clearTimeout guard — prevents stale requests on fast typing"

key-files:
  created: []
  modified:
    - src/lib/components/SearchBar.svelte

key-decisions:
  - "onmousedown used for suggestion clicks (not onclick) — blur fires before click, would close dropdown before click registers; mousedown fires first"
  - "handleBlur 150ms delay gives mousedown time to complete before showSuggestions is cleared"
  - "Autocomplete only in artist mode — tag mode has no autocomplete (city/label intent parsing is search page level, Plan 03)"
  - "Dropdown placed after form tag inside .search-bar wrapper — position: absolute + top: 100% anchors it correctly under input"

patterns-established:
  - "Autocomplete dropdown pattern: debounce → fetch → render list → onmousedown select → blur clear with delay"

requirements-completed: [SRCH-01]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 27 Plan 02: SearchBar Autocomplete Summary

**Debounced autocomplete dropdown added to SearchBar — 200ms debounce, FTS5 prefix search after 2 chars, artist name + genre tag per row, direct /artist/{slug} navigation on select**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-25T09:00:19Z
- **Completed:** 2026-02-25T09:02:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `SearchBar.svelte` gains a fully functional autocomplete dropdown — debounced at 200ms, triggered at 2+ characters, artist mode only
- Each suggestion row shows artist name (bold) + primary genre tag (muted) — exactly the disambiguation context Plan 02 specified
- `selectSuggestion()` calls `goto('/artist/{slug}')` — clicking a suggestion skips the search results page entirely and lands on the artist
- `onmousedown` event handling solves the classic blur-before-click race condition — mousedown fires before the input's blur event, so dropdown stays open long enough for click to register
- All pre-existing functionality preserved: mode toggle, form submit, size variants (large/normal)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add autocomplete state and debounced fetch to SearchBar** - `d0431ea` (feat)

**Plan metadata:** (included in docs commit after SUMMARY)

## Files Created/Modified

- `src/lib/components/SearchBar.svelte` - Added autocomplete state, fetchSuggestions, handleInput debounce, selectSuggestion, handleBlur, dropdown template, and autocomplete CSS; added `position: relative` to `.search-bar`

## Decisions Made

- **onmousedown not onclick:** The standard click-outside-to-close dropdown problem. Clicking a suggestion triggers: mousedown → blur → click. With `onclick`, the blur fires first and clears `showSuggestions = false`, making the dropdown disappear before the click can register. Using `onmousedown` sidesteps this — mousedown fires before blur, so the suggestion is captured. A 150ms `setTimeout` in `handleBlur` gives mousedown time to complete.
- **Artist mode only:** Autocomplete only activates when `mode === 'artist'`. Tag mode has no autocomplete at this stage — city/label intent parsing happens in Plan 03 at the search page level, not inside the SearchBar component.
- **Dynamic import inside async function:** `getProvider()` and `searchArtistsAutocomplete` are dynamically imported inside `fetchSuggestions()` — consistent with the Tauri DB access pattern used throughout the project, avoids SSR evaluation issues.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SearchBar autocomplete is live and functional — Plan 03 (search page intent routing) can proceed
- Plan 03 will use `parseSearchIntent()` and `searchByCity()` / `searchByLabel()` from queries.ts (already in place from Plan 01)
- Plan 05 (test manifest) should add P27-06 through P27-09 tests verifying this component's patterns

---
*Phase: 27-search-knowledge-base*
*Completed: 2026-02-25*
