# Phase 7: Knowledge Base - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A living encyclopedia of music — genres, scenes, movements, cities, eras. The genre/scene graph is the core navigation layer. Content builds in 4 layers over time: open data (MusicBrainz/Wikidata), links & embeds (video docs, articles, iconic releases), AI summaries, and community-written wiki content. Also includes Scene Maps (geographic visualization), Time Machine (year-based navigation), and Liner Notes (rich credits on release pages). Community editing mechanics (who can edit, moderation, versioning) are a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Genre map format
- Hybrid model: graph as the overview/navigation layer, clicking a node opens a rich genre page
- Three node types: genres (global), scenes (geographic/temporal), cities — visually distinguished
- Graph is search-first: starts small, expands outward from a search or browse starting point. Never a hairball.
- Starting state: graph pre-loaded around the user's listening profile — their genres centered, related ones nearby
- Graph always stays visible (side panel or mini-map) while reading a genre page — user stays oriented

### Genre / scene pages
- Full editorial: description, origins, era, key artists (linked to Mercury profiles), iconic releases with embedded players, related scenes, timeline of key moments
- Scene pages include an actual geographic map pinning the city/region, with era/timeline alongside

### Content layers
- Seamlessly blended on the page — one unified view, no hard tabs between layers
- Source attribution shown inline (small badge or tooltip) but not architecturally divided
- Sparse pages (Layer 1 only): show what exists, then a clear "This genre has no description yet — know this scene? Write it." call to action
- External content (Layer 2) includes all types: YouTube documentaries/mini-docs, Wikipedia summaries + article links, iconic releases with embedded players
- AI summaries (Layer 3): short and punchy — 2-3 sentences that capture the vibe of the scene. People skim.

### Time Machine
- Standalone section of the app — its own view, not embedded per-genre
- Shows all three views together: animated genre graph evolution, year snapshot page ("1991 — What was happening"), and filtered artist/release list by year + genre
- Scrub control: decade buttons (60s › 70s › 80s etc.) with fine scrub within the selected decade
- Opening state: Claude's discretion

### Navigation & entry points
- Knowledge Base gets a dedicated top-level nav item AND every genre tag everywhere in the app is a contextual link — multiple ways in
- Artist pages: genre tags are KB links + an "Explore this scene →" panel below tags for the artist's primary genre/scene
- KB landing page: the genre graph, pre-centered on user's taste
- Liner Notes: expandable section below the release, collapsed by default — expands to show full credits, relationships, and production details

### Claude's Discretion
- Time Machine opening state — start at present and rewind, start at user's taste cluster, or a year picker; whatever feels right for the UX
- Exact graph rendering library and physics/layout algorithm
- Visual design language distinguishing genre vs scene vs city nodes
- Animation behavior when graph evolves in Time Machine

</decisions>

<specifics>
## Specific Ideas

- "Berlin Techno '95, Buenos Aires now" — scene nodes have both geographic and temporal identity
- On sparse genre pages, the contribution CTA should feel like an invitation, not a bug report
- AI summaries should read like a knowledgeable friend describing a scene, not a Wikipedia stub
- The genre graph centered on user taste means someone with a jazz history starts in a completely different graph than someone deep in electronic music — this is the point

</specifics>

<deferred>
## Deferred Ideas

- Community editing mechanics (who can edit, edit history, revert, moderation) — community features are Phase 9+
- Genre page "mini-timeline" embedded on genre pages (for individual genre evolution) — could add in a future iteration; standalone Time Machine ships first

</deferred>

---

*Phase: 07-knowledge-base*
*Context gathered: 2026-02-21*
