---
phase: 36-world-map
plan: "06"
subsystem: ui
tags: [svelte, sveltekit, rabbit-hole, world-map, cross-linking, geocoordinates]

# Dependency graph
requires:
  - phase: 36-05
    provides: RabbitHoleArtistCard extracted, slide-up artist panel, world-map route complete
  - phase: 35-04
    provides: Rabbit Hole artist page (+page.ts load function, +page.svelte structure)
  - phase: 35-05
    provides: Rabbit Hole tag page (+page.svelte structure)
provides:
  - "See on map" button on Rabbit Hole artist pages (conditional on geocoordinates)
  - "See on map" button on Rabbit Hole tag/genre pages (always shown)
  - Bidirectional deep-linking between Rabbit Hole and World Map
  - hasGeocoordinates flag in artist page load function
affects:
  - phase-37
  - any future plans touching Rabbit Hole artist or tag pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional geo cross-link: lightweight SQL check (city_lat IS NOT NULL) in page.ts load, not full getGeocodedArtists call"
    - "Cross-link button style: border pill with var(--acc) hover, var(--t-3) default — matches phase design system"
    - "encodeURIComponent for tag slugs in cross-links (established pattern from 35-03/35-05)"

key-files:
  created: []
  modified:
    - src/routes/rabbit-hole/artist/[slug]/+page.ts
    - src/routes/rabbit-hole/artist/[slug]/+page.svelte
    - src/routes/rabbit-hole/tag/[slug]/+page.svelte

key-decisions:
  - "Lightweight SQL geo check in load function — SELECT (city_lat IS NOT NULL) FROM artists WHERE id=? avoids loading 50K geocoded artist records just to check one artist"
  - "hasGeocoordinates flag returned from +page.ts load — clean data/UI separation, Svelte $derived reads it reactively"
  - "Conditional artist cross-link — 'See on map' only shown if artist has geocoordinates; avoids sending user to a map with no visible pin"
  - "Tag cross-link always shown — tags always have map pins if any tagged artist is geocoded; no conditional needed"
  - "Human verification approved with noted DB limitation — sample DB (10K artists, 123 geocoded) prevents full end-to-end test; approved pending full pipeline import"

patterns-established:
  - "Geo cross-link pattern: check geocoordinates in load fn, pass flag to component, conditionally render link"
  - "World Map deep-link format: /world-map?artist=[slug] and /world-map?tag=[encoded-slug]"

requirements-completed: []

# Metrics
duration: ~10min
completed: 2026-03-04
---

# Phase 36 Plan 06: Cross-Links Summary

**"See on map" cross-link buttons on Rabbit Hole artist and tag pages, closing the bidirectional discovery loop between Rabbit Hole and World Map**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments

- Added `hasGeocoordinates` check to Rabbit Hole artist page load function — lightweight single-row SQL query, not a full geocoded artists fetch
- "See on map" button rendered conditionally on artist pages (only for geocoded artists) — links to `/world-map?artist=[slug]`
- "See on map" button always rendered on tag/genre pages — links to `/world-map?tag=[encodeURIComponent(tag)]`
- Phase 36 World Map feature complete — pins, clustering, tag filter, artist panel, and bidirectional Rabbit Hole cross-links all live

## Task Commits

Each task was committed atomically:

1. **Task 1: Add "See on map" cross-links to Rabbit Hole pages** - `dc484501` (feat)
2. **Task 2: Human verification** - approved (checkpoint, no commit)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/routes/rabbit-hole/artist/[slug]/+page.ts` — Added `hasGeocoordinates` SQL check in load function; returned in page data
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` — Added conditional "See on map" link + `.rh-map-link` / `.rh-map-link-wrap` styles
- `src/routes/rabbit-hole/tag/[slug]/+page.svelte` — Added "See on map" link in genre header + `.rh-map-link` style

## Decisions Made

- Used a direct SQL query (`SELECT (city_lat IS NOT NULL AND city_lat != 0) as has_geo FROM artists WHERE id = ?`) instead of calling `getGeocodedArtists()` — the latter loads up to 50K records just to determine if one artist is geocoded
- `hasGeocoordinates` flag threaded through load return → `$derived(data.hasGeocoordinates)` in the component — clean separation of data and presentation
- Tag cross-links unconditional — a tag page may have many geocoded artists even if a random sample of 20 doesn't show them; always linking is correct behavior
- Human verification gate approved by user with caveat: sample database (10K artists, 123 geocoded) makes full end-to-end visual verification impossible until the full geocoding pipeline runs against the complete 2.6M artist dataset

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript check passed, links render correctly. The only limitation is the sample database size for end-to-end visual testing, which is a data/pipeline concern, not a code issue.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 36 World Map is complete. All 6 plans delivered:
- 36-01: Route scaffold
- 36-02: Layout bypass + nav
- 36-03: Leaflet map (CartoDB tiles, markerClusterGroup, precision-tier opacity)
- 36-04: Tag filter chip (in-memory filter, URL replaceState, autocomplete)
- 36-05: Artist panel (RabbitHoleArtistCard extracted, slide-up panel)
- 36-06: Cross-links (bidirectional Rabbit Hole ↔ World Map deep-links)

Phase 37 (Context Sidebar + Decade Filtering) is the next planned phase. No blockers.

The full feature will come alive once the complete geocoding pipeline runs (`pipeline/build-geocoding.mjs`) against the 2.6M artist dataset (~15-17 hours). That pipeline is already implemented and idempotent (34-02).

---
*Phase: 36-world-map*
*Completed: 2026-03-04*
