---
phase: 32-embedded-players
plan: 02
subsystem: ui
tags: [svelte, typescript, iframe, soundcloud, youtube, bandcamp, spotify, streaming, oembed]

# Dependency graph
requires:
  - phase: 32-01
    provides: EmbedPlayer with autoLoad/activeService props, bandcampEmbedUrl, streamingState.serviceOrder ordering
  - phase: 29-streaming-foundation
    provides: streamingState module (serviceOrder, setActiveSource)
provides:
  - Source switcher UI on artist page (interactive buttons replacing static text badges)
  - EmbedPlayer auto-loaded on artist page with {#key} unmount semantics
  - SoundCloud oEmbed HTML fetched from /api/soundcloud-oembed proxy on mount
  - activateService() function for coordinated source switching
  - availableEmbedServices derived (respects streamingState.serviceOrder)
affects:
  - 32-03 (release page — artist page pattern established for source switching)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source switcher: availableEmbedServices $derived from streamingState.serviceOrder, buttons trigger activateService()"
    - "activateService ordering: setActiveSource BEFORE updating activeEmbedService state to prevent onDestroy clobber"
    - "{#key activeEmbedService}: destroys old EmbedPlayer iframe before mounting new one — stops audio"
    - "SC oEmbed fetch: fire-and-forget async IIFE in onMount Tauri block, best-effort with silent catch"

key-files:
  created: []
  modified:
    - src/routes/artist/[slug]/+page.svelte

key-decisions:
  - "activateService() calls setActiveSource before updating activeEmbedService — prevents outgoing EmbedPlayer onDestroy from clobbering the source just set by the activating service"
  - "availableEmbedServices derives from streamingState.serviceOrder — single source of truth for user's platform preference, no secondary sorting logic needed"
  - "SC oEmbed fetch in onMount Tauri block only — not in non-Tauri path where /api/soundcloud-oembed would be unavailable"
  - "CSS uses confirmed tokens var(--bg-2), var(--bg-3), var(--b-1), var(--r), var(--text-primary), var(--text-secondary) — all exist in theme.css"

patterns-established:
  - "Source switcher pattern: availableEmbedServices $derived + activateService() + {#key activeEmbedService}<EmbedPlayer> — use for release page in 32-03"

requirements-completed: [SC-01, YT-01, BC-01, PLAYER-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 32 Plan 02: Artist Page Source Switcher Summary

**Interactive source switcher replacing static streaming badges: EmbedPlayer auto-loads highest-priority service, {#key} ensures clean iframe lifecycle on switch, SC oEmbed fetched from proxy on mount**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T09:41:32Z
- **Completed:** 2026-02-27T09:48:02Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced static `.streaming-badges` spans with interactive `.source-switcher` buttons — one per available streaming service
- EmbedPlayer now renders automatically (autoLoad=true) in a `{#key activeEmbedService}` block, ensuring clean iframe unmount/remount on service switch
- SoundCloud oEmbed HTML fetched from `/api/soundcloud-oembed` proxy in onMount (Tauri only), best-effort
- `availableEmbedServices` derived from `streamingState.serviceOrder` — user's drag-to-reorder preference from Settings drives which services appear and in what order
- `activateService()` coordinates `setActiveSource` call before the `{#key}` re-render to prevent the outgoing EmbedPlayer's `onDestroy` from clobbering the incoming service's source

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire EmbedPlayer into artist page — source switcher, auto-load, SC oEmbed fetch** - `f3ac71d` (feat)

## Files Created/Modified

- `src/routes/artist/[slug]/+page.svelte` — Added EmbedPlayer import, source switcher state/derived/functions, SC oEmbed fetch in onMount, replaced streaming-badges template block with source-switcher + EmbedPlayer, added source-switcher CSS

## Decisions Made

- **activateService() ordering:** `setActiveSource(svc)` is called before `activeEmbedService = svc`. This is critical — the `{#key}` block triggers on `activeEmbedService` change, which destroys the old EmbedPlayer. The old EmbedPlayer's `onDestroy` checks `streamingState.activeSource` to decide whether to clear it. If we set `activeEmbedService` first, the old EmbedPlayer fires `onDestroy` before the new one has set its source — clearing what was just set. By setting `activeSource` first, the new service's ownership is established before the outgoing guard runs.
- **availableEmbedServices derives from streamingState.serviceOrder:** Rather than a separate derived or filter array, the source switcher naturally inherits the user's streaming preference order from Phase 29. No duplicate ordering logic.
- **SC oEmbed fetch gated in Tauri block:** The `/api/soundcloud-oembed` endpoint only exists in the Tauri app server context. Non-Tauri paths (if any) would fail silently anyway due to the try/catch, but the explicit Tauri gate is cleaner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed escaped HTML comment syntax from Python replacement**
- **Found during:** Task 1 (template replacement)
- **Issue:** Python string replacement wrote literal `<\!--` (backslash-exclamation) instead of `<!--`. The Svelte parser rejected `<!-- {#key} ... -->` as an invalid tag name because the comment wasn't properly formed.
- **Fix:** Post-replacement pass replaced all `<\!--` with `<!--` in the file.
- **Files modified:** src/routes/artist/[slug]/+page.svelte
- **Verification:** npm run check returned 0 errors after fix.
- **Committed in:** f3ac71d (included in task commit)

---

**Total deviations:** 1 auto-fixed (1 bug — tooling artifact from string replacement)
**Impact on plan:** The fix was a tooling artifact, not a design deviation. Logic matches plan exactly.

## Issues Encountered

- HTML comment syntax escape: Python string replacement introduced `<\!--` literal characters instead of `<!--`. The Svelte compiler rejected `<!-- {#key} ... -->` as it tried to parse `{#key}` inside the comment as a Svelte block. Fixed with a second-pass replace before running check.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 32-03 (release page Play Album) can follow the same source-switcher pattern established here
- The `activateService()` / `{#key}` / `EmbedPlayer` pattern is now proven and documented
- Remaining gate: YouTube Error 153 fallback in production `.msi` build (dev mode always passes)
- SoundCloud Widget API re-binding after Svelte navigation remount: appears functional based on EmbedPlayer's `$effect` watching `soundcloudEmbedHtml` — full verification requires running desktop app with a SoundCloud artist

---
*Phase: 32-embedded-players*
*Completed: 2026-02-27*
