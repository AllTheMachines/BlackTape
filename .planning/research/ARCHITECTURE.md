# Architecture Research

**Domain:** v1.3 feature integration — ActivityPub outbound, Nostr listening rooms, artist tools, sustainability links
**Researched:** 2026-02-24
**Confidence:** HIGH for Nostr patterns (codebase verified), MEDIUM for ActivityPub desktop approach (no direct precedent found, pattern derived from static AP implementations), HIGH for artist tools and sustainability (pure internal extension of existing patterns)

---

## System Overview

Mercury v1.3 adds four feature areas to an existing Tauri 2.0 desktop app. The architecture challenge is that three of these features involve "reaching out" to the open web — ActivityPub federation, Nostr coordination, and MusicBrainz link extensions — from within a desktop app that has no externally-accessible server.

The core architectural constraint that shapes all v1.3 decisions:

**Mercury is a Tauri desktop app. It has no public IP, no DNS entry, no server. The world cannot reach it. It can only reach out.**

This means:
- ActivityPub outbound = generate static JSON-LD files that the user hosts, OR proxy via a relay endpoint
- Listening rooms = Nostr-coordinated (relay-mediated, no P2P required)
- Artist tools and sustainability = purely local reads from existing data sources

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Mercury Desktop (v1.3)                          │
│                                                                        │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │  SvelteKit UI   │  │  Tauri (Rust)  │  │   Existing Subsystems │   │
│  │                 │  │                │  │   - Scanner/library   │   │
│  │  + AP Export UI │  │  + stats cmds  │  │   - taste.db/mercury  │   │
│  │  + Listening Rm │  │  + file write  │  │   - AI sidecar        │   │
│  │  + Artist Tools │  │  + axum server │  │   - NDK/Nostr         │   │
│  │  + Sustainability│  │    (optional)  │  │   - MusicBrainz fetch │   │
│  └────────┬────────┘  └───────┬────────┘  └──────────────────────┘   │
│           │                   │                                        │
│      NDK (Nostr)         taste.db / mercury.db                        │
│           │                                                            │
└───────────┼────────────────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────────┐
     │         Nostr Relay Pool             │
     │  wss://nos.lol, relay.damus.io, ...  │
     │                                      │
     │  Listening rooms: kind:30311 events  │
     │  Now-playing: kind:30315 events      │
     └─────────────────────────────────────┘

     ActivityPub outbound (offline-generated files):
     User uploads AP JSON-LD to their own hosting
     OR Mercury proxies through a minimal relay endpoint
