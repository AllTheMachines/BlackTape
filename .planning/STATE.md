# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 3 — Desktop App Foundation

## Current Position

Phase: 3 of 9 (Desktop App Foundation)
Plan: 1 of 5 complete
Status: In progress
Last activity: 2026-02-16 — Completed 03-01-PLAN.md (Database Abstraction Layer)

Progress: [██░░░░░░░░] 1/5

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Phase 2 execution time: ~15min (plans 1-4) + verification session
- Phase 3 Plan 01: 4min

**By Phase:**
| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1. Data Pipeline | pre-GSD | - | Complete |
| 2. Search + Embeds | 5/5 | ~15min | Complete |
| 3. Desktop App | 1/5 | 4min | In progress |

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

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 03-01 (Database Abstraction Layer). Next: 03-02 (Tauri project initialization).
Resume file: .planning/phases/03-desktop-and-distribution/03-02-PLAN.md
