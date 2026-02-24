# Roadmap: Mercury

## Overview

Mercury is a desktop app that becomes a place. The internet is where it gets information. Your machine is where everything lives. The community lives everywhere.

Build order: data pipeline → desktop app → local player → AI → discovery mechanics → knowledge base → underground aesthetic → community foundation → communication → scene building → curator tools → interoperability → listening rooms → artist tools. Phase 0 (sustainability) runs in parallel with everything.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10.1 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** — Phases 11–12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** — Phases 13–15 (shipped 2026-02-24)
- 📋 **v1.3** — Interoperability, Listening Rooms, Artist Tools (planned)

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
<summary>✅ v1.1 Scene Building + Curator Tools (Phases 11–12) — SHIPPED 2026-02-23</summary>

- [x] **Phase 11: Scene Building** — AI scene detection, scene directory, follow/suggest/vote interactions (4/4 plans, completed 2026-02-23)
- [x] **Phase 12: Curator / Blog Tools** — RSS feeds, embeddable widgets, curator attribution, New & Rising page (4/4 plans, completed 2026-02-23)

Note: Original Phases 13–15 (Interoperability, Listening Rooms, Artist Tools) deferred — became v1.3 Phases 16–18.

</details>

<details>
<summary>✅ v1.2 Zero-Click Confidence (Phases 13–15) — SHIPPED 2026-02-24</summary>

- [x] **Phase 13: Foundation Fixes** — Console capture, data-ready signals on D3, NProgress navigation indicator (3/3 plans, completed 2026-02-24)
- [x] **Phase 14: Tauri E2E Testing** — Playwright CDP runner, fixture DB (15 artists), 12 E2E tests (completed 2026-02-24)
- [x] **Phase 15: Navigation Flows + Rust Unit Tests** — 4 flow tests, 22 Rust unit tests, pre-commit hook (completed 2026-02-24)

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 📋 v1.3 — [TBD]

- [ ] **Phase 16: Interoperability** — ActivityPub, Fediverse federation, RSS for everything
- [ ] **Phase 17: Listening Rooms** — Shared real-time listening with synchronized embeds
- [ ] **Phase 18: Artist Tools** — Claiming, dashboard, auto-news, self-hosted site generator

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
| Web search / Cloudflare D1 | Pivoted to Tauri-desktop-only (2026-02-24) — maintenance overhead, no offline-first, no AI | Desktop is the product; web may return as read-only |
| API Contract Layer | Replaced by Tauri E2E — more value to test the actual running app first | v1.3 |
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
| 13. Foundation Fixes | v1.2 | 3/3 | Complete | 2026-02-24 |
| 14. Tauri E2E Testing | v1.2 | done | Complete | 2026-02-24 |
| 15. Navigation Flows + Rust Unit Tests | v1.2 | done | Complete | 2026-02-24 |
| 16. Interoperability | v1.3 | 0/TBD | Not started | - |
| 17. Listening Rooms | v1.3 | 0/TBD | Not started | - |
| 18. Artist Tools | v1.3 | 0/TBD | Not started | - |
