# Mercury — Roadmap

> Phase 0 runs in parallel with everything else. Phases 1-3 are the foundation.

## Phase 0: Patronage + Grants (parallel)

Set up revenue channels while building. The build journey IS the content.

- [ ] GitHub Sponsors profile
- [ ] Ko-fi or Patreon page
- [ ] Open finances page (even before the product exists)
- [ ] NLnet Foundation grant application
- [ ] Research other applicable grants (Mozilla, EU NGI, Sovereign Tech Fund)
- [ ] Build log / dev updates as public content

## Phase 1: Data Pipeline

Download MusicBrainz data dumps and process them into a searchable SQLite database. This is the foundation everything else needs.

- [ ] Download MusicBrainz data dumps (JSON or PostgreSQL format)
- [ ] Parse and normalize artist data (name, tags, external links, releases)
- [ ] Build SQLite database with FTS5 full-text search index
- [ ] Verify: can we search 2.6M artists instantly?
- [ ] Document the pipeline so it can re-run when new dumps are published
- [ ] Measure database file size (target: small enough to distribute)

**Done when:** You can type an artist name or tag and get instant results from 2.6 million artists.

## Phase 2: Search + Artist Pages + Embeds (Web)

The core experience. Search, find, listen.

- [ ] Search bar with instant results (FTS5 queries)
- [ ] Search results page (artists, releases, tags)
- [ ] Artist profile page (name, tags, bio, releases, external links)
- [ ] Embed detection: Bandcamp, Spotify, SoundCloud, YouTube, Apple Music
- [ ] Render embedded players inline on artist pages
- [ ] Tag display and tag-click navigation
- [ ] Deploy to Cloudflare Pages
- [ ] Mobile responsive

**Done when:** Someone can visit the site, search for music, find an artist they've never heard of, and press play. The "holy shit" moment.

## Phase 3: Desktop App + Distribution

Wrap the same experience in a local app. Distribute the database.

- [ ] Tauri 2.0 project setup
- [ ] Same SvelteKit UI, reads local SQLite file
- [ ] Database download mechanism (direct download first)
- [ ] Torrent distribution of the database file
- [ ] Auto-update: periodic diff downloads for new data
- [ ] Offline search (works without internet)

**Done when:** Someone downloads the app, gets the database, and can search 2.6M artists offline. If the website disappears tomorrow, this still works.

## Phase 4: Tag-Based Discovery

The democratic uniqueness mechanic. Where this stops being a search engine and becomes a discovery engine.

- [ ] Tag browsing interface (explore by tag)
- [ ] Tag intersection search ("dark ambient" AND "field recordings")
- [ ] Tag cloud / genre map visualization
- [ ] "Uniqueness score" — how specific/rare an artist's tag combination is
- [ ] Discovery paths: "Artists like X but more niche"
- [ ] Surface artists with unique tag combinations

**Done when:** An artist who carved a unique niche is MORE discoverable than a generic one. The system visibly rewards uniqueness.

## Phase 5: Social Layer

Taste as identity. Opt-in profiles. Everyone's equal.

- [ ] User accounts (opt-in, browse anonymously by default)
- [ ] Collections: save artists/releases to your profile
- [ ] Shareable profile URLs ("your taste at a glance")
- [ ] Follow other people's collections
- [ ] Activity feed: what are tastemakers finding?
- [ ] No algorithmic sorting — chronological, equal

**Done when:** You can send someone your Mercury profile and they instantly understand your music taste. Like showing off your record collection.

## Phase 6: Blog / Curator Tools

Bring music blogs back to life.

- [ ] Embeddable widgets (artist cards, search results, curated lists)
- [ ] Attribution: "discovered via [curator]" links
- [ ] RSS feeds for new additions, tag subscriptions
- [ ] Curator profiles with follower counts
- [ ] Blog post detection: when someone writes about an artist, link to it

**Done when:** A music blogger has a reason to write again because Mercury gives them tools and an audience.

---

## Principles

- No phase introduces paid tiers or advantages. Everyone gets the same thing, always.
- Each phase should be shippable on its own. Don't build Phase 2 features during Phase 1.
- The data pipeline (Phase 1) is the foundation. If it doesn't work, nothing else matters.
- Web and desktop share the same UI code. Don't diverge.
