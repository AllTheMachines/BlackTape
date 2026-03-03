# Feature Landscape: Discovery Redesign (v1.7 — The Rabbit Hole)

**Domain:** Click-through music exploration, geographic discovery, contextual sidebars, AI-assisted exploration, temporal filtering
**Researched:** 2026-03-03
**Confidence:** HIGH for UX patterns and flow mechanics, MEDIUM for geographic discovery scope (depends on geocoding coverage), HIGH for sidebar/AI companion patterns

---

## Context

BlackTape v1.6 shipped multi-source streaming (Spotify Connect, YouTube/SoundCloud/Bandcamp embeds, source switcher, queue management). The app has 2.8M artists with tags, 4,086 genres with relationships, and uniqueness scoring. Four discovery views exist (Style Map, Knowledge Base, Time Machine, Crate Dig) but all use d3-force graph visualizations that look impressive and are useless for actual discovery. They are disconnected dead-end pages.

v1.7 replaces all four with two unified surfaces: **The Rabbit Hole** (click-through exploration) and **World Map** (geographic discovery), plus supporting features: context sidebar, AI companion, decade filtering, and pipeline work (similar artists, geocoding, caching).

The design decision is already made: kill fancy graphs, make everything clickable, make lists not force-directed nodes. This research is about what those features need on day one, what can wait, and what would ruin them.

---

## Feature Area 1: The Rabbit Hole (Click-Through Exploration)

### What Makes Rabbit Holes Addictive (Research Findings)

University of Pennsylvania research on 480,000 Wikipedia users identified three curiosity styles that drive rabbit hole behavior:

1. **Busybody** -- wide jumps across unrelated topics (serendipity-driven)
2. **Hunter** -- methodical deepening within a topic (expertise-driven)
3. **Dancer** -- fluid associative movement between related topics (flow-driven)

All three styles require the same infrastructure: **every page must contain multiple departure points**. The mechanism is high information scent (evocative descriptions, not taxonomic labels) + low interaction cost (one click per step) + dopamine from learning (each page teaches something new). Variable ratio reinforcement -- unpredictable rewards trigger dopamine during anticipation, not just receipt -- is why record stores work and why "just one more click" sustains for hours.

Information Foraging Theory (Xerox PARC) explains why some links get clicked and others don't: users follow "information scent" -- signals that predict value of following a path. "Japanese ambient electronic" has weak scent. "The sound of 3AM in a Tokyo convenience store" has strong scent. Genre descriptions must be evocative, not encyclopedic.

Every Noise at Once proved that near-zero interaction cost is the single most important factor. Click a genre name, hear a sample instantly. The 6,291 genres were navigable because each click cost nothing. Now frozen (Glenn McDonald laid off from Spotify, December 2023), the niche it served is empty.

### Table Stakes

Features the Rabbit Hole must have on day one. Missing any of these and it feels broken.

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Click any tag/genre to see artists with that tag | This is the fundamental unit of exploration -- tags are departure points | LOW | Existing tag-click navigation (already built in v1.4) |
| Click any artist name to see their page with tags and related content | Artist pages are the other fundamental unit | LOW | Existing artist page (already built) |
| Similar artists list on every artist page | "If I like this, show me more" is the core rabbit hole mechanic | HIGH (pipeline) | **Precomputed similar_artists table from tag overlap** -- this is the backbone |
| Back/forward navigation through exploration trail | Browser-style history is how users don't get lost | LOW | SvelteKit client-side routing already provides this |
| "Random" entry point (land somewhere unexpected) | Serendipity for users with no starting point; the Busybody path | LOW | Random artist query (already exists in Crate Dig logic) |
| "Search" entry point (type an artist/genre/tag) | Directed entry for users who know what they want; the Hunter path | DONE | Existing FTS5 search with autocomplete |
| "Continue" entry point (resume from history) | Session persistence; the "I was here yesterday" path | MEDIUM | Store exploration trail in localStorage or taste.db |
| No dead ends -- every page has 5+ departure links | Dead ends break flow state. Every page must radiate outward. | MEDIUM | Requires sufficient similar artist / genre relationship data |
| Genre pages with artist lists and neighboring genres | Genre is the other axis of exploration (alongside artist) | LOW-MEDIUM | Existing genre data (4,086 genres, 2,900 relationships) |
| Page loads feel instant (<200ms perceived) | Flow state breaks if you wait. Wikipedia rabbit holes work because pages load instantly. | MEDIUM | Local SQLite queries are fast; live MB API fetches for tracks are slow. Separate concerns: show local data immediately, load remote data progressively. |

### Differentiators

Features that elevate the Rabbit Hole from functional to compelling.

