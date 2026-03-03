# Discovery Views Redesign — Research & Ideas

**Issue:** #88 — Redesign graph-based discovery views (Style Map, Knowledge Base, Time Machine, Crate Dig)

---

## Current State

Four separate views all using d3-force graphs on SVG:

- **Style Map** — top 50 tags as nodes, co-occurrence edges, click to find artists at tag intersections
- **Knowledge Base** — genre taxonomy (genre/scene/city nodes), subgenre + influence edges, expandable
- **Time Machine** — same genre graph filtered by year, plus artist timeline
- **Crate Dig** — no graph, just random filtered artist cards

They share the same d3-force patterns but feel disconnected. Each is its own dead-end page.

### Components
| Component | Used by | Nodes | Edges | Interactive |
|-----------|---------|-------|-------|-------------|
| `StyleMap.svelte` (512 lines) | /style-map | Tags (string ID) | Co-occurrence counts | Yes (select, pan/zoom) |
| `GenreGraph.svelte` (459 lines) | /kb, /kb/genre/[slug] | Genres (numeric ID) | subgenre vs influenced_by | Yes (click, pan/zoom, expand) |
| `GenreGraphEvolution.svelte` (224 lines) | /time-machine | Genres (filtered by year) | Type-classified | No (view-only) |
| `SceneMap.svelte` (46 lines) | /kb/genre/[slug] | Geographic points | None | Pan/zoom (Leaflet) |

