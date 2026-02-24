# Milestones

## v1.0 MVP (Shipped: 2026-02-23)

**Phases completed:** 15 phases, 71 plans
**Code:** ~24,100 LOC (TypeScript/Svelte + Rust) across 456 files
**Timeline:** 9 days (2026-02-14 → 2026-02-23)

**Delivered:** Full-stack music discovery platform — offline desktop app + local music player + client-side AI + tag discovery engine + knowledge base + underground aesthetic + community + encrypted communication.

**Key accomplishments:**
1. 2.8M artist search engine — offline desktop (local SQLite + FTS5), instant results
2. Tauri 2.0 desktop app — local database, offline-first, torrent distribution, NSIS installer, auto-updater infrastructure
3. Local music player — folder scan, lofty metadata, playback queue, unified discovery integration
4. Client-side AI — Qwen2.5 3B + Nomic Embed, NL exploration, taste profiling with 30-day decay + playback-to-taste signal pipeline
5. Tag-based discovery engine — niche-first composite ranking, crate digging, D3 style map, uniqueness scores
6. Knowledge base — Wikidata genre graph (D3 force), Leaflet scene maps, time machine, liner notes
7. Underground aesthetic — OKLCH taste-based theming, PaneForge cockpit panel layouts, streaming preference
8. Community foundation — pseudonymous identity, DiceBear pixel avatars, collections, D3 taste fingerprint, multi-source import
9. Communication layer — Nostr NIP-17 encrypted DMs, NIP-28 scene rooms, ephemeral listening parties

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 Scene Building + Curator Tools (Shipped: 2026-02-23)

**Phases completed:** 2 phases (11–12), 8 plans
**Timeline:** 1 day (2026-02-23)

**Delivered:** AI scene detection with anti-rich-get-richer tiering, curator/blog tools with embeddable widgets, RSS feeds, and New & Rising signals. Phases 13–15 (Interoperability, Listening Rooms, Artist Tools) deferred to v1.3.

**Key accomplishments:**
1. AI scene detection — detects emerging scenes from collective tag co-occurrence patterns, anti-rich-get-richer tiering, community feature-request voting
2. Scene directory + detail pages — full Tauri integration, follow/suggest/vote interactions, AI-generated descriptions
3. Embeddable curator widgets — artist cards, collections, search results, QR codes for external blogs
4. Curator attribution — "discovered via [curator]" links, curator_features table, artist page display
5. RSS/Atom feeds — every artist page, collection, tag, and New & Rising feed
6. New & Rising page — first-discovery signals, /api/rss/new-rising feed

**Note:** No formal archive (completed prior to v1.1 milestone workflow introduction).
**Audit:** `.planning/v1.1-MILESTONE-AUDIT.md` — ⚡ TECH DEBT (Phase 11 partial audit: 2/2 requirements, web /scenes path hardcoded empty — Tauri path works, deferred)

---

## v1.2 Zero-Click Confidence (Shipped: 2026-02-24)

**Phases completed:** 3 phases (13–15), 3 formal plans + Phase 14–15 direct code deliveries
**Code:** 24,582 LOC (TypeScript/Svelte + Rust)
**Timeline:** 1 day (2026-02-23 → 2026-02-24)

**Delivered:** Full test automation suite with zero-click confidence — Playwright CDP E2E runner wired to live Tauri app, 22 Rust unit tests, pre-commit gate on every commit, NProgress navigation indicator. Every v1 feature provably working without manual intervention.

**Key accomplishments:**
1. Console error capture on every test — silent JS crashes auto-fail the suite (no more Radiohead-passes-silently scenarios)
2. `data-ready` signals on all D3 force simulations (StyleMap, GenreGraph, TasteFingerprint) — deterministic assertions replace flaky timing
3. NProgress-style top-bar navigation indicator — amber line 0→80%→100%+fade, 180ms minimum display, reusable startProgress/completeProgress API
4. Playwright CDP runner wired to live Tauri WebView2 — 12 E2E smoke/search/discovery/error tests with seeded fixture DB (15 known artists)
5. 22 Rust unit tests across 3 modules — FTS5 sanitization (9), `__data.json` protocol handler (4), scanner metadata parsing (9)
6. Pre-commit hook + PROC-03 policy — `--code-only` gate on every commit, every future phase must include TEST-PLAN section

**Archive:** `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.2-MILESTONE-AUDIT.md` — ⚡ TECH DEBT (25/25 requirements satisfied, no blockers; tech debt: Phases 14–15 have no GSD plan files/VERIFICATION.md)

---
