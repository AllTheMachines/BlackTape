# Phase 23: Design System Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply a consistent visual language across all app surfaces — square controls (2px radius), layered dark grey backgrounds, 1px panel borders, amber accent. This phase establishes the design token foundation and applies it to main chrome surfaces and all global components. Individual page routes not explicitly in scope are updated in later phases.

</domain>

<decisions>
## Implementation Decisions

### Color palette
- Use exactly the CSS custom property system from `mockups/styles.css` as the spec — do not invent new values
- Variables: `--bg-0` (#080808) through `--bg-6` (#323232), borders `--b-0` through `--b-3` + `--b-acc`, text `--t-1/t-2/t-3`, accent `--acc` (#c4a55a) with `--acc-bg` and `--acc-bg-h`
- Define all tokens in `app.css` in a `:root` block (not a new file)
- Full migration: replace all Tailwind color classes (bg-zinc-900, border-zinc-700, etc.) with CSS var references — not a partial migration
- Design tokens are the base/structural layer; the OKLCH taste-theme engine continues to run alongside and is not removed

### Interactive element style
- Default button: `background: var(--bg-4)`, `border: 1px solid var(--b-2)`, `color: var(--t-1)`. Hover: `var(--bg-5)`
- Primary/accent button: `background: var(--acc)`, dark text, used for the most important action per surface (e.g., "Play Album", submit)
- Sidebar nav items: button-style with filled background (not bare text links). Active state adds amber left border (2px, `var(--acc)`) + `var(--acc-bg)` background tint
- Inputs: `background: var(--bg-4)`, `border: 1px solid var(--b-2)` — same depth level as buttons

### Rollout scope
- Apply design tokens to main chrome: topbar, sidebar, player bar, and main content wrapper
- Global components updated across all routes regardless of whether the page itself is in scope: tag chip component, button/input elements, all chip/badge elements
- All chip and badge style elements (not just tag chips): square off to 2px radius, consistent sizing
- Full custom Tauri titlebar using design system colors — replace native window chrome with a custom titlebar component (`decorations: false` in tauri.conf.json)

### CSS architecture
- All design tokens defined in `app.css` `:root` block — single source of truth
- Components use scoped `<style>` blocks with CSS custom properties (e.g., `background: var(--bg-2)`) — not Tailwind class names
- OKLCH theme engine variables keep their existing naming scheme and are left untouched — the two systems coexist on `:root`

### Claude's Discretion
- Typography migration (Inter, 13px, antialiased) — assess what's already in place and apply only where it differs significantly from mockup spec
- Whether to create a shared `Button.svelte` component or style per-component — assess button usage spread and pick the most practical pattern
- How to handle Tauri custom titlebar drag regions and window control buttons within the design system

</decisions>

<specifics>
## Specific Ideas

- "I liked the ones that were in your mockups" — the mockups at `mockups/styles.css` and `mockups/*.html` are the visual contract for this phase
- The mockup established: depth from color layers (not shadows), amber used sparingly and reservedly, every button has a visible background, immediate visual hierarchy without hover state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 23-design-system-foundation*
*Context gathered: 2026-02-25*
