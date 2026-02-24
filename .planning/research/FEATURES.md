# Feature Research

**Domain:** Mercury v1.3 — ActivityPub federation, listening rooms, artist tools, sustainability
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH (ActivityPub static-site constraints HIGH, listening room sync MEDIUM, artist tools HIGH, sustainability HIGH)

---

## Context

This is a subsequent-milestone research file. Mercury already has: full music search (2.8M artists), artist profiles with embedded players (Bandcamp, Spotify, SoundCloud, YouTube), scenes, Nostr DMs + scene rooms (NIP-17, NIP-28), collections, taste profile, AI recommendations, RSS feeds, buy links from MusicBrainz.

The app is **Tauri desktop only** — no server, no hosting cost, no web backend. This is the central constraint shaping every feature below.

Four feature areas in scope:
1. ActivityPub outbound (artist/scene/collection pages become Fediverse actors)
2. Listening rooms (synchronized embed playback, Nostr-coordinated)
3. Artist tools (stats dashboard, AI auto-news, static site generator)
4. Sustainability (artist support links from MusicBrainz; Mercury funding links; backer credits)

---

## Feature Landscape

### Area 1: ActivityPub Outbound

#### What Users Expect (Table Stakes for "AP outbound")

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fediverse-followable artist actors | If you say "artist pages are AP actors," users expect to paste a handle into Mastodon and follow it | HIGH | Requires: static JSON-LD actor file, WebFinger endpoint (dynamic, NOT static-compatible), inbox for follow/unfollow. The inbox is the wall — you cannot do true AP actors without a server. Mercury has no server. |
| Follow notifications (someone followed this artist) | Users expect Mastodon behavior: follow → receive posts in timeline | HIGH | Requires persistent follower list + signed HTTP delivery to follower inboxes. Not feasible without server. |
| Posts/updates appear in followers' timelines | Core fediverse value: activity streams flow to subscribers | HIGH | Requires inbox delivery + follower DB + HTTP signing. Not feasible without server. |

#### What Mercury Can Actually Deliver (Realistic Table Stakes)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AP-compatible JSON-LD export per artist/scene/collection | Generates a standards-compliant actor document and outbox feed that servers can pull | MEDIUM | Static JSON files — actor.json, outbox.json. Mercury generates these on demand. Fully static, no server needed. Works like an RSS feed that AP servers can poll. |
| Share-to-Fediverse links | Clicking "share" opens Mastodon/Fediverse share intent with artist name + Mercury link | LOW | URL scheme: `https://mastodon.social/share?text=...`. Already a known pattern (Share on Mastodon button). No AP protocol needed. |
| WebFinger-compatible discovery endpoint | Allows AP servers to discover actors by handle (`@artist@mercury.app`) | HIGH | WebFinger REQUIRES dynamic query-parameter handling (`?resource=acct:...`). Cannot be a static file. Needs a server or serverless function. **This is the hard blocker for true AP actors.** |

#### Differentiators (Beyond Baseline)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Export as ActivityPub object" button | Artists can copy their JSON-LD actor and import into any AP-capable server | LOW | Generate JSON file client-side, trigger download. No server needed. Useful for technically savvy artists/admins. |
| Embed AP actor metadata in RSS feeds | Existing RSS feeds include AP-compatible `<link rel="alternate" type="application/activity+json">` headers | LOW | Tiny addition to existing RSS generation. Lets AP crawlers discover the JSON-LD export via existing feeds. |
| Scene/collection as AP Group actor type | Group actors are a recognized AP extension (used by Mastodon groups, Lemmy communities) | MEDIUM | JSON-LD schema extension, standard in AP ecosystem. Good fit for scenes ("Follow this scene on Mastodon"). |

