# Phase 24: Artist Page - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the artist page a fully featured, relationship-rich view — pull in band members, influences, and labels from MusicBrainz, add linked credits on the release page, make the discography filterable and sortable, and give the Mastodon share button a readable label. Redesign all of this within the v1.4 design system.

</domain>

<decisions>
## Implementation Decisions

### Page structure
- Add a third tab: "About" alongside "Overview" and "Stats"
- About tab contains only MusicBrainz relationships (no bio, no AI recommendations)
- About tab is hidden entirely when no relationship data exists for the artist
- About tab has three separate sections with h3 headings: "Members", "Influenced by" / "Influenced", "Labels" — each section only appears if it has data

### Relationships display
- Each relationship item displays as a linked text chip (same chip component family as tags, but navigating to artist pages)
- Long lists are capped at 20 visible items with a "Show all N" expand button
- Influences section shows both directions as subsections: "Influenced by" (who shaped this artist) and "Influenced" (who this artist shaped)
- Labels display as plain text only — no links, no external URLs. No dedicated label pages exist yet.

### Release credits
- Credits live on the release page in a dedicated "Credits" section below the tracklist
- Section is collapsed by default; user clicks to expand
- Credit types to include: producer, engineer, mixer, featured artists
- If a credited person is not in Mercury's local artist DB: show their name as plain text with no link (graceful degradation, no broken links)

### Discography controls
- Type filter: pill buttons in a row above the grid — "All", "Albums", "EPs", "Singles" — active pill highlighted amber
- Sort control: on the right side of the same row as filter pills — a "Newest" / "Oldest" toggle or dropdown
- Default sort: newest first
- Zero-result filter: show empty state message ("No EPs for this artist") — don't disable or hide the pills

### Claude's Discretion
- Loading / skeleton state while MusicBrainz relationship data fetches
- Exact pill button styling details (size, spacing, border behavior)
- Credits section expand/collapse animation
- Release type classification logic (how Albums vs EPs vs Singles are determined from MusicBrainz release group types)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-artist-page*
*Context gathered: 2026-02-25*