| Feature | Value Proposition | Complexity | When to Add |
|---------|-------------------|------------|-------------|
| Music on every page | Track names visible immediately, click to reveal playback sources. Hearing music within seconds of arriving changes the experience from "browsing a database" to "exploring music." | MEDIUM | Day one if possible, otherwise fast-follow. Depends on track/release caching. |
| Evocative genre descriptions (not encyclopedic) | Information scent. "Berlin minimal techno of the late 2000s" vs "A subgenre of techno." Strong scent drives clicks. | MEDIUM (content) | Day one for genres with existing descriptions; ongoing enrichment |
| Tag rarity indicator on departure links | "21 artists share this tag" vs "14,000 artists share this tag" -- signals how niche the next step is. Rewards the Busybody who wants obscurity. | LOW | Day one |
| History trail visualization ("Continue" mode) | Show the literal path: Artist A -> Genre B -> Artist C -> Tag D. Users see their exploration as a narrative, not a list. Inspired by Outer Wilds Ship Log. | MEDIUM | v1.7.x -- nice to have, not table stakes |
| "Wander" mode (StumbleUpon for music) | One-button random exploration with auto-advance. Each stop plays something, shows departure options, and auto-moves after 30-60s if no interaction. | MEDIUM | v1.7.x -- requires music-on-every-page first |
| Fog of war on personal discovery scope | Track which genres/tags/artists a user has visited. Unvisited areas are dimmer. Creates a personal "how much have I explored?" metric without gamification. | MEDIUM | v1.8+ -- requires taste.db tracking infrastructure |
| Cross-links to World Map | "This artist is from Berlin -- see Berlin on the map" inline link | LOW | Day one (if World Map ships simultaneously) |

### Anti-Features

Features to explicitly NOT build for the Rabbit Hole.

| Anti-Feature | Why Tempting | Why It Would Ruin It | What to Do Instead |
|--------------|-------------|----------------------|-------------------|
| Algorithmic "recommended for you" ranking | Spotify does it, users expect it | BlackTape's value is that uniqueness is rewarded, not popularity. Algorithmic ranking kills niche discovery by definition -- it optimizes for engagement, not exploration. | Rank by tag rarity / uniqueness score. Niche artists appear first, not popular ones. |
| Infinite scroll of artists | Seems like it sustains browsing | Scroll fatigue is real. Infinite scroll removes landmarks and makes users lose their place. IxDF research: "infinite scroll's seemingly endless stream often creates usability problems." It works for social feeds; it fails for exploration where the user needs to make choices. | Paginated lists (12-20 per page) with clear "load more" or page numbers. Each page is a decision point, not a stream. |
| Play count / popularity indicators | "2.3M plays" -- standard in streaming apps | Popularity metrics bias discovery toward already-popular artists. This directly contradicts "uniqueness is rewarded." Showing play counts makes users skip niche artists. | Show uniqueness score instead: "Niche: 94/100" signals rarity, not popularity |
| Follow / like / bookmark on exploration pages | Social proof, engagement metrics | These are retention mechanics, not discovery mechanics. Adding social actions to the rabbit hole turns it from "exploring" into "curating" -- different brain mode entirely. | The Rabbit Hole is for exploring. Collections/shelves (already built) are for saving. Keep them separate. |
| Autoplay audio on page navigation | Every Noise did it, seems essential | Autoplay is hostile in a desktop app where the user may have other audio playing. ENAO was a web page with a specific context. In a persistent desktop app, autoplay interrupts. | Show prominent "Play" affordance on each page. Let the user control when audio starts. |
| Collaborative filtering ("users who liked X also liked Y") | Standard recommendation technique | Requires server infrastructure and user behavior aggregation. $0 infrastructure constraint. Also: collaborative filtering amplifies popularity bias. | Tag-based similarity is computable locally and actually better for niche discovery because rare tag overlap is a stronger signal than user co-listening. |

---

## Feature Area 2: World Map (Geographic Discovery)

### How Geographic Music Discovery Works (Research Findings)

Radio Garden proved that a spatial metaphor does all the teaching. Green dots on a globe are universally understood. Spin, tap, hear. No onboarding needed because spinning a globe is innate. The key insight: **the spatial relationship between action and outcome must be immediate and obvious**. Moving the map changes what you hear/see.

Radiooooo added a temporal axis (country + decade + mood) with just three dimensions. The constraint is the feature -- limiting choice to space, time, and mood reduces cognitive load to near zero.

Spotify's Musical Map of the World (built with Carto) proved that geographic music visualization works at scale. But it was a marketing exercise, not a discovery tool -- view-only, no click-through.

Leaflet.markercluster handles 10,000-50,000 markers on a map by grouping nearby markers into clusters that expand on zoom. This is the proven pattern for geographic data at BlackTape's scale. At the city level, clusters show "47 artists in Berlin" and zoom reveals individual pins.