```

---

## Feature Architecture by Area

### 1. ActivityPub Outbound

#### The Desktop Constraint

ActivityPub requires that the Fediverse be able to send HTTP GET to an actor endpoint and HTTP POST to an inbox. A desktop app cannot serve these — it has no public URL. There are two viable patterns:

**Pattern A — Static File Export (Recommended)**
Mercury generates AP JSON-LD files to disk. The user uploads them to their own web hosting (Bandcamp pages, Neocities, GitHub Pages, any static host). Mercury acts as a "build tool" for AP identity, not a live server.

This is the same pattern used by static site AP implementations (maho.dev guide, lesspub). The approach is used by Mastodon-compatible blogs. It does not require inbox handling for basic Fediverse follow — followers will follow the actor, and the actor's outbox delivers updates they subscribed to.

**Pattern B — Relay Endpoint (Future)**
Mercury could POST to a lightweight relay service (e.g., a simple Cloudflare Worker) that holds the actor files and forwards inbox POSTs to a Nostr event. This is out of scope for v1.3 — it requires infrastructure.

#### Required Files for AP Actor (Pattern A)

A Fediverse-followable actor needs five static files:

| File | Path on hosting | Content-Type |
|------|----------------|--------------|
| Webfinger | `/.well-known/webfinger` | `application/jrd+json` |
| Actor | `/@mercury` or `/actor` | `application/activity+json` |
| Outbox | `/outbox` | `application/activity+json` |
| Public key | Part of actor JSON | N/A |
| (Optional) Followers | `/followers` | `application/activity+json` |

The outbox lists Create activities for new discoveries (new scene, new curator pick, new rising artist). Each activity contains an Article or Note object.

#### HTTP Signatures Problem

To SEND activities (Follow, Create, Announce), AP requires RSA HTTP signatures with a ±30 second validity window. This is non-trivial to implement. For v1.3 "outbound only" (Fediverse can follow Mercury actor and see updates), Mercury does NOT need to send activities — it only needs a readable outbox. Followers discover it via webfinger, subscribe, and periodically poll the outbox. No signature generation required for outbox serving.

If Mercury wants to actively NOTIFY followers (push model), it would need to POST to each follower's inbox with HTTP signatures. This should be deferred to a future phase or the relay-endpoint pattern.

#### New Components for AP Outbound

**New: `src/lib/activitypub/`**
- `types.ts` — TypeScript types for AP Actor, Outbox, OrderedCollection, Create, Article
- `generator.ts` — builds AP JSON-LD objects from Mercury data (artist pages, scenes, collections)
- `keypair.ts` — RSA keypair generation for actor public key (stored in taste.db)
- `export.ts` — orchestrates file generation, calls `write_json_to_path` Tauri command

**New: `src/routes/settings/activitypub/+page.svelte`**
- UI for setting actor identity (handle, display name, hosting URL)
- Export button that triggers file generation
- Instructions for uploading to hosting

**Modified: `src-tauri/src/ai/taste_db.rs`**
- New table: `ap_settings` (actor_handle, hosting_url, rsa_private_key_pem, created_at)
- New table: `ap_outbox` (activity_id, activity_type, content_json, published_at)
- New Tauri commands: `get_ap_settings`, `set_ap_settings`, `append_ap_activity`

**Data flow:**
```
User clicks "Export AP files"
    → generator.ts builds Actor JSON + Outbox JSON from mercury.db + taste.db
    → Tauri command write_json_to_path writes files to chosen folder
    → User uploads folder to their hosting
    → Fediverse users search @handle@theirhostingdomain
    → Mastodon fetches /.well-known/webfinger → actor → outbox
    → Follow established (client-pull model, no Mercury inbox needed)
```

#### What AP Objects Represent

| Mercury Concept | AP Object Type | Actor Type |
|-----------------|---------------|-----------|
| User's curation identity | Person actor | Published at user's hosting |
| Scene | Group actor (future) | N/A for v1.3 |
| Collection | OrderedCollection | Part of outbox |
| Artist discovery | Create/Article activity | In outbox |

For v1.3, one Actor per user (their curator identity). Scene actors are future work — they require deciding who "owns" the scene's AP identity.

---

### 2. Listening Rooms

#### Protocol Choice: NIP-38 + Custom kind, Not NIP-53

**NIP-53 (kind:30311)** is designed for live streaming events with streaming URLs, participant management, and recording archives. It's overkill for synchronized embed playback and implies audio infrastructure.

**NIP-38 (kind:30315)** is user status — "I'm listening to X right now." It's per-person, not room-based.

**The right approach for Mercury listening rooms:** Extend NIP-28 (the existing scene rooms infrastructure) with a custom "now playing" event. Mercury already has NIP-28 rooms working with NDK. Listening rooms are NIP-28 rooms with an additional synchronized state layer.

**Custom event: kind:10311 (Mercury Listening Room State)**

This is an ephemeral replaceable event (NIP-16 ephemeral convention) that the room host broadcasts to update "now playing" state. Guests subscribe to it and sync their embed player.

```
kind: 10311
tags: [
  ['e', roomChannelId, '', 'root'],  // links to NIP-28 room
  ['d', 'now-playing'],              // addressable by room
  ['url', embedUrl],                 // e.g. https://bandcamp.com/EmbeddedPlayer/...
  ['platform', 'bandcamp'],          // bandcamp | spotify | youtube | soundcloud
  ['track', trackTitle],
  ['artist', artistName],
  ['mbid', artistMbid],
  ['expiration', unixTimestamp]      // when the embed session ends
]
content: '' // empty, all data in tags
```

**Why not use NIP-38 (kind:30315):** NIP-38 is per-user status, not per-room coordination. Multiple people in a room each publishing 30315 would collide. The room-scoped kind:10311 is cleaner: one host, one authoritative now-playing state, all guests subscribe to it.

**Why a custom kind:** The Nostr ecosystem for synchronized music playback is not standardized. NIP-1945 (M3U playlists) exists as a proposal but is not a standard. Mercury should use the most natural extension of its existing NIP-28 infrastructure rather than waiting for a standard that may never arrive.

#### Listening Room Architecture

**Host flow:**
```
Host opens Listening Room UI
    → host selects artist + embed URL from artist page
    → NDK publishes kind:10311 with embed URL + expiration
    → host also broadcasts as kind:30315 for NIP-38 status (optional interop)
    → room participants see new now-playing event
    → EmbedPlayer renders the URL in an iframe
