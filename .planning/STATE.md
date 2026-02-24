# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.3 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.3 The Open Network — Phase 16: Sustainability Links

## Current Position

Phase: 16 of 21 (Sustainability Links)
Plan: 02 of 02 complete
Status: Phase 16 complete — ready for Phase 17
Last activity: 2026-02-24 — Phase 16 Plans 01 + 02 complete (Sustainability Links)

Progress: [█░░░░░░░░░] 17% (v1.3 — 1/6 phases complete)

## Performance Metrics

**Velocity (v1.0–v1.2 reference):**
- Total plans completed: 71+
- Average duration: ~5 min/plan
- Trend: Stable

**v1.3 By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 16. Sustainability Links | 2 | Complete |
| 17. Artist Stats Dashboard | TBD | Not started |
| 18. AI Auto-News | TBD | Not started |
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

### Pending Todos
None

### Blockers/Concerns
- [Phase 19] minijinja multi-file template loading needs prototype early in planning — architecture assumes it works as described
- [Phase 20] kind:10311 relay propagation latency: needs empirical validation with Mercury's relay pool during implementation
- [Phase 21] AP JSON-LD output must be validated against a live Mastodon instance before Phase 21 ships — mandatory integration test

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 16-01-PLAN.md — artist Support section + Mastodon share buttons on artist and scene pages
Resume file: None
Next: Phase 17 (Artist Stats Dashboard)
