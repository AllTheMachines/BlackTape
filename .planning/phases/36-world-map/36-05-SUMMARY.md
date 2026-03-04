---
phase: 36-world-map
plan: "05"
subsystem: ui
tags: [svelte5, leaflet, sqlite, artist-card, slide-panel, component-extraction]

# Dependency graph
requires:
  - phase: 36-world-map/36-03
    provides: Leaflet map with circleMarkers storing _artistData on each marker
  - phase: 36-world-map/36-04
    provides: World map +page.svelte with tag filter chip and db provider reference
  - phase: 35-rabbit-hole/35-04
    provides: Rabbit Hole artist card markup and logic to extract
provides:
  - RabbitHoleArtistCard.svelte reusable component with callback props
  - World map slide-up artist panel with full artist card
  - ?artist=slug deep-link support for world map
affects:
  - rabbit-hole (uses RabbitHoleArtistCard)
  - world-map (panel surfaces the card)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback props pattern for shared components used in multiple navigation contexts
    - DbProvider explicit typing required for generic all<T>() calls (any breaks generics)
    - stopPropagation on marker click to prevent map dismiss handler firing

key-files:
  created:
    - src/lib/components/RabbitHoleArtistCard.svelte
    - .planning/phases/36-world-map/36-05-SUMMARY.md
  modified:
    - src/routes/rabbit-hole/artist/[slug]/+page.svelte
    - src/routes/world-map/+page.svelte
    - BUILD-LOG.md

key-decisions:
  - "Callback props (onTagClick, onSimilarArtistClick, onOpenInRabbitHole) let the same component express context-specific navigation — Rabbit Hole pushes trail items, map panel updates map view"
  - "dbProvider must be explicitly typed as DbProvider (not any) to allow generic all<T>() calls — TypeScript refuses generic type args on any-typed values"
  - "stopPropagation on marker click event prevents bubbling to the map click dismiss handler"
  - "showOpenInRabbitHole prop toggles the Open in Rabbit Hole button — hidden in Rabbit Hole route (redundant), shown in map panel"
  - "Panel uses CSS transform translateY animation not opacity/display for slide-up — enables GPU compositing, smooth 60fps"

patterns-established:
  - "Shared card pattern: extract visual component with callback props; callers own navigation, component owns rendering"
  - "Map panel data fetch: openArtistPanel() fetches artist + similar + links in parallel via Promise.all, graceful degradation on catch"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-03-04
---

# Phase 36 Plan 05: World Map Artist Panel Summary

**RabbitHoleArtistCard extracted as shared component; world map gets slide-up panel showing full artist card on pin click with ?artist= deep-link**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-04T15:35:50Z
- **Completed:** 2026-03-04T15:43:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extracted `RabbitHoleArtistCard.svelte` — single source of truth for the artist card UI with callback props for navigation
- Rabbit Hole artist page reduced to a 35-line thin wrapper — visually identical to before
- World map slide-up bottom panel with 0.28s cubic-bezier animation, dismiss via background click or X button
- `?artist=slug` deep-link: map centers on artist and opens panel on load
- Panel fetches artist, similar artists, and streaming links in parallel; graceful degradation on error

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract RabbitHoleArtistCard.svelte component** - `b49c6bcc` (feat)
2. **Task 2: Add slide-up bottom panel and wire marker clicks** - `f2483b19` (feat)

## Files Created/Modified

- `src/lib/components/RabbitHoleArtistCard.svelte` - Reusable artist card with callback props (onTagClick, onSimilarArtistClick, onOpenInRabbitHole, showOpenInRabbitHole)
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` - Refactored to use RabbitHoleArtistCard (35-line thin wrapper)
- `src/routes/world-map/+page.svelte` - Added panel state, openArtistPanel(), marker click wiring, map dismiss click, ?artist= URL param handling, panel HTML, panel CSS

## Decisions Made

- Callback props pattern: `onTagClick`, `onSimilarArtistClick`, `onOpenInRabbitHole` allow the same component to express context-specific navigation. Rabbit Hole pushes trail items; map panel updates map view and navigates to artist location.
- `dbProvider` must be explicitly typed as `DbProvider` (not `any`) to allow generic `all<T>()` calls. TypeScript rejects generic type arguments on `any`-typed function calls.
- `stopPropagation` on marker click event prevents the click from bubbling to the map's dismiss handler.
- `showOpenInRabbitHole` prop controls the "Open in Rabbit Hole →" button — hidden in the Rabbit Hole route (redundant), shown in the map panel.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error on generic db.all() call**
- **Found during:** Task 2 (Add slide-up panel)
- **Issue:** `dbProvider.all<{ platform: string; url: string }>()` failed type check because `db` variable is `any` and the inferred `dbProvider` was also `any` — TypeScript disallows generic type arguments on `any`-typed calls
- **Fix:** Added `import type { DbProvider }` and explicitly typed `const dbProvider: DbProvider = ...`
- **Files modified:** `src/routes/world-map/+page.svelte`
- **Verification:** `npm run check` 0 errors after fix
- **Committed in:** `f2483b19` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Single-line type annotation fix. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript error above.

## Next Phase Readiness

- World map is complete: pins render, tag filter works, artist panel slides up on click with full card
- Phase 36 is done — all 5 plans complete
- `RabbitHoleArtistCard` is ready for any future surface that needs to display an artist card

---
*Phase: 36-world-map*
*Completed: 2026-03-04*