```

**Guest flow:**
```
Guest joins listening room (NIP-28 room)
    → NDK subscribes to kind:10311 with '#e': [channelId]
    → on event: extract url + platform tags
    → EmbedPlayer renders the embed (same component used on artist pages)
    → on new kind:10311 from host: update embed (host changed track)
    → on expiration: show "listening session ended" state
```

**Sync model:** Embed iframes are not byte-synchronized (impossible without audio hosting). The sync is "load the same embed URL at approximately the same time." This is the only viable model without audio hosting. Users click play in their own iframe. The host sets the track; guests load the same track and press play themselves.

#### New Components for Listening Rooms

**New: `src/lib/comms/listening-rooms.svelte.ts`**
- `createListeningRoom(channelId, embedUrl, platform, trackTitle, artistMbid)` — publishes kind:10311
- `subscribeToListeningRoom(channelId)` — subscribes to kind:10311 for the channel
- `listeningRoomState` — reactive $state for current now-playing embed URL

**Modified: `src/lib/comms/rooms.svelte.ts`**
- Room UI shows "Now Playing" section when kind:10311 exists for the room
- Host-only controls: "Set Now Playing" button

**Modified: `src/routes/scenes/[slug]/+page.svelte`** (or room detail page)
- Render `<EmbedPlayer>` inside the room when kind:10311 active
- Host controls: select from artist's embeds

**No new Rust commands needed.** Listening rooms are pure NDK/frontend work. The existing `write_json_to_path` command handles any persistence needed.

---

### 3. Artist Tools

Three tools in one feature area. Each is architecturally independent.

#### 3a. Discovery Stats Dashboard

Reads from `mercury.db` to show an artist's discoverability signals: how many times they appear in tag searches, their uniqueness score, their position in the niche-first ranking.

**New: `src/routes/artist/[slug]/stats/+page.svelte`**
- "Artist Insights" tab on artist pages
- Reads: tag count, artist count per tag (from `tag_stats`), uniqueness score calculation
- Shows: "Your uniqueness score is X. You appear in Y tag combinations. Most distinctive tag: Z."

**New: `src/lib/stats/artist-stats.ts`**
- `getArtistDiscoveryStats(slug)` — queries mercury.db via existing Tauri commands
- Computes uniqueness score (same algorithm as search ranking — read from existing queries)
- Returns stats object for UI rendering

**No new Rust commands needed.** `query_mercury_db` already exists as a passthrough command. Stats queries are SQL against the existing `artists`, `artist_tags`, and `tag_stats` tables.

#### 3b. AI Auto-News

Uses the existing llama-server sidecar to generate a short "what's happening with this artist" blurb, informed by their MusicBrainz data (latest release year, tags, country). No scraping, no live web search — pure generation from local data.

**New: `src/lib/ai/prompts.ts`** (extend existing file)
- `artistNews(artistName, tags, country, latestReleaseYear)` — prompt for a 2-3 sentence "what's new" style blurb
- Explicitly instructs model to stick to known facts from the provided data

**New: `src/lib/stats/artist-news.ts`**
- `generateArtistNews(artist)` — calls AI engine with artistNews prompt
- Caches result in `taste.db` (new `artist_news_cache` table, key: mbid, value: blurb, generated_at)

**Modified: `src-tauri/src/ai/taste_db.rs`**
- New table: `artist_news_cache (mbid TEXT PK, blurb TEXT, generated_at INTEGER)`
- New Tauri commands: `get_artist_news_cache`, `set_artist_news_cache`

#### 3c. Self-Hosted Static Site Generator

Generates a minimal HTML/CSS static site for an artist page — something the user can host on Neocities, GitHub Pages, or any static host. Not "claiming" the artist (no artist login), just generating a static representation of Mercury's view of them.

**New: `src/lib/sitegen/`**
- `types.ts` — SiteGenOptions (artist mbid, output path, include sections)
- `template.ts` — HTML template string (embedded CSS, no external dependencies)
- `generator.ts` — assembles HTML from MusicBrainz data + Mercury tags + cover art URL
- `export.ts` — calls `write_json_to_path` (or a new Tauri file write command) for HTML output

The generated HTML file is self-contained: inline CSS, links to external embed players, links back to Mercury app (deep link if user has it installed). No server required to host.

**New Rust command: `write_text_to_path(path: String, content: String)`**
- `write_json_to_path` already exists for JSON. A text variant handles HTML output.
- Lives in `src-tauri/src/ai/taste_db.rs` alongside existing file write commands.

---

### 4. Sustainability Links

This is the simplest feature architecturally — it extends the existing MusicBrainz link categorization.

#### Artist Support Links (MusicBrainz)

The categorize.ts module already maps MB relation type `'patronage'` and `'crowdfunding'` to the `'support'` link category. The artist links API (`/api/artist/[mbid]/links`) already returns `categorized.support[]`. The artist page template just needs to render this section if `support.length > 0`.

**Modified: `src/routes/artist/[slug]/+page.svelte`**
- Add "Support This Artist" section that renders `categorized.support` links
- Extend FRIENDLY_NAMES in `categorize.ts` to add: `buymeacoffee.com`, `opencollective.com`, `gofundme.com`

**No new API routes, no new Rust commands.** Pure frontend render of existing data.

#### Mercury Project Funding Links

A static section in the About/Settings page showing Mercury's own funding links (Open Collective, GitHub Sponsors, etc.). These are hardcoded — Mercury is not fetching its own funding data from anywhere.

**Modified: `src/routes/about/+page.svelte`**
- "Support Mercury" section with static links
- No new infrastructure

#### Backer Credits Screen

A credits screen showing Nostr kind:30000 list (bookmarks/lists) or a signed JSON file that Mercury reads from a known Nostr public key (Mercury's own pubkey). Backers are Nostr pubkeys that Mercury resolves to display names via NDK.

**New: `src/routes/about/backers/+page.svelte`**
- Fetches kind:30000 or kind:10000 (follows list) from Mercury's pubkey on Nostr
- Resolves pubkeys to NIP-01 profiles (kind:0 metadata events)
- Renders display names/avatars

**Modified: `src/lib/comms/nostr.svelte.ts`**
- Add `fetchBackerList(mercuryPubkey)` — fetches kind:30000 from relay, resolves profiles

No new Rust commands. Pure NDK work.

---

## Component Map: New vs Modified

| Component | Status | Area |
|-----------|--------|------|
| `src/lib/activitypub/types.ts` | NEW | AP Outbound |
| `src/lib/activitypub/generator.ts` | NEW | AP Outbound |
| `src/lib/activitypub/keypair.ts` | NEW | AP Outbound |
| `src/lib/activitypub/export.ts` | NEW | AP Outbound |
| `src/routes/settings/activitypub/+page.svelte` | NEW | AP Outbound |
| `src/lib/comms/listening-rooms.svelte.ts` | NEW | Listening Rooms |
| `src/lib/stats/artist-stats.ts` | NEW | Artist Tools |
| `src/lib/stats/artist-news.ts` | NEW | Artist Tools |
| `src/lib/sitegen/` (module) | NEW | Artist Tools |
| `src/routes/artist/[slug]/stats/+page.svelte` | NEW | Artist Tools |
| `src/routes/about/backers/+page.svelte` | NEW | Sustainability |
| `src-tauri/src/ai/taste_db.rs` | MODIFIED | AP + Artist Tools |
| `src/lib/embeds/categorize.ts` | MODIFIED | Sustainability |
| `src/lib/ai/prompts.ts` | MODIFIED | Artist Tools |
| `src/lib/comms/rooms.svelte.ts` | MODIFIED | Listening Rooms |
| `src/lib/comms/nostr.svelte.ts` | MODIFIED | Sustainability |
| `src/routes/artist/[slug]/+page.svelte` | MODIFIED | Sustainability |
| `src/routes/about/+page.svelte` | MODIFIED | Sustainability |

---

## Recommended Project Structure (New Additions)

```
src/
├── lib/
│   ├── activitypub/                # NEW — AP static file generation
│   │   ├── types.ts                # AP Actor, Outbox, Create, Article types
│   │   ├── generator.ts            # Builds AP JSON-LD from Mercury data
│   │   ├── keypair.ts              # RSA keypair for AP actor public key
│   │   └── export.ts              # File generation orchestration
│   ├── comms/
│   │   ├── listening-rooms.svelte.ts  # NEW — kind:10311 publish/subscribe
│   │   ├── nostr.svelte.ts         # MODIFIED — add fetchBackerList
│   │   └── rooms.svelte.ts         # MODIFIED — add now-playing UI hooks
│   ├── stats/                      # NEW — discovery analytics
│   │   ├── artist-stats.ts         # Queries mercury.db for discoverability signals
│   │   └── artist-news.ts          # AI auto-news generation + cache
│   └── sitegen/                    # NEW — static site generator
│       ├── types.ts                # SiteGenOptions
│       ├── template.ts             # Inline HTML/CSS template
│       ├── generator.ts            # Assembles HTML from MB data
│       └── export.ts              # Calls Tauri write command
└── routes/
    ├── artist/[slug]/
    │   ├── +page.svelte            # MODIFIED — add support links section
    │   └── stats/
    │       └── +page.svelte        # NEW — discovery stats dashboard
    ├── settings/
    │   └── activitypub/
    │       └── +page.svelte        # NEW — AP export UI
    └── about/
        ├── +page.svelte            # MODIFIED — Mercury funding section
        └── backers/
            └── +page.svelte        # NEW — backer credits

