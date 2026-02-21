# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 06.1 (Affiliate Buy Links) — next phase to plan and execute.

## Current Position

Phase: 06.1 of 15 (Affiliate Buy Links — starting)
Current Plan: None (run /gsd:plan-phase 06.1 to begin)
Status: Phase 6 COMPLETE — human verification passed 2026-02-21. Advancing to Phase 06.1.
Last activity: 2026-02-21 — Phase 6 verified and closed. All 4 discovery features confirmed working.

Progress: [██████████] 7/7 COMPLETE

## Performance Metrics

**Velocity:**
- Total plans completed: 25
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

### Roadmap Evolution
- Phase 06.1 inserted after Phase 6: Affiliate Buy Links — passive income from Bandcamp, Amazon, Apple purchase links on release pages (INSERTED)

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-21
Phase 6 complete. Human verification passed for all 4 discovery features: /discover (tag intersection), UniquenessScore badge, /crate (Crate Digging, Tauri-only), /style-map (D3 force graph). All Playwright checks passed. VERIFICATION.md written.
Next: Plan Phase 06.1 (Affiliate Buy Links)
