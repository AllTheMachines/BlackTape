---
phase: 30-spotify-integration
plan: 03
subsystem: ui
tags: [spotify, svelte5, artist-page, connect-api, error-handling, tauri]

# Dependency graph
requires:
  - phase: 30-spotify-integration/30-01
    provides: spotifyState, getValidAccessToken, extractSpotifyArtistId, getArtistTopTracks, playTracksOnSpotify, PlayResult
  - phase: 29-streaming-foundation
    provides: setActiveSource, StreamingSource type

provides:
  - src/routes/artist/[slug]/+page.svelte — Play on Spotify button with full error handling

affects:
  - Phase 31 (embedded players) — setActiveSource pattern established for Spotify; same call needed for Bandcamp/SC/YT triggers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dynamic imports inside async handlers for Spotify modules (avoids circular deps, matches existing qr/collections pattern)
    - Derived visibility guard: tauriMode && spotifyState.connected && data.links.spotify.length > 0 — hidden, not disabled
    - PlayResult discriminated union consumed in UI: all 4 cases (ok/no_device/premium_required/token_expired) surfaced as plain-language inline messages

key-files:
  created: []
  modified:
    - src/routes/artist/[slug]/+page.svelte

key-decisions:
  - "Button hidden (not disabled) via {#if showSpotifyButton} — absent from DOM when not connected, matches CONTEXT.md spec"
  - "spotifyPlayMessage resets to null at start of each handlePlayOnSpotify call — no stale error state across attempts"
  - "Dynamic imports for all Spotify modules inside the handler — consistent with existing lazy-import pattern (QR, collections)"
  - "Button placed after streaming-badges block, before tags — visible in header without cluttering the artist name row"

patterns-established:
  - "PlayResult → inline message pattern: each of ok/no_device/premium_required/token_expired maps to an exact plain-language string from CONTEXT.md spec"

requirements-completed: [SPOT-02, SPOT-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 30 Plan 03: Artist Page Play on Spotify Button Summary

**Spotify-green play button on artist pages that triggers Connect API top-track playback with four error paths surfaced as inline plain-language messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T07:54:16Z
- **Completed:** 2026-02-27T07:56:29Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added `showSpotifyButton` derived guard (`tauriMode && spotifyState.connected && data.links.spotify.length > 0`) — button is completely absent from DOM when not applicable
- Implemented `handlePlayOnSpotify` with full error handling: all 4 PlayResult cases covered with exact strings from CONTEXT.md
- `setActiveSource('spotify')` called on success — player bar badge updates correctly
- `spotifyPlayMessage` resets at start of each call — no stale errors between attempts
- 183 code tests passing; `npm run check` 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Play on Spotify button + error handling to artist page** - `e54af6e` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `src/routes/artist/[slug]/+page.svelte` — Added spotifyState import, SpotifyPlayState type, showSpotifyButton derived, handlePlayOnSpotify handler, {#if showSpotifyButton} template block, Spotify green CSS

## Decisions Made

- **Button hidden not disabled:** `{#if showSpotifyButton}` removes the element from DOM entirely when not connected, per CONTEXT.md spec ("Button is hidden (not disabled, not grayed out)").
- **Dynamic imports for Spotify modules:** `getValidAccessToken`, `extractSpotifyArtistId`, `getArtistTopTracks`, `playTracksOnSpotify`, and `setActiveSource` all imported dynamically inside `handlePlayOnSpotify`. Avoids circular dependencies and is consistent with existing lazy-import patterns (QR code, collections, visit tracking).
- **Placement after streaming badges:** The button sits below the streaming availability badges and above the tags. This keeps it near the artist identity (in the header) without cluttering the tight name row. It's visually associated with the streaming context.
- **Reset-on-click, no auto-dismiss:** `spotifyPlayMessage = null` at start of handler. Error persists until user clicks Play again or navigates away, matching CONTEXT.md spec.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — user connects via the Settings wizard (30-02). The button appears automatically once connected.

## Next Phase Readiness

The "Play on Spotify" surface is complete for Phase 30. The pattern of `showSpotifyButton` derived guard + `handlePlayOnSpotify` handler + `setActiveSource('spotify')` on success establishes the template for future service buttons in Phase 31.

Phase 30 is now feature-complete: core module (30-01), settings wizard (30-02), and artist page button (30-03) are all done.

Phase 31 (Embedded Players) can proceed. Key gates from STATE.md still apply:
- Bandcamp spike: test `url=` iframe param before implementing
- YouTube Error 153 in production `.msi` build is a hard Phase 31 gate
- SoundCloud Widget API re-binding after Svelte navigation remount: verify in Phase 31

---
*Phase: 30-spotify-integration*
*Completed: 2026-02-27*
