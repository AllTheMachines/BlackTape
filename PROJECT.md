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

2. **The Embed Engine** — Detect Bandcamp, Spotify, Apple Music, SoundCloud, YouTube links and render the appropriate embedded player inline. Audio NEVER hosted by us — it lives on the artist's own infrastructure.

3. **The Tagging System** — Atomic, artist-defined tags. Not "electronic" but "dark ambient / granular synthesis / Berlin school / cinematic." The more specific your tags, the more discoverable you become. Generic = invisible. Unique = findable.

4. **Democratic Discovery** — Uniqueness IS the discovery mechanism. If you're tagged "electronic" you're one of 500,000. If you're tagged "dark ambient / granular synthesis / field recordings from abandoned factories" you're one of 12. The system naturally rewards artists who carve their own niche and naturally demotes generic, AI-generated slop without needing to explicitly ban it.

5. **Taste as Identity** — Users can build opt-in profiles that showcase their music taste. Like showing off your record collection. Shareable. Everyone can become a tastemaker or curator. Send someone your profile and they instantly understand your taste.

6. **Blog Revival** — Embeddable widgets for blog writers. Attribution and reach for curators. First access to emerging artists. Give bloggers a reason to write about music again by giving them tools and an audience.

7. **The Tiers** — Everyone is discoverable by default. More control requires more effort:

| Tier | What | Artist Effort |
|------|------|---------------|
| Everyone | Indexed from open DBs, auto-detected embeds | Zero |
| Claimed | Controls tags, description, featured tracks | Minimal |
| Self-hosted | Runs website template, feeds rich data | Some setup |
| Opted out | Removed from index | One action |

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

## Social Layer

Opt-in profiles. Browse anonymously by default. Create a profile when you want to share your taste.

- **Collections** — Save artists/releases to your profile. Organize them. Show them off.
- **Curators** — Anyone can become a tastemaker. Build a following based on taste, not content creation.
- **Embeddable widgets** — Blog writers can embed Mercury search results, artist cards, curated lists directly in their posts.
- **Attribution** — When a curator's recommendation leads to discovery, they get credit. Drives traffic back to their blog/profile.
- **First access** — Curators/bloggers get early visibility into emerging artists, unclaimed profiles, new additions to the index.

## Revenue Model

This is a public good. Not a business. Nobody gets advantages over anyone else. The music is what matters, not money.

- **Patronage** — GitHub Sponsors, Ko-fi, Patreon. People support it because they believe in it.
- **Grants** — NLnet Foundation, Mozilla Foundation, EU NGI, Sovereign Tech Fund. Open infrastructure funding.
- **Radical transparency** — Public finances page. What it costs, what comes in, hide nothing.

### Rules

- No paid tiers. No premium features. No "pro" anything.
- No businesses building on top of this. No API-for-profit.
- No one gets more visibility because they have money.
- No ads, no tracking, no algorithmic manipulation.
- No selling user data. No crypto/tokens.
- Everyone gets the same thing. The music is the differentiator, nothing else.

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
