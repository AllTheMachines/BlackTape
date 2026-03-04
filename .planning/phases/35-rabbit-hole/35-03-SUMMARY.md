---
phase: 35-rabbit-hole
plan: "03"
subsystem: rabbit-hole-ui
tags: [svelte, search, autocomplete, rabbit-hole, discovery]
dependency_graph:
  requires:
    - 35-01  # query functions + trail store
    - 35-02  # route wiring + sub-layout
  provides:
    - rabbit-hole landing page (search + Random entry point)
  affects:
    - src/routes/rabbit-hole/
tech_stack:
  added: []
  patterns:
    - Svelte 5 $state/$derived runes for reactive search state
    - Parallel Promise.all for dual autocomplete (artists + tags)
    - Debounced input (200ms) to avoid per-keystroke DB calls
    - getProvider() + onMount pattern for client-side DB access
key_files:
  created:
    - src/routes/rabbit-hole/+page.svelte
    - src/routes/rabbit-hole/+page.ts
  modified: []
decisions:
  - "+page.ts is minimal (empty load) — all search runs client-side through DB provider on input events, not on page load"
  - "Search queries artists and tags in parallel via Promise.all — single 200ms debounce covers both"
  - "Tag slug uses encodeURIComponent(tag) to handle spaces and special chars in tag URLs"
  - "Random button fails silently — null result from getRandomArtist() shows nothing; edge case on empty DB"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 35 Plan 03: Rabbit Hole Landing Page Summary

Rabbit Hole entry point built — unified search (artists + tags in parallel) with grouped autocomplete dropdown and a Random button that instantly navigates to a random artist card.

## What Was Built

### Task 1: Landing page load function (+page.ts)
Minimal `PageLoad` returning `{}`. The landing needs no server data — all search happens client-side on input events via the DB provider.

**File:** `src/routes/rabbit-hole/+page.ts`

### Task 2: Landing page component (+page.svelte)
Centered landing layout: tagline ("Where do you want to go?"), search input with grouped autocomplete, and a Random button.

**Search behavior:**
- 200ms debounced input handler
- Parallel `Promise.all([searchArtistsAutocomplete, searchTagsAutocomplete])` on each debounce fire
- Results grouped: Artists section (up to 6) then Genres & Tags section (up to 6)
- Artist result shows name + first tag for disambiguation
- Tag result shows name + artist_count

**Navigation:**
- Clicking artist: `pushTrailItem({ type: 'artist', ... })` then `goto('/rabbit-hole/artist/[slug]')`
- Clicking tag: `pushTrailItem({ type: 'tag', slug: encodeURIComponent(tag), ... })` then `goto('/rabbit-hole/tag/[slug]')`
- Both navigations use `keepFocus: true, noScroll: true` for in-frame feel

**Random button:**
- Calls `getRandomArtist(db)`, pushes to trail, navigates
- Loading state ("Finding...") while async fetch runs
- Silent failure on null result (edge case: empty DB)

**File:** `src/routes/rabbit-hole/+page.svelte` (278 lines)

## Verification

- `npm run check`: 0 errors, 619 files checked
- All 196 code tests pass
- Files exist at expected paths

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/routes/rabbit-hole/+page.ts` — FOUND
- `src/routes/rabbit-hole/+page.svelte` — FOUND
- Commit `7e0e8c4f` (Task 1) — FOUND
- Commit `cae4c6e2` (Task 2) — FOUND
