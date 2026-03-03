# Domain Pitfalls

**Domain:** Discovery redesign — unified click-through exploration, geographic map, tag-based similarity, live data caching added to existing Tauri 2.0 desktop music search engine
**Researched:** 2026-03-03
**Confidence:** HIGH for DB size growth and API rate limits (verified against Cloudflare D1 docs, MusicBrainz official rate limit docs, and Wikidata SPARQL limits). HIGH for Leaflet rendering performance (multiple verified benchmarks and library comparisons). MEDIUM for SvelteKit navigation memory issues (GitHub issues confirmed but exact thresholds not benchmarked for this app). MEDIUM for Wikidata geocoding coverage (known ~77K bands + ~238K musicians total in Wikidata, but P740 coverage percentage unverified). LOW for migration UX impact (no direct precedent for this specific app, reasoning from general feature-flag best practices).

---

## Critical Pitfalls

Mistakes that cause rewrites, blocked milestones, or data distribution failures.

### Pitfall 1: Similar Artists Table Blows Past Cloudflare D1 Storage Limit

**What goes wrong:**
The discovery index lives on Cloudflare D1, accessed via HttpProvider at `api.blacktape.org`. D1 free plan allows 500MB per database. The current schema (2.6M artists, 26M+ artist_tags, 100K+ tags, 4K genres, 10K co-occurrence edges) is already a significant portion of that budget. Adding a `similar_artists` table with top-20 similar artists per artist creates 2.6M x 20 = 52 million rows. At a conservative ~20 bytes per row (two INTEGER foreign keys + one REAL similarity score), that's ~1GB of raw data before indexes. With indexes on both `artist_id` and `similar_artist_id` (needed for bidirectional lookup), the table alone exceeds the 500MB free limit. Even on D1's paid plan (10GB max), this table plus indexes plus the existing data could approach 2-3GB.

The torrent-distributed DB file also grows. The full MusicBrainz import currently produces a ~778MB uncompressed DB (365MB compressed). Adding 52M rows of similarity data could push the compressed download past 500MB -- a significant barrier for first-time users on limited connections.

**Why it happens:**
The similar artists computation is conceptually simple (for each artist, find top-N by tag overlap). The math seems small -- "just 20 rows per artist." But 2.6M artists x 20 = 52M rows, and database storage is not just the raw data but includes B-tree page overhead, index structures, and SQLite's variable-length integer encoding.

**Consequences:**
- D1 free plan: database stops accepting writes. Pipeline uploads fail silently or with 500 errors.
- Torrent distribution: download size doubles or triples. New users on slow connections abandon the setup.
- Pipeline runtime: computing 52M similarity scores across 26M tag associations is computationally expensive -- could take hours on a single machine.

**Prevention:**
1. **Cap similar artists at top-10, not top-20.** 10 is sufficient for discovery navigation (the Rabbit Hole only needs "here are some related artists to click"). This halves the table to 26M rows.
2. **Only compute for artists with >= 3 tags.** Artists with 0-2 tags produce low-quality similarity scores. Estimate how many artists this excludes -- if 60% of the 2.6M have < 3 tags, the table drops to ~10M rows.
3. **Use compact storage.** Store only `(artist_id INTEGER, similar_id INTEGER, rank INTEGER)` -- no float scores. The rank (1-10) is sufficient for ordering. Each row is ~12 bytes. With the tag-count filter, total ~120MB.
4. **Measure before committing.** Build the table on the 10K sample first, extrapolate the size, then decide on cutoffs. Run `SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()` after building.
5. **Consider D1 paid plan budget.** $0.75/GB-month on Workers Paid. If the table is 500MB, that's ~$0.38/month. Not free, but not expensive.

**Detection:**
- Pipeline build script should report table size after creation.
- D1 dashboard shows storage usage -- set an alert at 80% capacity.
- If the pipeline upload to D1 starts failing with 413 or storage errors, this is the cause.

**Phase to address:**
Pipeline work phase -- before the similar artists table is designed. The storage impact must be measured on a sample before committing to a schema.

---

### Pitfall 2: Replacing Four Working Discovery Views Creates a UX Regression Window

**What goes wrong:**
Style Map, Knowledge Base, Time Machine, and Crate Dig are separate pages with established routes (`/style-map`, `/kb`, `/time-machine`, `/crate`). The plan is to keep the code but remove the navigation links. If the Rabbit Hole is incomplete or buggy when the old views are hidden, users lose four discovery tools and gain one broken replacement. The research doc says "code stays as fallback" but doesn't specify when the old views stop being accessible.