### Cross-links between views
- Style Map → Discover (multi-tag filter)
- Crate Dig → Style Map (artist's primary genre)
- KB → Discover (genre exploration)
- KB → Style Map (genre in full map)
- Time Machine → Discover (decade exploration)

---

## Genre/Tag Coverage Gap

| What | BlackTape has | MusicBrainz has | Gap |
|------|-------------|-----------------|-----|
| Artist tags (user-voted) | ~2,200 unique | 10,000+ | ~8,000 tags missing |
| Official genres (curated) | 0 (not imported) | ~1,900 | Entire list missing |
| Genre encyclopedia (Wikidata) | ~1,000-2,000 | N/A | Different source |

Pipeline (`pipeline/import.js`) only imports artist tags with positive vote counts. Never touches MusicBrainz's official curated genre list. KB genres come from Wikidata, not MB.

**Tag co-occurrence:** 2,359 edges from filtering (count >= 2 on both tags, shared_artists >= 5, limit 10K).

**Uniqueness scoring:** `AVG(1 / artist_count_per_tag) * 1000` — niche artists score higher.

---

## Existing Exemplars & Inspiration

### Every Noise at Once (RIP)
6,000+ genres as positioned text on a scatter plot. Click = instant audio. Zero friction. People spent hours because the cost of exploring was one click. The niche it served is now **empty** (frozen since late 2023).

### Radio Garden
3D globe, green dots = radio stations. Spin, tap, hear. No onboarding needed — spinning a globe is innate. The spatial metaphor does all the teaching. Proves that simplicity + immersion > algorithmic recommendations.

### Radiooooo
Pick country + decade + mood (slow/fast/weird). Three dimensions, dead simple. Hand-drawn map adds warmth. The "taxi" function carries you across countries and decades. Two-axis navigation (space × time) + mood filter = minimal cognitive load.

### Musicmap (musicmap.info)
Genres as a zoomable cityscape. Zoom into a super-genre "building" to find subgenre streets. Created by a Belgian architect who treated genre relationships like urban planning. Fast Company: "This Interactive Map Of Music Genres Will Take Up The Rest Of Your Day."

### Ishkur's Guide to Electronic Music
166 genres, 11,321 tracks, ~160K words. Flowchart/timeline hybrid with opinionated, humorous commentary. The **voice** makes you click the next genre just to read what he says. Content is the hook, not the interface.

### Outer Wilds (game)
The only progression is knowledge. No upgrades, no items. The "Ship Log" has two modes: Map Mode (discoveries by location) and Rumor Mode (discoveries by connections). Color-coded by mystery threads. Each player's map is unique to their path. Designer: "players would be most motivated when the narrative felt personal."

### Trackstack
Vertical swipe to emulate flipping through records in a physical crate. Translates tactile satisfaction of record-store browsing into digital. Addresses the core tension: streaming killed the browsing ritual.

### MusicScape
Spotify data → generated landscape. Mountains = song count, jaggedness = energy, sky color = emotional positivity. Translates abstract data into emotionally readable landscape.

---

## Key Research Findings

### Semantic Zoom (Microsoft, Figma, Google Maps)
Objects change what they show at different zoom levels. Genre node zoomed out = colored dot. Zoom in = name appears. More = subgenre branches. More = individual artists. Full zoom = album covers, embedded players. This is the key technique for making a music universe navigable.

### Fog of War (CHI 2023 — MapUncover study)
Tested applying fog-of-war to real-world map exploration. Key findings:
- The fog itself was the **primary incentive** — participants saw uncovering the map as direct progress feedback
- Users voluntarily took detours to fill gaps
- Leaderboard was the most successful complementary element
- Impacted behavior of the majority of participants

### Wikipedia Rabbit Holes (UPenn, 480K users)
Three browsing styles: Busybody (wide jumps), Hunter (methodical), Dancer (fluid associative movement). The mechanism: **high information scent + low interaction cost + dopamine from learning** = rabbit hole. Every page must contain multiple departure points.

### Variable Ratio Reinforcement
Unpredictable rewards trigger dopamine during **anticipation**, not just receipt. Anticipation can be more powerful than the reward itself. This is how record stores work — you never know what's in the next crate.

### Information Foraging Theory (PARC)
Users follow "information scent" — signals predicting value of following a path. Strong scent = click. Weak scent = leave. Genre descriptions should be evocative, not taxonomic: "the sound of 3AM in a Tokyo convenience store" > "Japanese ambient electronic."

---

## Design Concepts

### 1. Unify into "The Map" — One Infinite Canvas
Kill four separate pages. Semantic zoom (Google Maps model):
- **Zoomed way out**: colored nebulae/clusters for super-genres
- **Zoom in**: subgenre nodes appear, connections visible
- **Zoom more**: individual artists appear as stars, brightness = niche factor
- **Full zoom**: artist card with embedded player, links, albums

### 2. Fog of War
Start the map mostly dark. Listening to artists or exploring genres reveals that area + immediate neighbors. Your map = your unique musical fingerprint. Empty dark patches = invitations, not voids.

### 3. Time as a Slider Overlay
Instead of a separate Time Machine page, add a year slider to The Map. Slide to 1977 — only genres/artists that existed by then are visible. The map literally grows forward through time.

### 4. "Wander" Mode (StumbleUpon for Music)
One button. Picks a random unexplored spot, flies you there, plays something. React (dig it / skip), get the next one. Replaces Crate Dig. Builds your map as you go.

### 5. Constellation Metaphor
Dark background, points of light, clusters as constellations. Brightness = niche factor (more unique = brighter). Night sky implies vastness. Rewards attention. Looks nothing like any other music app.

### 6. Instant Audio on Everything
Every node, every dot, every genre — hover or click = hear something within 200ms. This is the single most important feature for sustaining flow state.

### 7. Discovery Log (Outer Wilds Style)
Personal growing graph of what you've discovered. Shows connections between finds. Color-coded by discovery thread. Unique to your exploration path. The rabbit hole visualized.

---

## The Flow State Checklist

What makes someone spend 2 hours without realizing:

1. **Near-zero interaction cost** — every next step is one click/hover
2. **Variable micro-rewards** — you never know exactly what you'll find
3. **Visible horizons** — fogged/dim areas you haven't explored yet
4. **No dead ends** — every point connects to 5+ directions
5. **Personal narrative** — it's YOUR map, YOUR path, YOUR discoveries
6. **Spatial memory anchoring** — map-based > list-based for deep engagement
7. **Challenge-skill balance** — newcomers feel capable, experts feel rewarded

---

## Anti-Dashboard Principles

The interface should feel like a **place**, not a tool:
- Radio Garden feels like spinning a globe, not querying a database
- Radiooooo feels like time travel, not browsing a catalog
- Musicmap feels like exploring a city, not reading a taxonomy
- Record stores feel like treasure hunting, not shopping

Successful exploration interfaces use spatial metaphors that activate the brain's **navigation systems** rather than its **task-completion systems**. Dashboard = task mode. Discovery = place mode.

---

## Direction Decision (2026-03-03 conversation)

The research above explored spatial/visual metaphors (constellation maps, fog of war, semantic zoom). After discussion, the decision is: **kill the fancy graph stuff, make it practical, make everything clickable.**

The d3-force graphs look cool but aren't usable. Lists are more accessible. The rabbit hole metaphor beats the map metaphor for this product.

### What replaces the four views

Style Map, Knowledge Base, Time Machine, Crate Dig all go away (code stays as fallback). Replaced by:

**The Rabbit Hole** — one unified discovery flow with three entry points:
1. **Search** — type an artist, genre, or album name
2. **Continue** — pick up where you left off (history trail)
3. **Random** — throw me somewhere I've never been

All three land you in the same click-through exploration loop.

**World Map** — separate tab/mode. Geographic discovery via a Leaflet map. Click cities to see scenes, genres, artists. Always has a way to jump into the Rabbit Hole from any point.

Both modes are always cross-linked — you can switch between them at any time.

### The Rabbit Hole — core loop

When you land on an artist page in the Rabbit Hole:
- Artist name, tags/genres (all clickable), short description
- Navigation directions: similar artists, similar genres, neighboring artists, neighboring genres
- Below: paginated list of tracks from similar artists (track names only — click to reveal playback sources)
- Click anything → new page, completely fresh results, new directions out
- Back button works like browser history — your exploration trail

When you land on a genre page:
- Genre name, description, sub-genres, neighboring genres (all clickable)
- Artists in this genre (paginated)
- Same pattern — everything is a new launchpad

**Every page is a departure point.** No dead ends.

### First-time onboarding

New user with no data: pick a favorite artist, album, or genre. That's your starting node. From there, radiate outward. Can also choose "just show me random stuff."

### Context sidebar (#3)

The dead space between the nav sidebar and content area becomes a context panel:
- Current genre info, neighboring genres, sub-genres
- Short descriptions (not paragraphs — space-dependent)
- All clickable into the Rabbit Hole
- For newly discovered artists: quick overview, links to YouTube, link to full artist page

### AI chat companion (#6)

Persistent panel (only visible if AI is connected — local model installed or API key set):
- Knows your current page context
- Ask "what's this genre about" or "find me something heavier"
- Responds with clickable links into the same discovery flow
- Not a separate page — lives alongside everything else

### Decade filtering (#5)

No year text input. Row of decade buttons (60s, 70s, 80s, 90s, 00s, 10s, 20s). Click to expand into individual years. Only shows decades/years that have data on the current page. Context-dependent everywhere.

### Music always present

Every page with artists or genres should have music. Track names shown immediately (lightweight data). Click a track to reveal where it can be played (Bandcamp, Spotify, YouTube embeds).

**Loading strategy:** Cache after first fetch. First visit to an artist is slow (live MB fetch) with a loading spinner. Every visit after is instant from cache. Lazy loading as you scroll is also worth prototyping — show names/tags immediately (all local), music trickles in as it loads.

### History trail ("Continue")

Browser-style back/forward through your exploration path. Not bookmarks — a literal trail of everywhere you went. Pick up where you left off next session.

---

## Data Reality (2026-03-03 audit)

What the discovery DB actually has to build on:

### Strong
| Data | Count | Notes |
|------|-------|-------|
| Artists | 2.6M | MusicBrainz, with name/slug/country/begin_year |
| Artist-tag associations | 26M+ | Community-curated, vote-weighted |
| Unique tags | 100K+ | From MB derived tables |
| Tag co-occurrence pairs | 10K | Computed (shared_artists >= 5) |
| Genres | 4,086 | Wikidata (2,992) + MB backfill (1,099) |
| Genre relationships | ~2,900 | subgenre, influenced_by, scene_of |
| Genre locations | Yes | City lat/lng from Wikidata + Nominatim |
| Uniqueness scores | Yes | Precomputed per artist, niche = higher |

### Missing / Needs work
| Data | Status | Path forward |
|------|--------|-------------|
| Similar artists | Not indexed | Build from tag overlap — artists sharing rare tags ranked by co-occurrence weight. Better for discovery than MB's factual relationships (band members, producers) |
| Artist city-level location | Only country codes | Wikidata SPARQL for artist hometown/origin via MBID. Same pattern as genre geocoding. Won't cover all 2.6M but covers well-known artists |
| Tracks / releases | Not indexed, fetched live | MB API, 1 req/sec rate limit. Cache after first fetch |
| Artist descriptions | Not indexed, fetched live | Wikipedia/Wikidata, cacheable |

### Key insight

Tag-based similarity is actually better for discovery than explicit "similar artists" data. Two artists sharing "shoegaze; dreampop; lo-fi" tells you about sonic similarity. MB relationships are mostly factual (band members, collaborators, labels) — useful context but not taste-based.

---

## Pipeline work needed for the redesign

1. **Precompute similar artists table** — for each artist, find top N artists with highest tag overlap (weighted by tag rarity). Store in DB. This is the backbone of the Rabbit Hole.
2. **Artist city geocoding** — Wikidata SPARQL query for artist origin cities. Add `origin_city`, `origin_lat`, `origin_lng` columns to artists table. Enables World Map.
3. **Track/release caching layer** — first fetch from MB is slow, cache in local DB for instant subsequent access.

---

## Open questions

- How many "similar artists" per artist is enough? 10? 20? 50?
- Should the similar artists computation run in the pipeline (precomputed, static) or at query time (dynamic, slower)?
- World Map: scene pins vs artist pins vs both? (Depends on geocoding coverage)
- How does the personal library connect to the Rabbit Hole? Same clickable approach for browsing your own collection?
- What does the Rabbit Hole look like on first load with zero history and zero library? Just the three entry points?

---

## Technical Notes

Current stack: d3-force v3.0.0, SVG rendering, Leaflet for geographic maps, Svelte 5 runes for state. All graph components use async chunked simulation (30-tick RAF chunks).

The graph rendering stack (d3-force, SVG) is no longer needed for the redesign. Leaflet stays for World Map. The Rabbit Hole is standard Svelte pages with list rendering — no special visualization library needed.

Code for the old views (StyleMap, GenreGraph, GenreGraphEvolution, SceneMap) stays in the codebase as fallback.