### Table Stakes

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Interactive world map with artist/scene pins | This is the feature. If it's not interactive, it's a static image. | MEDIUM | Leaflet (already in codebase for SceneMap), **geocoded artist cities from Wikidata pipeline** |
| Click a city to see artists from that city | The fundamental interaction: geographic -> musical | LOW (once data exists) | Artist city geocoding pipeline |
| Cluster markers at zoom levels | 2.6M artists can't each have a pin. Clusters at country/city level. | LOW | Leaflet.markercluster plugin |
| Zoom from world -> continent -> country -> city | Progressive disclosure of detail as you zoom | LOW | Standard Leaflet zoom behavior + marker clustering |
| Genre filtering on the map | "Show me only ambient artists" -- map becomes genre-specific | MEDIUM | Cross-reference genre tags with geocoded artists |
| Cross-link to Rabbit Hole | Click an artist pin -> their Rabbit Hole page | LOW | URL linking between routes |

### Differentiators

| Feature | Value Proposition | Complexity | When to Add |
|---------|-------------------|------------|-------------|
| Genre heat map overlay | Color regions by genre density -- "where is shoegaze concentrated?" Visual answer to a question that's hard to Google. | HIGH | v1.8+ -- requires dense geocoding data |
| Decade filter on map | "Show me Berlin in the 1990s" -- temporal + geographic intersection | LOW (UI), MEDIUM (query) | v1.7 if decade filtering ships simultaneously |
| Scene boundaries on map | Genres with location data (scene_of relationship) drawn as shaded regions | MEDIUM | v1.7 day one if genre locations already in DB (they are -- from Wikidata) |
| Audio preview on hover/click | Hover over a city, hear a representative track from that scene | HIGH | v1.8+ -- requires precomputed representative tracks per city |
| "Travel" mode (auto-pan between cities) | Like Radio Garden's "Balloon Ride" -- automated tour | MEDIUM | v1.8+ -- fun feature, not essential |

### Anti-Features

| Anti-Feature | Why Tempting | Why It Would Ruin It | What to Do Instead |
|--------------|-------------|----------------------|-------------------|
| 3D globe (like Radio Garden) | Looks spectacular | WebView2 + WebGL performance is unpredictable. 3D globe is harder to interact with on desktop (no touch gestures). Radio Garden works because it's the entire product; BlackTape's map is one feature among many. | Flat 2D map (Leaflet). Proven, fast, accessible. |
| Real-time streaming integration on map | "Click a pin, music plays from that city" | Audio infrastructure on the map adds massive complexity. The map's job is navigation, not playback. | Map pins link to artist pages or Rabbit Hole entries where playback already works. |
| User location / "artists near me" | Personalization via geography | Requires geolocation API permission. Privacy concern. Desktop app asking "where are you?" feels wrong. | Let users explore the map manually. Their city isn't special -- every city is. |
| Pin for every artist (no clustering) | "Complete" representation | 2.6M pins would crash any browser. Even 100K is sluggish. | Marker clustering (Leaflet.markercluster) is mandatory. Show clusters at high zoom levels, individual pins only at city zoom. |

### Data Reality for World Map

The pipeline needs to geocode artist cities from Wikidata. Current state:

- **Genre locations**: Already have lat/lng for genres with scene_of relationships (from Wikidata + Nominatim)
- **Artist locations**: Only have country codes (2-letter ISO from MusicBrainz). City-level data requires Wikidata SPARQL queries matching on MBID.
- **Coverage estimate**: Well-known artists (maybe 100K-300K of 2.8M) will have Wikidata entries with hometown data. The long tail won't. This is fine -- the map should represent what's known, not pretend to be complete.
- **Scene pins**: 4,086 genres, many with location data. These can anchor the map even before artist-level geocoding is complete.

**Start with scene/genre pins (already have data) + artist country-level aggregation (already have country codes). City-level artist pins are the pipeline stretch goal.**

---

## Feature Area 3: Context Sidebar

### How Contextual Sidebars Work (Research Findings)

UX Planet's sidebar research establishes the pattern: contextual sidebars show relevant options based on the current page or action. Content changes dynamically as the user navigates. The inspector panel pattern (280-320px width) provides contextual details with smart show/hide behavior.

The key principle from multiple sources: **sidebars supplement, they don't compete with main content**. The sidebar should feel like a helpful margin note, not a second page demanding attention.

For music discovery specifically, the sidebar solves the "I want more context without leaving my current exploration" problem. On Wikipedia, this is the infobox. On maps, it's the info panel that appears when you click a pin. The pattern is: **select something in the main view, get context in the sidebar without a full page navigation**.

### Table Stakes

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Genre info when browsing a genre | Name, short description, sub-genres, related genres -- all clickable | LOW | Existing genre data in DB |
| Artist summary when hovering/selecting an artist in a list | Quick overview without full page navigation | LOW-MEDIUM | Existing artist data; AI summaries (already built) |
| All sidebar items are clickable into the Rabbit Hole | The sidebar is a departure point, not a dead end | LOW | URL linking |
| Sidebar collapses or hides when not useful | Empty sidebar is wasted space. Hide when there's nothing contextual to show. | LOW | Conditional rendering based on current route/context |
| Responsive to current page | Changes content when user navigates | LOW | Svelte reactive state derived from current route/page data |

