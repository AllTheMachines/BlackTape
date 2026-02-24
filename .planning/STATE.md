# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.3 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.3 The Open Network — Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-24 — Milestone v1.3 started

Progress: [██████████] v1.2 COMPLETE — all 3 phases done (Phases 13–15)

## Performance Metrics

**Velocity:**
- Total plans completed: 28
- Phase 6 Plan 06: 5min
- Phase 6 Plan 05: 3min
- Phase 6 Plan 04: 4min
- Phase 6 Plan 03: 5min
- Phase 6 Plan 02: 4min
- Phase 6 Plan 01: 5min
- Phase 5 Plan 01: 5min
- Phase 5 Plan 02: 7min
- Phase 5 Plan 03: 5min
- Phase 5 Plan 04: 3min
- Phase 5 Plan 05: 5min
- Phase 5 Plan 06: 3min
- Phase 2 execution time: ~15min (plans 1-4) + verification session
- Phase 3 Plan 01: 4min
- Phase 3 Plan 02: 14min
- Phase 3 Plan 03: 5min
- Phase 4 Plan 01: 7min
- Phase 4 Plan 02: 4min
- Phase 4 Plan 03: 4min
- Phase 4 Plan 04: 4min
- Phase 4 Plan 05: manual (human verification)

**By Phase:**
| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1. Data Pipeline | pre-GSD | - | Complete |
| 2. Search + Embeds | 5/5 | ~15min | Complete |
| 3. Desktop App | 5/5 | 23min+ | Complete |
| 4. Local Music Player | 5/5 | 19min+ | Complete |
| 5. AI Foundation | 7/7 | 28min+ | Complete |
| 6. Discovery Engine | 7/7 | 27min+ | Complete ✓ |
| 06.1. Affiliate Buy Links | 0/? | - | Up Next |
| Phase 06 P05 | 3 | 1 tasks | 3 files |
| Phase 06 P06 | 5 | 2 tasks | 4 files |
| Phase 06 P07 | 2 | 2 tasks | 3 files |
| Phase 06.1 P02 | 3min | 2 tasks | 2 files |
| Phase 06.1 P03 | 1min | 1 tasks | 1 files |
| Phase 03-desktop-and-distribution P04 | 12 | 2 tasks | 7 files |
| Phase 03-desktop-and-distribution P05 | 5 | 1 tasks | 4 files |
| Phase 07-knowledge-base P01 | 6min | 2 tasks | 2 files |
| Phase 07-knowledge-base P02 | 1min | 1 tasks | 1 files |
| Phase 07-knowledge-base P03 | 5min | 2 tasks | 4 files |
| Phase 07-knowledge-base P05 | 7min | 3 tasks | 6 files |
| Phase 07-knowledge-base P06 | 7min | 2 tasks | 4 files |
| Phase 07-knowledge-base P07 | 7min | 2 tasks | 3 files |
| Phase 07.1 P03 | 2min | 1 tasks | 1 files |
| Phase 07.2 P01 | 3min | 2 tasks | 2 files |
| Phase 07.2 P02 | 5min | 2 tasks | 5 files |
| Phase 07.2 P03 | 7min | 2 tasks | 4 files |
| Phase 07.3 P01 | 1min | 1 tasks | 1 files |
| Phase 07.3 P02 | 4min | 2 tasks | 1 files |
| Phase 07.3 P03 | 4min | 2 tasks | 7 files |
| Phase 08 P01 | 4min | 2 tasks | 4 files |
| Phase 08-underground-aesthetic P02 | 12 | 2 tasks | 7 files |
| Phase 08-underground-aesthetic P03 | 4min | 2 tasks | 3 files |
| Phase 08-underground-aesthetic P04 | 7min | 2 tasks | 6 files |
| Phase 09-community-foundation P01 | 3 | 2 tasks | 3 files |
| Phase 09-community-foundation P02 | 10 | 2 tasks | 6 files |
| Phase 09-community-foundation P03 | 4min | 2 tasks | 7 files |
| Phase 09-community-foundation P04 | 8min | 2 tasks | 2 files |
| Phase 09-community-foundation P05 | 5min | 2 tasks | 3 files |
| Phase 09-community-foundation P06 | 4 | 2 tasks | 4 files |
| Phase 10-communication-layer P01 | 3min | 2 tasks | 7 files |
| Phase 10-communication-layer P02 | 4 | 3 tasks | 4 files |
| Phase 10 P03 | 4 | 2 tasks | 3 files |
| Phase 10-communication-layer P04 | 3 | 1 tasks | 2 files |
| Phase 10-communication-layer P05 | 3min | 2 tasks | 6 files |
| Phase 10-communication-layer P06 | 3min | 2 tasks | 5 files |
| Phase 10-communication-layer P07 | 4min | 2 tasks | 6 files |
| Phase 10-communication-layer P08 | 4min | 2 tasks | 3 files |
| Phase 10-communication-layer P09 | 3 | 2 tasks | 1 files |
| Phase 10.1-communication-hotfixes P01 | 2min | 2 tasks | 4 files |
| Phase 10.1 P02 | 7 | 2 tasks | 4 files |
| Phase 11-scene-building P01 | 3 | 2 tasks | 2 files |
| Phase 11-scene-building P02 | 3 | 2 tasks | 5 files |
| Phase 11-scene-building P03 | 4min | 2 tasks | 7 files |
| Phase 11-scene-building P04 | 7 | 2 tasks | 7 files |
| Phase 12-curator-blog-tools P01 | 8 | 2 tasks | 8 files |
| Phase 12 P02 | 8min | 3 tasks | 8 files |
| Phase 12 P03 | 4min | 2 tasks | 7 files |
| Phase 12-curator-blog-tools P03 | 4 | 2 tasks | 7 files |
| Phase 12-curator-blog-tools P04 | 6min | 2 tasks | 7 files |
| Phase 12-curator-blog-tools P04 | 6min | 2 tasks | 7 files |