This is especially dangerous because v1.6 was just shipped. If v1.7 ships with a half-working Rabbit Hole and hidden old views, the first public users (if any arrive during this window) see a discovery engine with fewer working features than the version before it.

**Why it happens:**
The old views feel redundant once the new design exists in the developer's head. There's a temptation to hide them early to avoid maintaining "dead" code paths. But the Rabbit Hole depends on pipeline data (similar artists table, geocoded cities) that doesn't exist yet. The new view is not functional until the data layer is complete.

**Consequences:**
- Discovery section of the app has fewer functional tools during development.
- If the similar artists pipeline fails or is delayed, the Rabbit Hole has no "similar artists" navigation -- its core loop is broken.
- Users who discovered the app through the Style Map or KB (existing features) find them gone.

**Prevention:**
1. **Keep old views accessible until the Rabbit Hole is feature-complete.** Don't hide nav links to old views in Phase 1. Hide them only in the final phase after the Rabbit Hole passes a "parity checklist" (see below).
2. **Build the Rabbit Hole as a NEW route (`/rabbit-hole` or `/discover-v2`).** Don't replace `/discover` until the new view works end-to-end. This is the cheapest possible feature flag -- two different routes.
3. **Parity checklist before switchover:**
   - [ ] Can enter via search (artist or genre name)
   - [ ] Can enter via random
   - [ ] Similar artists load for 90%+ of artists viewed
   - [ ] Genre page shows artists, subgenres, neighboring genres
   - [ ] Every page has 3+ clickable departure points (no dead ends)
   - [ ] History trail persists across sessions
   - [ ] Back/forward navigation works
   - [ ] Performance is acceptable (page transitions < 500ms)
4. **Add a "Classic Discovery" link in Settings or footer.** Even after switchover, let users access the old views if they prefer. This costs nothing and eliminates regression complaints.

**Detection:**
- If any Rabbit Hole page renders with zero similar artists, zero related genres, or no clickable links, the switchover is premature.
- Manual test: can a new user with no history spend 10 minutes clicking through without hitting a dead end?

**Phase to address:**
First phase (Rabbit Hole UI) and final phase (switchover). The parity checklist must be explicit in the plan.

---

### Pitfall 3: Leaflet World Map With Hundreds of Thousands of Pins Crashes WebView2

**What goes wrong:**
The World Map will show artist locations on a Leaflet map. If Wikidata geocoding returns locations for even 10% of 2.6M artists, that's 260,000 pins. Standard Leaflet DOM markers break at ~1,000 markers (each marker is a separate DOM element). Even Leaflet.markercluster, which is already in the codebase (used by SceneMap), starts degrading past 50,000-100,000 markers. WebView2's rendering performance is generally lower than a full Chrome browser -- the performance cliff arrives sooner.

Loading all pin data at once (even without rendering) can exhaust available memory. 260K markers with lat/lng/name/artist_id is ~30-50MB of JSON. In WebView2, this competes with the Svelte runtime, DOM, and any loaded embeds for the process's memory budget.

**Why it happens:**
The SceneMap component currently handles ~4,000 genre location pins with basic Leaflet markers. This works fine at that scale. The natural assumption is "just add more pins." But the relationship between pin count and performance is not linear -- it's roughly O(n) for initial load but O(n log n) for pan/zoom clustering operations, and DOM rendering is O(n) with a very high constant factor.

**Consequences:**
- Map freezes on load. User sees a white rectangle.
- Pan/zoom stutters at 2-5 FPS. Map feels broken.
- Memory pressure causes WebView2 to crash or Tauri to show a "page unresponsive" dialog.

**Prevention:**
1. **Use Supercluster, not Leaflet.markercluster.** Supercluster handles clustering in a Web Worker (off main thread), supports millions of points, and query time per viewport is < 1ms. Load time for 500K points is 1-2 seconds (benchmarked by Mapbox).
2. **Viewport-only rendering.** Only render markers visible in the current map viewport. As the user pans/zooms, load markers for the new viewport from the clustered index. Never render all markers at once.
3. **Zoom-level data tiers.** At low zoom (world view), show only country or city-level clusters with counts. At medium zoom, show individual city dots. At high zoom (city level), show individual artist pins. This is the Google Maps semantic zoom pattern described in the research doc.
4. **Canvas rendering instead of DOM markers.** Use `L.canvas()` as the renderer for individual markers. Canvas draws to a single element rather than creating one DOM element per marker.
5. **Pre-cluster in the pipeline.** Compute cluster centroids at each zoom level (z3 through z14) during the data pipeline, store as a separate table. The frontend loads pre-clustered data at the appropriate zoom level rather than running clustering at runtime.
6. **Start with genre/scene pins only.** The existing genre location data (~4K points with lat/lng) works today. Start the World Map with genres, add artist pins only after geocoding coverage is measured and Supercluster is integrated.

