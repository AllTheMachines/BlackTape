# Roadmap: Mercury

## Overview

Mercury is a desktop app that becomes a place. The internet is where it gets information. Your machine is where everything lives. The community lives everywhere.

Build order: data pipeline → web gateway → desktop app → local player → AI → discovery mechanics → knowledge base → underground aesthetic → community foundation → communication → scene building → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10.1 (shipped 2026-02-23)
- 📋 **v1.1** — Phases 11–15 + Phase 0 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–10.1) — SHIPPED 2026-02-23</summary>

- [x] Phase 1: Data Pipeline — completed 2026-02-14
- [x] Phase 2: Web Gateway (5/5 plans) — completed 2026-02-15
- [x] Phase 3: Desktop App Foundation (5/5 plans) — completed 2026-02-21
- [x] Phase 4: Local Music Player (5/5 plans) — completed 2026-02-17
- [x] Phase 5: AI Foundation (7/7 plans) — completed 2026-02-21
- [x] Phase 6: Discovery Engine (7/7 plans) — completed 2026-02-20
- [x] Phase 06.1: Affiliate Buy Links (5/5 plans) — completed 2026-02-21
- [x] Phase 7: Knowledge Base (7/7 plans) — completed 2026-02-21
- [x] Phase 07.1: Integration Hotfixes (3/3 plans) — completed 2026-02-21
- [x] Phase 07.2: Playback → Taste Signal (3/3 plans) — completed 2026-02-21
- [x] Phase 07.3: Requirements & Verification Cleanup (3/3 plans) — completed 2026-02-21
- [x] Phase 8: Underground Aesthetic (4/4 plans) — completed 2026-02-21
- [x] Phase 9: Community Foundation (6/6 plans) — completed 2026-02-22
- [x] Phase 10: Communication Layer (9/9 plans) — completed 2026-02-23
- [x] Phase 10.1: Communication Hotfixes (2/2 plans) — completed 2026-02-23

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 📋 v1.1 (Planned)

- [x] **Phase 11: Scene Building** — AI scene detection, label collectives, community-driven creation tools (completed 2026-02-23)
- [ ] **Phase 12: Curator / Blog Tools** — Embeddable widgets, attribution, RSS, blog revival
- [ ] **Phase 13: Interoperability** — ActivityPub, Fediverse federation, RSS for everything
- [ ] **Phase 14: Listening Rooms** — Shared real-time listening with synchronized embeds
- [ ] **Phase 15: Artist Tools** — Claiming, dashboard, auto-news, self-hosted site generator

## Phase Details (v1.1)

### Phase 11: Scene Building
**Goal**: AI detects emerging scenes from collective listening + tag patterns. Scenes surface in a dedicated directory with anti-rich-get-richer tiering. Users can follow scenes and suggest artists. No creation tools ship this phase — scenes emerge automatically.
**Depends on**: Phase 10 (communication), Phase 5 (AI for scene detection)
**Requirements**: COMM-07, COMM-08
**Success Criteria**:
  1. AI scene awareness — detects emerging scenes from collective listening patterns
  2. Label collectives — skipped (deferred: too vague without organic community)
  3. Community-requested creation tools — feature request vote counter ships; actual tools come later
  4. The underground is alive — scenes exist in Mercury that exist nowhere else
**Plans**: 4 plans

Plans:
- [ ] 11-01-PLAN.md — taste.db schema (4 scene tables) + 8 Tauri commands
- [ ] 11-02-PLAN.md — scene detection algorithm module + AI description prompt
- [ ] 11-03-PLAN.md — /scenes directory and /scenes/[slug] detail routes
- [ ] 11-04-PLAN.md — follow/suggest/feature-request interactions + nav + web API + docs

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
**Plans**: 4 plans

Plans:
- [ ] 12-01-PLAN.md — Install feed+qrcode deps + 4 RSS/Atom feed endpoints + RssButton component
- [ ] 12-02-PLAN.md — Embed layout + artist/collection embed routes + embed snippet UI + QR code
- [ ] 12-03-PLAN.md — Curator attribution: D1 table, /api/curator-feature, artist page display
- [ ] 12-04-PLAN.md — New & Rising page + /api/rss/new-rising feed + ARCHITECTURE.md + user-manual.md docs

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

