---
phase: 08-underground-aesthetic
plan: 03
subsystem: ui
tags: [layout, theme-engine, paneforge, streaming-preference, svelte5, integration]

# Dependency graph
requires:
  - phase: 08-01
    provides: initTheme, updateThemeFromTaste, themeState from engine.svelte.ts; streamingPref, loadThemePreferences, loadLayoutPreference, saveLayoutPreference, loadStreamingPreference from preferences.svelte.ts
  - phase: 08-02
    provides: PanelLayout, LeftSidebar, RightSidebar, ControlBar components; LayoutTemplate type, DEFAULT_TEMPLATE, TEMPLATE_LIST from templates.ts

provides:
  - Root layout with Tauri/web branching: Tauri gets ControlBar + PanelLayout(cockpit) with LeftSidebar + RightSidebar; web unchanged
  - Theme engine initialized on Tauri startup via initTheme(tasteProfile.tags, themePrefs)
  - Reactive theme updates via $effect on tasteProfile.isLoaded + themeState.mode
  - Layout template switching via handleTemplateChange (updates state + persists to taste.db)
  - Streaming preference reordering in EmbedPlayer (orderedPlatforms derived)
  - Streaming preference reordering in artist page Listen On bar (sortedStreamingLinks derived)

affects:
  - 08-04-plan (settings UI — theme + streaming + layout preferences settable from Settings page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tauri/web layout branching: {#if tauriMode} in root layout renders entirely different structure per platform
    - Snippet-based panel composition: {#snippet sidebar()} / {#snippet context()} passed to PanelLayout
    - $derived for streaming preference reordering: preferred platform floated to position 0 in both embed order and link order
    - Promise.all for parallel preference loading (theme + layout) in onMount

key-files:
  created: []
  modified:
    - src/routes/+layout.svelte
    - src/lib/components/EmbedPlayer.svelte
    - src/routes/artist/[slug]/+page.svelte

key-decisions:
  - "ControlBar positioned between header and PanelLayout — header provides site identity (unchanged), ControlBar provides workspace controls (additive)"
  - "showPlayer passed as hasPlayer to PanelLayout — PanelLayout adjusts its height calc to account for player bar when visible"
  - "loadStreamingPreference called in onMount Tauri block — sets reactive streamingPref.platform which all components read without async"
  - "sortedStreamingLinks uses label.toLowerCase().includes(platform) — label-based match handles 'Spotify', 'Spotify (streaming)', etc. without requiring exact key match"

patterns-established:
  - "Platform-agnostic preference read: streamingPref.platform is empty string on web (no invoke), components treat empty as 'no preference' and use defaults"
  - "Tauri/web layout divergence in root layout: single {#if tauriMode} gate — web path is zero-change"

requirements-completed:
  - UX-03
  - EMBED-02

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 08 Plan 03: Integration — Layout + Embeds Wired

**Root layout integrated with PanelLayout (cockpit mode), theme engine, ControlBar, and streaming preference reordering — desktop app launches in full cockpit configuration with taste-based colors and preferred platform ordering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T19:23:28Z
- **Completed:** 2026-02-21T19:27:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Root layout branches on `tauriMode`: Tauri gets ControlBar + PanelLayout with snippet-based LeftSidebar + RightSidebar; web path is completely unchanged
- Theme engine wired: `initTheme` called on Tauri mount with saved preferences and taste tags; reactive `$effect` calls `updateThemeFromTaste` whenever taste profile loads/changes in taste mode
- Layout template switching: `handleTemplateChange` updates `activeTemplate` state and persists to taste.db via `saveLayoutPreference`
- `EmbedPlayer.svelte`: `orderedPlatforms` derived puts preferred platform first in embed rendering order
- Artist page: `sortedStreamingLinks` derived sorts the Listen On bar links so preferred platform appears first
- All preference loading (theme, layout, streaming) happens in the Tauri onMount block — web never touches Tauri invoke

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate PanelLayout and theme engine into root layout** - `d231804` (feat)
2. **Task 2: Implement streaming preference in embeds and artist page** - `5c353ca` (feat)

**Plan metadata:** committed with SUMMARY.md below

## Files Created/Modified
- `src/routes/+layout.svelte` — Added imports for all 4 panel components + theme engine functions; `activeTemplate` state; extended Tauri onMount to load theme/layout/streaming prefs and call `initTheme`; `$effect` for reactive taste updates; `handleTemplateChange` handler; Tauri HTML branch renders ControlBar + PanelLayout with sidebar/context snippets
- `src/lib/components/EmbedPlayer.svelte` — Added `streamingPref` import and `PlatformType` type import; `orderedPlatforms` derived; replaced `PLATFORM_PRIORITY` with `orderedPlatforms` in embed loop
- `src/routes/artist/[slug]/+page.svelte` — Added `streamingPref` import; `sortedStreamingLinks` derived; replaced `streamingLinks` with `sortedStreamingLinks` in Listen On section

## Decisions Made
- **ControlBar between header and PanelLayout:** Header (site name + nav) is site identity — unchanged. ControlBar (search + layout switcher + theme dot) is workspace control. Additive, not replacement.
- **`showPlayer` as `hasPlayer` prop:** PanelLayout needs player height info to correctly set `calc(100vh - var(--header-height) - var(--player-height))`. The existing `showPlayer` state is the right signal.
- **Streaming pref loaded in onMount (not separately):** `loadStreamingPreference` sets the reactive `streamingPref.platform` state internally — calling it is sufficient, no return value needed in layout scope.
- **Label-based streaming link sort:** `a.label.toLowerCase().includes(streamingPref.platform)` handles label variations ('Spotify', 'Spotify (streaming)') without requiring exact key match.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `hasPlayer` undefined — used `showPlayer` instead**
- **Found during:** Task 1 (layout integration)
- **Issue:** Plan spec used `{hasPlayer}` shorthand in PanelLayout call, but root layout only has `showPlayer` state (the existing boolean for player visibility). `hasPlayer` does not exist in scope.
- **Fix:** Changed `{hasPlayer}` to `hasPlayer={showPlayer}` — passes the correct state variable as the `hasPlayer` prop.
- **Files modified:** src/routes/+layout.svelte
- **Verification:** `npm run check` caught this immediately; 0 errors after fix.
- **Committed in:** `d231804` (Task 1 commit)

**2. [Rule 1 - Bug] Import placed mid-script — moved to top-of-file**
- **Found during:** Task 2 (artist page modification)
- **Issue:** First draft of artist page edit placed the `streamingPref` import after variable declarations inside the script block — not valid Svelte/TypeScript.
- **Fix:** Moved import to the top import block alongside existing imports.
- **Files modified:** src/routes/artist/[slug]/+page.svelte
- **Committed in:** `5c353ca` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, caught before check)
**Impact on plan:** Both caught and corrected within the same task. No scope creep — prop name correction and import placement fix.

## Issues Encountered
None beyond the two auto-fixed bugs above. PanelLayout snippet API, ControlBar props, and preferences module all matched plan assumptions exactly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 08 Plans 01-03 all complete: theme engine built, panel components built, everything wired into the live app
- Tauri desktop app fully launches in cockpit mode with taste palette applied on startup
- Plan 04 (Settings UI for theme + streaming + layout preferences) is the final Phase 08 plan

## Self-Check: PASSED

- FOUND: src/routes/+layout.svelte (modified — PanelLayout, ControlBar, theme engine wired)
- FOUND: src/lib/components/EmbedPlayer.svelte (modified — orderedPlatforms derived)
- FOUND: src/routes/artist/[slug]/+page.svelte (modified — sortedStreamingLinks derived)
- FOUND: .planning/phases/08-underground-aesthetic/08-03-SUMMARY.md
- FOUND commit: d231804 (Task 1: layout integration)
- FOUND commit: 5c353ca (Task 2: embed + artist page streaming pref)

---
*Phase: 08-underground-aesthetic*
*Completed: 2026-02-21*
