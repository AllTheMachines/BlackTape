# Requirements: Mercury v1.4 — The Interface

**Defined:** 2026-02-24
**Core Value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.

## v1.4 Requirements

### Design System

- [x] **DSYS-01**: App uses a consistent visual design system — square controls (2px radius), layered dark grey backgrounds, 1px panel borders, amber accent
- [x] **DSYS-02**: Every interactive element has a visible background and border (no bare text links acting as buttons)
- [x] **DSYS-03**: Topbar, sidebar, and player bar are visually distinct panels separated by 1px borders
- [x] **DSYS-04**: Navigation sidebar uses left-border indicator for active item (amber), nav groups with section labels
- [x] **DSYS-05**: All tag chips are square (2px radius), use consistent sizing (22px height), amber on active state

### Artist Page

- [x] **ARTP-01**: Artist page is fully redesigned to match the v1.4 design system (header, sections, tabs, player integration)
- [x] **ARTP-02**: Artist page displays band members sourced from MusicBrainz relationships
- [x] **ARTP-03**: Artist page displays influenced-by and influenced artists from MusicBrainz relationships
- [x] **ARTP-04**: Artist page displays associated labels from MusicBrainz relationships
- [x] **ARTP-05**: Release credits (producers, engineers, featured artists) are displayed and linked to their own artist pages
- [x] **ARTP-06**: Discography has a type filter — All / Albums / EPs / Singles
- [x] **ARTP-07**: Discography can be sorted by date (newest / oldest)
- [x] **ARTP-08**: Mastodon share button has a visible text label (not just "↑")

### Queue & Playback

- [x] **QUEU-01**: Every track row in the app has ▶ Play and + Queue action buttons (visible on hover)
- [x] **QUEU-02**: Artist page has a "Play All" and "+ Queue All" button for the artist's top tracks
- [x] **QUEU-03**: Release pages have a "▶ Play Album" and "+ Queue Album" button
- [x] **QUEU-04**: Library tracklist has ▶ Play and + Queue on every track row
- [x] **QUEU-05**: Player bar shows current queue (accessible via queue icon)
- [x] **QUEU-06**: Queue can be reordered and items removed

### Library

- [x] **LIBR-01**: Library uses a two-pane layout — album list (left) + tracklist (right) — matching the v1.4 mockup
- [x] **LIBR-02**: Selected album is highlighted with the amber left-border indicator
- [x] **LIBR-03**: Tracklist column headers: #, Title, Time, Actions

### Discover

- [x] **DISC-01**: Discover page uses the filter panel + results grid layout from the v1.4 mockup
- [x] **DISC-02**: Active filters are shown as dismissable chips in the results toolbar
- [x] **DISC-03**: Artist cards show name, country, top tags, and uniqueness score bar

### Discovery Cross-Linking

- [x] **XLINK-01**: Artist page links to Style Map filtered to artist's primary tag
- [x] **XLINK-02**: Knowledge Base genre pages link to Discover filtered by that genre
- [x] **XLINK-03**: Scene pages link to the Knowledge Base for the scene's primary genre
- [x] **XLINK-04**: Crate Dig results surface "Explore similar in Style Map" and "Open scene room" where relevant
- [x] **XLINK-05**: Time Machine results link to artist pages and Knowledge Base entries for the era

### Search

- [x] **SRCH-01**: Search input shows autocomplete suggestions as the user types (artist names)
- [x] **SRCH-02**: Search can filter by city/location (e.g. "artists from Berlin")
- [x] **SRCH-03**: Search can filter by label name (e.g. "artists on Warp Records")
- [x] **SRCH-04**: Search results distinguish between artist matches and tag matches

### Knowledge Base

- [x] **KBAS-01**: Knowledge Base genre pages are redesigned to match the v1.4 mockup (type badge, description panel, key artists, related genres with colour-coded type dots, genre map placeholder)

### Crate Digging

- [x] **CRAT-01**: Country filter uses a dropdown with country names (not raw ISO codes)

## Future Requirements

### Track-Level Discovery

- **TRCK-01**: Search by song title
- **TRCK-02**: On-demand recording data fetched and cached per artist on first visit
- **TRCK-03**: Artist-contributed track data (corrections, additions)

### Deep Data Distribution

- **DATA-01**: Per-artist data chunks available via torrent or cost-free peer distribution
- **DATA-02**: Incremental DB updates (only changed artists since last sync)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Song title search | Requires 35M recording index — 15GB+ DB. Deferred to Track-Level Discovery milestone |
| Audio hosting | Core constraint — never |
| Algorithmic manipulation | Core constraint — never |
| Paid tiers | Core constraint — never |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSYS-01 | Phase 23: Design System Foundation | Complete |
| DSYS-02 | Phase 23: Design System Foundation | Complete |
| DSYS-03 | Phase 23: Design System Foundation | Complete |
| DSYS-04 | Phase 23: Design System Foundation | Complete |
| DSYS-05 | Phase 23: Design System Foundation | Complete |
| ARTP-01 | Phase 24: Artist Page | Complete |
| ARTP-02 | Phase 24: Artist Page | Complete |
| ARTP-03 | Phase 24: Artist Page | Complete |
| ARTP-04 | Phase 24: Artist Page | Complete |
| ARTP-05 | Phase 24: Artist Page | Complete |
| ARTP-06 | Phase 24: Artist Page | Complete |
| ARTP-07 | Phase 24: Artist Page | Complete |
| ARTP-08 | Phase 24: Artist Page | Complete |
| QUEU-01 | Phase 25: Queue System + Library | Complete |
| QUEU-02 | Phase 25: Queue System + Library | Complete |
| QUEU-03 | Phase 25: Queue System + Library | Complete |
| QUEU-04 | Phase 25: Queue System + Library | Complete |
| QUEU-05 | Phase 25: Queue System + Library | Complete |
| QUEU-06 | Phase 25: Queue System + Library | Complete |
| LIBR-01 | Phase 25: Queue System + Library | Complete |
| LIBR-02 | Phase 25: Queue System + Library | Complete |
| LIBR-03 | Phase 25: Queue System + Library | Complete |
| DISC-01 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| DISC-02 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| DISC-03 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| XLINK-01 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| XLINK-02 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| XLINK-03 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| XLINK-04 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| XLINK-05 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| CRAT-01 | Phase 26: Discover + Cross-Linking + Crate Fix | Complete |
| SRCH-01 | Phase 27: Search + Knowledge Base | Complete |
| SRCH-02 | Phase 27: Search + Knowledge Base | Complete |
| SRCH-03 | Phase 27: Search + Knowledge Base | Complete |
| SRCH-04 | Phase 27: Search + Knowledge Base | Complete |
| KBAS-01 | Phase 27: Search + Knowledge Base | Complete |

**Coverage:**
- v1.4 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 — traceability updated with v1.4 roadmap phase assignments*
