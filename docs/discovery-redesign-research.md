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

## Technical Notes

Current stack: d3-force v3.0.0, SVG rendering, Leaflet for geographic maps, Svelte 5 runes for state. All graph components use async chunked simulation (30-tick RAF chunks).

For unified map, consider:
- Canvas/WebGL rendering for thousands of nodes (SVG won't scale)
- Spatial indexing for semantic zoom (quadtree or R-tree)
- Pre-computed layouts stored in DB (avoid runtime force simulation for large graphs)
- Tile-based loading (only render visible region at current zoom)
