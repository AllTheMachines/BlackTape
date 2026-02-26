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

## v1.3 The Open Network (Shipped: 2026-02-24)

**Phases completed:** 6 phases (16–21), 17 plans
**Code:** ~38,456 LOC (TypeScript/Svelte + Rust) across 80 files changed (+16,547 / −273)
**Timeline:** 1 day (2026-02-24)

**Delivered:** Mercury connects to the open web — sustainability infrastructure, artist tools, synchronized listening rooms, and ActivityPub federation export.

**Key accomplishments:**
1. Artist support links — Patreon/Ko-fi/crowdfunding visually distinct from generic links; Mastodon share buttons on artist + scene pages
2. Artist stats dashboard — uniqueness score, rarest tag, proportional tag distribution chart; silent visit tracking in taste.db
3. AI artist summaries — grounded in MusicBrainz release data, always labeled "AI summary based on MusicBrainz data", cached per artist, regeneratable on demand
4. Static site generator — export any artist page as self-contained HTML + cover art to any local folder; zero Mercury dependency; XSS-safe
5. Synchronized listening rooms — host-controlled YouTube embed via Nostr (kind:30311); jukebox queue with guest suggestions + host approve/reject; participant presence list
6. ActivityPub outbound — RSA keypair + actor.json + webfinger.json + outbox.json export to local directory for self-hosted Fediverse presence

**Audit:** `.planning/milestones/v1.3-MILESTONE-AUDIT.md` — ⚡ TECH DEBT (20/21 requirements satisfied; APUB-03 partial — live Mastodon test pending; no blockers)
**Archive:** `.planning/milestones/v1.3-ROADMAP.md`, `.planning/milestones/v1.3-REQUIREMENTS.md`

---


## v1.4 The Interface (Shipped: 2026-02-25)

**Phases completed:** 5 phases (23–27), 19 plans
**Code:** ~30,036 LOC (TypeScript/Svelte) | 87 files changed (+12,854 / −1,011)
**Timeline:** 2 days (2026-02-24 → 2026-02-25)

**Delivered:** Ground-up visual redesign transforming Mercury from a functional prototype into a real desktop application — consistent design system, full queue management on every track surface, artist relationship data, discovery cross-linking, and smarter search.

**Key accomplishments:**
1. v1.4 design system — CSS custom properties (layered dark greys, amber accent, 2px radius), custom Tauri titlebar, restyled app chrome (topbar, sidebar, player bar), global button/input/badge/tab-bar base styles, TagChip spec
2. Artist page redesign — MusicBrainz relationships (band members, influenced-by, associated labels), linked release credits (producers, engineers), discography type filter (All/Albums/EPs/Singles) + date sort, Mastodon "Share" label
3. Full queue management — TrackRow reusable component on every track surface (search, artist page, release page, library), Play Album / Play All / + Queue All, slide-up queue panel with drag-reorder, localStorage persistence
4. Discover redesign + cross-linking — filter panel + artist card grid, uniqueness score bars, 7 discovery tools cross-linking each other (artist→Style Map, scene→KB, crate/time-machine→Discover/scenes)
5. Search intelligence — FTS5 autocomplete (2-char trigger, 5 suggestions, direct-to-artist navigation), city/label intent parsing ("artists from Berlin", "artists on Warp Records"), intent confirmation chips, per-result match badges, KB genre page redesign

**Archive:** `.planning/milestones/v1.4-ROADMAP.md`, `.planning/milestones/v1.4-REQUIREMENTS.md`

---

## v1.5 UX Cleanup + Scope Reduction (Shipped: 2026-02-26)

**Phases completed:** 1 phase (28), 7 plans
**Timeline:** 1 day (2026-02-26)

**Delivered:** Focused UX cleanup and scope reduction — scenes deferred, dead links filtered, search redesigned with 4 modes (artist/tag/song/label), discovery sidebar added, share flow improved, streaming preference UI established.

**Key accomplishments:**
1. Scenes removed from nav (v2 notice, route preserved for direct access)
2. Dead link filtering on artist pages — all 6 link categories filtered before display
3. Library name detection for scene detection — case-insensitive matching against local music files
4. Search UI redesign — 4 search type pills (Artist / Tag / Song / Label), legacy `mode=` param preserved for backward compat
5. Discovery sidebar — compact icon switcher for all discovery tools, active route highlighted
6. Share improvements — Mastodon first (platform values), Twitter/Bluesky via Web Share API
7. Streaming preference UI — provider-card grid pattern in Settings, preference persistence
8. Test manifest — 183 tests passing (19 PHASE_28 code checks + existing suite)

**Archive:** `.planning/milestones/v1.5-ROADMAP.md`, `.planning/milestones/v1.5-REQUIREMENTS.md`

---

## v1.6 The Playback Milestone (In Progress)

**Phases:** 29+ (starting 2026-02-26)

**Goals:**
1. Spotify integration — PKCE OAuth (bundled client ID), guided step-by-step connection, Web Playback SDK full track streaming
2. YouTube integration — IFrame player (fallback: open-in-browser), no auth required
3. SoundCloud integration — Widget API embeds, no auth
4. Bandcamp integration — embed player, no auth
5. Service resolution — detect available sources per artist, priority order with drag-to-reorder
6. Player bar service indicator + source switcher on artist pages
7. Release page album playback with full track queue

---

