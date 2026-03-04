---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: The Rabbit Hole
status: in_progress
stopped_at: Completed 34-02-PLAN.md (artist geocoding pipeline)
last_updated: "2026-03-04T12:31:49Z"
last_activity: 2026-03-04 — 34-02 artist geocoding pipeline complete
progress:
  total_phases: 15
  completed_phases: 14
  total_plans: 49
  completed_plans: 47
  percent: 96
  bar: "[██████████] 96%"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03 after v1.7 start)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.7 The Rabbit Hole — discovery redesign

## Current Position

Phase: 34-pipeline-foundation (in progress)
Plan: 34-02 complete → 34-03 next
Status: Executing phase plans
Last activity: 2026-03-04 — 34-02 artist geocoding pipeline complete

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

### Phase 34 Pipeline Foundation (v1.7 data layer)

- 34-01 DONE: `similar_artists` table populated — 746 symmetric pairs, all integrity checks pass
- Key decision: 4-phase SQL (score unique pairs → symmetric expansion+top-10 → symmetry backfill → top-K enforcement+orphan cleanup) required because the plan's original UNION SQL produced asymmetric pairs and artists exceeding 10 entries
- `pipeline/build-similar-artists.mjs` is idempotent, ready to run against full 2.6M artist DB
- 34-02 DONE: `city_lat`, `city_lng`, `city_precision` columns on artists table; geocoding pipeline via Wikidata SPARQL
- Key decision: 'none' sentinel (not NULL) for confirmed no-Wikidata artists — idempotent re-runs without refetching
- Key decision: explicit rank map { city:3, region:2, country:1 } applied after SPARQL SAMPLE() to guarantee best precision wins
- `pipeline/build-geocoding.mjs` is idempotent, resumable; full 2.6M run ~15-17 hours

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-04T12:31:49Z
Stopped at: Completed 34-02-PLAN.md (artist geocoding pipeline)
Resume file: None
