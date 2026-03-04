---
phase: 35-rabbit-hole
plan: "05"
subsystem: rabbit-hole-ui
tags: [svelte5, rabbit-hole, discovery, genre-page, routing]
dependency_graph:
  requires:
    - 35-01  # query functions (getArtistsByTagRandom, getRelatedTags) + trail store
    - 35-02  # sub-layout (isRabbitHole bypass, trail bar)
  provides:
    - src/routes/rabbit-hole/tag/[slug] — genre/tag exploration page
  affects:
    - src/routes/rabbit-hole/artist/[slug]/+page.svelte  # links to tag pages
    - src/routes/rabbit-hole/+page.svelte  # landing links to tag pages
tech_stack:
  added: []
  patterns:
    - "goto() with invalidateAll: true — re-run load function on same URL (reshuffle pattern)"
    - "decodeURIComponent(params.slug) — restore raw tag string from URL-safe slug"
    - "$derived(data) destructuring — reactive updates when navigating in-place"
key_files:
  created:
    - src/routes/rabbit-hole/tag/[slug]/+page.ts
    - src/routes/rabbit-hole/tag/[slug]/+page.svelte
  modified:
    - BUILD-LOG.md
decisions:
  - "invalidateAll: true in reshuffle goto() — forces SvelteKit to re-run load even on same URL; without it SvelteKit caches and reshuffle is a no-op"
  - "getGenreBySlug wrapped in .catch(() => null) — most tags have no KB entry; failure is expected, not exceptional"
  - "decodeURIComponent at load time, encodeURIComponent at navigation time — tags with spaces/special chars round-trip correctly"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
  completed_date: "2026-03-04"
---

# Phase 35 Plan 05: Genre/Tag Exploration Page Summary

Genre/tag exploration page for the Rabbit Hole — random 20 artists per tag with co-occurrence related tags and a reshuffle button, using `invalidateAll: true` to force fresh random selection on same-URL re-navigation.

## What Was Built

**Task 1: Load function (`src/routes/rabbit-hole/tag/[slug]/+page.ts`)**

Three parallel DB queries on page load:
1. `getArtistsByTagRandom(db, tag, 20)` — offset-based random selection (no O(n log n) sort)
2. `getRelatedTags(db, tag, 12)` — co-occurring tags ordered by shared artist count
3. `getGenreBySlug(db, params.slug).catch(() => null)` — optional KB enrichment

Tag slug is URL-decoded (`decodeURIComponent(params.slug)`) before DB queries. The raw tag string (e.g., "hip hop") is passed through to the page as `data.tag`.

Full error boundary: outer try/catch returns empty arrays and null genre if any query fails.

**Task 2: Genre/tag page (`src/routes/rabbit-hole/tag/[slug]/+page.svelte`)**

- Large tag heading with optional KB metadata (inception year, origin city as muted inline text)
- 20 artist name chips in flowing wrap layout; each shows a country code badge when available
- Reshuffle button (top-right of Artists section): re-navigates to same URL with `invalidateAll: true` for fresh random selection
- Related Genres & Tags section: co-occurrence chips; chip title shows "X shared artists"
- Empty state message when no artists found

Navigation on all chips:
- Artist chips: `pushTrailItem({ type: 'artist', ... })` + `goto('/rabbit-hole/artist/[slug]', { noScroll: true })`
- Tag chips: `pushTrailItem({ type: 'tag', ... })` + `goto('/rabbit-hole/tag/[slug]', { noScroll: true })`

## Decisions Made

**`invalidateAll: true` for reshuffle**
Without this flag, SvelteKit caches the load function result and re-navigation to the same URL returns the same artists. `invalidateAll: true` forces a full re-run of the load function, producing a fresh random 20. This is the correct SvelteKit pattern for "same URL, different data."

**`.catch(() => null)` on `getGenreBySlug`**
Most MusicBrainz tags (e.g., "post-punk", "math rock") are not in the KB genre table. The genre query is expected to return null for the majority of tags. Wrapping in `.catch(() => null)` instead of a conditional lookup avoids the pattern of "check existence then fetch" and handles both "not found" and actual errors gracefully.

**URL encoding round-trip**
Tags with spaces or special chars are encoded at navigation (`encodeURIComponent(tag)`) and decoded at load time (`decodeURIComponent(params.slug)`). The raw tag string is what the DB queries need — the slug is purely a URL transport mechanism.

## Verification

`npm run check`: 627 files, 0 errors, 20 warnings (all pre-existing in unrelated files).
196 code tests pass.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- `src/routes/rabbit-hole/tag/[slug]/+page.ts` — exists
- `src/routes/rabbit-hole/tag/[slug]/+page.svelte` — exists

Commits:
- `63f0ccb3` — feat(35-05): genre/tag page load function
- `74aae3ba` — feat(35-05): genre/tag exploration page (chips layout)
