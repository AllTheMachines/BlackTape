# Phase 2: Search + Artist Pages + Embeds - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The core web experience: a user visits Mercury, searches for music by artist name or tag, lands on an artist page, and presses play via embedded players. Deployed to Cloudflare Pages, mobile responsive. Discovery mechanics (tag intersection, uniqueness scoring) are Phase 4. Social features are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Search experience
- Two-tier search: instant results for indexed data (FTS5), submit-and-wait for anything hitting external sources
- Separate search modes for artist names vs tags (not unified — distinct entry points or toggle/prefix)
- Rich result cards: artist name, country, top tags, and match reason (why this result matched)
- Results displayed as a card grid, not a vertical list

### Artist page design
- Balanced layout: info and embeds share equal weight — neither dominates
- Content shown: tags, country, external links (platform icons/buttons), and bio snippet (from MusicBrainz/Wikipedia when available)
- Tags displayed as clickable chips — clicking a tag triggers a tag search
- Clean slug URLs: `/artist/radiohead` — human-readable and shareable

### Embed behavior
- All four platforms supported in Phase 2: Bandcamp, YouTube, Spotify, SoundCloud
- Priority order: Bandcamp first when available (aligns with independent music values), then others
- Data source: MusicBrainz URLs as primary source + live API lookup for missing links
- No-embed fallback: show external links only ("Listen on Bandcamp", etc.) — no empty state, no search links

### Overall feel + landing
- Dark + minimal aesthetic — dark background, clean typography, functional feel
- Reference: All The Machines (all-the-machines.com) — dark, utilitarian, information-first, a tool not a magazine
- Information-dense layout — pack in data, less scrolling, more results visible
- Landing page: search-first — big search bar front and center, Google-style. The whole point is to start searching.

### Claude's Discretion
- Loading skeletons and transition animations
- Exact spacing, typography choices, and color palette within dark theme
- Error state handling and edge cases
- Search debounce timing and UX micro-interactions
- Tag search mode UI (toggle, prefix, tabs — whatever works best)
- Bio snippet length and formatting
- Embed player sizing and responsive behavior

</decisions>

<specifics>
## Specific Ideas

- "All The Machines" (all-the-machines.com/testing/) as visual reference — dark background, card grid, functional aesthetic, no fluff
- Two-tier search reflects the data architecture: local SQLite is instant, external lookups require explicit action
- Bandcamp-first embed priority is a values statement, not just a default

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-search-and-embeds*
*Context gathered: 2026-02-15*
