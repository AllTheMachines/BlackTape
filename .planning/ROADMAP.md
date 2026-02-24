# Roadmap: Mercury

## Overview

Mercury is a desktop app that becomes a place. The internet is where it gets information. Your machine is where everything lives. The community lives everywhere.

Build order: data pipeline → desktop app → local player → AI → discovery mechanics → knowledge base → underground aesthetic → community foundation → communication → scene building → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10.1 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** — Phases 11–12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** — Phases 13–15 (shipped 2026-02-24)
- 🚧 **v1.3 The Open Network** — Phases 16–21 (in progress)

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

<details>
<summary>✅ v1.1 Scene Building + Curator Tools (Phases 11–12) — SHIPPED 2026-02-23</summary>

- [x] **Phase 11: Scene Building** — AI scene detection, scene directory, follow/suggest/vote interactions (4/4 plans, completed 2026-02-23)
- [x] **Phase 12: Curator / Blog Tools** — RSS feeds, embeddable widgets, curator attribution, New & Rising page (4/4 plans, completed 2026-02-23)

Note: Original Phases 13–15 (Interoperability, Listening Rooms, Artist Tools) deferred — became v1.3 Phases 16–21.

</details>

<details>
<summary>✅ v1.2 Zero-Click Confidence (Phases 13–15) — SHIPPED 2026-02-24</summary>

- [x] **Phase 13: Foundation Fixes** — Console capture, data-ready signals on D3, NProgress navigation indicator (3/3 plans, completed 2026-02-24)
- [x] **Phase 14: Tauri E2E Testing** — Playwright CDP runner, fixture DB (15 artists), 12 E2E tests (completed 2026-02-24)
- [x] **Phase 15: Navigation Flows + Rust Unit Tests** — 4 flow tests, 22 Rust unit tests, pre-commit hook (completed 2026-02-24)

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 The Open Network (Phases 16–21)

**Milestone Goal:** Connect Mercury to the open web — sustainability infrastructure, artist tools (stats/auto-news/site generator), synchronized listening rooms, and ActivityPub federation export.

- [x] **Phase 16: Sustainability Links** — Artist support links, share-to-Fediverse, Mercury funding screen, backer credits (completed 2026-02-24)
- [ ] **Phase 17: Artist Stats Dashboard** — Discoverability stats page and personal visit count per artist
- [ ] **Phase 18: AI Auto-News** — MusicBrainz-grounded AI summary on artist pages, cached, labeled
- [ ] **Phase 19: Static Site Generator** — Export a self-contained artist HTML page for self-hosting
- [ ] **Phase 20: Listening Rooms** — Host-controlled synchronized YouTube embed via Nostr coordination
- [ ] **Phase 21: ActivityPub Outbound** — Static AP actor export for self-hosted Fediverse presence

---

## Phase Details

### Phase 16: Sustainability Links
**Goal**: Users can support artists and Mercury through visible, non-intrusive funding links that respect the open ethos
**Depends on**: Phase 15 (existing link pipeline in `categorize.ts`)
**Requirements**: SUST-01, SUST-02, SUST-03, SUST-04
**Success Criteria** (what must be TRUE):
  1. User can see Patreon/Ko-fi/crowdfunding links on artist pages, visually distinct from info and social links
  2. User can share any artist or scene page to Mastodon via a pre-populated share link (URL-scheme only)
  3. User can view Mercury's own Ko-fi, GitHub Sponsors, and Open Collective links in the About screen
  4. User can open a backer credits screen listing Mercury supporters fetched from a Nostr list event
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md — Artist support links section (SUST-01) + Mastodon share button on artist and scene pages (SUST-02)
- [ ] 16-02-PLAN.md — About screen support section (SUST-03) + Backer credits /backers route with Nostr fetch (SUST-04)

### Phase 17: Artist Stats Dashboard
**Goal**: Users can see how discoverable any artist is within Mercury's index and how much they personally engage with them
**Depends on**: Phase 16 (milestone flow; architecturally independent)
**Requirements**: STAT-01, STAT-02
**Success Criteria** (what must be TRUE):
  1. User can open a stats page for any artist showing uniqueness score, rarest tag, and tag distribution
  2. User can see a personal visit count for an artist that increments each time they visit that artist's profile
  3. Stats are derived entirely from local SQLite — no external API calls triggered by the stats page load
**Plans**: 2 plans

Plans:
- [ ] 17-01-PLAN.md — Rust visit tracking backend + tag distribution query + ArtistStats.svelte component
- [ ] 17-02-PLAN.md — +page.svelte tab integration (Overview/Stats tabs) + test suite manifest entries

