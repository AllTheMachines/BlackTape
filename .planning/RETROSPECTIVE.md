# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.6 — The Playback Milestone

**Shipped:** 2026-02-27
**Phases:** 5 (29–33) | **Plans:** 13 | **Sessions:** 1

### What Was Built
- **Spotify Connect integration** — PKCE OAuth guided wizard, Spotify Connect API top-track playback via user's running Spotify Desktop, clear device-not-found feedback
- **Embedded streaming players** — YouTube IFrame (Error 153 fallback), SoundCloud Widget API (with pause coordination), Bandcamp url= embed (spike confirmed working in WebView2)
- **Source switcher UI** — interactive buttons replacing static service badges on every artist page; {#key} unmounting prevents simultaneous audio
- **Streaming state coordination** — single activeSource module, service priority drag-to-reorder persisted to SQLite, player bar service badge
- **Release page Play Album** — activates best streaming source for that specific release URL
- **Community feature cleanup** — Scenes/Rooms/Chat/Fediverse removed from all nav surfaces; code preserved in $lib/comms/
- **Artist claim form** — /claim route, "Are you X? Claim this page" on every artist page, Cloudflare Worker + KV + Resend email, CORS Tauri fix

### What Worked
- **Wave-based parallel execution** — phases with independent plans (29-01 through 29-04, 32-01 through 32-03) ran in parallel consistently, cutting wall-clock time significantly
- **Bandcamp spike-as-task-1** — made BC-01 a conditional ("spike first, embed if works, else document") instead of blocking the phase; spike passed cleanly
- **Cloudflare Worker for claim backend** — $0 infra cost, KV + Resend handles storage + notification; no new server required
- **{#key} block pattern** — discovered as the cleanest Svelte 5 idiom for embed unmounting; now established pattern for competing media
- **Stale audit handling** — audit ran before phases 30–33 were executed, resulting in `gaps_found` status that was clearly pre-execution; workflow correctly identified this as stale rather than real gaps

### What Was Inefficient
- **ROADMAP.md stale checkboxes** — Phase 31 (v1 Prep) and Phase 33 plan checkboxes weren't auto-updated by the phase complete CLI, required manual fix before milestone archive; add this to CLI or verifier
- **REQUIREMENTS.md PREP-01 stale** — PREP-01 checkbox left unchecked despite Phase 31 completing it and all 12 P31 tests passing; caught at milestone boundary
- **Audit timing** — running `/gsd:audit-milestone` before all phases execute produces stale `gaps_found` status; should only audit when milestone is actually ready for completion review
- **Cloudflare worker in separate repo** — worker code lives in `D:/Projects/blacktapesite/`, not Mercury; the executor had to manage cross-repo commits, which works but adds cognitive overhead

### Patterns Established
- **{#key activeService} for embed unmounting** — Svelte's keyed blocks destroy/recreate on key change; use this whenever competing embeds/media need clean unmounting
- **CORS null-origin wildcard** — Tauri apps may send requests with no Origin header; pattern: `corsOrigin = allowedOrigins.includes(origin) || !origin ? (origin || '*') : fallback`
- **Spotify Connect over Web Playback SDK** — WebView2 blocks Widevine CDM; Connect API (controls running Spotify Desktop) is the only viable in-Tauri Spotify path
- **Worker KV prefix namespacing** — `claim:${Date.now()}:${email}` mirrors `contact:` pattern; use type-prefix for all KV keys
- **`<svelte:head>` must be at template root** — Svelte 5 constraint: cannot be inside `{#if}` blocks; always at top level of template

### Key Lessons
1. **Audit only when ready** — running `/gsd:audit-milestone` mid-milestone generates stale `gaps_found` that must be manually resolved at archive time; reserve audit for when all phases are plausibly complete
2. **ROADMAP checkbox automation gap** — gsd-tools `phase complete` updates STATE.md and ROADMAP.md Progress table but doesn't auto-tick ROADMAP.md phase checkboxes; manual fix required; worth a CLI improvement
3. **Spike-as-task pattern is underused** — the Bandcamp spike (30-min proof-of-concept before building) prevented wasted work on a potentially broken embed path; use this for any "unknown if possible" integration
4. **Cross-repo worker changes** — when a phase touches a sibling repo (blacktapesite), the executor handles commits in both repos but the ROADMAP/STATE tracking only sees the Mercury repo; document this explicitly in phase plans

### Cost Observations
- Model mix: ~100% Sonnet 4.6 (quality profile)
- Sessions: 1 (all 5 phases executed in single session with parallelized wave execution)
- Notable: 13 plans across 5 phases executed in parallel waves — total wall-clock ~25 min

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 10 | 71 | Initial GSD workflow establishment |
| v1.1 | 2 | 8 | First wave-parallel execution |
| v1.2 | 3 | ~3 | Phases 14–15 done outside GSD (accepted tech debt) |
| v1.3 | 7 | 17 | Full GSD workflow, first VERIFICATION.md per phase |
| v1.4 | 5 | 19 | Wave parallelization at scale |
| v1.5 | 1 | 7 | Single-phase milestone (scope reduction + polish) |
| v1.6 | 5 | 13 | Cross-repo executor, Cloudflare Worker integration |

### Cumulative Quality

| Milestone | Code Tests | E2E Tests | Rust Tests | Total |
|-----------|-----------|-----------|------------|-------|
| v1.2 | 59 | 0 | 22 | 81 |
| v1.3 | 87 | 23 | 22 | 132 |
| v1.4 | 153 | 23 | 22 | 198 |
| v1.5 | 193 | 0 (CDP runner paused) | 22 | 215 |
| v1.6 | 193 | 0 | 22 | 215 |

### Top Lessons (Verified Across Milestones)

1. **Wave parallelism pays off** — multi-plan phases with independent plans benefit enormously from parallel execution; scheduling deps correctly is the main skill
2. **Spike before building** — for "unknown if possible" integrations, a 30-min spike-as-task prevents wasted implementation work (Bandcamp url= in v1.6, SoundCloud Widget API in v1.3)
3. **Audit at the right moment** — audit when milestone is complete, not while phases are still in-flight; stale `gaps_found` creates noise at archive time
4. **Checkboxes need CLI support** — ROADMAP.md phase checkboxes don't auto-update; always verify before milestone archive
