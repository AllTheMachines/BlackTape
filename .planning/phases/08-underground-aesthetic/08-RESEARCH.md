# Phase 8: Underground Aesthetic - Research

**Researched:** 2026-02-21
**Domain:** UI/UX overhaul — dense panel layout, taste-based theming engine, layout customization, streaming preference, interactive controls
**Confidence:** MEDIUM

## Summary

Phase 8 transforms Mercury from a search engine into a "place" — a dense, game-like cockpit where multiple information sources are visible simultaneously, the color palette reflects the user's taste profile, and layouts are customizable via templates. This is a frontend-heavy phase that builds on existing infrastructure: the taste profile system (Phase 5/07.1/07.2), the discovery panels (Phase 6), and the embed system (Phase 2).

The core technical challenges are: (1) generating a perceptually uniform color palette from taste profile tags using OKLCH color space, (2) implementing a resizable panel-based layout with PaneForge, (3) persisting user preferences (theme, layout template, streaming preference) in taste.db via the existing ai_settings key-value pattern, and (4) reordering embed/streaming priorities based on user preference. None of these require new external services or infrastructure — everything runs locally in the Tauri desktop app.

**Important note:** Requirements UX-01, UX-02, UX-03, UX-04 are referenced in ROADMAP.md but are NOT defined in REQUIREMENTS.md. These requirement IDs must be formally defined before planning proceeds.

**Primary recommendation:** Use OKLCH color space for taste-based palette generation (perceptually uniform, CSS-native), PaneForge 1.x for resizable panels (Svelte 5 compatible, built-in localStorage persistence), and the existing taste.db ai_settings table for storing all new user preferences (no new database, no new tables).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | **UNDEFINED** — Not found in REQUIREMENTS.md. Roadmap maps it to Phase 8. Likely: Dense panel-based UI | Panel layout patterns with PaneForge, dashboard architecture section |
| UX-02 | **UNDEFINED** — Not found in REQUIREMENTS.md. Roadmap maps it to Phase 8. Likely: Taste-based theming | OKLCH palette generation, CSS custom property theming section |
| UX-03 | **UNDEFINED** — Not found in REQUIREMENTS.md. Roadmap maps it to Phase 8. Likely: Layout templates | PaneForge autoSaveId persistence, template switching patterns |
| UX-04 | **UNDEFINED** — Not found in REQUIREMENTS.md. Roadmap maps it to Phase 8. Likely: Interactive controls | Control component patterns, game-like interaction research |
| EMBED-02 | User can set preferred streaming service — embeds and links default to their choice | Streaming preference architecture, PLATFORM_PRIORITY reordering |
| SOCIAL-01 | Opt-in user profiles with collections (anonymous browsing by default) | **OUT OF SCOPE** — Phase 9 per roadmap |
</phase_requirements>

## Critical Pre-Planning Issue

**UX-01 through UX-04 are undefined.** The roadmap references these requirement IDs under Phase 8, but REQUIREMENTS.md has no UX section. Before planning, these must be formally defined. Based on the Phase 8 description and success criteria, the likely definitions are:

- **UX-01**: Dense, panel-based UI — multiple information sources visible simultaneously
- **UX-02**: Taste-based theming engine — color palette generated from user's taste profile
- **UX-03**: Layout templates — users can choose and customize workspace arrangement
- **UX-04**: Interactive controls everywhere — dropdowns, sliders, toggles; game-like feel

