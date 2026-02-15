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

**Decision: Use codename "Mercury" and move forward.**

Technical setup: name stored as single variable, change once → propagates everywhere. The codename is deliberately temporary.

Naming candidates file will be maintained separately — drop ideas in as they surface, no pressure.

---

## Entry 002 — 2026-02-14 — Project Setup

Starting the actual build. Creating the repo, writing PROJECT.md, defining the tech stack.

### Tech Stack Decision

The big question from Steve: "Does that need a database? Where will this be hosted? Hosting costs money. Isn't the internet itself a database?"

This reframed everything. The data already exists openly (MusicBrainz CC0, Discogs dumps). The audio lives on artist infrastructure. Mercury doesn't own any content. The only thing that needs hosting is a **search index** — a pre-processed, optimized snapshot of data that already exists on the internet.

**The $0 stack:**
| Layer | Tech | Cost |
|-------|------|------|
| Frontend | SvelteKit | Free (Cloudflare Pages) |
| Search index | SQLite + FTS5 via Cloudflare D1 | Free (5M reads/day) |
| API | SvelteKit server routes (Workers) | Free |
| Data pipeline | Node.js scripts (runs locally) | Free |

Why SvelteKit over Next.js: compiles away the framework (less JS shipped), independent project (not Meta), first-class Cloudflare adapter, cleaner code for open source contributions.

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

> "I don't want anyone to have advantages over the other. It's the music and not about having money that can push you more up or make you look better. I don't want any businesses to build on top of it."

**Final decision: Pure public good.** Patronage, grants, transparency. That's it. No premium features, no pro tiers, no paid advantages, no API-for-profit. Everyone gets the same thing. The Wikipedia/MusicBrainz model. The music is the only differentiator.

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

Key decision: Desktop was originally Phase 5. Steve moved it to Phase 3 — the unkillable local version is too important to delay. This means web and desktop both exist by Phase 3.

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

Steve (reiterating from day one): "like i said previously. isnt the internet the database already?"

Mercury doesn't store releases, URLs, bios, or discographies. That data lives on the internet (Bandcamp, Spotify, YouTube, etc.) and is fetched live when someone clicks an artist. The database is a slim discovery index — just what you need to search and browse.

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

Fixed chokidar file watcher on Windows — added `usePolling: true` for Windows.

### Download Status

First run of `npm run download` started. mbdump.tar.bz2 (6.5 GB) downloading, mbdump-derived.tar.bz2 (500 MB) next. Import runs after download completes.