**Detection:**
- Map load time > 3 seconds on a mid-range machine.
- FPS drops below 15 during pan/zoom (use Performance panel in DevTools).
- Memory usage spikes above 500MB when the map is open.

**Phase to address:**
World Map implementation phase. Supercluster must be integrated before artist pin data is loaded. Test with synthetic data (random 100K lat/lng points) before real data arrives.

---

### Pitfall 4: Wikidata SPARQL Geocoding Has a 60-Second Timeout and Will Not Cover 2.6M Artists

**What goes wrong:**
The plan is to geocode artist cities via Wikidata SPARQL using MBIDs. Two problems:

**Coverage gap:** Wikidata has ~77K bands and ~238K musicians (~315K total music entities). BlackTape has 2.6M artists. Even with perfect MBID matching, Wikidata covers at most ~12% of the catalog. Many Wikidata music entities lack P740 (place of origin) or any location property -- the actual geocoding coverage could be 5-8% of the 2.6M catalog, or ~130K-208K artists with locations.

**Query limits:** Wikidata SPARQL has a hard 60-second timeout. A single query fetching origin cities for all MBIDs will timeout long before completion. Rate limiting allows 60 seconds of compute time per minute per IP+UserAgent. Querying 2.6M MBIDs one-by-one at 60s/minute throughput would take months.

**Why it happens:**
The genre geocoding already in the pipeline used Wikidata successfully for ~4K genres. The assumption is that the same approach scales to millions of artists. It does not -- genre geocoding was a small, well-defined dataset. Artist geocoding is orders of magnitude larger and hits coverage gaps.

**Consequences:**
- World Map shows pins for only ~5-12% of artists. Users search for their favorite niche artist, no pin appears.
- Pipeline geocoding step takes days or weeks to complete.
- Wikidata may throttle or ban the IP if the query pattern is too aggressive.

**Prevention:**
1. **Accept the coverage gap as a feature, not a bug.** The World Map shows geographic scenes and clusters, not every individual artist. 130K-208K pins is enough to show meaningful geographic patterns.
2. **Batch queries by MBID chunks.** Wikidata SPARQL supports `VALUES` clauses with up to ~10K items. Query in batches of 5,000 MBIDs per request. With 60s timeout and well-structured queries, each batch should complete in 5-20 seconds.
3. **Query by Wikidata's MusicBrainz ID property (P434).** Instead of looking up by MBID string matching, use `?item wdt:P434 ?mbid . ?item wdt:P740 ?origin .` -- this uses Wikidata's existing MB-linked entities.
4. **Prioritize popular artists.** Sort MBIDs by tag count (proxy for popularity) and geocode the top 500K first. Most users will search for artists who exist in Wikidata.
5. **Cache results in the pipeline.** Once an MBID is geocoded (or confirmed missing), store the result. Don't re-query on pipeline rebuilds. Only query new MBIDs.
6. **Fallback to country centroid.** For artists without city-level geocoding, place the pin at the country's centroid (already have `country` in the artists table). Less precise but ensures every artist with a country has some geographic presence.
7. **Run geocoding as a separate, resumable pipeline step.** Not part of the main import. A script that can be interrupted and resumed, tracking progress in a checkpoint file.

**Detection:**
- SPARQL queries returning HTTP 429 (rate limited) or 403 (banned).
- Geocoding coverage report: how many artists got locations vs. how many were queried.
- World Map looking empty for specific regions (e.g., no pins in South America might indicate coverage bias toward Western artists in Wikidata).

**Phase to address:**
Pipeline phase. Geocoding must run before the World Map UI is built. Measure coverage on a 50K-artist sample before committing to full pipeline run.

---

### Pitfall 5: MusicBrainz API 1 req/sec Rate Limit Makes Live Track/Release Fetching Unbearable for Discovery Browsing