Additionally, **EMBED-02** ("User can set preferred streaming service") is already defined in REQUIREMENTS.md and maps to Phase 8 in traceability. This should be addressed in Phase 8 alongside the UX requirements.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| paneforge | ^1.0.2 | Resizable panel layout | Only maintained Svelte 5 resizable panel library; built-in autoSaveId localStorage persistence; three clean components (PaneGroup, Pane, PaneResizer) |
| svelte (existing) | 5.x | Reactive UI framework | Already in project — $state runes, $effect, $derived for reactive theming |
| CSS oklch() | Native | Perceptually uniform color generation | CSS Color Module Level 4 — no library needed; perceptually uniform = equal numerical changes produce equal visual differences; supported in all modern browsers/WebView2 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svelte-persisted-state | ^2.x | localStorage persistence with Svelte 5 runes | **Only if** the existing taste.db pattern proves insufficient for web-side preference storage. Likely NOT needed — taste.db + Tauri invoke covers desktop preferences, and web has no user state |
| chroma-js | ^3.x | Color space conversion utilities | **Only if** raw OKLCH math proves too complex for palette generation. CSS oklch() handles rendering; JS may be needed for the tag→hue mapping computation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PaneForge | svelte-grid-extended | Grid is for widget dashboards (drag+drop repositioning); PaneForge is for resizable split panes. Mercury needs split panes (cockpit panels), not a widget grid. |
| PaneForge | Custom CSS Grid + resize handles | Works but requires handling drag events, min/max sizes, keyboard accessibility, localStorage persistence manually. PaneForge solves all of these. |
| OKLCH (native CSS) | HSL palette generation | HSL is NOT perceptually uniform — same lightness value produces visually different brightness across hues. OKLCH fixes this. |
| OKLCH (native CSS) | chroma-js full color library | Overkill for palette from seed hue. Native oklch() + JS math is sufficient. |
| taste.db ai_settings | localStorage directly | Inconsistent with existing preference pattern. All Tauri user state goes through Rust IPC → taste.db. Adding localStorage would create a second source of truth. |

**Installation:**
```bash
npm install paneforge
```

No other new dependencies needed. OKLCH is native CSS. Persistence uses existing taste.db infrastructure.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── theme/                    # NEW — Taste-based theming engine
│   │   ├── engine.svelte.ts      # Reactive theme state ($state rune), palette generation
│   │   ├── palette.ts            # OKLCH palette math: tag→hue mapping, shade generation
│   │   ├── templates.ts          # Layout template definitions (panel arrangements)
│   │   └── preferences.ts        # User preference CRUD (streaming, layout, theme mode)
│   ├── styles/
│   │   └── theme.css             # MODIFIED — Base values become fallback defaults; runtime overrides via JS
│   └── components/
│       ├── PanelLayout.svelte    # NEW — PaneForge wrapper with template switching
│       ├── ControlBar.svelte     # NEW — Dense toolbar with dropdowns, toggles, sliders
│       └── ThemePicker.svelte    # NEW — Theme mode selector (taste-based / manual / presets)
├── routes/
│   ├── +layout.svelte            # MODIFIED — Injects computed CSS custom properties; wraps content in PanelLayout for Tauri
│   └── settings/
│       └── +page.svelte          # MODIFIED — New sections for theme, layout, streaming preference
```

### Pattern 1: Taste-Based Palette Generation via OKLCH

**What:** Convert the user's top taste tags into a deterministic seed hue, then generate a full color palette using OKLCH color space with fixed lightness/chroma curves.

**When to use:** Whenever the theme engine computes a new palette (on taste profile load, on taste change, on manual override).

**Example:**
```typescript
// src/lib/theme/palette.ts

/**
 * Map taste tags to a deterministic hue (0-360).
 * Uses a hash of the top N tags sorted alphabetically.
 * Deterministic: same tags always produce the same hue.
 */
function tasteTagsToHue(tags: Array<{ tag: string; weight: number }>): number {
    const sorted = tags
        .filter(t => t.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map(t => t.tag)
        .sort()
        .join('|');

    // Simple hash → hue mapping
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
        hash = ((hash << 5) - hash + sorted.charCodeAt(i)) | 0;
    }
    return ((hash % 360) + 360) % 360;
}

/**
 * Generate CSS custom property overrides from a seed hue.
 * Uses OKLCH for perceptual uniformity.
 */
