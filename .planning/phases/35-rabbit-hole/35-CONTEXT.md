# Phase 35: Rabbit Hole - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

New `/rabbit-hole` route — a unified, immersive click-through discovery experience replacing the four disconnected graph-based views (Style Map, Knowledge Base, Time Machine, Crate Dig). Includes artist exploration cards, genre/tag exploration pages, similar-artists navigation (from Phase 34 pipeline), paginated tracks (from Phase 34 cache), and a persistent history trail.

World Map (Phase 36), Context Sidebar, and AI Companion (Phase 37) are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Nav restructuring
- Style Map, Knowledge Base, Time Machine, and Dig are **removed from nav** — routes stay (links still work by URL) but nav links are gone
- Discover stays but its **discovery modes sidebar is removed** — no more left-panel mode switcher (Style Map/KB/Time Machine/Crate Dig were those modes)
- Nav order: Discover → **Rabbit Hole** → Library → Explore → Profile → Settings → About
- Nav label: "Rabbit Hole"

### Layout + chrome
- Full-page immersive layout — no left/right sidebars while inside the Rabbit Hole
- App titlebar remains visible (consistent with existing Tauri titlebar behavior)
- **Minimal exit button only** — no full app nav shown while exploring; single back/exit button to leave the Rabbit Hole
- Navigation within: **in-place content swap** — URL updates (e.g. `/rabbit-hole/artist/slug`, `/rabbit-hole/tag/ambient`) but content swaps without full page navigation

### Landing state
- Landing shows: **search input** (artists + genres/tags) + **Random** button
- Search finds both artists and genre/tag terms — picking an artist opens their card, picking a genre/tag opens the genre page
- Random button lands on a random artist card immediately

### Artist exploration card
- Shows: artist name (clickable → exits to `/artist/[slug]`), country/origin, tags, similar artists row, play button, Continue button
- **Similar artists:** horizontal row of up to 10 name chips — click to swap to that artist in-place
- **Tracks:** top 3 tracks shown by default; expand control reveals more (uses Phase 34 release cache)
- **Play button:** uses existing `streamingPref` logic — launches best available source (Spotify/YouTube/SoundCloud/Bandcamp) inline in the player bar
- **Continue button:** picks a random similar artist and jumps to them; if no similar artists exist, falls back to a random artist sharing the primary tag

### Genre/tag exploration pages
- Opens in-place (same swap pattern as artist navigation)
- Shows: tag name, KB description if one exists, ~20 artists as name chips (random sample, re-landing gives a fresh 20), row of related/similar tags
- No pagination — random 20 each time is intentional (rewards revisiting)
- Artist chips on genre pages follow the same click-to-swap pattern

### History trail
- Horizontal scrollable breadcrumb row at the **top** of the Rabbit Hole view
- Shows every artist card and genre page visited this session
- Trail items are **clickable — jump back to any prior stop**; items after the clicked one remain in the trail (branching history, not linear truncation)
- **Persisted to localStorage** — survives app restart, resumes last session
- Cap: **20 items** — oldest drop off the left as new ones are added

### Claude's Discretion
- Visual design of the artist card (spacing, typography, exact chip sizing)
- Exact transition/animation when content swaps in-place
- How "Related tags" are sourced (tag_cooccurrence table vs. artist overlap)
- How "top 3 tracks" are ordered (most recent release, highest MB track count, or cached order)
- Exact behavior when trail cap is hit (fade/shift animation as oldest drops off)
- Search autocomplete UX details (debounce timing, result grouping — artists vs. tags)

</decisions>

<specifics>
## Specific Ideas

- The research doc (`docs/discovery-redesign-research.md`) captures the full design conversation and inspiration (Every Noise at Once, Radio Garden, Radiooooo, Outer Wilds, flow state mechanics). The vibe: a **place to get lost**, not a tool to query.
- "Uniqueness is rewarded" applies here too — niche artists with strong tag overlap should surface in Similar Artists and genre pages
- The Rabbit Hole should feel like entering a different mode of the app — the full-page minimal chrome signals intentional immersion

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getSimilarArtists(db, artistId, limit)` in `src/lib/db/queries.ts` — ready, returns `SimilarArtistResult[]` (id, mbid, name, slug, score), gracefully returns `[]` before pipeline
- `TagChip.svelte` — existing chip with `tag` + optional `count`, links to `/search?q=tag&mode=tag` today; can be adapted for in-Rabbit-Hole tag navigation
- `streamingState`, `setActiveSource`, `streamingPref` in `src/lib/player/streaming.svelte` + `preferences.svelte` — existing infrastructure for play button logic
- `ArtistCard.svelte` — reference for artist card visual patterns (don't reuse directly — Rabbit Hole card is lighter)
- FTS5 prefix search already powers autocomplete in Search — can power Rabbit Hole landing search

### Established Patterns
- In-place navigation: SvelteKit `goto()` with `{ keepFocus: true, noScroll: true }` pattern (used in Discover) — same pattern for Rabbit Hole content swaps
- `{#key activeService}` pattern for unmounting competing embeds — relevant if play button activates an embed
- localStorage already used for queue persistence (Queue.svelte), streaming prefs — trail persistence follows same pattern
- Tag co-occurrence table (`tag_cooccurrence`) exists with `shared_artists` counts — can source "related tags" on genre pages

### Integration Points
- `src/routes/+layout.svelte` lines 182–191 (desktop nav) and 211–216 (mobile nav) — remove Style Map, KB, Time Machine, Dig; add Rabbit Hole after Discover; strip modes sidebar from Discover
- `src/routes/discover/+page.svelte` — remove discovery modes sidebar (left panel with mode list)
- New routes needed: `src/routes/rabbit-hole/+page.svelte` (landing), `src/routes/rabbit-hole/artist/[slug]/+page.svelte` (or handled as in-place state), `src/routes/rabbit-hole/tag/[slug]/+page.svelte`
- `src/lib/db/queries.ts` — may need a "random artists by tag" query for genre pages + Continue fallback

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 35-rabbit-hole*
*Context gathered: 2026-03-04*