src-tauri/src/ai/
└── taste_db.rs                     # MODIFIED — new tables + commands
```

---

## Architectural Patterns

### Pattern 1: Offline-First Generation (AP Outbound)

**What:** Mercury generates static JSON-LD files to disk instead of serving them live. The user hosts them on their own web infrastructure.

**When to use:** Any feature that needs to expose Mercury data to the web but where Mercury cannot act as a live server. AP outbound is the primary case. This pattern also applies to static site generation for artist pages.

**Trade-offs:** Requires user action (upload files). No inbox (Mercury cannot receive follows or replies directly). Cannot do push delivery without HTTP signatures. But: zero infrastructure cost, works offline, no API rate limits, completely user-controlled.

**Example structure of generated actor.json:**
```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
  "id": "https://user-domain.com/@mercury",
  "type": "Person",
  "preferredUsername": "mercury",
  "name": "Steve's Mercury Curation",
  "summary": "Electronic music discovery — curated by a human",
  "inbox": "https://user-domain.com/inbox",
  "outbox": "https://user-domain.com/outbox",
  "publicKey": {
    "id": "https://user-domain.com/@mercury#main-key",
    "owner": "https://user-domain.com/@mercury",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
  }
}
```

### Pattern 2: Relay-Mediated Coordination (Listening Rooms)

**What:** The Nostr relay pool acts as the coordination layer. The host publishes a replaceable kind:10311 event; guests subscribe to it via NDK. No P2P connection between users.

**When to use:** Any feature requiring real-time state synchronization between Mercury users. The pattern already works for DMs (NIP-17) and scene rooms (NIP-28). Extend it for listening rooms.

**Trade-offs:** Depends on relay availability. No byte-level audio sync (impossible without hosting). Relay latency (~100ms) means "sync" is within seconds, not milliseconds. Acceptable for "load the same embed" use case.

**Example subscription:**
```typescript
// listening-rooms.svelte.ts
const sub = ndk.subscribe({
  kinds: [10311],
  '#e': [channelId],
  limit: 1
}, { closeOnEose: false });

