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