function generatePalette(hue: number): Record<string, string> {
    return {
        '--bg-base':     `oklch(0.05 0.01 ${hue})`,
        '--bg-surface':  `oklch(0.10 0.015 ${hue})`,
        '--bg-elevated': `oklch(0.14 0.02 ${hue})`,
        '--bg-hover':    `oklch(0.18 0.025 ${hue})`,
        '--text-accent': `oklch(0.95 0.02 ${hue})`,
        '--link-color':  `oklch(0.72 0.12 ${hue})`,
        '--tag-bg':      `oklch(0.15 0.04 ${hue})`,
        '--tag-text':    `oklch(0.72 0.12 ${hue})`,
        '--tag-border':  `oklch(0.22 0.05 ${hue})`,
        '--progress-color': `oklch(0.72 0.12 ${hue})`,
    };
}
```

### Pattern 2: Runtime CSS Custom Property Injection

**What:** Apply computed theme palette to the document root at runtime, overriding the static defaults in theme.css.

**When to use:** In the root layout's `onMount`, and reactively whenever taste profile or theme preference changes.

**Example:**
```typescript
// src/lib/theme/engine.svelte.ts
import { tasteProfile } from '$lib/taste/profile.svelte';

export const themeState = $state({
    mode: 'taste' as 'taste' | 'manual' | 'default',
    manualHue: 220,
    computedHue: 0,
    palette: {} as Record<string, string>,
});

/**
 * Apply palette to document root.
 * Called reactively when palette changes.
 */
export function applyPalette(palette: Record<string, string>): void {
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(palette)) {
        root.style.setProperty(prop, value);
    }
}

/**
 * Clear runtime overrides — reverts to theme.css defaults.
 */
export function clearPalette(): void {
    const root = document.documentElement;
    const props = ['--bg-base', '--bg-surface', '--bg-elevated', '--bg-hover',
                   '--text-accent', '--link-color', '--tag-bg', '--tag-text',
                   '--tag-border', '--progress-color'];
    props.forEach(prop => root.style.removeProperty(prop));
}
```

### Pattern 3: PaneForge Panel Layout with Templates

**What:** Wrap page content in a PaneForge-managed panel layout. Different templates define different panel arrangements. Layout state persists via PaneForge's built-in autoSaveId.

**When to use:** In the Tauri desktop app layout. Web remains single-column (no panels).

**Example:**
```svelte
<!-- src/lib/components/PanelLayout.svelte -->
<script lang="ts">
    import { PaneGroup, Pane, PaneResizer } from 'paneforge';

    let { template = 'default', children } = $props();
</script>

