---
phase: 07-knowledge-base
plan: 06
subsystem: ui-integration
tags: [liner-notes, kb-links, navigation, musicbrainz, svelte5]
dependency_graph:
  requires: [07-03, 07-04, 07-05]
  provides: [liner-notes-component, kb-genre-links, explore-scene-panel, nav-links]
  affects: [release-page, artist-page, layout]
tech_stack:
  added: []
  patterns:
    - Lazy fetch on expand (collapse = zero network cost)
    - Browse endpoint with release-group MBID (consistent with page.server.ts)
    - Inline TypeScript interfaces for MusicBrainz response shapes
    - Tag slug conversion via toLowerCase + replace(/\s+/g, '-')
key_files:
  created:
    - src/lib/components/LinerNotes.svelte
  modified:
    - src/routes/artist/[slug]/release/[mbid]/+page.svelte
    - src/routes/artist/[slug]/+page.svelte
    - src/routes/+layout.svelte
decisions:
  - Browse endpoint for LinerNotes (release-group MBID, limit=1) — consistent with page.server.ts, no extra data complexity
  - resp.json() cast to typed interface — strict TypeScript requires explicit assertion from unknown
  - KB and Time Machine nav links on both web and Tauri — web-first features, no platform gating needed
  - tags[0] as primary genre for Explore this scene panel — most prominent MB tag is the best genre signal
metrics:
  duration: 7min
  completed: 2026-02-21
  tasks_completed: 2
  files_changed: 4
---

# Phase 07 Plan 06: App Integration Summary

LinerNotes component with lazy MusicBrainz credits fetch, genre tags as KB links on artist pages, "Explore this scene" panel, and Knowledge Base + Time Machine nav links added to both web and Tauri.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create LinerNotes.svelte + integrate into release page | 67fb4a7 | LinerNotes.svelte, release/+page.svelte |
| 2 | Wire KB links into artist page genre tags + Explore panel + nav links | b182a42 | artist/+page.svelte, +layout.svelte |

## What Was Built

### LinerNotes.svelte

Expandable credits panel for release pages. Collapsed by default — zero network cost on page load. On first expand, lazy-fetches MusicBrainz via the release-group browse endpoint (`/ws/2/release?release-group={mbid}&inc=artist-credits+labels+recordings&limit=1`). Displays:
- Artist credits
- Label info with catalog numbers
- Per-track recording credits (only tracks that have them)

Rate-limit-aware: shows a human-readable message on MB API failure. Typed with inline MbRelease interfaces for strict TypeScript compliance.

### Artist Page: Genre Tags + Explore Scene

Each genre tag chip now has a small `↗` superscript link to `/kb/genre/[slug]`. The existing tag chip (links to search) is preserved — dual-purpose: discover in catalog AND explore in KB.

"Explore [genre] scene →" panel added below tags — subtle CTA, muted color, links to primary tag's KB page.

### Navigation

Knowledge Base and Time Machine added to nav on both web and Tauri (after Style Map). Active state detection via `startsWith('/kb')` and `startsWith('/time-machine')`.

## Decisions Made

- **Browse endpoint pattern for LinerNotes:** The release page uses the release-group MBID (from URL params). Using the same browse endpoint as `+page.server.ts` avoids adding a second server fetch to resolve the actual release MBID.
- **TypeScript interfaces for MB API response:** `resp.json()` returns `unknown` in strict mode. Defined `MbRelease`, `MbArtistCredit`, `MbLabelInfo`, `MbTrack`, `MbMedium` inline within the component.
- **Both platforms get KB + Time Machine nav:** Unlike Library/Explore/Settings (Tauri-only), the KB and Time Machine work on web too. No platform gating.
- **tags[0] as primary genre:** First tag from MB is the most prominent — best signal for "Explore this scene" primary link.

## Deviations from Plan

None — plan executed exactly as written. The browse endpoint approach was already anticipated in the plan ("verify the actual property name"). Used `data.mbid` (release-group MBID) and the browse endpoint pattern, consistent with existing server code.

## Self-Check: PASSED

- [x] `src/lib/components/LinerNotes.svelte` exists (208 lines)
- [x] Release page contains LinerNotes import and component
- [x] Artist page contains `/kb/genre/` links
- [x] Layout contains `/kb` and `/time-machine` href links
- [x] `npm run check` passes with 0 errors
- [x] Commits 67fb4a7 and b182a42 exist
