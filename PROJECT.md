# Mercury (working title)

> A music search engine with taste.

## What This Is

A discovery engine that indexes all music from open databases, lets you explore through atomic tags, and embeds players from wherever the music already lives. A place where uniqueness is rewarded, taste is shareable, and no company can pull the plug.

Not a platform. Not a streaming service. Not a blockchain. A search engine that becomes an ecosystem.

## The Problem

Music discovery is broken. Spotify shows you the same kind of shit. Every "discovery" feature is really a retention feature — designed to keep you inside one company's walled garden. 87% of Spotify songs below 1,000 streams earn zero royalties. Artists are invisible unless an algorithm decides otherwise.

Meanwhile, the data to solve this already exists in the open — MusicBrainz (2.6M artists, CC0), Discogs (18M+ releases), and the music itself lives on Bandcamp, SoundCloud, YouTube, and artist websites. Nobody has assembled the open pieces into a coherent discovery experience.

Every previous attempt at "decentralized music" focused on payments and blockchain. 75% of them are dead. None solved discovery.

Music blogs are dead because platforms killed the discovery loop they were part of. Curators have no tools. Everyone makes the same generic shit because algorithms reward sameness.

## The Solution

Index everything. Embed from everywhere. Reward uniqueness. Let people explore and share what they find.

### Core Concept

1. **The Index** — Ingest MusicBrainz + Discogs data dumps. Millions of artists and releases on day one. Searchable, browsable, filterable by granular tags. No empty-platform problem.

2. **The Embed Engine** — Detect Bandcamp, Spotify, Apple Music, SoundCloud, YouTube links and render the appropriate embedded player inline. Audio NEVER hosted by us — it lives on the artist's own infrastructure. Users can set their **preferred streaming service** — embeds and links default to what they actually use.

3. **The Tagging System** — Two layers. **Artist tags** are atomic and artist-defined — not "electronic" but "dark ambient / granular synthesis / Berlin school / cinematic." The more specific your tags, the more discoverable you become. Generic = invisible. Unique = findable. **User tags** are personal — listeners tag, sort, and organize their own collections however they want. Your shelf, your system.

4. **Democratic Discovery** — Uniqueness IS the discovery mechanism. If you're tagged "electronic" you're one of 500,000. If you're tagged "dark ambient / granular synthesis / field recordings from abandoned factories" you're one of 12. The system naturally rewards artists who carve their own niche and naturally demotes generic, AI-generated slop without needing to explicitly ban it.

5. **Taste as Identity** — Users can build opt-in profiles that showcase their music taste. Like showing off your record collection. Shareable. Everyone can become a tastemaker or curator. Send someone your profile and they instantly understand your taste. Each user gets a **Taste Fingerprint** — a generated visual pattern unique to their collection. Not a number. Not a score. A shape. You can't game it. It just *is* what you listen to. Two people with similar fingerprints probably share taste.

6. **Blog Revival** — Embeddable widgets for blog writers. Attribution and reach for curators. First access to emerging artists. Give bloggers a reason to write about music again by giving them tools and an audience. But also: **writing lives inside the platform**. Users can write about artists, releases, scenes — like liner notes, like blog posts. Not just curating lists. Actually writing about music.

7. **The Tiers** — Everyone is discoverable by default. More control requires more effort:

| Tier | What | Artist Effort |
|------|------|---------------|
| Everyone | Indexed from open DBs, auto-detected embeds, auto-pulled news from social media | Zero |
| Claimed | Controls tags, description, featured tracks, news dashboard | Minimal |
| Self-hosted | Static site generator for artists, publishes to free hosting, feeds rich data back to the index | Some setup |
| Opted out | Removed from index | One action |

8. **Crate Digging Mode** — A discovery interface that feels like flipping through records at a shop. Not search. Not recommendations. Random, serendipitous browsing through a filtered stack — pick a genre, a decade, a country, and just flip. Maybe you find gold, maybe you don't. That's the point.

9. **Scene Maps** — Geographic and temporal visualization. See the Berlin techno scene in 1995. See what's happening in Buenos Aires right now. Music comes from places and eras — MusicBrainz has the location data. Use it.

