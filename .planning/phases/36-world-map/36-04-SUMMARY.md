---
phase: 36-world-map
plan: "04"
subsystem: ui
tags: [svelte5, leaflet, world-map, tag-filter, url-sync, autocomplete, replaceState]

# Dependency graph
requires:
  - phase: 36-world-map/36-03
    provides: Leaflet map with markerClusterGroup, buildMarkers(), GeocodedArtist pins, clusterGroup state
  - phase: 36-world-map/36-01
    provides: +page.ts load function with tagFilter URL param parsing, getGeocodedArtists()
  - phase: 34-pipeline/34-04
    provides: GeocodedArtist type with tags field, getGeocodedArtists query
  - phase: 35-rabbit-hole/35-01
    provides: searchTagsAutocomplete() for tag autocomplete suggestions

provides:
  - Floating tag filter chip (top-left of map, backdrop blur, absolute positioned)
  - In-memory getFilteredArtists() filtering by comma-split tags exact match
  - URL sync via goto() with replaceState: true — no history pollution on keystrokes
  - Pre-filter support from ?tag= URL param on load
  - Autocomplete dropdown from searchTagsAutocomplete(), debounced 150ms
  - filteredCount $derived chip showing matching artist count
  - Clear button restoring all pins

affects:
  - 36-05 (artist panel — same +page.svelte, same marker data)
  - Rabbit Hole genre pages (link to /world-map?tag=X for geographic exploration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "leafletRef pattern: store L after import so $effect can call buildMarkers() outside onMount"
    - "onmousedown for suggestions: fires before input onblur so dropdown isn't dismissed before selection"
    - "replaceState URL sync: goto(url, { replaceState: true, keepFocus: true, noScroll: true }) for filter inputs"
    - "DB provider in onMount: import('$lib/db/provider') in onMount before leaflet import for autocomplete"

key-files:
  created: []
  modified:
    - src/routes/world-map/+page.svelte

key-decisions:
  - "leafletRef variable stores L after onMount import so $effect (outside onMount) can rebuild markers reactively"
  - "onmousedown for suggestion selection — fires before input's onblur which dismisses the dropdown after 150ms delay"
  - "$effect reads activeTag and artists before the guard check to ensure reactive tracking of both dependencies"
  - "getFilteredArtists() called twice (once in $effect, once for filteredCount $derived) — acceptable at 50K records ~2ms"
  - "DB provider acquired in onMount before leaflet imports — ensures db is available for autocomplete by the time user types"

patterns-established:
  - "leafletRef pattern: store Leaflet L reference as module variable so reactive effects can call map methods"
  - "replaceState URL sync for filter inputs: standard pattern for world-map and any future filter-by-param pages"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 36 Plan 04: World Map Tag Filter Summary

**Floating tag filter chip on world map — in-memory filtering by comma-split tags, URL sync via replaceState, autocomplete from DB, pre-filter from ?tag= param**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-04T15:31:19Z
- **Completed:** 2026-03-04T15:43:00Z
- **Tasks:** 1/1
- **Files modified:** 2 (page.svelte + BUILD-LOG.md)

## Accomplishments
- Floating `.wm-filter` chip in top-left of map with glassmorphism input (backdrop blur, semi-transparent dark background)
- `getFilteredArtists()` in-memory filter — splits `GeocodedArtist.tags` comma-separated string, exact lowercase match, runs in ~2ms on 50K records
- `$effect` reactively rebuilds `markerClusterGroup` whenever `activeTag` or `artists` changes, using stored `leafletRef`
- URL sync with `goto(url, { replaceState: true, keepFocus: true, noScroll: true })` — no back-button pollution from every keystroke
- Pre-filter: `activeTag` initialized from `tagFilter` URL param before markers are built in `onMount`
- Autocomplete suggestions from `searchTagsAutocomplete()` via DB provider, debounced 150ms, min 2 chars
- `filteredCount` `$derived` — shows "X artists" below the input
- Clear button (✕) resets filter, navigates to `/world-map`, rebuilds all pins
- `npm run check` 0 errors, all 196 code tests pass

## Task Commits

1. **Task 1: Add floating tag filter with in-memory filtering and URL sync** - `1018186d` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/routes/world-map/+page.svelte` - Added tag filter state variables, getFilteredArtists(), handleTagInput(), selectSuggestion(), $effect for reactive rebuild, leafletRef storage, filter UI HTML, filter CSS
- `BUILD-LOG.md` - Entry for Plan 04 completion

## Decisions Made

- `leafletRef` stores `L` after `onMount` import so the `$effect` reactive effect (which executes outside `onMount`) can call `buildMarkers()` after any `activeTag` change. Without this, the effect has no way to access the Leaflet namespace.

- `onmousedown` (not `onclick`) for suggestion buttons — the input's `onblur` handler fires with a 150ms delay then dismisses the dropdown. `onclick` fires after `onblur`, so the dropdown is already gone. `onmousedown` fires on pointer-down before blur, captures the selection correctly.

- `$effect` reads `activeTag` and `artists` before the guard check (`if (!map || !clusterGroup || !leafletRef) return`) to ensure Svelte's reactive tracking registers both as dependencies. If they were only read inside `getFilteredArtists()` after an early return, the effect might not track them.

- `getFilteredArtists()` called in two places: `$effect` and the `filteredCount $derived`. This is intentional — the overhead is ~2ms per call on 50K records, and keeping the logic in a single function is cleaner than caching.

- DB provider acquired early in `onMount` (before leaflet imports) so `db` is populated before the user can type. If acquired lazily on first autocomplete, there'd be a cold-start delay on the first keystroke.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Tag filter complete. Plan 05 (artist panel) can now read `marker._artistData` on click and display the artist panel alongside the filtered map.
- The `wm-filter` overlay pattern (absolute positioning over `.wm-root`) is established — the artist panel in Plan 05 will follow the same placement approach.

---
*Phase: 36-world-map*
*Completed: 2026-03-04*