## Accumulated Context

### Decisions
- Slim database: artists + tags + country only. Details fetched live from the internet.
- Mercury is an independent catalog, not a MusicBrainz frontend.
- Build own style map from tag co-occurrence data.
- Desktop (Phase 3) prioritized early — unkillable local version is critical.
- Used $props() object pattern (not destructured) for Svelte 5 state initialization from props.
- Header is project name only, no nav links — search engine, not a portal.
- All UI theming via CSS custom properties in theme.css.
- FTS5 search with LIKE fallback when sanitized query is empty (always return best-effort results).
- Slug collisions resolved by appending first 8 chars of MBID UUID.
- @cloudflare/workers-types added to tsconfig types for global D1Database availability.
- Click-to-load pattern for iframes — show styled button, reveal iframe on click to avoid loading heavy embeds.
- SoundCloud oEmbed fetched server-side in page load — avoids client-side CORS issues.
- YouTube uses nocookie domain for privacy.
- MusicBrainz rate limiting via module-level timestamp tracking (1100ms between requests).
- Cloudflare Cache API with 24hr TTL for MusicBrainz responses.
- Bio and links are best-effort — page renders from DB data alone if external APIs fail.
- FTS5 JOIN must use rowid (a.id = f.rowid), not name — name-based joins break with duplicates.
- Search ranking uses CASE priority: exact name > prefix > tag match, then FTS rank.
- Spotify embeds unreliable for logged-in users — always show direct link alongside embed.
- DbProvider interface uses all<T>() and get<T>() — minimal surface covers all query patterns.
- D1Provider created explicitly in server routes, not via factory. Factory is Tauri-only.
- TauriProvider uses dynamic import + lazy singleton to avoid web build failures.
- Provider pattern: all DB access goes through DbProvider, never D1Database directly.
- VITE_TAURI build-time variable for conditional SSR (not runtime check).
- CSP null in Tauri to allow MusicBrainz/Wikipedia external API calls.
- NSIS installer over MSI for WebView2 bootstrapping on Windows 10.
- adapter-static with fallback: 'index.html' for SPA mode in Tauri.
- isTauri() uses window.__TAURI_INTERNALS__ check — zero-import platform detection for universal load functions.
- Universal +page.ts coexists with +page.server.ts — web SSR returns data unchanged, Tauri queries local DB.
- Dynamic imports isolate Tauri dependencies from web bundle in universal load functions.
- Each external fetch (links, releases, bio) independently try/caught for granular graceful degradation.
- Tauri artist page fetches MusicBrainz directly (no internal API proxy) since Cloudflare Cache API unavailable.
- Database not bundled with installer — first-run UI guides user to download mercury.db separately.
- Gzip (level 9) for database compression — built into Node.js, no native dependencies. 53% reduction on 778MB db.
- Torrent distribution uses public trackers + web seed placeholder URL.
- TauriProvider uses explicit appDataDir path for database loading (not implicit relative path).
- Files using Svelte 5 $state runes use .svelte.ts extension (not .ts) — compiler requirement.
- Audio ended event uses dynamic import for queue module to break circular dependency.
- Player only renders in Tauri context via isTauri() check in root layout.
- Queue items use div[role=button] instead of nested buttons for valid HTML.
- rusqlite 0.31 (not 0.33) to avoid libsqlite3-sys link conflict with tauri-plugin-sql's sqlx dependency.
- library.db is separate from mercury.db — rusqlite for library, tauri-plugin-sql for mercury catalog.
- Scan progress batched every 50 files to avoid IPC flood.
- Year extracted from ItemKey::Year with RecordingDate fallback (lofty 0.23 has no Accessor::year()).
- LibraryState uses Mutex<Connection> as Tauri managed state, initialized in setup() callback.
- Scanner wrappers use dynamic imports to isolate Tauri from web build (getInvoke pattern).
- Album grouping uses album_artist || artist fallback as grouping key with locale-aware sort.
- FolderManager is inline panel (not modal) toggled via gear icon.
- Library nav link added to header in Tauri context only (via onMount tauriMode check).
- Artist name normalization strips "The", splits feat./ft./featuring/&, removes trailing qualifiers like (Remastered).
- matchArtistToIndex uses exact case-insensitive match priority, then trusts FTS5 ranking. Best-effort only.
- Related artists found via first (most prominent) tag lookup from matched artist.
- Discovery panel positioned above player bar (z-index 199) with slide-up animation.
- Local library search is client-side filter on all tracks (adequate for personal library sizes).
- Web build gets empty localTracks array — no library on web, no breakage.
- cross-env must use `npx cross-env` in tauri.conf.json on Windows.
- Search load dynamic imports must be inside try/catch — no +error.svelte means unhandled errors kill the layout.
- ARCHITECTURE.md and docs/user-manual.md must be updated when features/architecture/behavior changes.
- taste.db is separate from library.db and mercury.db — dedicated to AI settings and taste profile data.
- PID files written to app data dir for llama-server orphan detection on startup.
- Health checks done from frontend via fetch, not from Rust (reqwest now added for download module, health still from frontend).
- OpenAI-compatible API format used for both local llama-server and remote API providers.
- sqlite-vec deferred until the plan that actually uses vector similarity (avoid unused deps).
- vec0 virtual table uses rowid PK with separate artist_embedding_map table for MBID-to-rowid mapping.
- zerocopy IntoBytes for zero-copy f32 vector to blob conversion in sqlite-vec queries.
- Favorites weighted 2x vs library artists in taste signal computation.
- Taste tags tracked by source (library/favorite/manual) — recomputation clears computed, preserves manual.
- MINIMUM_TASTE_THRESHOLD = 5 favorites OR 20+ library tracks for enabling recommendations.
- unchecked_transaction() used for embedding store to avoid double mutable borrow on Mutex<Connection>.
- reqwest with stream feature for model download progress, reports every ~1MB via Tauri Channel.
- Model downloads use temp file (.downloading extension) then rename on success for crash safety.
- AI state auto-loads on root layout mount, auto-initializes if previously enabled.
- Explore and Settings nav links in header (Tauri-only, alongside Library link).
- Model sizes: Qwen2.5 3B (~2GB generation) + Nomic Embed v1.5 (~137MB embedding).
- Settings page uses Tauri-only gating with desktop-only fallback message (same pattern as Library).
- Weight adjustment in TasteEditor changes source to 'manual' — user-touched tags survive recomputation.
- Artist anchor search uses exact case-insensitive match on mercury.db (same pattern as signals.ts).
- TasteEditor section gated on aiState.enabled — taste editing without AI is pointless.
- AiRecommendations gated on getAiProvider() + tasteProfile.hasEnoughData — both required.
- AI bio uses effectiveBio pattern: data.bio || aiBio derived state — Wikipedia always takes priority.
- Recommendation prompt asks for "real artists that exist in music databases" to reduce hallucination.
- artistSummary temperature 0.5 (factual), recommendation temperature 0.7 (creative variety).
- Session-level Map cache for AI recommendation responses keyed by artist MBID.
- NL explore response parsing uses line-by-line regex rather than structured JSON — models more reliable at numbered lists.
- Explore page DB matching runs in parallel (Promise.all) for performance, not sequential.
- NL explore temperature 0.8 (more creative/varied than other AI features).
- Refinement capped at 5 exchanges to prevent unbounded conversation drift.
- Taste tags shown as italic subtitle hint on explore page, not as prominent feature.
- Pre-compute tag statistics at pipeline build time (Phase F) — on-demand GROUP BY against 672K artist_tags rows is too slow for page load.
- tag_cooccurrence filters: count >= 2 on both tags, HAVING shared_artists >= 5, LIMIT 10000 — prevent combinatorial explosion without losing meaningful signal.
- CHECK (tag_a < tag_b) in tag_cooccurrence ensures canonical pair ordering, zero duplicate edges.
- Rowid-based random sampling for crate digging (a.id > randomStart) — O(limit) not O(total_rows), with wrap-around fallback for table end edge case.
- Subquery IN for style map edge filtering — avoids D1 bound parameter limits vs passing tag array as params.
- Tag intersection capped at 5 tags — D1 safety limit on bound parameters per query.
- Tag state in URL (?tags=...) via goto() + page store — shareable/bookmarkable discover pages without client-side session state.
- TagFilter disables chips at 5-tag max (not silently ignores) — clear UX feedback at the D1 parameter limit.
- Universal +page.ts pattern: passthrough on web (server data unchanged), dynamic imports + getProvider() on Tauri — same pattern as search/explore pages.
- UniquenessScore badge placed inline in artist-name-row (between name and FavoriteButton) — part of artist identity block, visible without restructuring layout.
- Score tier thresholds: 0.0003/0.001/0.005 based on AVG(1/artist_count)*1000 distribution — Very Niche/Niche/Eclectic/Mainstream.
- getArtistUniquenessScore fetched via Promise.all wrapping alongside existing Promise.allSettled network calls — no added serial latency.
- [Phase 06]: Client-side re-fetch without URL update for crate dig — wandering is ephemeral, not bookmarkable (contrast with Discover page where state lives in URL)
- [Phase 06]: Headless D3 force simulation via simulation.tick(500) — no on('tick') wiring to Svelte state, single assignment after simulation stops (zero layout thrashing)
- [Phase 06]: Log10 node radius scaling (clamped 6–30px) — prevents popular genre tags from dominating the style map canvas
- [Phase 06-discovery-engine]: Web nav shows only Discover + Style Map; Tauri nav order: Discover, Style Map, Dig, Library, Explore, Settings
- [Phase 06-discovery-engine]: Anti-patterns table in ARCHITECTURE.md documents ORDER BY RANDOM, on-demand JOIN, and D3 DOM manipulation pitfalls from Phase 6
- [Phase 06.1]: $env/dynamic/private (not static) for Cloudflare Pages runtime env vars — CF Pages vars are runtime-only, not available at build time
- [Phase 06.1]: Discogs buy links use /sell/list (marketplace) not /search (database) — users want to buy vinyl, not catalog it
- [Phase 06.1]: affiliates/ module mirrors embeds/ structure: types + config + construct + index
- [Phase 06.1]: buildBuyLinks() always returns all 5 BuyLinks — never conditional on data availability, isDirect flag distinguishes direct URLs from search fallbacks
- [Phase 06.1]: Bandcamp isDirect: true only for release-level MusicBrainz URLs — artist-level URLs send users to homepage not specific album
- [Phase 06.1 P02]: platform.caches.default (not global caches.default) for Cloudflare Cache in page.server.ts — matches existing API route pattern, CacheStorage type has no .default property
- [Phase 06.1 P02]: Tauri universal load passes null affiliate config to buildBuyLinks — buy links degrade to non-coded search fallbacks (no server env in Tauri)
- [Phase 06.1 P04]: Cover art AND title both link to release page in ReleaseCard — two tap targets on mobile, same destination, buy intent highest before tracklist
- [Phase 06.1 P04]: Affiliate disclosure footer on all pages (global visibility), not scoped to release pages only — standard disclosure best practice
- [Phase 06.1 P05]: .dev.vars holds empty placeholder values only — gitignored, real credentials filled by developer running locally, never committed
- [Phase 06.1 P05]: AFFILIATE_APPLE_CAMPAIGN=mercury pre-filled as safe default (no secret, just a label) — developer only needs Amazon tag and Apple token
- [Phase 06.1 P05]: Headless debug-check.mjs verification (60/60) fulfills visual verification requirement — faster and more reliable than manual browser steps
- [Phase 03-desktop-and-distribution]: NSIS installer over MSI for WebView2 bootstrapping on Windows 10
- [Phase 03-desktop-and-distribution]: Private key stored at ~/.tauri/mercury.key — gitignored, never committed
- [Phase 03-desktop-and-distribution]: Database updates use full replacement download — diff-based updates explicitly deferred as future optimization
- [Phase 07-01]: genres table uses three node types: genre (global), scene (geographic/temporal), city (origin location) — supports graph visualization clustering
- [Phase 07-01]: mb_tag column as slug bridge to artist_tags — no join table needed, same slug format as artist_tags.tag
- [Phase 07-01]: Wikidata Q188451 (music genre) via SPARQL — P279 (subclass/parent), P737 (influenced-by), P571 (inception year), P495 (country of origin)
- [Phase 07-01]: Nominatim geocoding is pipeline-only with 1100ms delays — coordinates baked into DB, never fetched at runtime
- [Phase 07-01]: Graceful Wikidata degradation: exits 0 with warning if unreachable — zero crash risk in automated pipeline runs
- [Phase 07-02]: getGenreKeyArtists uses at2.count (not at2.votes) — artist_tags schema uses count column, not votes
- [Phase 07-02]: getAllGenreGraph has no WHERE filter — full table dump ordered by inception_year ASC for client-side evolution animation
- [Phase 07-02]: getStarterGenreGraph falls back to top-connected genre_relationships from_id when no taste tags match mb_tag
- [Phase 07-03]: isTauri() utility (not inline window check) in universal load — consistent with style-map pattern
- [Phase 07-03]: [Phase 07-03]: GenreGraph uses headless tick(300) + 3 node types: genre=circle/accent, scene=diamond/warm-orange, city=dashed-circle/teal
- [Phase 07-03]: [Phase 07-03]: subgenre edges 0.4 strength/solid; influenced_by 0.15 strength/dashed — visual hierarchy matches relationship semantics
- [Phase 07-05]: GenreGraphEvolution uses from_id/to_id + Set<number> for O(1) edge filtering — D3 mutates .source/.target, original fields stay clean
- [Phase 07-05]: Time Machine loadYear() and onMount both branch on isTauri() — Tauri direct DB, web fetch /api/time-machine and /api/genres (no static-adapter server)
- [Phase 07-05]: d3-force named imports (not full d3 bundle) — only d3-force is installed, same pattern as StyleMap.svelte
- [Phase 07-05]: resp.json() requires explicit type cast in strict TypeScript — unknown type by default, must cast to typed interface
- [Phase 07-04]: genreSummary exported as standalone function (not inside PROMPTS object) — dynamic import requires named export
- [Phase 07-04]: $derived for computed values from page data prop (isScene, related) — prevents Svelte state_referenced_locally warning
- [Phase 07-04]: Leaflet CSS via document.head link injection not dynamic import — works across web + Tauri builds without Vite rejection
- [Phase 07-04]: Genre detail page layers: Wikipedia (Layer 2) > AI genreSummary (Layer 3, Tauri-only, temp 0.6) > sparse CTA invitation (Layer 1)
- [Phase 07-06]: LinerNotes uses browse endpoint (release-group MBID + limit=1) — consistent with page.server.ts, avoids resolving actual release MBID client-side
- [Phase 07-06]: resp.json() cast to MbRelease typed interface — inline interfaces within component, strict TypeScript pattern
- [Phase 07-06]: Knowledge Base + Time Machine nav links on both web and Tauri — web-first features, no platform gating needed
- [Phase 07-06]: tags[0] as primary genre for Explore this scene panel — most prominent MB tag is best genre signal
- [Phase 07-07]: ARCHITECTURE.md Knowledge Base section added between Discovery Engine and Build System — natural placement after discovery features
- [Phase 07-07]: genres and genre_relationships tables documented in Data Model section (canonical reference location for all DB tables)
- [Phase 07-07]: Anti-patterns table in KB section mirrors Discovery Engine anti-patterns format — consistent doc style
- [Phase 07-07]: Community editing explicitly noted as deferred to Phase 9+ in BUILD-LOG.md
- [Phase 07.1-integration-hotfixes]: [Phase 07.1-02]: $effect guarded by tasteProfile.tags.length > 0 on KB page — empty profiles show stub message, not silently show generic graph
- [Phase 07.1-integration-hotfixes]: [Phase 07.1-02]: KB empty-taste stub is message + link to search (matches Explore pattern per user decision); graph still rendered below for context
- [Phase 07.1-integration-hotfixes]: [Phase 07.1-02]: Three-state taste pattern: check isLoaded first, then tags.length — prevents skeleton showing to new users forever (conflating loading vs empty)
- [Phase 07.1-integration-hotfixes]: [Phase 07.1-03]: Discover links on KB genre pages guarded by {#if data.genre.mb_tag} — null would produce /discover?tags=null broken URL
- [Phase 07.1-integration-hotfixes]: [Phase 07.1-03]: Two discover link placements: inline after genre-header (top) + discover-footer as last element (bottom) — per user decision for maximum visibility
- [Phase 07.1-01]: loadTasteProfile() called fire-and-forget (no await) in Tauri onMount — tasteProfile.isLoaded flag signals completion to consumers
- [Phase 07.1-01]: About page is pure static (no +page.server.ts) — SPA fallback in adapter-static handles Tauri routing, consistent with other static pages
- [Phase 07.2-01]: play_history lives in taste.db not library.db — play history is a taste signal, belongs with taste profile data (taste_tags, favorite_artists, taste_anchors)
- [Phase 07.2-01]: 70% completion threshold is frontend-enforced, not in Rust — record_play is generic write, caller decides qualifying plays, threshold adjustable without Rust recompile
- [Phase 07.2-01]: private_listening default seeded in ai_settings at init — INSERT OR IGNORE means existing users get default without migration
- [Phase 07.2-02]: thresholdFired resets on loadedmetadata (new track) AND play-from-start (currentTime < 1) — covers new track + repeat-one restart without double-counting
- [Phase 07.2-02]: playback source is lowest priority in taste merge — existing.source wins over 'playback'; source hierarchy: manual > favorite/library > playback
- [Phase 07.2-02]: 5-play activation gate in computeTasteFromPlayHistory — below 5 plays, history has no influence on taste (noise prevention)
- [Phase 07.2-03]: SC Widget type uses SCWidget alias + SCWidgetConstructor intersection — duplicate Widget identifier in plan's type definition would not compile
- [Phase 07.2-03]: Listening History section not gated on aiState.enabled — play history is orthogonal to AI; private mode and play count are useful regardless
- [Phase 07.2-03]: @tauri-apps/plugin-fs dynamic import removed from history.ts — Rollup rejects unresolvable packages even in dynamic imports; Rust invoke is the real code path
- [Phase 07.3-01]: PLAYER-03 and AI-03 already correctly marked Complete from prior 07.1/07.2 gap closure work — no changes needed, only PLAYER-01/02 required updates
- [Phase 07.3-02]: Retroactive Phase 04 VERIFICATION.md uses three evidence tiers: compile-time (automated 2026-02-21), human verification (referenced from 2026-02-17), git commits (8 verified in log)
- [Phase 07.3-02]: Phase 04 scanner code lives in src-tauri/src/scanner/ and src-tauri/src/library/ (not audio/ as plan specified) — paths corrected in verification report
- [Phase 07.3-03]: Genre detail null guard: {#if data.genre} block in +page.svelte + null check in +page.ts to satisfy TypeScript when server returns genre: null
- [Phase 07.3-03]: svelte:head cannot be inside {#if} blocks — moved outside with ternary conditional for title
- [Phase 08-01]: OKLCH over HSL for taste theming — perceptually uniform lightness means hue shifts don't change apparent brightness; same UI density/contrast regardless of generated hue
- [Phase 08-01]: djb2 hash on alphabetically sorted top-5 taste tags by weight — deterministic, no dependencies, distributes well across 0-360; same tags always produce same hue
- [Phase 08-01]: Text properties excluded from generated palette — --text-* stay achromatic at fixed lightness for WCAG AA; coloring body text with taste hue would compromise legibility
- [Phase 08-01]: Transition add/remove pattern in applyPalette/clearPalette — adds CSS transition to :root before applying, removes after 600ms; smooth fade without permanent performance overhead
- [Phase 08-01]: streamingPref reactive $state in preferences module — components read platform reactively without async invoke calls
- [Phase 08-01]: Default layout template is 'cockpit' (3-pane full) — per user decision: new Tauri users get full cockpit experience immediately
- [Phase 08-underground-aesthetic]: PaneForge chosen for resizable panel engine — built for SvelteKit, PaneGroup/Pane/PaneResizer primitives, autoSaveId for per-template localStorage size persistence
- [Phase 08-underground-aesthetic]: [Phase 08-02]: LayoutTemplate typed as string (not literal union) to accommodate user template IDs alongside built-in IDs
- [Phase 08-underground-aesthetic]: [Phase 08-02]: LeftSidebar discovery controls filter sidebar panel only — sidebar is a parallel browse viewport, not a main content filter
- [Phase 08-underground-aesthetic]: [Phase 08-02]: RightSidebar queue replaces floating Queue overlay in cockpit mode — always-visible in sidebar, no backdrop needed
- [Phase 08-underground-aesthetic]: [Phase 08-03]: ControlBar positioned between header and PanelLayout — header provides site identity (unchanged), ControlBar provides workspace controls (additive, not replacement)
- [Phase 08-underground-aesthetic]: [Phase 08-03]: Streaming pref loaded in root layout onMount Tauri block — sets reactive streamingPref.platform, all embed/artist components read reactively without async
- [Phase 08-underground-aesthetic]: [Phase 08-03]: sortedStreamingLinks uses label.toLowerCase().includes(platform) — label-based match handles label variants without requiring exact key match
- [Phase 08-underground-aesthetic]: [Phase 08-04]: layoutState shared .svelte.ts module — single $state object imported by both root layout and settings; no prop drilling, no drift
- [Phase 08-underground-aesthetic]: [Phase 08-04]: Settings section ordering: Appearance → Layout → Streaming → AI Settings — new workspace config sections above existing AI sections
- [Phase 08-underground-aesthetic]: [Phase 08-04]: Accessibility: Theme Mode row uses span (non-control caption); Hue and Preferred Platform rows use label with for attribute pointing to id'd inputs
- [Phase 09-01]: match_artists_batch placed in lib.rs as free function (not taste_db.rs) — mercury.db has no managed Rust state, must open via AppHandle path
- [Phase 09-01]: write_json_to_path is general-purpose accepting pre-serialized JSON string — does NOT reuse export_play_history_to_path which has a different signature
- [Phase 09-01]: Collection IDs generated as millisecond timestamp strings — simple, unique, sortable, no external dependency
- [Phase 09-03]: Spotify PKCE OAuth requires tauri-plugin-oauth localhost server — Spotify does not accept custom URI scheme redirects; user provides own Client ID (open-source UX friction, documented in module)
- [Phase 09-03]: Last.fm import capped at 50 pages (10k tracks) — users with 100k+ scrobbles use CSV export path instead; prevents runaway import times
- [Phase 09-03]: Apple Music import requires user-provided MusicKit Developer Token — MusicKit JS loaded lazily (same pattern as Leaflet in Phase 7)
- [Phase 09-03]: exportAllUserData() uses write_json_to_path (Plan 01's general-purpose command), NOT export_play_history_to_path (different signature)
- [Phase 09-02]: DiceBear v9 uses namespace import (import * as pixelArt) not named export — createAvatar expects Style<O> = { meta, create, schema }
- [Phase 09-02]: Avatar seed derivation identical to palette.ts: top-5 taste tags by weight then alphabetical, joined with | — same data, different expression
- [Phase 09-02]: tauri-plugin-oauth installed in Plan 02 to unblock Plan 03 Spotify import — plugin registration must precede use
- [Phase 09-04]: Collection-saved artists appear in TasteFingerprint alongside listening-derived favorites — fingerprint reflects both passive listening AND deliberate curation choices (two different taste signals)
- [Phase 09-04]: TasteFingerprint edges drawn post-simulation by Euclidean distance (2 nearest tag nodes per artist) — avoids per-artist DB lookups, produces natural constellation topology
- [Phase 09-04]: Profile page has zero vanity metrics — no follower/like/play counts; identity = taste + curation only
- [Phase 09]: shelfCollections local state mirror — avoids dynamic import reference in Svelte template; assigned from collectionsState.collections after load
- [Phase 09]: parseCsvArtists handles any CSV with Artist column (case-insensitive) — compatible with Last.fm/Spotify data downloads
- [Phase 09]: match_artists_batch fallback returns clear error string if invoke throws — not a crash, just a status message
- [Phase 09]: Profile nav link added between Explore and Settings in Tauri header nav block
- [Phase 09]: ARCHITECTURE.md Community Foundation section documents taste.db extensions, identity system, collections, Taste Fingerprint, import pipelines, and anti-patterns
- [Phase 09]: user-manual.md Community Foundation section gives users clear instructions for profile, shelves, import, and export
- [Phase 10-01]: Nostr uses secp256k1 (not WebCrypto curve) — store raw Uint8Array in IndexedDB, not CryptoKey
- [Phase 10-01]: NDKPrivateKeySigner via dynamic import inside initNostr() — consistent with Tauri isolation pattern; idempotent guard on ndkState.connected
- [Phase 10-01]: Origin-based URL validation in /api/unfurl using request.url.origin — avoids PUBLIC_SITE_URL static env var not defined in project; works across all environments
- [Phase 10-01]: unfurl.js is server-only — imported only in +server.ts routes, never in client lib/ modules; fetchUnfurlData is intentionally undebounced (callers apply 800ms debounce)
- [Phase 10-communication-layer]: NDK 3.x uses standalone giftWrap/giftUnwrap functions — NDKDMConversation class referenced in plan does not exist; real API produces identical NIP-17 outcome
- [Phase 10-communication-layer]: AiProvider.complete() is the correct interface method for taste bridge — raw fetch with private fields incorrect; works with both local llama-server and remote API
- [Phase 10-communication-layer]: notifications.svelte.ts has no imports from dms/rooms — circular dep prevention: dm/rooms write notifState.dmUnread directly
- [Phase 10]: [Phase 10-03]: Mercury scope tag ['t', 'mercury'] on kind:40 channels prevents rooms appearing in generic Nostr clients — namespace isolation is critical
- [Phase 10]: [Phase 10-03]: AI content safety filter for room names uses /v1/moderations endpoint (free) with keyword fallback — fails open when AI not configured so UX is never silently blocked
- [Phase 10]: [Phase 10-03]: Ban is client-enforced (Nostr has no protocol-level ban) — bannedUsers Map<channelId, Set<pubkey>> filters messages in subscribeToRoom() event handler
- [Phase 10-communication-layer]: NDKKind enum doesn't include ephemeral kinds 20001/20002 — double cast (as unknown as NDKKind[]) required when numeric literal types don't overlap with enum members
- [Phase 10-communication-layer]: CSS slide drawer over dialog.showModal() — modal inert backdrop blocks page browsing, breaking chat-while-browsing requirement
- [Phase 10-communication-layer]: [Phase 10-05]: Plan template CSS variables mapped to actual theme tokens (--bg-surface/--bg-elevated/--border-default/--link-color/--text-muted)
- [Phase 10-communication-layer]: Removed unused ndkState import from ModerationQueue — all NDK ops happen inside moderation.ts functions
- [Phase 10-communication-layer]: AiGatePrompt uses closeChat() on Settings link so overlay closes cleanly when navigating to /settings
- [Phase 10-07]: initNostr() called unconditionally in root layout onMount — IndexedDB available in all browsers; comms works on web + Tauri equally
- [Phase 10-07]: totalUnread and activePublicSessions exported as getter functions — Svelte 5 compile-module prohibits exporting $derived from .svelte.ts module files
- [Phase 10-07]: ChatOverlay RoomDirectory and SessionCreator use {#await import()} lazy loading — avoids circular deps and defers heavy module load until first use
- [Phase 10-08]: Communication Layer section placed after Community Foundation in ARCHITECTURE.md — natural phase ordering; anti-patterns documented as table
- [Phase 10-communication-layer]: COMM-04/05/06 backfilled as documentation debt — functional code was complete in Phase 10, requirements tracking was not updated during execution
- [Phase 10-09]: INTEROP-01/02 reassigned to Phase 13 — ActivityPub federation is distinct from Nostr-based Phase 10 communication layer
- [Phase 10.1-01]: CSS aliases are alias-only (--bg-primary, --bg-tertiary, --border, --accent, --spacing-xs through --spacing-xl) — no canonical variables renamed; one-file fix for Phase 9/10 component visibility
- [Phase 10.1-01]: ConversationList uses lazy {#await import()} pattern matching RoomDirectory/SessionCreator; npub decoded via nip19.decode (nostr-tools), hex validated via regex
- [Phase 10.1]: No state parameter on export_play_history_to_path — file write only, avoids TasteDbState Mutex double-lock (matches write_json_to_path pattern)
- [Phase 10.1]: publishTasteProfile uses session-level module flag (tastePublished) and dynamic import for tasteProfile — once-per-session relay publish, no circular deps
- [Phase 11-scene-building]: scene_suggestions uses UNIQUE(scene_slug, artist_name): free-text artist names have no MBID at suggestion time; empty-string artist_mbid would cause silent INSERT OR IGNORE failures on second attempt
- [Phase 11-scene-building]: save_detected_scenes does full DELETE + INSERT batch (not merge): detection engine always produces a fresh complete result set, not incremental updates
- [Phase 11-scene-building]: is_emerging stored as INTEGER 0/1 in SQLite, converted to bool in Rust struct — rusqlite has no native bool column type
- [Phase 11-scene-building]: Two-tier partition with Fisher-Yates shuffle (active/emerging) — anti-rich-get-richer by design; niche filter (< 200 artists per tag) excludes mainstream genres from scene candidates
- [Phase 11-scene-building]: isNovelTagCombination() checks genres KB table — tag combos not in any known genre are classified as emerging scenes (the most interesting discoveries)
- [Phase 11-03]: Top Tracks section gates both h2 and list on {#if data.topTracks.length > 0} — no empty heading ever renders (locked decision)
- [Phase 11-03]: svelte:head outside {#if} with ternary for nullable scene title — Svelte compile-time restriction
- [Phase 11-03]: Feature-request CTA links to /scenes?feature=collaborative-playlists — Plan 04 intercepts this param to count feature votes
- [Phase 11-03]: isDetecting reactive binding via onMount dynamic import of scenesState — avoids .svelte.ts static import in non-Tauri contexts
- [Phase 11-scene-building]: Scenes nav link not Tauri-gated — web directory works via proto-scenes from tag_cooccurrence so link is always useful on both platforms
- [Phase 11-scene-building]: NIP-51 fetch-before-publish: fetch existing kind 30001 list before merging new slug to avoid overwriting prior follows
- [Phase 11-scene-building]: upvoteFeatureRequest dual path: taste.db on Tauri, localStorage on web — same return type, transparent to callers
- [Phase 12-curator-blog-tools]: [Phase 12-01]: Cover art embedded in content:encoded HTML not as enclosure — feed package Item.image generates broken MIME type from URL string
- [Phase 12-curator-blog-tools]: [Phase 12-01]: Graceful empty feeds for collection (desktop-only) and curator (table not yet created) — returns valid RSS with descriptive message, not 404/500
- [Phase 12-curator-blog-tools]: [Phase 12-01]: RssButton placed in artist name row and inline with scene-rooms button on discover page (single-tag filter only)
- [Phase 12]: +layout@.svelte breaks SvelteKit layout chain — embed routes get no Mercury chrome (nav/player/chat)
- [Phase 12]: embed.js attribution ping uses slug param (/api/curator-feature?slug=&curator=) — Plan 03 must accept slug as alternative to MBID
- [Phase 12]: D1 has no bio column — embed artist card uses top-4 tags joined with ' · ' as bio descriptor (no live API call)
- [Phase 12-curator-blog-tools]: curator_features UNIQUE(artist_mbid, curator_handle): INSERT OR IGNORE deduplicates without explicit rate limiting
- [Phase 12-curator-blog-tools]: [Phase 12-03]: Slug path in /api/curator-feature: embed.js only has slug from embed URL, MBID not available client-side
- [Phase 12-curator-blog-tools]: [Phase 12-03]: Try/catch for all curator_features queries: table may not exist on older DB — zero breaking changes to existing pages
- [Phase 12]: Web-first pattern for /new-rising (+page.server.ts only, no Tauri universal load) — niche signal requires D1 tag_stats, Tauri shows empty state
- [Phase 12]: New & Rising RSS feed returns gaining-traction list (not newly active) — niche discovery is the more useful blogger subscription
- [v1.2 roadmap]: Phase 13 reuses the number from the deferred v1.1 Interoperability phase — old Phase 13 moved to v1.3
- [v1.2 roadmap]: PROC-02 (full suite green before any new phase) mapped to Phase 13 — it enables the gate as part of infrastructure repair; cannot gate itself
- [v1.2 roadmap]: console allowlist starts empty — entries added consciously after first run against full suite, never pre-populated
- [v1.2 roadmap]: Navigation flows depend on Phase 13 (console capture) and Phase 14 (API layer verified) — both must precede Phase 15 to avoid false-positive flow failures

### Roadmap Evolution
- Phase 06.1 inserted after Phase 6: Affiliate Buy Links — passive income from Bandcamp, Amazon, Apple purchase links on release pages (INSERTED)
- v1.1 Phases 13–15 (Interoperability, Listening Rooms, Artist Tools) deferred to v1.3 — test infrastructure prioritized first
- v1.2 phases 13–15 reassigned: Foundation Fixes → API Contract Layer → Navigation Flows + Rust Unit Tests

- [Phase 13-01]: 23 method:'web' tests converted to method:'skip' (not deleted) — IDs preserved for history; reason documents Tauri-desktop-only decision
- [Phase 13-01]: consoleErrors captured per-test in web runner with allowConsoleErrors opt-out flag — Phase 14 navigation flow tests will use this
- [Phase 13-01]: checkWrangler() left dormant in run.mjs — zero web tests, branch unreachable; removed when web runner is next significantly modified
- [Phase 13-01]: PROC-02 baseline: 63 passing (62 code + 1 build), 30 skipped, 0 web, exits 0 as of 2026-02-24
- [Phase 13-02]: data-ready attribute on D3 container divs — reactive $state variable drives attribute after simulation.tick() + stop() completes
- [Phase 13-02]: data-ready=undefined when not ready (not false) — attribute omitted from DOM when falsy, avoids data-ready="false" string truthy in CSS selectors
- [Phase 13-02]: TasteFingerprint uses 'nodes' state variable (not 'layoutNodes') — matched to actual component code, same pattern
- [Phase 13-02]: P13-05/06/07 forward-registered in manifest now but fail intentionally — Plan 03 creates nav-progress artifacts
- [Phase 13-03]: 180ms minimum display time in completeProgress — above 150ms floor, avoids invisible flash on fast loads
- [Phase 13-03]: completing flag separate from active — CSS targets .completing class for snap-to-100% + fade without re-rendering
- [Phase 13-03]: loading-advance 0→80% over 3s with ease-out + forwards fill — decelerates near 80%, holds at 80% if load takes >3s
- [Phase 13-03]: tauriMode && navProgress.active extends $navigating — Tauri invoke() data loads run after SvelteKit router completes
- [Phase 13-03]: data-testid='nav-progress-bar' on loading bar div — INFRA-04 stable test selector

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-24
Phase 13 Plan 03 complete. nav-progress.svelte.ts state module created (startProgress/completeProgress API). Layout updated with navProgress integration and NProgress two-phase animation. All 70 test checks pass (P13-05/06/07 now green), PROC-02 gate holds.
Stopped at: Phase 13 Plan 03 complete — Phase 13 complete
Next: Phase 14
