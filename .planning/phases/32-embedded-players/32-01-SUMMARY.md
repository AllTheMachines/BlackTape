---
phase: 32-embedded-players
plan: 01
subsystem: ui
tags: [svelte, typescript, iframe, youtube, bandcamp, soundcloud, spotify, streaming, webview2]

# Dependency graph
requires:
  - phase: 29-streaming-foundation
    provides: streamingState module (activeSource, serviceOrder, setActiveSource, clearActiveSource)
  - phase: 30-spotify-integration
    provides: spotifyState, artist page streaming wiring patterns
provides:
  - youtubeEmbedUrl() with enablejsapi=1 for postMessage event reception
  - bandcampEmbedUrl() using url= parameter — spike confirmed PASSES in WebView2
  - EmbedPlayer with autoLoad prop (auto-renders without click)
  - EmbedPlayer with activeService prop (parent controls active platform)
  - EmbedPlayer uses streamingState.serviceOrder for platform ordering
  - scWidget state ref in EmbedPlayer for SoundCloud pause coordination
  - youtubeError state + detectYouTubeError() for Error 153 fallback
  - Bandcamp iframe branch with 5-second load timeout + ExternalLink fallback
  - onDestroy guard that avoids clobbering the source set by incoming embed
  - tools/bandcamp-spike.mjs — CDP spike script for future reference
affects:
  - 32-02 (artist page source switcher — uses autoLoad, activeService props)
  - 32-03 (release page Play Album — uses bandcampEmbedUrl, activePlatform)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bandcamp embed via url= parameter: https://bandcamp.com/EmbeddedPlayer/url={encoded}/size=large/transparent=true/"
    - "YouTube error detection: JSON.parse postMessage data, event=onError, info in [100,101,150,153]"
    - "SoundCloud pause coordination: store widget ref in $state, $effect watching streamingState.activeSource"
    - "CDP spike testing: launch debug binary with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222"

key-files:
  created:
    - tools/bandcamp-spike.mjs
  modified:
    - src/lib/embeds/youtube.ts
    - src/lib/embeds/bandcamp.ts
    - src/lib/components/EmbedPlayer.svelte

key-decisions:
  - "Bandcamp spike PASSES: url= parameter renders compact player in WebView2 145.0.3800.70 — BC-01 and BC-02 use iframe embed"
  - "EmbedPlayer ordering switches from streamingPref/PLATFORM_PRIORITY to streamingState.serviceOrder (single source of truth)"
  - "scWidget stored in component-level $state so SC can be paused reactively without closure gymnastics"
  - "onDestroy guard: only clear activeSource if this component's platform was the active one (avoids clobbering on {#key} remount)"
  - "5-second Bandcamp load timeout: if onload does not fire within 5s, fall back to ExternalLink (handles blank iframe case)"

patterns-established:
  - "Auto-load pattern: autoLoad prop + activePlatform $derived eliminates click-to-reveal for primary service"
  - "Source coordination: parent passes activeService prop; EmbedPlayer uses it as first preference in activePlatform derivation"

requirements-completed: [YT-02, BC-01, SC-02]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 32 Plan 01: Embedded Players Foundation Summary

**YouTube, Bandcamp, and SoundCloud embed primitives: enablejsapi=1, url= param spike (PASSES), autoLoad prop, scWidget pause ref, Error 153 detection — foundation for Plans 32-02 and 32-03**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T09:30:23Z
- **Completed:** 2026-02-27T09:38:13Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 tool created)

## Accomplishments

- `youtube.ts`: Added `?enablejsapi=1` to embed URL so YouTube sends postMessage events (required for Error 153 detection)
- `bandcamp.ts`: Added `bandcampEmbedUrl(url)` using url= parameter; Bandcamp spike confirmed PASSES in Tauri WebView2
- `EmbedPlayer.svelte`: Full refactor — autoLoad + activeService props, streamingState.serviceOrder ordering, scWidget ref, youtubeError state, Bandcamp iframe with 5s timeout, guarded onDestroy

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend embed utilities and refactor EmbedPlayer** - `44d011e` (feat)
2. **Task 2: Bandcamp spike — PASSES in WebView2** - `fd23405` (feat)

## Files Created/Modified

- `src/lib/embeds/youtube.ts` — Added `?enablejsapi=1` to nocookie embed URL
- `src/lib/embeds/bandcamp.ts` — Added `bandcampEmbedUrl()` with SPIKE RESULT docstring; updated module docstring
- `src/lib/components/EmbedPlayer.svelte` — Full refactor: autoLoad, activeService, streamingState.serviceOrder, scWidget, youtubeError, Bandcamp iframe, onDestroy guard (445 lines)
- `tools/bandcamp-spike.mjs` — CDP spike script used to test Bandcamp url= in WebView2

## Decisions Made

- **Bandcamp spike PASSES.** Ran `tools/bandcamp-spike.mjs` via CDP against `mercury.exe` debug binary. Injected Burial "Untrue" iframe via `url=` param; `onload` fired within 12 seconds in WebView2 145.0.3800.70. BC iframe branch in EmbedPlayer remains active.
- **streamingState.serviceOrder replaces streamingPref/PLATFORM_PRIORITY.** Single source of truth for platform ordering. `streamingPref` was a legacy preference module — `streamingState.serviceOrder` is the canonical user-configured ordering from Phase 29.
- **scWidget stored in component-level `$state`.** The widget reference needs to be accessible outside the `hookSoundCloudWidget` closure so the SC-02 pause `$effect` can call `widget.pause()` when `activeSource` changes away from soundcloud.
- **onDestroy only clears activeSource if this component owned it.** Prevents the outgoing EmbedPlayer from clobbering the source set by the incoming EmbedPlayer during a `{#key}` remount on service switch.

## Deviations from Plan

None — plan executed exactly as written. The Bandcamp spike was conducted programmatically via CDP rather than manually via Tauri devtools, but the outcome (PASSES result recorded in bandcamp.ts) matches the plan's intent exactly.

## Issues Encountered

- Initial CDP attempts failed because `mercury.exe` was already running in background (from earlier auto-start attempt). Killed existing process and re-ran spike script successfully.
- First `page.evaluate` call failed with "Execution context was destroyed" — fixed by waiting for `page.waitForLoadState('load')` plus 3-second settlement delay before injecting the test iframe.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 32-02 (artist page source switcher) can use `autoLoad={true}` and `activeService` prop immediately — primitives are in place
- Plan 32-03 (release page Play Album) can use `bandcampEmbedUrl()` immediately — spike confirms it works
- Remaining gate: YouTube Error 153 fallback must be tested in a production `.msi` build (dev mode always passes; production can fail for individual videos with embedding disabled). This is a completion gate for Phase 32, not for this plan.
- SoundCloud Widget API re-binding after Svelte navigation remount: verify during Plan 32-02 implementation

---
*Phase: 32-embedded-players*
*Completed: 2026-02-27*
