---
phase: 08-underground-aesthetic
plan: 01
subsystem: ui
tags: [oklch, theming, svelte5, runes, css-custom-properties, taste-profile]

# Dependency graph
requires:
  - phase: 07.2-playback-taste-signal
    provides: TasteTag type and taste profile reactive state in profile.svelte.ts
  - phase: 05-ai-foundation
    provides: taste.db ai_settings table via get_all_ai_settings / set_ai_setting Tauri commands

provides:
  - OKLCH palette generation from seed hue (14 CSS custom properties)
  - Deterministic tag-to-hue mapping via djb2 hash on top-5 taste tags
  - Reactive theme state (themeState $state) with applyPalette / clearPalette / initTheme / updateThemeFromTaste
  - Preference persistence for theme mode, manual hue, streaming platform, layout template
  - Reactive streamingPref state for streaming platform preference
  - OKLCH-native theme.css defaults (visually identical to prior hex theme)

affects:
  - 08-02-plan (panel layout — layout preference uses loadLayoutPreference)
  - 08-03-plan (layout integration — calls initTheme from root layout onMount)
  - 08-04-plan (settings UI — theme/streaming/layout preference load/save)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - OKLCH color space for all taste-affected CSS custom properties
    - djb2-style polynomial hash for deterministic tag-to-hue mapping
    - Svelte 5 $state rune in .svelte.ts files for reactive module-level state
    - Dynamic import getInvoke() pattern for Tauri isolation in web builds
    - TASTE_PALETTE_KEYS array as canonical registry of engine-managed properties

key-files:
  created:
    - src/lib/theme/palette.ts
    - src/lib/theme/engine.svelte.ts
    - src/lib/theme/preferences.svelte.ts
  modified:
    - src/lib/styles/theme.css

key-decisions:
  - "OKLCH over HSL for taste theming: perceptually consistent lightness across hues — shifting hue doesn't change apparent brightness"
  - "djb2-style hash on alphabetically-sorted top-5 tags by weight: same tags always produce same hue, deterministic"
  - "Text properties excluded from generated palette: --text-* stay at fixed lightness for WCAG AA readability"
  - "transition added then removed after 600ms: smooth 0.5s color fade without permanent performance overhead"
  - "streamingPref reactive $state in preferences.svelte.ts: components can read platform without invoking"
  - "Default layout template: cockpit (3-pane full) — per user decision from 08-CONTEXT.md"

patterns-established:
  - "TASTE_PALETTE_KEYS: canonical string[] of all CSS properties the engine manages — used by clearPalette to know what to remove"
  - "Theme mode enum: taste | manual | default — three-state design mirrors taste profile three-state (loading/empty/loaded)"
  - "applyPalette/clearPalette always add transition first, remove after 600ms — avoids permanent transition cost"

requirements-completed:
  - UX-02

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 08 Plan 01: Theme Engine Foundation Summary

**OKLCH taste-based theming engine: deterministic tag-to-hue mapping, 14-property palette generation, reactive engine state, preference CRUD, and OKLCH-native theme.css defaults**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T19:06:20Z
- **Completed:** 2026-02-21T19:10:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Three new modules in `src/lib/theme/` — palette math, engine state, preference persistence — compile with zero TypeScript errors
- `tasteTagsToHue` produces deterministic hues: same taste tags always produce the same color, across app restarts
- `generatePalette` covers all 14 taste-affected CSS custom properties in OKLCH space, leaving text properties intentionally untouched
- `theme.css` converted from hex to OKLCH equivalents — visually identical dark theme, but now in consistent color space for runtime overrides
- Streaming platform and layout template preferences wired to the same `ai_settings` table pattern as AI settings — no new Rust commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OKLCH palette generation and theme engine modules** - `bac28d7` (feat)
2. **Task 2: Update theme.css with OKLCH foundation** - `f77b9e2` (feat)

**Plan metadata:** committed with SUMMARY.md below

## Files Created/Modified
- `src/lib/theme/palette.ts` — Pure functions: `tasteTagsToHue` (djb2 hash on top-5 tags), `generatePalette` (14 OKLCH strings), `TASTE_PALETTE_KEYS` array
- `src/lib/theme/engine.svelte.ts` — Reactive `themeState` ($state), `applyPalette` (smooth transition), `clearPalette`, `initTheme`, `updateThemeFromTaste`
- `src/lib/theme/preferences.svelte.ts` — Load/save for theme mode, manual hue, streaming platform, layout template; reactive `streamingPref` $state
- `src/lib/styles/theme.css` — Hex values replaced with OKLCH equivalents for all 14 taste-affected properties; comment added at :root block

## Decisions Made
- **OKLCH over HSL:** Perceptually uniform lightness means hue shifts don't change apparent brightness — the UI density and contrast feel identical regardless of generated hue
- **djb2 hash on alphabetically sorted top-5 tags by weight:** Simple, no dependencies, distributes well across 0-360, fully deterministic
- **Text properties excluded from palette:** `--text-primary`, `--text-secondary`, `--text-muted`, `--text-accent` stay achromatic at fixed lightness — WCAG AA compliance without hue-dependent readability risk
- **Transition add/remove pattern:** Adds CSS transition to `:root` before applying palette, removes it 600ms later — smooth visual fade without permanent transition overhead on every style recalculation
- **`streamingPref` reactive state in preferences module:** Components can read `streamingPref.platform` reactively without async invoke calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Theme engine modules are complete and ready for integration in Plan 03 (root layout `onMount` calls `initTheme`)
- `streamingPref` reactive state ready for Plan 03 embed integration (embeds default to user's chosen platform)
- Layout template preference (`loadLayoutPreference` / `saveLayoutPreference`) ready for Plan 02 (PaneForge panels)
- All three modules compile cleanly; `npm run build` passes

## Self-Check: PASSED

- FOUND: src/lib/theme/palette.ts
- FOUND: src/lib/theme/engine.svelte.ts
- FOUND: src/lib/theme/preferences.svelte.ts
- FOUND: src/lib/styles/theme.css (19 OKLCH occurrences)
- FOUND: .planning/phases/08-underground-aesthetic/08-01-SUMMARY.md
- FOUND commit: bac28d7 (feat: theme engine modules)
- FOUND commit: f77b9e2 (feat: OKLCH theme.css)

---
*Phase: 08-underground-aesthetic*
*Completed: 2026-02-21*
