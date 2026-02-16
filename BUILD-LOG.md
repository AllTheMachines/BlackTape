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

<!-- status -->
All done — artist page redesign + live streaming infrastructure complete. Ready for visual review.
<!-- /status -->

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

<!-- status -->
Roadmap rewrite complete. 12 phases, 56 requirements, all decisions from Entry 014 reflected. Ready for next action.
<!-- /status -->