#### Anti-Features (ActivityPub)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full bidirectional AP federation | "Full Mastodon support" | Requires a server with inbox, follower DB, HTTP signing, delivery queue. Contradicts Mercury's $0 infrastructure constraint. A Tauri desktop app cannot serve inboxes. | Generate static AP JSON-LD exports + share-to-Fediverse links. Document that Mercury generates AP data; hosting it is a layer above Mercury. |
| AP server bundled in Tauri sidecar | "Just run a mini AP server locally" | A Fediverse actor must be reachable at a stable domain at all times. A desktop app that's turned off is unreachable. Followers would never receive updates. | Not feasible. The always-on requirement is architectural, not a technical limitation to solve. |
| Per-user AP handles (@steve@mercury.app) | "Every user gets a Fediverse identity" | Requires a shared server with a stable domain for WebFinger. Mercury is desktop-only; no shared server exists. | Pseudonymous Nostr identity (already built). AP identity requires centralized infrastructure. |

---

### Area 2: Listening Rooms

#### Table Stakes (Users Expect These in a Listening Room)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Host controls (play, pause, seek) | If someone is "hosting," guests expect the host's controls to drive what they hear | MEDIUM | Host emits playback commands via Nostr. Guests receive and apply to their local embed. |
| Guest sync to host position | If you join mid-track, you expect to jump to where the host is | MEDIUM | Host broadcasts current timestamp periodically. Guest computes offset on join. |
| Room participant list | Who else is in this room right now | LOW | NIP-38 user status events or NIP-53 presence (kind:10312). Already using NDK. |
| Track/embed identity broadcast | Guests need to know what embed to load (Bandcamp URL, Spotify URI, etc.) | LOW | Host broadcasts embed URL + platform type. Guests load the matching embed. |
| Join link / room share | Rooms are useless if you can't invite anyone | LOW | Nostr event ID or NIP-28 channel ID is the shareable identifier. QR code or copy-link button. |

#### Differentiators (Listening Room)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Queue management (host can queue tracks) | Social listening gets boring without a playlist-like flow | MEDIUM | Host maintains a local queue, broadcasts next-track events. Guests see upcoming tracks. |
| Text chat alongside listening | Real social glue — "what is this bassline??" | LOW | NIP-28 already built for scene rooms. Same channel type can serve listening room chat. |
| Reaction events (emoji pulses) | Lightweight emotional presence without vanity metrics | LOW | Ephemeral Nostr events (kind:1 or ephemeral NIP-16). Don't persist. |
| Guest can suggest next track | Collaborative listening — anyone can nominate | MEDIUM | Guest publishes suggestion event to room channel. Host accepts/rejects. |
| NIP-53 Live Activity tag | Discoverable listening room in Nostr event explorers | LOW | Add kind:30311 wrapper around room session. Already in NIP-53 spec. |

#### Anti-Features (Listening Room)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| True audio sync (same audio samples at same moment) | "We want to hear it together" | Embed iframes don't expose audio clocks. Bandcamp, Spotify, YouTube iframes have no shared time reference API. Perfect sample-level sync is impossible with 3rd-party embeds. | Sync to timestamp (seconds), not audio samples. 1-3 second drift is acceptable social listening. State this clearly in UX. |
| Mercury-hosted audio relay | "Stream the audio through Mercury so everyone hears the same source" | Mercury's core rule: no audio hosting, ever. Running an audio relay contradicts the fundamental architecture and MusicBrainz ToS obligations. | Coordinate playback of existing embeds. The audio always comes from the artist's platform. |
| Listening rooms as Nostr NIP-01 events only | Simple approach: just share a Nostr note with the embed URL | Users can't sync playback position from a static note. The "room" experience requires real-time events. | Use NIP-28 channel (already built) + ephemeral playback events for real-time coordination. |
| Server-based room persistence | "Keep the room alive when the host leaves" | No server, $0 infrastructure constraint. | Rooms are ephemeral by design — when the host disconnects, the room ends. This is a feature, not a bug (mirrors real listening sessions). |

---

### Area 3: Artist Tools

#### Table Stakes (Artists Expect These from "Discovery Stats")

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Search appearance count | "How many times has someone searched and landed on my artist profile?" | MEDIUM | Requires Mercury to track per-artist search impression counts locally (SQLite). Privacy-preserving: never leaves the user's machine. Aggregate only, no individual identities. |
| Profile view count (local) | How often has this artist page been viewed in Mercury | LOW | Simple local increment in SQLite. Same privacy model — local only. |
| Tag rank ("your top tags") | Which tags is this artist most associated with in the Mercury index | LOW | Already computable from existing tag data. Display artist's top 10 tags by weight. |
| Discovery path ("how are people finding this artist") | Which tags, which searches are surfacing this artist | MEDIUM | Requires event logging in SQLite. Store: search query → artist MBID impressions. |
| Export stats as CSV | Artist wants to take the data somewhere | LOW | Generate CSV from SQLite data, trigger file download via Tauri dialog. |