### Differentiators

| Feature | Value Proposition | Complexity | When to Add |
|---------|-------------------|------------|-------------|
| "Related genres" with scent-rich descriptions | Sub-genres and neighboring genres with evocative one-liners, not just names | MEDIUM (content) | Day one with whatever description data exists; improve over time |
| Tag cloud for current context | Visual representation of the tag space around the current artist/genre | LOW | Day one -- derived from existing tag data |
| Quick-play affordance in sidebar | Preview a similar artist without navigating away from current page | HIGH | v1.8+ -- requires embed management complexity |
| Breadcrumb trail in sidebar | "You came here from: Shoegaze -> My Bloody Valentine -> Noise Pop" | LOW | Day one -- read from navigation history |

### Anti-Features

| Anti-Feature | Why Tempting | Why It Would Ruin It | What to Do Instead |
|--------------|-------------|----------------------|-------------------|
| Always-visible sidebar consuming space | "More information is always better" | On narrow screens (or when exploring artists, not genres), the sidebar is noise. Research: sidebars should use smart show/hide behaviors. | Show sidebar when there's contextual content; collapse to a thin strip or hide entirely when navigating artist pages where the main content is rich enough. |
| Social features in sidebar (followers, activity) | Fill space with community signals | Community features were deliberately removed from UI in v1.6. The sidebar is for discovery context, not social proof. | Genre info, related items, descriptions only. |
| Long-form content in sidebar | Full Wikipedia articles, lengthy genre histories | Sidebar width (280-320px) can't hold readable paragraphs. Long text in sidebars creates scroll-within-scroll, which is a UX anti-pattern. | 2-3 sentence summaries. "Read more" links to full genre page. |
| Persistent sidebar across all routes | "Consistency" | Settings, About, Library, Search -- these pages don't need a context sidebar. It would just be empty or show stale data. | Sidebar only on discovery-related routes (Rabbit Hole, World Map, genre pages, artist pages). |

---

## Feature Area 4: AI Companion

### How AI Chat Sidebars Work (Research Findings)

Microsoft's Copilot UX guidance identifies three AI integration patterns:

1. **Immersive** -- AI is the entire canvas (ChatGPT style)
2. **In-app focus** -- AI assists within existing workflow (GitHub Copilot)
3. **Sidebar/assistive** -- continuous access without obstructing main content

BlackTape's AI companion is pattern 3: sidebar/assistive. The 2025-2026 evolution shows a shift away from chat-first designs toward "dynamic blocks" -- UI elements that appear based on AI analysis of context. But for BlackTape, chat is appropriate because the queries are conversational ("find me something heavier," "what's this genre about?").

Key design principle from CopilotKit research: the AI should generate **actionable output** (clickable links, navigable results), not just text. "Here are 5 artists you might like" should be 5 clickable links that enter the Rabbit Hole, not a text list.

Microsoft's approach with governor mechanisms (show AI content at reduced opacity until reviewed) builds trust. For music discovery, this translates to: AI suggestions should be visually distinct from database-sourced results so users know what's AI-generated vs. what's from the catalog.

### Table Stakes

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Only visible when AI is connected | Users without local AI model or API key should never see an empty chat panel | LOW | Existing `getAiProvider()` null check |
| Knows current page context | "Tell me about this artist" should work without typing the artist name | LOW | Pass current route/page data to AI prompt |
| Responses contain clickable artist/genre links | AI output that links into the Rabbit Hole, not just text | MEDIUM | Parse AI responses, resolve artist names to slugs via FTS5 lookup |
| Persistent across navigation | The chat doesn't reset when you click to a new page | LOW | Store conversation state in a Svelte store or context |
| Clearly labeled as AI-generated | Every AI response must be visually marked as AI | LOW | Already established pattern from ArtistSummary component |

### Differentiators

| Feature | Value Proposition | Complexity | When to Add |
|---------|-------------------|------------|-------------|
| Contextual prompts / suggested questions | "Ask about this genre" / "Find something similar but darker" -- pre-filled query suggestions based on current page | LOW | Day one -- reduces blank-input anxiety |
| Taste-aware responses | AI knows the user's taste profile and personalizes suggestions | LOW | Already built -- taste profile feeds into AI prompts (see Explore page) |
| Conversational refinement | "Show me something heavier" -> "Even heavier" -> "Now something from Japan" -- multi-turn context | MEDIUM | Already built in Explore page (refinementCount, conversationHistory) |
| AI-initiated suggestions | When arriving at a genre page, AI proactively offers "Want me to find the most unique artists in this genre?" | MEDIUM | v1.7.x -- requires detecting idle state + appropriate trigger |

### Anti-Features

