# Roadmap: Mercury

## Overview
Build a music discovery engine from the ground up. Data pipeline first (foundation), then search + embeds (the "holy shit" moment), then desktop distribution (unkillable), then discovery mechanics, social layer, curator tools, interoperability, listening rooms, and artist tools. Phase 0 (sustainability) runs in parallel with everything.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked INSERTED)

- [x] **Phase 1: Data Pipeline** - MusicBrainz dumps into searchable SQLite + FTS5
- [ ] **Phase 2: Search + Artist Pages + Embeds** - The core web experience
- [ ] **Phase 3: Desktop App + Distribution** - Tauri app with local SQLite, torrent distribution
- [ ] **Phase 4: Discovery Engine** - Tag browsing, crate digging, scene maps, time machine, liner notes
- [ ] **Phase 5: Social Layer** - Profiles, collections, taste fingerprint, writing, discussion, import/export
- [ ] **Phase 6: Blog / Curator Tools** - Embeddable widgets, attribution, RSS, blog revival
- [ ] **Phase 7: Interoperability** - ActivityPub, Fediverse federation
- [ ] **Phase 8: Listening Rooms** - Shared real-time listening with synchronized embeds
- [ ] **Phase 9: Artist Tools** - Claiming, dashboard, auto-news, self-hosted site generator

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

### Phase 2: Search + Artist Pages + Embeds
**Goal**: The core web experience — search, find, listen
**Depends on**: Phase 1
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, EMBED-01
**Success Criteria**:
  1. User can type an artist name or tag and get instant results
  2. Artist pages show tags, country, and embedded players
  3. Bandcamp/Spotify/SoundCloud/YouTube embeds render inline
  4. Deployed to Cloudflare Pages, mobile responsive
  5. Someone can visit, search, discover an unknown artist, and press play
**Plans**: 5 plans
Plans:
- [x] 02-01-PLAN.md — Cloudflare D1 infrastructure, database queries, slug system
- [x] 02-02-PLAN.md — Dark theme, global layout, landing page with search bar
- [x] 02-03-PLAN.md — Search results page with card grid
- [x] 02-04-PLAN.md — Artist pages with embeds, bio, external links
- [ ] 02-05-PLAN.md — End-to-end visual verification

### Phase 3: Desktop App + Distribution
**Goal**: Unkillable local version with distributed database
**Depends on**: Phase 2
**Requirements**: DESKTOP-01, DESKTOP-02, DIST-01
**Success Criteria**:
  1. Tauri app runs same UI, reads local SQLite
  2. Database downloadable (~30-50MB compressed)
  3. Offline search works without internet
  4. If the website disappears, the desktop app still works
**Plans**: TBD

### Phase 4: Discovery Engine
**Goal**: Where search engine becomes discovery engine — uniqueness mechanic, serendipity, geography, time, and credits
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07
**Success Criteria**:
  1. Users can browse and intersect tags
  2. Artists with unique tag combinations are more discoverable
  3. Style map visualization shows tag relationships
  4. "Uniqueness score" visible on artist profiles
  5. Crate Digging Mode — serendipitous browsing through filtered stacks (genre, decade, country)
  6. Scene Maps — geographic + temporal visualization of music scenes
  7. Time Machine — browse by year, scrub timeline, watch genres evolve
  8. Liner Notes — rich expandable credits and production details on release pages
**Plans**: TBD

