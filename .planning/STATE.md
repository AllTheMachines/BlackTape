# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.3 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.3 The Open Network — Phase 18: AI Auto-News

## Current Position

Phase: 18 of 21 (AI Auto-News)
Plan: 02 of TBD complete
Status: Phase 18 IN PROGRESS — Plan 02 done (AI_PROVIDERS, extended AiState, artistSummaryFromReleases prompt)
Last activity: 2026-02-24 — Phase 18 Plan 02 complete (TypeScript AI infrastructure layer)

Progress: [██░░░░░░░░] 33% (v1.3 — 2/6 phases partially complete)

## Performance Metrics

**Velocity (v1.0–v1.2 reference):**
- Total plans completed: 71+
- Average duration: ~5 min/plan
- Trend: Stable

**v1.3 By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 16. Sustainability Links | 2 | Complete |
| 17. Artist Stats Dashboard | 2 | Complete |
| 18. AI Auto-News | TBD | In progress (Plans 01-02 complete) |
| 19. Static Site Generator | TBD | Not started |
| 20. Listening Rooms | TBD | Not started |
| 21. ActivityPub Outbound | TBD | Not started |

## Accumulated Context

### Decisions
- v1.3 phase order: risk escalation (LOW → MEDIUM-HIGH); Phases 16–18 skip research-phase, Phases 19–21 need research-phase during planning
- AP scoped to static JSON-LD export only — Tauri desktop cannot serve a live AP inbox (no public IP, no inbound ports)
- Listening room sync means "everyone loads the same embed URL" — position-level sync across iframe APIs is not achievable
- AI auto-news prompt must include actual MusicBrainz release data as context — free-form generation explicitly prohibited (hallucination guard)
- New Rust deps (minijinja, rsa, sha2) are additive and low-risk; axum/tower held for future live-server scenario
- Zero new npm packages needed for v1.3 — confirmed by codebase inspection in research phase
- Artist support links (`support` category) already implemented in `categorize.ts` — Phase 16 is rendering what already exists
- kind:10311 chosen as Mercury's custom listening room event kind; state machine design needed before implementation
- backer credits Nostr event kind: kind:30000 with `d` tag (NIP-51 addressable list) — confirmed and implemented in Phase 16 Plan 02
- MERCURY_PUBKEY stored as empty string placeholder in config.ts — fills in when Mercury Nostr identity keypair is generated
- Backer names stored directly as 'name' tags on kind:30000 event — no kind:0 profile fetch, single relay round-trip
- Stats tab tier vocabulary locked: Common/Niche/Rare/Ultra Rare — distinct from UniquenessScore badge (Very Niche/Niche/Eclectic/Mainstream)
- Artist visit tracking is fully silent — stored in taste.db artist_visits table, never surfaced in UI, reserved for future local recommendations
- Bar chart in ArtistStats sorts by count (MusicBrainz votes) DESC; rarest tag identified by artist_count ASC (distribution[0])
- Stats tab state is pure Svelte $state (no URL persistence) — switching tabs never causes navigation
- Visit tracking IIFE placed before collections IIFE in onMount for import error isolation
- Phase 16 manifest entries use nostr.svelte.ts in comms (not a dedicated nostr module), MERCURY_PUBKEY in /backers
- artist_summaries uses artist_mbid TEXT PRIMARY KEY — one row per artist, INSERT OR REPLACE for re-generation
- get_artist_summary returns Option<ArtistSummaryRow> (None = cache miss) — cache miss is not an error
- AI summary timestamps captured in Rust via SystemTime::now() — consistent with other taste.db timestamp patterns
- Anthropic routed via aimlapi (not direct) — RemoteAiProvider uses Bearer auth only; Anthropic direct requires x-api-key header which is not supported
- artistSummaryFromReleases named distinctly from PROMPTS.artistSummary — prevents confusion between release-data and tag-based prompt paths
- AI_PROVIDERS affiliate URL hardcoded as constant (not env var) — Tauri desktop has no env var pattern; badge visible before click (full transparency)

### Pending Todos
None

### Blockers/Concerns
- [Phase 19] minijinja multi-file template loading needs prototype early in planning — architecture assumes it works as described
- [Phase 20] kind:10311 relay propagation latency: needs empirical validation with Mercury's relay pool during implementation
- [Phase 21] AP JSON-LD output must be validated against a live Mastodon instance before Phase 21 ships — mandatory integration test

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 18-02-PLAN.md — AI_PROVIDERS config, extended AiState, artistSummaryFromReleases prompt function
Resume file: None
Next: Phase 18 Plan 03 — ArtistSummary component