| Anti-Feature | Why Tempting | Why It Would Ruin It | What to Do Instead |
|--------------|-------------|----------------------|-------------------|
| AI as primary discovery mechanism | "Let AI find all music for you" | Defeats the purpose of exploration. The rabbit hole is about the user's curiosity driving navigation, not an AI doing it for them. AI should assist, not replace. | AI is a companion -- answers questions, suggests directions, but the user clicks. |
| Voice interaction | "Hey BlackTape, play something ambient" | Desktop app, Tauri/WebView2 -- voice requires microphone permissions, speech recognition, and is socially awkward in shared spaces. High complexity, low value for a discovery tool. | Text input only. |
| AI-generated playlists | "Generate a 2-hour ambient playlist" | Playlist generation is a Spotify feature. BlackTape's value is exploration, not consumption. Playlists are endpoints; the rabbit hole is the journey. | AI suggests starting points: "Try starting with Grouper, then follow the ambient folk tag." |
| Always-on AI streaming suggestions | AI continuously suggests artists as you browse | Interrupts flow state. Unsolicited suggestions feel like ads. Microsoft's own research says governor mechanisms (user-initiated) build more trust than proactive AI. | AI only responds when asked. Suggested questions are visible but passive. |

---

## Feature Area 5: Decade Filtering

### How Temporal Filtering Works (Research Findings)

Filter UI research identifies chip filters as the optimal pattern for small, discrete sets: "Chip filters blend compact design with an accessible interface that gives users a simplified way to sort content through selectable elements." Decades (60s, 70s, 80s, 90s, 00s, 10s, 20s) are a perfect fit -- 7 items, visually compact, mutually exclusive or multi-selectable.

Radiooooo proved that the country + decade combination is powerful: two-axis navigation (space x time) with minimal cognitive load. The decade row should work the same way -- click a decade, the current view filters to that era.

Rate Your Music's decade/year filtering in their chart system is the closest functional equivalent: browse top charts by decade or year, with community ratings determining rankings. The key: decade is the coarse filter, year is the fine filter. Progressive disclosure -- click a decade to expand into individual years.

### Table Stakes

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Row of clickable decade chips (60s-20s) | The fundamental UI -- replaces the year text input | LOW | Artist begin_year data (already in DB) |
| Selecting a decade filters the current view | Artists in the Rabbit Hole filtered to that era; map filtered to that era | MEDIUM | SQL WHERE clause on begin_year BETWEEN decade_start AND decade_end |
| Only show decades with data for current context | "Jazz in the 20s" -- if no jazz artists have begin_year in 2020-2029, don't show 20s chip | MEDIUM | Pre-query to count artists per decade for current tag/genre filter |
| Click decade to expand into individual years | 90s -> 1990, 1991, ... 1999 -- progressive disclosure | LOW | Expand/collapse UI within the decade row |
| Clear/reset filter | One click to remove decade filter | LOW | Standard chip deselect pattern |
| Works across Rabbit Hole and World Map | Decade filter applies to both discovery surfaces | LOW | Shared filter state in a Svelte store |

### Differentiators

| Feature | Value Proposition | Complexity | When to Add |
|---------|-------------------|------------|-------------|
| Decade chip shows artist count | "90s (4,230)" -- signals density before clicking | LOW | Day one -- fast SQL count query |
| Visual density indicator (opacity or size) | Decades with more artists are visually heavier -- spatial encoding of data density | LOW | Day one -- CSS opacity based on count |
| Multi-decade selection | Select 70s + 80s together for "classic era" browsing | LOW | Allow multiple active chips |
| Animated transition when filtering | Content smoothly filters rather than hard-cutting | LOW | Svelte transition directives |

### Anti-Features

| Anti-Feature | Why Tempting | Why It Would Ruin It | What to Do Instead |
|--------------|-------------|----------------------|-------------------|
| Continuous timeline slider | "More precise than decades" | Timeline sliders are imprecise on desktop (hard to hit exact years), add visual complexity, and don't communicate data density. Chips are faster and clearer. | Decade chips with year expansion. Click 90s to see 1990-1999. |
| Decade filter permanently visible on all pages | "Consistency" | Decade filtering is irrelevant on Settings, About, Library, etc. Visible everywhere means visual noise everywhere. | Show only on discovery routes (Rabbit Hole, World Map, Discover). |
| Filter by exact year as primary interaction | Text input for year, dropdown, etc. | Exact years are rarely how people think about music eras. "80s music" is a concept; "1984 music" is trivia. Year-level is a secondary refinement within a decade. | Decades primary, years as expansion within decade. |

---

## Feature Area 6: Pipeline Work (Similar Artists, Geocoding, Caching)

These aren't user-facing features but they are dependencies that gate the features above.

### Similar Artists Precomputation

| Requirement | Status | Complexity | Notes |
|-------------|--------|------------|-------|
| Build similar_artists table from tag overlap | NOT STARTED | HIGH | This is the single most important pipeline task for v1.7. Without it, the Rabbit Hole has no "similar artists" and exploration dead-ends at every artist page. |
| Weight by tag rarity (IDF-like weighting) | NOT STARTED | MEDIUM | Two artists sharing "shoegaze" (100 artists) is a weaker signal than sharing "zeuhl" (8 artists). Inverse tag frequency weighting is critical for niche-first similarity. |
| Top N similar per artist | NOT STARTED | LOW (schema) | 10-20 similar artists per artist is sufficient. More than 20 adds DB bloat without UX value. |
| Bidirectional or unidirectional? | DECISION NEEDED | -- | If A is similar to B, is B automatically similar to A? Yes for tag overlap (symmetric). Store only one direction to halve table size, query both directions. |

