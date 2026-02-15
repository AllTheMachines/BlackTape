# Roadmap: Mercury

## Overview
Build a music discovery engine from the ground up. Data pipeline first (foundation), then search + embeds (the "holy shit" moment), then desktop distribution (unkillable), then discovery mechanics, social layer, and curator tools. Phase 0 (patronage) runs in parallel with everything.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked INSERTED)

- [x] **Phase 1: Data Pipeline** - MusicBrainz dumps into searchable SQLite + FTS5
- [ ] **Phase 2: Search + Artist Pages + Embeds** - The core web experience
- [ ] **Phase 3: Desktop App + Distribution** - Tauri app with local SQLite, torrent distribution
- [ ] **Phase 4: Tag-Based Discovery** - Democratic uniqueness mechanic
- [ ] **Phase 5: Social Layer** - Opt-in profiles, taste as identity
- [ ] **Phase 6: Blog / Curator Tools** - Embeddable widgets, attribution, blog revival

## Phase Details

### Phase 1: Data Pipeline [COMPLETE]
**Goal**: Download MusicBrainz dumps, process into searchable SQLite database
**Depends on**: Nothing
**Requirements**: DATA-01
**Success Criteria**:
  1. Pipeline downloads and extracts MusicBrainz dumps
  2. SQLite database with FTS5 contains 2.8M artists with tags
  3. Instant search across all artists
**Plans**: Completed

### Phase 2: Search + Artist Pages + Embeds
**Goal**: The core web experience — search, find, listen
**Depends on**: Phase 1
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, EMBED-01
**Success Criteria**:
  1. User can type an artist name or tag and get instant results
  2. Artist pages show tags, country, and embedded players
  3. Bandcamp/Spotify/SoundCloud/YouTube embeds render inline
  4. Deployed to Cloudflare Pages, mobile responsive
  5. Someone can visit, search, discover an unknown artist, and press play
**Plans**: 5 plans
Plans:
- [x] 02-01-PLAN.md — Cloudflare D1 infrastructure, database queries, slug system
- [x] 02-02-PLAN.md — Dark theme, global layout, landing page with search bar
- [x] 02-03-PLAN.md — Search results page with card grid
- [ ] 02-04-PLAN.md — Artist pages with embeds, bio, external links
- [ ] 02-05-PLAN.md — End-to-end visual verification

### Phase 3: Desktop App + Distribution
**Goal**: Unkillable local version with distributed database
**Depends on**: Phase 2
**Requirements**: DESKTOP-01, DESKTOP-02, DIST-01
**Success Criteria**:
  1. Tauri app runs same UI, reads local SQLite
  2. Database downloadable (~30-50MB compressed)
  3. Offline search works without internet
  4. If the website disappears, the desktop app still works
**Plans**: TBD

### Phase 4: Tag-Based Discovery
**Goal**: Democratic uniqueness mechanic — where search engine becomes discovery engine
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03
**Success Criteria**:
  1. Users can browse and intersect tags
  2. Artists with unique tag combinations are more discoverable
  3. Style map visualization shows tag relationships
  4. "Uniqueness score" visible on artist profiles
**Plans**: TBD

### Phase 5: Social Layer
**Goal**: Taste as identity — opt-in profiles, everyone equal
**Depends on**: Phase 2
**Requirements**: SOCIAL-01, SOCIAL-02
**Success Criteria**:
  1. Opt-in user profiles (anonymous browsing by default)
  2. Collections: save artists/releases to profile
  3. Shareable profile URLs ("your taste at a glance")
  4. No algorithmic sorting — chronological, equal
**Plans**: TBD

### Phase 6: Blog / Curator Tools
**Goal**: Bring music blogs back to life
**Depends on**: Phase 4, Phase 5
**Requirements**: BLOG-01, BLOG-02
**Success Criteria**:
  1. Embeddable widgets (artist cards, search results, curated lists)
  2. Attribution: "discovered via [curator]" links
  3. RSS feeds for new additions, tag subscriptions
  4. A music blogger has reason to write again
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Data Pipeline | done | Complete | 2026-02-14 |
| 2. Search + Embeds | 3/5 | In progress | - |
| 3. Desktop + Distribution | 0/TBD | Not started | - |
| 4. Tag Discovery | 0/TBD | Not started | - |
| 5. Social Layer | 0/TBD | Not started | - |
| 6. Blog / Curator Tools | 0/TBD | Not started | - |

## Parallel Track: Phase 0 (Patronage + Grants)

Runs alongside everything else. Not blocking any phase.
- [ ] GitHub Sponsors profile
- [ ] Ko-fi or Patreon page
- [ ] Open finances page
- [ ] NLnet Foundation grant application
- [ ] Build log / dev updates as public content
