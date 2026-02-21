---
phase: 08-underground-aesthetic
verified: 2026-02-21T20:00:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
human_verification:
  - test: "Cockpit layout renders and panels are resizable"
    expected: "Desktop app launches in 3-pane cockpit mode; drag pane resizers to resize left/right sidebars; sizes persist on restart"
    why_human: "Requires running Tauri desktop app — cannot verify PaneForge DOM behavior headlessly"
  - test: "Taste-based theme color changes with music playback"
    expected: "After listening history accumulates tags, enabling 'Taste' mode in Settings changes the app colors to match the generated OKLCH hue; two users with different taste profiles see different colors"
    why_human: "Requires live Tauri app with populated taste data and visual color comparison"
  - test: "Manual hue slider applies live color change"
    expected: "Dragging the hue slider in Settings > Appearance immediately updates all UI colors with a smooth 0.5s transition"
    why_human: "Requires running desktop app to observe DOM transition behavior and OKLCH rendering"
  - test: "Streaming preference reorders embeds"
    expected: "Setting preferred platform to Spotify in Settings > Streaming Preference causes the Spotify embed to appear first on artist pages"
    why_human: "Requires Tauri app with real artist data and embed rendering"
---

# Phase 08: Underground Aesthetic Verification Report

**Phase Goal:** The turning point. Mercury stops looking like a search engine and starts feeling like a place. The UI becomes dense, playful, and game-like — panels, controls, dropdowns everywhere. A cockpit, not a feed. Your taste shapes your colors through taste-based theming. Layout templates let you customize your workspace. This ships before community features because the vibe has to be right first.

**Verified:** 2026-02-21T20:00:00Z
**Status:** passed (with human verification items for visual/interactive behaviors)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Taste tags deterministically map to an OKLCH hue (same tags = same color, always) | VERIFIED | `tasteTagsToHue` in palette.ts: djb2 hash on sorted top-5 tags by weight, returns 0-360 |
| 2 | A full palette of CSS custom properties is generated from a single seed hue | VERIFIED | `generatePalette(hue)` returns 14 OKLCH strings for --bg-*, --border-*, --tag-*, --player-*, --link-color, --progress-color |
| 3 | Theme engine reactively applies palette to document root when taste profile changes | VERIFIED | `$effect` in +layout.svelte calls `updateThemeFromTaste(tasteProfile.tags)` when `tasteProfile.isLoaded && themeState.mode === 'taste'` |
| 4 | Default dark theme (current look) is the fallback when no taste data exists | VERIFIED | `initTheme` calls `clearPalette()` for 'default' mode; theme.css OKLCH defaults are achromatic (0 chroma) |
| 5 | Manual hue override (0-360) replaces taste-generated color | VERIFIED | Settings hue slider calls `handleHueChange(hue)` → `generatePalette(hue)` → `applyPalette(palette)` |
| 6 | Theme preferences persist in taste.db via existing ai_settings pattern | VERIFIED | `saveThemePreference` invokes `set_ai_setting` with keys `theme_mode` / `theme_manual_hue` |
| 7 | PaneForge is installed and provides resizable split panes | VERIFIED | `paneforge: ^1.0.2` in package.json; PanelLayout.svelte imports `PaneGroup, Pane, PaneResizer` from 'paneforge' |
| 8 | Three built-in layout templates: cockpit (3-pane), focus (2-pane), minimal (single column) | VERIFIED | `LAYOUT_TEMPLATES` in templates.ts defines all three with correct `panes` values and size configs |
| 9 | User-created templates stored as JSON in taste.db and loaded alongside built-ins | VERIFIED | `loadUserTemplates/saveUserTemplates` use `user_layout_templates` key in ai_settings; `expandUserTemplate` converts to full TemplateConfig |
| 10 | ControlBar provides global controls (search, layout dropdown showing all templates, theme indicator) | VERIFIED | ControlBar.svelte: search form (200px input + goto), layout select with optgroup for user templates, theme dot indicator |
| 11 | Each sidebar can collapse to a thin strip with a toggle button | VERIFIED | PanelLayout.svelte: `collapsible={true}`, `collapsedSize={2}`, `onCollapse`/`onExpand` handlers render expand/collapse SVG buttons |
| 12 | Tauri desktop app uses PanelLayout (cockpit default) wrapping main content with sidebars | VERIFIED | +layout.svelte: `{#if tauriMode}` renders ControlBar + PanelLayout with sidebar/context snippets |
| 13 | Web app remains single-column — unchanged from current | VERIFIED | +layout.svelte: `{:else}` branch renders original `<main>` with `{@render children()}` — zero changes to web path |
| 14 | User's preferred streaming platform determines embed order in EmbedPlayer | VERIFIED | EmbedPlayer.svelte: `orderedPlatforms = $derived(streamingPref.platform ? [streamingPref.platform, ...PLATFORM_PRIORITY.filter...] : PLATFORM_PRIORITY)`; used in embed loop |
| 15 | User's preferred streaming platform determines 'Listen On' link order on artist pages | VERIFIED | artist +page.svelte: `sortedStreamingLinks = $derived(...)` sorts by `a.label.toLowerCase().includes(streamingPref.platform)`; used in `{#each sortedStreamingLinks}` |
| 16 | Settings page has Appearance, Layout, and Streaming Preference sections with working controls | VERIFIED | settings/+page.svelte: all three sections present with radio group, hue slider, template grid, user template CRUD, platform dropdown |