**Open question from research doc: "How many similar artists per artist is enough?"** Answer: 10-15 is the sweet spot. Wikipedia articles average 20-30 internal links. But Wikipedia links are heterogeneous (some navigate, some define). Similar artists are homogeneous -- all serve the same purpose. 10-15 provides enough choice without overwhelming. The Rabbit Hole also has genre/tag departure points, so similar artists don't carry the entire load.

### Artist City Geocoding

| Requirement | Status | Complexity | Notes |
|-------------|--------|------------|-------|
| Wikidata SPARQL for artist origin cities via MBID | NOT STARTED | MEDIUM | Same pattern as existing genre geocoding. Batch query, store lat/lng. |
| Coverage estimate | -- | -- | Expect 100K-300K artists with Wikidata hometown data. Long tail will remain country-only. |
| Fallback to country centroid for map | NOT STARTED | LOW | Artists with only country code get a country-level pin, clustered at country centroid coordinates. |

### Track/Release Caching

| Requirement | Status | Complexity | Notes |
|-------------|--------|------------|-------|
| Cache MB API responses in taste.db | NOT STARTED | MEDIUM | First fetch from MusicBrainz API is 1-2s (rate limited). Cache in local SQLite for instant subsequent access. |
| Progressive loading pattern | NOT STARTED | LOW | Show artist name + tags (local, instant) while tracks load from MB API. Never block navigation on remote data. |
| Cache invalidation strategy | DECISION NEEDED | LOW | MB data changes slowly. 30-day cache is fine. Stale data is better than slow data for flow state. |

---

## Feature Dependencies

```
Similar Artists Pipeline (CRITICAL PATH)
    |-- enables --> Rabbit Hole "similar artists" lists
    |-- enables --> "No dead ends" (every artist page has outbound links)
    |-- data: tag_overlap weighted by inverse tag frequency

Artist Geocoding Pipeline
    |-- enables --> World Map individual artist pins
    |-- fallback --> Country-level aggregation (already have country codes)
    |-- data: Wikidata SPARQL batch query

Track/Release Caching
    |-- enables --> Music on every page (progressive loading)
    |-- enables --> Fast revisits (instant after first load)

Rabbit Hole
    |-- requires --> Similar Artists Pipeline (or it's just tag-click navigation, which already exists)
    |-- requires --> Back/forward navigation (SvelteKit provides this)
    |-- enhanced by --> Track/Release Caching (music on pages)
    |-- enhanced by --> Context Sidebar (genre info alongside exploration)
    |-- enhanced by --> Decade Filtering (temporal axis on exploration)

World Map
    |-- requires --> Leaflet (already in codebase)
    |-- requires --> Leaflet.markercluster (new dependency)
    |-- requires --> Artist Geocoding Pipeline (or falls back to genre/scene pins only)
    |-- enhanced by --> Decade Filtering (temporal axis on map)
    |-- cross-links with --> Rabbit Hole (click map pin -> artist page)

Context Sidebar
    |-- requires --> Route-aware reactive state
    |-- displays --> Genre info, related genres, tag context, breadcrumb trail
    |-- enhanced by --> AI Companion (chat in sidebar area)

AI Companion
    |-- requires --> AI provider connected (local model or API key)
    |-- requires --> Current page context passed to prompts
    |-- requires --> Response parsing to resolve artist names -> slugs
    |-- builds on --> Existing Explore page AI integration (prompts, conversation history)

Decade Filtering
    |-- requires --> begin_year data on artists (already in DB)
    |-- applies to --> Rabbit Hole artist lists, World Map pins, Discover page
    |-- UI: chip filter row, context-dependent visibility
```

### Critical Path

The Similar Artists Pipeline is the single highest-priority dependency. Without it, the Rabbit Hole is just the existing tag-click navigation with a new coat of paint. Similar artists are the rabbit hole -- they are the "one more click" that keeps users exploring. Everything else is enhancement; this is the engine.

---

## MVP Recommendation

### Day One (v1.7 Core)

Ship these together -- they form the minimum viable rabbit hole:

1. **Similar Artists Pipeline** -- precompute tag-overlap similarity, store top 15 per artist, weighted by inverse tag frequency. This is the foundation for everything.

2. **Rabbit Hole page** -- unified discovery route with three entry points (Search, Continue, Random). Artist pages show: name, tags (clickable), similar artists (clickable), genres (clickable). Genre pages show: name, description, sub-genres (clickable), artists in genre (paginated, clickable). Every page is a departure point.

