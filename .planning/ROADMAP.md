# Roadmap: Mercury

## Overview

Mercury is a desktop app that becomes a place. The internet is where it gets information. Your machine is where everything lives. The community lives everywhere.

Build order: data pipeline (foundation) → web gateway (first impression) → desktop app (the real product) → local player (plays what you own) → AI (the brain) → discovery mechanics (the soul) → knowledge base (the differentiator) → underground aesthetic (the vibe) → community foundation (the people) → communication (the connections) → scene building (the culture) → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

Phases 1-2 built the web gateway — a working search engine with artist pages and embeds on Cloudflare. Everything from Phase 3 onward targets the Tauri desktop app as the primary product. The web version stays as a lightweight gateway that points people to the real thing.

Phase 8 is the turning point — where Mercury stops being a tool and starts being a place. The aesthetic overhaul ships before any community features because the vibe has to be right first.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked INSERTED)

- [x] **Phase 1: Data Pipeline** — MusicBrainz dumps into searchable SQLite + FTS5
- [x] **Phase 2: Web Gateway** — Search + artist pages + embeds on Cloudflare
- [x] **Phase 3: Desktop App Foundation** — Tauri shell, local SQLite, database distribution, offline search
- [x] **Phase 4: Local Music Player** — Folder scanning, metadata, playback, library-meets-discovery
- [ ] **Phase 5: AI Foundation** — Client-side models, recommendations, natural-language exploration, taste profiling
- [x] **Phase 6: Discovery Engine** — Composite ranking, tag browsing, crate digging, uniqueness scoring, style map (completed 2026-02-20)
- [x] **Phase 7: Knowledge Base** — Genre/scene map, multi-layer content, scene maps, time machine, liner notes (completed 2026-02-21)
- [ ] **Phase 8: Underground Aesthetic** — Dense playful UI, taste-based theming, panels/controls, templates, game-like feel
- [ ] **Phase 9: Community Foundation** — Identity system, taste matching, collections, taste fingerprint, import/export
- [ ] **Phase 10: Communication Layer** — Encrypted DMs + scene rooms + ephemeral sessions, hybrid moderation
- [ ] **Phase 11: Scene Building** — AI scene detection, label collectives, community-driven creation tools
- [ ] **Phase 12: Curator / Blog Tools** — Embeddable widgets, attribution, RSS, blog revival
- [ ] **Phase 13: Interoperability** — ActivityPub, Fediverse federation, RSS for everything
- [ ] **Phase 14: Listening Rooms** — Shared real-time listening with synchronized embeds
- [ ] **Phase 15: Artist Tools** — Claiming, dashboard, auto-news, self-hosted site generator

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
  3. Database downloadable (compressed) and distributable via HTTP and torrent
  4. Offline search works without internet
  5. App auto-update infrastructure in place (signing keys, updater config); database updates via full replacement download (diff-based updates deferred as future optimization)
  6. If the website disappears, the desktop app still works