**What goes wrong:**
The Rabbit Hole shows tracks and releases for each artist visited. Currently, releases are fetched live from MusicBrainz API at 1 request/second. In the existing artist page, this is acceptable -- the user visits one artist, waits 1-3 seconds for releases to load. In the Rabbit Hole, the user clicks through 5-10 artists per minute. Each click triggers MB API calls for releases, links, and potentially cover art. The 1 req/sec limit means:

- Releases for artist A: 1 request, 1 second
- Links for artist A: 1 request, 1 second wait
- Releases for artist B (clicked 3 seconds later): 1 request, still waiting

If the user clicks faster than the API can respond, requests queue up. After 3-4 rapid clicks, the user is waiting 4-8 seconds for data that should feel instant. The "rabbit hole flow state" described in the research doc requires near-zero interaction cost. A 4-8 second wait after every click destroys flow.

**Why it happens:**
The existing artist page was designed for one-at-a-time browsing. The 1 req/sec limit was acceptable because users don't rapidly click between artist pages. The Rabbit Hole changes the interaction model from "visit and stay" to "click through rapidly." The rate limit doesn't change but the usage pattern does.

**Consequences:**
- Users experience the Rabbit Hole as sluggish and unresponsive.
- Rapid clicking queues up stale requests for artists the user has already navigated past.
- MusicBrainz may block the IP if the rate limiter fails (their threshold is ~300 requests per second from one IP before blocking, but they explicitly state 1/sec as the requirement).

**Prevention:**
1. **Cache aggressively in local SQLite.** After fetching releases/links for an artist, store them in `taste.db` (or a new `cache.db`). Set a TTL of 30 days. On second visit, skip the API entirely. This is already mentioned in the research doc but must be the first thing built, not an optimization.
2. **Prefetch the next-likely-click.** When the user lands on an artist page, start prefetching releases for the top 3 similar artists (the ones most likely to be clicked next). Use an idle callback or a low-priority fetch queue. This front-loads the wait before the user clicks.
3. **Show the page immediately with local data.** Artist name, tags, country, similar artists, genres -- all local. Show these instantly. Releases and links load asynchronously with a subtle loading indicator. The page is usable before the MB data arrives.
4. **Cancel stale requests.** When the user navigates away from an artist, cancel any in-flight MB requests for that artist. Use `AbortController`. Don't waste rate budget on data the user will never see.
5. **Request batching with `inc=` parameter.** MusicBrainz supports `inc=url-rels+release-groups` in a single request. Combine releases and links into one API call instead of two. This halves the request count per artist visit.
6. **Implement a proper rate limiter.** A module-level queue that enforces exactly 1 request per second with a configurable queue depth. Requests beyond the queue depth are dropped or deferred.

**Detection:**
- Time from click to releases appearing. If > 3 seconds average, caching is insufficient.
- MB API returning HTTP 503 (rate limited). This means the rate limiter is broken.
- Network panel showing multiple MB requests in flight simultaneously.

**Phase to address:**
Caching infrastructure phase -- must be built BEFORE the Rabbit Hole UI. The Rabbit Hole's flow state depends on cached data. Without caching, the Rabbit Hole feels worse than the current single-artist page.

---

## Moderate Pitfalls

### Pitfall 6: SvelteKit Navigation History Accumulates Memory Without Bound

**What goes wrong:**
The Rabbit Hole's core loop is rapid page navigation: click artist -> click genre -> click similar artist -> click genre -> click similar artist. Each SvelteKit client-side navigation creates new component instances, loads new data, and adds entries to the browser history stack. After 50-100 navigations in a single session, the accumulated component state, DOM snapshots (if SvelteKit's snapshot feature is used), and in-memory data from all previous pages can consume hundreds of MB.

SvelteKit GitHub issue #12405 confirms increasing memory usage after multiple navigations that does not decrease. This is not a dramatic memory leak but a gradual accumulation that compounds in a "rabbit hole" usage pattern where users navigate far more aggressively than typical web browsing.

**Why it happens:**
SvelteKit's client-side router retains data for back-navigation performance. Each page's load data persists in memory. For normal web browsing (5-20 page navigations per session), this is fine. For the Rabbit Hole (50-200+ navigations per session), the accumulation becomes significant.