#### Differentiators (Artist Tools)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI auto-news generation | Generate a short "what's happening with this artist" blurb from recent MusicBrainz release data + tags | MEDIUM | Uses existing llama.cpp sidecar (Qwen2.5 3B). Input: artist name, recent releases, top tags. Output: 2-3 sentence news item. Already have the AI infrastructure. |
| "You appeared in X scene" notification | Artist page discovers it's been added to scenes by curators — shows this in artist tools view | LOW | Already have scene membership data. Cross-reference artist MBID against scene memberships. |
| Tag trend graph (30-day sparkline) | Is this artist's niche tag getting more or fewer co-occurrences with other tags | HIGH | Requires historical tag co-occurrence data — not currently stored. Would need schema addition. Consider deferring. |
| Static site generator for artists | Generate a self-hostable HTML site from artist's Mercury data: releases, tags, player embeds, buy links | HIGH | Node.js script (or Tauri command) that takes artist MBID, fetches MusicBrainz data, generates static HTML. Similar to Faircamp but for Mercury data. No audio hosting — embeds only. |

#### Artist Tools — Static Site Generator Detail

This is the most complex sub-feature. What a static site generator for artists should produce:

| Output | Source | Notes |
|--------|--------|-------|
| Artist bio page | MusicBrainz artist data + AI-generated summary | Static HTML, no DB |
| Release discography | MusicBrainz releases API | Rendered at generation time |
| Embedded players | Bandcamp/Spotify/SoundCloud/YouTube URLs from MB relationships | iframes in static HTML |
| Buy links | MB purchase URLs | Already parsed in Mercury |
| Tag cloud | Mercury tag data for artist | Snapshot at generation time |
| RSS feed | Artist releases feed | Static XML, same as Mercury's existing RSS |

Faircamp (precedent) generates fully static, database-free, maintenance-free musician sites from local audio files. Mercury's generator would do the same but from MusicBrainz data + embed URLs (no audio files needed). This is a strong differentiator — no other tool generates a Bandcamp-alternative static site purely from open data.

#### Anti-Features (Artist Tools)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Artist claiming / verification | "Artists should be able to log in and see their own stats" | Mercury has no accounts, no server, no auth system. Artist claiming requires identity verification which requires infrastructure. | Stats are visible to any Mercury user viewing that artist page. No special artist account needed — this is the point. |
| Real-time streaming analytics | "How many people are listening right now" | Mercury has no telemetry, no network calls home, no server. Real-time requires a server. Privacy-first means no tracking. | Local impression counts only. Aggregate, private, device-local. |
| Cross-platform stats aggregation (Spotify + Bandcamp + Mercury) | "One dashboard for all my stats" | Requires OAuth tokens for each platform, ongoing API calls, server-side aggregation. Chartmetric already does this commercially. | Mercury shows Mercury-specific discovery stats only. Clear scope: "your visibility in Mercury, not across the internet." |
| Artist profile editing via Mercury | "Let me update my bio in Mercury" | Mercury is a read view on MusicBrainz data. Writing back to MusicBrainz requires OAuth + MB account. Mercury is not an editor. | Link to MusicBrainz edit page for the artist. "Edit this on MusicBrainz" → external link. |

---

### Area 4: Sustainability