**Plans**: 5 plans
Plans:
- [x] 03-01-PLAN.md — Database abstraction layer (DbProvider interface, D1 + Tauri implementations)
- [x] 03-02-PLAN.md — Tauri scaffolding, dual-adapter build system, desktop window
- [x] 03-03-PLAN.md — Universal load functions for search and artist pages
- [x] 03-04-PLAN.md — Database detection, first-run setup UI, compression + torrent pipeline
- [x] 03-05-PLAN.md — Auto-updater signing keys, NSIS installer (3.9MB)

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
**Plans**: 5 plans
Plans:
- [x] 04-01-PLAN.md — Rust scanner backend (lofty metadata, walkdir traversal, library.db, Tauri commands)
- [x] 04-02-PLAN.md — Player frontend (HTML5 Audio engine, player state, queue, persistent player bar UI)
- [x] 04-03-PLAN.md — Library browser (folder management, scan progress, album grid, click-to-play)
- [x] 04-04-PLAN.md — Unified discovery (artist matching via FTS5, now-playing context, local tracks in search)
- [x] 04-05-PLAN.md — End-to-end verification checkpoint

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
**Plans**: 7 plans
Plans:
- [ ] 05-01-PLAN.md — Rust AI sidecar infrastructure + TypeScript AI provider interface + taste.db schema
- [ ] 05-02-PLAN.md — AI opt-in settings UI + model download with progress + sidecar startup
- [ ] 05-03-PLAN.md — Embedding infrastructure (sqlite-vec) + taste signal computation + favorites
- [ ] 05-04-PLAN.md — Artist page recommendations + AI summaries + favorite button
- [ ] 05-05-PLAN.md — Natural language explore page with refinement
- [ ] 05-06-PLAN.md — Taste profile editing (tag weights + artist anchors)
- [ ] 05-07-PLAN.md — Documentation updates + end-to-end verification

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
**Plans**: 7 plans
Plans:
- [ ] 06-01-PLAN.md — Pipeline additions: tag_stats and tag_cooccurrence tables in mercury.db
- [ ] 06-02-PLAN.md — Discovery query library: tag intersection, ranking, crate digging, uniqueness, style map
- [ ] 06-03-PLAN.md — Discover page: tag intersection browser with niche-first ranking
- [ ] 06-04-PLAN.md — Artist uniqueness score badge on all artist pages
- [ ] 06-05-PLAN.md — Crate Digging Mode: serendipitous random sampling with filters (Tauri-only)
- [ ] 06-06-PLAN.md — Style Map: D3 force-directed genre relationship visualization
- [ ] 06-07-PLAN.md — Navigation links + docs update + end-to-end verification checkpoint

### Phase 06.1: Affiliate Buy Links (INSERTED)
**Goal**: Release detail pages with affiliate-coded purchase links across five platforms (Bandcamp, Amazon Music, Apple Music, Beatport, Discogs). Passive income layer on top of existing discovery infrastructure. All five platforms always shown — search fallback links where no direct URL is available.
**Depends on**: Phase 6
**Requirements**: BUY-01, BUY-02, BUY-03, BUY-04
**Success Criteria**:
  1. Release detail pages exist at /artist/{slug}/release/{mbid} with cover art, tracklist, and credits
  2. "Buy on" row below "Listen on" bar shows all five platforms
  3. Affiliate IDs (Amazon Associates, Apple Performance Partners) in env vars — never hardcoded
  4. Search fallback links have subtle '?' indicator so users know they're searching, not going to a product page
  5. Footer affiliate disclosure on all pages
  6. ReleaseCard on artist page navigates to release detail page
**Plans**: 5 plans
Plans:
- [x] 06.1-01-PLAN.md — Affiliate module (types, config, URL construction for all 5 platforms)
- [x] 06.1-02-PLAN.md — Release page data layer (server load + universal Tauri load)
- [x] 06.1-03-PLAN.md — BuyOnBar component (visual "Buy on" row)
- [x] 06.1-04-PLAN.md — Release page UI + ReleaseCard navigation + footer disclosure
- [x] 06.1-05-PLAN.md — .dev.vars setup + visual verification checkpoint

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
**Plans**: 7 plans
Plans:
- [x] 07-01-PLAN.md — Pipeline Phase G: genre/scene DB tables (Wikidata SPARQL + Nominatim geocoding)
- [x] 07-02-PLAN.md — Genre query library: getGenreSubgraph, getGenreBySlug, getArtistsByYear, getStarterGenreGraph
- [x] 07-03-PLAN.md — KB landing page: GenreGraph component (D3 force, 3 node types) + /kb route
- [x] 07-04-PLAN.md — Genre/scene page: layered content + SceneMap (Leaflet) + AI genreSummary prompt
- [x] 07-05-PLAN.md — Time Machine page: decade buttons + year scrubber + artist list + API route
- [x] 07-06-PLAN.md — Liner Notes component + artist page KB wiring + nav links
- [x] 07-07-PLAN.md — ARCHITECTURE.md + user-manual.md + BUILD-LOG.md + final build verification

