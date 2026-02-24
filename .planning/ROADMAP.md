# Roadmap: Mercury

## Overview

Mercury is a desktop app that becomes a place. The internet is where it gets information. Your machine is where everything lives. The community lives everywhere.

Build order: data pipeline → web gateway → desktop app → local player → AI → discovery mechanics → knowledge base → underground aesthetic → community foundation → communication → scene building → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10.1 (shipped 2026-02-23)
- ✅ **v1.1** — Phases 11–12 complete; Phases 13–15 deferred to v1.3
- 📋 **v1.2** — Phases 13–15 (Zero-Click Confidence — test automation)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–10.1) — SHIPPED 2026-02-23</summary>

- [x] Phase 1: Data Pipeline — completed 2026-02-14
- [x] Phase 2: Web Gateway (5/5 plans) — completed 2026-02-15
- [x] Phase 3: Desktop App Foundation (5/5 plans) — completed 2026-02-21
- [x] Phase 4: Local Music Player (5/5 plans) — completed 2026-02-17
- [x] Phase 5: AI Foundation (7/7 plans) — completed 2026-02-21
- [x] Phase 6: Discovery Engine (7/7 plans) — completed 2026-02-20
- [x] Phase 06.1: Affiliate Buy Links (5/5 plans) — completed 2026-02-21
- [x] Phase 7: Knowledge Base (7/7 plans) — completed 2026-02-21
- [x] Phase 07.1: Integration Hotfixes (3/3 plans) — completed 2026-02-21
- [x] Phase 07.2: Playback → Taste Signal (3/3 plans) — completed 2026-02-21
- [x] Phase 07.3: Requirements & Verification Cleanup (3/3 plans) — completed 2026-02-21
- [x] Phase 8: Underground Aesthetic (4/4 plans) — completed 2026-02-21
- [x] Phase 9: Community Foundation (6/6 plans) — completed 2026-02-22
- [x] Phase 10: Communication Layer (9/9 plans) — completed 2026-02-23
- [x] Phase 10.1: Communication Hotfixes (2/2 plans) — completed 2026-02-23

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Scene Building + Curator Tools — Phases 11–12 COMPLETE (13–15 deferred to v1.3)</summary>

- [x] **Phase 11: Scene Building** — AI scene detection, label collectives, community-driven creation tools (completed 2026-02-23)
- [x] **Phase 12: Curator / Blog Tools** — Embeddable widgets, attribution, RSS, blog revival (completed 2026-02-23)
- [x] **Phase 13: Interoperability** — [DEFERRED to v1.3] ActivityPub, Fediverse federation, RSS for everything (completed 2026-02-24)
- [ ] **Phase 14: Listening Rooms** — [DEFERRED to v1.3] Shared real-time listening with synchronized embeds
- [ ] **Phase 15: Artist Tools** — [DEFERRED to v1.3] Claiming, dashboard, auto-news, self-hosted site generator

</details>

### 📋 v1.2 — Zero-Click Confidence

- [ ] **Phase 13: Foundation Fixes** — Repair active defects in test infrastructure; add console capture, fix false-green exit codes, eliminate flaky timing, add coverage gaps from Phases 11–12
- [ ] **Phase 14: API Contract Layer** — Prove every endpoint returns the right shape, independent of the UI layer
- [ ] **Phase 15: Navigation Flows + Rust Unit Tests** — Multi-step user journeys tested end-to-end; Rust logic verified in isolation; pre-commit gate and phase test template locked in

---

## Phase Details (v1.1)

### Phase 11: Scene Building
**Goal**: AI detects emerging scenes from collective listening + tag patterns. Scenes surface in a dedicated directory with anti-rich-get-richer tiering. Users can follow scenes and suggest artists. No creation tools ship this phase — scenes emerge automatically.
**Depends on**: Phase 10 (communication), Phase 5 (AI for scene detection)
**Requirements**: COMM-07, COMM-08
**Success Criteria**:
  1. AI scene awareness — detects emerging scenes from collective listening patterns
  2. Label collectives — skipped (deferred: too vague without organic community)
  3. Community-requested creation tools — feature request vote counter ships; actual tools come later
  4. The underground is alive — scenes exist in Mercury that exist nowhere else
**Plans**: 4 plans

Plans:
- [x] 11-01-PLAN.md — taste.db schema (4 scene tables) + 8 Tauri commands
- [x] 11-02-PLAN.md — scene detection algorithm module + AI description prompt
- [x] 11-03-PLAN.md — /scenes directory and /scenes/[slug] detail routes
- [x] 11-04-PLAN.md — follow/suggest/feature-request interactions + nav + web API + docs