10. **Time Machine** — Browse by year. What came out in 1997? In 2003? Scrub a timeline. Filter by tags. Watch how genres evolved, split, merged. The data is all there — release dates, artist relationships, scene connections.

11. **Liner Notes Revival** — Physical records had liner notes — credits, stories, thank-yous, production details. Digital killed that. Bring it back. Every release page has rich, expandable liner notes. MusicBrainz already has recording credits, relationships, and production data. Surface it beautifully.

12. **Import Your Library** — Import from Spotify, Last.fm, Apple Music, or a CSV. Bootstrap your collection instantly. No cold-start problem. You walk in with your existing taste and the shelves are already populated.

13. **Listening Rooms** — Shared real-time listening. No video. No screen sharing. Just you and some people, a queue, and a chat. Like sitting in a room with friends playing records. Synchronized embeds, communal discovery.

### What It's NOT

- A streaming service (no audio hosting)
- A payment processor (links to where music is sold)
- A blockchain/token/crypto thing
- A company that can be shut down (open source, always)

## Architecture

### Two Layers: Web Gateway + Local Database

The web app is the gateway — zero friction, instant access. But the real thing is a downloadable database that lives on your machine. Both read the same data.

```
WEB (gateway)              LOCAL (the real thing)
  Cloudflare free tier       Tauri desktop app
  SQLite on D1               SQLite on your disk
  Zero friction              Full power, offline
  First experience           Power user, unkillable
```

**The database is distributed.** The entire index (processed MusicBrainz + Discogs data) is a single SQLite file, maybe 2-5GB. Downloadable. Torrentable. Every user can have the whole thing on their machine. Updates distributed as diffs. The more users, the faster it propagates.

**This is unkillable by design.** Domain seized? Cloudflare bans you? Doesn't matter — the data lives on thousands of user machines. The web version is a convenience layer. The distributed database is the insurance policy.

### Build Order: Data Pipeline First

The data pipeline is the foundation — it feeds everything else:

