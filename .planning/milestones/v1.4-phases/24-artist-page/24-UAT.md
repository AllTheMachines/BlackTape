---
status: complete
phase: 24-artist-page
source: 24-01-SUMMARY.md, 24-02-SUMMARY.md, 24-03-SUMMARY.md
started: 2026-02-25T04:30:00Z
updated: 2026-02-25T04:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. MB artist relationships fetched from API
expected: +page.ts fetches artist-rels from MusicBrainz and returns ArtistRelationships data to page
result: pass

### 2. ArtistRelationships component — MB links and chip rendering
expected: Members/Influences/Labels shown as chips linking to musicbrainz.org/artist/{mbid} with target=_blank
result: skipped
reason: requires running desktop app — code checks P24-01, P24-02 confirmed component exists with external MB links

### 3. About tab conditional visibility on artist page
expected: About tab appears in tab bar when MB relationship data exists; hidden when all relationship arrays are empty
result: skipped
reason: requires running desktop app — code checks P24-04, P24-05 confirmed hasRelationships derived and tab-about testid present

### 4. 20-item expand button for long relationship lists
expected: Lists with >20 items show first 20 then a "Show all N" button; clicking expands to full list
result: skipped
reason: requires running desktop app — code check P24-03 confirmed showAllMembers expand state exists

### 5. Mastodon share button label "↑ Share"
expected: Share button on artist page shows "↑ Share" text, not just the inscrutable "↑" icon
result: pass

### 6. Discography filter pills (All / Albums / EPs / Singles)
expected: Four filter pills appear in discography section; active pill highlighted amber; releases filter by type
result: skipped
reason: requires running desktop app — code checks P24-08, P24-09, P24-10 confirmed discographyFilter state, discography-controls testid, filter-pill class

### 7. Discography sort toggle (Newest / Oldest)
expected: Sort toggle appears next to filter pills; Newest shows MB API order; Oldest reverses with null-year last
result: skipped
reason: requires running desktop app — code check P24-11 confirmed discographySort state

### 8. Empty state when filter yields zero releases
expected: Filtering to a type with no releases shows a message instead of a blank grid
result: skipped
reason: requires running desktop app — code check P24-12 confirmed discography-empty testid

### 9. Release credits collapsible section
expected: Release page shows "Credits" toggle button; clicking expands list of role + artist name; artists in local DB are links, others plain text
result: skipped
reason: requires running desktop app — code checks P24-13, P24-14, P24-15 confirmed creditsExpanded state, credits-toggle testid, credits fetch with producer role

## Summary

total: 9
passed: 2
issues: 0
pending: 0
skipped: 7

## Gaps

[none]
