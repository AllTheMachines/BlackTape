# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 3 — Desktop App Foundation (Wave 1 complete, Wave 2 next)

## Current Position

Phase: 3 of 12 (Desktop App Foundation)
Plan: 2 of 5 complete
Status: In progress — Wave 1 complete (03-01 + 03-02), Wave 2 next (03-03)
Last activity: 2026-02-16 — Completed 03-01 (DB abstraction) and 03-02 (Tauri scaffolding)

Progress: [████░░░░░░] 2/5

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Phase 2 execution time: ~15min (plans 1-4) + verification session
- Phase 3 Plan 01: 4min
- Phase 3 Plan 02: 14min

**By Phase:**
| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1. Data Pipeline | pre-GSD | - | Complete |
| 2. Search + Embeds | 5/5 | ~15min | Complete |
| 3. Desktop App | 2/5 | 18min | In progress |

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

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-16
Stopped at: Wave 1 complete (03-01 + 03-02). Ready for Wave 2 (03-03).
Resume: `/gsd:execute-phase 3` — will auto-skip completed plans and resume from 03-03.