**Prevention:**
1. **Limit in-memory history depth.** Keep only the last 20-30 page states in memory. Older states are evicted. If the user navigates back beyond the retained window, reload the data.
2. **Lightweight page data.** Each Rabbit Hole page should load minimal data: artist name, tags, similar artists (all from local DB, not API). Release data loaded lazily and not retained in navigation history.
3. **Monitor memory in development.** Add a dev-only memory reporter (Performance.memory API) visible in the UI. If memory exceeds 300MB, something is accumulating.
4. **Avoid storing fetched MB API data in SvelteKit load functions.** Keep API responses in a module-level cache (singleton map), not in the page's data. This way, navigating back doesn't duplicate the data -- it reads from the same cache.
5. **Test with a "marathon session" scenario.** Click through 100 artists in sequence, measure memory. This should be a standard test case.

**Detection:**
- Task Manager showing memory climbing steadily during extended browsing.
- WebView2 "page unresponsive" after long sessions.
- Performance degradation (page transitions slowing) after many navigations.

**Phase to address:**
Rabbit Hole UI implementation phase. The navigation architecture must account for deep history from the start.

---

### Pitfall 7: Decade Filtering Shows Empty Results for Most Genres Before 1950

**What goes wrong:**
The decade filter (60s, 70s, 80s, 90s, etc.) is context-dependent -- only shows decades with data. The `begin_year` column in the artists table records when an artist was formed/born. Most MusicBrainz data has good `begin_year` coverage for post-1960 artists but sparse coverage for earlier periods. Additionally, many artists have NULL `begin_year` (date unknown). When decade filtering is applied:

- "80s" works well -- thousands of artists with `begin_year` between 1980-1989.
- "60s" works for major genres but many niche genres show zero results.
- Any decade before the 1960s shows almost nothing for non-classical genres.
- Artists with NULL `begin_year` disappear entirely from filtered results.

**Why it happens:**
MusicBrainz has ~2.6M artists but `begin_year` coverage is not uniform. Modern artists (post-1990) have good coverage. Historical artists have patchy coverage. The decade filter implicitly excludes NULL years.

**Prevention:**
1. **Show decade buttons only for decades that have data in the current context.** If viewing a genre page and no artists in that genre have `begin_year` in the 1960s, don't show the "60s" button. This prevents empty-result frustration.
2. **Count NULL-year artists separately.** Show a "Year unknown" option alongside decade buttons. This surfaces the ~30-40% of artists without dates.
3. **Use range queries with an index.** Ensure `begin_year` has an index for efficient filtering. On 2.6M rows, unindexed `WHERE begin_year BETWEEN 1980 AND 1989` scans the full table.
4. **Precompute decade counts per genre.** In the pipeline, build a `genre_decade_counts` table: `(genre_id, decade, artist_count)`. The UI reads this to decide which decade buttons to show, without running a COUNT query per decade on every page load.

**Detection:**
- Decade buttons appearing for decades with zero results.
- Performance: decade filter queries taking > 200ms on the full dataset.
- User confusion: "Where did all the artists go?" when a decade is selected.

**Phase to address:**
Decade filtering implementation phase. The precomputation should happen in the pipeline phase alongside similar artists.

---

### Pitfall 8: AI Companion Context Passing Creates Latency Spikes and Stale Responses

**What goes wrong:**
The AI companion is "persistent" and "knows your current page context." This means every page navigation must update the AI's context. Two failure modes:

**Latency:** If the AI re-processes context on every navigation, clicking through 5 artists in 10 seconds sends 5 context updates. The local LLM (Qwen2.5 3B via llama-server) takes 2-5 seconds per inference. By the time the AI responds about artist #1, the user is on artist #5. The response is stale.

**Context size:** If the context includes the user's full exploration history (last 20 artists, their tags, their genres), the prompt grows with each navigation. At 50+ navigations, the context window could exceed the model's limit (Qwen2.5 3B has ~32K tokens).

**Why it happens:**
The AI companion is designed as a conversational sidebar. Conversational AI expects the user to stay on one topic for multiple exchanges. The Rabbit Hole interaction pattern is the opposite -- the user's "topic" (current artist/genre) changes every few seconds.

**Prevention:**
1. **Debounce context updates.** Don't send context to the AI on every navigation. Wait 3-5 seconds after the last navigation before updating. If the user is clicking rapidly, skip intermediate pages.
2. **Lightweight context, not full history.** The AI only needs: current page type (artist/genre), current entity name, current tags (top 5), and the user's recent question. Not the full trail.
3. **Lazy initialization.** Don't update the AI context unless the AI panel is open AND the user has interacted with it. If the user is browsing without asking the AI anything, don't waste compute.
4. **Streaming responses with cancellation.** If the AI is generating a response and the user navigates away, cancel the in-flight generation. Use the existing llama-server's `/completion` endpoint with streaming and abort.
5. **Pre-canned responses for common queries.** "What's this genre about?" can be answered from the genre's `description` field without any AI call. Only route to the LLM for questions that genuinely need inference.