sub.on('event', (event) => {
  const url = event.tags.find(t => t[0] === 'url')?.[1];
  const platform = event.tags.find(t => t[0] === 'platform')?.[1];
  if (url) listeningRoomState.nowPlaying = { url, platform };
});
```

### Pattern 3: Extend Existing Tauri Commands (Artist Tools)

**What:** New features query existing databases (mercury.db, taste.db) via existing Tauri commands (`query_mercury_db`, `get_ai_setting`) rather than adding new commands for every query.

**When to use:** When the data already exists and the query is a straightforward SELECT. Artist stats, for example, are pure reads from `tag_stats` and `artist_tags` — no new schema, no new command.

**Trade-offs:** `query_mercury_db` is a passthrough that accepts raw SQL strings. This is fine for internal use but not a public API. New tables (artist_news_cache, ap_settings) DO need dedicated commands because they require specific upsert logic.

**When to add new Tauri commands:** Only when a write operation needs custom logic (upsert, conflict resolution, atomic multi-step writes). For reads, use `query_mercury_db` with a typed TypeScript wrapper.

### Pattern 4: MB Link Category Extension (Sustainability)

**What:** MusicBrainz URL relationships already flow through `categorize.ts`. Adding new support platforms is a pure data extension — add entries to the FRIENDLY_NAMES map and the category is automatically rendered.

**When to use:** Any new external platform that MusicBrainz tracks. The pattern is already established for Patreon and Ko-fi. Extend it for Buy Me a Coffee, Open Collective, and GoFundMe.

**Trade-offs:** Dependent on MusicBrainz data quality. Artists who haven't linked their Patreon on MusicBrainz won't appear. This is correct — Mercury does not store artist data, it surfaces what MusicBrainz knows.

---

## Data Flow

### ActivityPub Export Flow

```
User → Settings → AP Export page
    → Fills in: hosting URL, display name, handle
    → Clicks "Generate & Export"
    → activitypub/generator.ts builds:
        ├── /.well-known/webfinger  (JSON)
        ├── /actor                  (JSON-LD)
        ├── /outbox                 (JSON-LD OrderedCollection)
        └── /outbox/page-1          (JSON-LD OrderedCollectionPage)
    → For each: invoke('write_json_to_path', { path, content })
    → UI shows "Files written to [folder]. Upload to your hosting."

