---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: The Rabbit Hole
status: in_progress
stopped_at: Completed 36-01-PLAN.md (World Map route scaffold)
last_updated: "2026-03-04T00:15:00Z"
last_activity: 2026-03-04 — 36-01 World Map route scaffold + leaflet.markercluster
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 11
  completed_plans: 7
---

---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: The Rabbit Hole
status: complete
stopped_at: Completed 35-05-PLAN.md (Genre/tag exploration page — Rabbit Hole)
last_updated: "2026-03-04T14:27:00Z"
last_activity: 2026-03-04 — 35-05 Genre/tag exploration page (Rabbit Hole complete)
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
  percent: 100
  bar: "[██████████] 100%"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03 after v1.7 start)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.7 The Rabbit Hole — discovery redesign

## Current Position

Phase: 36-world-map (IN PROGRESS)
Plan: 36-01 complete → 2/6 plans done (01 route scaffold, 02 layout bypass)
Status: Route scaffold + layout bypass complete; Leaflet init + markers + sidebar + routing remaining
Last activity: 2026-03-04 — 36-01 World Map route scaffold + leaflet.markercluster installed

## Accumulated Context

### Key Technical Patterns (v1.6)

- `{#key activeService}` pattern — Svelte's keyed blocks unmount/remount on key change; use for competing embeds
- CORS null-origin passthrough: `corsOrigin = allowedOrigins.includes(origin) || !origin ? (origin || '*') : fallback`
- Spotify Connect over Web Playback SDK — WebView2 blocks Widevine CDM; Connect API controls running Spotify Desktop
- `<svelte:head>` must be at template root — Svelte 5 constraint; cannot be inside `{#if}` blocks
- Cloudflare Worker KV prefix pattern: `type:${Date.now()}:${identifier}`
- Tauri origins: `tauri://localhost` and `http://tauri.localhost` must both be in CORS allowedOrigins

### Discovery Redesign Context (v1.7)

- Research doc: `docs/discovery-redesign-research.md` — full design conversation captured
- Data audit: 2.6M artists, 26M+ tag associations, 4,086 genres, 10K tag co-occurrence pairs
- Similar artists: build from tag overlap (sonic similarity > factual MB relationships)
- Artist locations: country codes only — need Wikidata SPARQL for city-level geocoding
- Track data: not indexed, fetched live from MB (1 req/sec) — cache after first fetch
- Old graph views (StyleMap, GenreGraph, etc.) code stays as fallback

### Phase 34 Pipeline Foundation (v1.7 data layer) — COMPLETE

- 34-01 DONE: `similar_artists` table populated — 746 symmetric pairs, all integrity checks pass
- Key decision: 4-phase SQL (score unique pairs → symmetric expansion+top-10 → symmetry backfill → top-K enforcement+orphan cleanup) required because the plan's original UNION SQL produced asymmetric pairs and artists exceeding 10 entries
- `pipeline/build-similar-artists.mjs` is idempotent, ready to run against full 2.6M artist DB
- 34-02 DONE: `city_lat`, `city_lng`, `city_precision` columns on artists table; geocoding pipeline via Wikidata SPARQL
- Key decision: 'none' sentinel (not NULL) for confirmed no-Wikidata artists — idempotent re-runs without refetching
- Key decision: explicit rank map { city:3, region:2, country:1 } applied after SPARQL SAMPLE() to guarantee best precision wins
- `pipeline/build-geocoding.mjs` is idempotent, resumable; full 2.6M run ~15-17 hours
- 34-03 DONE: `release_group_cache` + `release_track_cache` tables in taste.db; `get_or_cache_releases` Tauri command
- Key decision: cache-first — check release_group_cache before any MB API call; empty result triggers fresh fetch
- Key decision: track fetch errors are non-fatal — releases always returned even if recordings fetch fails
- Key decision: 1100ms sleep between per-release track fetches within single invocation; concurrent invocations not serialized
- 34-04 DONE: `getSimilarArtists` + `getGeocodedArtists` query functions + `SimilarArtistResult` + `GeocodedArtist` types in queries.ts
- Key decision: both functions degrade gracefully (try/catch → []) for pre-pipeline state — safe to call before full 2.6M pipeline run completes
- Key decision: `GeocodedArtist.city_precision` union type `'city' | 'region' | 'country'` — 'none' excluded by WHERE clause, not in type