**Score:** 16/16 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/theme/palette.ts` | OKLCH palette generation from seed hue and tag-to-hue mapping | VERIFIED | Exports `tasteTagsToHue`, `generatePalette`, `TASTE_PALETTE_KEYS` — 87 lines, substantive |
| `src/lib/theme/engine.svelte.ts` | Reactive theme state with $state rune, apply/clear palette functions | VERIFIED | Exports `themeState`, `applyPalette`, `clearPalette`, `initTheme`, `updateThemeFromTaste` — 122 lines, substantive |
| `src/lib/theme/preferences.svelte.ts` | Preference load/save CRUD using taste.db ai_settings | VERIFIED | Exports all documented functions + `streamingPref` reactive state — 162 lines, substantive |
| `src/lib/styles/theme.css` | OKLCH-ready custom properties as defaults | VERIFIED | All 14 taste-affected properties use `oklch(...)` values; `--text-*` remain achromatic fixed-lightness |
| `src/lib/theme/templates.ts` | Layout template type definitions, built-in configs, user template utilities | VERIFIED | Exports `LayoutTemplate`, `LAYOUT_TEMPLATES`, `DEFAULT_TEMPLATE`, `TEMPLATE_LIST`, `UserTemplateRecord`, `expandUserTemplate`, `createUserTemplateRecord` |
| `src/lib/components/PanelLayout.svelte` | PaneForge wrapper that renders different panel arrangements based on active template | VERIFIED | `PaneGroup` import confirmed; three conditional branches for 'three'/'two'/'one'; collapsible sidebars with toggle buttons |
| `src/lib/components/LeftSidebar.svelte` | Left sidebar with nav links, tag browser, discovery filter controls | VERIFIED | Contains navLinks array, tagInput, selectedTags, decade slider, nicheLevel dropdown, debounced fetch |
| `src/lib/components/RightSidebar.svelte` | Right sidebar with context-aware content that changes per page | VERIFIED | `isArtistPage`/`isGenrePage` $derived; artist/genre/default sections; queue management panel |
| `src/lib/components/ControlBar.svelte` | Dense top toolbar with search, layout switcher, theme indicator | VERIFIED | Contains `control-bar` class, search form, `layout-select` dropdown, `theme-dot` indicator |
| `src/routes/+layout.svelte` | Root layout with PanelLayout integration (Tauri) + theme engine init + ControlBar | VERIFIED | All Phase 8 imports present; `{#if tauriMode}` gate renders ControlBar + PanelLayout |
| `src/lib/components/EmbedPlayer.svelte` | Platform-reordered embed rendering based on streaming preference | VERIFIED | `orderedPlatforms` derived from `streamingPref.platform`; used in embed loop (line 114) |
| `src/routes/artist/[slug]/+page.svelte` | Streaming links sorted by user preference in 'Listen On' bar | VERIFIED | `sortedStreamingLinks` derived from `streamingPref.platform`; replaces `streamingLinks` in template |
| `src/routes/settings/+page.svelte` | Settings UI with theme, layout, and streaming preference sections | VERIFIED | Three sections: Appearance (radio + slider), Layout (template grid + user CRUD), Streaming Preference (platform select) |
| `src/lib/theme/layout-state.svelte.ts` | Shared reactive layout template state for root layout and settings | VERIFIED | Exports `layoutState = $state({ template, userTemplates })` — 18 lines, substantive |
| `ARCHITECTURE.md` | Technical documentation of Phase 8 subsystems | VERIFIED | "Underground Aesthetic" section at line 832 with Theme Engine, Panel Layout, Streaming Preference subsections |
| `docs/user-manual.md` | User-facing documentation of new features | VERIFIED | "Desktop Workspace" section with ControlBar, Layout Templates, Theme Modes, Streaming Preference subsections |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/theme/palette.ts` | `src/lib/taste/profile.svelte.ts` | `tasteTagsToHue` reads `TasteTag[]` shape | WIRED | `import type { TasteTag } from '$lib/taste/profile.svelte'` at line 11 |
| `src/lib/theme/engine.svelte.ts` | `src/lib/theme/palette.ts` | imports generatePalette and tasteTagsToHue | WIRED | `import { tasteTagsToHue, generatePalette, TASTE_PALETTE_KEYS } from './palette'` at line 14 |
| `src/lib/theme/preferences.svelte.ts` | taste.db ai_settings | Tauri invoke get_all_ai_settings / set_ai_setting | WIRED | 8 invoke calls confirmed; dynamic import pattern for Tauri isolation |
| `src/lib/components/PanelLayout.svelte` | paneforge | imports PaneGroup, Pane, PaneResizer | WIRED | `import { PaneGroup, Pane, PaneResizer } from 'paneforge'` at line 2 |
| `src/lib/components/PanelLayout.svelte` | `src/lib/theme/templates.ts` | imports template type for conditional rendering | WIRED | `import { LAYOUT_TEMPLATES, type LayoutTemplate } from '$lib/theme/templates'` at line 4 |
| `src/lib/components/ControlBar.svelte` | `src/lib/theme/templates.ts` | receives allTemplates prop (built-ins + user) | WIRED | `allTemplates: TemplateConfig[]` prop; root layout passes `allTemplateConfigs` derived from `TEMPLATE_LIST + layoutState.userTemplates.map(expandUserTemplate)` |
| `src/routes/+layout.svelte` | `src/lib/components/PanelLayout.svelte` | imports and renders PanelLayout for Tauri mode | WIRED | Import line 14; `<PanelLayout template={layoutState.template} hasPlayer={showPlayer}>` at line 149 |
| `src/routes/+layout.svelte` | `src/lib/theme/engine.svelte.ts` | calls initTheme on mount to apply saved palette | WIRED | `initTheme(tasteProfile.tags, themePrefs)` at line 58; `$effect` calls `updateThemeFromTaste` |
| `src/routes/+layout.svelte` | `src/lib/theme/preferences.svelte.ts` | loads saved preferences on mount | WIRED | `loadThemePreferences`, `loadLayoutPreference`, `loadStreamingPreference`, `loadUserTemplates` all called in Tauri onMount |
| `src/lib/components/EmbedPlayer.svelte` | `src/lib/theme/preferences.svelte.ts` | reads streamingPref for platform ordering | WIRED | `import { streamingPref } from '$lib/theme/preferences.svelte'` at line 7; used in `orderedPlatforms` derived |
| `src/routes/settings/+page.svelte` | `src/lib/theme/engine.svelte.ts` | imports themeState and applyPalette for live preview | WIRED | `import { themeState, applyPalette, clearPalette } from '$lib/theme/engine.svelte'` at line 8 |
| `src/routes/settings/+page.svelte` | `src/lib/theme/preferences.svelte.ts` | imports save functions for persisting all preferences | WIRED | `import { saveThemePreference, saveStreamingPreference, saveLayoutPreference, saveUserTemplates, streamingPref }` at line 10 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UX-01 | 08-02, 08-04 | Dense, panel-based UI — multiple information sources visible simultaneously | SATISFIED | PanelLayout.svelte with cockpit (3-pane) default; LeftSidebar + RightSidebar wired in root layout; Settings layout picker |
| UX-02 | 08-01, 08-04 | Taste-based theming engine — color palette generated from user's taste profile | SATISFIED | palette.ts (tasteTagsToHue + generatePalette), engine.svelte.ts (applyPalette + initTheme), Settings Appearance section |
| UX-03 | 08-03, 08-04 | Layout templates — users can choose and customize their workspace arrangement | SATISFIED | 3 built-in templates + user template CRUD in Settings; ControlBar layout switcher; preference persists to taste.db |
| UX-04 | 08-02, 08-04 | Interactive controls everywhere — dropdowns, sliders, toggles; using Mercury feels like playing | SATISFIED | LeftSidebar discovery filters (tag input, decade slider, niche dropdown); Settings hue slider + radio group; ControlBar layout dropdown |
| EMBED-02 | 08-03, 08-04 | User can set preferred streaming service — embeds and links default to their choice | SATISFIED | EmbedPlayer orderedPlatforms derived; artist page sortedStreamingLinks derived; Settings Streaming Preference section with platform dropdown |

All 5 phase requirements marked Complete in REQUIREMENTS.md (lines 149, 173-176). No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/theme/preferences.svelte.ts` | 136, 140, 144 | `return []` | Info | Legitimate: empty-array returns in error/absent-data handling for `loadUserTemplates`. Not a stub — these are correct defensive returns |

No blocking anti-patterns found. No TODO/FIXME/placeholder comments in Phase 8 files. No empty handlers or stub implementations.

---

### Build Verification

- `npm run check`: 0 errors, 6 warnings (all pre-existing in unrelated files: crate/+page.svelte, kb/+page.svelte, time-machine/+page.svelte — none in Phase 8 files)
- `npm run build`: Clean build in 8.47s — Cloudflare Pages adapter output confirmed

---

### Git Commits Verified

All 8 Phase 8 commits confirmed in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `bac28d7` | 08-01 Task 1 | feat: create OKLCH theme engine modules |
| `f77b9e2` | 08-01 Task 2 | feat: convert theme.css to OKLCH color space |
| `eb0a2de` | 08-02 Task 1 | feat: install PaneForge and create layout template definitions |
| `149abf9` | 08-02 Task 2 | feat: create PanelLayout, LeftSidebar, RightSidebar, ControlBar components |
| `d231804` | 08-03 Task 1 | feat: integrate PanelLayout, theme engine, and ControlBar into root layout |
| `5c353ca` | 08-03 Task 2 | feat: implement streaming preference reordering in EmbedPlayer and artist page |
| `382cc83` | 08-04 Task 1 | feat: add theme/layout/streaming sections to Settings, shared layout state |
| `f3470e7` | 08-04 Task 2 | docs: update ARCHITECTURE.md, user manual, and BUILD-LOG for Phase 8 |

---

### Human Verification Required

The following items pass all automated checks but require a running Tauri desktop app to confirm correct visual and interactive behavior:

#### 1. Cockpit Panel Layout Renders Correctly

**Test:** Launch the Mercury desktop app. Verify it opens in 3-pane cockpit mode with LeftSidebar (nav + discovery filters) on the left and RightSidebar (queue + context) on the right. Drag the PaneResizer handles to resize panels. Close the app and reopen — verify panel sizes are remembered.

**Expected:** 3-pane layout visible on launch; drag resizers work smoothly; sizes persist between sessions

**Why human:** Requires running Tauri app — PaneForge DOM rendering and localStorage persistence cannot be verified headlessly

#### 2. Taste-Based Theme Colors Apply Correctly

**Test:** Open Settings > Appearance. Select "Taste" mode. Verify the UI colors shift to a hue derived from your listening history tags. Compare with another user profile that has different taste tags — the hue should differ.

**Expected:** App colors change with a smooth 0.5s transition; different taste profiles produce visibly different hues; the OKLCH color space makes hue shifts perceptually uniform (no brightness jump)

**Why human:** Requires live Tauri app with populated taste data and visual color comparison

#### 3. Manual Hue Slider Works Live

**Test:** In Settings > Appearance, select "Custom" mode. Drag the hue slider from 0 to 360. Verify all UI colors (backgrounds, borders, tags, links, player) shift smoothly with the slider.

**Expected:** 0.5s color transition fires as slider moves; hue preview dot matches the app colors; colors revert to default on selecting "Default" mode

**Why human:** Requires running desktop app to observe DOM transition behavior and verify OKLCH rendering across the 0-360 range

#### 4. Streaming Preference Reorders Embeds

**Test:** Go to Settings > Streaming Preference. Set preferred platform to "Spotify". Navigate to an artist page with a Spotify embed. Verify the Spotify embed appears first. Then verify "Listen On" links also show Spotify first.

**Expected:** Preferred platform appears at position 0 in both embed order and link order; changing preference updates immediately

**Why human:** Requires Tauri app with real MusicBrainz artist data that has Spotify URLs and embed-able content

#### 5. User Template Save/Delete Flow

**Test:** In Settings > Layout, type a name in the "Name this layout..." input and click "Save layout". Verify the new template appears in the "My Layouts" section and in the ControlBar dropdown. Click the × button to delete it. Verify it disappears from both places. Restart the app — user templates should still be there (or absent if deleted).

**Expected:** Create → appears in Settings + ControlBar; Delete → disappears from both; persists across restart

**Why human:** Requires Tauri app with taste.db write access and visual confirmation of dropdown contents

---

### Summary

Phase 8 goal is **achieved**. All infrastructure is substantive and fully wired:

- The theme engine (palette.ts → engine.svelte.ts → CSS custom properties) is complete and deterministic. OKLCH math is correct. Preference persistence uses the established ai_settings pattern.
- The panel layout system (PaneForge + PanelLayout + 3 template configs + LeftSidebar + RightSidebar + ControlBar) is fully implemented with real content — nav links, discovery filters, context panels, queue management. Not empty shells.
- The Tauri/web split in +layout.svelte is clean: Tauri gets the full cockpit experience; web is zero-change.
- Streaming preference is wired end-to-end: preference state → EmbedPlayer orderedPlatforms → artist page sortedStreamingLinks.
- Settings page has all three new sections with live-preview handlers and persistence.
- Documentation (ARCHITECTURE.md, user-manual.md) is updated and substantive.
- Build and type check are clean (0 errors).

Mercury has its cockpit. Two different people see two different Mercurys.

---

_Verified: 2026-02-21T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