User uploads to hosting
    → Fediverse user searches @handle@user-domain.com
    → Mastodon fetches /.well-known/webfinger
    → Mastodon fetches /actor (Content-Type: application/activity+json)
    → Mastodon fetches /outbox
    → Follow established (client-pull: Mastodon polls outbox for updates)
```

### Listening Room Flow

```
Host selects track on artist page
    → clicks "Share to Room"
    → selects destination room (NIP-28 channel)
    → listening-rooms.svelte.ts publishes kind:10311:
        tags: [['e', channelId], ['url', embedUrl], ['platform', 'bandcamp'],
               ['artist', name], ['expiration', ts]]
    → NDK sends to relay pool

Guest in room receives kind:10311
    → subscribeToListeningRoom subscription fires
    → listeningRoomState.nowPlaying updated
    → EmbedPlayer component re-renders with new URL
    → Guest clicks play in their iframe (no automatic play — browser policy)
```

### Artist Stats Flow

```
User visits artist page → clicks "Stats" tab
    → artist-stats.ts calls query_mercury_db with:
        SELECT at.tag, ts.artist_count
        FROM artist_tags at
        JOIN tag_stats ts ON ts.tag = at.tag
        WHERE at.artist_id = (SELECT id FROM artists WHERE mbid = ?)
        ORDER BY ts.artist_count ASC  -- rarest first
    → Computes uniqueness score: avg(1/artist_count) across tags
    → Returns { topTags, rarestTag, uniquenessScore, tagCount }
    → UI renders discoverability dashboard
```

### Sustainability Support Links Flow

```
Artist page loads
    → existing /api/artist/[mbid]/links fetch runs
    → categorize.ts maps 'patronage'/'crowdfunding' MB types to 'support' category
    → response.categorized.support[] now includes Patreon, Ko-fi, etc.
    → artist page renders "Support This Artist" section (new, was previously unused)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Nostr Relays | NDK subscribe/publish — existing | kind:10311 is new event kind, no relay config change needed |