{#if template === 'cockpit'}
    <PaneGroup direction="horizontal" autoSaveId="mercury-main">
        <Pane defaultSize={25} minSize={15}>
            <!-- Left sidebar: discovery panel, tag browser, queue -->
            <slot name="sidebar" />
        </Pane>
        <PaneResizer />
        <Pane defaultSize={50} minSize={30}>
            <!-- Main content: artist page, search results, etc. -->
            {@render children()}
        </Pane>
        <PaneResizer />
        <Pane defaultSize={25} minSize={15}>
            <!-- Right sidebar: now-playing, recommendations, KB -->
            <slot name="context" />
        </Pane>
    </PaneGroup>
{:else}
    <!-- Default: full-width, current layout -->
    {@render children()}
{/if}
```

### Pattern 4: Streaming Preference via Reordered PLATFORM_PRIORITY

**What:** Make PLATFORM_PRIORITY dynamic based on user preference. User selects preferred platform in settings; embeds and "Listen On" bars reorder accordingly.

**When to use:** In EmbedPlayer.svelte and the "Listen On" section of artist pages.

**Example:**
```typescript
// src/lib/theme/preferences.ts

export type PreferredPlatform = 'bandcamp' | 'spotify' | 'soundcloud' | 'youtube';

/**
 * Reorder PLATFORM_PRIORITY based on user's preferred platform.
 * Preferred goes first; rest maintain original order.
 */
export function getOrderedPlatforms(preferred: PreferredPlatform | null): PreferredPlatform[] {
    const base: PreferredPlatform[] = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];
    if (!preferred) return base;
    return [preferred, ...base.filter(p => p !== preferred)];
}
```

### Pattern 5: Preference Persistence via taste.db ai_settings

**What:** Store all new Phase 8 preferences in the existing `ai_settings` key-value table in taste.db. No new tables, no new database.

**When to use:** For all user preferences: theme mode, manual hue, layout template, preferred streaming platform.

**Example keys:**
```
theme_mode       → 'taste' | 'manual' | 'default'
theme_manual_hue → '220'  (0-360)
layout_template  → 'cockpit' | 'focus' | 'minimal' | 'default'
preferred_platform → 'spotify' | 'bandcamp' | 'soundcloud' | 'youtube' | ''
```

This follows the exact same pattern used for `enabled`, `provider`, `api_key` etc. No new Rust code for CRUD — the existing `get_all_ai_settings` and `set_ai_setting` commands work unchanged.

### Anti-Patterns to Avoid

- **Theme flicker on load:** Never compute theme client-side before first paint. Load saved preferences from taste.db in layout `onMount`, apply immediately. For web, defaults are fine (no user state).
- **Overriding text readability:** Taste-generated palettes must maintain WCAG AA contrast ratios. OKLCH's perceptual uniformity helps, but the lightness values for background vs. text must be validated. Keep text colors (--text-primary, --text-secondary) at fixed lightness values, only tint them slightly.
- **Panel layout on mobile/web:** PaneForge panels are desktop-only. Web and mobile must remain single-column. Gate `PanelLayout` on `isTauri()`.
- **Storing layout in localStorage AND taste.db:** Pick one source of truth. PaneForge's autoSaveId uses localStorage for panel sizes (fine — ephemeral, per-device). Template selection and theme preferences go in taste.db (persistent, tied to user profile). Don't duplicate.
- **Animating theme transitions globally:** CSS transitions on `:root` custom properties affect every element on the page simultaneously — causes frame drops. Use `transition: none` during palette swap, or use `color-scheme` metadata for instant swaps.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable split panes | Custom drag handles + resize math | PaneForge | Accessibility (keyboard resize), min/max constraints, nested groups, persistence — 100+ edge cases |
| Perceptually uniform colors | HSL-based palette math | OKLCH native CSS | HSL has perceptual non-uniformity. OKLCH is a CSS standard with correct perceptual model built in |
| Panel size persistence | Manual localStorage read/write for panel sizes | PaneForge autoSaveId | Built-in, handles edge cases (invalid stored sizes, missing panes) |
| Cross-tab state sync | Manual StorageEvent listeners | N/A — not needed | Mercury desktop is single-window. No cross-tab concern. |

**Key insight:** The "dense cockpit" feeling comes from *information density* and *interactive controls*, not from complex layout frameworks. PaneForge gives us the panel structure; the game-like feel comes from filling those panels with TagChip filters, slider controls, dropdown selectors, toggle switches, and live-updating content — all using standard Svelte 5 components and CSS.

## Common Pitfalls

### Pitfall 1: Theme Color Accessibility Failure
**What goes wrong:** Taste-generated palette produces beautiful colors that fail WCAG contrast — white text on light tinted background, or dark text swallowed by deep tinted background.
**Why it happens:** OKLCH's perceptual uniformity helps but doesn't guarantee accessibility. High chroma at mid-lightness can produce backgrounds that clash with any text color.
**How to avoid:** Pin text lightness values to safe ranges (L >= 0.85 for light text on dark bg; L <= 0.20 for dark bg). Only vary hue and chroma for backgrounds; keep text lightness fixed. Validate contrast programmatically before applying.
**Warning signs:** Users reporting unreadable text. Test with multiple hue values across the spectrum during development.

### Pitfall 2: PaneForge Layout Breaks on Route Navigation
**What goes wrong:** SvelteKit page navigation destroys and recreates the layout, losing panel sizes or causing visual glitches.
**Why it happens:** PaneGroup re-mounts on navigation if placed inside route-specific pages rather than in the root layout.
**How to avoid:** Place PaneGroup in `+layout.svelte`, not in individual pages. Page content goes inside the main Pane via `{@render children()}`. Panel sidebars are layout-level, not page-level.
**Warning signs:** Panel sizes resetting on every navigation. Flash of default sizes before restore.

### Pitfall 3: Preference Desync Between theme.css and Runtime
**What goes wrong:** Some CSS custom properties get overridden by the theme engine, others don't, creating visual inconsistency.
**Why it happens:** Partial palette generation — the engine overrides `--bg-base` but forgets `--border-subtle`, which still references the old color.
**How to avoid:** Define ALL taste-affected properties in a single palette object. Apply ALL or NONE. Never partially override.
**Warning signs:** Some UI elements "feel different" from others despite being on the same page.

### Pitfall 4: Streaming Preference Not Propagating to "Listen On" Bar
**What goes wrong:** User sets Spotify as preferred, but the "Listen On" bar on artist pages still shows Bandcamp first.
**Why it happens:** The artist page's `+page.svelte` reads `streamingLinks` from `data.categorizedLinks.streaming` — this is server data, not client-side sorted. Preference is client-only state.
**How to avoid:** Apply platform reordering in the component render logic (sort `streamingLinks` by preference before display), not in the data layer. Server data stays neutral; client sorts for display.
**Warning signs:** "Listen On" order doesn't change after setting preference.

### Pitfall 5: Overengineering the Layout Template System
**What goes wrong:** Building a fully drag-and-drop customizable layout editor when the phase goal is "layout templates."
**Why it happens:** Confusing "templates the user selects" with "the user builds their own layout."
**How to avoid:** Start with 3-4 predefined templates (default, cockpit, focus, minimal). Template selection is a dropdown in settings. Custom drag-and-drop layout editing is a future phase if users ask for it.
**Warning signs:** Planning documents describe a layout editor with save/load/share. That's Phase 9+ scope.

## Code Examples

Verified patterns from the existing codebase and official sources:

### Svelte 5 Dynamic CSS via style: Directive
```svelte
<!-- Svelte 5 supports style:--prop={value} on elements -->
<div style:--hue={computedHue}>
    <!-- All children inherit the custom property -->
