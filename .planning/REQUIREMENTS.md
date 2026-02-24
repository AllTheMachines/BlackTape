# Requirements: Mercury v1.3 — The Open Network

**Defined:** 2026-02-24
**Core Value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.

## v1.3 Requirements

### SUST — Sustainability

Connect Mercury to the open web's funding ecosystem and make the project's own sustainability visible.

- [x] **SUST-01**: User can see Patreon/Ko-fi/crowdfunding links for artists on artist pages, visually distinguished from info/social links
- [x] **SUST-02**: User can share any artist or scene page to the Fediverse via a pre-populated Mastodon share link (URL-scheme only, no AP protocol)
- [x] **SUST-03**: User can view Mercury project funding links (Ko-fi, GitHub Sponsors, Open Collective) in the About screen
- [x] **SUST-04**: User can view a backer credits screen listing Mercury supporters, fetched from a Nostr list event

### STAT — Artist Stats Dashboard

Give users insight into how discoverable any artist is within Mercury's index.

- [ ] **STAT-01**: User can view a discovery stats page for any artist showing their uniqueness score, rarest tag, and tag distribution
- [ ] **STAT-02**: User can see how many times they have personally visited an artist's profile page (local count)

### NEWS — AI Auto-News

AI-generated artist summaries grounded in MusicBrainz catalog data — no hallucinations, clearly labeled.

- [ ] **NEWS-01**: User can see a 2-3 sentence AI-generated summary on artist pages derived from MusicBrainz release data (albums, years, genres)
- [ ] **NEWS-02**: AI-generated content is visibly labeled as "AI summary based on MusicBrainz data" — never presented as editorial or news
- [ ] **NEWS-03**: AI summary is cached per artist in taste.db and regenerated on demand by the user

### SITE — Static Site Generator

Export a self-contained artist page anyone can host anywhere — no Mercury dependency, no server required.

- [ ] **SITE-01**: User can generate a self-contained HTML/CSS artist page for any artist and export it to a user-selected local directory
- [ ] **SITE-02**: Generated site includes artist bio (from Wikipedia/MusicBrainz), top tags, discography with release covers, and platform buy/stream links
- [ ] **SITE-03**: Generated site has zero runtime dependency on Mercury, external APIs, or any hosted service for basic display
- [ ] **SITE-04**: Generated HTML is sanitized — artist names and bios with special characters or markup cannot inject scripts

### ROOM — Listening Rooms

Synchronized YouTube listening with a jukebox model — host decides what plays, guests can suggest.

- [ ] **ROOM-01**: User can create a listening room associated with a Nostr scene channel
- [ ] **ROOM-02**: Host can set the active YouTube video that all room participants see loaded in their player
- [ ] **ROOM-03**: Guests can suggest YouTube videos to the room's jukebox queue
- [ ] **ROOM-04**: Host can approve a suggestion from the queue, making it the active video for all participants
- [ ] **ROOM-05**: User can see the list of current participants in a room

### APUB — ActivityPub Outbound

Static ActivityPub actor export — generate files the user self-hosts, making their Mercury curation followable from Mastodon.

- [ ] **APUB-01**: User can configure an ActivityPub actor identity (handle, display name, hosting URL) in Settings
- [ ] **APUB-02**: User can export AP actor files (actor.json, webfinger.json, outbox.json) to a local directory for self-hosting
- [ ] **APUB-03**: Exported AP actor is valid and followable from Mastodon/Fediverse instances when uploaded to the configured hosting URL

---

## Future Requirements (v1.4+)

### Interoperability (deeper)

- **APUB-04**: User can receive Fediverse follow notifications (requires hosted serverless inbox function)
- **APUB-05**: Mercury auto-publishes new artist discoveries and scene follows as AP activities to followers

### Listening Rooms (expanded)

- **ROOM-06**: Listening rooms support multi-platform embeds (Bandcamp, Spotify) when platform embed APIs allow programmatic control
- **ROOM-07**: Room activity visible in Nostr discovery (NIP-53 Live Activities)

### Artist Tools (extended)

- **STAT-03**: Artist stats include tag trend history (requires historical co-occurrence schema)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full bidirectional AP federation (live inbox) | Requires always-on server — contradicts $0/desktop constraint |
| Position-level audio sync in listening rooms | Iframe API limitation: Bandcamp has no API, Spotify requires Premium OAuth |
| Multi-platform listening rooms (non-YouTube) | YouTube chosen for catalog breadth; other platforms have iframe limitations |
| Artist claiming / verified accounts | Mercury has no auth, no server, no identity verification infrastructure |
| Cross-user / global artist statistics | Local-only by design — no telemetry, no data leaves the machine |
| Audio hosting of any kind | Mercury's core rule — audio lives on artist infrastructure |
| Affiliate commissions on support links | Conflict of interest with the open/transparent ethos |

---

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUST-01 | Phase 16 | Complete |
| SUST-02 | Phase 16 | Complete |
| SUST-03 | Phase 16 | Complete |
| SUST-04 | Phase 16 | Complete |
| STAT-01 | Phase 17 | Pending |
| STAT-02 | Phase 17 | Pending |
| NEWS-01 | Phase 18 | Pending |
| NEWS-02 | Phase 18 | Pending |
| NEWS-03 | Phase 18 | Pending |
| SITE-01 | Phase 19 | Pending |
| SITE-02 | Phase 19 | Pending |
| SITE-03 | Phase 19 | Pending |
| SITE-04 | Phase 19 | Pending |
| ROOM-01 | Phase 20 | Pending |
| ROOM-02 | Phase 20 | Pending |
| ROOM-03 | Phase 20 | Pending |
| ROOM-04 | Phase 20 | Pending |
| ROOM-05 | Phase 20 | Pending |
| APUB-01 | Phase 21 | Pending |
| APUB-02 | Phase 21 | Pending |
| APUB-03 | Phase 21 | Pending |

**Coverage:**
- v1.3 requirements: 21 total
- Mapped to phases: 21 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 — traceability filled after roadmap creation (Phases 16–21)*
