---
phase: 35-rabbit-hole
plan: "04"
subsystem: ui
tags: [svelte5, rabbit-hole, artist-card, discovery, streaming, tauri]

# Dependency graph
requires:
  - phase: 35-01
    provides: trail store (pushTrailItem), getRandomArtistByTag query function
  - phase: 35-02
    provides: Rabbit Hole sub-layout and route wiring
  - phase: 34-03
    provides: get_or_cache_releases Tauri command for async track loading
  - phase: 34-04
    provides: getSimilarArtists query function
provides:
  - src/routes/rabbit-hole/artist/[slug]/+page.ts — loads artist, similar artists, streaming links
  - src/routes/rabbit-hole/artist/[slug]/+page.svelte — full interactive artist exploration card
affects:
  - 35-05 (tag exploration page — same navigation + trail patterns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "$derived(data) for reactive in-place navigation — page re-evaluates when SvelteKit replaces data on same-slug navigation"
    - "Lazy import pattern for Tauri APIs in onMount — @tauri-apps/api/core and @tauri-apps/plugin-shell imported only when needed"
    - "Non-blocking async card render — core content visible immediately, releases load async after mount"

key-files:
  created:
    - src/routes/rabbit-hole/artist/[slug]/+page.ts
    - src/routes/rabbit-hole/artist/[slug]/+page.svelte
  modified: []

key-decisions:
  - "$derived(data) not destructuring in $state — enables reactive updates when navigating in-place between artist slugs (the core Rabbit Hole pattern)"
  - "shell.open via @tauri-apps/plugin-shell for streaming links — external links open in system browser/native app, not WebView2"
  - "encodeURIComponent(tag) for tag chip navigation — handles spaces and special chars in tag slugs consistently with 35-01/35-03 pattern"
  - "TOP_RELEASES = 3 default with expand toggle — keeps card scannable without hiding discography depth"
  - "tracks capped at 5 per release with '+N more' hint — prevents release cards from bloating; full tracklist via release page"

patterns-established:
  - "In-place Rabbit Hole navigation: goto(url, {keepFocus:true, noScroll:true}) + pushTrailItem — both always called together"
  - "Continue fallback chain: similarArtists.length > 0 → random pick; else → getRandomArtistByTag on primary tag"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 35 Plan 04: Artist Exploration Card Summary

**Svelte 5 artist card with in-place navigation, async release loading, similar-artist chips, tag routing, and Continue/Play actions — the heart of the Rabbit Hole**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T14:16:18Z
- **Completed:** 2026-03-04T14:20:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Built `+page.ts` load function that fetches artist by slug, similar artists (up to 10), and streaming links from `artist_links` table in a single parallel load
- Built `+page.svelte` — the main Rabbit Hole experience view: artist header, country/year, tag chips, similar artist row, collapsible release/track list, Play and Continue action buttons
- Releases load async in `onMount` via `get_or_cache_releases` Tauri command — card renders immediately without blocking on track data
- Continue button implements two-tier fallback: random pick from `similarArtists` array first; falls back to `getRandomArtistByTag(primaryTag, artist.id)` when no similar artists exist
- Play button uses `streamingPref.platform` preference to find matching link; falls back to first available link; disables when no links exist

## Task Commits

Each task was committed atomically:

1. **Task 1: Artist card page load function (+page.ts)** - `07389565` (auto-save, feat)
2. **Task 2: Artist exploration card (+page.svelte)** - `bb07c46a` (feat)

## Files Created/Modified

- `src/routes/rabbit-hole/artist/[slug]/+page.ts` — SPA load function: fetches artist, similarArtists, and artist_links in parallel
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` — Full artist card: header, tags, similar row, releases, play/continue actions

## Decisions Made

- Used `$derived(data)` (not destructuring into `$state`) so the card reactively updates when SvelteKit navigates in-place to a new artist slug — this is the core mechanic of the Rabbit Hole's seamless in-place exploration
- Tag chip navigation uses `encodeURIComponent(tag)` — consistent with the slug format established in plans 35-01 and 35-03, handles spaces and special chars correctly
- `shell.open` from `@tauri-apps/plugin-shell` for streaming URLs — opens Spotify/Bandcamp/etc. in the system's native handler rather than WebView2, which can't handle Widevine DRM
- Did NOT reuse existing `TagChip.svelte` component — it hardcodes `/search` links (research pitfall documented in 35-RESEARCH.md)
- Releases capped at 3 visible by default with expand toggle; tracks capped at 5 per release — keeps card scannable without sacrificing discography depth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The auto-save git hook committed `+page.ts` before the planned feat commit could be made (the pre-commit hook ran all 196 tests successfully, but the post-hook git status showed the file already committed). The auto-save commit (`07389565`) is treated as the Task 1 commit. `+page.svelte` received its own clean feat commit (`bb07c46a`). No data loss; all files are in the correct committed state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Artist card is complete and navigable. Tag chips route to `/rabbit-hole/tag/[slug]` — plan 35-05 builds that route
- Similar artist chips and Continue button both call `navigateToArtist` which pushes to trail — trail bar in sub-layout (35-02) picks this up immediately
- Play button ready to open streaming links as soon as `artist_links` table is populated by data pipeline

---
*Phase: 35-rabbit-hole*
*Completed: 2026-03-04*
