---
status: diagnosed
phase: 36-world-map
source: 36-01-SUMMARY.md, 36-02-SUMMARY.md, 36-03-SUMMARY.md, 36-04-SUMMARY.md, 36-05-SUMMARY.md, 36-06-SUMMARY.md
started: 2026-03-04T20:35:00Z
updated: 2026-03-04T21:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. World Map nav entry
expected: Desktop nav shows a "World Map" link. Clicking it loads /world-map with a full-viewport dark map (CartoDB Dark Matter tiles) and amber-colored cluster bubbles showing artist locations. No standard nav/sidebar/footer visible — just Titlebar and Player.
result: issue
reported: "i dont see any amber-colored cluster bubbles. i see the world map and that there is no nav sidebar. but i see that weird thing (white) in the upper left corner — tag filter widget with white background showing '0 artists'"
severity: major

### 2. Marker clustering
expected: Zoomed out, nearby pins are grouped into amber cluster bubbles with a count. Zooming in causes clusters to break apart into individual artist pins.
result: skipped
reason: no artist data loading (0 artists shown) — blocked by test 1 issue

### 3. Precision-tier opacity
expected: Artist pins vary in opacity based on geocoding precision — city-level pins are fully opaque, region-level pins are muted, country-level pins are faded.
result: skipped
reason: no artist data loading (0 artists shown) — blocked by test 1 issue

### 4. Tag filter
expected: A floating search/filter input is visible in the top-left corner of the map. Typing into it shows tag autocomplete suggestions with artist counts. Selecting a tag filters the visible pins to only artists with that tag.
result: pass

### 5. URL sync
expected: After filtering by a tag, the URL updates to include ?tag=... without adding a new browser history entry. Reloading the page with ?tag= in the URL shows the map pre-filtered.
result: skipped
reason: not observable in Tauri desktop — no visible address bar

### 6. Artist detail panel
expected: Clicking any artist pin (or cluster → individual pin) slides up a bottom panel showing the artist's card — name, tags, similar artists, and streaming links.
result: skipped
reason: no artist pins visible (0 artists loading) — blocked by test 1 issue

### 7. See on map — cross-links from Rabbit Hole
expected: On a Rabbit Hole artist page (for a geocoded artist), a "See on map" button is visible. Clicking it opens /world-map with that artist's pin highlighted or panel open.
result: skipped
reason: artist card broken (test 3/5 phase 35) — cannot reach Rabbit Hole artist page to verify

## Summary

total: 7
passed: 1
issues: 1
pending: 0
skipped: 5

## Gaps

- truth: "World Map shows amber cluster bubbles with artist locations"
  status: failed
  reason: "User reported: no clusters, map shows 0 artists. Tag filter widget has white background clashing with dark map theme."
  severity: major
  test: 1
  root_cause: "Two separate bugs: (1) Geocoding pipeline (build-geocoding.mjs) was never run — city_lat/city_lng/city_precision columns don't exist on artists table (added by ALTER TABLE in build-geocoding.mjs). getGeocodedArtists silently returns [] via try/catch. Secondary bug: query selects a.tags but tags live in artist_tags not artists. (2) Tag filter white background: WebView2 native input widget painter overrides CSS background — needs -webkit-appearance: none; appearance: none on .wm-filter-input"
  artifacts:
    - path: "src/routes/world-map/+page.ts"
      issue: "calls getGeocodedArtists which returns [] silently when geocoding columns missing"
    - path: "src/lib/db/queries.ts"
      issue: "getGeocodedArtists selects a.tags but artists table has no tags column; also queries city_precision/city_lat/city_lng which don't exist before pipeline runs"
    - path: "pipeline/build-geocoding.mjs"
      issue: "adds geocoding columns via ALTER TABLE — must be run to populate map data"
    - path: "src/routes/world-map/+page.svelte"
      issue: ".wm-filter-input missing -webkit-appearance: none; appearance: none — WebView2 paints native white widget background"
  missing:
    - "Run node pipeline/build-geocoding.mjs to populate geocoding columns"
    - "Fix getGeocodedArtists to fetch tags via subquery from artist_tags instead of a.tags"
    - "Add -webkit-appearance: none; appearance: none to .wm-filter-input in +page.svelte"
  debug_session: ""