### Phase 12: Curator / Blog Tools
**Goal**: Bring music blogs back to life. Give bloggers tools and an audience.
**Depends on**: Phase 6 (discovery), Phase 9 (community foundation)
**Requirements**: BLOG-01, BLOG-02, BLOG-03
**Success Criteria**:
  1. Embeddable widgets (artist cards, search results, curated lists, entire collections)
  2. Attribution: "discovered via [curator]" links — curators get credit
  3. RSS feeds for every artist page, user collection, tag, and curator
  4. First access for curators — early visibility into emerging artists and new additions
  5. Embeddable collections on external websites
  6. QR codes for any collection or curated list
  7. A music blogger has reason to write again
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md — Install feed+qrcode deps + 4 RSS/Atom feed endpoints + RssButton component
- [x] 12-02-PLAN.md — Embed layout + artist/collection embed routes + embed snippet UI + QR code
- [x] 12-03-PLAN.md — Curator attribution: D1 table, /api/curator-feature, artist page display
- [x] 12-04-PLAN.md — New & Rising page + /api/rss/new-rising feed + ARCHITECTURE.md + user-manual.md docs

---

## Phase Details (v1.2)

### Phase 13: Foundation Fixes
**Goal**: The test suite can be trusted as a gate — silent crashes are detected, flaky D3 timing is eliminated, and the Tauri desktop gets an animated navigation progress indicator.
**Depends on**: Nothing (first v1.2 phase — repairs existing infrastructure)
**Requirements**: INFRA-01, INFRA-03, INFRA-04, UX-01, UX-02, UX-03, UX-04, PROC-02
**Note**: WEB-01, WEB-02, WEB-03, INFRA-02 are out of scope — Mercury is Tauri-desktop-only; web/Playwright/wrangler infrastructure is being removed.
**Success Criteria**:
  1. The web.mjs runner captures console.error and pageerror events per test — silent JS crashes can no longer pass undetected
  2. All 23 Playwright web tests removed from manifest; `--code-only` suite exits 0 — PROC-02 gate established
  3. D3 animation components signal completion via `data-ready` attribute — no more hardcoded waitForTimeout delays
  4. New Phase 13 manifest checks use fileContains/fileExists not CSS class selectors — test-stable assertions
  5. Tauri desktop shows an animated NProgress-style top-bar progress indicator on every navigation and data load; bar always animated (never frozen), clears automatically on completion
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md — Remove web tests from manifest + fix console.error capture in web runner (PROC-02 baseline)
- [ ] 13-02-PLAN.md — Add data-ready signals to D3 components + Phase 13 manifest code checks (INFRA-03, INFRA-04)
- [ ] 13-03-PLAN.md — Tauri navigation progress bar: nav-progress.svelte.ts + layout integration (UX-01–UX-04)

### Phase 14: API Contract Layer
**Goal**: Every JSON API endpoint and RSS feed is proven to return the correct shape, status codes, and headers — independent of any browser or UI layer.
**Depends on**: Phase 13 (infrastructure clean — api runner runs against wrangler :8788, inherits fixed exit-code behavior)
**Requirements**: API-01, API-02, API-03, API-04
**Success Criteria**:
  1. Running `node tools/test-suite/run.mjs --phase 14` tests all JSON API endpoints with fetch-based assertions and fails explicitly on shape drift — no endpoint can silently change its response structure
  2. Invalid params, missing required fields, and out-of-range values all return structured error responses with correct HTTP status codes — crashes and unhandled rejections are caught
  3. RSS feed endpoints return a response with `Content-Type: application/rss+xml` or `application/atom+xml` and valid XML structure — feed readers will not silently break
  4. The `/api/unfurl` POST endpoint has a contract test verifying it accepts a URL body and returns the expected shape — the only POST endpoint no longer has zero coverage
**Plans**: TBD

### Phase 15: Navigation Flows + Rust Unit Tests
**Goal**: Multi-step user journeys are tested end-to-end with console error capture active; Rust logic is verified in isolation without compiling the full Tauri binary; a pre-commit gate and mandatory test-plan template prevent future regressions from shipping.
**Depends on**: Phase 13 (console capture active — flow test failures are visible), Phase 14 (API layer verified — flow failures are not data-layer bugs)
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, RUST-01, RUST-02, RUST-03, PROC-01, PROC-03
**Success Criteria**:
  1. The full search → artist → second artist journey runs headlessly with no console.error at any step — navigation state corruption is caught automatically
  2. Artist page → tag click → tag discovery page flow runs headlessly and confirms results render — the core discovery mechanic is end-to-end verified
  3. 404 routes render the error page and empty search renders the empty state UI — error paths are tested, not just the happy path
  4. `cargo test` in `src-tauri/` passes with unit tests for FTS5 query sanitization, the `__data.json` protocol handler, and scanner metadata parsing — Rust logic is verified in isolation without a full binary compile
  5. Every commit runs `--code-only` tests automatically via pre-commit hook and exits non-zero on failure — regressions cannot be committed silently
