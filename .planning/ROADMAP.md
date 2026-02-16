# Roadmap: Mercury

## Overview

Mercury is a desktop app. The internet is where it gets information. Your machine is where everything lives.

Build order: data pipeline (foundation) → web gateway (first impression) → desktop app (the real product) → local player (plays what you own) → AI (the brain) → discovery mechanics (the soul) → knowledge base (the differentiator) → social layer → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

Phases 1-2 built the web gateway — a working search engine with artist pages and embeds on Cloudflare. Everything from Phase 3 onward targets the Tauri desktop app as the primary product. The web version stays as a lightweight gateway that points people to the real thing.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked INSERTED)

- [x] **Phase 1: Data Pipeline** — MusicBrainz dumps into searchable SQLite + FTS5
- [x] **Phase 2: Web Gateway** — Search + artist pages + embeds on Cloudflare
- [ ] **Phase 3: Desktop App Foundation** — Tauri shell, local SQLite, database distribution, offline search
- [ ] **Phase 4: Local Music Player** — Folder scanning, metadata, playback, library-meets-discovery
- [ ] **Phase 5: AI Foundation** — Client-side models, recommendations, natural-language exploration, taste profiling
- [ ] **Phase 6: Discovery Engine** — Composite ranking, tag browsing, crate digging, uniqueness scoring, style map
- [ ] **Phase 7: Knowledge Base** — Genre/scene map, multi-layer content, scene maps, time machine, liner notes
- [ ] **Phase 8: Social Layer** — Collections, taste fingerprint, writing, discussion, import/export
- [ ] **Phase 9: Curator / Blog Tools** — Embeddable widgets, attribution, RSS, blog revival
- [ ] **Phase 10: Interoperability** — ActivityPub, Fediverse federation, RSS for everything
- [ ] **Phase 11: Listening Rooms** — Shared real-time listening with synchronized embeds
- [ ] **Phase 12: Artist Tools** — Claiming, dashboard, auto-news, self-hosted site generator

## Phase Details

### Phase 1: Data Pipeline [COMPLETE]
**Goal**: Download MusicBrainz dumps, process into searchable SQLite database
**Depends on**: Nothing
**Requirements**: DATA-01
**Success Criteria**:
  1. Pipeline downloads and extracts MusicBrainz dumps
  2. SQLite database with FTS5 contains 2.8M artists with tags
  3. Instant search across all artists
**Plans**: Completed

### Phase 2: Web Gateway [COMPLETE]
**Goal**: The web experience — search, find, listen. Doubles as Cloudflare-hosted gateway.
**Depends on**: Phase 1
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, EMBED-01
**Success Criteria**:
  1. User can type an artist name or tag and get instant results
  2. Artist pages show tags, country, discography grid, and embedded players
  3. Bandcamp/Spotify/SoundCloud/YouTube embeds render inline
  4. Deployed to Cloudflare Pages, mobile responsive
  5. Someone can visit, search, discover an unknown artist, and press play
**Plans**: 5 plans (all complete)
Plans:
- [x] 02-01-PLAN.md — Cloudflare D1 infrastructure, database queries, slug system
- [x] 02-02-PLAN.md — Dark theme, global layout, landing page with search bar
- [x] 02-03-PLAN.md — Search results page with card grid
- [x] 02-04-PLAN.md — Artist pages with embeds, bio, external links
- [x] 02-05-PLAN.md — End-to-end visual verification

### Phase 3: Desktop App Foundation
**Goal**: Mercury becomes a real desktop app. Tauri wraps the SvelteKit UI, reads local SQLite, works offline. The web version is now a gateway — the desktop app is the product.
**Depends on**: Phase 2
**Requirements**: DESKTOP-01, DESKTOP-02, DIST-01
**Success Criteria**:
  1. Tauri 2.0 app launches and runs the existing SvelteKit UI
  2. App reads local SQLite file instead of D1 — instant search, zero network dependency
  3. Database downloadable (~30-50MB compressed) and distributable via torrent
  4. Offline search works without internet
  5. Auto-update mechanism for both app and database
  6. If the website disappears, the desktop app still works
**Plans**: TBD

### Phase 4: Local Music Player
**Goal**: Mercury plays what you own. Scan folders, read metadata, build a library. Local files and online discovery are one unified experience — not two modes.
**Depends on**: Phase 3
**Requirements**: PLAYER-01, PLAYER-02, PLAYER-03
**Success Criteria**:
  1. User points Mercury at their music folders — app scans and indexes files
  2. Metadata read from ID3, FLAC, Vorbis, MP4 tags
  3. Full playback with standard controls (play, pause, skip, seek, volume, queue)
  4. Library browser shows local collection with cover art, tags, sorting
  5. Playing a local file shows related artists and tags from the discovery database
  6. Local library and online discovery feel like one thing — unified search, unified browse
