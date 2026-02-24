# Phase 17: Artist Stats Dashboard - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Show how discoverable any artist is within Mercury's index — a stats tab on the artist page displaying uniqueness score, rarest tag, and tag distribution. Personal visit tracking is implemented silently in SQLite but never surfaced in the UI. No social or engagement metrics are shown to the user.

</domain>

<decisions>
## Implementation Decisions

### Stats page entry point
- Stats live as a **secondary tab on the artist page** (alongside existing tabs like Overview/Releases)
- Tab is subtle — low visual weight, not competing with the main artist view
- Tab navigation handles back/forward naturally (clicking another tab returns to profile)
- Stats are only accessible from inside the artist page — not from search results or artist grid cards

### Tag distribution display
- **Horizontal bar chart** — tags listed with proportional bars showing relative weight
- Show **all tags** (no cap, no "show more" — scroll if many)
- Each tag entry: **tag name + relative bar only** (no raw counts, no percentages)
- Tags are **clickable — clicking a tag runs a tag search** (natural Mercury discovery behavior)

### Uniqueness score presentation
- Displayed as **score + tier label** (e.g., "94 — Ultra Rare")
- Tier vocabulary: **Common / Niche / Rare / Ultra Rare**
- **Hero position** — top of the stats page, large and prominent (the headline stat)
- **No explanation** of how the score is calculated — the label says enough
- Rarest tag shown near the uniqueness score (per success criteria)

### Visit counter (silent tracking only)
- Visit count **increments each time the artist page is opened** (each navigation event)
- Stored in **local SQLite only** — never shown in any UI
- No likes, follows, or engagement metrics are visible anywhere in the app
- The count is reserved for potential future use (e.g., local recommendations) but has no current display

### Claude's Discretion
- Exact visual styling of the stats tab (label text, icon if any)
- Loading/skeleton state for stats page
- Exact layout spacing between uniqueness score hero and tag distribution section
- Color scheme for bar chart bars
- How "rarest tag" is displayed alongside the uniqueness score

</decisions>

<specifics>
## Specific Ideas

- Mercury is explicitly NOT a platform — no social metrics, no engagement scores, no "likes" or "follows" visible anywhere. This principle extends to the stats page: it's about discoverability, not engagement.
- The uniqueness score is the hero. Everything else on the page provides context for it.
- Clicking a tag in the distribution should feel like a natural Mercury gesture — the same as clicking any tag anywhere else in the app.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-artist-stats-dashboard*
*Context gathered: 2026-02-24*