### Phase 5: Social Layer
**Goal**: Taste as identity — the record shop shelf experience. Profiles, collections, personal organization, writing, discussion, and import/export
**Depends on**: Phase 2
**Requirements**: SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, SOCIAL-05, SOCIAL-06, SOCIAL-07, SOCIAL-08, SOCIAL-09, SOCIAL-10, EMBED-02
**Success Criteria**:
  1. Opt-in user profiles (anonymous browsing by default)
  2. Collections: save artists/releases, tag them, sort them, group them — feels like a real shelf
  3. User-side tagging: personal taxonomy for organizing collections
  4. Taste Fingerprint: generated visual pattern unique to each user's collection
  5. Shareable profile URLs ("your taste at a glance")
  6. Writing: users write reviews, scene reports, personal essays inside the platform
  7. Discussion threads around releases, artists, and scenes
  8. Embeddable collections on external websites
  9. QR codes for any collection or curated list
  10. Import from Spotify, Last.fm, Apple Music, CSV
  11. Export all user data — your data is yours
  12. Streaming service preference — embeds default to user's choice
  13. No vanity metrics anywhere — no follower counts, no like counts, no play counts
**Plans**: TBD

### Phase 6: Blog / Curator Tools
**Goal**: Bring music blogs back to life
**Depends on**: Phase 4, Phase 5
**Requirements**: BLOG-01, BLOG-02, BLOG-03
**Success Criteria**:
  1. Embeddable widgets (artist cards, search results, curated lists, entire collections)
  2. Attribution: "discovered via [curator]" links
  3. RSS feeds for every artist page, user collection, tag, and curator
  4. A music blogger has reason to write again
**Plans**: TBD

### Phase 7: Interoperability
**Goal**: Plug into the open web — federate, don't isolate
**Depends on**: Phase 5
**Requirements**: INTEROP-01, INTEROP-02
**Success Criteria**:
  1. Profiles followable from Mastodon and the Fediverse via ActivityPub
  2. Artist updates federate across the open web
  3. No need to create an account on Mercury to follow someone — follow from your existing Fediverse account
**Plans**: TBD

### Phase 8: Listening Rooms
**Goal**: Communal discovery — shared real-time listening like sitting with friends playing records
**Depends on**: Phase 5
**Requirements**: LISTEN-01, LISTEN-02
**Success Criteria**:
  1. Create a room, invite people, play music together through synchronized embeds
  2. Room queue: anyone can add to the queue
  3. Chat alongside the music — reactions, conversation, discovery in real time
  4. No video. No screen sharing. Just music and people.
**Plans**: TBD

### Phase 9: Artist Tools
**Goal**: Give artists control without requiring them to do anything — zero-effort by default, full control if claimed
**Depends on**: Phase 5
**Requirements**: ARTIST-01, ARTIST-02, ARTIST-03, ARTIST-04
**Success Criteria**:
  1. Artist claiming with verification ("this profile is me")
  2. Claimed artists get a news dashboard — control tags, description, featured tracks
  3. Auto-pulled news from artist social media (zero-effort tier, works before claiming)
  4. Static site generator for self-hosted artist pages — publishes to free hosting, feeds data back to the index
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Data Pipeline | done | Complete | 2026-02-14 |
| 2. Search + Embeds | 4/5 | In progress | - |
| 3. Desktop + Distribution | 0/TBD | Not started | - |
| 4. Discovery Engine | 0/TBD | Not started | - |
| 5. Social Layer | 0/TBD | Not started | - |
| 6. Blog / Curator Tools | 0/TBD | Not started | - |
| 7. Interoperability | 0/TBD | Not started | - |
| 8. Listening Rooms | 0/TBD | Not started | - |
| 9. Artist Tools | 0/TBD | Not started | - |

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

### Stage 3 — Identity (alongside Phase 4-5: Discovery + Social)
- [ ] Taste Fingerprint prints — personalized posters generated from user collections (needs fingerprint feature)
- [ ] Discovery tokens — collectible coins/enamel pins with QR codes linking to curated discoveries
- [ ] Supporter Wall integrated into the platform
- [ ] Tote bags (record store bags for supporters)

### Stage 4 — Community (alongside Phase 5-6: Social + Blog)
- [ ] Artist collaboration merch — discovered artists create artwork for merch runs (artist gets paid)
- [ ] Milestone drops — limited edition merch when major versions ship
- [ ] Full print-on-demand merch store
- [ ] Affiliate links for artist self-hosting providers
