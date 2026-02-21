# Phase 8: Underground Aesthetic - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform Mercury's desktop UI from a search engine into a cockpit. Dense panel-based layout, taste-based color theming, layout templates, and interactive controls everywhere. Desktop-only (Tauri) — web stays as-is. This ships before community features because the vibe has to be right first.

</domain>

<decisions>
## Implementation Decisions

### Panel layout and density
- **3-pane default:** Left sidebar + main content + right context panel
- **Left sidebar:** Navigation + tag browser — quick links to /discover, /explore, /kb, /style-map, plus a tag filter panel for current context
- **Right sidebar:** Context-aware content that changes based on current page — artist page shows related artists, genre page shows scene info, search shows filters
- **Collapsible with toggle:** Each sidebar can collapse to a thin strip. Click or keyboard shortcut to expand. Panels remember their collapsed/expanded state.

### Theming intensity and feel
- **Full palette shift:** Backgrounds, borders, accents, tags, links ALL shift to the taste hue. The whole app feels colored by your music. Not subtle tinting — the full experience changes.
- **Default for new users:** Current dark theme exactly as it is today. Taste theming activates once they have enough profile data.
- **Manual override:** Hue slider (0-360) in settings. Manual override replaces taste-generated color.
- **Smooth fade transitions:** Colors transition over ~0.5s when the palette changes. Feels alive.

### Control feel and placement
- **Reference:** Foobar2000 / Winamp — compact, utilitarian, panels and toolbars. Power user feel, not DAW complexity.
- **Discovery filters as controls:** Tag intersection, decade slider, country dropdown, niche-score range — always accessible in sidebar, not buried in /discover page only
- **Expanded playback controls:** Equalizer, crossfade slider, queue management, shuffle modes — the player becomes a real instrument
- **Both toolbar AND panel controls:** Persistent top control bar for global controls (search, layout toggle, theme). Each panel has its own contextual controls.
- **Reactivity:** Controls filter their own panel only. Main page content stays independent until user navigates. Sidebar discovery filters affect sidebar suggestions, not the main content.

### Layout templates
- **3 templates:** Cockpit (3-pane full), Focus (main + one sidebar), Minimal (single column, current look)
- **Default for new Tauri users:** Cockpit (3-pane) — this is what Mercury IS now. New users get the full experience immediately.
- **Switching:** Both toolbar quick-switch (layout icon, click to cycle or dropdown) AND full options in Settings page
- **Per-template persistence:** Each template saves its own panel sizes. Switching back restores exactly how you left it.

### Claude's Discretion
- Exact keyboard shortcuts for panel collapse/expand
- Loading skeleton and transition implementation details
- Error state handling for theme engine
- Exact toolbar layout and icon choices
- How context-aware right sidebar determines what to show per page type

</decisions>

<specifics>
## Specific Ideas

- Foobar2000 / Winamp is the energy reference — compact, utilitarian, power user. Not a DAW, not a video game HUD. Classic music software density.
- "Two different people see two different Mercurys" — the full palette shift is the signature feature. Not a subtle tint. The whole app changes color based on your taste.
- Cockpit is the default because this phase IS the cockpit. Don't hide the new thing behind the old layout.
- Controls should feel like they're always within reach — discovery filters aren't a page you navigate to, they're part of the workspace.

</specifics>

<deferred>
## Deferred Ideas

- **Equalizer control** — player control expansion, deferred to a future "Player Power-User" phase
- **Crossfade slider** — player control expansion, deferred to a future "Player Power-User" phase
- **Shuffle modes** — player control expansion, deferred to a future "Player Power-User" phase

Queue management (visible in right sidebar) remains IN SCOPE for this phase.

</deferred>

---

*Phase: 08-underground-aesthetic*
*Context gathered: 2026-02-21*
