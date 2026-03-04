# Phase 37: Context Sidebar + Decade Filtering - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Three additions to the standard Tauri layout (does not affect immersive routes — Rabbit Hole and World Map keep their existing bypass):

1. **Context panel** — the existing right sidebar (`RightSidebar.svelte`) gains a persistent quick-search box and an AI chat section (when AI is connected)
2. **Decade row** — replaces the era pills (60s–20s) in Discover with a proper decade selector spanning 50s–2020s
3. **AI companion** — chat interface in the right sidebar, visible only when `aiState.status === 'ready'`

</domain>

<decisions>
## Implementation Decisions

### Context sidebar — search
- A quick-search input appears in the right sidebar on **all standard pages** (persistent, always visible regardless of page context)
- Searches both artists and tags — same as the main `/search` route
- Clicking an artist result navigates to `/artist/[slug]`; clicking a tag result navigates to the tag search page (existing routes, no inline preview)
- The search box appears **at the top** of the right sidebar

### Context sidebar — stacking order
- Claude decides the exact stacking, but the order should be:
  1. Quick-search input (always shown)
  2. AI companion chat (shown only when `aiState.status === 'ready'`)
  3. Page-specific content (existing: artist tags, queue, now-playing — kept as-is below the new sections)
- Existing page-specific sidebar content is **preserved**, not replaced

### Context sidebar — AI companion
- A chat panel appears below the search box when AI is ready (`aiState.status === 'ready'`)
- Full capability: natural language DB queries ("find me melancholic post-rock from Iceland"), context-aware suggestions (knows current filters + now-playing + library), and general music knowledge chat
- When AI is not connected or loading: the chat section is **not shown** — the sidebar just shows the search box (and page-specific content below)
- No placeholder or "enable AI" hint — hidden by default, revealed when ready

### Decade row
- Replaces the current era pills (60s–20s) in the Discover filter panel
- Range: **50s through 2020s** (50s, 60s, 70s, 80s, 90s, 00s, 10s, 20s — 8 decades)
- **Single-select** — click to activate, click again to deselect (same toggle behavior as the current era pills)
- Placement: Claude's discretion — recommended approach is a more visually distinct horizontal row within the filter panel, replacing the existing era pill section. Could also work as a band between the filter panel and artist grid.
- URL param stays `era` — backend query logic unchanged

### Claude's Discretion
- Exact stacking and visual separation between search / AI / page-specific sections in the sidebar
- Decade row placement (within filter panel vs. band above artist grid)
- AI chat UI details (message bubbles, input box style, scroll behavior)
- How AI accesses current filter state and library for context-aware responses
- Search result rendering in the sidebar (compact artist chips vs. small cards)
- How many search results to show inline (suggest 5–8 max before "see all" link)

</decisions>

<specifics>
## Specific Ideas

- The sidebar search is a "wherever you are" convenience — user doesn't need to navigate to /search; they can just type in the sidebar
- AI companion should feel conversational, not like a command interface — natural language in, artist suggestions out
- "You might also like X given you're filtering for ambient + 90s" is the ideal AI suggestion flow — contextually grounded in what the user is doing
- User floated the idea of renaming "Discover" to "Search" in the nav — noted as a deferred idea, not part of this phase

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `aiState` in `src/lib/ai/state.svelte.ts` — `status: 'idle' | 'loading' | 'downloading' | 'ready' | 'error'`, `enabled: boolean`. Already imported in `+layout.svelte`. AI companion shows only when `aiState.status === 'ready'`.
- `RightSidebar.svelte` — existing right context panel. Has artist tags section, now-playing, queue. The search + AI sections stack above these.
- FTS5 prefix search already powers the main `/search` autocomplete — same mechanism can back the sidebar quick-search
- `ERA_OPTIONS = ['60s', '70s', '80s', '90s', '00s', '10s', '20s']` in `src/routes/discover/+page.svelte` — expand to include '50s', range 50s–20s
- `toggleEra()` and `buildUrl({ era })` in discover page — decade row uses the same URL param pattern

### Established Patterns
- `aiState.status === 'ready'` guard already used in layout header AI dot — same check for showing/hiding AI companion
- Right sidebar already receives `pagePath` prop — can pass additional props (`artistData`, `genreData`) for page-specific sections
- Search already uses SvelteKit `goto()` with URL params — sidebar search can follow the same pattern or use `$navigate` to go to `/search?q=...`
- `backdrop-filter: blur` introduced in Phase 36 (World Map panels) — available as a pattern if the AI chat section needs visual differentiation

### Integration Points
- `src/lib/components/RightSidebar.svelte` — add search input at top, AI chat section below it (conditional on aiState.status)
- `src/routes/discover/+page.svelte` — update ERA_OPTIONS to include '50s', adjust era pill section UI
- `src/routes/+layout.svelte` — no structural changes needed; RightSidebar already receives pagePath
- AI module: `src/lib/ai/engine.ts` or `src/lib/ai/index.ts` — AI companion needs a `chat(message, context)` function; check what's already exposed

</code_context>

<deferred>
## Deferred Ideas

- Renaming "Discover" to "Search" in the nav — user mentioned this as a side thought during discussion. Worth considering but out of scope for Phase 37.

</deferred>

---

*Phase: 37-context-sidebar-decade-filtering*
*Context gathered: 2026-03-04*
