---
status: testing
phase: 35-rabbit-hole
source: 35-01-SUMMARY.md, 35-02-SUMMARY.md, 35-03-SUMMARY.md, 35-04-SUMMARY.md, 35-05-SUMMARY.md
started: 2026-03-04T20:00:00Z
updated: 2026-03-04T20:00:00Z
---

## Current Test

number: 5
name: Random button
expected: |
  The landing page has a Random button. Clicking it navigates to a random artist card page (/rabbit-hole/artist/[slug]). The artist is added to the trail.
awaiting: user response

## Tests

### 1. Rabbit Hole nav entry
expected: Desktop nav shows a "Rabbit Hole" link (after Discover). Clicking it loads the /rabbit-hole route. The page renders in immersive mode — no left sidebar, no header nav, no footer. Only Titlebar and Player remain visible at top/bottom.
result: pass

### 2. Landing page search
expected: The landing page shows a search input with placeholder text. Typing into it shows a grouped autocomplete dropdown — Artists section (up to 6 results) and Genres & Tags section (up to 6 results). Each artist result shows name + first tag. Each tag result shows name + artist count.
result: issue
reported: "yes. (note that it should be a bit more up in the app. the first third"
severity: cosmetic

### 3. Navigate to artist from search
expected: Clicking an artist in the autocomplete dropdown navigates to /rabbit-hole/artist/[slug]. The artist card loads in-place (no full page reload feel). The history trail bar at the top shows the visited artist.
result: issue
reported: "no. it shows 'no artist found'"
severity: major

### 4. Navigate to tag from search
expected: Clicking a tag in the autocomplete dropdown navigates to /rabbit-hole/tag/[slug]. The tag page loads. The history trail bar shows the visited tag.
result: pass

### 5. Random button
expected: The landing page has a Random button. Clicking it navigates to a random artist card page (/rabbit-hole/artist/[slug]). The artist is added to the trail.
result: [pending]

### 6. Artist card content
expected: The artist card shows: artist name, country/year info, tag chips, a row of similar artist chips (when available), and a collapsible release list (loads async after card renders — first 3 releases shown, expand toggle for more). Play and Continue buttons visible at bottom.
result: [pending]

### 7. Continue navigation
expected: Clicking Continue on an artist card navigates to another artist (a similar artist if available, otherwise a random artist in the same genre). The trail bar updates to show the new entry. The card updates in-place.
result: [pending]

### 8. Tag exploration page
expected: Clicking a tag chip on an artist card opens /rabbit-hole/tag/[slug]. The page shows the tag name as heading, a grid/wrap of ~20 artist chips (each with a country badge), and a Related Genres & Tags section with co-occurring tag chips.
result: [pending]

### 9. Reshuffle on tag page
expected: The tag page has a Reshuffle button. Clicking it reloads the same tag page with a fresh random set of 20 artists — different artists than before (probability virtually certain with any reasonable tag size).
result: [pending]

### 10. History trail navigation
expected: After visiting several artists/tags, the trail bar at the top of the Rabbit Hole layout shows all visited items in order. Clicking an earlier item in the trail navigates back to that artist or tag.
result: [pending]

## Summary

total: 10
passed: 2
issues: 2
pending: 6
skipped: 0

## Gaps

- truth: "Search input is centered/prominent on the landing page"
  status: failed
  reason: "User reported: yes. (note that it should be a bit more up in the app. the first third"
  severity: cosmetic
  test: 2
  artifacts: []
  missing: []

- truth: "Clicking an artist from search navigates to the artist card page"
  status: failed
  reason: "User reported: no. it shows 'no artist found'"
  severity: major
  test: 3
  artifacts: []
  missing: []