## Parallel Track: Phase 0 (Sustainability)

Runs alongside everything else. Not blocking any phase. Rolls out in stages as features make new support channels possible.

### Stage 1 — Foundation
- [ ] GitHub Sponsors profile
- [ ] Ko-fi page (one-time micro-donations)
- [ ] Open Collective (transparent group funding)
- [ ] Public finances page in the app (what it costs, what comes in, where it goes)
- [ ] Small, permanent footer link: "Keep this alive" — not a banner, not a modal
- [ ] NLnet Foundation grant application
- [ ] Build log / dev updates as public content

### Stage 2 — Story
- [ ] Patreon with behind-the-scenes content
- [ ] Gentle donation prompt on database download page
- [ ] Liner Notes backer credits page
- [ ] Sticker and patch designs (print-on-demand)

### Stage 3 — Identity (alongside Phase 8-9)
- [ ] Taste Fingerprint prints — personalized posters generated from user collections
- [ ] Discovery tokens — collectible coins/enamel pins with QR codes
- [ ] Supporter Wall integrated into the platform
- [ ] Tote bags

### Stage 4 — Community (alongside Phase 11-12)
- [ ] Artist collaboration merch
- [ ] Milestone drops — limited edition merch when major versions ship
- [ ] Full print-on-demand merch store
- [ ] Affiliate links for artist self-hosting providers

## Deferred

| Feature | Why Deferred | Revisit When |
|---------|-------------|-------------|
| Cross-platform playlist sync | Platform ToS risks, fragile APIs | Core product is solid, legal clarity exists |
| Remote streaming (phone ← home) | NAT traversal, relay servers, infrastructure complexity | Desktop + player mature, users ask for it |
| Database diff-based updates | Full replacement is simpler; diff sizes unknown until MusicBrainz weekly dump testing | Full replacement feels too large for users |
| Licensing model | Open source vs source-available vs custom — depends on sustainability trajectory | When sustainability model is clearer |
| Writing/discussion features | Community should ask for creation tools, not have them imposed | Phase 11+ if community requests |

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Data Pipeline | v1.0 | done | Complete | 2026-02-14 |
| 2. Web Gateway | v1.0 | 5/5 | Complete | 2026-02-15 |
| 3. Desktop App Foundation | v1.0 | 5/5 | Complete | 2026-02-21 |
| 4. Local Music Player | v1.0 | 5/5 | Complete | 2026-02-17 |
| 5. AI Foundation | v1.0 | 7/7 | Complete | 2026-02-21 |
| 6. Discovery Engine | v1.0 | 7/7 | Complete | 2026-02-20 |
| 06.1. Affiliate Buy Links | v1.0 | 5/5 | Complete | 2026-02-21 |
| 7. Knowledge Base | v1.0 | 7/7 | Complete | 2026-02-21 |
| 07.1. Integration Hotfixes | v1.0 | 3/3 | Complete | 2026-02-21 |
| 07.2. Playback → Taste Signal | v1.0 | 3/3 | Complete | 2026-02-21 |
| 07.3. Requirements & Verification Cleanup | v1.0 | 3/3 | Complete | 2026-02-21 |
| 8. Underground Aesthetic | v1.0 | 4/4 | Complete | 2026-02-21 |
| 9. Community Foundation | v1.0 | 6/6 | Complete | 2026-02-22 |
| 10. Communication Layer | v1.0 | 9/9 | Complete | 2026-02-23 |
| 10.1. Communication Hotfixes | v1.0 | 2/2 | Complete | 2026-02-23 |
| 11. Scene Building | 4/4 | Complete    | 2026-02-23 | - |
| 12. Curator / Blog Tools | 3/4 | In Progress|  | - |
| 13. Interoperability | v1.1 | 0/TBD | Not started | - |
| 14. Listening Rooms | v1.1 | 0/TBD | Not started | - |
| 15. Artist Tools | v1.1 | 0/TBD | Not started | - |