**Detection:**
- AI responses appearing after the user has already left the page they asked about.
- AI panel showing a loading spinner for > 5 seconds during rapid browsing.
- llama-server process consuming 100% CPU during passive browsing (context updates firing too often).

**Phase to address:**
AI companion implementation phase. The debounce/lazy pattern must be designed before the UI, not retrofitted.

---

### Pitfall 9: Cache Storage Grows Unbounded and Eventually Fills the User's Disk

**What goes wrong:**
The caching strategy is "first fetch slow, instant after." Cached data includes MB releases, links, cover art URLs, Wikipedia bios, and potentially track lists. Over time, a power user exploring hundreds of artists per week accumulates cached data:

- Releases per artist: ~5-20 releases, ~500 bytes per release = ~5-10KB per artist
- Links per artist: ~5-15 links, ~200 bytes per link = ~1-3KB per artist
- Bio per artist: ~500-2000 bytes
- Total per artist: ~7-15KB

After exploring 10,000 artists: ~70-150MB of cached data. After a year of active use: potentially 500MB-1GB in `taste.db` or `cache.db`. On machines with small SSDs (128GB or 256GB), this is noticeable.

**Why it happens:**
Caches without eviction policies grow monotonically. Every new artist visit adds data. No data is ever removed. The user doesn't know or control the cache size.

**Prevention:**
1. **Implement an LRU eviction policy.** Track `last_accessed` timestamp on each cached record. When cache size exceeds a threshold (default 200MB), evict oldest-accessed records.
2. **Separate cache from taste data.** Don't put cache records in `taste.db` (which has irreplaceable user data like favorites, collections, play history). Use a dedicated `cache.db` that can be safely deleted without data loss.
3. **Show cache size in Settings.** "Cache: 142MB -- [Clear Cache]" button. Users can manage their own storage.
4. **TTL on cached data.** MusicBrainz data changes (new releases, updated links). Cache records older than 30-90 days should be refreshed on next access.
5. **Don't cache cover art binaries.** Cache only the URL, not the image data. Let the browser's HTTP cache handle image caching. This prevents the biggest storage consumer from landing in SQLite.

**Detection:**
- `cache.db` file size growing steadily over weeks.
- User reports of disk space usage.
- SQLite VACUUM showing significant space reclamation (indicates fragmentation from never-evicted data).

**Phase to address:**
Caching infrastructure phase. The eviction policy must be part of the initial cache design, not added after users complain about disk space.

---

### Pitfall 10: History Trail Persistence Creates Privacy Exposure

**What goes wrong:**
The "Continue" feature stores the user's full exploration trail -- every artist and genre page visited, in order, with timestamps. This is stored in `taste.db` (local SQLite). If someone else uses the machine, or if the DB file is copied/shared, the exploration history reveals the user's music interests with high granularity. This may seem harmless for music, but consider:

- Exploring politically sensitive music (protest punk, dissident rap)
- Exploring culturally sensitive genres (explicit content, controversial scenes)
- The trail reveals temporal patterns (when the user was at the computer and what they were doing)

The existing play_history table already has this exposure, but it only records played tracks. The exploration trail records every click, including genres and artists the user looked at but didn't listen to -- a broader behavioral fingerprint.

**Why it happens:**
The trail is a feature, not a bug -- it enables "pick up where you left off." The privacy implication is easy to overlook because music exploration feels inherently innocuous.

**Prevention:**
1. **Respect the existing Private Mode.** The app already has a `private_mode` setting (in playback preferences). When private mode is on, don't record the exploration trail.
2. **Auto-trim old trail entries.** Keep only the last 30 days of trail. Older entries are automatically deleted. This limits the temporal fingerprint.
3. **"Clear exploration history" in Settings.** Alongside the existing "Clear play history" button, add trail clearing.
4. **Store trail in the same `private_mode`-respecting path as play history.** Don't create a separate privacy toggle -- the user's existing privacy choice should apply.

**Detection:**
- Trail data growing without bound.
- No way to clear the trail in the UI.
- Trail recording when private mode is enabled.

