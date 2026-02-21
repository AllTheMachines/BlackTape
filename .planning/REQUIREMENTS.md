# Requirements: Mercury

**Defined:** 2026-02-15
**Updated:** 2026-02-21 — added Phase 06.1 affiliate buy link requirements
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

### Desktop

- [x] **DESKTOP-01**: Tauri desktop app reads local SQLite, works offline
- [x] **DESKTOP-02**: Same SvelteKit UI runs in Tauri shell and on web
- [x] **DIST-01**: Database file downloadable and torrentable; app auto-update infrastructure in place (signing keys, updater plugin); database updates via full replacement download (diff-based updates deferred as future optimization)

### Local Music Player

- [ ] **PLAYER-01**: Desktop app scans local folders and reads music file metadata (ID3, FLAC, Vorbis, MP4 tags)
- [ ] **PLAYER-02**: Audio playback of local files with standard player controls (play, pause, skip, seek, volume, queue)
- [ ] **PLAYER-03**: Local library unified with online discovery — playing local files shows related artists and tags from the index

### AI

- [ ] **AI-01**: Client-side AI recommendations from taste profile and listening history (open models, no cloud dependency)
- [ ] **AI-02**: Natural-language discovery queries ("find me something like X but darker")
- [ ] **AI-03**: AI-generated summaries for genres, artists, and scenes from public sources
- [ ] **AI-04**: Taste profiling — builds automatically from listening history, collection, and browsing

### Discovery

- [x] **DISC-01**: User can browse and intersect tags
- [x] **DISC-02**: Composite discovery ranking — inverse popularity + tag rarity scoring + scene freshness
- [x] **DISC-03**: Style map visualization shows tag relationships and clusters
- [x] **DISC-04**: Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country)

### Knowledge Base

- [ ] **KB-01**: Genre/scene map with navigable relationships (genres, scenes, movements, cities, eras)
- [ ] **KB-02**: Multi-layer content system (open data → links/embeds → AI summaries → community written)
- [ ] **DISC-05**: Scene Maps — geographic + temporal visualization of music scenes using MusicBrainz location data
- [ ] **DISC-06**: Time Machine — browse releases by year, scrub timeline, filter by tags, watch genre evolution
- [ ] **DISC-07**: Liner Notes — rich expandable credits, relationships, and production details on release pages

### Buy Links (Phase 06.1)

- [x] **BUY-01**: Release detail pages exist — cover art, tracklist, personnel credits, and link rows
- [x] **BUY-02**: "Buy on" row on release pages showing all five platforms (Bandcamp, Amazon Music, Apple Music, Beatport, Discogs) with search fallbacks where no direct URL is available; subtle indicator distinguishes search from direct
- [x] **BUY-03**: Affiliate IDs stored in environment variables only — never hardcoded in source; Amazon Associates and Apple Performance Partners supported
- [x] **BUY-04**: Site-wide affiliate disclosure in footer — no per-link badges

### Social

- [ ] **SOCIAL-01**: Opt-in user profiles with collections (anonymous browsing by default)
- [ ] **SOCIAL-02**: Shareable exports — generated artifacts (images, files) from the desktop app
- [ ] **SOCIAL-03**: User-side tagging — listeners tag, sort, and group their own collections with personal taxonomy
- [ ] **SOCIAL-04**: Taste Fingerprint — generated visual pattern unique to each user's collection
- [ ] **SOCIAL-05**: Writing — users write reviews, recommendations, scene reports, personal essays inside the app
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

## Deferred

| Feature | Reason | Requirement |
|---------|--------|-------------|
| Cross-platform playlist sync | Platform ToS risks, fragile APIs | — |
| Remote streaming (phone ← home) | NAT traversal, relay servers, infrastructure complexity | — |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| SEARCH-01 | Phase 2 | Complete |
| SEARCH-02 | Phase 2 | Complete |
| SEARCH-03 | Phase 2 | Complete |
| EMBED-01 | Phase 2 | Complete |
| EMBED-02 | Phase 8 | Pending |
| DESKTOP-01 | Phase 3 | Complete |
| DESKTOP-02 | Phase 3 | Complete |
| DIST-01 | Phase 3 | Complete |
| PLAYER-01 | Phase 4 | Pending |
| PLAYER-02 | Phase 4 | Pending |
| PLAYER-03 | Phase 4 | Pending |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| AI-03 | Phase 5 | Pending |
| AI-04 | Phase 5 | Pending |
| DISC-01 | Phase 6 | Complete |
| DISC-02 | Phase 6 | Complete |
| DISC-03 | Phase 6 | Complete |
| DISC-04 | Phase 6 | Complete |
| BUY-01 | Phase 06.1 | Complete |
| BUY-02 | Phase 06.1 | Complete |
| BUY-03 | Phase 06.1 | Complete |
| BUY-04 | Phase 06.1 | Complete |
| KB-01 | Phase 7 | Pending |
| KB-02 | Phase 7 | Pending |
| DISC-05 | Phase 7 | Pending |
| DISC-06 | Phase 7 | Pending |
| DISC-07 | Phase 7 | Pending |
| SOCIAL-01 | Phase 8 | Pending |
| SOCIAL-02 | Phase 8 | Pending |
| SOCIAL-03 | Phase 8 | Pending |
| SOCIAL-04 | Phase 8 | Pending |
| SOCIAL-05 | Phase 8 | Pending |
| SOCIAL-06 | Phase 8 | Pending |
| SOCIAL-07 | Phase 8 | Pending |
| SOCIAL-08 | Phase 8 | Pending |
| SOCIAL-09 | Phase 8 | Pending |
| SOCIAL-10 | Phase 8 | Pending |
| BLOG-01 | Phase 9 | Pending |
| BLOG-02 | Phase 9 | Pending |
| BLOG-03 | Phase 9 | Pending |
| INTEROP-01 | Phase 10 | Pending |
| INTEROP-02 | Phase 10 | Pending |
| LISTEN-01 | Phase 11 | Pending |
| LISTEN-02 | Phase 11 | Pending |
| ARTIST-01 | Phase 12 | Pending |
| ARTIST-02 | Phase 12 | Pending |
| ARTIST-03 | Phase 12 | Pending |
| ARTIST-04 | Phase 12 | Pending |
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
- v1 requirements: 60 total (added 4 for Phase 06.1 buy links)
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-21 — added BUY-01, BUY-02, BUY-03, BUY-04 for Phase 06.1 affiliate buy links*
