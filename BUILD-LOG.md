# Build Log — Music Discovery Platform

A documentary record of building this project from idea to reality.

---

## Entry 001 — 2026-02-14 — The Name Search

### Context
Steve has been thinking about a decentralized music discovery platform for 10+ years. After a deep research session exploring the landscape (blockchain music graveyard, discovery gap, open data sources), the vision crystallized:

> A music search engine with taste. Not a platform, not a streaming service. Indexes ALL music from open databases, auto-embeds players, uses atomic artist-defined tags, completely open source. Audio never hosted — always lives on the artist's own infrastructure.

Now we need a name.

### Naming Profile (from Q&A)
- **Feeling:** Finding buried treasure — discovering something nobody else knows about
- **Territory:** From another domain entirely — not music vocabulary
- **Meaning:** Hints at music without saying it — evocative, not literal
- **500-year analog:** A library / archive — a vast collection you can wander through
- **Directions that spark:**
  - The hidden layer (stuff growing beneath the mainstream)
  - The medium (invisible substance that carries sound)
  - Navigation without a map (finding things you didn't know existed)
- **Constraint:** Must be fundamentally new. Not derivative of existing tech naming patterns.
- **Technical constraint:** Name stored as single variable — easy to change later.

### Rejected Directions
First batch of names rejected outright — too obvious, too derivative:
- Crate, DeepCrate, Needledrop, Stacks (crate-digging cliches)
- Resonance, Harmonic, Overtone (music physics — too on the nose)
- OpenCrate, Unmute, Uncurated (anti-platform branding — dated)
- Sift, Trawl, Wax (generic verbs/nouns)

### The Intersection
What we're looking for lives at the intersection of:
```
LIBRARY (vast, wanderable)
  × HIDDEN LAYER (beneath the surface)
    × NAVIGATION (wayfinding without a map)
      × THE MEDIUM (invisible carrier of sound)
```

### Outcome
Three rounds of name exploration — all rejected. The right name is intuitive, not analytical. It'll show up when we're deep in the work, not staring at a blank page.

<!-- decision: Use codename "Mercury" -->
The right name hasn't arrived yet. Ship with a codename, store it in a single variable, change once when the real name appears.
**Rejected:** Crate, DeepCrate, Resonance, Harmonic, Overtone, Sift, Trawl
<!-- /decision -->

Technical setup: name stored as single variable, change once → propagates everywhere. The codename is deliberately temporary.

Naming candidates file will be maintained separately — drop ideas in as they surface, no pressure.

---

## Entry 002 — 2026-02-14 — Project Setup

Starting the actual build. Creating the repo, writing PROJECT.md, defining the tech stack.

### Tech Stack Decision

<!-- chat -->
**Steve:** Does that need a database? Where will this be hosted? Hosting costs money. Isn't the internet itself a database?
**Claude:** The data already exists openly. MusicBrainz is CC0, Discogs has monthly dumps. We just need a search index — a pre-processed snapshot of data that's already on the internet.
**Steve:** So we don't actually host anything?
**Claude:** Nothing. The audio lives on artist infrastructure. Mercury is just the lens.
<!-- /chat -->

This reframed everything. Mercury doesn't own any content. The only thing that needs hosting is a **search index** — a pre-processed, optimized snapshot of data that already exists on the internet.

**The $0 stack:**
| Layer | Tech | Cost |
|-------|------|------|
| Frontend | SvelteKit | Free (Cloudflare Pages) |
| Search index | SQLite + FTS5 via Cloudflare D1 | Free (5M reads/day) |
| API | SvelteKit server routes (Workers) | Free |
| Data pipeline | Node.js scripts (runs locally) | Free |

<!-- decision: SvelteKit over Next.js -->
Compiles away the framework — less JS shipped. Independent project, not a Meta dependency. First-class Cloudflare adapter. Cleaner code for open source contributions.
**Rejected:** Next.js, Astro
<!-- /decision -->

### Files Created

```
D:\Projects\Mercury\
  PROJECT.md       — Vision, architecture, research links
  CLAUDE.md        — Claude context for the project
  README.md        — Public-facing project description
  src/lib/config.ts — THE single variable for project name
  src/routes/+page.svelte — Landing page with disabled search bar
  (SvelteKit scaffold: package.json, svelte.config.js, etc.)
```

### The Landing Page

Dark, minimal. Shows the name, the tagline, and a disabled search bar with "Coming soon. Indexing 2.6 million artists from open databases." The search bar is the product. Everything else is built around making it work.

---

## Entry 003 — 2026-02-14 — Three Big Ideas

During project setup, Steve dropped three interconnected ideas that reshape the product:

### Idea 1: Democratic Discovery (uniqueness = visibility)

> "I want the app to be inspirational towards letting them carve their own niche. The more they lean into that, the more they get discovered."

The mechanic: If you're tagged "electronic" you're one of 500,000 — invisible. If you're tagged "dark ambient / granular synthesis / field recordings from abandoned factories" you're one of 12 — highly discoverable through any of those tags. The system naturally rewards uniqueness and naturally demotes generic AI-generated music without needing to ban it.

This inverts the Spotify model where sameness gets you playlisted.

### Idea 2: Taste as Identity (social layer)

> "People that use the app should be able to show off their music taste. Like you show your record collections. Everybody can become a tastemaker or curator."

Opt-in profiles (browse anonymously by default). Your profile IS your record collection. Shareable. This turns passive listeners into active discoverers — every user becomes a potential signal for others.

### Idea 3: Blog Revival

> "I want blog writers to pick up on this. Inspire them to be bloggers again. There needs to be something that makes them want to blog again."

Music blogs died because Spotify killed the discovery loop. Mercury creates a new one:
- Embeddable widgets (search results, artist cards, curated lists)
- Attribution and reach (curation gets credit, drives traffic back to blogs)
- First access (bloggers get early visibility into emerging artists)

---

## Entry 004 — 2026-02-14 — The Distributed Database

Steve's question: "Aren't LLMs compressed knowledge? Maybe the database is constantly downloaded to the users' computer. Or scattered around as torrent."

This led to a fundamental architecture shift:

### Two-Layer Architecture

The web app is the GATEWAY, not the product. The real thing is a downloadable SQLite database on your machine.

```
WEB (gateway)              LOCAL (the real thing)
  Cloudflare free tier       Tauri desktop app
  SQLite on D1               SQLite on your disk
  Zero friction              Full power, offline
  First experience           Power user, unkillable
```

The entire index = one SQLite file (~2-5GB). Downloadable. Torrentable. Updates as diffs. More users = faster propagation (opposite of centralized hosting).

### Unkillable by Design

Domain seized? Cloudflare bans? Doesn't matter — data lives on user machines. This is the insurance policy that no previous music platform had.

### Build Both Simultaneously

Steve's decision: don't prioritize web over desktop. Build the data pipeline first — it feeds both. The pipeline is the foundation.

```
MusicBrainz/Discogs dumps → Pipeline → SQLite file
  ├── Upload to D1 → Web app
  ├── Distribute as torrent → Desktop app
  └── Use locally → Development
```

---

## Entry 005 — 2026-02-14 — Revenue Model + Build Protocol

### Revenue: Honest Money from Day One

Steve: "I want to be able to earn some money so I can go on creating it. Preferably right from the beginning. How can I make it so it's honest and doesn't turn off people?"

Six models explored:
1. Open patronage (GitHub Sponsors, Ko-fi, Patreon)
2. Radical transparency (public finances page)
3. Pro curator tools (paid tier for bloggers/tastemakers)
4. Artist profile upgrades (paid analytics/tools)
5. Grants (NLnet, Mozilla, EU NGI, Sovereign Tech Fund)
6. Website-in-a-box hosting referrals

**Initial decision:** Patronage + transparency + grants, with pro curator tools and artist upgrades planned for later.

**REVISED (same session):** Steve rejected ALL paid tiers and business models:

<!-- chat -->
**Steve:** I don't want anyone to have advantages over the other. It's the music and not about having money that can push you more up or make you look better. I don't want any businesses to build on top of it.
**Claude:** So pure public good. Patronage and grants only. No premium features, no pro tiers, no paid advantages. The Wikipedia model.
**Steve:** Exactly. Everyone gets the same thing. Always.
<!-- /chat -->

<!-- breakthrough -->
Pure public good. No premium features, no pro tiers, no paid advantages, no API-for-profit. Everyone gets the same thing. The Wikipedia/MusicBrainz model. The music is the only differentiator.
<!-- /breakthrough -->

### Licensing Confirmed

MusicBrainz data: **CC0 (public domain)**. No restrictions whatsoever. Can use for commercial projects, no attribution legally required (though we'll credit them). This is the foundation — nobody can ever claim license violation.

Discogs: Free dumps available, but commercial terms need verification. MusicBrainz alone is 2.6M artists — enough to start.

### Build Protocol Established

Full documentation protocol set up:
1. **CLAUDE.md instructions** — mandatory session start/during/end logging
2. **Git post-commit hook** — auto-appends commit info to BUILD-LOG.md
3. **Session ritual** — read log, state intent, log decisions, summarize, handoff

BUILD-LOG.md moved from ControlCenter to Mercury repo (where it belongs).

### What's Next

1. Start the data pipeline (download MusicBrainz dumps, process into SQLite)
2. Build search
3. Set up GitHub Sponsors / patronage presence

> **Commit 4f2f071** (2026-02-14) — init: Mercury project — music search engine with taste
> Files changed: 20

---

## Entry 006 — 2026-02-14 — Roadmap Defined

7 phases mapped out. See ROADMAP.md for full details.

- **Phase 0:** Patronage + grants (parallel)
- **Phase 1:** Data pipeline (MusicBrainz → SQLite + FTS5)
- **Phase 2:** Search + artist pages + embeds (web) — the "holy shit" moment
- **Phase 3:** Desktop app + torrent distribution (Steve insisted this be early, not late)
- **Phase 4:** Tag-based discovery (democratic uniqueness mechanic)
- **Phase 5:** Social layer (opt-in profiles, collections, taste sharing)
- **Phase 6:** Blog/curator tools (embeddable widgets, attribution)

<!-- decision: Desktop moved to Phase 3 -->
Desktop was originally Phase 5. Steve moved it to Phase 3 — the unkillable local version is too important to delay. If the web goes down, users still have everything locally.
**Rejected:** Desktop at Phase 5 (too late)
<!-- /decision -->

Revenue model reiterated: no paid tiers in any phase. Everyone gets the same thing. Always.

> **Commit 678cc33** (2026-02-14 19:50) — docs: roadmap, build protocol, handoff
> Files changed: 4

---

## Entry 007 — 2026-02-14 — Build Log Viewer (OBS Streaming Dashboard)

### Context

Steve wants to stream the Mercury build process live on YouTube via OBS. Needed a standalone local web app that watches BUILD-LOG.md for changes, renders entries in real-time, and serves as an OBS Browser Source.

### What Was Built

`tools/build-log-viewer/` — 3 files, single-purpose read-only display app:

```
tools/build-log-viewer/
  package.json          — Express + chokidar + marked
  server.js             — Express server, file watcher, SSE endpoint, sensitive content filter
  public/index.html     — Full app (HTML + inline CSS + inline JS, single file)
```

**Architecture:** `BUILD-LOG.md → chokidar (file watcher) → Express SSE → Browser → OBS Browser Source`

### Key Details

- **Port:** 18800 (configurable via `--port`)
- **SSE streaming:** Same pattern as ControlCenter notification stream — `init` event on connect, `update` on file change, 30s heartbeat keep-alive
- **Styling:** Exact ControlCenter dashboard colors — `#0d1117` background, `#161b22` cards, `#30363d` borders, `#d29922` gold accents for commits/blockquotes, Cascadia Code font stack
- **Sensitive content filter:** Server-side stripping of lines containing passwords, tokens, API keys, secrets, .env references. Verified working — fake `API_KEY=xxx` line was stripped, normal content passed through.
- **Auto-scroll:** Always scrolled to bottom, new entries animate in with fade
- **Connection status:** Green/red dot in header with auto-reconnect on disconnect

### Usage

```bash
cd tools/build-log-viewer
npm install
npm run dev     # Watches ../../BUILD-LOG.md on port 18800
```

OBS: Add Browser Source → `http://localhost:18800`

### Decision

Kept it deliberately minimal — vanilla HTML/CSS/JS, no framework. It's a read-only display for streaming. The ControlCenter aesthetic carries over cleanly.

---

## Entry 008 — 2026-02-14 — Phase 1: Data Pipeline + Architecture Rethink

### The Pipeline (built, then slimmed)

Built `pipeline/` — Node.js pipeline that downloads MusicBrainz dumps, extracts tables, parses TSV, produces SQLite + FTS5. Three scripts: `download.js`, `import.js`, `verify.js`.

Initially built full-fat: artists, aliases, release groups, URLs, tags (15 tables, ~1-2 GB database). Then Steve challenged the assumptions through a series of questions that reshaped the architecture.

### Architectural Decisions (conversation-driven)

**Decision 1: Mercury is an independent catalog, not a MusicBrainz frontend.**

Steve: "my idea was that all music can be found. with musikbrainz its maybe not possible. also if musikbrainz doesnt exist anymore that would be problematic"

MusicBrainz is the seed data (2.6M artists on day one), but Mercury builds its own catalog over time. Artists not in MusicBrainz can submit directly. If MusicBrainz disappears, Mercury's data survives on user machines.

**Decision 2: The internet is the database. Mercury is just the index.**

<!-- chat -->
**Steve:** like i said previously. isnt the internet the database already?
**Claude:** Yes. We don't store releases, URLs, bios, or discographies. That data lives on Bandcamp, Spotify, YouTube — we fetch it live when someone clicks an artist. The database is just what you need to search and browse.
<!-- /chat -->

<!-- breakthrough -->
We don't host audio. We don't store metadata. We embed from where it already lives. The entire database is a slim discovery index — artists, tags, country. That's it.
<!-- /breakthrough -->

**Decision 3: Slim database = artists + tags + country. That's it.**

> "well if we just map all artists out that would be enough. tagged by certain factors that are interesting for music discovery. like style and maybe country"

Pipeline slimmed from 15 tables to 5 (artist, artist_type, area, tag, artist_tag). Database drops from ~1-2 GB to ~100-200 MB. Compressed for distribution: ~30-50 MB. Small enough to load in a browser.

**Decision 4: Mercury builds its own style map.**

Steve: "i think we should build a music style mapping thing ourselves. also because of our core-idea that people should carve out new styles."

Inspired by Every Noise at Once (closed source, died when creator left Spotify). Mercury's version is fundamentally different: styles emerge bottom-up from artist and community tags. New styles are invented by artists. The map is alive — grows as new scenes form.

> "its important that we transform everything. we have to make it our own. so it becomes different from everything. how we create the map should also be unique"

The style map is built from tag co-occurrence data. Artists tagged "shoegaze" + "dream pop" place those styles near each other. The more niche the tag, the more visible the cluster. This IS the "uniqueness = visibility" mechanic made visual.

**Decision 5: Two-speed data freshness.**

Full catalog: weekly sync from dumps. Followed artists: near real-time via RSS feeds, APIs, MusicBrainz edit stream. Community attention drives freshness — more followers = more frequent checks.

### What Was Actually Built

```
pipeline/
  package.json         — better-sqlite3, tar, unbzip2-stream
  download.js          — Downloads MusicBrainz dumps with progress
  import.js            — Extract → lookup tables → artists → tags → FTS5
  verify.js            — Test search, stats, tag co-occurrence, style map preview
  lib/
    tables.js          — 5 MusicBrainz table definitions (slimmed from 15)
    parse-tsv.js       — PostgreSQL COPY format parser
    schema.sql         — 2 tables + FTS5 (artists + artist_tags)
```

### Bug Fix: Build Log Viewer

<!-- dead-end -->
Chokidar file watcher doesn't fire on Windows with default settings. `fs.watch` misses writes. Had to add `usePolling: true` with 500ms interval — slower but reliable.
<!-- /dead-end -->

### Download Status

First run of `npm run download` started. mbdump.tar.bz2 (6.5 GB) downloading, mbdump-derived.tar.bz2 (500 MB) next. Import runs after download completes.

> **Commit 0fb8268** (2026-02-15 10:47) — feat: data pipeline + build log viewer
> Files changed: 15

> **Commit bfbbce5** (2026-02-15 11:06) — docs(02): capture phase context
> Files changed: 1

> **Commit 6b91573** (2026-02-15 11:16) — docs(02): research phase domain
> Files changed: 1

> **Commit 3d47ebc** (2026-02-15 11:24) — docs(02-search-and-embeds): create phase plan
> Files changed: 6

> **Commit 413268c** (2026-02-15 11:30) — feat(02-01): swap to Cloudflare adapter and configure D1 bindings
> Files changed: 5

> **Commit 8f3977f** (2026-02-15 11:31) — feat(02-02): create dark theme and global layout
> Files changed: 3

> **Commit 43f8071** (2026-02-15 11:33) — feat(02-01): create database query module and slug system
> Files changed: 5

> **Commit 31b34b7** (2026-02-15 11:33) — feat(02-02): build landing page with search bar and reusable components
> Files changed: 3

> **Commit 06608b5** (2026-02-15 11:34) — docs(02-02): complete visual foundation plan
> Files changed: 2

> **Commit 7e6ef13** (2026-02-15 11:34) — docs(02-01): complete Cloudflare D1 + search queries + slugs plan
> Files changed: 2

> **Commit a54f18e** (2026-02-15 11:54) — feat(02-03): create search API endpoint and server load function
> Files changed: 2

> **Commit 8567c9b** (2026-02-15 11:54) — feat(02-03): build search results page with ArtistCard grid
> Files changed: 2

> **Commit f064972** (2026-02-15 11:55) — docs(02-03): complete search results page plan
> Files changed: 3

> **Commit 8b9967f** (2026-02-15 11:58) — feat(02-04): add MusicBrainz API proxy, embed utilities, and bio fetcher
> Files changed: 7

> **Commit 21fffe8** (2026-02-15 11:59) — feat(02-04): build artist page with embeds, bio, and balanced layout
> Files changed: 4

> **Commit 2c91595** (2026-02-15 12:01) — docs(02-04): complete artist pages with embeds plan
> Files changed: 3

> **Commit 07cd86e** (2026-02-15 12:15) — wip: phase 2 paused at plan 5/5 (visual verification)
> Files changed: 1

---

## Entry 009 — 2026-02-15 — Build Log Viewer: Documentary Dashboard

### Context

The build log viewer was a scrolling wall of markdown — functional but boring to watch on stream. Transformed it into a live activity dashboard with visual variety for the OBS browser source.

### What Changed

**server.js — Two new functions:**
- `preprocessSpecialBlocks(markdown)`: Runs before `marked.parse()`, converts HTML comment markers (`<!-- chat -->`, `<!-- decision -->`, `<!-- dead-end -->`, `<!-- breakthrough -->`) into styled HTML divs. Chat blocks parse `**Steve:**`/`**Claude:**` lines into separate bubble divs.
- `extractStats(markdown)`: Counts commits, sums files changed, counts entries, detects current phase, extracts latest commit info. Returns stats alongside HTML in every SSE event.

**index.html — Dashboard layout:**
- Stats header: 4 stat boxes (commits, files changed, entries, current phase) with green flash animation on value change
- Commit ticker: Thin bar showing latest commit hash + message
- 4 styled block types: chat bubbles (Steve blue, Claude purple), decision cards (gold accent + red rejected), dead-end blocks (red + dimmed), breakthrough blocks (green accent)

**BUILD-LOG.md — Seeded with real content:**
- The "$0 stack" conversation as a chat block
- "SvelteKit over Next.js" and "Use codename Mercury" as decision cards
- The revenue model conversation ending in the "pure public good" breakthrough
- The "internet is the database" conversation + breakthrough
- Chokidar Windows dead-end
- Desktop moved to Phase 3 decision

### Key Detail

All special blocks use HTML comment markers (`<!-- chat -->...<!-- /chat -->`). These are invisible on GitHub — BUILD-LOG.md still renders as normal markdown. Only the build log viewer transforms them into styled blocks.

> **Commit a0db608** (2026-02-15 14:56) — feat(tools): build log viewer dashboard with stats, chat bubbles, and block types
> Files changed: 3

## Entry 010 — 2026-02-15 — Vision Expansion: The Full Picture

### Context

Steve recorded a voice memo laying out the full vision — the frustrations, the history, everything he's been thinking about for 10+ years. Compared it against PROJECT.md and found significant gaps. The existing doc had the bones but was missing the soul.

### What Was Added to PROJECT.md

**New core concepts (8-13):**
- **Crate Digging Mode** — serendipitous browsing through filtered stacks, like flipping through records at a shop
- **Scene Maps** — geographic + temporal visualization of music scenes (Berlin techno '95, Buenos Aires now)
- **Time Machine** — browse by year, scrub a timeline, watch genres evolve
- **Liner Notes Revival** — bring back credits, stories, production details that digital killed
- **Import Your Library** — bootstrap from Spotify/Last.fm/Apple Music, no cold-start problem
- **Listening Rooms** — shared real-time listening with synchronized embeds and chat

**New UX Philosophy section:**
- The Record Shop metaphor as the guiding design principle — spatial, tactile, personal
- Explicit rejection of the flat-list paradigm (Spotify's boring scrollable columns)

**Expanded existing concepts:**
- Tagging system now has two layers: artist tags (discovery) + user tags (personal organization)
- Embed engine now includes user-selectable streaming service preference
- Taste as Identity now includes Taste Fingerprint — a generated visual pattern unique to your collection
- Blog Revival now includes writing inside the platform, not just external embedding
- Tiers expanded: auto-pulled news from social media, artist news dashboard, static site generator for self-hosting

**New Social Layer features:**
- No vanity metrics (no follower counts, no like counts, no play counts) — elevated to core design rule
- Discussion spaces — real conversation threads around music
- QR codes for collections — physical-digital bridge
- Embeddable collections on personal websites

**New Interoperability section:**
- RSS for everything (every artist, collection, tag, curator)
- ActivityPub/Fediverse integration — profiles followable from Mastodon
- Full import/export — your data is yours

**Revenue model:**
- Added affiliate links for artist self-hosting providers

**Rules:**
- Added explicit "no vanity metrics" rule

### Why This Matters

The original PROJECT.md was a technical spec. Now it's a vision document. The Record Shop philosophy, the anti-metrics stance, the writing features, the interoperability layer — these are what make this different from every other music platform that tried and failed. They all focused on payments or blockchain. This focuses on the experience of discovering and caring about music.

## Entry 011 — 2026-02-15 — Sustainability Strategy: The Merch Table

### Context

The project needs money to survive but its rules forbid paid tiers, premium features, or any advantage from paying. The funding mechanism itself needs to feel like it belongs to the project — not bolted on, not a startup pitch, not a crypto scheme. It should feel like the merch table at a record shop.

### The Strategy

Revenue Model renamed to **Sustainability** in PROJECT.md. Completely rethought from "here are some donation links" to a staged, principled approach.

**Core communication principle:** Never a popup. Never a nag. Never a gate. The ask is "keep this alive," not "upgrade to pro." Different moments get different levels of presence:
- First visit: nothing
- Regular use: subtle footer heartbeat
- Database download: gentle one-time prompt
- Finances page as a feature in itself — radical transparency as interface

**Four stages, tied to phases:**

1. **Foundation (Phase 2)** — GitHub Sponsors, Ko-fi, Open Collective, public finances page, footer link
2. **Story (Phase 3)** — Patreon with behind-the-scenes content, donation prompt on download, Liner Notes backer credits page, stickers/patches
3. **Identity (Phase 4-5)** — Taste Fingerprint prints (personalized merch from your collection), discovery tokens with QR codes, tote bags, Supporter Wall
4. **Community (Phase 5-6)** — Artist collaboration merch, milestone drops, full print-on-demand store

**Physical goods philosophy:** Not generic merch. Artifacts that only exist because this project exists. Your Taste Fingerprint printed as a poster — unique to your collection, nobody else has the same one. Discovery tokens with QR codes linking to hidden crate digs. Tote bags like record store bags. Everything print-on-demand, zero inventory risk.

**The rule that binds it all:** Supporters get acknowledgment and physical goods. Never platform advantages. Never.

### Files Updated
- `PROJECT.md` — Revenue Model → Sustainability (expanded with channels, physical goods, communication philosophy, staged rollout, production model)
- `.planning/ROADMAP.md` — Phase 0 expanded from 5 checkboxes to 4 stages with 15+ items tied to main phases
- `.planning/REQUIREMENTS.md` — Added SUST-01 through SUST-10, updated traceability table (15 → 25 requirements)

> **Commit 609b4d4** (2026-02-15 18:55) — docs: expand vision with full feature set, sustainability strategy, and 9-phase roadmap
> Files changed: 4

## Entry 012 — 2026-02-15 — Search Ranking Fix + Loading Indicator

### Context

Phase 2 visual review. Steve searched "Radiohead" and the actual Radiohead didn't appear in results — 50 results, all tribute acts and tag matches, no real band. Also no loading feedback after hitting enter.

### The Bug: Wrong JOIN

The FTS5 search query joined on name:
```sql
JOIN artists a ON a.name = f.name
```

This is wrong. The FTS5 virtual table's `rowid` maps to `artists.id` — that's how it was populated in the pipeline. Joining on name breaks when multiple artists share a name and loses the 1:1 relationship between FTS rows and artist records.

**Fix:** `JOIN artists a ON a.id = f.rowid`

### The Bug: No Ranking Priority

FTS5 `ORDER BY rank` (BM25) treats name matches and tag matches equally. An artist tagged "radiohead" ranks the same as one named "Radiohead." With 50 result limit, the real band gets buried.

**Fix:** Added CASE priority ordering:
```sql
ORDER BY
  CASE
    WHEN LOWER(a.name) = ? THEN 0      -- exact match first
    WHEN LOWER(a.name) LIKE ? THEN 1    -- prefix match second
    ELSE 2                               -- tag/partial match last
  END,
  f.rank
```

### The Bug: Broken Tag Display

FTS table stores tags space-separated (`GROUP_CONCAT(tag, ' ')`), but ArtistCard splits on `', '`. Multi-word tags like "dark ambient" displayed as separate words.

**Fix:** Replaced `f.tags` with a correlated subquery from `artist_tags`:
```sql
(SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
```

### Loading Indicator

Added animated loading bar to `+layout.svelte` using SvelteKit's `navigating` store. Appears at top of page during any navigation — immediate visual feedback when you hit enter.

### Embed Limitations (documented, not fixed)

Steve's review surfaced embed limitations — all expected from the MusicBrainz-URL-only approach:
- **Bandcamp:** Link only. No oEmbed API, embed requires album IDs we don't have.
- **Spotify:** Click-to-load embed works when URL format matches. Some URLs don't match the parser.
- **YouTube:** MusicBrainz stores channel URLs, not video URLs. Channels can't be embedded.
- **Dead links:** MusicBrainz community data can be stale.

These are Phase 4 improvements (YouTube API for recent videos, Bandcamp album scraping, etc.).

### Files Changed
- `src/lib/db/queries.ts` — Fixed JOIN, added ranking priority, fixed tag display
- `src/routes/+layout.svelte` — Added loading bar with `navigating` store

> **Commit 5a02a9a** (2026-02-15 20:08) — feat: complete Phase 2 — search ranking fix, loading indicator, Spotify fallback
> Files changed: 9

---

## Entry 013 — 2026-02-15 — Artist Page Redesign: Discography + Categorized Links

### Context

The artist page had a two-column layout — info on the left, a generic embed player sidebar on the right. Links were dumped in a flat uncategorized list. Steve wanted a Bandcamp-style discography layout with proper link organization. The embed sidebar felt bolted on rather than intentional.

### What Changed

**New single-column layout replaces the two-column grid:**

```
Artist Name
Group — Germany · 1997 — present
[indie rock] [post-punk] [shoegaze]

Bio text (collapsed if long, "Read more" toggle)

── Discography ──────────────────────
┌──────────┐  ┌──────────┐
│ Cover Art │  │ Cover Art │
│ Album A  │  │ Album B  │
│ 2024     │  │ 2021     │
│ [BC][SP] │  │ [SC][YT] │
└──────────┘  └──────────┘
[ Inline SoundCloud/YouTube player ]

── Links ────────────────────────────
OFFICIAL  artist-website.com
SOCIAL    Instagram · Twitter · Mastodon
INFO      Wikipedia · Discogs · RateYourMusic
SUPPORT   Patreon
```

### New Files

**`src/lib/embeds/categorize.ts`** — Shared categorization logic. Maps MusicBrainz relationship `type` strings (e.g., "streaming", "social network", "official homepage", "wikipedia") to semantic categories. Domain-based fallback for streaming platforms. Friendly label generation from URLs (e.g., `open.spotify.com` → "Spotify").

**`src/routes/api/artist/[mbid]/releases/+server.ts`** — New API endpoint that fetches release groups (albums/EPs/singles) from MusicBrainz with URL relationships in one call. Extracts streaming links per release, constructs Cover Art Archive URLs. Same caching pattern (24h TTL, Cloudflare Cache API).

**`src/routes/api/soundcloud-oembed/+server.ts`** — CORS proxy for SoundCloud oEmbed. SoundCloud's oEmbed endpoint doesn't support CORS, so when a user clicks play on a release's SoundCloud link, we proxy through our server.

**`src/lib/components/ReleaseCard.svelte`** — Release card component: 180px cover art with 404 placeholder (shows title initial), title + year + type badge (Album/EP/Single, color-coded), platform link chips (BC/SP/SC/YT). Clicking SoundCloud/YouTube expands an inline player below the discography. Clicking Bandcamp/Spotify opens in new tab.

### Modified Files

**`src/lib/embeds/types.ts`** — Added `ReleaseGroup`, `CategorizedLinks`, `ReleaseLink`, `LinkCategory` types. Added display constants (`LINK_CATEGORY_ORDER`, `LINK_CATEGORY_LABELS`).

**`src/routes/api/artist/[mbid]/links/+server.ts`** — Now returns both legacy `PlatformLinks` and new `CategorizedLinks` format. Uses MusicBrainz relationship `type` field for semantic categorization instead of just domain matching. Deduplicates URLs.

**`src/routes/artist/[slug]/+page.server.ts`** — Parallel fetch: releases + links fire concurrently via `Promise.allSettled`. Bio still depends on links (needs Wikipedia URL). Returns `categorizedLinks` and `releases` to the page.

**`src/routes/artist/[slug]/+page.svelte`** — Full redesign. Single-column layout. Header with combined metadata line (type + country + year range). Collapsible bio. Discography grid with ReleaseCard components. Inline player area. Categorized links section with semantic groups.

<!-- decision: Release data comes from live MusicBrainz API, not local database -->
Release groups (albums, EPs, singles) are fetched live from the MusicBrainz API on each artist page visit, with 24-hour caching. Cover art comes from the Cover Art Archive via direct URL. This keeps the local database slim (just the search index) and follows the "internet is the database" principle.
**Rejected:** Storing releases in local SQLite (bloats the index, duplicates what MB already has)
<!-- /decision -->

<!-- decision: Links categorized by MB relationship type, not domain -->
MusicBrainz provides a `type` field on every URL relationship (e.g., "streaming", "social network", "official homepage"). Using this for categorization is more accurate than domain guessing — a Bandcamp link typed as "official homepage" by MB is still a streaming link (domain detection overrides for known platforms).
**Rejected:** Pure domain-based categorization (misses social/official/support distinctions)
<!-- /decision -->

### Edge Cases Handled
- **No releases found:** Page renders without discography section
- **Cover art 404:** Shows placeholder with album title initial letter
- **100+ releases:** Shows first 50 with "Show all" button
- **MB API failure:** Artist page still renders from DB data (best-effort)

### Build Status
`npm run build` — clean. `npm run check` — 0 errors, 0 warnings.


> **Commit 833b796** (2026-02-15 21:12) — feat: redesign artist page with discography grid, categorized links, and Listen On bar
> Files changed: 16

> **Commit 03f8876** (2026-02-15 21:27) — wip: paused between phases — choosing next phase
> Files changed: 1

---

## Entry 014 — 2026-02-16 — Vision Refinement: What Mercury Actually Is

### Context

Steve wrote a long-form vision document articulating everything he'd been thinking about Mercury — the audio hosting problem, aggregation vs hosting, the music map, local playback, remote streaming, funding, social features, and the philosophy underneath it all. Went through it section by section with a critical lens: what's legal, what's naive, what's realistic. Then a structured questionnaire to lock in decisions.

### The Reframe

Mercury is not a web app with a desktop companion. Mercury is a **desktop app that connects to the open internet.** There is no "web vs desktop" split. It's one product — a Tauri desktop app that:
- Plays music you own (local files)
- Discovers music through open data (MusicBrainz, Wikidata, Cover Art Archive)
- Embeds players from where music already lives (Bandcamp, SoundCloud, YouTube, Spotify)
- Uses AI as a core feature for recommendations, summaries, and exploration
- Stores everything on the user's machine — no central server needed

Cloudflare stays as a lightweight web presence (landing page, maybe a small API), but it's not the product.

### All Decisions (Questionnaire Results)

<!-- decision: Mercury is desktop-first -->
Mercury is a Tauri desktop app. User data lives on their machine in SQLite. Discovery data comes from public APIs. No central server for user accounts. The web version is a gateway/landing page, not the core product.
**Rejected:** Web-first with desktop companion, both-equally approach
<!-- /decision -->

<!-- decision: Local music player is in scope -->
The desktop app includes a full local music player — scan folders, read metadata, play files. Local library is fully merged with online discovery: when you play your own files, Mercury shows related artists, tags, and discovery from the online database. It's one unified experience, not two separate modes.
**Rejected:** Wrapper-first (web shell), library-only (no discovery integration)
<!-- /decision -->

<!-- decision: AI is a core feature -->
AI powers recommendations, content summaries, taste profiling, and natural-language exploration ("find me something like X but darker"). Not a bolt-on or a buzzword — central to how the app works. Open models preferred for client-side processing where possible.
**Rejected:** Minimal/invisible AI, no AI
<!-- /decision -->

<!-- decision: Genre map is the big differentiator — full knowledge base -->
The genre/scene map is the most ambitious feature and the thing that makes Mercury unlike anything else. Content comes in layers:
1. **Open data** — MusicBrainz tags + Wikidata genre relationships (CC0/CC-BY, day one)
2. **Links & embeds** — YouTube documentaries, Wikipedia bios, external articles (legal, always)
3. **AI-assisted summaries** — Original descriptions generated from multiple public sources (gray area, richer experience)
4. **Community-written** — Users write scene histories, genre descriptions, artist bios (wiki-style, needs moderation)

Each layer adds richness. Start with layer 1, build up over time.
**Rejected:** Tags-only, seed-from-open-data-only
<!-- /decision -->

<!-- decision: Composite discovery ranking -->
"Niche = more discoverable" implemented as a composite score:
- **Inverse popularity** — fewer listeners = higher discovery boost
- **Tag rarity scoring** — rare/specific genres rank higher
- **Scene freshness** — new scenes, emerging genres, recently active artists get boosted
Three signals combined. Most nuanced, hardest to tune, but the most honest representation of the philosophy.
**Rejected:** Single-signal approaches
<!-- /decision -->

<!-- decision: Public collections via local export, not server-hosted profiles -->
Users can show off their collections by generating shareable artifacts from the desktop app — screenshots, export files, images. No server-hosted profiles needed. Mercury doesn't need to host user data.
**Rejected:** Central server accounts, federated/P2P, git-based contributions
<!-- /decision -->

<!-- decision: Artist profiles auto-generated, no claiming yet -->
Artist profiles come from MusicBrainz data automatically. No claiming system, no verification infrastructure. Ship discovery first, artist control later.
**Rejected:** OAuth verification, manual review, community flagging (all deferred, not killed)
<!-- /decision -->

<!-- decision: Cross-platform playlist sync deferred -->
Generating Spotify/YouTube playlists from Mercury taste profile is a good idea but carries legal risk (ToS violations, fragile APIs). Parked for a later phase when the core product is solid.
**Rejected for now:** Full sync, export-only
<!-- /decision -->

<!-- decision: Remote streaming deferred -->
Streaming your own collection from home to phone is cool but involves hard infrastructure problems (NAT traversal, dynamic DNS, relay servers). Parked for later. Users who want this today can use Jellyfin/Navidrome.
**Rejected for now:** Full remote, basic LAN-only
<!-- /decision -->

<!-- decision: Funding model confirmed — donations + grants only -->
Architecture keeps costs near-zero (Cloudflare free tier, no audio hosting, no central server). Donations (GitHub Sponsors, Ko-fi, Open Collective) + grants (NLnet, Mozilla, EU NGI) are viable precisely because the infrastructure is so cheap. No paid tiers. No premium features. No exceptions.
**Rejected:** Freemium, subscription, any model that gives paying users platform advantages
<!-- /decision -->

### The Pitch

> A desktop app that knows everything about music, plays what you own, and helps you discover what you don't — using the open internet as its brain.

### What This Means for the Roadmap

The existing Phase 3 (Desktop App + Distribution) becomes more central — it's no longer "the desktop version of the web app" but the **primary product**. The local music player and AI features need to be woven into the phase plan. The web experience built in Phases 1-2 becomes either:
- A landing page / marketing presence
- A lightweight gateway for people who haven't installed the app yet
- Or gets wrapped into the Tauri shell as-is (the SvelteKit frontend works in both contexts)

Phases 4+ (Discovery, Social, Blog, etc.) now target the desktop app primarily. Community features (genre map wiki, shared collections) need creative solutions that don't require a central server.

### What Was Analyzed But Not Decided Yet

- **How the style/genre map UI actually works** — agreed on the data sources and ambition level, but the interaction model is TBD
- **Which AI models** — open models on client side is the preference, but specific model choices and capabilities depend on what's available when we get there
- **Social sharing mechanics** — "generated artifacts" is the direction, but the specific format (images, files, links) needs design work
- **Roadmap reordering** — the phase list needs updating to reflect desktop-first priority and new features (AI, local player, knowledge base)

### Files Updated
- `BUILD-LOG.md` — This entry (14 decisions recorded)
- `PROJECT.md` — Reframed as desktop-first, added local player, AI core, knowledge base, composite ranking, updated architecture and social layer sections

> **Commit 68d44d0** (2026-02-16 19:48) — docs: vision refinement — desktop-first, AI core, local player, knowledge base
> Files changed: 2

---

## Entry 015 — 2026-02-16 — Roadmap Rewrite: Desktop-First, 12 Phases

### Context

Entry 014 redefined Mercury as a desktop-first app, added local music player, AI core, and knowledge base as core features. The old 9-phase roadmap was written for a web-first architecture. Everything needed to change.

### What Changed

**Old roadmap:** 9 phases (data → web → desktop → discovery → social → blog → interop → listening rooms → artist tools)

**New roadmap:** 12 phases reflecting the desktop-first pivot:

| Phase | Name | What's New |
|-------|------|-----------|
| 1 | Data Pipeline | *unchanged, complete* |
| 2 | Web Gateway | Renamed from "Search + Embeds" — it's now explicitly a gateway, not the product |
| 3 | Desktop App Foundation | Same scope, but now framed as "this IS the product" |
| **4** | **Local Music Player** | **NEW** — folder scanning, metadata, playback, library-meets-discovery |
| **5** | **AI Foundation** | **NEW** — client-side models, recommendations, natural-language exploration, taste profiling |
| 6 | Discovery Engine | Slimmed down — Scene Maps, Time Machine, Liner Notes moved to Knowledge Base |
| **7** | **Knowledge Base** | **NEW** — genre/scene map, multi-layer content, scene maps, time machine, liner notes |
| 8 | Social Layer | Updated for local-first (no server accounts, shareable exports) |
| 9 | Curator / Blog Tools | Same scope |
| 10 | Interoperability | Same scope |
| 11 | Listening Rooms | Same scope |
| 12 | Artist Tools | Same scope |

### New Requirements Added

9 new requirements (47 → 56 total):

- **PLAYER-01/02/03**: Local music player (scan, play, unified with discovery)
- **AI-01/02/03/04**: AI features (recommendations, natural language, summaries, taste profiling)
- **KB-01/02**: Knowledge base (genre map, multi-layer content)

### Key Structural Changes

- **DISC-05 (Scene Maps), DISC-06 (Time Machine), DISC-07 (Liner Notes)** moved from Discovery (Phase 6) to Knowledge Base (Phase 7) — they're exploration features, not ranking features
- **DISC-02** updated to explicitly describe composite ranking (inverse popularity + tag rarity + scene freshness)
- **SOCIAL-02** updated from "shareable profile URLs" to "shareable exports" (no server-hosted profiles)
- **Deferred section** added for cross-platform playlist sync and remote streaming
- **Sustainability stages** renumbered to align with new phase numbers

---

## Entry 016 — 2026-02-16 — Phase 3: Desktop App Foundation (Execution)

### Context
Phase 3 turns Mercury into a real desktop app. Tauri 2.0 wraps the SvelteKit UI, local SQLite replaces D1 for offline search, and the database gets a distribution pipeline (compressed download + torrent). 5 plans across 4 waves.

### Wave 1: DB Abstraction + Tauri Scaffolding
Starting with two parallel tracks:
- **03-01**: Database abstraction layer — `DbProvider` interface with D1 and Tauri implementations. Refactors all queries to go through the interface.
- **03-02**: Tauri project initialization — Rust toolchain, dual-adapter build system, desktop window. Has a checkpoint for Rust installation.

Wave 1 complete. Both plans ran in parallel:
- **03-01** (4min): Created `DbProvider` interface, `D1Provider`, `TauriProvider`. Refactored all queries and route handlers. One deviation: API search route also needed updating.
- **03-02** (14min): Installed Rust 1.93.1 via winget. Scaffolded full Tauri project. Dual adapter build confirmed (Cloudflare web + static SPA). Desktop binary compiles. UI verified via Playwright screenshot.

Next: Wave 2 (03-03) — universal load functions so search and artist pages work in both web and desktop.

> **Commit 1afdce4** (2026-02-16 20:02) — docs: rewrite roadmap for desktop-first — 9 phases → 12, 47 → 56 requirements
> Files changed: 4

> **Commit 4251d84** (2026-02-16 20:13) — docs(phase-3): research desktop app foundation domain
> Files changed: 1

> **Commit 0d986be** (2026-02-16 20:22) — docs(03): create phase plan — 5 plans across 4 waves for desktop app foundation
> Files changed: 6

> **Commit ea25cc7** (2026-02-16 20:31) — fix(03): revise plans based on checker feedback
> Files changed: 5

> **Commit 045e3a1** (2026-02-16 20:41) — feat(03-01): create DbProvider interface with D1 and Tauri implementations
> Files changed: 3

> **Commit 5c51849** (2026-02-16 20:43) — refactor(03-01): refactor all queries and routes to use DbProvider abstraction
> Files changed: 4

> **Commit 939eda8** (2026-02-16 20:45) — docs(03-01): complete database abstraction layer plan
> Files changed: 2

> **Commit fe75354** (2026-02-16 20:58) — feat(03-02): initialize Tauri 2.0 project with dual-adapter build system
> Files changed: 67

> **Commit 65cfa8c** (2026-02-16 21:17) — docs(03-02): complete Tauri scaffolding and dual-adapter build plan
> Files changed: 3

> **Commit d26c5a0** (2026-02-16 21:40) — feat(03-03): add platform detection and universal search load function
> Files changed: 2

> **Commit 3f80257** (2026-02-16 21:42) — feat(03-03): add universal artist page load function with link fetching
> Files changed: 1

> **Commit 4de1170** (2026-02-16 21:43) — feat(03-03): add releases and bio fetching to artist universal load
> Files changed: 1

> **Commit ea3bea2** (2026-02-16 21:44) — docs(03-03): complete universal load functions plan
> Files changed: 2

> **Commit 2e2bce1** (2026-02-16 21:49) — feat(03-04): add database detection and first-run setup UI
> Files changed: 4

> **Commit f365c57** (2026-02-16 21:51) — feat(03-04): add database compression and torrent creation pipeline
> Files changed: 3

> **Commit 238414c** (2026-02-16 21:51) — docs(03-04): update STATE.md with task 1-2 progress
> Files changed: 1

---

## Entry 017 — 2026-02-16 — Phase 3 Execution: Waves 2-3 + FTS5 Wall

### What Happened

Executed plans 03-03 and 03-04 (tasks 1-2) in Phase 3. Three plans now complete (03-01 through 03-03), fourth partially done.

**03-03 (5 min):** Universal load functions. Platform detection via `window.__TAURI_INTERNALS__`, universal `+page.ts` files that coexist with `+page.server.ts`. Web build passes through server data unchanged. Tauri build queries local SQLite + fetches MusicBrainz client-side. Each external fetch (links, releases, bio) independently try/caught — artist page renders from DB data alone if any API fails.

**03-04 tasks 1-2:** First-run setup UI works beautifully — "Mercury needs a database" screen with file path and "Check Again" button. Database compression pipeline produces 365MB .gz from 778MB source, plus SHA256 checksum and .torrent file.

### The FTS5 Wall

<!-- dead-end -->
Hit a blocking bug during 03-04 checkpoint verification. Search returns: `no such table: artists_fts`.

**Root cause:** `tauri-plugin-sql` uses sqlx with bundled SQLite. The bundled build does NOT include FTS5 by default. The `artists_fts` virtual table (FTS5) exists in mercury.db, but the SQLite binary compiled into the Tauri app can't read it.

**Debugging journey:**
1. First thought it was SSR still enabled in dev mode — fixed `beforeDevCommand` to set `VITE_TAURI=1`
2. Then suspected missing `sql:allow-load` permission — added it
3. Then suspected Windows backslash path issue — normalized to forward slashes
4. Added temporary debug error display to surface the actual error message
5. Error revealed: FTS5 not compiled into SQLite

**The fix** (for next session): Create `src-tauri/.cargo/config.toml` with `LIBSQLITE3_FLAGS = "-DSQLITE_ENABLE_FTS5"` and do a full Cargo rebuild.
<!-- /dead-end -->

### Also Discovered

- Tauri dev mode requires `VITE_TAURI=1` in `beforeDevCommand`, otherwise SSR stays enabled and server load functions try to access D1 (which doesn't exist locally)
- Rust PATH isn't in default terminals after winget install — needs manual `set PATH` each session
- The first-run UI looks clean and matches the dark theme perfectly

### Session Status

Plans 03-01 ✓, 03-02 ✓, 03-03 ✓, 03-04 partial (2/3 tasks), 03-05 pending. Several uncommitted hotfixes from debugging. FTS5 fix needed before continuing.

### The Actual Bug (Not FTS5!)

The previous session diagnosed this as "FTS5 not compiled into bundled SQLite." Wrong. FTS5 is unconditionally enabled in `libsqlite3-sys` bundled builds — always has been.

The real bug: **missing path separator** in `tauri-provider.ts`. `appDataDir()` returns `C:\Users\User\AppData\Roaming\com.mercury.app` (no trailing slash). Concatenating `dir + 'mercury.db'` produced `com.mercury.appmercury.db` — a nonexistent file. SQLite silently created an empty database at that path, which obviously had no `artists_fts` table.

**Fix:** Normalize and ensure trailing slash before appending filename.

### 03-05: Signing Keys + NSIS Installer

Generated the Tauri updater signing key pair:
- Private key: `~/.tauri/mercury.key` (NOT in git, NOT password-protected)
- Public key: embedded in `tauri.conf.json` under `plugins.updater.pubkey`
- **Back this key up.** Losing it means existing users can never auto-update.

Configured the auto-updater plugin:
- Updater endpoint: placeholder URL (real one when update server exists)
- Updater plugin enabled in `lib.rs`

Built the NSIS installer:
- `Mercury_0.1.0_x64-setup.exe` — **3.9MB** installer, 15MB binary
- Install mode: `currentUser` (no admin required)
- Bundle target: NSIS only (handles WebView2 bootstrapping on Windows 10)

### Phase 3 Complete

All 5 plans executed:
- **03-01** ✓ Database abstraction layer (DbProvider interface)
- **03-02** ✓ Tauri scaffolding + dual-adapter build
- **03-03** ✓ Universal load functions (web passthrough / Tauri local DB)
- **03-04** ✓ First-run setup UI + database compression pipeline
- **03-05** ✓ Updater signing keys + NSIS installer (3.9MB)

The desktop app is real: local SQLite search, artist pages with MusicBrainz enrichment, first-run detection, auto-updater infrastructure, and a 3.9MB Windows installer. Web build completely unaffected.

> **Commit 6c3288f** (2026-02-16 22:55) — fix(03-04): fix database path separator bug — desktop search now works
> Files changed: 5

> **Commit 0ee72ce** (2026-02-16 23:07) — feat(03-05): add updater signing keys and NSIS installer configuration
> Files changed: 4

> **Commit de52ad7** (2026-02-16 23:10) — docs: mark Phase 3 complete in roadmap — 3/12 phases done
> Files changed: 2

> **Commit 7bb89b3** (2026-02-16 23:34) — docs(04): research phase 4 local music player domain
> Files changed: 1

> **Commit a44c58f** (2026-02-16 23:41) — docs(04-local-music-player): create phase plan
> Files changed: 6

---

## Entry 010 — 2026-02-16 — Phase 4: Mercury Learns to Play Music

### Context

Phase 3 gave us a desktop app. Phase 4 makes it a music player. This is where Mercury stops being just a search engine and becomes something you actually use while listening to music. The plan: Rust backend scans folders and reads metadata, HTML5 Audio plays files via Tauri's asset protocol, and the local library connects to the 2.8M-artist discovery database.

5 plans across 4 waves:
- **Wave 1** (parallel): Rust scanner backend + Player frontend
- **Wave 2**: Library browser with folder management
- **Wave 3**: Unified discovery — local files meet the Mercury index
- **Wave 4**: End-to-end verification checkpoint

### Execution: Wave 1 — Foundation Layer

Spawning two agents in parallel:
- **04-01**: Rust scanner — lofty for metadata, walkdir for traversal, rusqlite for library.db, Tauri commands for IPC
- **04-02**: Player frontend — HTML5 Audio engine, Svelte 5 runes state, queue management, persistent player bar UI

### Wave 1 Complete

Both agents finished successfully in parallel:
- **04-01** (Rust scanner): lofty metadata reader, rusqlite library.db, walkdir traversal, 5 Tauri IPC commands, dialog plugin
- **04-02** (Player frontend): HTML5 Audio + convertFileSrc, Svelte 5 runes state (.svelte.ts), persistent player bar, queue panel

Key decision: Player state files use `.svelte.ts` extension (not `.ts`) — required for Svelte 5 runes ($state) to work outside .svelte components.

### Execution: Wave 2 — Library Browser

**04-03** (4 min): Library browser UI connecting Rust scanner to frontend player. Created `src/lib/library/` module with types mirroring Rust structs, scanner invoke wrappers with dynamic imports, reactive store with album grouping and sorting. Built `/library` page with scan progress bar, sort controls, empty state. `LibraryBrowser` component renders album grid with expandable track lists — clicking a track calls `setQueue()` to play. `FolderManager` panel for add/remove/rescan. Library nav link in header (Tauri-only). Installed `@tauri-apps/plugin-dialog` for native folder picker.

### Execution: Wave 3 — Unified Discovery

**04-04** (4 min): Artist name normalization (`normalizeArtistName` strips "The", splits feat./ft./&, removes trailing qualifiers) + FTS5 matching against 2.8M-artist index. `NowPlayingDiscovery` panel shows matched artist with tags, country, related artists via tag co-occurrence — reactive `$effect` triggers on artist change. Player expanded view with slide-up animation above the bar. Unified search shows "Your Library" section above discovery results in Tauri context — client-side filter on local tracks.

### Wave 3 Complete — All Code Waves Done

4 plans, 4 self-checks passed, 0 errors, 0 warnings. `npm run check` clean. Now just the human verification checkpoint (04-05).

### Wave 4 Complete — Human Verification Passed

Steve tested the full flow: scan folder → browse library → play tracks → navigate without interruption → discover artist via expanded player → unified search with local results. Three bugs found and fixed during verification:

1. **cross-env not found** — `beforeDevCommand` needed `npx cross-env` not bare `cross-env`
2. **Discovery button invisible** — tiny chevron icon replaced with labeled "Discover" pill button
3. **Search killed audio** — dynamic imports outside try/catch in search load function; unhandled error unmounted layout (no `+error.svelte`), destroying the Player

### Phase 4 Complete

All 5 plans executed. Local music player works end-to-end: Rust scanner → HTML5 Audio playback → library browser → discovery bridge → unified search. 4 waves, 10 tasks, 12 commits.

---

## Entry 011 — 2026-02-17 — Technical Documentation

Steve asked for comprehensive documentation — both a technical architecture doc and a user manual. The project is at the complexity threshold (4 phases, dual runtime, 6 modules, 40+ source files) where new context sessions need a map to understand how things connect.

Created two documents:

- **ARCHITECTURE.md** — Full technical architecture covering dual runtime, database layer, search system, embed system, local player, discovery bridge, build system, and module dependency map. Includes ASCII diagrams showing data flow and system topology.
- **docs/user-manual.md** — User-facing manual covering search, artist pages, local library, music player, discovery features, web vs desktop comparison, and troubleshooting. Written for end users, not developers.

> **Commit e8053be** (2026-02-16 23:51) — feat(04-02): player state, audio engine, and queue management
> Files changed: 4

> **Commit 5f2c71c** (2026-02-16 23:52) — feat(04-01): add Rust dependencies, library database, and metadata reader
> Files changed: 7

> **Commit 29facfc** (2026-02-16 23:54) — feat(04-02): player bar UI, queue panel, and layout integration
> Files changed: 4

> **Commit 04c3a20** (2026-02-16 23:55) — feat(04-01): add scanner commands, folder picker, and Tauri integration
> Files changed: 7

> **Commit 8c0ce61** (2026-02-16 23:56) — docs(04-02): complete player frontend plan
> Files changed: 3

> **Commit 01b1595** (2026-02-16 23:57) — docs(04-01): complete scanner backend plan
> Files changed: 2

> **Commit 698402f** (2026-02-17 00:02) — feat(04-03): library types, state store, and scanner invoke wrappers
> Files changed: 4

> **Commit 2934d0f** (2026-02-17 00:05) — feat(04-03): library page, album browser, folder manager, and nav link
> Files changed: 6

> **Commit 97edc19** (2026-02-17 00:07) — docs(04-03): complete library browser plan
> Files changed: 3

> **Commit 8f3d0ea** (2026-02-17 00:12) — feat(04-04): artist matching and now-playing discovery panel
> Files changed: 3

> **Commit b54abdf** (2026-02-17 00:14) — feat(04-04): unified search with local library tracks in results
> Files changed: 2

> **Commit b95af80** (2026-02-17 00:15) — docs(04-04): complete unified discovery plan
> Files changed: 2

> **Commit 54e5d92** (2026-02-17 00:49) — fix(04-05): resolve three bugs found during phase 4 verification
> Files changed: 5

> **Commit db1091b** (2026-02-17 00:49) — docs: mark Phase 4 complete in roadmap — 4/12 phases done
> Files changed: 5

> **Commit b29dc3b** (2026-02-17 00:59) — docs: add technical architecture guide and user manual
> Files changed: 3

> **Commit e22a0b2** (2026-02-17 01:03) — docs: add mandatory doc update rule to CLAUDE.md
> Files changed: 2

> **Commit 328338c** (2026-02-17 01:07) — wip: phase 4 paused — complete, ready for phase 5
> Files changed: 2

> **Commit 8719d36** (2026-02-17 09:01) — docs(05): capture phase context for AI Foundation
> Files changed: 2

> **Commit 470da5a** (2026-02-17 09:10) — docs(05): research phase domain — AI Foundation
> Files changed: 1

> **Commit a7ff291** (2026-02-17 09:21) — docs(05-ai-foundation): create phase plan — 7 plans in 4 waves
> Files changed: 8

> **Commit d0f9bc0** (2026-02-17 09:31) — feat(05-01): add Rust AI sidecar module and taste.db schema
> Files changed: 9

> **Commit e18740c** (2026-02-17 09:32) — feat(05-01): add TypeScript AI provider interface with local and remote implementations
> Files changed: 5

> **Commit fc8a172** (2026-02-17 09:34) — docs(05-01): complete AI infrastructure foundation plan
> Files changed: 2

> **Commit 426be58** (2026-02-17 09:41) — feat(05-03): sqlite-vec integration + embedding and taste CRUD commands
> Files changed: 6

> **Commit 833e052** (2026-02-17 09:42) — feat(05-02): model download pipeline and reactive AI state management
> Files changed: 4

> **Commit 978d02b** (2026-02-17 09:44) — feat(05-03): frontend taste profile, signals, favorites, and embedding wrappers
> Files changed: 5

> **Commit b8c8c53** (2026-02-17 09:45) — feat(05-02): settings page with AI opt-in flow and header status indicator
> Files changed: 4

> **Commit bb16d29** (2026-02-17 09:46) — docs(05-03): complete embedding infrastructure + taste profile plan
> Files changed: 2

> **Commit eddc2d6** (2026-02-17 09:47) — docs(05-02): complete AI opt-in flow plan
> Files changed: 2

> **Commit 14b367d** (2026-02-17 09:53) — feat(05-04): FavoriteButton and AiRecommendations components
> Files changed: 3

> **Commit d678f4b** (2026-02-17 09:55) — feat(05-05): ExploreResult component and NL explore prompts
> Files changed: 2

> **Commit 2cfbfe6** (2026-02-17 09:55) — feat(05-04): integrate AI features into artist page
> Files changed: 1

> **Commit 8080174** (2026-02-17 09:56) — feat(05-06): TasteEditor component with tag management and artist anchors
> Files changed: 1

> **Commit 418fef4** (2026-02-17 09:56) — docs(05-04): complete artist page AI features plan
> Files changed: 2

> **Commit 3e349ab** (2026-02-17 09:56) — feat(05-06): integrate TasteEditor into settings page
> Files changed: 3

> **Commit e93c659** (2026-02-17 09:59) — docs(05-06): complete taste profile editor plan
> Files changed: 2

> **Commit f9b0637** (2026-02-17 09:59) — docs(05-05): complete NL explore page plan
> Files changed: 2

> **Commit f845d2d** (2026-02-17 10:06) — docs(05-07): update architecture and user manual with AI features
> Files changed: 2

> **Commit 96e9d91** (2026-02-17 10:25) — fix(05-07): add externalBin config and sidecar binary setup
> Files changed: 2

> **Commit f6b923e** (2026-02-17 10:41) — fix(05-07): correct sidecar name resolution path
> Files changed: 2

## Entry 019 — 2026-02-17 — Sidecar DLL Hunt

### The Problem
AI servers failing to start with "failed to start within 60 seconds." The llama-server binary existed and was the correct build, but produced zero output when run — no errors, no help text, nothing.

### Root Cause
**Tauri's `externalBin` only copies the `.exe` to `target/debug/` — it does NOT copy companion DLLs.** The llama.cpp server binary depends on ~20 DLLs (ggml-base.dll, ggml-cpu-*.dll, llama.dll, libomp140.dll, etc.) that weren't present in the working directory. On Windows, missing DLLs cause silent failure — the process spawns and immediately dies with no stderr output.

### The Fix
Three changes:
1. **`src-tauri/build.rs`** — Added DLL auto-copy logic. On every build, scans `src-tauri/binaries/` for `.dll` files and copies them to the target directory alongside the sidecar exe.
2. **`src/lib/ai/state.svelte.ts`** — Increased health check timeout from 60s to 180s (loading a 2GB model on CPU takes time). Added early crash detection via `get_ai_status` call during polling. Better error messages showing which server failed.
3. **`src-tauri/src/ai/sidecar.rs`** — Added sidecar output logging. The `rx` channel from `spawn()` was being discarded (`_rx`). Now spawns an async task that reads stdout/stderr and logs with `[llama-gen]`/`[llama-embed]` prefix. No more silent failures.

<!-- decision -->
**Artist page 503 in Tauri dev mode** — The `+page.server.ts` was throwing `error(503, 'Database not available')` when there was no D1 database. This is always the case in Tauri dev mode (no Cloudflare). The throw prevented the universal `+page.ts` load (which has the Tauri code path) from ever running. Fix: return empty fallback data instead of throwing, matching how the search page already handles this. This was the root cause of missing favorites, bio, and all artist page features in Tauri.
<!-- /decision -->

Steve re-tested after all fixes — **Phase 5 approved.** Next session: commit these changes, complete Plan 07 summary, mark Phase 5 done.

---

## Entry 020 — 2026-02-17 — Vision Shift: Underground Is Alive

### Context

Steve wrote a raw vision piece that reframes what Mercury is becoming. Not just a search engine with AI. Not just discovery. A place where underground culture can actually live — where people find each other through shared taste, organize without platforms, and build something real.

### Steve's Words

> I don't want it to look shiny. Not Spotify-ish. I want it to feel underground.
>
> Not only finding artists. Finding people with similar tastes. Someone into shoegaze can find someone on the other side of the planet.
>
> Not a dashboard of "look at my food." More like: I'm into this music. I want to create an underground label. Not about money. Not about fame. About celebrating something. Creating something.
>
> It shouldn't say it directly. But that feeling should shine through.
>
> Underground can be alive.

### What This Means

The existing roadmap has a Social Layer (Phase 8) — but it was designed as profiles, collections, shareable exports. Desktop-first, local-first. What Steve is describing goes further:

- **Taste as the only identity** — no photos, game-like avatars, your music IS your profile
- **Encrypted group communication** — not a public feed, more like finding your people
- **Community formation** — label parties, scene building, collaboration across borders
- **Anti-algorithm philosophy** — explicit counter to the controlled, surveilled experience of mainstream platforms
- **Aesthetic rebellion** — the UI itself should feel underground, not corporate

This isn't just a feature addition. It's a philosophical expansion that touches the social layer, the aesthetic direction, and potentially the entire architecture (encrypted comms needs infrastructure the current local-first model doesn't have).

### The Tension

Entry 014 decided: "Mercury is a desktop app. No central server. User data lives on their machine." Encrypted group chat and taste matching across the planet need *some* shared infrastructure. These two truths need to coexist — and the questionnaire below is designed to find out how.

### Next Step

Structured questionnaire to map this vision into concrete roadmap decisions. See below.

### Decisions Made (Interactive Questionnaire)

Went through 16 questions step by step. Here's what was decided:

<!-- decision: Identity = pseudonymous handle + avatar builder + pure taste -->
**Mercury identity model:** Pseudonymous handles (not real names, not anonymous). Lo-fi avatar builder (customizable, not photorealistic, not procedural). Profiles are PURE TASTE — no bios, no "about me," no words. Your tags, your artists, your collection. The music speaks for itself.
**Rejected:** Photo profiles, real names, anonymous/no-identity, procedurally generated avatars, bios/manifestos
<!-- /decision -->

<!-- decision: People finding = all three layers + toggleable radius -->
**Finding people with similar taste** uses three layered modes: (1) taste map overlap for intentional browsing, (2) scene rooms for genre/vibe spaces, (3) serendipitous matching for random encounters. Radius is toggleable: local → regional → global. Buenos Aires to Berlin, or just your city.
**Rejected:** Single-mode approaches, global-only, local-only
<!-- /decision -->

<!-- decision: Communication = layered, zero server cost, architecture TBD -->
**Communication model:** Layered — private DMs + persistent scene rooms + ephemeral sessions. All encrypted. HARD CONSTRAINT: zero server cost for Steve. The infrastructure architecture (Matrix, P2P, relay, Nostr) is deferred until closer to building — needs proper research.
**Rejected:** Premature architecture commitment
<!-- /decision -->

<!-- decision: Groups = self-organizing, small by default, hybrid moderation -->
**Group model:** Small by default (UI encourages intimacy), no size ceiling. Groups are self-organizing — Mercury provides the space, people decide what to do. Labels, collectives, events — all organized BY the people, promoted outside Mercury. Hybrid moderation: room creators have authority + community flagging for truly harmful content. No central moderation team.
**Rejected:** Fixed size limits, no moderation, centralized content police
<!-- /decision -->

<!-- decision: Creation tools = start with none, add if community asks -->
Mercury launches community features with discovery + connection only. Creation tools (collaborative playlists, label pages, scene essays) added later ONLY if the community asks for them. Don't assume what they need.
**Rejected:** Launching with creation tools, full creation suite
<!-- /decision -->

<!-- decision: Aesthetic = dense, playful, game-like, taste-themed -->
**Design philosophy overhaul:** NOT minimal. Dense and playful — panels, textboxes, dropdowns, controls everywhere. Like a cockpit or a game UI. Something you PLAY with. Templates for customization. Taste-based theming: your music shapes your color scheme. Every Mercury installation looks different. This is an ongoing evolution, not a one-time redesign.
**Rejected:** Minimal/sparse, brutalist, static dark theme
<!-- /decision -->

<!-- decision: Anti-algorithm = user control -->
Mercury counters algorithmic devastation by giving users control. YOU build your own discovery path. Mercury provides tools (tags, maps, taste profiles, scene rooms) but never decides for you. You are the algorithm.
**Rejected:** No algorithm at all, transparent algorithm, human-only curation
<!-- /decision -->

<!-- decision: AI in community = taste translation + scene awareness + matchmaking -->
Local LLM (same Phase 5 infrastructure) extended to: (1) taste translation — explain WHY tastes overlap, (2) scene awareness — detect emerging scenes from collective listening, (3) matchmaking context — describe overlap and divergence between people. AI makes patterns visible, doesn't replace human judgment.
<!-- /decision -->

<!-- decision: Roadmap = split Phase 8 into three community phases, after Phase 7 -->
Current Phase 8 (Social Layer) splits into three phases: Community Foundation → Communication Layer → Scene Building. Starts after Phase 7 (Knowledge Base). **Aesthetic overhaul ships first** — the vibe before the features. Mercury needs to FEEL underground before it starts connecting people.
**Rejected:** Single phase, weaving into Phase 6, starting immediately after Phase 5
<!-- /decision -->

<!-- decision: Licensing = free always, source distribution TBD -->
Mercury is free to use. Always. Non-negotiable. Open source decision is DEFERRED — Steve is concerned about commercial exploitation and misuse. Needs proper licensing research (AGPL, BSL, etc.) when the time comes. Sustainability (donations/grants) determines the long-term model. If donations can't support a safe life, might go fully open source and step back.
**Rejected:** Premature open source commitment, premature closed source commitment
<!-- /decision -->

<!-- decision: Openness = community sets its own norms -->
Mercury provides tools for both open and closed spaces. The community decides the culture. No enforced openness or enforced privacy. Let the underground be the underground.
**Rejected:** Forced discoverability, forced privacy, platform-imposed norms
<!-- /decision -->

### What Still Needs Research (Deferred)
- Communication infrastructure: Matrix vs P2P vs relay vs Nostr (decided when building community phases)
- Licensing model: AGPL vs BSL vs custom (decided based on sustainability trajectory)
- Taste matching computation: local vs server vs cryptographic (decided with architecture)

### Roadmap Updated
ROADMAP.md rewritten: 12 phases → 15 phases. Old Phase 8 (Social Layer) split into Phase 8 (Underground Aesthetic), Phase 9 (Community Foundation), Phase 10 (Communication Layer), Phase 11 (Scene Building). Old phases 9-12 renumbered to 12-15. Sustainability stages renumbered to match. Three new deferred items added.

> **Commit 368d9b8** (2026-02-17 18:20) — wip: vision questionnaire + roadmap rewrite (12 to 15 phases)
> Files changed: 6

> **Commit 42d6b69** (2026-02-20 18:53) — fix(05-07): sidecar stability + UX fixes from verification run
> Files changed: 8

---

## Entry 021 — 2026-02-20 — Phase 5 Complete: Mercury Has a Brain

Phase 5 (AI Foundation) is done. All 6 verification suites passed.

### What Got Built

Seven plans over several sessions:

- **05-01:** AI engine — llama-server sidecar, provider abstraction, opt-in settings, model download with progress
- **05-02:** Settings UI — AI toggle, download flow, provider config (local vs remote API)
- **05-03:** Taste profile — taste.db schema, signals from favorites/library/tags, recomputation engine
- **05-04:** Artist page AI — favorite button, "You might also like" recommendations, AI summary fallback
- **05-05:** NL Explore page — natural language queries through the AI provider, refinement loop, conversation history
- **05-06:** Taste editor — tag weight sliders, source badges, artist anchor pinning
- **05-07:** Verification + docs — full end-to-end test, ARCHITECTURE.md and user-manual.md updated

### The Hard Part

The sidecar. llama-server on Windows needs its companion DLLs (ggml.dll, llama.dll) alongside the .exe. Tauri's `externalBin` only copies the executable itself. Build script now copies DLLs manually. Health poll timeout extended from 60s to 180s — large models genuinely take that long to load into memory.

### Verification Results

All pass. Opt-in flow → download → model load → explore NL queries → refinement → artist favorites → recommendations → taste profile editing → persistence across restart → web build clean.

### What's Next

Phase 6. Roadmap now runs to 15 phases (expanded during vision questionnaire). Phase 6 is the Knowledge Base — deeper artist data, genre relationships, scene mapping. But before planning, worth taking stock: Mercury can now search, play local music, and think. Three foundations in place.

> **Commit 6786e94** (2026-02-20 22:53) — feat(05): Phase 5 AI Foundation complete — all verification passed
> Files changed: 2

> **Commit 5b572d4** (2026-02-20 23:09) — docs(06): research phase discovery engine domain
> Files changed: 1

> **Commit 0680639** (2026-02-20 23:22) — docs(06-discovery-engine): create phase plan
> Files changed: 8

> **Commit 71108fa** (2026-02-20 23:27) — fix(06): import PROJECT_NAME from config instead of hardcoding in titles
> Files changed: 3

---

## Entry 022 — 2026-02-20 — Phase 6 Plan 1: Tag Statistics Pre-computation

Phase 6 Discovery Engine, Plan 1. The foundation for all discovery features: pre-computed tag statistics baked into mercury.db at pipeline build time.

### What Got Built

Two new tables added to the pipeline (`pipeline/import.js`), now Phase F after FTS5:

**`tag_stats`** — Per-tag popularity statistics:
- `tag`, `artist_count`, `total_votes` (PRIMARY KEY on tag)
- 57,905 unique tags indexed in ~2s
- Example: `rock` → 16,570 artists
- Index on `artist_count DESC` for ranking queries

**`tag_cooccurrence`** — Tag pair co-occurrence strength:
- `tag_a`, `tag_b`, `shared_artists` — canonical ordering via CHECK (tag_a < tag_b)
- 2,359 edges from the full 672K artist_tags dataset
- Filters: both tags must have count >= 2, pairs must share >= 5 artists
- LIMIT 10000 and HAVING >= 5 guard against combinatorial explosion
- Example top pairs: hard rock + rock (187), alternative rock + rock (176), classical + composer (147)

<!-- decision: Pre-compute tag statistics at pipeline build time -->
On-demand aggregation against 672K artist_tags rows is too slow for page load. Pre-computing at pipeline build time reduces multi-second aggregations to sub-millisecond indexed lookups.
**Rejected:** On-demand GROUP BY queries at request time, materialized views (SQLite doesn't have them)
<!-- /decision -->

### Verification Results

- `tag_stats`: 57,905 rows (well above the 50K threshold)
- `tag_cooccurrence`: 2,359 edges (within 1K–10K target range)
- Idempotency: re-running both steps produces identical row counts, no errors
- Constraint violations: 0 (tag_a < tag_b holds on all rows)
- Genre pairs look sensible: rock pairs with indie/hard rock/pop rock/alternative rock, classical pairs with composer

> **Commit c2f0f6c** (2026-02-20 23:36) — feat(06-01): add tag_stats and tag_cooccurrence tables to pipeline
> Files changed: 2

> **Commit f23b85c** (2026-02-20 23:38) — docs(06-01): complete tag statistics pre-computation plan
> Files changed: 4

> **Commit 558eb3e** (2026-02-20 23:39) — feat(06-02): add tag intersection and discovery ranking queries
> Files changed: 1

> **Commit 953d942** (2026-02-20 23:40) — feat(06-02): add crate digging, uniqueness score, and style map queries
> Files changed: 1

## Entry 023 — 2026-02-20 — Phase 6 Plan 2: Discovery Query Functions

Phase 6 Discovery Engine, Plan 2. Six new query functions added to `src/lib/db/queries.ts` — the complete query layer for all discovery features.

### What Got Built

Six new exported async functions plus four new types added to `queries.ts`:

**Types added:**
- `CrateFilters` — tag, decadeMin, decadeMax, country filter options for crate dig mode
- `StyleMapNode` — tag + artist_count for style map visualization nodes
- `StyleMapEdge` — tag_a, tag_b, shared_artists for style map edges
- `UniquenessResult` — uniqueness_score + tag_count for the artist page badge

**Functions added:**

`getPopularTags(db, limit)` — Top tags by artist_count from tag_stats. Powers the initial state of the tag browser. Simple descending sort, limit param.

`getArtistsByTagIntersection(db, tags, limit)` — AND logic tag filtering. Self-JOINs artist_tags once per tag (up to 5). Results ordered niche-first (fewest total tags ascending). Caps at 5 tags — D1 bound parameter safety.

`getDiscoveryRankedArtists(db, limit)` — Composite discovery score: `(1/tag_count) * avg(1/tag_artist_count) * recency_boost * active_boost`. Rewards artists with rare tags, few total tags, recent formation, and still active.

`getCrateDigArtists(db, filters, limit)` — Rowid-based random sampling via `a.id > randomStart`. Faster than `ORDER BY RANDOM()` on large tables. Includes wrap-around fallback when random position lands near the end of the table. All filters optional.

`getArtistUniquenessScore(db, artistId)` — Artist page badge query. Computes `AVG(1/tag_artist_count) * 1000` across all artist tags, rounded to 2dp. Returns null if artist has no tags.

`getStyleMapData(db, tagLimit)` — Returns `{ nodes, edges }` for the style map visualization. Nodes are top-N tags from tag_stats. Edges are from tag_cooccurrence filtered to only pairs within the top-N set (subquery avoids D1 param limits).

<!-- decision: Rowid-based random sampling for crate digging -->
`ORDER BY RANDOM()` scans the entire table. Rowid sampling (`a.id > randomStart`) reads only the tail of the table — effectively O(limit) not O(total_rows). The wrap-around fallback handles the edge case where randomStart lands in the last 20% of IDs.
**Rejected:** ORDER BY RANDOM() (too slow at scale), pre-shuffled IDs (extra pipeline complexity)
<!-- /decision -->

<!-- decision: Subquery for style map edge filtering -->
Passing top-N tag names as bound params would hit D1's parameter limits with tagLimit >= 100. Using `IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)` avoids this entirely — single param, DB-side filtering.
**Rejected:** Client-side edge filtering (requires fetching all edges), bound param array (D1 limit)
<!-- /decision -->

### Verification

- `npm run check` — 0 errors, 0 warnings (349 files)
- All 6 functions + 4 types exported from queries.ts
- getCrateDigArtists handles empty filters (no-filter crate digging) correctly
- getArtistsByTagIntersection caps at 5 tags — D1 safety confirmed
- Same DbProvider interface — identical function signatures work on D1 (web) and TauriProvider (desktop)


> **Commit 5b0aeb0** (2026-02-20 23:43) — docs(06-02): complete discovery query functions plan
> Files changed: 4

## Entry 024 — 2026-02-20 — Phase 6 Plan 3: Discover Page

### What Was Built

The `/discover` route — Mercury's primary browsing interface for tag-intersection discovery.

**TagFilter.svelte** — Clickable tag chip cloud with active/inactive state. URL-driven via `goto()`. Active tags shown in a "Filtering by:" header row with × to remove. Inactive chips disabled at 5-tag max. The 5-tag limit isn't arbitrary — it's D1's bound parameter safety limit for the dynamic JOIN query.

**+page.server.ts** — Web (D1) server load. Reads `?tags` param, runs `getPopularTags(100)` + either `getArtistsByTagIntersection` or `getDiscoveryRankedArtists` depending on whether tags are selected.

**+page.ts** — Universal load. Web passes server data through unchanged. Tauri branches to local SQLite via `getProvider()` with dynamic imports. Same pattern as search and explore pages.

**+page.svelte** — Tag cloud above, artist card grid below. Heading adapts: tag intersection shows "Showing N artists tagged with X + Y", no-tag state shows the discovery philosophy tagline.

### Key Behavior

Tag state lives entirely in the URL (`?tags=shoegaze,post-rock`). This means discover pages are shareable and bookmarkable without any client-side session state. The `page` store + `goto()` pattern handles all mutations.

Niche-first ordering is implicit in the query (`ORDER BY artist_tag_count ASC`) — no additional UI needed. The rarest artists naturally surface first when you narrow by tags.

### Verification

- `npm run check` — 0 errors, 0 warnings (356 files, +7 from new route)

> **Commit 47faab2** (2026-02-20 23:45) — feat(06-03): add TagFilter component and Discover page server load
> Files changed: 2

> **Commit 766688f** (2026-02-20 23:46) — feat(06-03): add Discover page universal load and page component
> Files changed: 2

> **Commit 829e8d6** (2026-02-20 23:49) — docs(06-03): complete Discover page plan
> Files changed: 6

> **Commit 62f111f** (2026-02-20 23:50) — feat(06-04): add UniquenessScore badge component
> Files changed: 1

> **Commit eab4809** (2026-02-20 23:52) — feat(06-04): wire uniqueness score into artist page (web + Tauri)
> Files changed: 3

## Entry 025 — 2026-02-20 — Phase 6 Plan 4: Uniqueness Score Badge

### What Was Built

The uniqueness score badge — the most important piece of Mercury's UX thesis made visible.

**UniquenessScore.svelte** — A minimal pill badge that renders in the artist header. Raw score (a small decimal like 0.0012) is mapped to 4 human-readable tiers: Very Niche, Niche, Eclectic, Mainstream. Color-coded: Very Niche uses the accent color (gold), Niche uses a green tone, Eclectic and Mainstream are subdued. Badge is absent when score is null (artists with no tags).

**Artist page data wiring** — `getArtistUniquenessScore()` was already built in Plan 02. This plan wires it into both load paths:
- `+page.server.ts` (web): fetches score concurrently with links/releases via `Promise.all([Promise.allSettled([...]), getArtistUniquenessScore(...)])`
- `+page.ts` (Tauri): fetches score from local SQLite after artist lookup

<!-- decision: Badge placement in artist name row -->
The badge sits inline in the `artist-name-row` between the artist name and the Favorite button. This places it in the artist's "identity block" — the most prominent visible location — without requiring a new layout section or restructuring anything. Small pill badge doesn't compete with the artist name.
**Rejected:** Below tags (too buried), dedicated section (too prominent for a metadata signal)
<!-- /decision -->

### Score Thresholds

The tier boundaries (0.0003 / 0.001 / 0.005) were set based on the score distribution from the `getArtistUniquenessScore` query math. Score = average(1 / artist_count) * 1000 across all tags. A tag used by 50k artists contributes 0.02 to the per-tag score; a tag used by 100 artists contributes 10.0. The aggregate averages are small because popular tags dominate most artists' profiles.

### Verification

- `npm run check` — 0 errors, 0 warnings (357 files)

> **Commit 35ee09d** (2026-02-20 23:56) — docs(06-04): complete uniqueness score badge plan
> Files changed: 6

> **Commit 3f0703b** (2026-02-20 23:58) — feat(06-05): add Crate Digging Mode — Tauri-only /crate route
> Files changed: 2

## Entry 026 — 2026-02-20 — Phase 6 Plan 5: Crate Digging Mode

### What Was Built

The serendipity mechanism. `/crate` is a Tauri-only route that lets you roll random artists from a filtered slice of the database. Pick a genre tag, a decade, a country code — or leave everything open — hit "Dig", and get 20 random artists you've never heard of.

**+page.ts** — Universal load, Tauri-gated. If running on web, returns empty artists with `isTauri: false`. If running in Tauri, reads optional filters from URL params and calls `getCrateDigArtists(db, filters, 20)`. Errors are caught and silently degraded — page always renders.

**+page.svelte** — Filter row at top (tag text input, decade select, country code input), "Dig" button, artist grid below. On button click, `dig()` calls `getCrateDigArtists()` directly with current filter values — no page navigation, no URL update, just a fresh random batch replacing the grid. Loading state disables the button and shows "Digging...".

Web visitors see a simple "available in the desktop app" message using PROJECT_NAME from config.

### Implementation Notes

The key design choice: client-side re-fetching without URL navigation. Unlike the Discover page (where state lives in the URL for shareability), crate digging state is ephemeral by nature — you're wandering, not bookmarking. Each "Dig" is just a direct DB call that replaces the grid. Simple and fast.

The rowid-based random sampling from Plan 02 (`getCrateDigArtists`) does the heavy lifting. This page is just the UI wrapper.

### Verification

- `npm run check` — 0 errors, 3 warnings (361 files)
- Warnings are Svelte 5 lint hints about `data` prop captured into `$state` at init — intentional pattern, not bugs

> **Commit 0db4138** (2026-02-21 00:00) — docs(06-05): complete Crate Digging Mode plan — DISC-04 satisfied, Phase 6 complete
> Files changed: 4

> **Commit 42c2e81** (2026-02-21 00:02) — feat(06-06): install d3-force and create StyleMap component
> Files changed: 3

> **Commit 7c2149f** (2026-02-21 00:03) — feat(06-06): create /style-map route — server load, universal load, page
> Files changed: 3

## Entry 027 — 2026-02-21 — Phase 6 Plan 6: Style Map Visualization

### What Was Built

The Style Map — the visual entry point to the discovery engine. `/style-map` renders a force-directed SVG graph where music genres are nodes and their co-occurrence strength is edges. Node size encodes artist count (log scale). Clicking any node navigates to `/discover?tags=<tag>`.

**StyleMap.svelte** — D3 force-directed graph component using d3-force@3.0.0. The key implementation choice: `simulation.tick(500)` runs the physics headlessly to completion — no `on('tick')` callback, no reactive updates during layout. The simulation runs synchronously, then position state is assigned once. Zero layout thrashing, zero Svelte reactivity during computation.

**Route files:**
- `+page.server.ts` — D1Provider load, `getStyleMapData(db, 50)` — same pattern as Discover page
- `+page.ts` — Universal load: web passthrough + Tauri dynamic import path (same pattern as search/explore/discover)
- `+page.svelte` — Minimal wrapper with page header and empty state guard

<!-- decision: Headless D3 simulation via tick(500) — no on('tick') -->
The standard D3 tutorial wires `simulation.on('tick', () => { update state })` which causes a reactive update on every tick iteration. In Svelte 5, this would trigger hundreds of reactive re-renders per layout. Instead: run all 500 ticks synchronously in a loop, stop the simulation, compute edge positions from the settled node map, then assign `layoutNodes` and `layoutEdges` once.
**Rejected:** `simulation.on('tick', ...)` — would cause 500+ reactive renders during layout
<!-- /decision -->

<!-- decision: Node radius uses log10 scale, clamped 6–30px -->
Linear scale: a tag used by 50k artists vs 100 artists would produce wildly different sizes — the common genres would dominate the entire canvas. Log10 scale compresses the range: `Math.max(6, Math.min(30, Math.log10(artistCount) * 8))`. Common tags get somewhat bigger nodes but don't crowd out the rare ones.
**Rejected:** Linear scale — makes niche tags invisible
<!-- /decision -->

### Technical Notes

**@types/d3-force** — d3-force 3.x ships JavaScript with JSDoc but no `.d.ts` files. TypeScript couldn't resolve types, producing an "implicitly has any type" error. Fix: `npm install --save-dev @types/d3-force`. Clean after that.

The style map works on both web (D1) and Tauri (local SQLite) using the same universal load pattern established in Plan 03 (Discover page).

### Verification

- `npm run check` — 0 errors, 3 warnings (369 files)
- Warnings unchanged from previous plans (pre-existing in crate/+page.svelte)

> **Commit 65c896d** (2026-02-21 00:08) — docs(06-06): complete Style Map plan — DISC-03 satisfied
> Files changed: 6

> **Commit 1b27f6b** (2026-02-21 00:09) — feat(06-07): add navigation links for Discovery Engine features
> Files changed: 1

> **Commit 50f5907** (2026-02-21 00:11) — docs(06-07): update ARCHITECTURE.md and docs/user-manual.md for Discovery Engine
> Files changed: 2

> **Commit ccaf297** (2026-02-21 00:13) — docs(06-07): complete navigation + docs plan — at verification checkpoint
> Files changed: 3

> **Commit 2195077** (2026-02-21 00:31) — fix(06): guard against missing platform.env.DB in Tauri dev mode
> Files changed: 2

> **Commit 6e893fa** (2026-02-21 00:38) — fix(06): graceful degradation when tag_stats absent from D1/local DB
> Files changed: 3

> **Commit 36286ee** (2026-02-21 00:50) — fix(06): recalibrate uniqueness score thresholds to match real data
> Files changed: 1

## Entry 028 — 2026-02-21 — Phase 6 Complete: Discovery Engine Verified

### Phase Closure

Human verification checkpoint passed. Phase 6 (Discovery Engine) is done.

All four discovery features confirmed working via Playwright + live testing:

| Feature | Route | Status |
|---------|-------|--------|
| Tag Intersection Browser | `/discover` | ✓ 150 tag chips, AND-filter, URL state, jazz returns artists |
| Uniqueness Score Badge | artist pages | ✓ NICHE on Radiohead, VERY NICHE on harsh noise artist |
| Crate Digging Mode | `/crate` | ✓ Tauri: random artist grid. Web: "desktop app" message (no 500) |
| Style Map | `/style-map` | ✓ 50 SVG nodes, log-scale sizing, click → /discover?tags=X |

### What Got Built This Phase

Seven plans across the full stack:

**Plan 01 — Pipeline Phase F:** Pre-computed `tag_stats` (57,905 tags with artist_count + avg uniqueness) and `tag_cooccurrence` (2,359 edges, canonical `tag_a < tag_b` ordering, min 5 shared artists) written into `pipeline/import.js`. The key insight: on-demand GROUP BY against 672K artist_tags rows is too slow for page load — pre-compute everything at pipeline time.

**Plan 02 — Query Layer:** 6 new functions in `src/lib/db/queries.ts`. Rowid-based random sampling (`a.id > randomStart`) for O(limit) crate digging instead of ORDER BY RANDOM(). Tag intersection as multi-JOIN with CASE-based relevance scoring.

**Plan 03 — /discover route:** Tag intersection browser. State lives in URL (`?tags=a,b,c`) via `goto()` + page store — shareable and bookmarkable by design. TagFilter.svelte handles chip display, AND/remove logic, and the 5-tag cap (D1 bound parameter limit) with visible disable-state feedback.

**Plan 04 — UniquenessScore badge:** Inline in the artist-name-row alongside the FavoriteButton. Score tiers calibrated to real data distribution: Very Niche (≥100), Niche (≥8), Eclectic (≥0.36), Mainstream (<0.36). The score is `AVG(1/artist_count) * 1000` across the artist's tags — mathematically rewards specificity.

**Plan 05 — /crate Crate Digging:** Tauri-only route. Client-side re-fetch on "Dig" button — no URL navigation, no history push. Wandering is ephemeral, not bookmarkable. Contrast with Discover page (URL state = sharable). Web shows graceful "desktop app" fallback.

**Plan 06 — /style-map Style Map:** D3 force graph via `simulation.tick(500)` headless execution — no `on('tick')` reactive wiring, single state assignment after simulation stops. Zero layout thrashing. Node radius on log10 scale clamped to 6–30px (prevents mega-genres from dominating).

**Plan 07 — Navigation + Docs:** Web nav: Discover + Style Map. Tauri nav: Discover | Style Map | Dig | Library | Explore | Settings (discovery features lead). ARCHITECTURE.md + docs/user-manual.md updated with all Phase 6 content.

### Post-Build Bug Fixes

Three bugs caught during Playwright verification and fixed before checkpoint:

1. **`platform.env.DB` null guard** — Tauri dev mode doesn't have D1. Discover/crate/style-map server loads now check `platform?.env?.DB` before constructing D1Provider.

2. **Graceful degradation for missing `tag_stats`** — Dev SQLite (Wrangler state) didn't have the Phase F tables. All server loads now catch DB errors and return empty-but-valid data rather than 500.

3. **Badge threshold recalibration** — Initial thresholds set for score range 0.001–0.01 but actual scores are `* 1000` larger (0.06–1000 range). Recalibrated to Very Niche ≥100, Niche ≥8, Eclectic ≥0.36.

### D1 Local DB Seeding Note

Wrangler's local D1 state (`.wrangler/state/v3/d1/...sqlite`) is not the same file as `pipeline/data/mercury.db`. After building tag_stats with `pipeline/build-tag-stats.mjs`, seeded directly into the Wrangler DB via Python's `sqlite3` module. 57,905 tag_stats rows + 2,359 cooccurrence edges.

### Next

**Phase 06.1 — Affiliate Buy Links.** Passive income from Bandcamp, Amazon, Apple purchase links on release pages. Run `/gsd:plan-phase 06.1` to break it down.

> **Commit 52f1e45** (2026-02-21 01:00) — feat(06): phase 6 complete — Discovery Engine verified
> Files changed: 3

## Entry 029 — 2026-02-21 — Headless Debug Harness + 3 Bugs Fixed

### Approach

Steve asked for a way to debug everything without clicking through the app UI. The insight: button clicks trigger underlying commands — just execute those directly. Built a headless test harness that runs every DB query and HTTP route programmatically.

### What Was Built

**`tools/debug-check.mjs`** — comprehensive headless test suite:
- Schema checks for both mercury.db (Tauri dev) and wrangler D1 (web dev)
- All 13 DB query functions tested as raw SQL against the wrangler D1 SQLite
- 6 data integrity checks (no orphan tags, no null slugs, no MBID-prefix edge inversions)
- HTTP route tests: all 9 routes + 3 API endpoints against live wrangler server
- Run with `node tools/debug-check.mjs` (DB only) or `--http` (with HTTP tests)

### Bugs Found and Fixed

**Bug 1 (CRITICAL): `pipeline/data/mercury.db` had no slugs.**
All 10,000 artists had `slug = NULL` — the `add-slugs.js` step had never been run on the Tauri dev DB. This meant the Tauri desktop app couldn't navigate to any artist page (all links would resolve to `/artist/null` or 404).

Fix: `node pipeline/add-slugs.js` run on the dev DB. 10,000 artists now have slugs.

**Bug 2 (MINOR): 3 slug collisions in wrangler D1.**
The MBID-based slug disambiguation was using 8 chars of the MBID as the disambiguation suffix. For artists with non-ASCII names (Cyrillic, CJK) that produce empty base slugs, this isn't always enough — 3 pairs of artists shared the same first 8 MBID chars, making one artist in each pair unreachable.

Fix: Updated the collision entries directly in the D1 SQLite to use 12-char disambiguation. Also fixed `pipeline/add-slugs.js` to use 12 no-dash chars for all future DB builds. Zero collisions now.

**Bug 3 (TEST): 404 check was wrong.**
The test helper treated any non-200 as failure, including intentional 404s. Fixed `get()` to accept an expected status code parameter.

### Results

```
Results: 44 passed, 0 failed
```
- 19 DB + integrity checks
- 16 HTTP route + API checks (including MusicBrainz proxy, search API, 404 handling)
- Rust: `cargo check` clean (0 errors)
- TypeScript: `npm run check` — 0 errors, 3 pre-existing Svelte 5 lint hints

> **Commit 684f4c9** (2026-02-21 01:18) — fix: headless debug harness + slug bugs fixed
> Files changed: 3

> **Commit 50e740e** (2026-02-21 09:00) — docs(06.1): capture phase context
> Files changed: 1

> **Commit 3a04b8b** (2026-02-21 09:23) — docs(06.1): create phase plan
> Files changed: 6

## Entry 030 — 2026-02-21 — Phase 06.1 Plan 01: Affiliate Module Foundation

### What Was Built

Pure-logic affiliate URL builder for all five buy platforms. This is the foundation everything else in Phase 06.1 imports. Completely decoupled from UI.

**`src/lib/affiliates/`** — new module mirroring the embeds/ structure:
- `types.ts` — BuyLink, BuyPlatform, AffiliateConfig interfaces
- `config.ts` — getAffiliateConfig() reading from $env/dynamic/private
- `construct.ts` — buildBuyLinks() returning all 5 platforms always
- `index.ts` — public re-exports

### Key Decisions

**$env/dynamic/private vs static:** Cloudflare Pages environment variables are runtime-only — they're not baked in at build time. Using `$env/static/private` would result in null affiliate IDs in production. Always use dynamic.

**Discogs URL:** `/sell/list?q=...` not `/search?q=...` — the sell/list endpoint shows vinyl for sale in the marketplace, which is what someone clicking "buy" actually wants. The search endpoint shows the music database for cataloguing.

**buildBuyLinks() always returns 5 links:** No conditional logic based on data availability. The isDirect flag distinguishes "we have a real product URL" from "here's a search fallback." UI layer can render them consistently.

**Affiliate program reality:** Only Amazon (5% commission) and Apple Music (7%) have active programs. Bandcamp, Beatport (ended 2008), and Discogs (never launched) get search fallbacks only. Links still useful — users can buy, Mercury just doesn't earn commission from those three.

### Verification

- `npm run check` — 0 errors, 3 pre-existing Svelte 5 warnings (unrelated)
- All 4 files in place, public API exports working
- No affiliate IDs hardcoded anywhere — env vars only

> **Commit 3f2267d** (2026-02-21 09:27) — feat(06.1-01): create affiliate module types and config
> Files changed: 2

> **Commit cfc4d6a** (2026-02-21 09:28) — feat(06.1-01): create affiliate URL construction and public index
> Files changed: 2

> **Commit 2ecdd96** (2026-02-21 09:30) — docs(06.1-01): complete affiliate module foundation plan
> Files changed: 4

> **Commit bc69e75** (2026-02-21 09:31) — docs(06.1-01): add build log entry 030 for affiliate module foundation
> Files changed: 1

> **Commit b86730d** (2026-02-21 09:32) — feat(06.1-03): add BuyOnBar component
> Files changed: 1

> **Commit ddb0955** (2026-02-21 09:33) — feat(06.1-02): add release page server load (SSR + Cloudflare)
> Files changed: 1

> **Commit 1c15668** (2026-02-21 09:34) — docs(06.1-03): complete BuyOnBar component plan
> Files changed: 3

> **Commit e96b33e** (2026-02-21 09:34) — feat(06.1-02): add release page universal load (Tauri passthrough)
> Files changed: 1

> **Commit 5afc7fb** (2026-02-21 09:36) — docs(06.1-02): complete release page data layer plan
> Files changed: 3

---

## Entry 031 — 2026-02-21 — Phase 06.1 Plan 02: Release Page Data Layer

### What Was Built

The SSR and Tauri data loading layer for release detail pages at `/artist/{slug}/release/{mbid}`.

Two new SvelteKit route files:

**`+page.server.ts`** — Cloudflare SSR load:
- Guards on `platform?.env?.DB` — graceful null shell for non-Cloudflare contexts
- MusicBrainz browse endpoint: `/ws/2/release?release-group={mbid}&inc=recordings+artist-credits+media+artist-rels`
- Cloudflare Cache API with 24hr TTL
- Extracts tracklist (Track[]), personnel credits (Credit[]), release-level Bandcamp URL
- Calls `getAffiliateConfig()` + `buildBuyLinks()` server-side

**`+page.ts`** — Universal load (web passthrough / Tauri direct):
- Web: returns server data unchanged
- Tauri: fetches MusicBrainz directly, dynamic import of `buildBuyLinks` with null affiliate config

### Key Decisions

**platform.caches.default, not global caches:** Plan code used `typeof caches !== 'undefined' ? caches.default : null` as a fallback. TypeScript caught it — standard Web API `CacheStorage` has no `.default` property. Fixed to `platform.caches ? platform.caches.default : null`, matching the exact pattern in existing API route handlers.

**Tauri gets non-coded buy links:** In Tauri context there's no server environment, so affiliate IDs (`amazonTag`, `appleToken`) aren't available. Buy links still work — they just don't earn commission. Users can still buy; Mercury just doesn't get the referral fee on desktop. Acceptable tradeoff.

**Interfaces exported from +page.server.ts:** `Track`, `Credit`, `ReleaseDetail` are exported from the server file and imported by `+page.ts`. Standard SvelteKit pattern — type sharing across server/universal boundary.

### Verification

- `npm run check` — 0 errors (379 files, up from 377)
- Both files in place under `src/routes/artist/[slug]/release/[mbid]/`
- No `getAffiliateConfig` import in `+page.ts` (would fail in universal context)

> **Commit f7d331c** (2026-02-21 09:36) — docs(06.1-02): add build log entry 031 for release page data layer
> Files changed: 1

---

## Entry 033 — 2026-02-21 — Phase 06.1 Plan 04: Release Page UI + Navigation

### What Was Built

Phase 06.1 is now complete. The release page is fully wired — every piece from the last three plans connects together.

**`src/routes/artist/[slug]/release/[mbid]/+page.svelte`** — Release detail page:
- Hero: 220px cover art with error fallback placeholder, title, year badge, type badge
- Artist back-link below the title
- BuyOnBar component (always shown — Buy on Bandcamp, Amazon, Apple, Beatport, Discogs)
- Tracklist: numbered tracks, M:SS duration format (321000ms → 5:21)
- Credits/personnel section (from MusicBrainz artist-rels)
- Graceful null state — shows "Loading release details…" if data fetch failed
- Full mobile responsive: hero stacks vertically on narrow screens

**`src/lib/components/ReleaseCard.svelte`** — Now navigates to release detail:
- Added `artistSlug: string` prop
- Cover art wrapped in `<a href="/artist/{slug}/release/{mbid}">`
- Release title wrapped in same link
- CSS: no visual regression — same colors/styles, link wrapper is transparent

**`src/routes/artist/[slug]/+page.svelte`** — Passes `artistSlug={data.artist.slug}` to each ReleaseCard

**`src/routes/+layout.svelte`** — Footer with affiliate disclosure:
- Appears on all pages (web and desktop)
- 0.7rem muted text, centered, max-width 860px
- Text: "Some links on release pages are affiliate links..."

### Verification

- `npm run check` — 0 errors (380 files)
- `npm run build` — clean build, Cloudflare adapter successful
- Release page imports and uses BuyOnBar
- ReleaseCard has `artistSlug` prop with navigation links
- Artist page passes `data.artist.slug` to each card
- Layout footer contains "affiliate" disclosure

> **Commit 486c5f2** (2026-02-21 09:38) — feat(06.1-04): add release detail page UI
> Files changed: 1

> **Commit 252bf59** (2026-02-21 09:40) — feat(06.1-04): wire release navigation + add affiliate footer
> Files changed: 3

> **Commit 9a95965** (2026-02-21 09:42) — docs(06.1-04): complete release page UI plan — phase 06.1 done
> Files changed: 5

> **Commit 96c7af0** (2026-02-21 09:43) — chore(06.1-05): add .dev.vars affiliate env var placeholders
> Files changed: 1

> **Commit 86656f7** (2026-02-21 09:48) — test: extend debug-check with phase 06.1 release page + buy link checks
> Files changed: 1

> **Commit 7fd37ae** (2026-02-21 09:51) — docs(06.1-05): complete affiliate env vars + verification plan — phase 06.1 done
> Files changed: 3

> **Commit 16b1b91** (2026-02-21 09:54) — docs(phase-06.1): complete phase execution — affiliate buy links
> Files changed: 2

> **Commit e148830** (2026-02-21 10:16) — docs(03-04): complete database detection and distribution pipeline plan
> Files changed: 3

> **Commit bd1779e** (2026-02-21 10:22) — docs(03-05): complete auto-updater signing keys and NSIS installer plan
> Files changed: 3

> **Commit 533848e** (2026-02-21 10:47) — docs(phase-03): complete phase execution — desktop app foundation
> Files changed: 2

> **Commit 8b006b0** (2026-02-21 10:55) — test(04): complete UAT - 0 issues, 11 skipped (Tauri runtime checks pass)
> Files changed: 1

> **Commit 989f01d** (2026-02-21 11:04) — docs(phase-05): complete phase execution — AI foundation
> Files changed: 2

> **Commit 4e44320** (2026-02-21 11:43) — docs(07): capture phase context
> Files changed: 1

> **Commit 42ea42a** (2026-02-21 11:53) — docs(07): research knowledge base phase
> Files changed: 1

> **Commit ff1cd04** (2026-02-21 12:07) — docs(07): create phase plan
> Files changed: 8

> **Commit 3b94061** (2026-02-21 12:16) — fix(07): revise plans 03/04/05 based on checker feedback
> Files changed: 3

> **Commit 73ee43a** (2026-02-21 12:22) — fix(07): revise plans based on checker feedback
> Files changed: 2

> **Commit 69b2098** (2026-02-21 12:32) — feat(07-01): extend schema.sql with genres and genre_relationships tables
> Files changed: 1

> **Commit f9c1cd9** (2026-02-21 12:36) — feat(07-01): create build-genre-data.mjs — Phase G genre encyclopedia pipeline
> Files changed: 1

## Entry 027 — 2026-02-21 — Phase 07 Plan 01: Genre Encyclopedia Pipeline (Phase G)

### What Was Built

The data foundation for the Knowledge Base: `pipeline/build-genre-data.mjs` (Phase G pipeline step) plus the schema extension in `pipeline/lib/schema.sql`.

This is the pipeline step that makes genre pages possible — every knowledge base article about a genre will query from these tables.

### Decisions

**Schema design: Three node types.** genres.type can be 'genre' (global), 'scene' (geographic/temporal — e.g. "Detroit Techno"), or 'city' (origin location node). This supports the planned genre graph visualization where scenes cluster around their birth cities.

**mb_tag column as bridge.** genres.mb_tag stores the normalized lowercase slug of the genre name — same format as artist_tags.tag. This means genre pages can directly query which artists in the catalog carry that tag. No join table needed; the slug IS the link.

**Wikidata as the source.** Q188451 (music genre) is the correct Wikidata class. The SPARQL query fetches 5000 rows covering genre hierarchy (P279 = subclass-of), influenced-by (P737), inception year (P571), and country of origin (P495). On first run: 2905 unique genres, 2712 relationships inserted.

**Idempotent DELETE-before-INSERT.** The script clears both tables before inserting — safe to re-run as genres evolve. INSERT OR IGNORE handles any remaining collision edge cases.

**Nominatim geocoding is pipeline-only.** Scene cities get lat/lng coordinates baked into the DB during pipeline runs. Never at runtime. 1100ms delays respect Nominatim's 1 req/sec limit.

**Graceful degradation on network failure.** If Wikidata is unreachable, the script logs a warning and exits 0. The DB is left in whatever state it was — zero crash risk in automated pipeline runs.

### What the Data Looks Like

- 2905 genres (genres with unique Wikidata Q-IDs, filtered to exclude Q12345-style unlabeled entries)
- 2712 relationships (subgenre + influenced_by edges)
- 1273 scene nodes with origin cities pending geocoding
- Collision-safe slugs: base slug used when unique, Q-number suffix appended on collision

> **Commit c3fcb5a** (2026-02-21 12:39) — docs(07-01): complete genre encyclopedia pipeline plan
> Files changed: 3

> **Commit 33ef83b** (2026-02-21 12:39) — docs(07-01): mark KB-01 and DISC-05 requirements complete
> Files changed: 1

> **Commit 8b67b07** (2026-02-21 12:41) — feat(07-02): add genre graph query functions to queries.ts
> Files changed: 1

> **Commit 5b6a2db** (2026-02-21 12:43) — docs(07-02): complete genre query functions plan
> Files changed: 4

> **Commit ad56299** (2026-02-21 12:45) — feat(07-05): add Time Machine API route and server/universal loads
> Files changed: 3

> **Commit a500b47** (2026-02-21 12:46) — feat(07-03): create GenreGraph.svelte — D3 force graph with 3 node types
> Files changed: 1

> **Commit 33f5f56** (2026-02-21 12:46) — feat(07-05): add /api/genres endpoint and GenreGraphEvolution component
> Files changed: 2

> **Commit 6b1a410** (2026-02-21 12:47) — feat(07-03): create /kb route — server load, universal load, landing page
> Files changed: 8

---

## Entry — 2026-02-21 — Phase 07 Plan 03: KB Landing Page + GenreGraph

### What Was Built

The Knowledge Base landing page (`/kb`) with the `GenreGraph.svelte` component — the primary entry point to the genre encyclopedia.

**GenreGraph.svelte** extended directly from the StyleMap.svelte pattern:
- Same headless D3 tick(300) approach — no `on('tick')` wired to Svelte state, single `$state` assignment after simulation stops
- Three visually distinct node types: genre (filled circle, accent color), scene (diamond/polygon, warm orange), city (dashed outline circle with center dot)
- Log10 radius scaling with connectivity bonus — highly-connected nodes are larger but capped
- subgenre edges stronger than influenced_by (0.4 vs 0.15 force strength), influenced_by rendered as dashed lines
- Hover dims non-neighbors to 25% opacity for focus clarity
- `focusSlug` prop for side-panel mode (1.4x radius emphasis)
- Reactive to prop changes via `$effect` — new subgraph triggers re-simulation
- Legend in bottom-right corner showing all three node types

**`/kb` route:**
- `+page.server.ts`: D1Provider fetches top-connected genre graph (no taste on web — no profile)
- `+page.ts`: `isTauri()` branch loads `tasteProfile.tags` for personalized starting graph (top 5 tags, falls back to top-connected if empty)
- `+page.svelte`: Clean landing page with header + graph, empty state guides user to run pipeline

### Decisions

**Used isTauri() from $lib/platform instead of inline window check.** The plan spec showed the raw `window.__TAURI_INTERNALS__` check, but the existing style-map page uses the `isTauri()` utility. Consistent with established pattern.

**Graceful platform.env.DB guard in server load.** Added `if (!platform?.env?.DB)` check matching the style-map pattern — returns empty graph on local dev without D1.

**Try/catch wraps DB calls.** If genres table not yet populated (fresh install before pipeline runs), returns empty graph and shows the CLI command for the user to run. Zero crash risk.

> **Commit 7c0b5b5** (2026-02-21 12:48) — feat(07-05): create Time Machine page UI with decade buttons, year scrubber, and artist list
> Files changed: 1

> **Commit bd97411** (2026-02-21 12:49) — feat(07-04): add genreSummary AI prompt to prompts.ts
> Files changed: 1

> **Commit 397cc99** (2026-02-21 12:49) — feat(07-04): genre page UI — layered content, scene map, key artists, related genres
> Files changed: 1

---

## Entry — 2026-02-21 — Phase 07 Plan 04: Genre/Scene Detail Page

### What Was Built

The `/kb/genre/[slug]` route — the core content page of the Knowledge Base. Where users land after clicking a genre node in the graph.

**Layered content (four sources, seamlessly blended):**
- **Layer 2 (Wikipedia):** Fetched server-side and cached for 24hr via Cloudflare Cache API. `caches.open('wikipedia')` — same pattern as MusicBrainz bio caching.
- **Layer 3 (AI):** `genreSummary()` prompt added to `prompts.ts`. Tauri-only, lazy loaded in `onMount` only when Wikipedia isn't available. Temperature 0.6 — evocative but not creative.
- **Layer 1 sparse CTA:** "Know this scene? Write it." — invitation language, not a bug report.

**Scene map:** `SceneMap.svelte` with Leaflet dynamic import in `onMount` (SSR-safe). CSS injected via `<link>` element appended to `document.head` — avoids Vite's dynamic CSS import rejection. Only renders when `origin_lat` is set.

**Key artists grid:** Up to 10 artists fetched via `mb_tag → artist_tags` bridge. Displayed with `ArtistCard` components linking to Mercury profiles.

**Related genres:** Subgraph neighbors shown as chips with colored dots (blue for scene, green for city).

**Mini genre graph:** Full `GenreGraph` component shown in-page with `focusSlug` set — gives orientation context without navigating away.

### Decisions

**Used `$derived` for `isScene` and `related` instead of `const`.** Initial implementation used `const` declarations referencing `data` prop. Svelte checker warned about non-reactive references. `$derived` correctly tracks `data` changes (e.g. SvelteKit's page data updates on navigation).

**Leaflet CSS via `<link>` element injection, not dynamic import.** The plan spec noted `import 'leaflet/dist/leaflet.css'` as the preferred pattern but acknowledged Vite might reject it. Using CDN link injection is more reliable across build targets (web + Tauri).

**`ai.complete()` not `ai.generate()`.** Plan spec template used `ai.generate()` but `AiProvider` interface only exposes `ai.complete()`. Corrected to match the actual interface.

**Server + universal load already committed in 07-03.** The prior plan's executor preemptively committed `+page.server.ts` and `+page.ts` for the genre route. The actual new work in this plan: `genreSummary` in `prompts.ts` and the full page UI in `+page.svelte`.

---

## Entry — 2026-02-21 — Phase 07 Plan 05: Time Machine Page

### What Was Built

The `/time-machine` route — the DISC-06 requirement for browsing releases by year, scrubbing a timeline, filtering by tags, and watching genre evolution.

**Three views, per CONTEXT.md locked decision:**

1. **Animated genre graph evolution** (`GenreGraphEvolution.svelte`) — D3 force-directed graph that shows only genres whose `inception_year <= currentYear`. As you advance the year slider, new genres "emerge" with a scale-up animation. Uses `from_id`/`to_id` from `GenreEdge` (not D3's internal `.source`/`.target` fields) for filtering via `Set<number>`.

2. **Year snapshot heading** — "What was happening in [year]" updates reactively as the slider moves.

3. **Filtered artist list** — Artists whose `begin_year` matches the selected year, optionally narrowed by genre tag.

**Navigation:** Decade buttons (60s-20s) jump to the decade midpoint and constrain the slider range. Fine scrub within the decade fires a 300ms debounced `loadYear()` call. Tag filter fires with 500ms debounce.

**Platform branching (critical):**
- `loadYear()` branches on `isTauri()` — Tauri queries `getArtistsByYear()` directly, web fetches `/api/time-machine`
- `onMount` branches on `isTauri()` — Tauri calls `getAllGenreGraph()` directly, web fetches `/api/genres`
- Tauri adapter-static has no server — any fetch to `/api/*` would silently fail

### Key Decisions

**Used `d3-force` imports (not `import * as d3 from 'd3'`).** The plan spec showed the full D3 bundle import, but only `d3-force` is installed in this project. Used the same named-function import pattern as `StyleMap.svelte`. Zero new dependency — reused the already-installed `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter`.

**`resp.json()` requires explicit type assertion.** Added `as { artists: ...; year: number }` and `as { nodes: GenreNode[]; edges: GenreEdge[] }` casts to silence strict TypeScript `unknown` type errors — consistent with the codebase pattern.

> **Commit 073bb2a** (2026-02-21 12:49) — docs(07-03): complete KB landing page plan — GenreGraph + /kb route
> Files changed: 4

> **Commit 6bbbc82** (2026-02-21 12:51) — docs(07-05): complete Time Machine plan — /time-machine route, /api/genres, GenreGraphEvolution
> Files changed: 4

> **Commit d69d297** (2026-02-21 12:52) — docs(07-04): complete genre detail page plan
> Files changed: 3

> **Commit 67fb4a7** (2026-02-21 12:55) — feat(07-06): add LinerNotes component with lazy MusicBrainz credits fetch
> Files changed: 2

> **Commit b182a42** (2026-02-21 12:56) — feat(07-06): wire KB links into artist page + add nav links
> Files changed: 2

---

## Entry — 2026-02-21 — Phase 07 Plan 06: App Integration (Liner Notes + KB Links + Nav)

### What Was Built

Phase 07 Plan 06 wires the Knowledge Base into the existing app UI — three integration points:

**1. LinerNotes.svelte — Expandable credits panel on release pages**

A collapsible section that appears below the credits section on every release page. Collapsed by default (zero network requests on page load). On first expand, lazy-fetches the MusicBrainz release-group browse endpoint with `inc=artist-credits+labels+recordings`. Shows three credit types:
- Artist credits (e.g., "Aphex Twin")
- Label info with catalog numbers (e.g., "Warp Records · WARP CD30")
- Per-track recording credits (only shown for tracks that have them)

Rate-limiting awareness: if MusicBrainz returns non-200, shows a human-readable error message rather than crashing. Uses properly typed inline interfaces (`MbRelease`, `MbArtistCredit`, etc.) for TypeScript strict compliance — consistent with how the server route handles the same API.

**2. Artist page: Genre tags as dual-purpose links**

Every genre tag chip on artist pages now has a small `↗` superscript link to the corresponding `/kb/genre/[slug]` page. The existing TagChip (which links to `/search?q=...&mode=tag`) is preserved — users get both: search the catalog AND explore the genre's full context.

Slug conversion: `tag.toLowerCase().replace(/\s+/g, '-')` — same pattern as the KB pipeline uses for `mb_tag`.

**3. Artist page: "Explore this scene" panel**

A subtle call-to-action below the tags block: "Explore [primary genre] scene →". Only shown when `tags.length > 0`. The primary genre is `tags[0]` (most prominent tag from MB). Links to the genre's `/kb/genre/[slug]` page.

**4. Navigation: Knowledge Base + Time Machine links**

Both links added to web and Tauri nav bars (after Style Map). Both platforms can use the KB and Time Machine — no platform gating needed. Active state detection via `$page.url.pathname.startsWith('/kb')` and `.startsWith('/time-machine')`.

### Key Decisions

**Browse endpoint pattern for LinerNotes (not direct release MBID lookup).** The release page is structured around the release-group MBID (from URL params). Rather than adding a second server-side fetch to get the actual release MBID, LinerNotes uses the same browse endpoint as `+page.server.ts`: `/ws/2/release?release-group={mbid}&inc=...&limit=1`. The first release in the response is taken. Consistent, no extra data loading complexity.

**TypeScript strict types for MB response shapes.** `resp.json()` returns `unknown` in strict mode — explicit interface cast required. Defined inline interfaces (`MbRelease`, `MbArtistCredit`, `MbLabelInfo`, `MbTrack`, `MbMedium`) within the component script. Consistent with how existing components handle strict JSON typing.

**Both web and Tauri get Knowledge Base + Time Machine nav links.** The plan explicitly stated "should appear on BOTH web and Tauri." Unlike Library/Explore/Settings (Tauri-only), the KB and Time Machine are web-first features. They just work on both platforms.

> **Commit dafa552** (2026-02-21 12:58) — docs(07-06): complete app integration plan — LinerNotes + KB links + nav
> Files changed: 4

> **Commit 0fe0ff4** (2026-02-21 13:01) — docs(07-07): update ARCHITECTURE.md and user-manual.md for Phase 7
> Files changed: 2

---

## Entry — 2026-02-21 — Phase 7 Complete: Knowledge Base

### What Phase 7 Built

Phase 7 adds Mercury's genre and scene encyclopedia — the Knowledge Base. It connects the 2.8M-artist catalog to a structured graph of musical genres, scenes, and cities, with geographic context, Wikipedia descriptions, AI-generated vibe summaries, and deep links back to artist pages.

Seven plans, completed in one session:

| Plan | What |
|------|------|
| 07-01 | Genre data pipeline (Phase G) — Wikidata SPARQL + Nominatim geocoding |
| 07-02 | DB schema (`genres`, `genre_relationships`) + 6 query functions |
| 07-03 | KB landing page + GenreGraph component |
| 07-04 | Genre/scene detail page + SceneMap + AI genreSummary |
| 07-05 | Time Machine page + GenreGraphEvolution |
| 07-06 | App integration — LinerNotes + KB genre links on artist pages + nav |
| 07-07 | Documentation — ARCHITECTURE.md + user-manual.md + BUILD-LOG.md |

### Key Decisions

<!-- decision: Genre data from Wikidata SPARQL at pipeline time -->
**Genre data source: Wikidata SPARQL, pipeline-time only.** Not manual curation (wouldn't scale), not runtime fetch (rate limits + latency). The `pipeline/build-genre-data.mjs` script queries Wikidata once at DB build time and bakes everything into the `genres` table. MusicBrainz provides the `mb_tag` bridge column — same slug format as `artist_tags.tag`, direct join, no mapping table.
<!-- /decision -->

<!-- decision: Nominatim geocoding is pipeline-only -->
**Geocoding is pipeline-only.** Nominatim enforces a hard rate limit of 1 request per second. At runtime that would add 1+ seconds of latency per scene page load. Instead, coordinates are fetched at build time with a 1100ms delay between requests, stored in `origin_lat`/`origin_lng`, and served statically from the DB. The anti-pattern (geocoding at runtime) is documented in ARCHITECTURE.md.
<!-- /decision -->

<!-- decision: GenreGraph extends StyleMap headless D3 tick() pattern -->
**GenreGraph extends StyleMap's headless D3 tick(300) pattern.** The same anti-pattern that applies to StyleMap applies here — never wire `on('tick')` to Svelte state. Run 300 iterations synchronously, single state assignment after stop. Zero layout thrashing. Three node types: genre (circle, accent color), scene (diamond, warm orange), city (dashed circle, teal). Subgenre edges 0.4 strength/solid; influenced_by 0.15/dashed.
<!-- /decision -->

<!-- decision: Leaflet loaded via dynamic import in onMount -->
**Leaflet via dynamic import in onMount — SSR-safe pattern.** Top-level `import L from 'leaflet'` crashes SSR with `window is not defined`. Dynamic import inside `onMount` ensures Leaflet only loads client-side. Leaflet CSS injected via `document.head` link element (not Vite dynamic import) — works in both web and Tauri builds without Vite CSS rejection.
<!-- /decision -->

<!-- decision: Time Machine opening state: current year - 30 -->
**Time Machine opens at current year minus 30.** A deliberate nostalgia default — puts users in the era they likely grew up with (±30 years). Adjust freely with the decade buttons and year slider. No persistence; reset on every visit.
<!-- /decision -->

<!-- decision: LinerNotes lazy-fetches on expand -->
**LinerNotes fetches on first expand — never on page load.** Rate limit consideration: MusicBrainz allows 1 req/sec. Loading credits for every release on page load would violate that at scale, and most users don't need credits. Lazy expansion means zero network cost until the user explicitly asks. If MB returns non-200, shows a human-readable error rather than crashing.
<!-- /decision -->

<!-- decision: AI genreSummary temperature 0.6, Tauri-only -->
**AI genre summary: temperature 0.6, Tauri-only, Wikipedia takes priority.** Slightly warmer than the artistSummary prompt (0.5) to allow more evocative language for genre descriptions. Wikipedia descriptions always take Layer 2 priority — the AI summary is Layer 3 (shown only when Wikipedia isn't available). Best-effort: if the AI isn't initialized, the section simply doesn't render. `genreSummary` exported as a standalone function in `prompts.ts` (not inside the PROMPTS object) — required for dynamic import named export pattern.
<!-- /decision -->

<!-- decision: Genre tags on artist pages dual-linked -->
**Genre tags on artist pages are dual-linked.** Each tag chip still links to `/discover?tags=...` (catalog search). A small `↗` superscript link now also leads to `/kb/genre/[slug]` (encyclopedia context). Users get both: "find more artists like this" AND "understand what this genre actually is." The "Explore [genre] scene →" panel below the tags block uses `tags[0]` (most prominent MB tag) as the primary genre signal.
<!-- /decision -->

<!-- decision: Community editing deferred to Phase 9+ -->
**Community editing mechanics explicitly deferred to Phase 9+.** Who can edit, version history, moderation — none of this is scoped to Phase 7. Pages with sparse data show a contribution invitation CTA. The system is built to accept community content later (description column exists in `genres` table) but none of the write infrastructure is implemented yet.
<!-- /decision -->

### Architecture Additions

**New DB tables:** `genres` (slug, name, type, wikidata_id, description, inception_year, origin_lat/lng, mb_tag) and `genre_relationships` (from_id, to_id, rel_type). Both documented in ARCHITECTURE.md Data Model section.

**New components:** GenreGraph.svelte, SceneMap.svelte, GenreGraphEvolution.svelte, LinerNotes.svelte.

**New routes:** `/kb` (landing), `/kb/genre/[slug]` (detail), `/time-machine` (year browser).

**New pipeline step:** `pipeline/build-genre-data.mjs` (Phase G).

**New query functions:** getGenreSubgraph, getGenreBySlug, getGenreKeyArtists, getArtistsByYear, getStarterGenreGraph, getAllGenreGraph — all in `src/lib/db/queries.ts`.

**New AI prompt:** genreSummary (standalone export in prompts.ts, temperature 0.6).

### Build Verification

Both `npm run check` and `npm run build` pass with 0 errors after all Phase 7 work.

Phase 7 complete. Requirements KB-01, KB-02, DISC-05, DISC-06, DISC-07 all satisfied.

> **Commit fd71821** (2026-02-21 13:03) — docs(07-07): add Phase 7 BUILD-LOG entry with all key decisions
> Files changed: 1

> **Commit a268dea** (2026-02-21 13:05) — docs(07-07): complete Knowledge Base documentation plan
> Files changed: 3

> **Commit 56743ae** (2026-02-21 13:10) — docs(phase-07): complete phase execution — knowledge base
> Files changed: 2

> **Commit 733d37f** (2026-02-21 13:17) — test(07): complete UAT — 28 passed, 0 issues
> Files changed: 1

> **Commit cc0f55f** (2026-02-21 13:39) — docs(roadmap): add gap closure phases 07.1-07.3
> Files changed: 5

> **Commit 53abbd3** (2026-02-21 13:54) — docs(07.1): capture phase context
> Files changed: 1

> **Commit db2e484** (2026-02-21 13:57) — docs(07.1): update context — no popular artists in taste empty state
> Files changed: 1

> **Commit fc49144** (2026-02-21 14:01) — docs(07.1): research phase — integration hotfixes
> Files changed: 1

> **Commit 1a36081** (2026-02-21 14:06) — docs(07.1): create phase plan
> Files changed: 4

> **Commit f153c06** (2026-02-21 14:10) — fix(07.1): revise plan 02 — add KB empty-taste stub per user decision
> Files changed: 1

> **Commit 078d989** (2026-02-21 14:30) — feat(07.1-02): KB landing page — reactive personalization + skeleton
> Files changed: 1

> **Commit a2d2a72** (2026-02-21 14:30) — feat(07.1-01): wire loadTasteProfile into layout startup + add About nav/footer links
> Files changed: 1

> **Commit dbd7700** (2026-02-21 14:31) — feat(07.1-03): add genre→discover navigation links (top and bottom)
> Files changed: 1

> **Commit 8e93122** (2026-02-21 14:31) — feat(07.1-02): Explore page — taste-loading skeleton + empty taste CTA
> Files changed: 1

> **Commit eef54e9** (2026-02-21 14:32) — feat(07.1-01): create /about page with 5 structured sections and CTA links
> Files changed: 1

> **Commit 8b4661d** (2026-02-21 14:33) — docs(07.1-03): complete genre discover navigation plan
> Files changed: 4

> **Commit 4cfd770** (2026-02-21 14:33) — docs(07.1-02): complete KB+Explore taste states plan — SUMMARY, STATE, requirements
> Files changed: 3

> **Commit aaacbcc** (2026-02-21 14:34) — docs(07.1-01): complete layout startup wiring + about page plan
> Files changed: 2

> **Commit 5cf9c2f** (2026-02-21 14:38) — docs(phase-07.1): complete phase execution
> Files changed: 2

> **Commit be2df33** (2026-02-21 15:12) — docs(07.2): capture phase context
> Files changed: 1

> **Commit 94b009d** (2026-02-21 15:30) — docs(07.2): research playback taste signal phase
> Files changed: 1

> **Commit c6ad925** (2026-02-21 15:37) — docs(07.2): create phase plan
> Files changed: 4

## Entry — 2026-02-21 — Phase 07.2 Plan 01: Play History Persistence Layer

### What Was Built

Added the `play_history` table to `taste.db` and implemented the full Rust backend for recording, querying, and exporting listening history. This is the foundational data layer for the playback-to-taste pipeline — nothing in Phase 07.2 can be built without these commands.

Two tasks, two commits:

| Task | What |
|------|------|
| 01 | `play_history` table + indexes + `PlayRecord` struct + 6 Tauri commands in `taste_db.rs` |
| 02 | Register all 6 commands in `lib.rs` handler macro + `cargo check` verification |

### Schema

```sql
CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_path TEXT NOT NULL,
    artist_name TEXT,
    track_title TEXT,
    album_name TEXT,
    played_at INTEGER NOT NULL,
    duration_secs REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_artist ON play_history(artist_name);
```

<!-- decision: play_history in taste.db, not library.db -->
**`play_history` lives in `taste.db`, not `library.db`.** Play history is a taste signal — it belongs alongside `taste_tags`, `favorite_artists`, and `taste_anchors` in the taste profile database. `library.db` is a catalog of tracks; `taste.db` is the user's relationship with those tracks.
<!-- /decision -->

<!-- decision: 70% completion threshold is frontend-enforced, not in Rust -->
**The 70% completion gate lives in the frontend, not in the Rust command.** `record_play` simply writes a row — the caller decides when a "qualifying play" has occurred. This keeps the Rust layer generic (could replay from imports, could have different thresholds in future) while making the threshold easy to adjust in TypeScript without a Rust recompile.
<!-- /decision -->

### Commands Added

- `record_play` — writes a play event to the database
- `get_play_history` — returns records ordered by most recent, optional limit
- `delete_play` — deletes a specific record by id
- `clear_play_history` — wipes all history
- `get_play_count` — returns count for the activation gate (5+ plays)
- `export_play_history` — serializes full history to JSON string for user export

Also added `private_listening` default to `ai_settings` defaults array — will be used in Plan 02 to gate whether plays are recorded at all.

### Build Verification

- `cargo check`: clean, 0 errors
- `npm run check`: 0 TypeScript errors
- `npm run build`: clean

> **Commit d5f5106** (2026-02-21 15:42) — feat(07.2-01): add play_history table and 6 Tauri commands to taste_db.rs
> Files changed: 1

> **Commit bb3e19d** (2026-02-21 15:43) — feat(07.2-01): register 6 play history commands in lib.rs
> Files changed: 1

> **Commit dd09513** (2026-02-21 15:45) — docs(07.2-01): complete play history persistence layer plan
> Files changed: 5

> **Commit 6f93004** (2026-02-21 15:47) — feat(07.2-02): create playback.svelte.ts and history.ts — recording pipeline + CRUD wrappers
> Files changed: 2

> **Commit 04748a1** (2026-02-21 15:49) — feat(07.2-02): hook threshold detection, extend signals with play history, wire layout
> Files changed: 3

## Entry — 2026-02-21 — Phase 07.2 Plan 02: Play Tracking Frontend + Taste Signal Computation

### What Was Built

The frontend pipeline that turns listening behavior into taste data. Four files, two tasks:

| Task | Files | What |
|------|-------|------|
| 01 | `playback.svelte.ts`, `history.ts` | Recording pipeline + CRUD wrappers |
| 02 | `audio.svelte.ts`, `signals.ts`, `+layout.svelte` | Threshold detection + taste signal merge + startup wiring |

### The 70% Threshold

`audio.svelte.ts` now detects when a local track passes the 70% completion mark. A module-level `thresholdFired` flag prevents double-counting — it resets on `loadedmetadata` (new track) and on `play` events where `currentTime < 1` (repeat-one restart). The detection fires inside `timeupdate` which runs ~4x/sec, but the actual recording is a fire-and-forget dynamic import so it never blocks the event loop.

<!-- decision: 70% threshold fires once per track load via thresholdFired flag -->
The `thresholdFired` flag lives at module scope alongside the `audio` element. It resets in `loadedmetadata` (new track src) and in `play` when `currentTime < 1` (restart from beginning). This covers the two ways a play can "reset" without creating false double-counts from seeking backward past the threshold.
<!-- /decision -->

### Private Mode

`playbackState.privateMode` gates all recording. If `true`, `recordQualifyingPlay()` returns immediately without invoking Rust. The mode persists to `ai_settings` in `taste.db` and is loaded on app startup via `loadPlaybackSettings()` — so incognito listening is respected from the very first track, not just after the first event.

### Taste Signal Merge

`computeTasteFromPlayHistory()` uses exponential decay with a 30-day half-life:

```
weight = e^(-0.693 * age_ms / 30d_in_ms)
```

Plays from today get weight ~1.0. Plays from 30 days ago get weight ~0.5. Plays from 90 days ago get weight ~0.125. Old binges fade naturally — the taste profile reflects recent listening more than ancient history.

The activation gate (5 qualifying plays minimum) means casual listeners aren't influenced by noise. Only after 5 full plays does play history start shaping taste computation.

<!-- decision: 'playback' source loses to 'library' and 'favorite' in source priority -->
When play history generates a tag that already exists from library or favorites, the existing source is preserved. `source: existing.source` wins over `source: 'playback'`. This means manually touched tags (`source: 'manual'`) also survive — the source hierarchy is: manual (survives recompute) > favorite > library > playback. Tags from play history are additive to weight but don't override human-defined provenance.
<!-- /decision -->

### Auto-Fix Applied

One deviation from the plan: `@tauri-apps/plugin-fs` isn't installed in this project (not in Cargo.toml). The plan's `exportPlayHistory()` function tries to import it. At runtime the try/catch handles the absence gracefully, but TypeScript's compiler still rejects the unknown module. Fixed with a `@ts-ignore` directive on the dynamic import — the function falls back to the Rust invoke path or blob download in all real scenarios.

### Build Verification

- `npm run check`: 0 TypeScript errors
- `npm run build`: clean (6.55s)
- `grep thresholdFired audio.svelte.ts`: 5 occurrences (declaration, guard, set, two resets)
- `grep computeTasteFromPlayHistory signals.ts`: defined + called in recomputeTaste

> **Commit 19a0545** (2026-02-21 15:52) — docs(07.2-02): complete play tracking frontend + taste signal computation plan
> Files changed: 3

> **Commit bc75b61** (2026-02-21 15:54) — feat(07.2-03): hook SoundCloud widget events in EmbedPlayer
> Files changed: 1

> **Commit 4f77f24** (2026-02-21 15:57) — feat(07.2-03): add ListeningHistory component + Settings page section
> Files changed: 3

---

## 2026-02-21 — Phase 07.2 Plan 03: SoundCloud Widget Hook + Listening History UI

Phase 07.2 complete. The user-facing side of the playback taste pipeline is now fully visible and controllable.

### What Was Built

| Task | Files | What |
|------|-------|------|
| 01 | `EmbedPlayer.svelte` | SoundCloud Widget API hook for 70% play detection |
| 02 | `ListeningHistory.svelte`, `settings/+page.svelte`, `history.ts` | History UI + Settings section + bug fix |

### SoundCloud Widget Hook

`EmbedPlayer.svelte` now loads the SoundCloud Widget API on demand (singleton — `window.SC` guard prevents double-load). After a SoundCloud embed is in the DOM, `hookSoundCloudWidget()` binds to two widget events:

- `PLAY` — resets `progressFired` flag on every new track start
- `PLAY_PROGRESS` — fires `recordEmbedPlay()` once when `relativePosition >= 0.70`

Two `$effect` blocks cover both render paths: the click-to-load path (watching `loadedEmbeds` for `sc-` keys) and the direct render path (when `soundcloudEmbedHtml` is already set on mount). The `sc-embed-container` class marks the wrapper div for DOM lookup.

The `artistName` prop threads through from the artist page — SoundCloud plays are attributed to the correct artist in taste computation.

### Listening History UI

`ListeningHistory.svelte` gives users full visibility and control:

- **Private mode toggle** — checkbox at the top, wired to `togglePrivateMode()`, live status text reflects current mode
- **Stats row** — total qualifying plays count + activation badge (shows "Active" or "N more to activate" at threshold 5)
- **History list** — scrollable, up to 200 most recent entries, each with track/artist/album/date + delete button
- **Actions** — Export JSON (saves via Tauri dialog + Rust write) and Clear All (two-step confirm pattern)

The section lives in Settings below the Taste Profile, visible whenever the app is in Tauri mode (not gated on `aiState.enabled` — play history is orthogonal to AI state).

### Auto-Fixes Applied

<!-- decision: SC Widget type definition uses merged type (plan had duplicate Widget identifier) -->
The plan's type definition for `SC.Widget` declared the same property twice with conflicting types. Fixed by splitting into `SCWidget` type alias and `SCWidgetConstructor` intersection type — TypeScript accepted it cleanly.
<!-- /decision -->

<!-- decision: @tauri-apps/plugin-fs removed from exportPlayHistory — Rollup can't resolve uninstalled packages even in dynamic imports -->
The `@tauri-apps/plugin-fs` dynamic import in `history.ts` was suppressed with `@ts-ignore` in Plan 02 (fixing type check), but `npm run build` failed when `ListeningHistory.svelte` pulled `history.ts` into the web bundle — Rollup traverses dynamic imports and can't resolve uninstalled packages. Fixed by removing the `plugin-fs` branch entirely. The Rust `export_play_history_to_path` invoke was already the real fallback path since `plugin-fs` was never installed.
<!-- /decision -->

### Build Verification

- `npm run check`: 0 TypeScript errors
- `npm run build`: clean (2.12s)
- All 7 plan verification greps pass

> **Commit 445953c** (2026-02-21 16:00) — docs(07.2-03): complete SoundCloud widget hook + Listening History UI plan
> Files changed: 5

> **Commit f06e974** (2026-02-21 18:05) — docs(07.3): complete requirements & verification cleanup research
> Files changed: 1

> **Commit 71933e9** (2026-02-21 18:10) — docs(07.3): create phase plan
> Files changed: 4

> **Commit 49de713** (2026-02-21 18:22) — docs(07.3-01): mark PLAYER-01 and PLAYER-02 as Complete in REQUIREMENTS.md
> Files changed: 1

> **Commit c816163** (2026-02-21 18:24) — docs(07.3-01): complete requirements checkbox alignment plan
> Files changed: 3

> **Commit dc17163** (2026-02-21 18:24) — fix(07.3-03): replace platform! assertions with graceful guards in 4 server routes
> Files changed: 6

> **Commit edec2d8** (2026-02-21 18:24) — docs(07.3-02): retroactive Phase 04 verification report
> Files changed: 1

> **Commit 73b60ec** (2026-02-21 18:25) — docs(07.3-03): add pipeline execution order comments to schema.sql
> Files changed: 1

> **Commit 5b5bccb** (2026-02-21 18:27) — docs(07.3-02): complete retroactive Phase 04 verification plan
> Files changed: 3

> **Commit 941c3c7** (2026-02-21 18:28) — docs(07.3-03): complete platform guard cleanup plan
> Files changed: 2

> **Commit 103da68** (2026-02-21 18:31) — docs(phase-07.3): complete phase execution
> Files changed: 2

> **Commit 470b43d** (2026-02-21 18:58) — docs(phase-08): research underground aesthetic domain
> Files changed: 1

> **Commit c17e590** (2026-02-21 19:07) — docs(08-underground-aesthetic): create phase plan
> Files changed: 5

> **Commit 1ad5d4a** (2026-02-21 19:14) — docs(phase-08): capture context and research for Underground Aesthetic
> Files changed: 2

> **Commit 8aa622a** (2026-02-21 19:23) — docs(08-underground-aesthetic): create phase plan
> Files changed: 5

> **Commit 00b4ac8** (2026-02-21 19:29) — fix(08-underground-aesthetic): revise plans based on checker feedback
> Files changed: 5

---

## Entry — 2026-02-21 — Phase 08 Plan 01: Theme Engine Foundation

### What's Being Built

Phase 8 is the turning point. Mercury stops looking like a search engine and starts feeling like a place. Plan 01 is the foundation: an OKLCH color theming engine that generates a personalized palette from the user's taste profile.

**"Two different people see two different Mercurys."** The theme engine converts a user's top taste tags into a deterministic hue, then generates a full color palette using OKLCH color space. Same tags always produce the same color — no randomness, no state drift.

### Design Decisions

<!-- decision: OKLCH chosen over HSL for taste-based theming -->
OKLCH (perceptual lightness, chroma, hue) is used instead of HSL because OKLCH maintains perceptually consistent brightness across hues. Shifting a blue background to a green background in HSL can make the green look brighter than the blue at the same L value — OKLCH corrects for this. The theme engine shifts hue only, keeping L and C fixed, so the UI density and contrast feel identical regardless of which hue your taste generates.
<!-- /decision -->

<!-- decision: djb2-style hash chosen for tag-to-hue mapping -->
Tag-to-hue mapping uses a djb2-style polynomial hash (hash = ((hash << 5) - hash + charCode) | 0). Simple, deterministic, no dependencies, distributes well across 0-360. The top 5 tags by weight are sorted alphabetically before hashing — alphabet sort ensures same tags always produce the same order regardless of original sort.
<!-- /decision -->

<!-- decision: Text properties excluded from palette generation -->
--text-primary, --text-secondary, --text-muted, --text-accent are intentionally excluded from the generated palette. They stay at fixed lightness values for WCAG AA readability regardless of hue. Coloring body text with a taste hue would compromise legibility without adding much visual value.
<!-- /decision -->

### Task 1 Results

Three new modules in `src/lib/theme/`:

| File | Exports |
|------|---------|
| `palette.ts` | `tasteTagsToHue`, `generatePalette`, `TASTE_PALETTE_KEYS` |
| `engine.svelte.ts` | `themeState`, `applyPalette`, `clearPalette`, `initTheme`, `updateThemeFromTaste` |
| `preferences.svelte.ts` | `loadThemePreferences`, `saveThemePreference`, `loadStreamingPreference`, `saveStreamingPreference`, `loadLayoutPreference`, `saveLayoutPreference`, `streamingPref` |

`npm run check`: 0 errors.

### Task 2 Results

`theme.css` updated: all taste-affected properties converted from hex to OKLCH equivalents.

- Backgrounds: `oklch(0.07 0 0)` through `oklch(0.18 0 0)` — achromatic (chroma 0), visually identical to previous hex values
- Borders: `oklch(0.15 0 0)` through `oklch(0.27 0 0)` — achromatic
- Interactive (link/tag/progress): `oklch(0.72 0.08 220)` — blue-tinted defaults at hue 220
- Player: `oklch(0.06 0 0)` and `oklch(0.11 0 0)` — near-black achromatic
- Text properties: kept at fixed achromatic lightness (WCAG AA — never hue-tinted)
- Platform colors: kept as hex brand colors (not taste-tintable)

Visual appearance is identical to the previous hex theme — same perceptual lightness, same hue. When the taste engine overrides at runtime, the color space is already consistent (no hex→oklch visual jump on first theme activation).

`npm run check`: 0 errors. `npm run build`: clean (9.13s).

### Plan 01 Complete

Both tasks done. Theme engine foundation is in place and ready for Plan 03 integration (layout wiring, initTheme call from root layout, streaming preference in embeds).

> **Commit bac28d7** (2026-02-21 20:08) — feat(08-01): create OKLCH theme engine modules
> Files changed: 4

> **Commit f77b9e2** (2026-02-21 20:10) — feat(08-01): convert theme.css to OKLCH color space
> Files changed: 2

> **Commit 4389cee** (2026-02-21 20:12) — docs(08-01): complete theme engine foundation plan
> Files changed: 4

> **Commit eb0a2de** (2026-02-21 20:15) — feat(08-02): install PaneForge and create layout template definitions
> Files changed: 4

> **Commit 149abf9** (2026-02-21 20:18) — feat(08-02): create PanelLayout, LeftSidebar, RightSidebar, ControlBar components
> Files changed: 4

---

## Entry — 2026-02-21 — Phase 08 Plan 02: Panel Layout System

### What's Being Built

The cockpit infrastructure. PaneForge provides the resizable split-pane engine. Four new components wire together the "Foobar2000 energy" workspace: left sidebar, main content area, right context panel, and a dense 32px toolbar.

This is all scaffolding — not wired into the live layout yet (Plan 03 does that). The goal is components that compile, have real content, and are ready to slot in.

### Design Decisions

<!-- decision: PaneForge chosen for resizable panel engine -->
PaneForge (built on top of SvelteKit) provides PaneGroup, Pane, PaneResizer primitives. Handles resize via mouse drag and keyboard, auto-saves pane sizes to localStorage via autoSaveId, has full TypeScript types. Zero configuration needed beyond wrapping content in panes.
<!-- /decision -->

<!-- decision: Three built-in layout templates — cockpit/focus/minimal -->
Rather than a free-form layout editor, Mercury offers three named templates with different pane counts. Cockpit (3-pane) is the default — full workspace feel. Focus (2-pane) is main + right context for when you want to see related content but not the full nav. Minimal (single column) for the cleanest reading experience. User templates can be created on top of these by saving pane proportions under a custom name.
<!-- /decision -->

<!-- decision: LayoutTemplate type extended to 'string' for user template IDs -->
Built-in templates use literal union type ('cockpit' | 'focus' | 'minimal'). User templates use string IDs like 'user-1706123456789'. Rather than a complex union of string literals + string, LayoutTemplate is typed as `string` with the LAYOUT_TEMPLATES record keyed by string. Built-in IDs are still effectively enumerated by TEMPLATE_LIST.
<!-- /decision -->

<!-- decision: LeftSidebar discovery controls filter sidebar panel only -->
Per earlier user decision: sidebar filter controls (tag input, decade, niche score) feed a local result panel inside the sidebar, not the main content area. The main content area has its own filters on each page. This keeps the sidebar as a "browse mode" viewport — always available, non-intrusive.
<!-- /decision -->

<!-- decision: RightSidebar queue in sidebar eliminates overlay Queue component in cockpit mode -->
In cockpit mode, the queue lives permanently in the right sidebar. This replaces the floating Queue overlay (which required backdrop + fixed positioning). Sidebar queue is always visible when expanded, doesn't block content, and fits the workspace paradigm. The floating Queue.svelte overlay remains for non-cockpit contexts.
<!-- /decision -->

### Task 1 Results

PaneForge installed (6 packages). `src/lib/theme/templates.ts` created:

| Export | Purpose |
|--------|---------|
| `LayoutTemplate` | Type alias (`string`) |
| `TemplateConfig` | Interface: id, label, description, panes, autoSaveId, sizes |
| `LAYOUT_TEMPLATES` | Record with cockpit/focus/minimal configs |
| `DEFAULT_TEMPLATE` | `'cockpit'` |
| `TEMPLATE_LIST` | Array of all built-in TemplateConfig objects |
| `UserTemplateRecord` | Interface: id (timestamp), label, basePanes |
| `expandUserTemplate` | Converts UserTemplateRecord → full TemplateConfig |
| `createUserTemplateRecord` | Creates new UserTemplateRecord from label + basePanes |

`preferences.svelte.ts` extended with `loadUserTemplates` and `saveUserTemplates` — persist user template array as JSON under key `user_layout_templates` in taste.db.

`npm run check`: 0 errors.

### Task 2 Results

Four new Svelte components:

**PanelLayout.svelte** — PaneForge wrapper. Renders 3-pane, 2-pane, or single column based on template config. Left and right panes are collapsible (collapse to 2% width with expand arrow). PaneResizer is 4px wide, hover-highlights on mouse and data-active. Accepts sidebar, context, and children snippets.

**LeftSidebar.svelte** — Navigation + discovery. Quick nav with 8 links (active state from $page). Tag input with chip display (max 5, backspace-to-remove, Enter/comma to add). Decade dropdown (All + 1950s–2020s). Niche score dropdown (All/Mainstream/Eclectic/Niche/Very Niche). 300ms debounced fetch against `/api/search` populates a sidebar result panel (up to 5 artist cards with name + tags).

**RightSidebar.svelte** — Context-aware. Three modes keyed on pagePath:
- `/artist/*`: related tags from artistData + collapsible queue panel
- `/kb/genre/*`: subgenres, related genres, key artists from genreData
- Default: now playing info (if track playing), collapsible queue, top 5 taste tags from tasteProfile

**ControlBar.svelte** — 32px toolbar. Left: search form (200px, submits to /search). Center: reserved. Right: layout switcher `<select>` with `<optgroup label="My Layouts">` for user templates, theme indicator dot (navigates to /settings, color derived from themeState.computedHue).

Auto-fixed one bug during implementation: removed a dead `queueState.setQueue` property reference (queueState has no such property — setQueue is a module-level function, not attached to state).

`npm run check`: 0 errors. `npm run build`: clean.

### Plan 02 Complete

PaneForge installed, all four components compile, real content in all panels. Ready for Plan 03 (wiring into the root layout).

> **Commit 4bff9c9** (2026-02-21 20:22) — docs(08-02): complete panel layout system plan
> Files changed: 4

> **Commit d231804** (2026-02-21 20:25) — feat(08-03): integrate PanelLayout, theme engine, and ControlBar into root layout
> Files changed: 1

> **Commit 5c353ca** (2026-02-21 20:26) — feat(08-03): implement streaming preference reordering in EmbedPlayer and artist page
> Files changed: 2

## 2026-02-21 — Phase 08 Plan 03: Integration — Layout + Embeds Wired

**The integration plan. Phase 8 comes alive.** Plans 01 and 02 built the engine and the panels; Plan 03 wires them into the running application.

### What Changed

**`src/routes/+layout.svelte`** — The root layout now branches on `tauriMode`:

- **Tauri path:** Header (unchanged) → ControlBar (32px toolbar with search + layout switcher + theme dot) → PanelLayout with LeftSidebar + RightSidebar snippets → Footer → Player. The ControlBar sits between the header and the panel area as the workspace control strip.
- **Web path:** Exactly as before. No panels, no ControlBar, no sidebars. Zero regression.

Theme engine integration: `initTheme(tasteProfile.tags, themePrefs)` called in onMount after loading layout + theme prefs. A reactive `$effect` calls `updateThemeFromTaste` whenever `tasteProfile.isLoaded && themeState.mode === 'taste'` — OKLCH colors update live as taste profile populates. Layout template persists via `saveLayoutPreference` on every switch.

**`src/lib/components/EmbedPlayer.svelte`** — Added `orderedPlatforms` derived from `streamingPref.platform`. When a preference is set, the preferred platform jumps to position 0; the rest follow in default `PLATFORM_PRIORITY` order. The embed loop now uses `orderedPlatforms` instead of the static constant.

**`src/routes/artist/[slug]/+page.svelte`** — Added `sortedStreamingLinks` derived. Same sort logic: if `streamingPref.platform` is set, the link whose label includes that platform string sorts to the front. The Listen On bar uses `sortedStreamingLinks`.

### Two Small Issues Fixed

**1. `hasPlayer` undefined in PanelLayout call** — Plan said `{hasPlayer}` shorthand but `hasPlayer` doesn't exist in root layout scope (it was `showPlayer`). Changed to `hasPlayer={showPlayer}`. Caught immediately by `svelte-check` (0 errors after fix).

**2. Misplaced import** — First draft put the `streamingPref` import inside the `<script>` body after variable declarations. Moved to the top-of-file import block before the check caught it.

### Result

`npm run check`: 0 errors. `npm run build`: clean.

Tauri desktop app now launches in cockpit mode with three resizable panes, a ControlBar workspace strip, theme colors from taste profile, and streaming platform ordering throughout.

### Plan 03 Complete

Phase 08 Integration done. All three plans (theme engine, panel layout, wiring) complete. The underground aesthetic is live in the desktop app.

> **Commit 0f55317** (2026-02-21 20:29) — docs(08-03): complete integration plan — layout + embeds wired
> Files changed: 5

> **Commit 382cc83** (2026-02-21 20:34) — feat(08-04): add theme/layout/streaming sections to Settings, shared layout state
> Files changed: 3

## 2026-02-21 — Phase 08 Complete: Underground Aesthetic

Phase 8 is done. Four plans, one goal: Mercury stops being a search engine and starts being a place.

### What Was Built

**Theme Engine** (`src/lib/theme/palette.ts`, `engine.svelte.ts`, `preferences.svelte.ts`) — OKLCH palette generation from taste tags. djb2 hash on alphabetically-sorted top-5 taste tags produces a deterministic hue (0-360). 14 CSS custom properties are overridden at runtime via `document.documentElement.style`. Text colors intentionally excluded — WCAG AA readability is non-negotiable. Three modes: default (static), taste (from profile), manual (hue slider). Preferences persist in taste.db.

**Panel Layout** (`PanelLayout.svelte`, `LeftSidebar.svelte`, `RightSidebar.svelte`, `ControlBar.svelte`, `templates.ts`) — PaneForge provides resizable split panes. Three built-in templates: cockpit (3-pane), focus (2-pane), minimal (1-column). `autoSaveId` per template means panel sizes persist independently in localStorage. User templates are created from Settings, stored as JSON in taste.db, and appear alongside built-ins in the ControlBar dropdown.

**Streaming Preference** — Single `preferred_platform` setting in taste.db. Both `EmbedPlayer` and the artist page Listen On bar sort by preference client-side — server data stays neutral.

**Settings Page** — Three new sections above AI Settings: Appearance (theme mode + hue slider), Layout (template picker + user template CRUD + save-as-template), Streaming Preference (platform dropdown). Shared `layoutState` module ensures the ControlBar and Settings stay in sync without prop drilling.

### Key Decisions

<!-- decision: OKLCH for taste theming -->
OKLCH over HSL: perceptually uniform lightness. Shifting hue by 180 degrees with HSL visually changes brightness — with OKLCH it doesn't. The UI feels identical regardless of which hue your tags land on.
<!-- /decision -->

<!-- decision: djb2 hash on top-5 alphabetical tags -->
Simple, no dependencies, distributes well across 0-360. The alphabetical sort on the top-5 tags ensures determinism: same taste → same colors, always. Different taste → different Mercury.
<!-- /decision -->

<!-- decision: layoutState shared module for cross-page state -->
Both root layout and settings page need to read and write the active template. Rather than duplicate state (which would cause drift), a small `.svelte.ts` module exports a single `$state` object. Both files import from it. No props, no events, no stores — just a shared reactive object.
<!-- /decision -->

<!-- decision: User templates in taste.db, not in localStorage -->
Panel _sizes_ go in localStorage (PaneForge does this automatically via autoSaveId). Template _selection_ goes in taste.db. These are different things: sizes are ephemeral UI preferences, template selection is a named configuration choice. Mixing them would create drift between two sources of truth.
<!-- /decision -->

### The Vibe

> Mercury stops being a search engine and starts being a place. You open the app and it *looks like your taste*. The layout is yours — you arranged those panels. The colors came from your tags. The embeds lead with the platform you actually use.

This is what Phase 8 was for. The data was always there. Now the shell matches the music.

### Phase 08 Numbers

- 4 plans, 8 tasks
- Files created: `palette.ts`, `engine.svelte.ts`, `preferences.svelte.ts`, `templates.ts`, `layout-state.svelte.ts`, `PanelLayout.svelte`, `LeftSidebar.svelte`, `RightSidebar.svelte`, `ControlBar.svelte`
- Files modified: `theme.css`, `+layout.svelte`, `settings/+page.svelte`, `EmbedPlayer.svelte`, `artist/[slug]/+page.svelte`, `ARCHITECTURE.md`, `docs/user-manual.md`
- `npm run check`: 0 errors across all 4 plans
- `npm run build`: clean across all 4 plans

> **Commit f3470e7** (2026-02-21 20:37) — docs(08-04): update ARCHITECTURE.md, user manual, and BUILD-LOG for Phase 8
> Files changed: 3

> **Commit 7e1cc6a** (2026-02-21 20:39) — docs(08-04): complete settings UI plan — Phase 8 complete
> Files changed: 3

> **Commit 3e08161** (2026-02-21 20:44) — docs(phase-08): complete phase execution and verification
> Files changed: 1

> **Commit 91abf1f** (2026-02-21 20:49) — test(08): complete UAT — 23 passed, 0 issues, 3 skipped (Tauri UI)
> Files changed: 1

> **Commit 2cb289c** (2026-02-21 21:19) — docs(09): capture phase context
> Files changed: 1

> **Commit 4b7d57d** (2026-02-21 21:29) — docs(09): research phase community foundation
> Files changed: 1

> **Commit 587b2c0** (2026-02-21 21:40) — docs(09): create phase plan
> Files changed: 7

> **Commit 224f259** (2026-02-21 21:45) — fix(09): revise plans based on checker feedback
> Files changed: 3

> **Commit e0a0a6d** (2026-02-21 21:49) — fix(09): revise plans based on checker feedback
> Files changed: 3

> **Commit 3031d50** (2026-02-21 21:52) — fix(09): revise plans based on checker feedback
> Files changed: 4

> **Commit 0e239ac** (2026-02-22 23:03) — feat(09-01): extend taste.db schema with identity and collections
> Files changed: 2

> **Commit bec760e** (2026-02-22 23:03) — feat(09-01): register new commands in lib.rs invoke_handler
> Files changed: 1

## Entry 033 — 2026-02-22 — Phase 09 Kickoff: Rust Foundation

### Phase 9 Plan 01 — taste.db Identity + Collections Layer

Phase 9 is Community Foundation — user profiles, collections, shareable fingerprints. The Rust layer comes first so every subsequent frontend plan can trust the IPC contract.

**What was built:**

Three new tables in taste.db (initialized on first app launch, `IF NOT EXISTS` safe):
- `user_identity` — key/value store for display name, bio, avatar, pronouns, location, website
- `collections` — named lists (id, name, created_at, updated_at)
- `collection_items` — items in collections (artist/release/tag, with MBID + slug, UNIQUE constraint prevents dupes, cascade delete)

14 new Tauri commands registered:
- Identity: `get_identity_value`, `set_identity_value`, `get_all_identity`
- Collections: `get_collections`, `create_collection`, `delete_collection`, `rename_collection`
- Collection items: `get_collection_items`, `add_collection_item`, `remove_collection_item`, `is_in_collection`, `get_all_collection_items`
- Export: `save_base64_to_file` (PNG fingerprint), `write_json_to_path` (full data export)

Plus `match_artists_batch` as a free function in lib.rs — opens mercury.db directly via rusqlite (no managed state for mercury.db on Rust side, only accessible via tauri-plugin-sql from frontend).

Added `base64 = "0.22"` to Cargo.toml for fingerprint PNG export.

**Result:** `cargo check` exits 0, zero errors, zero warnings. `npm run check` 0 errors. All 14+ commands wired into invoke_handler.

> **Commit 5927f15** (2026-02-22 23:06) — docs(09-01): complete Rust foundation plan — taste.db identity + collections

> Files changed: 4

---

## Entry 034 — 2026-02-22 — Phase 09 Plan 02: DiceBear Avatar System

### What was built

Installed DiceBear packages and tauri-plugin-oauth, then created the full avatar module and two Svelte components.

**Dependencies installed:**
- `@dicebear/core@9.3.2` + `@dicebear/pixel-art@9.3.2` — generative pixel-art avatar from taste seed
- `@fabianlars/tauri-plugin-oauth@2.0.0` (npm) + `tauri-plugin-oauth = "2"` (Cargo.toml) — pre-installed for Spotify PKCE in Plan 03
- Plugin registered in lib.rs builder chain: `.plugin(tauri_plugin_oauth::init())`

**Files created:**

`src/lib/identity/avatar.ts` — the avatar module:
- `tasteTagsToAvatarSeed()` — derives a deterministic seed string from top-5 taste tags (alphabetical sort, same pattern as palette.ts)
- `generateAvatarSvg()` — produces DiceBear pixel-art SVG from a seed string
- `loadAvatarState()` — loads mode + data from taste.db via invoke, falls back to web-safe defaults
- `saveAvatarMode()` — persists mode + pixel data to taste.db via invoke
- `avatarState` — Svelte 5 $state reactive object (mode, svgString, editedPixels, isLoaded)

`src/lib/components/AvatarPreview.svelte` — renders active avatar:
- `generative` mode: `{@html avatarState.svgString}` inside 128x128 div
- `edited` mode: 16x16 CSS grid of colored pixel cells from `avatarState.editedPixels`
- Fallback: "?" placeholder if not loaded

`src/lib/components/AvatarEditor.svelte` — 16x16 pixel art editor:
- Pencil tool, eraser tool, color picker, clear button
- Mouse-drag paint via mousedown + mouseenter events
- Save button calls `saveAvatarMode('edited', pixels)`

**DiceBear v9 API deviation:** The plan specified `import { pixelArt }` but v9 exports `create` (not `pixelArt`). The `Style<O>` interface requires `{ meta, create, schema }`. Fixed with `import * as pixelArt` (namespace import).

**Result:** `cargo check` exits 0. `npm run check` exits 0 (0 errors).

---

## Phase 09 Plan 03 — Collections + Import Modules — 2026-02-22

### What Was Built

Collections reactive state module + 4 import modules + full data export + CollectionShelf display component.

**`src/lib/taste/collections.svelte.ts`** — The curation backbone. `collectionsState` is a `$state` object (requires `.svelte.ts` extension for the rune) with a `collections` array and `isLoaded` flag. Full CRUD: `loadCollections`, `createCollection`, `deleteCollection`, `renameCollection`, `getCollectionItems`, `addToCollection`, `removeFromCollection`, `isInAnyCollection`. All functions wrap Tauri invoke with try/catch — safe to import from web.

**`src/lib/taste/import/`** — Four import modules for bringing existing listening history into Mercury:

- **spotify.ts** — PKCE OAuth via `@fabianlars/tauri-plugin-oauth` (localhost server required, Spotify doesn't accept custom URI schemes). User provides their own Client ID. Returns top 50 artists from medium-term history.
- **lastfm.ts** — Public API (no OAuth), just username + API key. Paginates at 200 tracks/page, capped at 50 pages (10k tracks) to prevent runaway imports. Aggregates play count by artist, returns top 200 sorted.
- **apple.ts** — MusicKit JS loaded on demand (same lazy script pattern as Leaflet in Phase 7). User provides their own Developer Token. Returns saved library artists.
- **csv.ts** — `parseCsvArtists()` accepts any CSV with Artist/Artist Name column. `readFileAsText()` for file input. Zero dependencies — native string processing.

**`src/lib/taste/import/index.ts`** — `exportAllUserData()` collects everything via `Promise.all` (identity + collections + items + taste tags + anchors + favorites + play history) and writes via `invoke('write_json_to_path')`. Web fallback via blob download. Confirmed: uses `write_json_to_path` (Plan 01's general-purpose command), NOT `export_play_history_to_path` (which has a different signature).

**`src/lib/components/CollectionShelf.svelte`** — Item grid with type badge + name + remove button. No follower counts, no like counts, no play counts — per the no-vanity-metrics hard constraint. Route fix: the plan had `'artist'` for both types in the href; corrected to `'release'` for release items.

**Note:** `npm run check` shows 1 pre-existing error in `src/lib/identity/avatar.ts` (from Plan 02 WIP — DiceBear `pixelArt` import name mismatch). This error predates Plan 03. Our new files introduced 0 new errors. Logged to `deferred-items.md`.

> **Commit 553d4b7** — feat(09-03): create collections.svelte.ts reactive state module
> **Commit e77ffc8** — feat(09-03): create import modules, export function, and CollectionShelf component

> **Commit 553d4b7** (2026-02-22 23:08) — feat(09-03): create collections.svelte.ts reactive state module
> Files changed: 1

> **Commit 2a3e4b7** (2026-02-22 23:08) — chore(09-02): install DiceBear and tauri-plugin-oauth dependencies
> Files changed: 5

> **Commit e77ffc8** (2026-02-22 23:11) — feat(09-03): create import modules, export function, and CollectionShelf component
> Files changed: 6

> **Commit 6def0f1** (2026-02-22 23:11) — feat(09-02): create avatar module and AvatarPreview + AvatarEditor components
> Files changed: 3

> **Commit 180d27c** (2026-02-22 23:13) — docs(09-03): complete collections + import modules plan
> Files changed: 5

> **Commit abc4d12** (2026-02-22 23:14) — docs(09-02): complete DiceBear avatar system plan — generative pixel-art avatar with 16x16 editor
> Files changed: 3

> **Commit 6c894a1** (2026-02-22 23:16) — feat(09-04): build TasteFingerprint component with D3 force constellation + PNG export
> Files changed: 1

> **Commit cc48e9d** (2026-02-22 23:17) — feat(09-05): add Save to Shelf buttons on artist and release pages
> Files changed: 2

## Phase 09 Plan 04 — Profile Page + Taste Fingerprint — 2026-02-22

The visual centrepiece of Phase 9. The profile page is where users see themselves the way others might. The Taste Fingerprint is the social object — a unique constellation of their musical taste that can be shared or exported.

### TasteFingerprint Component

Built `src/lib/components/TasteFingerprint.svelte` using the same headless D3 force simulation pattern established in StyleMap.svelte and GenreGraph.svelte:

- Top 15 taste tags become accent-colored nodes (size proportional to weight)
- Top 10 favorite artists become muted circle nodes
- Up to 5 collection-saved artists not in favorites are added as smaller nodes (curation signal — the fingerprint reflects both listening behavior AND deliberate curation choices)
- Nodes initialized in a circle for determinism — same taste data always produces the same constellation
- `simulation.tick(300)` + `simulation.stop()` (no reactive `on('tick')` wiring)
- Edges drawn from each artist node to the 2 spatially nearest tag nodes post-simulation
- PNG export: SVG → canvas (800×800, #0d0d0d background) → base64 → `save_base64_to_file` Tauri command

<!-- decision: Curation signal in fingerprint -->
Collection-saved artists appear in the Taste Fingerprint alongside listening-derived favorites. This makes the fingerprint reflect both passive listening behavior AND deliberate curation choices — two different kinds of taste signal that together tell a more complete story.
<!-- /decision -->

### /profile Page

Created `src/routes/profile/+page.svelte` — Tauri-gated (same pattern as Library and Settings). Three sections:

1. **Identity** — AvatarPreview (96px) + handle input (saves on blur, local-only, no account)
2. **Taste Fingerprint** — Full TasteFingerprint constellation with export button
3. **Shelves** — Expandable CollectionShelf per collection, inline new-shelf creation

No vanity metrics anywhere on the page. No follower counts, like counts, play counts. The profile is identity + taste + curation only.

**Result:** `npm run check` — 0 errors. `npm run build` — exits 0. Both files pass all plan verification criteria.

> **Commit 6c894a1** (2026-02-22 23:16) — feat(09-04): build TasteFingerprint component with D3 force constellation + PNG export
> Files changed: 1

> **Commit 4a6a77a** (2026-02-22 23:18) — feat(09-04): create /profile page route
> Files changed: 1

> **Commit 4e624d6** (2026-02-22 23:20) — feat(09-05): expand Settings page with Identity, Import, and Export sections
> Files changed: 1

> **Commit 1037c45** (2026-02-22 23:20) — docs(09-04): complete profile page + TasteFingerprint plan
> Files changed: 4

## Phase 09 Plan 05 — Collections UI + Settings Expansion — 2026-02-22

Collections only matter when users can actually save things. Plan 05 wires the Save to Shelf buttons onto the artist and release discovery pages — the primary entry points during music discovery. Settings gets the Identity, Import, and Export sections that make the account meaningful.

### Save to Shelf Buttons

Both artist and release pages now have a "Save to Shelf" button in their header areas, visible only in Tauri context. The button:

- Shows "✓ Saved" with accent border if the item is already in any collection (checked on mount via `isInAnyCollection`)
- Opens a dropdown listing all user shelves, with a checkmark on shelves that already contain this item
- Clicking a shelf adds the item immediately via `addToCollection` and closes the dropdown
- Bottom of dropdown: "New shelf..." input — pressing Enter creates the collection and adds the item inline, no navigation required

The artist page button sits in the `artist-name-row` alongside the FavoriteButton and UniquenessScore. The release page button is in the `action-rows` area below BuyOnBar.

**Implementation note:** `collectionsState.collections` cannot be directly referenced in Svelte template from a dynamic import — solved by adding a `shelfCollections` local `$state` mirror, assigned after load and updated after inline creation.

### Settings: Identity

New section before AiSettings. Handle field saves on blur via `set_identity_value`. Avatar mode toggle (Generative / Custom) calls `saveAvatarMode()`. Link to /profile. Both values loaded from `taste.db` on mount.

### Settings: Import Listening History

Four platform cards:

- **Spotify**: Client ID text field, starts PKCE OAuth flow via `importFromSpotify()`, progress status line
- **Last.fm**: Username + API key, paginated scrobble fetch via `importFromLastFm()` with per-page status updates
- **Apple Music**: Developer Token field (Advanced badge), `importFromAppleMusic()` loads MusicKit JS on demand
- **CSV**: File picker, `parseCsvArtists()` extracts Artist column, same `matchAndImport()` flow

All credentials are session-only `$state` — no `set_identity_value` calls for OAuth tokens or API keys. A shared `matchAndImport()` helper calls `match_artists_batch` Rust command, creates "Imported from [Platform]" collection, adds all matched artists, returns "Matched N / M artists" summary.

### Settings: Your Data

Single "Export All Data" button calls `exportAllUserData()` from `$lib/taste/import/index.ts` — full JSON dump of identity, shelves, items, taste profile, and play history.

**Result:** `npm run check` — 0 errors. `npm run build` — exits 0.
