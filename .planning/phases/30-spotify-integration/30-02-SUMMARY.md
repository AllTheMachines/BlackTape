---
phase: 30-spotify-integration
plan: 02
subsystem: ui
tags: [spotify, oauth, svelte5, tauri, settings, wizard, state-management]

# Dependency graph
requires:
  - phase: 30-spotify-integration/30-01
    provides: spotifyState, setSpotifyConnected, clearSpotifyState, startSpotifyAuth, saveSpotifyTokens, loadSpotifyState, clearSpotifyTokens

provides:
  - src/lib/components/SpotifySettings.svelte — 3-step wizard component: setup, waiting, success/connected
  - src/routes/settings/+page.svelte — Spotify section (Tauri-gated) using SpotifySettings component
  - src/routes/+layout.svelte — Boot-time hydration of spotifyState from ai_settings

affects:
  - 30-03 (artist page "Play on Spotify" button reads spotifyState.connected — now boot-hydrated correctly)
  - Any future Spotify-connected feature that reads spotifyState

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SpotifySettings wizard driven entirely by spotifyState.connected $derived; $effect syncs step to 'success' on external hydration
    - HTML/CSS dashboard mockup instead of binary screenshot — platform-stable, no external assets
    - Dynamic imports for all Tauri modules in wizard handlers (consistent with preferences.svelte.ts pattern)
    - Boot hydration appended to end of layout onMount isTauri() block via dynamic import

key-files:
  created:
    - src/lib/components/SpotifySettings.svelte
  modified:
    - src/routes/settings/+page.svelte
    - src/routes/+layout.svelte

key-decisions:
  - "SpotifySettings is entirely self-contained — no props, drives from spotifyState.connected $derived"
  - "HTML/CSS mockup for Spotify dashboard instead of binary screenshot — won't go stale, no external assets"
  - "Disconnect calls clearSpotifyTokens + clearSpotifyState with no confirmation dialog — immediate reset to setup step"
  - "$effect used to sync wizard step when spotifyState.connected changes externally (boot hydration path)"
  - "Boot hydration added after service order loading in layout — dynamic import, no static import added to layout"

patterns-established:
  - "Wizard step state machine: $state<WizardStep>, $derived(spotifyState.connected) gates view, $effect syncs step on external change"
  - "Settings card pattern: import-card CSS class, import-platform heading, import-card-desc, import-card-actions"

requirements-completed: [SPOT-01, SPOT-04]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 30 Plan 02: Spotify Settings Wizard Summary

**Guided 3-step Spotify OAuth wizard in Settings with inline HTML/CSS dev dashboard mockup, reactive step state driven by spotifyState.connected, and boot-time token hydration from ai_settings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T07:49:15Z
- **Completed:** 2026-02-27T07:51:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `SpotifySettings.svelte` — self-contained 3-step wizard (setup, waiting, success) driven by `spotifyState.connected` reactive state
- Integrated into Settings page with `{#if tauriMode}` guard and `import-card` visual pattern matching existing sections
- Wired boot hydration in `+layout.svelte` — Spotify connection persists across app restarts, state available immediately on mount
- Zero new TypeScript errors; 183 code tests passing after each commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SpotifySettings.svelte (3-step wizard)** - `3b074bb` (feat)
2. **Task 2: Wire SpotifySettings into settings page + boot-time state hydration** - `65dde66` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `src/lib/components/SpotifySettings.svelte` - 3-step Spotify connection wizard. Step 1: numbered instructions + HTML/CSS developer dashboard mockup with Client ID highlighted + input field. Step 2: spinner + cancel. Step 3: display name + Done/Disconnect. Reactive to spotifyState.connected via $derived.
- `src/routes/settings/+page.svelte` - Added SpotifySettings import and Spotify section (tauriMode-gated) after Streaming Service Priority section.
- `src/routes/+layout.svelte` - Added loadSpotifyState + setSpotifyConnected after service order loading in Tauri onMount block. Boot hydration via dynamic imports.

## Decisions Made

- **Self-contained component:** SpotifySettings takes no props and drives everything from `spotifyState.connected` `$derived`. Makes it trivial to drop into any future settings surface.
- **HTML/CSS mockup:** The Spotify developer dashboard mockup is rendered in pure HTML/CSS (browser chrome dots, labeled field rows, Client ID row highlighted with accent color). This won't go stale if Spotify redesigns their dashboard and requires no binary assets.
- **No disconnect confirmation:** Plan specified "no confirmation dialog" — disconnect immediately calls `clearSpotifyTokens()` + `clearSpotifyState()` and resets step to `'setup'`. Matches the "instant undo is the confirmation" UX philosophy for single-user desktop apps.
- **`$effect` for external sync:** When the layout's boot hydration calls `setSpotifyConnected`, `spotifyState.connected` becomes true. The `$effect` in SpotifySettings detects this and sets `step = 'success'`, ensuring the connected view renders even if the component mounts before hydration completes.
- **Dynamic import in layout:** `loadSpotifyState` and `setSpotifyConnected` are imported dynamically in the onMount block, consistent with all other Tauri preferences in the layout file. No static import added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None at this stage. The wizard itself guides users through the Spotify Developer setup (create app, set redirect URI, copy Client ID). No Claude/project configuration needed.

## Next Phase Readiness

Plan 30-02 is complete. The Settings page now has a functional Spotify connection flow:
- Users see the 3-step wizard on first visit
- After connecting, they see their Spotify display name + Disconnect button
- Connection persists across app restarts (boot hydration in layout)
- `spotifyState.connected` is reactive and readable from any component

Plan 30-03 (artist page "Play on Spotify" button) can now read `spotifyState.connected` to gate the button and `spotifyState.accessToken` (via `getValidAccessToken()`) to authorize Connect API calls.

---
*Phase: 30-spotify-integration*
*Completed: 2026-02-27*
