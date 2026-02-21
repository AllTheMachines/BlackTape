# Requirements: Mercury

**Defined:** 2026-02-15
**Updated:** 2026-02-21 — Phase 07.3: PLAYER-01/PLAYER-02 marked Complete; traceability aligned; COMM-01/02/03 added for Phase 9 community foundation traceability
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
- [x] **EMBED-02**: User can set preferred streaming service — embeds and links default to their choice

### Desktop

- [x] **DESKTOP-01**: Tauri desktop app reads local SQLite, works offline
- [x] **DESKTOP-02**: Same SvelteKit UI runs in Tauri shell and on web
- [x] **DIST-01**: Database file downloadable and torrentable; app auto-update infrastructure in place (signing keys, updater plugin); database updates via full replacement download (diff-based updates deferred as future optimization)

### Local Music Player

- [x] **PLAYER-01**: Desktop app scans local folders and reads music file metadata (ID3, FLAC, Vorbis, MP4 tags)
- [x] **PLAYER-02**: Audio playback of local files with standard player controls (play, pause, skip, seek, volume, queue)
- [x] **PLAYER-03**: Local library unified with online discovery — playing local files shows related artists and tags from the index

### AI

- [x] **AI-01**: Client-side AI recommendations from taste profile and listening history (open models, no cloud dependency)
- [x] **AI-02**: Natural-language discovery queries ("find me something like X but darker")
- [x] **AI-03**: AI-generated summaries for genres, artists, and scenes from public sources — artist summaries (Phase 5) + genre/scene summaries (Phase 7) both complete
- [x] **AI-04**: Taste profiling — builds automatically from listening history, collection, and browsing

### Discovery

- [x] **DISC-01**: User can browse and intersect tags
- [x] **DISC-02**: Composite discovery ranking — inverse popularity + tag rarity scoring + scene freshness
- [x] **DISC-03**: Style map visualization shows tag relationships and clusters
- [x] **DISC-04**: Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country)

### Knowledge Base

- [x] **KB-01**: Genre/scene map with navigable relationships (genres, scenes, movements, cities, eras)
- [x] **KB-02**: Multi-layer content system (open data → links/embeds → AI summaries → community written)
- [x] **DISC-05**: Scene Maps — geographic + temporal visualization of music scenes using MusicBrainz location data
- [x] **DISC-06**: Time Machine — browse releases by year, scrub timeline, filter by tags, watch genre evolution
- [x] **DISC-07**: Liner Notes — rich expandable credits, relationships, and production details on release pages

### UX (Phase 8)

- [x] **UX-01**: Dense, panel-based UI — multiple information sources visible simultaneously, not hidden behind navigation (Tauri desktop)
- [x] **UX-02**: Taste-based theming engine — color palette generated from user's taste profile; two different people see two different Mercurys
- [x] **UX-03**: Layout templates — users can choose and customize their workspace arrangement (predefined templates, not a layout editor)
- [x] **UX-04**: Interactive controls everywhere — dropdowns, sliders, toggles; using Mercury feels like playing, not scrolling

### Buy Links (Phase 06.1)

- [x] **BUY-01**: Release detail pages exist — cover art, tracklist, personnel credits, and link rows
- [x] **BUY-02**: "Buy on" row on release pages showing all five platforms (Bandcamp, Amazon Music, Apple Music, Beatport, Discogs) with search fallbacks where no direct URL is available; subtle indicator distinguishes search from direct
- [x] **BUY-03**: Affiliate IDs stored in environment variables only — never hardcoded in source; Amazon Associates and Apple Performance Partners supported
- [x] **BUY-04**: Site-wide affiliate disclosure in footer — no per-link badges

### Community Foundation (Phase 9)

- [ ] **COMM-01**: Pseudonymous identity system — handles + generative pixel art avatars; no real names, no photos; local-first, no central account
- [ ] **COMM-02**: Collections / shelves curation — multiple named shelves containing saved artists and releases; artists and release pages show Save to Shelf with inline creation
- [ ] **COMM-03**: Generative avatar system — pixel art avatar driven by user taste data; in-app editor for manual customization; three layers (generative default, pixel editor, preset selection)

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
| EMBED-02 | Phase 8 | Complete |
| DESKTOP-01 | Phase 3 | Complete |
| DESKTOP-02 | Phase 3 | Complete |
| DIST-01 | Phase 3 | Complete |
| PLAYER-01 | Phase 4 / Phase 07.3 | Complete |
| PLAYER-02 | Phase 4 / Phase 07.3 | Complete |
| PLAYER-03 | Phase 4 / Phase 07.2 | Complete — playback→taste signal implemented; 70% threshold fires recomputeTaste() |
| AI-01 | Phase 5 / Phase 07.1 | Complete |
| AI-02 | Phase 5 / Phase 07.1 | Complete |
| AI-03 | Phase 5 / Phase 7 | Complete |
| AI-04 | Phase 5 / Phase 07.1 / Phase 07.2 | Complete — playback history feeds taste computation with 30-day decay; 5-play activation gate |
| DISC-01 | Phase 6 | Complete |
| DISC-02 | Phase 6 | Complete |
| DISC-03 | Phase 6 | Complete |
| DISC-04 | Phase 6 | Complete |
| BUY-01 | Phase 06.1 | Complete |
| BUY-02 | Phase 06.1 | Complete |
| BUY-03 | Phase 06.1 | Complete |
| BUY-04 | Phase 06.1 | Complete |
| KB-01 | Phase 7 / Phase 07.1 | Complete — personalization fixed (07.1 loadTasteProfile startup); /discover link added (07.1 GAP-04) |
| KB-02 | Phase 7 / Phase 07.1 | Complete |
| DISC-05 | Phase 7 | Complete |
| DISC-06 | Phase 7 | Complete |
| DISC-07 | Phase 7 | Complete |
| UX-01 | Phase 8 | Complete |
| UX-02 | Phase 8 | Complete — 08-01 (palette.ts + engine.svelte.ts, OKLCH theming) |
| UX-03 | Phase 8 | Complete |
| UX-04 | Phase 8 | Complete |
| COMM-01 | Phase 9 | Pending |
| COMM-02 | Phase 9 | Pending |
| COMM-03 | Phase 9 | Pending |
| SOCIAL-01 | Phase 9 | Pending |
| SOCIAL-02 | Phase 9 | Pending |
| SOCIAL-03 | Phase 9 | Pending |
| SOCIAL-04 | Phase 9 | Pending |
| SOCIAL-05 | Phase 9 | Pending |
| SOCIAL-06 | Phase 9 | Pending |
| SOCIAL-07 | Phase 9 | Pending |
| SOCIAL-08 | Phase 9 | Pending |
| SOCIAL-09 | Phase 9 | Pending |
| SOCIAL-10 | Phase 9 | Pending |
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
- v1 requirements: 67 total (added 4 UX for Phase 8; added 3 COMM for Phase 9 community foundation traceability)
- Mapped to phases: 67
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-21 — Phase 8: added UX-01 through UX-04; fixed SOCIAL traceability (Phase 9, not Phase 8); KB-01 marked Complete. Phase 9 revision: added COMM-01/02/03 definitions and traceability rows.*