**Phase to address:**
History trail implementation phase. Privacy controls must be present in the initial implementation.

---

## Minor Pitfalls

### Pitfall 11: Tag-Based Similarity Produces Misleading Results for Broad Tags

**What goes wrong:**
Two artists both tagged "rock" and "alternative" have high tag overlap but may sound nothing alike. The tag similarity algorithm is biased by the tag rarity weighting (niche tags contribute more), but if two artists share only broad tags (low uniqueness), the similarity score is inflated. The result: the Rabbit Hole suggests "similar artists" that don't feel similar.

**Prevention:**
- Weight similarity by tag rarity (already planned). Tags with artist_count > 10,000 contribute near-zero to the similarity score.
- Require a minimum of 2 shared tags for a similarity edge.
- Consider a threshold: if the best similarity score for an artist is below X, show "No similar artists found" rather than misleading suggestions.
- Test with well-known artists and verify the similar artists list makes intuitive sense (Radiohead's similar artists should include Sigur Ros, not Green Day).

---

### Pitfall 12: Context Sidebar Competes With Content on Narrow Windows

**What goes wrong:**
The context sidebar sits between the nav sidebar and the main content area. On 1280px-wide displays (common laptop resolution), the nav sidebar is ~200px, the context sidebar would be ~250px, leaving only ~830px for the main content. On 1024px, it's even worse -- ~574px for content, which is cramped for the Rabbit Hole's artist cards and genre lists.

**Prevention:**
- Make the context sidebar collapsible (not always visible). A toggle button or auto-hide below a width breakpoint.
- Consider an overlay panel that appears on hover/click rather than a permanent sidebar.
- Set a minimum content width of 800px. If the window is narrower, the context sidebar collapses automatically.
- Test on 1280x720 resolution specifically (common for laptops and external monitors).

---

### Pitfall 13: "Random" Entry Point Produces Uninteresting Results

**What goes wrong:**
The "Random" button picks a random artist from 2.6M. Most of the long tail consists of artists with 1-2 tags, no releases on major platforms, and no streaming links. The user clicks "Random," sees an artist with no description, no playable music, and two tags. They click "Random" again. Same thing. After 3-4 underwhelming randoms, they stop using the feature.

**Prevention:**
- Filter random selection to artists with >= 3 tags AND at least one streaming link (Bandcamp/Spotify/YouTube URL in MB data). This subset is much smaller but produces better results.
- Alternatively, weight random selection by uniqueness score. Higher-uniqueness artists are more interesting discoveries.
- Provide a "Random in [genre]" option alongside pure random. Constrained randomness produces more relevant results.
- Show a quick-loading preview (name, tags, country) before committing to the full page load. If the preview looks empty, auto-skip to the next random.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Pipeline: similar artists | DB size explosion (P1) | CRITICAL | Measure on sample, cap at top-10, filter by tag count >= 3 |
| Pipeline: Wikidata geocoding | Timeout + low coverage (P4) | CRITICAL | Batch queries, accept 5-12% coverage, country centroid fallback |
| Rabbit Hole UI | Dead ends from missing data (P2) | CRITICAL | Keep old views until parity checklist passes |
| Rabbit Hole UI | Memory accumulation (P6) | MODERATE | Limit in-memory history, cache in singleton map not page data |
| World Map | Rendering crash at scale (P3) | CRITICAL | Supercluster + canvas renderer + viewport-only loading |
| Caching layer | Rate limit queuing (P5) | CRITICAL | Build cache BEFORE Rabbit Hole UI, cancel stale requests |
| Caching layer | Unbounded growth (P9) | MODERATE | LRU eviction, separate cache.db, TTL |
| History trail | Privacy exposure (P10) | MODERATE | Respect private mode, auto-trim, clear button |
| AI companion | Stale responses (P8) | MODERATE | Debounce context updates, lazy init, cancel in-flight |
| Decade filtering | Empty results (P7) | MODERATE | Precompute counts, show only populated decades |
| Context sidebar | Narrow window cramping (P12) | MINOR | Collapsible, auto-hide below breakpoint |
| Random entry | Uninteresting results (P13) | MINOR | Filter by tag count + streaming link availability |

---

## Integration Risk Matrix

| New Feature | Depends On | If Dependency Fails | Risk Level |
|-------------|-----------|---------------------|------------|
| Rabbit Hole navigation | Similar artists table | Core loop has no "similar artists" links -- major dead end | HIGH |
| World Map pins | Wikidata geocoding | Map shows only genre pins (4K), not artist pins | MEDIUM (degraded but functional) |
| "Continue" button | History trail storage | Feature doesn't work, but rest of Rabbit Hole is fine | LOW |
| AI companion | llama-server running | AI panel hidden (already conditional on AI connected) | LOW |
| Track display | MB API cache | First-visit artists load slowly but still work | LOW |
| Decade filter | `begin_year` data quality | Some decades empty or misleading | LOW |

---

## "Looks Done But Isn't" Checklist

- [ ] **Similar artists table size:** Measured on full dataset? Under 500MB? D1 storage confirmed sufficient?
- [ ] **Rabbit Hole dead ends:** Visited 20 random artists -- every page has 3+ clickable links?
- [ ] **World Map load time:** Opens in < 3 seconds with production data? Pan/zoom at 30+ FPS?
- [ ] **Rate limit compliance:** Network panel shows <= 1 MB request per second during rapid browsing?
- [ ] **Cache eviction:** After 10,000 artist visits, cache.db is under 200MB? Old entries evicted?
- [ ] **Memory stability:** After 100 consecutive navigations, WebView2 memory is under 500MB?
- [ ] **History trail privacy:** Private mode on -- trail is not recorded? "Clear trail" button works?
- [ ] **Old views accessible:** Style Map, KB, Time Machine, Crate Dig still reachable via direct URL?
- [ ] **Decade filter accuracy:** Only populated decades shown? "Year unknown" option present?
- [ ] **AI companion latency:** During rapid browsing, AI doesn't generate responses for already-left pages?

---

## Sources

- [Cloudflare D1 Limits -- 500MB free, 10GB max per database](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare D1 Pricing -- $0.75/GB-month storage](https://developers.cloudflare.com/d1/platform/pricing/)
- [MusicBrainz API Rate Limiting -- 1 request per second, IP blocking for abuse](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)
- [Wikidata SPARQL Query Limits -- 60-second timeout, 60s compute/minute/user](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits)
- [Wikidata SPARQL Query Optimization](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_optimization)
- [Wikidata music band gazetteer -- ~77K bands, ~238K musicians in Wikidata](https://www.textjuicer.com/2019/08/building-a-gazetteer-of-music-bands-using-wikidata/)
- [Supercluster -- clustering millions of points on a map (Mapbox)](https://blog.mapbox.com/clustering-millions-of-points-on-a-map-with-supercluster-272046ec5c97)
- [Leaflet markercluster vs Supercluster performance comparison](https://github.com/AndrejGajdos/leaflet-markercluster-vs-supercluster)
- [Leaflet performance with large marker counts](https://medium.com/@silvajohnny777/optimizing-leaflet-performance-with-a-large-number-of-markers-0dea18c2ec99)
- [Handling millions of points with Leaflet without crashing](https://alfiankan.medium.com/handle-millions-of-location-points-with-leaflet-without-breaking-the-browser-f69709a50861)
- [Canvas-based high performance map rendering](https://chairnerd.seatgeek.com/high-performance-map-interactions-using-html5-canvas/)
- [SvelteKit memory increase after multiple navigations -- GitHub #12405](https://github.com/sveltejs/kit/issues/12405)
- [SvelteKit memory leak investigation -- GitHub #9427](https://github.com/sveltejs/kit/issues/9427)
- [SQLite performance tuning for large databases](https://phiresky.github.io/blog/2020/sqlite-performance-tuning/)
- [SQLite optimizations for high performance (PowerSync)](https://www.powersync.com/blog/sqlite-optimizations-for-ultra-high-performance)
- [Feature flags for migration risk mitigation (LaunchDarkly)](https://launchdarkly.com/blog/feature-flagging-to-mitigate-risk-in-database-migration/)
- Direct codebase review: `src/lib/db/provider.ts`, `src/lib/db/http-provider.ts`, `src/lib/db/queries.ts`, `src-tauri/src/ai/taste_db.rs`, `src/lib/taste/history.ts`, `pipeline/import.js`, `ARCHITECTURE.md`, `docs/discovery-redesign-research.md`

---
*Pitfalls research for: Discovery redesign (v1.7 "The Rabbit Hole") -- unified click-through exploration, geographic map, tag-based similarity, live data caching added to existing Tauri 2.0 + Svelte 5 desktop app (BlackTape)*
*Researched: 2026-03-03*