3. **Decade filtering** -- row of decade chips on the Rabbit Hole. Filters current view. Shows data density per decade. Expand to years on click.

4. **Context sidebar** -- genre info panel that updates when browsing genres. Shows sub-genres, neighboring genres, short description. All clickable. Hides when no contextual info applies.

5. **World Map (genre/scene pins)** -- Leaflet map with genre location pins from existing Wikidata data. Click a pin to see the genre page or jump to Rabbit Hole. This ships even without artist-level geocoding because genre locations already exist.

### Fast-Follow (v1.7.x)

6. **AI Companion** -- persistent chat in sidebar area, context-aware, clickable responses. Requires AI to be connected. Builds on existing Explore page infrastructure.

7. **Track/release caching** -- progressive loading of music on Rabbit Hole pages. Show local data immediately, stream in remote MB API data, cache for next time.

8. **World Map artist pins** -- artist city geocoding from Wikidata. Adds individual artist pins with clustering. Requires pipeline work.

### Defer (v1.8+)

9. **History trail visualization** (Outer Wilds Ship Log style exploration graph)
10. **Wander mode** (automated random exploration with audio)
11. **Fog of war** (personal discovery tracking)
12. **Genre heat map overlay on World Map**
13. **Audio preview on map hover**

---

## What Would Ruin It

These are the decisions that would make the Rabbit Hole fail. Not "suboptimal" -- actually broken.

1. **Shipping without similar artists data.** Without precomputed similarity, every artist page dead-ends at its tags. Tags connect to the Discover page, which already exists. The Rabbit Hole's unique value IS the click-through loop of "artist -> similar artists -> new artist -> their similar artists -> ..." Remove that and you've rebuilt what v1.4 already has.

2. **Making any interaction cost more than one click.** Modals, confirmations, "are you sure?", two-step navigation (click artist name, then click "explore") -- any friction breaks flow state. One click = one navigation. Always.

3. **Slow page transitions.** The perceived load time must be <200ms for local data. If the similar artists query takes 500ms, users will stop clicking. SQLite queries should be pre-optimized with proper indexes on the similar_artists table.

4. **Dead ends.** If any artist page shows zero similar artists and zero related genres, the exploration stops. Fallback strategy: if similar artists aren't available for a rare artist, show "artists with the same tags" as a less-precise but never-empty alternative.

5. **Treating the World Map and Rabbit Hole as separate products.** They must be cross-linked. Clicking a map pin should enter the Rabbit Hole. Seeing "Berlin" on an artist page should link to Berlin on the map. If they feel like different apps, users won't use both.

6. **Adding social/engagement mechanics to the discovery flow.** Likes, follows, activity feeds, recommendations-from-friends -- these shift the brain from exploration mode to social mode. The Rabbit Hole is a solo experience. The user vs. the universe of music. Keep it that way.

---

## Real-World Reference Analysis

### Every Noise at Once (Frozen since Dec 2023)
**What worked:** Zero-friction click-to-hear. 6,291 genres navigable because each click cost nothing. Scatter plot positioning encoded information (down=organic, up=mechanical, left=dense, right=bouncy).
**What failed:** The scatter plot was unreadable at scale -- 6,000 overlapping text labels. No hierarchy. No progressive disclosure. Finding a specific genre required Ctrl+F, not navigation.
**Lesson for BlackTape:** Keep interaction cost at zero. But use lists, not scatter plots. Lists are scannable; scatter plots are not.

### Radio Garden
**What worked:** Globe metaphor is universally understood. Instant audio on tap. "Balloon Ride" random exploration removes decision paralysis.
**What failed:** Discovery depth is shallow -- you hear one station per city. No way to drill down. No taste-based filtering.
**Lesson for BlackTape:** The map should be an entry point to depth (the Rabbit Hole), not depth itself. Geographic + depth, not geographic instead of depth.

### Musicmap.info
**What worked:** Semantic zoom -- super-genre "buildings" at macro, subgenre "streets" at micro. The cityscape metaphor is memorable.
**What failed:** Read-only. No audio. No click-through to artists. A beautiful infographic, not a discovery tool.
**Lesson for BlackTape:** Every visual element must be interactive. If it's on screen, it should be clickable.

### Spotify Artist Radio / Apple Music Discovery Station
**What worked:** Low-effort discovery -- start from one artist, hear related music with zero work.
**What failed:** User has no agency. The algorithm picks everything. There's no "I want to go left instead of right" -- it's a one-dimensional stream.
**Lesson for BlackTape:** The Rabbit Hole must offer choice at every step. Multiple departure options, not a single stream. The user drives, not the algorithm.

### Bandcamp Discovery
**What worked:** Tag combination filtering (experimental + bagpipes). Curation through editorial daily posts. Community context.
**What failed:** Discovery is separated from the catalog. You browse discovery, find something, then navigate to the artist page. Two-step process.
**Lesson for BlackTape:** Discovery and catalog should be the same surface. The Rabbit Hole IS the catalog browsed through exploration.