#### Table Stakes (Users Expect These from "Support Artist" Features)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Support links on artist profile (Patreon/Ko-fi/tip) | Any music discovery tool worth using should make it easy to support artists | LOW | MusicBrainz has a "patronage" relationship type (UUID: 6f77d54e-1d81-4e1a-9ea5-37947577151b) for Patreon, Ko-fi, PayPal.me, etc. Already fetching MB relationship URLs for buy links — same code path. |
| Crowdfunding links (Kickstarter/Indiegogo) | Project-based funding campaigns | LOW | MusicBrainz has a "crowdfunding" relationship type. Same fetch path as patronage. |
| "Support Mercury" link in app | Users who love the tool want to know how to give back | LOW | Static link to Ko-fi/Patreon/GitHub Sponsors for the Mercury project. Footer or About screen. |
| Backer credits screen | Recognize people who support Mercury financially | LOW | Static JSON/MD file listing backers. Rendered in About screen. No server needed — update the file when new backers arrive. |

#### Differentiators (Sustainability)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Support this artist" CTA prominence | Don't bury support links — make them visually prominent next to play/buy links | LOW | UI treatment, not engineering. Patronage links at same visual level as "buy on Bandcamp." |
| Multiple support options in one row | Show Patreon + Ko-fi + OpenCollective if all exist for artist | LOW | Already fetching all URLs of each relationship type. Group by type, display all. |
| Mercury backer credits tiers | Distinguish "bought a coffee" from "monthly supporter" | MEDIUM | Requires manual tier tracking in the static backers file. Not automated. Keep it simple at launch. |
| OpenCollective link for Mercury itself | For teams/organizations wanting to support Mercury as an institution | LOW | OpenCollective is specifically for open source collectives. Add alongside Ko-fi/Patreon/GitHub Sponsors. |

#### Anti-Features (Sustainability)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Affiliate commissions on support links | "Mercury could take a small cut of Patreon referrals" | Contradicts the "pure public good" principle. Monetizing artist support flows creates a conflict of interest. Mercury should never profit from directing traffic to artists. | Mercury takes nothing. Support links are untracked direct links. |
| Backer-only features / premium tier | "Give backers early access" | "Everyone gets the same thing" is a core Mercury value. Paid advantages are explicitly out of scope in PROJECT.md. | Backers get their name in the credits. That's the thank-you. No feature gates. |
| In-app payment / tip jar | "Support artists directly through Mercury" | Would require payment processor integration, financial compliance, payout infrastructure. Violates $0 infrastructure constraint. | Link out to where artists already accept support (Patreon, Ko-fi, Bandcamp). Mercury is the pointer, not the payment layer. |
| Auto-generated support link discovery (scraping) | "Find support links even if they're not in MusicBrainz" | Web scraping artist websites for Patreon links is unreliable, legally grey, and computationally expensive. | Use MusicBrainz relationship data only. If an artist's Patreon isn't in MusicBrainz, the right fix is for someone to add it to MusicBrainz. Contribute to the commons. |

---

## Feature Dependencies

```
ActivityPub Outbound
    └──requires──> MusicBrainz artist data (already fetched live)
    └──requires──> Existing RSS feed infrastructure (reuse patterns)
    └──enables──> Share-to-Fediverse (low-hanging fruit, do first)
    └──blocks on──> WebFinger (needs server — cannot do true AP actors without infrastructure)

Listening Rooms
    └──requires──> NIP-28 scene rooms (already built — reuse channel infrastructure)
    └──requires──> NDK (Nostr Dev Kit — already integrated)
    └──requires──> Embedded players in artist profiles (already built)
    └──enhances──> Scene rooms (listening rooms are a type of scene activity)

Artist Tools — Stats Dashboard
    └──requires──> SQLite schema addition (impression logging tables)
    └──requires──> Search/browse event hooks (log impressions on every search result)
    └──enhances──> Artist profile pages (stats display alongside profile data)

Artist Tools — AI Auto-News
    └──requires──> llama.cpp sidecar (already built, Qwen2.5 3B)
    └──requires──> MusicBrainz releases data (already fetched live)
    └──enhances──> Artist profile pages (news blurb displayed there)

Artist Tools — Static Site Generator
    └──requires──> MusicBrainz API integration (already built)
    └──requires──> Buy link + embed URL parsing (already built)
    └──independent──> (can be a standalone Node.js script or Tauri command)

Sustainability — Artist Support Links
    └──requires──> MusicBrainz relationship URL fetching (already built for buy links)
    └──enhances──> Artist profile pages (support links section)

Sustainability — Mercury Funding Links
    └──independent──> (static content in About screen)

Sustainability — Backer Credits
    └──independent──> (static JSON file rendered in About screen)
```

