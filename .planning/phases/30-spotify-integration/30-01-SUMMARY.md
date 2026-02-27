---
phase: 30-spotify-integration
plan: 01
subsystem: auth
tags: [spotify, oauth, pkce, tauri, svelte5, state-management, connect-api]

# Dependency graph
requires:
  - phase: 29-streaming-foundation
    provides: streamingState + serviceOrder infrastructure; ai_settings storage pattern

provides:
  - src/lib/spotify/state.svelte.ts — reactive spotifyState, setSpotifyConnected, clearSpotifyState
  - src/lib/spotify/auth.ts — PKCE OAuth, token persistence, proactive refresh via ai_settings
  - src/lib/spotify/api.ts — Connect API: getArtistTopTracks, playTracksOnSpotify, PlayResult
  - Fixed localhost bug in src/lib/taste/import/spotify.ts (127.0.0.1)

affects:
  - 30-02 (Settings wizard imports startSpotifyAuth, saveSpotifyTokens, spotifyState)
  - 30-03 (Artist page "Play on Spotify" imports getArtistTopTracks, playTracksOnSpotify, getValidAccessToken)
  - Any future Spotify-connected feature

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level $state for Spotify reactive state (matches streaming.svelte.ts and playerState patterns)
    - Dynamic import for all Tauri plugins (@fabianlars/tauri-plugin-oauth, @tauri-apps/plugin-shell, @tauri-apps/api/core)
    - Discriminated PlayResult union instead of exceptions for Connect API failures
    - All 5 Spotify tokens stored in ai_settings table as key-value strings (no new DB tables)
    - Proactive refresh: token refreshed when within 60s of expiry, not after failure

key-files:
  created:
    - src/lib/spotify/state.svelte.ts
    - src/lib/spotify/auth.ts
    - src/lib/spotify/api.ts
  modified:
    - src/lib/taste/import/spotify.ts

key-decisions:
  - "redirectUri uses http://127.0.0.1 (not localhost) — Spotify blocked localhost redirects November 2025"
  - "PlayResult is discriminated union (ok/no_device/premium_required/token_expired) — playTracksOnSpotify never throws"
  - "getValidAccessToken refreshes proactively at 60s before expiry to avoid mid-playback failures"
  - "All Spotify tokens stored in existing ai_settings table — no new DB schema required"
  - "Dynamic imports for all Tauri plugins to avoid web build breakage (same pattern as preferences.svelte.ts)"

patterns-established:
  - "Spotify module pattern: state.svelte.ts (reactive) + auth.ts (persistence) + api.ts (network) — separation of concerns"
  - "PlayResult discriminated union: callers always get a value, never an exception, always know what to show the user"

requirements-completed: [SPOT-01, SPOT-02, SPOT-03, SPOT-04]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 30 Plan 01: Spotify Core Module Summary

**PKCE OAuth flow + token persistence in ai_settings + Spotify Connect API with discriminated PlayResult — full src/lib/spotify/ module in 3 files**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T07:42:34Z
- **Completed:** 2026-02-27T07:46:03Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `src/lib/spotify/` module: reactive state, PKCE auth, Connect API — the single source of truth for all Phase 30 components
- Fixed pre-existing localhost redirect bug in `src/lib/taste/import/spotify.ts` (line 45)
- Zero TypeScript errors; all 183 code tests passing after each commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/spotify/state.svelte.ts** - `24d9654` (feat)
2. **Task 2: Create src/lib/spotify/auth.ts + fix localhost bug** - `bff2d8e` (feat)
3. **Task 3: Create src/lib/spotify/api.ts** - `c35798b` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `src/lib/spotify/state.svelte.ts` - Reactive spotifyState ($state at module level), SpotifyStoredState interface, setSpotifyConnected, clearSpotifyState
- `src/lib/spotify/auth.ts` - PKCE OAuth flow (startSpotifyAuth), token persistence (saveSpotifyTokens, loadSpotifyState, clearSpotifyTokens), proactive refresh (getValidAccessToken)
- `src/lib/spotify/api.ts` - SpotifyAuthError, SpotifyNotFoundError, PlayResult type, extractSpotifyArtistId, getArtistTopTracks, playTracksOnSpotify
- `src/lib/taste/import/spotify.ts` - Line 45 bug fix: `localhost` → `127.0.0.1`

## Decisions Made

- **127.0.0.1 not localhost:** Spotify blocked localhost OAuth redirects in November 2025. All redirectUri values in the new module AND the existing taste-import module now use `http://127.0.0.1`.
- **PlayResult discriminated union:** `playTracksOnSpotify` returns `ok | no_device | premium_required | token_expired` and never throws. Callers always receive an actionable value with a clear user message to surface.
- **Proactive refresh at -60s:** `getValidAccessToken` refreshes before expiry, not after a 401. Prevents mid-playback token failures.
- **ai_settings for token storage:** All 5 Spotify token fields stored in the existing `ai_settings` table via `set_ai_setting` / `get_all_ai_settings`. No new DB tables, no new Rust commands.
- **Dynamic imports for all Tauri plugins:** `@fabianlars/tauri-plugin-oauth`, `@tauri-apps/plugin-shell`, and `@tauri-apps/api/core` all use the dynamic import pattern from `preferences.svelte.ts`. Prevents web build breakage.
- **refreshToken fallback:** If Spotify doesn't return a new refresh_token in the refresh response, the existing one is kept (`data.refresh_token ?? refreshToken`). Handles non-rotating refresh responses safely.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required at this stage. User Client ID configuration is handled by Plan 30-02 (Settings wizard).

## Next Phase Readiness

The `src/lib/spotify/` module is complete. Plan 30-02 (Settings wizard) and Plan 30-03 (artist page "Play on Spotify" button) can both import from this module independently. Key surfaces:

- `spotifyState.connected` — reactive, readable from any component
- `startSpotifyAuth(clientId)` → `SpotifyStoredState` — OAuth entry point
- `getValidAccessToken()` → `string` — always-valid token for API calls
- `playTracksOnSpotify(uris, token)` → `PlayResult` — discriminated, never throws

No blockers.

---
*Phase: 30-spotify-integration*
*Completed: 2026-02-27*
