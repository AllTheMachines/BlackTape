# Requirements: Mercury

**Defined:** 2026-02-15
**Core Value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.

## v1 Requirements

### Data

- [x] **DATA-01**: Pipeline ingests MusicBrainz dumps into SQLite + FTS5 (2.8M artists)

### Search

- [x] **SEARCH-01**: User can search artists by name with instant results
- [x] **SEARCH-02**: User can search and filter by tags
- [x] **SEARCH-03**: Search results show artist name, tags, country

### Embeds

- [x] **EMBED-01**: Artist pages embed players from Bandcamp, Spotify, SoundCloud, YouTube
- [ ] **EMBED-02**: User can set preferred streaming service — embeds and links default to their choice

### Discovery

- [ ] **DISC-01**: User can browse and intersect tags
- [ ] **DISC-02**: Artists with unique tag combinations are more discoverable
- [ ] **DISC-03**: Style map visualization shows tag relationships
- [ ] **DISC-04**: Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country)
- [ ] **DISC-05**: Scene Maps — geographic + temporal visualization of music scenes using MusicBrainz location data
- [ ] **DISC-06**: Time Machine — browse releases by year, scrub timeline, filter by tags
- [ ] **DISC-07**: Liner Notes — rich expandable credits, relationships, and production details on release pages

### Desktop

- [ ] **DESKTOP-01**: Tauri desktop app reads local SQLite, works offline
- [ ] **DESKTOP-02**: Same UI as web version

### Distribution

- [ ] **DIST-01**: Database file downloadable and torrentable

### Social

- [ ] **SOCIAL-01**: Opt-in user profiles with collections (anonymous browsing by default)
- [ ] **SOCIAL-02**: Shareable profile URLs
- [ ] **SOCIAL-03**: User-side tagging — listeners tag, sort, and group their own collections with personal taxonomy
- [ ] **SOCIAL-04**: Taste Fingerprint — generated visual pattern unique to each user's collection
- [ ] **SOCIAL-05**: Writing — users write reviews, recommendations, scene reports, personal essays inside the platform
- [ ] **SOCIAL-06**: Discussion threads around releases, artists, and scenes
- [ ] **SOCIAL-07**: Embeddable collections — users can embed their collection on external websites
- [ ] **SOCIAL-08**: QR codes — generate QR for any collection or curated list (physical-digital bridge)
- [ ] **SOCIAL-09**: Import from Spotify, Last.fm, Apple Music, CSV to bootstrap collections
- [ ] **SOCIAL-10**: Export all user data (collections, tags, writing) — your data is yours

### Blog / Curator

- [ ] **BLOG-01**: Embeddable widgets for blog writers (artist cards, search results, curated lists)
- [ ] **BLOG-02**: Curator attribution ("discovered via" links)
- [ ] **BLOG-03**: RSS feeds for every artist page, user collection, tag, and curator

### Interoperability

- [ ] **INTEROP-01**: ActivityPub — profiles followable from Mastodon and the Fediverse
- [ ] **INTEROP-02**: Artist updates federate across the open web

### Listening Rooms

- [ ] **LISTEN-01**: Shared real-time listening with synchronized embeds
- [ ] **LISTEN-02**: Room queue and chat — like sitting with friends playing records

### Artist Tools

- [ ] **ARTIST-01**: Artist claiming with verification ("this profile is me")
- [ ] **ARTIST-02**: Artist news dashboard — control tags, description, featured tracks
- [ ] **ARTIST-03**: Auto-pulled news from artist social media (zero-effort tier)
- [ ] **ARTIST-04**: Static site generator for self-hosted artist pages, publishes to free hosting, feeds data back to the index

### Sustainability (Phase 0 — parallel)

- [ ] **SUST-01**: Public finances page showing real-time costs and income
- [ ] **SUST-02**: Non-intrusive footer presence linking to support channels
- [ ] **SUST-03**: GitHub Sponsors, Ko-fi, Open Collective profiles live
- [ ] **SUST-04**: Patreon with behind-the-scenes build content
- [ ] **SUST-05**: Liner Notes backer credits page
- [ ] **SUST-06**: Donation prompt on database download (non-blocking)
- [ ] **SUST-07**: Taste Fingerprint merch (print-on-demand, personalized)
- [ ] **SUST-08**: Discovery tokens / physical collectibles with QR codes
- [ ] **SUST-09**: Print-on-demand merch store (stickers, totes, patches, milestone drops)
- [ ] **SUST-10**: Artist collaboration merch pipeline

## Out of Scope

| Feature | Reason |
|---------|--------|
| Audio hosting | Audio lives on artist infrastructure — always |
| Paid tiers / premium | Pure public good — everyone gets the same thing |
| Algorithmic feeds | No retention tricks — chronological, equal |
| Blockchain / tokens | None — every previous attempt focused on this and failed |
| Tracking / ads | None — discovery tool, not surveillance tool |
| API-for-profit | No businesses building on top |
| Vanity metrics | No follower counts, like counts, or play counts — ever |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| SEARCH-01 | Phase 2 | Complete |
| SEARCH-02 | Phase 2 | Complete |
| SEARCH-03 | Phase 2 | Complete |
| EMBED-01 | Phase 2 | Complete |
| EMBED-02 | Phase 5 | Pending |
| DISC-01 | Phase 4 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| DISC-05 | Phase 4 | Pending |
| DISC-06 | Phase 4 | Pending |
| DISC-07 | Phase 4 | Pending |
| DESKTOP-01 | Phase 3 | Pending |
| DESKTOP-02 | Phase 3 | Pending |
| DIST-01 | Phase 3 | Pending |
| SOCIAL-01 | Phase 5 | Pending |
| SOCIAL-02 | Phase 5 | Pending |
| SOCIAL-03 | Phase 5 | Pending |
| SOCIAL-04 | Phase 5 | Pending |
| SOCIAL-05 | Phase 5 | Pending |
| SOCIAL-06 | Phase 5 | Pending |
| SOCIAL-07 | Phase 5 | Pending |
| SOCIAL-08 | Phase 5 | Pending |
| SOCIAL-09 | Phase 5 | Pending |
| SOCIAL-10 | Phase 5 | Pending |
| BLOG-01 | Phase 6 | Pending |
| BLOG-02 | Phase 6 | Pending |
| BLOG-03 | Phase 6 | Pending |
| INTEROP-01 | Phase 7 | Pending |
| INTEROP-02 | Phase 7 | Pending |
| LISTEN-01 | Phase 8 | Pending |
| LISTEN-02 | Phase 8 | Pending |
| ARTIST-01 | Phase 9 | Pending |
| ARTIST-02 | Phase 9 | Pending |
| ARTIST-03 | Phase 9 | Pending |
| ARTIST-04 | Phase 9 | Pending |
| SUST-01 | Phase 0 / Stage 1 | Pending |
| SUST-02 | Phase 0 / Stage 1 | Pending |
| SUST-03 | Phase 0 / Stage 1 | Pending |
| SUST-04 | Phase 0 / Stage 2 | Pending |
| SUST-05 | Phase 0 / Stage 2 | Pending |
| SUST-06 | Phase 0 / Stage 2 | Pending |
| SUST-07 | Phase 0 / Stage 3 | Pending |
| SUST-08 | Phase 0 / Stage 3 | Pending |
| SUST-09 | Phase 0 / Stage 4 | Pending |
| SUST-10 | Phase 0 / Stage 4 | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 — expanded with all PROJECT.md features*