**Plans**: TBD

### Phase 5: AI Foundation
**Goal**: AI as a core feature — recommendations, summaries, natural-language exploration, taste profiling. Not a bolt-on. Central to how the app works. Open models on client side where possible.
**Depends on**: Phase 3 (Phase 4 enriches it but isn't a hard dependency)
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria**:
  1. Client-side AI model loaded and running (open model, no cloud dependency)
  2. Recommendations generated from taste profile — "based on what you listen to"
  3. Natural-language queries work: "find me something like Boards of Canada but darker"
  4. AI-generated summaries for artists and genres from public data sources
  5. Taste profile builds automatically from listening history and collection
  6. All AI processing local — user data never leaves their machine
**Plans**: TBD

### Phase 6: Discovery Engine
**Goal**: Where search engine becomes discovery engine. Uniqueness IS the mechanism — the more niche you are, the more discoverable you become. Powered by a composite ranking score.
**Depends on**: Phase 1 (data), Phase 3 (desktop)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria**:
  1. Users can browse and intersect tags — drill down into specificity
  2. Composite discovery ranking: inverse popularity + tag rarity + scene freshness
  3. "Uniqueness score" visible on artist profiles
  4. Style map visualization shows tag relationships and clusters
  5. Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country)
  6. Generic artists sink, niche artists rise — naturally demotes AI-generated slop
**Plans**: TBD

