# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Choosing next phase

## Current Position

Phase: 2 of 9 complete (Search + Artist Pages + Embeds)
Plan: 5 of 5 — all complete
Status: Phase 2 COMPLETE — signed off 2026-02-15
Last activity: 2026-02-15 — Visual sign-off, search ranking fix, loading indicator, Spotify fallback

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Phase 2 execution time: ~15min (plans 1-4) + verification session

**By Phase:**
| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1. Data Pipeline | pre-GSD | - | Complete |
| 2. Search + Embeds | 5/5 | ~15min | Complete |

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

### Pending Todos
None

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-02-15
Stopped at: Phase 2 complete. Choosing next phase.
Next options: Phase 3 (Desktop App) or Phase 0 Stage 1 (Sustainability)