### Phase 35 Rabbit Hole (v1.7 UI) — COMPLETE

- 35-01 DONE: Five query functions (searchTagsAutocomplete, getRandomArtist, getRandomArtistByTag, getRelatedTags, getArtistsByTagRandom) + trail.svelte.ts store
- Key decision: offset-based random over ORDER BY RANDOM() — COUNT(*) first, then LIMIT 1 OFFSET random_int avoids O(n log n) sort on 26M+ tag rows
- Key decision: CASE WHEN in getRelatedTags always returns the "other" tag from symmetric co-occurrence pairs
- Key decision: jumpToTrailIndex moves pointer only, does NOT truncate subsequent items — branching history, not stack
- Key decision: $state at module level (Svelte 5 runes compiler macro, no import needed)
- 35-02 DONE: isRabbitHole bypass in root layout + Rabbit Hole sub-layout (exit button + trail bar)
- Key decision: isRabbitHole keeps Titlebar and Player — Tauri chrome stays; nav/PanelLayout/footer suppressed for /rabbit-hole/* routes
- Key decision: LeftSidebar DISCOVERY_MODES single-item array — mode switcher still renders correctly with 1 item
- Key decision: Legacy d3 graph routes removed from nav but not deleted — URLs still reachable, preserved as v2 fallback
- 35-03 DONE: Rabbit Hole landing page — unified search (artists + tags in parallel, 200ms debounce) + Random button
- Key decision: +page.ts is minimal (empty load) — all search runs client-side through DB provider on input events
- Key decision: Search queries artists and tags in parallel via Promise.all — single 200ms debounce covers both
- Key decision: Tag slug uses encodeURIComponent(tag) to handle spaces and special chars in tag URLs
- Key decision: Random button fails silently — null result from getRandomArtist() shows nothing (edge case: empty DB)
- 35-04 DONE: Artist exploration card — artist header, tags, similar artists row, releases (async), play + continue actions
- Key decision: $derived(data) not destructuring into $state — enables reactive updates when navigating in-place between artist slugs
- Key decision: shell.open via @tauri-apps/plugin-shell for streaming links — opens in system browser/native app, not WebView2
- Key decision: Continue fallback chain — similarArtists first; else getRandomArtistByTag on primary tag
- Key decision: Tags not routed through TagChip.svelte — that component hardcodes /search links; Rabbit Hole uses /rabbit-hole/tag/ routes
- 35-05 DONE: Genre/tag exploration page — random 20 artists + related tags + reshuffle
- Key decision: invalidateAll: true in reshuffle goto() forces SvelteKit re-run on same URL — without it, cached load returns same artists
- Key decision: getGenreBySlug wrapped in .catch(() => null) — most tags have no KB entry; failure is expected not exceptional
- Key decision: decodeURIComponent at load, encodeURIComponent at navigation — tags with spaces/special chars round-trip correctly

### Phase 36 World Map (v1.7 map feature) — IN PROGRESS

- 36-01 DONE: leaflet.markercluster installed + /world-map route scaffold (+layout.ts, +page.ts, +page.svelte)
- Key decision: leaflet.markercluster must be dynamically imported in onMount after leaflet itself — not top-level in Svelte
- Key decision: Load function degrades gracefully (try/catch -> artists=[]) for pre-pipeline state
- Key decision: CSS height via calc(100vh - CSS vars with fallbacks) — avoids hardcoding Titlebar/Player pixel values
- 36-02 DONE: isWorldMap bypass in root layout + World Map nav item in Tauri nav
- Key decision: isWorldMap keeps Titlebar and Player — same treatment as isRabbitHole; nav/PanelLayout/footer suppressed for /world-map/* routes
- Key decision: World Map nav link is Tauri-only — feature requires SQLite, no web counterpart

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-04T00:15:00Z
Stopped at: Completed 36-01-PLAN.md (World Map route scaffold)
Resume file: None