### Phase 18: AI Auto-News
**Goal**: Artist pages show a grounded AI summary derived from MusicBrainz catalog data — never invented, always labeled
**Depends on**: Phase 17 (artist data context is stable)
**Requirements**: NEWS-01, NEWS-02, NEWS-03
**Success Criteria** (what must be TRUE):
  1. User sees a 2–3 sentence AI-generated summary on artist pages drawn from MusicBrainz release data (albums, years, genres)
  2. AI content is always labeled "AI summary based on MusicBrainz data" — no editorial presentation
  3. User can trigger a regeneration of the summary on demand; result is cached per artist in taste.db
**Plans**: TBD

### Phase 19: Static Site Generator
**Goal**: Any artist page in Mercury can be exported as a self-contained HTML file the artist can host anywhere with zero Mercury dependency
**Depends on**: Phase 18 (artist data enrichment complete)
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. User can click a "Generate site" action on any artist page and export an HTML/CSS folder to a user-chosen local directory
  2. Generated site displays artist bio, top tags, discography with release covers, and platform buy/stream links
  3. Generated site renders correctly in a browser with no internet connection and no Mercury running
  4. Artist names and bio text containing HTML special characters or markup do not produce script injection in the generated output
**Plans**: TBD

### Phase 20: Listening Rooms
**Goal**: Users can host or join a synchronized listening room where the host controls which YouTube video plays for all participants
**Depends on**: Phase 16 (Nostr infrastructure validated; architecturally independent of Phases 17–19)
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05
**Success Criteria** (what must be TRUE):
  1. User can create a listening room associated with a Nostr scene channel
  2. Host can set the active YouTube video; all room participants see the same embed URL loaded in their player
  3. Guests can submit YouTube video suggestions to a visible jukebox queue
  4. Host can approve a suggestion from the queue, making it the active video for all participants
  5. User can see the list of current participants in a room
**Plans**: TBD

### Phase 21: ActivityPub Outbound
**Goal**: Users can configure and export a valid ActivityPub actor as static files they self-host, making their Mercury curation followable from Mastodon
**Depends on**: Phase 20 (all preceding phases shipped)
**Requirements**: APUB-01, APUB-02, APUB-03
**Success Criteria** (what must be TRUE):
  1. User can configure an AP actor identity (handle, display name, hosting URL) in Settings
  2. User can export actor.json, webfinger.json, and outbox.json to a local directory via a file picker dialog
  3. When the exported files are uploaded to the configured hosting URL, the actor is followable from a Mastodon instance
**Plans**: TBD

---

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
| Web search / Cloudflare D1 | Pivoted to Tauri-desktop-only (2026-02-24) — maintenance overhead, no offline-first, no AI | Desktop is the product; web may return as read-only |
| API Contract Layer | Replaced by Tauri E2E — more value to test the actual running app first | v1.3 |
| Cross-platform playlist sync | Platform ToS risks, fragile APIs | Core product is solid, legal clarity exists |
| Remote streaming (phone ← home) | NAT traversal, relay servers, infrastructure complexity | Desktop + player mature, users ask for it |
| Database diff-based updates | Full replacement is simpler; diff sizes unknown until MusicBrainz weekly dump testing | Full replacement feels too large for users |
| Licensing model | Open source vs source-available vs custom — depends on sustainability trajectory | When sustainability model is clearer |
| Writing/discussion features | Community should ask for creation tools, not have them imposed | Phase 11+ if community requests |
| AP WebFinger + live Fediverse follow | Requires always-on server — contradicts $0/desktop constraint | v1.4 serverless Worker |
| Position-level audio sync in listening rooms | Iframe API limitation — Bandcamp/Spotify/SoundCloud have no usable sync API | Platforms open their APIs |
| Multi-platform listening rooms | YouTube chosen for catalog breadth; other platforms have iframe limitations | v1.4+ |
| Cross-user / global artist statistics | Local-only by design — no telemetry, no data leaves the machine | Never (by design) |

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
| 11. Scene Building | v1.1 | 4/4 | Complete | 2026-02-23 |
| 12. Curator / Blog Tools | v1.1 | 4/4 | Complete | 2026-02-23 |
| 13. Foundation Fixes | v1.2 | 3/3 | Complete | 2026-02-24 |
| 14. Tauri E2E Testing | v1.2 | done | Complete | 2026-02-24 |
| 15. Navigation Flows + Rust Unit Tests | v1.2 | done | Complete | 2026-02-24 |
| 16. Sustainability Links | 2/2 | Complete    | 2026-02-24 | - |
| 17. Artist Stats Dashboard | 1/2 | In Progress|  | - |
| 18. AI Auto-News | v1.3 | 0/TBD | Not started | - |
| 19. Static Site Generator | v1.3 | 0/TBD | Not started | - |
| 20. Listening Rooms | v1.3 | 0/TBD | Not started | - |
| 21. ActivityPub Outbound | v1.3 | 0/TBD | Not started | - |