### Phase 8: Underground Aesthetic
**Goal**: The turning point. Mercury stops looking like a search engine and starts feeling like a place. The UI becomes dense, playful, and game-like — panels, controls, dropdowns everywhere. A cockpit, not a feed. Your taste shapes your colors through taste-based theming. Layout templates let you customize your workspace. This ships before community features because the vibe has to be right first.
**Depends on**: Phase 5 (taste profiles for theming), Phase 6 (discovery for panel content)
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria**:
  1. Dense, panel-based UI — multiple information sources visible simultaneously, not hidden behind navigation
  2. Taste-based theming engine — color palette generated from user's taste profile. Two different people see two different Mercurys.
  3. Layout templates — users can choose and customize their workspace arrangement
  4. Interactive controls everywhere — dropdowns, sliders, toggles. Using Mercury feels like playing, not scrolling.
  5. Streaming service preference — embeds default to user's chosen platform
  6. The app feels like something you PLAY with, not something you consume from
**Plans**: TBD

### Phase 9: Community Foundation
**Goal**: Taste as identity. Find people who share your exact obscure corner of music. The first step toward "underground is alive." All local-first, no central server accounts. Identity is pseudonymous — a handle, a lo-fi avatar, and your pure taste profile. No bios, no photos. The music speaks.
**Depends on**: Phase 8 (aesthetic must feel right first), Phase 5 (taste profiles)
**Requirements**: COMM-01, COMM-02, COMM-03, SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04
**Success Criteria**:
  1. Pseudonymous identity system — handles + lo-fi avatar builder (customizable pixel art, not photorealistic)
  2. Pure taste profiles — your tags, artists, and collection ARE your identity. No bios, no "about me."
  3. Collections: save artists/releases, organize them — feels like a real shelf
  4. Taste Fingerprint: generated visual pattern unique to each user's collection
  5. Taste matching — three layers: overlap browsing, scene rooms, serendipitous encounters
  6. Toggleable radius: local → regional → global
  7. Import from Spotify, Last.fm, Apple Music, CSV
  8. Export all user data — your data is yours
  9. No vanity metrics anywhere — no follower counts, no like counts, no play counts
**Plans**: TBD

### Phase 10: Communication Layer
**Goal**: People found each other in Phase 9. Now they can talk. Encrypted, layered communication: private DMs, persistent scene rooms, and ephemeral sessions. Zero server cost is a hard constraint. Infrastructure architecture (Matrix, P2P, relay, Nostr) requires research — the right answer depends on the ecosystem at build time.
**Depends on**: Phase 9 (identity system)
**Requirements**: COMM-04, COMM-05, COMM-06
**Architecture Decision Required**: Communication infrastructure protocol — deferred until phase planning. Options: Matrix (federated, existing infra), P2P/libp2p (purist, no server), hybrid relay (Cloudflare Workers free tier), Nostr (decentralized, growing ecosystem).
**Success Criteria**:
  1. Encrypted private DMs between users
  2. Persistent scene rooms — organized by genre/vibe, discoverable, anyone can join
  3. Ephemeral sessions — temporary shared moments that don't persist
  4. Groups small by default (UI encourages intimacy), no size ceiling
  5. Hybrid moderation: room creators have authority + community flagging for harmful content. No central moderation team.
  6. AI taste translation — explains WHY two people's tastes overlap
  7. AI matchmaking context — describes overlap and divergence between users
  8. Zero server cost for Mercury maintainer
**Plans**: TBD

### Phase 11: Scene Building
**Goal**: The community has identity (Phase 9) and communication (Phase 10). Now scenes emerge. AI detects emerging patterns in collective listening. Label collectives form organically. Mercury provides the space — people decide what happens in it. Creation tools are added only if the community asks for them.
**Depends on**: Phase 10 (communication), Phase 5 (AI for scene detection)
**Requirements**: COMM-07, COMM-08
**Success Criteria**:
  1. AI scene awareness — detects emerging scenes from collective listening patterns ("a cluster is forming around these artists")
  2. Label collectives — group identity within Mercury (shared name, shared roster, collective taste profile)
  3. Community-requested creation tools — collaborative playlists, shared collections, label pages. Shipped only when people ask.
  4. The underground is alive — scenes exist in Mercury that exist nowhere else
**Plans**: TBD