</div>
```
Source: Svelte docs — https://svelte.dev/docs/svelte/custom-properties

### PaneForge Basic Setup
```svelte
<script lang="ts">
    import { PaneGroup, Pane, PaneResizer } from 'paneforge';
</script>

<PaneGroup direction="horizontal" autoSaveId="mercury-layout">
    <Pane defaultSize={25} minSize={15}>
        Left sidebar content
    </Pane>
    <PaneResizer />
    <Pane defaultSize={75}>
        Main content
    </Pane>
</PaneGroup>
```
Source: PaneForge docs — https://paneforge.com/docs

### OKLCH Palette from Seed Hue (Pure CSS)
```css
/* All backgrounds tinted by --accent-hue, set via JS */
:root {
    --accent-hue: 220;
    --bg-base:     oklch(0.05  0.01  var(--accent-hue));
    --bg-surface:  oklch(0.10  0.015 var(--accent-hue));
    --bg-elevated: oklch(0.14  0.02  var(--accent-hue));
    --link-color:  oklch(0.72  0.12  var(--accent-hue));
}
```
Source: OKLCH CSS usage — https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl

### Existing Preference Pattern (taste.db)
```typescript
// Same invoke pattern as loadAiSettings / set_ai_setting
const invoke = await getInvoke();
await invoke('set_ai_setting', { key: 'theme_mode', value: 'taste' });
const settings = await invoke<Record<string, string>>('get_all_ai_settings');
const themeMode = settings['theme_mode'] || 'default';
```
Source: Existing codebase — `src/lib/ai/state.svelte.ts` lines 54-60

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL-based theming | OKLCH-based theming | CSS Color Level 4, ~2023 | Perceptually uniform palettes — same lightness change looks the same across all hues. HSL is visually inconsistent. |
| Svelte stores for state | Svelte 5 $state runes | Svelte 5, Oct 2024 | Module-scoped runes replace stores. Mercury already uses this pattern (playerState, aiState, tasteProfile). |
| Custom resize handles | PaneForge 1.x | PaneForge 1.0, Aug 2025 | Dedicated Svelte 5 component with accessibility, persistence, and nesting support. |
| Theme presets only | Data-driven themes | Trend, 2024-2025 | Apps generating visual identity from user data (Spotify Wrapped, Apple Music replay). Mercury takes this further — permanent, not annual. |

**Deprecated/outdated:**
- `svelte-grid` (original): NOT MAINTAINED per GitHub. Do not use.
- `joshnuss/svelte-persisted-store`: Svelte 4 stores pattern. For Svelte 5, either use `svelte-persisted-state` or custom `$state` + `$effect`.
- HSL color functions for theming: Still works but OKLCH is strictly better for palette generation.

## Open Questions

1. **UX-01 through UX-04 definitions**
   - What we know: Roadmap references them, phase description implies their meaning
   - What's unclear: They aren't in REQUIREMENTS.md — need formal definitions before planning
   - Recommendation: Add UX section to REQUIREMENTS.md during phase planning, defining UX-01 through UX-04 based on phase success criteria

2. **How many layout templates to ship?**
   - What we know: Phase description says "layout templates" (plural). Success criteria says "users can choose and customize."
   - What's unclear: Exact template count and what differentiates them
   - Recommendation: Ship 3-4 templates. "Default" (current single-column), "Cockpit" (3-pane with sidebars), "Focus" (2-pane with context sidebar), "Minimal" (no sidebars, full width with controls overlay). User picks in Settings.

3. **Should web version get any Phase 8 features?**
   - What we know: Taste profile is Tauri-only. Panels are Tauri-only. The web is a "lightweight gateway."
   - What's unclear: Should web get any theming? Default theme only? A simpler control bar?
   - Recommendation: Web stays as-is (default dark theme). Phase 8 is desktop-only. Web gets the OKLCH foundation in theme.css (future-proofing) but no runtime theming.

4. **Panel sidebar content — what goes in them?**
   - What we know: Success criteria says "multiple information sources visible simultaneously." The app has: discovery panel, tag browser, queue, recommendations, KB links, now-playing context, style map.
   - What's unclear: Which features go in which sidebar by default
   - Recommendation: Left sidebar = navigation + tag browser + discovery filters. Right sidebar = now-playing context + recommendations + queue. Main = current page content. This is a design decision for the planner.

5. **Tag-to-color mapping: should genres have canonical colors?**
   - What we know: The current plan hashes tag names to hue. This means "shoegaze" always maps to the same hue for everyone.
   - What's unclear: Should genre families (rock, electronic, jazz) have curated color associations? Or is the hash-based approach sufficient?
   - Recommendation: Start with hash-based (deterministic, zero curation effort). If users want genre-associated colors, add a curated override table later. Don't block launch on curation.

## Sources

### Primary (HIGH confidence)
- Existing Mercury codebase — theme.css, taste profile, ai_settings pattern, EmbedPlayer, layout structure (direct inspection)
- Svelte docs — custom properties, style directive: https://svelte.dev/docs/svelte/custom-properties

### Secondary (MEDIUM confidence)
- PaneForge GitHub + docs — Svelte 5 support confirmed via 1.0.0 release: https://github.com/svecosystem/paneforge
- OKLCH color space — Evil Martians explainer: https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- OKLCH palette generation — SuperGeekery: https://supergeekery.com/blog/create-mathematically-generated-css-color-schemes-with-oklch
- svelte-persisted-state for Svelte 5 runes: https://github.com/oMaN-Rod/svelte-persisted-state
- Dashboard design patterns: https://ui-patterns.com/patterns/dashboard

### Tertiary (LOW confidence)
- svelte-grid-extended Svelte 5 compatibility — not explicitly confirmed, original svelte-grid is unmaintained
- chroma-js oklch support — mentioned in docs but not verified hands-on

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — PaneForge 1.x is the clear choice but hands-on validation of Svelte 5 rune integration needed. OKLCH is CSS-native and well-documented.
- Architecture: HIGH — All patterns follow existing Mercury conventions (taste.db for persistence, isTauri() gating, dynamic imports, module-scoped $state singletons).
- Pitfalls: MEDIUM — Contrast accessibility and layout persistence across navigation are real risks identified from research. Need validation during implementation.
- Requirements gap: HIGH RISK — UX-01 through UX-04 are undefined. Must be resolved before planning.

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days — stable domain, no fast-moving dependencies)
