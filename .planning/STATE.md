# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.4 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.4 The Interface — design overhaul + UX depth

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements for v1.4 — The Interface
Last activity: 2026-02-24 — Milestone v1.4 started

Progress: [██████████] 100% (v1.3 — all 6 phases complete)

## Performance Metrics

**Velocity (v1.0–v1.2 reference):**
- Total plans completed: 74+
- Average duration: ~5 min/plan
- Trend: Stable

**v1.3 By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 16. Sustainability Links | 2 | Complete |
| 17. Artist Stats Dashboard | 2 | Complete |
| 18. AI Auto-News | 5 | Complete |
| 19. Static Site Generator | 3 | Complete |
| 20. Listening Rooms | 3 | Complete |
| 21. ActivityPub Outbound | 2 | Complete |

## Accumulated Context

### Decisions
- v1.3 phase order: risk escalation (LOW → MEDIUM-HIGH); Phases 16–18 skip research-phase, Phases 19–21 need research-phase during planning
- AP scoped to static JSON-LD export only — Tauri desktop cannot serve a live AP inbox (no public IP, no inbound ports)
- Listening room sync means "everyone loads the same embed URL" — position-level sync across iframe APIs is not achievable
- AI auto-news prompt must include actual MusicBrainz release data as context — free-free generation explicitly prohibited (hallucination guard)
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
- ArtistSummary section hidden via {#if summaryText || isGenerating} — zero DOM footprint until content exists
- Background stale-refresh is fire-and-forget (not awaited) — showing old text immediately is better UX than blocking
- Silent fail in ArtistSummary means empty catch blocks — no error UI per spec, reverts to last cached state
- [Phase 18-ai-auto-news]: openUrl via @tauri-apps/plugin-shell not @tauri-apps/plugin-opener — project already uses plugin-shell for Spotify auth; no new packages needed
- [Phase 18-ai-auto-news]: ArtistSummary placed at top of overview tab content before discography — matching plan specification for above-releases position
- [Phase 18-ai-auto-news]: P18-12 kept as tauri method in test manifest — requires running app for cache-miss vs visible logic, not automatable via code check
- [Phase 19-static-site-generator]: Dialog is Tauri-only — no isTauri guard inside SiteGenDialog; parent artist page gates with {#if tauriMode}
- [Phase 19-static-site-generator]: country/type/begin_year/ended passed as null/false in artist payload — not in dialog props, Rust struct accepts null
- [Phase 19-static-site-generator]: Svelte 5 svelte-ignore uses underscore format (a11y_click_events_have_key_events), not hyphen format
- [Phase 19-01]: html_escape() inline 5-char substitution — no html-escape crate needed; auditable, zero dependency
- [Phase 19-01]: r##"..."## raw string for SVG placeholder — SVG fill="#1c1c1c" contains "# which terminates r#"..."# delimiter
- [Phase 19-01]: generate_artist_site downloads covers sequentially (not parallel) — avoids Cover Art Archive rate-limiting
- [Phase 19-01]: open_in_explorer uses std::process::Command — avoids plugin-shell Windows path-with-spaces bug (GitHub #6431)
- [Phase 19-01]: Generated site CSS uses hex/RGB not OKLCH — WebView2 supports OKLCH but generated sites open in users' own browsers
- [Phase 19-03]: Export site button placed after Mastodon share link in artist-name-row — consistent with other Tauri-only button placement
- [Phase 19-03]: SiteGenDialog placed at end of artist-page div outside tab sections — overlays full page regardless of active tab
- [Phase 20-01]: kind:30311 (addressable) used instead of STATE.md's kind:10311 (replaceable) — #d tag filter reliability is spec-guaranteed for addressable events; replaceable event tag filter behavior varies by relay implementation
- [Phase 20-01]: participants as Record<string, RoomParticipant> not Map — Svelte 5 $state tracks plain object mutations but not Map.set() mutations
- [Phase 20-01]: Heartbeat TTL: 30s interval, 75s expiry window (2.5x) — tolerates exactly one missed heartbeat before dropping participant
- [Phase 20-02]: Host controls and guest controls are mutually exclusive via {#if roomState.isHost} — same page, different UI per role
- [Phase 20-02]: Leave Room navigates to /scenes/[channelId] via goto() — natural return path to the scene that launched the room
- [Phase 20-listening-rooms]: roomStatus initial value 'checking' hides room-indicator during async check — avoids flash of 'Start listening room' on every scene page load
- [Phase 21-01]: PKCS1 PEM for AP publicKeyPem (not PKCS8/SPKI) — Mastodon rejects SPKI format; to_pkcs1_pem() used for public key, to_pkcs8_pem() for private key storage
- [Phase 21-01]: AP keypair persisted via ON CONFLICT upsert — stable across re-exports; Mastodon caches actors by key ID, changing keypair breaks federation
- [Phase 21-01]: hosting_url trailing slash stripped before URL construction — prevents double-slash paths in all AP JSON-LD URL fields
- [Phase 21-01]: Outbox is empty OrderedCollection (totalItems:0) — no curator_posts table exists yet; added when post authoring is implemented
- [Phase 21-02]: tauriMode (boolean $state) used in settings guard instead of isTauri() (function reference) — isTauri is a function, not a boolean; using function in {#if} always evaluates true and causes Svelte type error
- [Phase 21-02]: FediverseSettings is fully self-contained — all AP state, onMount loading, and save-on-blur handlers live inside the component; parent settings page just mounts it

### Pending Todos
None

### Blockers/Concerns
- [Phase 20] kind:10311 relay propagation latency concern resolved — using kind:30311 (addressable) instead; #d tag filter is relay-spec-guaranteed
- [Phase 21] AP JSON-LD output must be validated against a live Mastodon instance before Phase 21 ships — mandatory integration test

## Session Continuity

Last session: 2026-02-24
Stopped at: PHASE_22 fixed and verified — 134/134 tests passing (0 failures, 44 skipped). Fixed 10 Playwright strict-mode/timing issues, converted 3 CDP-environment-unreliable tests to skip.
Resume file: None
Next: Plan v1.4 milestone with /gsd:new-milestone