| MusicBrainz API | Existing live fetch via `/api/artist/[mbid]/links` | No change — sustainability links already categorized |
| Fediverse (Mastodon) | Static file serve via user's hosting — not Mercury serving | Mercury only generates files; hosting is user responsibility |
| ActivityPub RSA | Client-side RSA keygen in browser (WebCrypto API) | No server-side crypto needed for outbox-only pattern |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| AP generator ↔ Tauri | invoke('write_json_to_path') | Existing command, no change |
| Listening rooms ↔ NDK | ndkState.ndk.subscribe/publish | Same pattern as rooms.svelte.ts |
| Artist stats ↔ mercury.db | invoke('query_mercury_db', { sql }) | Existing command, no change |
| Artist news ↔ AI engine | aiEngine.complete(prompt) | Existing engine singleton |
| Artist news cache ↔ taste.db | New Tauri commands (get/set_artist_news_cache) | New commands, same pattern |
| AP settings ↔ taste.db | New Tauri commands (get/set_ap_settings) | New commands, same pattern |
| Backer credits ↔ Nostr | ndkState.ndk.fetchEvents({ kinds: [30000] }) | Existing NDK pattern |

### Listening Room ↔ Embed Player

The `EmbedPlayer` component is already used on artist pages. For listening rooms, it needs a new invocation pattern — driven by reactive state instead of page-load props.

```typescript
// Current (page-load driven):
<EmbedPlayer url={bandcampUrl} platform="bandcamp" />

// New (state-driven for rooms):
{#if listeningRoomState.nowPlaying}
  <EmbedPlayer
    url={listeningRoomState.nowPlaying.url}
    platform={listeningRoomState.nowPlaying.platform}
  />
{/if}
```

No changes to EmbedPlayer component itself — it's stateless, accepts props. The change is in the consuming component.

---

## Build Order (Recommended)

Dependencies drive the order. Features are ordered from least-dependent to most-dependent.

**Phase 1: Sustainability Links (no new architecture)**
- Extend categorize.ts FRIENDLY_NAMES
- Render `categorized.support` on artist page
- Add Mercury funding section to about page
- Add backer credits page (NDK fetchEvents pattern already exists)
- Dependency: none (pure extension of existing patterns)
- Risk: LOW

**Phase 2: Artist Tools — Stats Dashboard**
- New stats module querying existing mercury.db via existing command
- New artist stats tab/route
- Dependency: none beyond mercury.db existing
- Risk: LOW

**Phase 3: Artist Tools — AI Auto-News**
- New prompt in prompts.ts
- New cache table in taste.db (new Rust commands)
- New artist-news.ts module
- Dependency: AI sidecar must be running (existing, user-optional)
- Risk: LOW-MEDIUM (depends on AI sidecar being initialized)

**Phase 4: Artist Tools — Static Site Generator**
- New sitegen module
- New write_text_to_path Rust command
- Dependency: MusicBrainz live fetch (existing), cover art URL pattern (existing)
- Risk: LOW

**Phase 5: Listening Rooms**
- New listening-rooms.svelte.ts (extends NDK, extends NIP-28 rooms)
- Modify rooms UI to show now-playing section
- Dependency: NDK initialized (existing), NIP-28 rooms (existing)
- Risk: MEDIUM (new Nostr event kind, behavior depends on relay propagation speed)

**Phase 6: ActivityPub Outbound**
- New activitypub module
- New AP settings in taste.db (new Rust commands)
- New settings UI page
- Dependency: write_json_to_path command (existing), RSA keygen (WebCrypto, no dependency)
- Risk: MEDIUM (AP JSON-LD format must be Mastodon-compatible — requires test with real Mastodon instance)

**Rationale for this order:**
- Sustainability first: zero risk, immediate value, validates existing link pipeline
- Stats before AI news: stats don't need AI; AI news builds on stats data
- Site generator before listening rooms: both are independent but sitegen is simpler
- Listening rooms before AP: AP is the most complex and least reversible
- AP last: if it doesn't work perfectly, no other features are blocked

---

## Anti-Patterns

### Anti-Pattern 1: Serving AP Endpoints from Tauri

**What people do:** Spawn an Axum HTTP server inside Tauri on a local port and try to proxy it through NAT/UPnP to the internet.

**Why it's wrong:** Desktop apps behind NAT/firewalls cannot reliably accept inbound connections. UPnP is disabled on most corporate/university networks. The user's IP changes (DHCP). The app must be running for the endpoint to be reachable — the actor disappears when Mercury closes.

**Do this instead:** Generate static JSON-LD files for the user to host. Accept the limitation: Mercury's AP implementation is outbound-only (readable outbox, no live inbox). This matches what static site AP implementations do and is fully Mastodon-compatible for the follow use case.

