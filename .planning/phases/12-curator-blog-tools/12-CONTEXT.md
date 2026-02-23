# Phase 12: Curator / Blog Tools - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Give music bloggers embeddable tools (artist cards, collections), RSS feeds for any page/tag/collection/curator, attribution credit for curators who feature artists first, and a public "New & Rising" discovery page. The goal is giving bloggers a reason to write about music again. User authentication, social following, and post creation are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Embed Widget Types
- Ship artist card embeds + collection embeds (not search results or curated list embeds in this phase)
- Artist card shows: name, image, tags, short bio snippet, listen link

### Embed Mechanism
- Offer both embed options with a toggle in the UI: `<iframe>` snippet and script-tag + div
- Auto detect `prefers-color-scheme` and adapt to light/dark automatically (no manual theme param needed)

### RSS Feeds
- Feed types: artist page, user collection, tag, and curator
- Both RSS 2.0 and Atom formats supported (served based on Accept header or `?format=atom`)
- Rich feed entries: artist image, bio, tags, player link (not just title + link)
- Visible RSS button/icon on every applicable page (artist, tag, collection, curator)
- Event triggers left to Claude's discretion — design for what makes a feed worth subscribing to

### Curator Attribution
- Attribution shows in both places: on the Mercury artist page AND inside the embed widget
- Clicking "discovered via [Curator]" goes to the curator's collection on Mercury
- Credit is triggered by first-to-feature: whichever happens first — adding to a public collection or embedding on an external site
- All curators who have featured the artist get credited (shown as a list, not just the first)

### Curator First Access (New & Rising Page)
- Public page — not gated, available to everyone
- Two views: newly added artists + artists gaining traction (tag saves / collection adds)
- 30-day window defines "emerging"
- Whether to add a New & Rising RSS feed is left to Claude's discretion

### Claude's Discretion
- RSS event trigger design (what events constitute a feed entry worth publishing)
- Whether New & Rising page gets its own RSS feed
- Exact layout/density of New & Rising page
- QR code generation implementation (static vs dynamic)
- Collection embed layout and pagination/scroll behavior

</decisions>

<specifics>
## Specific Ideas

- Embeds should feel like Spotify's iframe embeds — consistent branded look that just handles dark/light automatically
- Attribution as a list (not just first-mover) encourages a culture where multiple curators champion the same artist

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-curator-blog-tools*
*Context gathered: 2026-02-23*
