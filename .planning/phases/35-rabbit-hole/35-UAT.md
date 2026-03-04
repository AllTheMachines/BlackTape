---
status: diagnosed
phase: 35-rabbit-hole
source: 35-01-SUMMARY.md, 35-02-SUMMARY.md, 35-03-SUMMARY.md, 35-04-SUMMARY.md, 35-05-SUMMARY.md
started: 2026-03-04T20:00:00Z
updated: 2026-03-04T20:30:00Z
---

## Current Test

[testing complete]

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
result: issue
reported: "no. it also only shows 'artist not found'"
severity: major

### 6. Artist card content
expected: The artist card shows: artist name, country/year info, tag chips, a row of similar artist chips (when available), and a collapsible release list (loads async after card renders — first 3 releases shown, expand toggle for more). Play and Continue buttons visible at bottom.
result: skipped
reason: artist card blocked by "artist not found" bug (tests 3 + 5)

### 7. Continue navigation
expected: Clicking Continue on an artist card navigates to another artist (a similar artist if available, otherwise a random artist in the same genre). The trail bar updates to show the new entry. The card updates in-place.
result: skipped
reason: artist card blocked by "artist not found" bug (tests 3 + 5)

### 8. Tag exploration page
expected: Clicking a tag chip on an artist card opens /rabbit-hole/tag/[slug]. The page shows the tag name as heading, a grid/wrap of ~20 artist chips (each with a country badge), and a Related Genres & Tags section with co-occurring tag chips.
result: issue
reported: "it shows 4 artist chips with country badges (because i searched for aphex twin) but no genre chips as tags"
severity: major

### 9. Reshuffle on tag page
expected: The tag page has a Reshuffle button. Clicking it reloads the same tag page with a fresh random set of 20 artists — different artists than before (probability virtually certain with any reasonable tag size).
result: pass

### 10. History trail navigation
expected: After visiting several artists/tags, the trail bar at the top of the Rabbit Hole layout shows all visited items in order. Clicking an earlier item in the trail navigates back to that artist or tag.
result: pass

## Summary

total: 10
passed: 4
issues: 4
pending: 0
skipped: 2

## Gaps

- truth: "Search input is centered/prominent on the landing page"
  status: failed
  reason: "User reported: yes. (note that it should be a bit more up in the app. the first third"
  severity: cosmetic
  test: 2
  root_cause: "Layout positioning in +page.svelte — search box vertically centered in viewport instead of positioned in upper third"
  artifacts:
    - path: "src/routes/rabbit-hole/+page.svelte"
      issue: "search box positioned too low — needs to be in upper ~33% of page"
  missing:
    - "Adjust vertical positioning of search container to upper third of viewport"
  debug_session: ""

- truth: "Clicking an artist from search navigates to the artist card page"
  status: failed
  reason: "User reported: no. it shows 'no artist found'"
  severity: major
  test: 3
  root_cause: "artists.slug column is NULL for all rows — pipeline/add-slugs.js was never run after DB rebuild. Autocomplete returns slug:null, navigation goes to /rabbit-hole/artist/null, getArtistBySlug finds nothing."
  artifacts:
    - path: "pipeline/package.json"
      issue: "add-slugs.js missing from pipeline script — never runs automatically"
    - path: "pipeline/add-slugs.js"
      issue: "exists but orphaned from standard pipeline run"
    - path: "pipeline/import.js"
      issue: "never writes to slug column — leaves it NULL"
    - path: "src/lib/db/queries.ts"
      issue: "getArtistBySlug uses WHERE a.slug = ? — cannot match NULL rows"
  missing:
    - "Add add-slugs.js to pipeline/package.json pipeline script"
    - "Run node pipeline/add-slugs.js against dev DB immediately"
  debug_session: ""

- truth: "Random button navigates to a random artist card page"
  status: failed
  reason: "User reported: no. it also only shows 'artist not found'"
  severity: major
  test: 5
  root_cause: "Same root cause as test 3 — artists.slug is NULL, getRandomArtist returns artist with null slug, navigation fails"
  artifacts:
    - path: "pipeline/add-slugs.js"
      issue: "not in pipeline script — slug column stays NULL"
  missing:
    - "Fixed by same fix as test 3"
  debug_session: ""

- truth: "Tag page shows Related Genres & Tags section with co-occurring tag chips"
  status: failed
  reason: "User reported: it shows 4 artist chips with country badges (because i searched for aphex twin) but no genre chips as tags"
  severity: major
  test: 8
  root_cause: "Data issue, not a code bug. tag_cooccurrence has only 2,359 rows with threshold HAVING shared_artists >= 5. Niche tags like 'aphex twin' have no entries. The section is wrapped in {#if relatedTags.length > 0} so it disappears entirely rather than showing an empty state."
  artifacts:
    - path: "src/routes/rabbit-hole/tag/[slug]/+page.svelte"
      issue: "line 79 — {#if relatedTags.length > 0} hides entire section with no empty state"
    - path: "pipeline/build-tag-stats.mjs"
      issue: "line 53 — HAVING shared_artists >= 5 threshold excludes niche tags"
  missing:
    - "Add empty-state message to tag page when relatedTags is empty (Option A)"
  debug_session: ""