### Phase 12: Curator / Blog Tools
**Goal**: Bring music blogs back to life. Give bloggers tools and an audience.
**Depends on**: Phase 6 (discovery), Phase 9 (community foundation)
**Requirements**: BLOG-01, BLOG-02, BLOG-03
**Success Criteria**:
  1. Embeddable widgets (artist cards, search results, curated lists, entire collections)
  2. Attribution: "discovered via [curator]" links — curators get credit
  3. RSS feeds for every artist page, user collection, tag, and curator
  4. First access for curators — early visibility into emerging artists and new additions
  5. Embeddable collections on external websites
  6. QR codes for any collection or curated list
  7. A music blogger has reason to write again
**Plans**: TBD

### Phase 13: Interoperability
**Goal**: Plug into the open web — federate, don't isolate
**Depends on**: Phase 9 (community foundation)
**Requirements**: INTEROP-01, INTEROP-02
**Success Criteria**:
  1. Profiles followable from Mastodon and the Fediverse via ActivityPub
  2. Artist updates federate across the open web
  3. No need to create an account on Mercury to follow someone
**Plans**: TBD

### Phase 14: Listening Rooms
**Goal**: Communal discovery — shared real-time listening like sitting with friends playing records
**Depends on**: Phase 10 (communication layer)
**Requirements**: LISTEN-01, LISTEN-02
**Success Criteria**:
  1. Create a room, invite people, play music together through synchronized embeds
  2. Room queue: anyone can add to the queue
  3. Chat alongside the music — reactions, conversation, discovery in real time
  4. No video. No screen sharing. Just music and people.
**Plans**: TBD

### Phase 15: Artist Tools
**Goal**: Give artists control without requiring them to do anything — zero-effort by default, full control if claimed
**Depends on**: Phase 9 (community foundation)
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
| Remote streaming (phone <- home) | NAT traversal, relay servers, infrastructure complexity | Desktop + player mature, users ask for it |
| Database diff-based updates | Full replacement is simpler; diff sizes unknown until MusicBrainz weekly dump testing | Full replacement feels too large for users |
| Communication infrastructure choice | Matrix vs P2P vs relay vs Nostr — ecosystem evolving fast | Phase 10 planning (proper research then) |
| Licensing model | Open source vs source-available vs custom — depends on sustainability trajectory | When sustainability model is clearer |
| Writing/discussion features | Community should ask for creation tools, not have them imposed | Phase 11+ if community requests |

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Data Pipeline | done | Complete | 2026-02-14 |
| 2. Web Gateway | 5/5 | Complete | 2026-02-15 |
| 3. Desktop App Foundation | 5/5 | Complete   | 2026-02-21 |
| 4. Local Music Player | 5/5 | Complete | 2026-02-17 |
| 5. AI Foundation | 0/TBD | Not started | - |
| 6. Discovery Engine | 7/7 | Complete   | 2026-02-20 |
| 06.1. Affiliate Buy Links | 5/5 | Complete    | 2026-02-21 |
| 7. Knowledge Base | 7/7 | Complete   | 2026-02-21 |
| 8. Underground Aesthetic | 0/TBD | Not started | - |
| 9. Community Foundation | 0/TBD | Not started | - |
| 10. Communication Layer | 0/TBD | Not started | - |
| 11. Scene Building | 0/TBD | Not started | - |
| 12. Curator / Blog Tools | 0/TBD | Not started | - |
| 13. Interoperability | 0/TBD | Not started | - |
| 14. Listening Rooms | 0/TBD | Not started | - |
| 15. Artist Tools | 0/TBD | Not started | - |

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

### Stage 3 — Identity (alongside Phase 8-9: Aesthetic + Community)
- [ ] Taste Fingerprint prints — personalized posters generated from user collections (needs fingerprint feature)
- [ ] Discovery tokens — collectible coins/enamel pins with QR codes linking to curated discoveries
- [ ] Supporter Wall integrated into the platform
- [ ] Tote bags (record store bags for supporters)

### Stage 4 — Community (alongside Phase 11-12: Scene Building + Blog)
- [ ] Artist collaboration merch — discovered artists create artwork for merch runs (artist gets paid)
- [ ] Milestone drops — limited edition merch when major versions ship
- [ ] Full print-on-demand merch store
- [ ] Affiliate links for artist self-hosting providers