### Anti-Pattern 2: Per-User Listening Sync via Relay Timing

**What people do:** Broadcast a timestamp with the kind:10311 event and have guests seek to that timestamp to "sync."

**Why it's wrong:** Embed players (Bandcamp, Spotify, YouTube) do not expose a seek API from the embedding page. Bandcamp specifically runs in an iframe with no postMessage interface for seeking. You cannot programmatically seek an embedded player from the parent page.

**Do this instead:** Accept that "sync" means "load the same embed." The host picks the track; guests load it and press play themselves. This is enough for a social listening room — the shared experience is the track choice, not the playback position.

### Anti-Pattern 3: Artist News Without Hallucination Guard

**What people do:** Prompt the AI for artist news without constraining it to provided facts.

**Why it's wrong:** The Qwen2.5 3B model (Mercury's local model) will hallucinate tour dates, album titles, and news events if asked open-endedly. This is worse than no news at all — it's misinformation about real artists.

**Do this instead:** Constrain the prompt to only the data Mercury has: tags, country, latest release year from MusicBrainz. The prompt should say "Based ONLY on: tags=[X], country=[Y], latest release year=[Z]. Do not state facts you are not certain of." Include a disclaimer in the UI: "AI-generated from MusicBrainz metadata — not a news feed."

### Anti-Pattern 4: Kind:30000 as Backer Registry

**What people do:** Publish backers as a kind:30000 (bookmarks list) from Mercury's pubkey and expect clients to interpret it as a backer list.

**Why it's wrong:** kind:30000 is for personal bookmarks, not public registries. Any Nostr client will show it as "Steve's bookmarks" not "Mercury backers."

**Do this instead:** Use kind:30000 with a specific `d` tag (`d = "mercury-backers"`) to make it an addressable list (kind:30000 with `d` tag = NIP-51 addressable set). Or use a signed JSON file in the Mercury repo that NDK fetches as a raw event. The latter is more reliable for a public registry.

---

## Scaling Considerations

This is a desktop app — "scaling" means "as the user's data grows."

| Concern | At current scale | At 5x data |
|---------|-----------------|------------|
| AP outbox size | 10-50 activities, single JSON file | Split into paginated pages (AP supports OrderedCollectionPage) |
| Artist stats query | Sub-millisecond on mercury.db | No change — indexed query |
| Artist news cache | 1 row per mbid in taste.db | Negligible growth |
| Listening room subscriptions | 1 NDK subscription per room | NDK handles multiple subscriptions; close on leave |
| Backer list | Fetched live from relay each load | Cache locally in taste.db with TTL |

### Key Bottleneck: AP Outbox Rebuild

Every time the user generates AP files, the outbox is rebuilt from scratch. At >100 activities, this involves reading all AP activities from taste.db, constructing a paginated collection, and writing multiple JSON files. This should be fast (<1 second) but deserves a loading indicator in the UI.

---

## Sources

- ActivityPub W3C Spec: [W3C ActivityPub](https://www.w3.org/TR/activitypub/)
- Static site AP implementation guide: [maho.dev guide part 3](https://maho.dev/2024/02/a-guide-to-implementing-activitypub-in-a-static-site-or-any-website-part-3/)
- Mastodon basic AP server guide: [Mastodon Blog — Implement a basic AP server](https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/)
- NIP-28 (scene rooms — already in codebase): [github.com/nostr-protocol/nips/blob/master/28.md](https://github.com/nostr-protocol/nips/blob/master/28.md)
- NIP-38 (user status / music listening): [nips.nostr.com/38](https://nips.nostr.com/38)
- NIP-53 (live activities): [nips.nostr.com/53](https://nips.nostr.com/53)
- activitypub_federation Rust crate: [docs.rs/activitypub_federation](https://docs.rs/activitypub_federation/latest/activitypub_federation/) — noted for future use if live inbox is needed
- Direct codebase inspection: `src/lib/comms/rooms.svelte.ts`, `src/lib/comms/nostr.svelte.ts`, `src/lib/embeds/categorize.ts`, `src/routes/api/artist/[mbid]/links/+server.ts`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`

---

*Architecture research for: Mercury v1.3 — The Open Network feature integration*
*Researched: 2026-02-24*
