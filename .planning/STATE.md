# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 5 in progress. AI Foundation infrastructure being built.

## Current Position

Phase: 5 of 12 (AI Foundation)
Plan: 3 of 7 complete (plans 02 executing in parallel)
Status: In progress
Last activity: 2026-02-17 — Completed 05-03-PLAN.md (Embedding Infrastructure + Taste Profile)

Progress: [███░░░░░░░] 3/7

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Phase 5 Plan 01: 5min
- Phase 5 Plan 03: 5min
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
| 5. AI Foundation | 3/7 | 10min+ | In Progress |

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
- Health checks done from frontend via fetch, not from Rust — avoids adding reqwest dependency.
- OpenAI-compatible API format used for both local llama-server and remote API providers.
- sqlite-vec deferred until the plan that actually uses vector similarity (avoid unused deps).
- vec0 virtual table uses rowid PK with separate artist_embedding_map table for MBID-to-rowid mapping.
- zerocopy IntoBytes for zero-copy f32 vector to blob conversion in sqlite-vec queries.
- Favorites weighted 2x vs library artists in taste signal computation.
- Taste tags tracked by source (library/favorite/manual) — recomputation clears computed, preserves manual.
- MINIMUM_TASTE_THRESHOLD = 5 favorites OR 20+ library tracks for enabling recommendations.
- unchecked_transaction() used for embedding store to avoid double mutable borrow on Mutex<Connection>.

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-17
Stopped at: Phase 5, Plans 01+03 complete. Embedding infrastructure and taste profile built.
Resume: `/gsd:execute-phase` with 05-04-PLAN.md (Wave 3) after 05-02 completes.
