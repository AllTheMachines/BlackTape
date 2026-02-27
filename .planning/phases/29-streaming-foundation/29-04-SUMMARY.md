---
phase: 29-streaming-foundation
plan: "04"
subsystem: ui
tags: [svelte, postmessage, soundcloud-widget, audio-coordination, player-bar]

# Dependency graph
requires:
  - phase: 29-01
    provides: streamingState module with setActiveSource/clearActiveSource and StreamingSource type

provides:
  - EmbedPlayer.svelte detects Spotify/YouTube postMessage play events and SoundCloud Widget API PLAY events
  - Local audio pauses (position preserved) when any embed plays
  - streamingState.activeSource set to 'spotify', 'youtube', or 'soundcloud' on embed play
  - Player bar renders "via [Service]" badge in track-meta area when activeSource is non-null
  - activeSource cleared and message listener removed on EmbedPlayer onDestroy

affects:
  - 30-spotify-integration
  - 31-embedded-players

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic imports inside async SC setup function to avoid circular import issues"
    - "origin-based postMessage filtering via EMBED_ORIGINS map + hostname.includes() fallback for nocookie variants"
    - "onDestroy cleanup pair: removeEventListener + clearActiveSource prevents stale state after navigation"

key-files:
  created: []
  modified:
    - src/lib/components/EmbedPlayer.svelte
    - src/lib/components/Player.svelte

key-decisions:
  - "Used dynamic imports for audio.svelte in SC Widget PLAY handler to avoid circular import in the async hookSoundCloudWidget function"
  - "EMBED_ORIGINS map uses exact hostname match first, then hostname.includes('youtube.com') substring fallback to catch nocookie variants not in map"
  - "Spotify play detection uses data.type field check (object); YouTube uses JSON.parse + event/info === 1 (string); SC uses existing Widget PLAY event — three different mechanisms for three different APIs"

patterns-established:
  - "Coordination pattern: embed plays -> pause() + setActiveSource(source) -> Player bar badge updates reactively"
  - "Cleanup pattern: onDestroy removes window listener AND clears global state — both required to prevent leaks"

requirements-completed: [INFRA-02, PLAYER-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 29 Plan 04: Audio Coordination + Player Bar Badge Summary

**EmbedPlayer wires postMessage/Widget API play detection to pause local audio and set activeSource; Player bar shows reactive "via [Service]" badge from that state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T00:35:02Z
- **Completed:** 2026-02-27T00:37:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- EmbedPlayer now detects Spotify and YouTube iframe play events via postMessage (origin-validated, play-state-detected per service schema) and SoundCloud via the existing Widget API PLAY handler
- Local audio pauses (position preserved — not stopped) when any embed plays; streamingState.activeSource is set to the active service
- Player bar renders "via Spotify" / "via SoundCloud" / "via YouTube" in track-meta alongside artist and album; clears automatically when embed is destroyed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add embed play detection and audio coordination to EmbedPlayer** - `b3d9bc2` (feat)
2. **Task 2: Add via-badge to Player bar track-info** - `353d0aa` (feat)

## Files Created/Modified
- `src/lib/components/EmbedPlayer.svelte` - Added EMBED_ORIGINS map, detectPlayEvent(), handleEmbedMessage(), window message listener + onDestroy cleanup, SC PLAY handler coordination calls
- `src/lib/components/Player.svelte` - Added streamingState import, sourceLabel() helper, via-badge span in track-meta, .via-badge CSS

## Decisions Made
- Used dynamic imports for audio.svelte inside the SC Widget PLAY handler because hookSoundCloudWidget() is an async function loaded dynamically — static imports at module top were triggering circular import warnings in the Svelte compiler
- `hostname.includes('youtube.com')` substring check used as fallback beyond the exact EMBED_ORIGINS map keys, to handle any future nocookie URL variants not yet mapped
- Spotify detection checks `data.type === 'playback_update' || data.type === 'player_state_changed'` (object type field) — sourced from community reports as of Feb 2026; these are undocumented by Spotify, verified with code comment noting dev verification needed
- YouTube detection parses JSON string, checks `event === 'onStateChange' && info === 1` — sourced from YouTube IFrame API reference (info 1 = playing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both tasks compiled cleanly on first attempt with 0 TypeScript errors and 183 tests passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29 (Streaming Foundation) is complete — all 4 plans executed
- Phase 30 (Spotify Integration) can proceed: streamingState.activeSource coordination is in place, player bar badge renders reactively
- Blockers documented in STATE.md remain: verify existing Spotify OAuth registration uses http://127.0.0.1 not localhost before writing Phase 30 OAuth code
- Known limitation accepted: Player bar only renders when playerState.currentTrack is non-null; via-badge is invisible if no local track has been loaded (documented as Pitfall 5 in RESEARCH.md — intentional, no complexity added)

## Self-Check: PASSED

- FOUND: `.planning/phases/29-streaming-foundation/29-04-SUMMARY.md`
- FOUND: `src/lib/components/EmbedPlayer.svelte`
- FOUND: `src/lib/components/Player.svelte`
- FOUND: `b3d9bc2` (Task 1 commit)
- FOUND: `353d0aa` (Task 2 commit)
- FOUND: `cbe56cc` (Final docs commit)

---
*Phase: 29-streaming-foundation*
*Completed: 2026-02-27*
