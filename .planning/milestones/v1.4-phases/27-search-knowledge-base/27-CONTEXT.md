# Phase 27: Search + Knowledge Base - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Search finds artists by city and label in addition to name, shows autocomplete suggestions as the user types, and distinguishes match types in results. KB genre pages get a v1.4 visual redesign with type badge, description panel, key artists list, related genres with colour-coded type dots, and a genre map placeholder.

Creating new data (genre descriptions, relationship data) is out of scope — pages display what's already in the database.

</domain>

<decisions>
## Implementation Decisions

### City/label filter UX
- Natural language parsing: "artists from Berlin" or "artists on Warp Records" gets parsed from the query — Mercury detects city/label intent
- When a query is parsed as a city or label search, show a visual chip confirmation above results (e.g. "City: Berlin" or "Label: Warp Records") so the user knows what Mercury understood
- Label search returns artists on that label — not a label entity card, just the list of artists
- Crate Digging city filter stays separate for now — no connection in this phase

### Autocomplete scope + behavior
- Artist names only — no labels or cities in autocomplete dropdown
- Show 5 suggestions, triggered after 2 characters typed
- Each suggestion shows: artist name + primary genre tag (e.g. "David Bowie — glam rock, art rock") for disambiguation
- Selecting a suggestion navigates directly to the artist page — does not submit a search

### Search result type distinction
- Single ranked list with per-type badges — not separate sections
- Badge types: "Name match", "Tag match", "City match", "Label match" — tells the user exactly why each result appeared
- Tag match rows highlight the matching tag visually (e.g. "Slowdive — [shoegaze] dream pop" with the matched tag emphasised)
- Ranking: name matches first, then tag/city/label matches below

### KB genre page design
- Type badge: subtle coloured pill next to the genre title (e.g. "Post-punk — [Genre]") — informative but not dominant
- Key artists: 6–8 artists, shown as compact rows with name + tags
- Related genres: 6–10 genres, each with a coloured dot matching its type (the colour-coded dot system already exists in the design system)
- Genre map placeholder: styled box with label "Genre Map — Coming Soon" — visible placeholder that communicates intent without building the map

### Claude's Discretion
- Exact NLP/parsing logic for city vs label detection
- Debounce timing for autocomplete
- Colour scheme for badge types (Name/Tag/City/Label)
- Description panel content and layout on KB genre page (not explicitly discussed — open to standard approach)

</decisions>

<specifics>
## Specific Ideas

- The autocomplete should feel like talking to a music search engine — fast, direct, no friction
- City/label chip confirmation is important for trust — user needs to know the query was understood correctly
- The "highlight the matched tag" pattern (like search term highlighting in search engines) is the right mental model for tag match rows

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-search-knowledge-base*
*Context gathered: 2026-02-25*
