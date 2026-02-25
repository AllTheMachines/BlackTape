# Phase 26: Discover + Cross-Linking + Crate Fix - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Three discrete improvements: (1) a proper Discover page with a left filter panel and artist card grid, (2) contextual cross-links between the seven discovery tools (Discover, Crate Dig, Explore, Time Machine, Style Map, Scenes, KB), and (3) a Crate Dig country field fix from raw ISO code input to a named-country dropdown. Scope is limited to linking and layout — new discovery capabilities belong in future phases.

</domain>

<decisions>
## Implementation Decisions

### Discover filter panel
- Filters available: genre/tag + country + era (three facets, consistent with other discovery tools)
- Panel is always visible on the left — no collapse toggle
- Filtering is instant — no Apply button, grid updates on every selection change
- Empty results state: friendly message + "clear filters" button; no fuzzy/relaxed fallback

### Artist card design
- Uniqueness score: thin horizontal progress bar with label (e.g., "Uniqueness: ████░░ 68%") at the bottom of each card
- Grid density: medium cards, 3–4 per row
- Card interaction: click anywhere on the card navigates to the artist page; no hover actions or quick-add buttons
- Tags: top 2–3 tags displayed as chips, overflow hidden — full tag list lives on the artist page

### Cross-link placement
- Artist page → Style Map: a small "Explore [tag] in Style Map →" link placed near/under the tags section
- Crate Dig results: "Explore in Style Map" and "Open scene room" links appear per-result row (not page-level)
- Time Machine results: per-result row links to artist page and KB era entry
- Visual prominence: muted/secondary text style — visible but not competing with primary content

### Filter URL state
- Filter state is encoded in URL query params: `/discover?tag=shoegaze`, `/style-map?tag=shoegaze`
- URL updates live on every filter change (not just on initial cross-link navigation)
- Style Map accepts a `?tag=` param and pre-applies the filter on load
- Active filter chips in the toolbar are the only indicator — no "came from" breadcrumb needed

### Claude's Discretion
- Exact chip/tag color and visual styling (match existing design system)
- Progress bar color for uniqueness score
- Country dropdown implementation detail (search-as-you-type vs scrollable list)
- Exact wording of empty-state messages

</decisions>

<specifics>
## Specific Ideas

- Uniqueness score bar explicitly called out in success criteria as a bar, not a badge or number — keep it a visual bar
- Cross-links should feel like natural contextual affordances, not marketing CTAs — secondary prominence is deliberate
- The `/discover?tag=X` and `/style-map?tag=X` URL pattern should be consistent across all cross-links

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-discover-cross-linking-crate-fix*
*Context gathered: 2026-02-25*