### Dependency Notes

- **Support links reuse buy-link code.** MusicBrainz relationship fetching already handles buy/purchase links. Patronage/crowdfunding links use the same `type` field filter — trivial to extend.
- **Listening rooms reuse NIP-28.** Scene rooms are already built on NIP-28. Listening rooms are NIP-28 channels with a specific convention for playback-control event types. The infrastructure is there.
- **AI auto-news reuses the sidecar.** The llama.cpp sidecar is already running for recommendations. Auto-news is a new prompt template, not new infrastructure.
- **ActivityPub is blocked on the inbox problem.** True AP actors require a server. Mercury must scope this to static JSON-LD export + share links only — not full federation. This is the single most important constraint to set clearly before building.
- **Stats dashboard requires new SQLite tables.** This is the only Area 3 feature that requires a schema migration. Plan it carefully to avoid breaking existing data.

---

## MVP Definition for v1.3

### Launch With (v1.3 Core)

Minimum viable v1.3 — what's needed to call the milestone "The Open Network" and mean it.

- [ ] **Artist support links** — Patronage + crowdfunding URLs from MusicBrainz displayed on artist profiles. Trivially low complexity, high user value. Do this first.
- [ ] **Share-to-Fediverse links** — "Share on Mastodon" button on artist/scene pages. Zero AP protocol work. Pure UX. Do this alongside support links.
- [ ] **Mercury funding links** — Ko-fi/Patreon/GitHub Sponsors links in About screen. Static content, one afternoon.
- [ ] **Backer credits screen** — Static JSON → rendered credits in About. One afternoon.
- [ ] **Listening room host controls + guest sync** — NIP-28 channel + playback events. Host broadcasts play/pause/seek, guests sync. Core room experience.
- [ ] **Listening room participant list** — NIP-53 presence or NIP-38 status. Know who's in the room.
- [ ] **Artist stats: search impressions + profile views** — SQLite impression logging. Local only. Schema migration required.
- [ ] **ActivityPub JSON-LD export** — Static actor.json and outbox.json generated on demand, downloadable. Not true AP federation, but AP-compatible data.
- [ ] **AI auto-news for artist profiles** — Prompt existing sidecar with artist name + recent releases + tags. 2-3 sentence news blurb on artist page.

### Add After Validation (v1.3.x)

Features to add once core is stable.

- [ ] **Listening room queue management** — Host queues tracks, guests see upcoming. Depends on rooms being stable.
- [ ] **Listening room chat** — NIP-28 channel messages alongside playback. May already work if using existing scene room UI.
- [ ] **Artist tools static site generator** — Node.js script or Tauri command. High value, higher complexity. Validate demand first.
- [ ] **Listening room reactions** — Ephemeral emoji events. Nice-to-have social glue.

### Future Consideration (v1.4+)

Features to defer until product-market fit with v1.3 is established.

- [ ] **AP WebFinger + true actor federation** — Requires infrastructure decision (hosted server, or Mercury hosting partner). Not feasible under $0 constraint without rethinking the architecture.
- [ ] **Tag trend sparklines in artist tools** — Requires historical tag co-occurrence tracking (new schema, significant data work).
- [ ] **NIP-53 Live Activity wrapper for listening rooms** — Makes rooms discoverable in Nostr event explorers. Nice but not critical at launch.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Artist support links (patronage/crowdfunding URLs) | HIGH | LOW (reuses existing MB URL parsing) | P1 |
| Share-to-Fediverse links | HIGH | LOW (URL scheme button) | P1 |
| Mercury funding links (Ko-fi/Patreon/GitHub Sponsors) | MEDIUM | LOW (static content) | P1 |
| Backer credits screen | MEDIUM | LOW (static JSON) | P1 |
| Listening room host controls + guest sync | HIGH | MEDIUM (Nostr events + embed API) | P1 |
| Artist stats: impressions + profile views | MEDIUM | MEDIUM (SQLite schema migration + event hooks) | P1 |
| ActivityPub JSON-LD export (static) | MEDIUM | MEDIUM (JSON-LD schema work) | P2 |
| AI auto-news on artist profiles | HIGH | LOW (reuses sidecar, new prompt only) | P1 |
| Listening room participant list | MEDIUM | LOW (NIP-38 or NIP-53) | P2 |
| Listening room chat integration | MEDIUM | LOW (NIP-28 already built) | P2 |
| Artist static site generator | HIGH (for artists) | HIGH (new Node.js pipeline) | P2 |
| Listening room queue | MEDIUM | MEDIUM | P3 |
| Listening room reactions | LOW | LOW | P3 |
| Tag trend sparklines | MEDIUM | HIGH (schema + data work) | P3 |
| AP WebFinger + true federation | HIGH (aspirational) | VERY HIGH (requires server infrastructure) | Defer |

