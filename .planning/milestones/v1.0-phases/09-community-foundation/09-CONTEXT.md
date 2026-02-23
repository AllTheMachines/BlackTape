# Phase 9: Community Foundation - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the identity and social foundation: pseudonymous handles, generative pixel art avatars, multiple named collections (shelves) for saving artists/releases, a Taste Fingerprint (constellation pattern exported as image), and import/export of user data. No central server — all local-first.

Taste **matching** (finding other users) is explicitly deferred to Phase 10. Template sharing (export/import layout templates) is deferred to a future phase. Phase 9 builds identity, curation, and personal taste representation only.

</domain>

<decisions>
## Implementation Decisions

### Identity — Handle + Avatar
- Handle is **free choice** — user types whatever they want. No uniqueness enforcement (local-first, no central authority to conflict against).
- Avatar system has **three layers**: generative default (pixel art generated from taste data), in-app pixel art editor (user can modify), and preset selection for quick pick.
- Identity is **optional but prompted** — the app works without it. Community features (when used) prompt creation. No nag screen on launch.
- Identity lives on a **dedicated `/profile` page** — handle, avatar, taste summary, collection. The place to see yourself the way others might.

### Collections (Shelves)
- **Multiple named collections** — users create named shelves (e.g. "Favorites", "Rainy Day", "2024 Discoveries"). Not just one master collection.
- Collections contain **artists AND releases** (not tracks — collections are shelves, not playlists).
- Adding to collection: **save button on artist/release pages** — clicking shows your shelves, lets you pick one or create a new shelf inline.
- Collection view display: **Claude's discretion** — pick whatever is most consistent with existing Mercury card/grid patterns.

### Taste Fingerprint
- Visual style: **geometric constellation pattern** — points and connections between taste tags and artists, like a star map of your music brain. Unique arrangement per user.
- Data driving the pattern: **both taste profile + collection** — listening behavior (tag weights, play history) AND curation choices (saved artists/releases). Most personal result.
- **Updates automatically** — always reflects current taste. Not a locked snapshot.
- **Exportable as image** — user can save and share their fingerprint (PNG/SVG export). Makes taste into a shareable artifact.

### Taste Matching
- Phase 9 defers actual taste matching (connecting with other users) to Phase 10. No networking infrastructure in this phase.
- The foundation built here (identity, taste profile, collections) feeds matching when Phase 10 arrives.

### Import / Export
- **Import sources (all four):** Spotify, Last.fm, Apple Music, CSV. Importing populates taste profile and/or collections from existing listening history.
- **Export format:** JSON full data dump — everything in one file: identity, collections, taste profile, listening history. Re-importable into Mercury.

### No Vanity Metrics
- No follower counts, no like counts, no play counts anywhere in Phase 9 UI. This is a hard constraint from the roadmap.

### Claude's Discretion
- Collection view display style (grid vs list — match existing Mercury UI patterns)
- Exact pixel art editor toolset and grid size (16×16 or 32×32)
- The algorithm that generates the constellation fingerprint from taste data
- Specific API integration mechanics for Spotify/Last.fm/Apple Music import

</decisions>

<specifics>
## Specific Ideas

- "Collections are shelves, not playlists" — artists and releases, not individual tracks. If playlists with tracks come later, they're a separate concept.
- The generative avatar should be driven by the same taste data as the fingerprint — same source, different visual expression.
- The Taste Fingerprint is the centrepiece of the `/profile` page and is also shareable. Think of it as a social object — something you'd send to a friend.

</specifics>

<deferred>
## Deferred Ideas

- **Template sharing** (export/import + community browse of layout templates) — deferred to a future phase. Phase 8 built user templates; sharing them can wait.
- **Taste matching / radius feature** (local → regional → global user discovery) — deferred to Phase 10 alongside communication infrastructure.
- **Track-level playlists** — if collections are shelves for artists/releases, playlists for individual tracks are a separate feature for a future phase.

</deferred>

---

*Phase: 09-community-foundation*
*Context gathered: 2026-02-21*