**Plans**: TBD

---

## Parallel Track: Phase 0 (Sustainability)

Runs alongside everything else. Not blocking any phase. Rolls out in stages as features make new support channels possible.

### Stage 1 — Foundation
- [ ] GitHub Sponsors profile
- [ ] Ko-fi page (one-time micro-donations)
- [ ] Open Collective (transparent group funding)
- [ ] Public finances page in the app (what it costs, what comes in, where it goes)
- [ ] Small, permanent footer link: "Keep this alive" — not a banner, not a modal
- [ ] NLnet Foundation grant application
- [ ] Build log / dev updates as public content

### Stage 2 — Story
- [ ] Patreon with behind-the-scenes content
- [ ] Gentle donation prompt on database download page
- [ ] Liner Notes backer credits page
- [ ] Sticker and patch designs (print-on-demand)

### Stage 3 — Identity (alongside Phase 8-9)
- [ ] Taste Fingerprint prints — personalized posters generated from user collections
- [ ] Discovery tokens — collectible coins/enamel pins with QR codes
- [ ] Supporter Wall integrated into the platform
- [ ] Tote bags

### Stage 4 — Community (alongside Phase 11-12)
- [ ] Artist collaboration merch
- [ ] Milestone drops — limited edition merch when major versions ship
- [ ] Full print-on-demand merch store
- [ ] Affiliate links for artist self-hosting providers

## Deferred

| Feature | Why Deferred | Revisit When |
|---------|-------------|-------------|
| Interoperability (ActivityPub, Fediverse) | Test infrastructure takes priority in v1.2; complex protocol work needs a clean foundation | v1.3 |
| Listening Rooms (shared real-time playback) | Test infrastructure takes priority in v1.2 | v1.3 |
| Artist Tools (claiming, dashboard, site generator) | Test infrastructure takes priority in v1.2 | v1.3 |
| Cross-platform playlist sync | Platform ToS risks, fragile APIs | Core product is solid, legal clarity exists |
| Remote streaming (phone ← home) | NAT traversal, relay servers, infrastructure complexity | Desktop + player mature, users ask for it |
| Database diff-based updates | Full replacement is simpler; diff sizes unknown until MusicBrainz weekly dump testing | Full replacement feels too large for users |
| Licensing model | Open source vs source-available vs custom — depends on sustainability trajectory | When sustainability model is clearer |
| Writing/discussion features | Community should ask for creation tools, not have them imposed | Phase 11+ if community requests |

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Data Pipeline | v1.0 | done | Complete | 2026-02-14 |
| 2. Web Gateway | v1.0 | 5/5 | Complete | 2026-02-15 |
| 3. Desktop App Foundation | v1.0 | 5/5 | Complete | 2026-02-21 |
| 4. Local Music Player | v1.0 | 5/5 | Complete | 2026-02-17 |
| 5. AI Foundation | v1.0 | 7/7 | Complete | 2026-02-21 |
| 6. Discovery Engine | v1.0 | 7/7 | Complete | 2026-02-20 |
| 06.1. Affiliate Buy Links | v1.0 | 5/5 | Complete | 2026-02-21 |
| 7. Knowledge Base | v1.0 | 7/7 | Complete | 2026-02-21 |
| 07.1. Integration Hotfixes | v1.0 | 3/3 | Complete | 2026-02-21 |
| 07.2. Playback → Taste Signal | v1.0 | 3/3 | Complete | 2026-02-21 |
| 07.3. Requirements & Verification Cleanup | v1.0 | 3/3 | Complete | 2026-02-21 |
| 8. Underground Aesthetic | v1.0 | 4/4 | Complete | 2026-02-21 |
| 9. Community Foundation | v1.0 | 6/6 | Complete | 2026-02-22 |
| 10. Communication Layer | v1.0 | 9/9 | Complete | 2026-02-23 |
| 10.1. Communication Hotfixes | v1.0 | 2/2 | Complete | 2026-02-23 |
| 11. Scene Building | v1.1 | 4/4 | Complete | 2026-02-23 |
| 12. Curator / Blog Tools | v1.1 | 4/4 | Complete | 2026-02-23 |
| 13. Foundation Fixes | 3/3 | Complete   | 2026-02-24 | - |
| 14. API Contract Layer | v1.2 | 0/TBD | Not started | - |
| 15. Navigation Flows + Rust Unit Tests | v1.2 | 0/TBD | Not started | - |
