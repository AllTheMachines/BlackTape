# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 4 — Local Music Player (Wave 3 complete [04], Plan 05 next)

## Current Position

Phase: 4 of 12 (Local Music Player)
Plan: 4 of 5 complete (wave 1: 04-01 + 04-02, wave 2: 04-03, wave 3: 04-04 discovery bridge)
Status: In progress
Last activity: 2026-02-17 — Completed 04-04 (Unified discovery: artist matching, now-playing panel, local tracks in search)

Progress: [████████░░] 4/5

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Phase 2 execution time: ~15min (plans 1-4) + verification session
- Phase 3 Plan 01: 4min
- Phase 3 Plan 02: 14min
- Phase 3 Plan 03: 5min
- Phase 4 Plan 01: 7min
- Phase 4 Plan 02: 4min
- Phase 4 Plan 03: 4min
- Phase 4 Plan 04: 4min

**By Phase:**
| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1. Data Pipeline | pre-GSD | - | Complete |
| 2. Search + Embeds | 5/5 | ~15min | Complete |
| 3. Desktop App | 5/5 | 23min+ | Complete |
| 4. Local Music Player | 4/5 | 19min | In progress |

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

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-17
Stopped at: 04-04 complete. Next: 04-05 (Phase 4 polish and verification).
Resume: Execute 04-05-PLAN.md (final phase 4 plan).