### Rate Your Music Genre Pages
**What worked:** Hierarchical genre taxonomy (1,780 genres). Decade/year filtering on charts. Community-driven rankings. Descriptor filtering (mood, theme, form).
**What failed:** Dense, information-heavy UI that prioritizes completeness over browsability. No audio. Academic tone.
**Lesson for BlackTape:** Genre pages need personality, not just data. Evocative descriptions, not taxonomic completeness. Audio presence, not chart positions.

---

## Sources

- [Every Noise at Once -- Wikipedia](https://en.wikipedia.org/wiki/Every_Noise_at_Once) -- History, frozen status (Dec 2023), 6,291 genres. Confidence: HIGH.
- [Every Noise at Once -- Building Beats 2026](https://buildingbeats.org/toolbox/every-noise-at-once) -- Zero-friction discovery, simplicity over algorithmic recommendations. Confidence: HIGH.
- [Radio Garden -- IXD@Pratt Design Critique](https://ixd.prattsi.org/2026/02/design-critique-radio-garden-ios-app/) -- Globe metaphor, instant audio, 40,000+ stations. Confidence: HIGH.
- [Radio Garden -- Wikipedia](https://en.wikipedia.org/wiki/Radio_Garden) -- Studio Puckey design, MIT collaboration. Confidence: HIGH.
- [Musicmap -- Fast Company](https://www.fastcompany.com/3062814/this-interactive-map-of-music-genres-will-take-up-the-rest-of-your-da) -- Cityscape metaphor, semantic zoom, genre genealogy. Confidence: HIGH.
- [Wikipedia Rabbit Holes -- Nature](https://www.nature.com/articles/d41586-024-03454-7) -- Three curiosity styles (busybody, hunter, dancer), 480K user study. Confidence: HIGH.
- [Wikipedia Rabbit Holes -- The Conversation](https://theconversation.com/going-down-a-wikipedia-rabbit-hole-science-says-youre-one-of-these-three-types-242018) -- Dale Zhou / UPenn research, browsing patterns. Confidence: HIGH.
- [Information Foraging -- Wikipedia](https://en.wikipedia.org/wiki/Information_foraging) -- PARC theory, information scent concept. Confidence: HIGH.
- [Infinite Scrolling -- IxDF](https://ixdf.org/literature/topics/infinite-scrolling) -- Scroll fatigue, usability problems with endless content. Confidence: HIGH.
- [Spotify Recommendation System -- Music Tomorrow](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide) -- Collaborative filtering, content-based analysis. Confidence: HIGH.
- [Bandcamp Discover Tag Combination -- Bandcamp Blog](https://blog.bandcamp.com/2024/04/25/new-in-discover-search-and-filter-by-combining-tags/) -- Multi-tag filtering, dark mode. Confidence: HIGH.
- [Apple Music Discovery Station -- MacRumors](https://www.macrumors.com/2023/08/07/apple-music-discovery-station/) -- Algorithmic personalization, no user agency. Confidence: HIGH.
- [Rate Your Music Discovery -- rateyourmusic.com](https://rateyourmusic.com/discover) -- Descriptor filtering, decade charts, 1,780 genres. Confidence: HIGH.
- [Sidebar UX -- UX Planet](https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2) -- 240-300px width, contextual design, smart show/hide. Confidence: HIGH.
- [Side Panels -- UX Planet](https://uxplanet.org/designing-side-panels-that-add-value-to-your-websites-ux-fc44211fa8e1) -- Inspector panel pattern, 280-320px. Confidence: HIGH.
- [AI Copilot UX -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance) -- Sidebar/assistive pattern, dynamic blocks, governor mechanisms. Confidence: HIGH.
- [Generative UI -- CopilotKit](https://www.copilotkit.ai/generative-ui) -- Agent-powered interfaces, actionable AI output. Confidence: MEDIUM.
- [Leaflet.markercluster -- GitHub](https://github.com/Leaflet/Leaflet.markercluster) -- 10K-50K markers, chunked loading, spiderfying. Confidence: HIGH.
- [Leaflet 2.0 Alpha](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html) -- Leaflet 2.0.0-alpha.1 released August 2025. Confidence: HIGH.
- [Breadcrumbs UX -- NN/g](https://www.nngroup.com/articles/breadcrumbs/) -- Path-based navigation, wayfinding. Confidence: HIGH.
- [Filter UI Patterns -- BricxLabs](https://bricxlabs.com/blogs/universal-search-and-filters-ui) -- Chip filters, checkbox filters, calendar filters. Confidence: HIGH.
- Existing codebase analysis: `src/routes/`, `src/lib/db/queries.ts`, `src/lib/taste/`, `src/lib/components/`, `docs/discovery-redesign-research.md`. Confidence: HIGH (direct code inspection).

---
*Feature research for: BlackTape v1.7 -- The Rabbit Hole (Discovery Redesign)*
*Researched: 2026-03-03*
