---
phase: 36-world-map
plan: "03"
subsystem: ui
tags: [leaflet, leaflet-markercluster, cartocdn, svelte, typescript, map, geocoding]

# Dependency graph
requires:
  - phase: 36-01
    provides: world-map route scaffold with stub +page.svelte, GeocodedArtist type
  - phase: 34-02
    provides: city_lat, city_lng, city_precision columns on artists table
  - phase: 34-04
    provides: getGeocodedArtists query and GeocodedArtist interface
provides:
  - Full Leaflet map at /world-map with CartoDB Dark Matter tiles
  - markerClusterGroup with amber divIcon cluster bubbles
  - circleMarker per GeocodedArtist with precision-tier opacity
  - onDestroy cleanup preventing Map container already initialized errors
  - _artistData stored on each marker for Plan 05 artist panel
affects: [36-04, 36-05, 36-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Leaflet + markercluster CSS injected at runtime in onMount with data-* guards — prevents duplicate injection on revisit"
    - "Import order: leaflet before leaflet.markercluster (markercluster patches L as side-effect)"
    - "precision-tier opacity: city 1.0, region 0.6, country 0.3 — communicates geocoding confidence visually"
    - "map.invalidateSize() after marker build — resolves deferred layout size calculation"
    - "onDestroy(() => { map?.remove(); map = null }) — mandatory cleanup for SPA revisit safety"

key-files:
  created: []
  modified:
    - src/routes/world-map/+page.svelte

key-decisions:
  - "Both MarkerCluster.css and MarkerCluster.Default.css injected at runtime — structural CSS handles cluster group positions, Default CSS handles visual styling; missing either breaks cluster rendering"
  - "leaflet must be imported before leaflet.markercluster — markercluster patches L as side effect; wrong order breaks L.markerClusterGroup"
  - "circleMarker radius 6 with amber fill (#c4a55a) — matches design system accent color, consistent with Rabbit Hole amber theme"
  - "_artistData stored on each marker for Plan 05 — no refetch needed when artist panel opens"

patterns-established:
  - "Precision-tier opacity pattern: PRECISION_OPACITY record maps city_precision string to opacity value; apply to both opacity and fillOpacity of circleMarker"
  - "Leaflet cleanup pattern: onDestroy calls map?.remove() and nulls the ref — prevents Map container already initialized error on SPA back-navigation"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 36 Plan 03: World Map Leaflet Implementation Summary

**Live Leaflet map at /world-map with CartoDB Dark Matter tiles, amber markerClusterGroup, and precision-tier opacity for 50,000+ geocoded artist pins**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T15:27:38Z
- **Completed:** 2026-03-04T15:33:38Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Replaced stub +page.svelte with full Leaflet map — dark CartoDB tiles, amber cluster bubbles, amber circleMarkers
- Precision-tier opacity system signals geocoding confidence: city pins fully opaque, region pins muted, country centroids faded
- onDestroy cleanup with map.remove() prevents the "Map container is already initialized" error when navigating away and back
- Both MarkerCluster CSS files injected at runtime with data-* attribute guards to prevent duplicate injection
- _artistData stored on markers for Plan 05 artist panel — no re-fetch needed on click

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Leaflet map with clustering and precision-tier opacity** - `41d37f62` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/routes/world-map/+page.svelte` - Full Leaflet implementation replacing the Plan 01 stub
- `BUILD-LOG.md` - Entry documenting Plan 03 decisions

## Decisions Made
- Both `MarkerCluster.css` and `MarkerCluster.Default.css` must be injected. Structural CSS handles positioning and z-index of cluster layers; Default CSS handles the visual appearance. Missing either file silently breaks cluster rendering.
- Import order for Leaflet + markercluster is critical: `leaflet` imported first, then `leaflet.markercluster` as a side-effect import. Markercluster patches the `L` global; importing in reverse order means the patch hasn't happened yet.
- `circleMarker` chosen over custom marker icons — radius 6, amber fill, weight 1. Clean minimal aesthetic that fits the dark map. Precision tier communicated through opacity alone, not shape or size variation.
- `_artistData` stored directly on the marker object for Plan 05. When a user clicks a pin to open the artist panel, the data is already there — no second DB lookup needed.
- `map.invalidateSize()` called after `buildMarkers()` to handle any layout size resolution issues from CSS loading timing (Pitfall 1 from RESEARCH.md).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Map is live with CartoDB tiles, amber clusters, and precision-tier pins
- `_artistData` on each marker ready for Plan 05 artist panel click handler
- URL params (`?artist=` and `?tag=`) already loaded by `+page.ts` from Plan 01 — Plans 04 and 05 can use them immediately
- Plan 04 (tag filter UI) can add a floating filter chip that calls `buildMarkers()` with a filtered artist list

---
*Phase: 36-world-map*
*Completed: 2026-03-04*
