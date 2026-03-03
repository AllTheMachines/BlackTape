---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: The Rabbit Hole
status: defining_requirements
last_updated: "2026-03-03T00:00:00Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03 after v1.7 start)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.7 The Rabbit Hole — discovery redesign

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-03 — Milestone v1.7 started

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

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-03
Stopped at: v1.7 milestone requirements definition
Resume file: None