**Priority key:**
- P1: Ship in v1.3 core milestone
- P2: Ship in v1.3 if P1 is stable; otherwise v1.3.x
- P3: Nice to have, future milestone
- Defer: Architectural prerequisite not met; requires infrastructure decision

---

## Desktop-App Constraint Summary

Mercury is **Tauri desktop only**. This has specific implications per feature area:

| Feature Area | Desktop Constraint | Impact |
|---|---|---|
| ActivityPub outbound | Cannot serve HTTP (no always-on server). Cannot do WebFinger. | Scope to static JSON-LD export + share links only. No true AP actors. |
| Listening rooms | Cannot run a relay. Must piggyback on public Nostr relays (already doing this). | Rooms are relay-dependent — same as existing Nostr features. Acceptable. |
| Artist stats | No telemetry leaving the machine. Stats are local-only. | Good for privacy. Clear user expectation: "your Mercury, not global Mercury." |
| AI auto-news | llama.cpp sidecar already runs locally. | Zero new infrastructure. Reuse existing AI pipeline. |
| Static site generator | Can generate files locally, output via Tauri `save_dialog`. | Node.js script or Tauri command. Output is a folder of HTML/CSS. User deploys it. |
| Sustainability links | Static content, no server needed. | Zero constraint. Simplest area of all. |

---

## Sources

- [W3C ActivityPub Specification](https://www.w3.org/TR/activitypub/) — Actor, inbox, outbox requirements. Confidence: HIGH.
- [Paul Kinlan — Adding ActivityPub to a static site](https://paul.kinlan.me/adding-activity-pub-to-your-static-site/) — Confirms WebFinger cannot be fully static; requires serverless function for dynamic parameter handling. Confidence: HIGH.
- [ActivityPub on a mostly static website (elvery.net)](https://elvery.net/drzax/activitypub-on-a-mostly-static-website/) — Practical account of static site AP limitations. Confirms inbox is the hard blocker. Confidence: HIGH.
- [Manyfold ActivityPub architecture](https://manyfold.app/technology/activitypub.html) — Non-social app extending AP. Dual-posting strategy (native + Notes for Mastodon compat). Confidence: HIGH.
- [NIP-53 — Live Activities](https://github.com/nostr-protocol/nips/blob/master/53.md) — kind:30311 live streaming event, kind:10312 room presence. Confirmed for listening room architecture. Confidence: HIGH.
- [NIP-38 — User Statuses](https://github.com/nostr-protocol/nips/blob/master/38.md) — Music listening status events. Confidence: HIGH.
- [MusicBrainz Artist-URL relationship types](https://musicbrainz.org/relationships/artist-url) — Patronage (UUID: 6f77d54e-1d81-4e1a-9ea5-37947577151b) and crowdfunding relationship types confirmed. Confidence: HIGH.
- [Faircamp static site generator](https://codeberg.org/simonrepp/faircamp) — Precedent for static musician sites from audio files. Mercury's generator would do same from open data + embed URLs. Confidence: HIGH.
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) — Programmatic embed control available. Confidence: HIGH.
- Training data: Nostr NDK, NIP-17 (encrypted DMs), NIP-28 (scene rooms). Already integrated in Mercury v1.0. Confidence: HIGH (existing code, not training-data assumption).

---
*Feature research for: Mercury v1.3 — The Open Network*
*Researched: 2026-02-24*
