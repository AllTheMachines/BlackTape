# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 2 — Search + Artist Pages + Embeds

## Current Position

Phase: 2 of 6 (Search + Artist Pages + Embeds)
Plan: 4 of 5 in current phase (02-01, 02-02, 02-03, 02-04 complete)
Status: In progress
Last activity: 2026-02-15 — Completed 02-04-PLAN.md (Artist Pages with Embeds)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3.3min
- Total execution time: 13min

**By Phase:**
| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Data Pipeline | pre-GSD | - | - |
| 2. Search + Embeds | 4/5 | 13min | 3.3min |

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

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 02-04 (wave 3). Next: 02-05 (End-to-end visual verification).
Resume file: .planning/phases/02-search-and-embeds/02-05-PLAN.md