### Phase 7: Knowledge Base
**Goal**: The genre/scene map — Mercury's biggest differentiator. A living encyclopedia of music: genres, scenes, movements, cities, eras. A place you can get lost in for hours. Content builds in layers over time.
**Depends on**: Phase 6 (discovery mechanics), Phase 5 (AI summaries)
**Requirements**: KB-01, KB-02, DISC-05, DISC-06, DISC-07
**Success Criteria**:
  1. Genre/scene map with navigable relationships — click a genre, see its origins, offshoots, key artists, related scenes
  2. Multi-layer content system working:
     - Layer 1: Open data (MusicBrainz tags + Wikidata genre relationships) — available day one
     - Layer 2: Links & embeds (YouTube documentaries, Wikipedia bios, external articles)
     - Layer 3: AI-assisted summaries (original descriptions from multiple public sources)
     - Layer 4: Community-written (wiki-style scene histories, genre descriptions, artist bios)
  3. Scene Maps — geographic + temporal visualization (Berlin techno '95, Buenos Aires now)
  4. Time Machine — browse by year, scrub timeline, watch genres evolve
  5. Liner Notes — rich expandable credits, relationships, and production details on release pages
**Plans**: TBD

### Phase 8: Social Layer
**Goal**: Taste as identity — the record shop shelf experience. Your collection should feel like yours. All local-first, no central server accounts. Sharing via generated exports.
**Depends on**: Phase 3 (desktop)
**Requirements**: SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, SOCIAL-05, SOCIAL-06, SOCIAL-07, SOCIAL-08, SOCIAL-09, SOCIAL-10, EMBED-02
**Success Criteria**:
  1. Opt-in user profiles (anonymous browsing by default)
  2. Collections: save artists/releases, tag them, sort them, group them — feels like a real shelf
  3. User-side tagging: personal taxonomy for organizing collections
  4. Taste Fingerprint: generated visual pattern unique to each user's collection
  5. Shareable exports — generated artifacts (images, files) from the desktop app
  6. Writing: users write reviews, scene reports, personal essays inside the app
  7. Discussion threads around releases, artists, and scenes
  8. Embeddable collections on external websites
  9. QR codes for any collection or curated list
  10. Import from Spotify, Last.fm, Apple Music, CSV
  11. Export all user data — your data is yours
  12. Streaming service preference — embeds default to user's choice
  13. No vanity metrics anywhere — no follower counts, no like counts, no play counts
**Plans**: TBD

### Phase 9: Curator / Blog Tools
**Goal**: Bring music blogs back to life. Give bloggers tools and an audience.
**Depends on**: Phase 6 (discovery), Phase 8 (social)
**Requirements**: BLOG-01, BLOG-02, BLOG-03
**Success Criteria**:
  1. Embeddable widgets (artist cards, search results, curated lists, entire collections)
  2. Attribution: "discovered via [curator]" links — curators get credit
  3. RSS feeds for every artist page, user collection, tag, and curator
  4. First access for curators — early visibility into emerging artists and new additions
  5. A music blogger has reason to write again
**Plans**: TBD

### Phase 10: Interoperability
**Goal**: Plug into the open web — federate, don't isolate
**Depends on**: Phase 8 (social layer)
**Requirements**: INTEROP-01, INTEROP-02
**Success Criteria**:
  1. Profiles followable from Mastodon and the Fediverse via ActivityPub
  2. Artist updates federate across the open web
  3. No need to create an account on Mercury to follow someone
**Plans**: TBD

### Phase 11: Listening Rooms
**Goal**: Communal discovery — shared real-time listening like sitting with friends playing records
**Depends on**: Phase 8 (social layer)
**Requirements**: LISTEN-01, LISTEN-02
**Success Criteria**:
  1. Create a room, invite people, play music together through synchronized embeds
  2. Room queue: anyone can add to the queue
  3. Chat alongside the music — reactions, conversation, discovery in real time
  4. No video. No screen sharing. Just music and people.
**Plans**: TBD

### Phase 12: Artist Tools
**Goal**: Give artists control without requiring them to do anything — zero-effort by default, full control if claimed
**Depends on**: Phase 8 (social layer)
**Requirements**: ARTIST-01, ARTIST-02, ARTIST-03, ARTIST-04
**Success Criteria**:
  1. Artist claiming with verification ("this profile is me")
  2. Claimed artists get a news dashboard — control tags, description, featured tracks
  3. Auto-pulled news from artist social media (zero-effort tier, works before claiming)
  4. Static site generator for self-hosted artist pages — publishes to free hosting, feeds data back to the index
**Plans**: TBD

## Deferred (Good Ideas, Wrong Time)

| Feature | Why Deferred | Revisit When |
|---------|-------------|-------------|
| Cross-platform playlist sync | Platform ToS risks, fragile APIs | Core product is solid, legal clarity exists |
| Remote streaming (phone ← home) | NAT traversal, relay servers, infrastructure complexity | Desktop + player mature, users ask for it |

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Data Pipeline | done | Complete | 2026-02-14 |
| 2. Web Gateway | 5/5 | Complete | 2026-02-15 |
| 3. Desktop App Foundation | 0/TBD | Not started | - |
| 4. Local Music Player | 0/TBD | Not started | - |
| 5. AI Foundation | 0/TBD | Not started | - |
| 6. Discovery Engine | 0/TBD | Not started | - |
| 7. Knowledge Base | 0/TBD | Not started | - |
| 8. Social Layer | 0/TBD | Not started | - |
| 9. Curator / Blog Tools | 0/TBD | Not started | - |
| 10. Interoperability | 0/TBD | Not started | - |
| 11. Listening Rooms | 0/TBD | Not started | - |
| 12. Artist Tools | 0/TBD | Not started | - |

## Parallel Track: Phase 0 (Sustainability)

Runs alongside everything else. Not blocking any phase. Rolls out in stages as features make new support channels possible.

### Stage 1 — Foundation (now, alongside Phase 2)
- [ ] GitHub Sponsors profile
- [ ] Ko-fi page (one-time micro-donations)
- [ ] Open Collective (transparent group funding)
- [ ] Public finances page in the app (what it costs, what comes in, where it goes)
- [ ] Small, permanent footer link: "Keep this alive" — not a banner, not a modal
- [ ] NLnet Foundation grant application
- [ ] Build log / dev updates as public content

### Stage 2 — Story (alongside Phase 3: Desktop)
- [ ] Patreon with behind-the-scenes content (voice memos, design previews, build log deep dives)
- [ ] Gentle donation prompt on database download page ("This was free. Help keep it free.")
- [ ] Liner Notes backer credits page — supporter names/aliases with the same reverence as music credits
- [ ] Sticker and patch designs (print-on-demand via Printful/Gelato)

### Stage 3 — Identity (alongside Phase 6-8: Discovery + Social)
- [ ] Taste Fingerprint prints — personalized posters generated from user collections (needs fingerprint feature)
- [ ] Discovery tokens — collectible coins/enamel pins with QR codes linking to curated discoveries
- [ ] Supporter Wall integrated into the platform
- [ ] Tote bags (record store bags for supporters)

### Stage 4 — Community (alongside Phase 8-9: Social + Blog)
- [ ] Artist collaboration merch — discovered artists create artwork for merch runs (artist gets paid)
- [ ] Milestone drops — limited edition merch when major versions ship
- [ ] Full print-on-demand merch store
- [ ] Affiliate links for artist self-hosting providers