```
MusicBrainz dumps (CC0) + Discogs dumps (free)
  → Node.js pipeline processes on your machine
    → Produces a clean SQLite database
      → Upload to Cloudflare D1 → powers web app
      → Distribute as download/torrent → powers desktop app
      → Use locally during development
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Data pipeline | Node.js scripts | Process MusicBrainz/Discogs dumps locally |
| Database | SQLite + FTS5 | Single-file, full-text search, portable, distributable |
| Web frontend | SvelteKit | Compiles away, minimal JS, great DX, Cloudflare adapter |
| Web hosting | Cloudflare Pages + D1 | Free tier, edge deployment, managed SQLite |
| Desktop app | Tauri 2.0 | Rust backend, web frontend, reads local SQLite |
| Distribution | Torrent / direct download | For the database file |

**Total infrastructure cost: $0**

### Data Sources

- **MusicBrainz** — 2.6M artists, 4.7M releases, 35M recordings. CC0 (public domain). PostgreSQL and JSON dumps available.
- **Discogs** — 18M+ releases, monthly XML data dumps. Credit data, label data, genre data.
- **ListenBrainz** — Open source scrobbling + collaborative filtering recommendations. Future integration.

### Development

- **Dev:** SvelteKit + local SQLite file. Clone, install, run.
- **Prod web:** SvelteKit on Cloudflare Pages + D1.
- **Prod desktop:** Tauri app + local SQLite file.

## UX Philosophy: The Record Shop

The interface should feel like going to a record shop. Discovering music. Picking something up. Bringing it home. Putting it on the shelf in the right corner. That excitement. That tactile, spatial, personal experience.

Current platforms are boring. Spotify is a list. A huge, flat, unsorted list. After a while you have hundreds of albums in one scrollable column. No way to group them, tag them, organize them in a meaningful way. The layout is lifeless. No fun to browse. No fun to discover.

This project should make you *want* to explore. Visual, spatial, personal. Your collection should feel like *yours* — arranged the way you think, not the way an algorithm decided. The shelf metaphor drives every design decision.

## Social Layer

Opt-in profiles. Browse anonymously by default. Create a profile when you want to share your taste. **No vanity metrics anywhere.** No follower counts. No like counts. No play counts. Nothing gets pushed because of popularity numbers. The music is the signal, not the numbers.

- **Collections** — Save artists/releases to your profile. Tag them. Sort them. Group them. Create visually exciting record collections that feel like a real shelf — not a spreadsheet. Embed your collection on your website: "This is what I'm listening to."
- **Curators** — Anyone can become a tastemaker. Not through follower counts, but through the quality and specificity of their taste. No content creation required — just good ears.
- **Writing** — Users can write about music inside the platform. Reviews, recommendations, scene reports, liner notes, personal essays. Like music blogs, but integrated. Not just curating lists — actually writing about what you hear and why it matters.
- **Discussion** — Conversation spaces around music. Talk about releases, artists, scenes. Not comments under a player — real discussion threads where people who care about the same music can find each other.
- **Embeddable widgets** — Blog writers can embed search results, artist cards, curated lists, entire collections directly in their posts.
- **Attribution** — When a curator's recommendation leads to discovery, they get credit. Drives traffic back to their blog/profile.
- **First access** — Curators/bloggers get early visibility into emerging artists, unclaimed profiles, new additions to the index.
- **QR codes** — Generate a QR code for your collection or a curated list. Print it. Stick it on your actual record shelf, your studio wall, hand it out at a gig. Someone scans it, they see your taste. Physical-digital bridge.

## Sustainability

This is a public good. Not a business. Nobody gets advantages over anyone else. The music is what matters, not money. But the project needs to survive, and the way it sustains itself should feel like it belongs — not bolted on. Never a popup. Never a nag. Never a gate. Just honest, visible, beautiful.

### How It Communicates

The ask is never "upgrade to pro." The ask is "keep this alive."

- **First visit:** Nothing. Let people discover. Zero friction.
- **Regular use:** A small, permanent, honest presence in the footer. Not a banner. Not a modal. A heartbeat.
- **Database download:** A gentle one-time message: "This was free. Help keep it free." Not blocking. Just present.
- **Profile creation:** Mention it naturally in the onboarding flow.
- **The finances page IS a feature.** Public. Real-time. What it costs, what comes in, where it goes. Radical transparency isn't a buzzword here — it's the interface. People should be able to see exactly what their support enables.

### Funding Channels

**Direct support:**
- **GitHub Sponsors** — For developers and open-source believers. Recurring or one-time.
- **Open Collective** — Transparent group funding. Every transaction public. Ideal for this project's ethos.
- **Ko-fi** — One-time "buy the project a coffee" donations. Zero friction. No account required.
- **Patreon** — Recurring support. Backers get behind-the-scenes content: voice memos, design previews, build log deep dives. Not features. Never features. Just the story of building this.

**Grants:**
- NLnet Foundation, Mozilla Foundation, EU NGI, Sovereign Tech Fund. Open infrastructure funding for open projects. This qualifies.

**Affiliate links:**
- Artists who want self-hosted sites get linked to hosting providers (Netlify, Vercel, cheap VPS). Small commission if they sign up. Non-intrusive. Optional.

### Physical Goods — The Record Shop Merch Table

The project's identity is physical as much as digital. The record shop metaphor extends to how people support it. Not generic merch — artifacts that only make sense because this project exists.

**Taste Fingerprint prints** — Your personal Taste Fingerprint, generated from your collection, printed as a high-quality poster or card. Unique to you. Nobody else has the same one. Frame it. Put it on your wall. It's your music identity made physical. Only possible because this project exists.

**Discovery tokens** — Small collectible coins or enamel pins. Each one has a QR code on the back linking to something in the platform — a curated discovery, a hidden collection, a random crate dig. Collectible, tactile, connected. Like challenge coins for music nerds.

**Tote bags** — Record store bags. When you buy vinyl, you get a bag. Supporters get a tote with the project branding. Simple. Useful. Says "I care about music discovery." Take it to the actual record shop.

**Stickers and patches** — For laptops, cases, jackets. Small. Cheap to produce. High visibility. The kind of thing people put on their gear because they believe in it.

**Milestone drops** — When a major version ships, limited edition merch celebrating it. A coin, a print, a shirt. Commemorates the moment. Creates community around progress.

**Artist collaboration merch** — Artists discovered through the platform create artwork for merch runs. The artist gets paid. The supporter gets unique art. The project gets funded. Circular.

**"Liner Notes" backer credits** — Every supporter's name (or alias) in the project's own liner notes — a public page that treats backers the way liner notes treat musicians. Credits. Thank-yous. The same reverence the project gives to music credits, given back to the people who keep it alive.

### Staged Rollout

Support channels don't all launch at once. They roll out as the project grows and as features make them possible:

| Stage | When | What |
|-------|------|------|
| **Stage 1** | Now (Phase 2) | GitHub Sponsors, Ko-fi, Open Collective. Finances page. Footer link. |
| **Stage 2** | Phase 3 (Desktop) | Patreon with build log content. Donation prompt on database download. Liner Notes backer credits page. |
| **Stage 3** | Phase 4-5 (Discovery + Social) | Taste Fingerprint prints (needs the fingerprint feature). Stickers and patches. Discovery tokens with QR codes. Supporter Wall. |
| **Stage 4** | Phase 5-6 (Social + Blog) | Tote bags. Artist collaboration merch. Milestone drops. Full print-on-demand store. |

### Production

All physical goods are **print-on-demand or small-batch**. Zero inventory risk. No warehouse. No upfront costs. Services like Printful, Gelato, or SPOD handle production and shipping. The project never touches a box.

### Rules

- No paid tiers. No premium features. No "pro" anything.
- No businesses building on top of this. No API-for-profit.
- No one gets more visibility because they have money.
- No ads, no tracking, no algorithmic manipulation.
- No selling user data. No crypto/tokens.
- No vanity metrics. No follower counts. No like counts. No play counts. Nothing that gamifies attention.
- Everyone gets the same thing. The music is the differentiator, nothing else.
- **Supporters get acknowledgment and physical goods. Never platform advantages. Never.**

## Interoperability

This project plugs into the open web. It doesn't try to replace it.

- **RSS for everything** — Every artist page, every user collection, every tag, every curator generates an RSS feed. Subscribe to what you care about. No algorithm decides what you see. RSS is unkillable, like the rest of this project.
- **ActivityPub / Fediverse** — The social layer speaks ActivityPub. Your profile is followable from Mastodon. Artist updates federate across the open web. No need to build a social network from scratch — plug into the one that already exists and shares our values.
- **Import/Export** — Import from Spotify, Last.fm, Apple Music. Export everything you have. Your data is yours. Always.

## Naming

"Mercury" is a working codename. The real name hasn't been found yet. The codebase uses a single `PROJECT_NAME` variable so renaming is a one-line change.

## Who's Building This

Steve — musician (Theatre of Delays, Spenza, Raw Stevens, Vox Sola), label co-founder (Vakant, Kwik Snax), 30 years of electronic music. This comes from lived frustration, not market analysis. He posted about this on Reddit 10 years ago. Nobody got it then.

## Research

Extensive research completed 2026-02-14. Reports saved in ControlCenter:
- `D:/Projects/_ControlCenter/.planning/music-platform/research/DECENTRALIZED-PLATFORMS.md`
- `D:/Projects/_ControlCenter/.planning/music-platform/research/MUSIC-DISCOVERY.md`
- `D:/Projects/_ControlCenter/.planning/music-platform/research/P2P-PROTOCOLS.md`
- `D:/Projects/_ControlCenter/.planning/music-platform/research/ARTIST-FIRST-PLATFORMS.md`
- `D:/Projects/_ControlCenter/.planning/music-platform/SESSION-2026-02-14.md` (full session narrative)
- `D:/Projects/_ControlCenter/.planning/music-platform/BUILD-LOG.md` (documentary build log)
