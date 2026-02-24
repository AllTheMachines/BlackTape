# Project Research Summary

**Project:** Mercury — v1.3 "The Open Network"
**Domain:** Open-network integration for a Tauri desktop music discovery engine — ActivityPub outbound, Nostr listening rooms, artist tools, sustainability
**Researched:** 2026-02-24
**Confidence:** HIGH (stack verified against codebase; features scoped against hard desktop constraints; architecture derived from existing patterns; pitfalls verified with official docs)

## Executive Summary

Mercury v1.3 adds four feature areas to a working Tauri 2.0 desktop app that already has a full Nostr stack (NDK v3, NIP-17 DMs, NIP-28 scene rooms), MusicBrainz live-data integration, embedded players, and a local AI sidecar. The most important research conclusion is that the existing codebase already delivers most of v1.3's infrastructure: zero new npm packages are needed, artist support links are already implemented end-to-end (they just need UI rendering), and listening rooms extend NIP-28 infrastructure that is already working. The net-new engineering work is smaller than the feature list implies.

The central architectural constraint that shapes every v1.3 decision is that Mercury is a Tauri desktop app with no public IP, no DNS entry, and no always-on server. This rules out true ActivityPub federation (Mastodon requires a reachable inbox), rules out per-user AP handles, and makes "synchronized audio playback" across third-party embeds impossible. The correct scoping for ActivityPub is static JSON-LD export that the user hosts themselves — not a live AP server running inside Tauri. Listening room sync means "everyone loads the same embed URL" — not timestamp-level position synchronization across incompatible iframe APIs. Any plan that ignores these constraints will produce features that appear to work in development and silently fail in production.

The five new Rust dependencies (axum, tower, rsa, sha2, minijinja) cover the only genuinely new territory: an embedded HTTP server for AP serving in a future live-server scenario, RSA signing for AP HTTP signatures, and a Jinja2 template engine for the artist static site generator. These are additive and low-risk. The recommended build order starts with sustainability links (zero new architecture, immediate value), progresses through artist tools (all extend existing patterns), then listening rooms (extend NIP-28), and places ActivityPub last (highest complexity, most likely to require iteration). This order ensures that if any phase hits unexpected complexity, no downstream phases are blocked.

## Key Findings

### Recommended Stack

The stack for v1.3 is almost entirely what already exists. Every TypeScript/Svelte capability needed — Nostr event publish/subscribe, RSS feed generation, D3 charts, embedded player state management, MusicBrainz live fetch — is already installed and working. The gap is on the Rust side: an embedded HTTP server (axum) is needed if Mercury ever serves AP endpoints live rather than exporting static files, RSA signing (rsa + sha2 crates) is needed for AP HTTP signature compliance, and a template engine (minijinja) is needed to generate the artist static site HTML without unmanageable string concatenation.

The most critical stack decision confirmed by research: do not use actix-web (runtime conflict with Tauri's Tokio), do not use warp (unmaintained since 2022), do not write HTTP signature code from scratch (Mastodon silently rejects malformed signatures with no useful error). axum is the only Rust HTTP library that runs on `tauri::async_runtime::spawn` without spawning a separate thread.

**Core new technologies (Rust-side only):**
- `axum ^0.8` (Rust): Embedded HTTP server for AP endpoint serving — Tokio-native, no runtime conflict with Tauri
- `tower ^0.5` (Rust): Middleware layer required by axum for CORS and routing
- `rsa ^0.9` (Rust): RSA-SHA256 signing for ActivityPub HTTP signatures (cavage-12 draft) — pure Rust, no OpenSSL system dependency
- `sha2 ^0.10` (Rust): SHA-256 Digest header generation for AP signed requests
- `minijinja ^2.0` (Rust): Jinja2-compatible HTML template rendering for the artist static site generator

**Zero new npm packages:** All JS/TS functionality uses existing NDK, feed, SvelteKit, and D3 capabilities. This is a firm finding from codebase inspection, not an assumption.

See `.planning/research/STACK.md` for the complete version compatibility table, alternatives considered, and installation instructions.

### Expected Features

Mercury v1.3 has a clear priority tier based on research. P1 features are all either already implemented (support links) or extend proven patterns with low new risk (share-to-Fediverse, AI news via existing sidecar, sustainability screens). P2 features involve new architecture (AP export, listening rooms) and warrant dedicated research-phase attention during planning. AP WebFinger and true bidirectional federation are architectural non-starters under the $0/no-server constraint and should not appear in the v1.3 roadmap at all.

**Must have (v1.3 core — P1):**
- Artist support links (Patreon/Ko-fi/crowdfunding from MusicBrainz) — already implemented in `categorize.ts`, needs UI rendering only
- Share-to-Fediverse links — URL-scheme button, zero AP protocol work required
- Mercury funding links (Ko-fi/GitHub Sponsors in About screen) — static content
- Backer credits screen — static JSON + NDK Nostr list event
- Listening room host controls + guest track sync — extend NIP-28 with kind:10311 events
- Artist stats: search impressions + profile views — new SQLite schema + event hooks
- AI auto-news on artist profiles — new prompt in `prompts.ts`, reuses llama.cpp sidecar

**Should have (v1.3 after P1 stabilizes — P2):**
- ActivityPub JSON-LD export (static files the user self-hosts) — new `src/lib/activitypub/` module
- Listening room participant list — NIP-38/NIP-53 presence events
- Listening room chat integration — NIP-28 already built for scene rooms
- Artist static site generator — new `src/lib/sitegen/` module + Rust `write_text_to_path` command

**Defer to v1.4+:**
- AP WebFinger + true Fediverse follow functionality — requires infrastructure (hosted server) incompatible with $0 desktop constraint
- Tag trend sparklines in artist tools — requires historical tag co-occurrence schema (significant data work)
- NIP-53 Live Activity discovery for listening rooms — nice-to-have discoverability, not core UX

**Hard anti-features (never):**
- Full bidirectional AP federation from the Tauri app — always-on server requirement contradicts desktop architecture
- Serving AP endpoints live from the desktop app — NAT/firewall make the desktop unreachable
- Audio hosting or relay of any kind — violates Mercury's core rule
- Affiliate commissions on support links — conflict of interest
- Artist claiming, accounts, or verification — Mercury has no auth, no server

See `.planning/research/FEATURES.md` for the complete prioritization matrix, dependency graph, and desktop constraint analysis per feature area.

### Architecture Approach

All four v1.3 feature areas share a common pattern: they extend Mercury's existing module boundaries rather than introducing new architectural layers. Sustainability links are pure frontend extensions of `categorize.ts`. Artist tools are new queries against existing databases via the existing `query_mercury_db` Tauri command. Listening rooms extend `rooms.svelte.ts` with a new kind:10311 event type. ActivityPub adds a new `src/lib/activitypub/` module that writes static JSON files to disk via the existing `write_json_to_path` Tauri command. The only genuinely new Rust commands are for new SQLite tables (artist_news_cache, ap_settings) that require upsert logic.

**Major new components:**
1. `src/lib/activitypub/` — AP JSON-LD type definitions, generator, keypair handling, and file export orchestration
2. `src/lib/comms/listening-rooms.svelte.ts` — kind:10311 publish/subscribe; reactive `listeningRoomState`; cleanup pattern matching existing `rooms.svelte.ts`
3. `src/lib/stats/` — `artist-stats.ts` (SQLite queries for discoverability signals) and `artist-news.ts` (AI prompt + cache)
4. `src/lib/sitegen/` — HTML template types, minijinja-rendered template, generator, and file export
5. New routes: `settings/activitypub/`, `artist/[slug]/stats/`, `about/backers/`
6. Modified: `categorize.ts` (support links), `rooms.svelte.ts` (now-playing section), `prompts.ts` (news prompt), `taste_db.rs` (new tables)

**Key architectural patterns to follow:**
- **Offline-first generation:** Generate static files to disk; user hosts them. Do not attempt to serve live from the Tauri process.
- **Relay-mediated coordination:** Nostr relay pool is the sync layer for listening rooms. No P2P, no Mercury relay.
- **Extend existing Tauri commands:** Use `query_mercury_db` for reads; add new Rust commands only for writes with custom upsert logic.
- **MB link category extension:** New support platforms go into `categorize.ts` FRIENDLY_NAMES — zero new API routes.

See `.planning/research/ARCHITECTURE.md` for the complete component map, data flow diagrams, and recommended build order.

### Critical Pitfalls

Research identified 11 pitfalls. The five most impactful — all of which must be addressed before code is written, not discovered during implementation:

1. **ActivityPub cannot be served from a Tauri desktop app** — The desktop has no public IP, no stable domain, no inbound ports. Mastodon cannot reach it to POST Follow activities. Any plan to serve AP from the Tauri process produces an actor that appears in Mastodon search but cannot be followed. Prevention: scope v1.3 AP to static JSON-LD export only; user uploads to their own static host; defer live inbox to a future serverless Worker implementation.

2. **`+server.ts` routes are dead in the built Tauri binary** — SvelteKit's `adapter-static` produces an SPA with no server runtime. Any `+server.ts` route silently returns 404 or the fallback `index.html` in the built app. It works in `npm run dev` and passes `npm run build` without error, making this invisible until runtime testing. Prevention: never add `+server.ts` for in-app use; all data fetching goes through `+page.ts` direct fetch or Tauri `invoke()` commands.

3. **HTTP signatures for AP push delivery are mandatory and non-trivial** — Mastodon verifies RSA-SHA256 HTTP signatures on every inbound POST. Incorrect header ordering, missing `Digest` header, wrong base64 encoding, or a `keyId` that doesn't resolve to the actor's public key results in silent 401/403 rejection with no error message. Prevention: use the `rsa` crate with the established cavage-12 signing pattern; verify end-to-end with a live Mastodon test account before shipping the AP phase; never write signing code by hand.

4. **Listening room embed synchronization is impossible at the iframe API level** — Bandcamp has no postMessage API. Spotify's Web Playback SDK requires Premium OAuth. SoundCloud's Widget API is async with no timestamp seek guarantee. YouTube requires `enablejsapi=1` and load signaling. Position-level sync across four platforms over Nostr relay latency of 200-2000ms is not technically achievable. Prevention: reframe the feature as "host controls which track/embed is active; guests load the same embed URL." Track switching is the sync primitive, not timestamp seeking.

5. **AI auto-news will hallucinate without factual grounding** — Qwen2.5 3B has a training cutoff and no access to current events. Prompting it with only an artist name will produce confident, plausible, and factually wrong "news" (tour dates, albums, collaborations that don't exist). Prevention: the prompt must include actual MusicBrainz release data (album titles, years, release types) as context; the AI converts structured data to natural language, it does not invent news; always label output as "AI summary based on MusicBrainz catalog data."

See `.planning/research/PITFALLS.md` for the complete 11-pitfall breakdown, integration gotchas, performance traps, security mistakes, UX pitfalls, and the "looks done but isn't" verification checklist.

## Implications for Roadmap

The research is unambiguous about phase ordering: dependencies, risk profile, and the "no new architecture needed" principle for the early phases all point to the same sequence. The 6-phase order from ARCHITECTURE.md is validated by all four research files.

### Phase 1: Sustainability Links
**Rationale:** Zero new architecture. The `support` link category is already implemented in `categorize.ts` — this phase is rendering what already exists plus adding static screens. Delivers immediate user-visible value with no implementation risk. Validates the end-to-end link pipeline before more complex phases depend on it.
**Delivers:** Artist support links (Patreon/Ko-fi visually differentiated on artist pages), share-to-Fediverse button, Mercury funding links in About screen, backer credits screen fetched via NDK.
**Addresses:** All P1 sustainability features from FEATURES.md; share-to-Fediverse (P1, zero AP protocol work).
**Avoids:** Pitfall 6 (sparse MB coverage) — confirm UI degrades gracefully with no support links before any other phase lands.
**Research flag:** Standard patterns. Skip research-phase. All code paths are established.

### Phase 2: Artist Stats Dashboard
**Rationale:** Pure SQLite reads against existing tables via the existing `query_mercury_db` command. New SQLite schema for impression logging is the only new piece. Independent of all other phases.
**Delivers:** Per-artist discovery stats page showing uniqueness score, top tags, tag co-occurrence, profile view count, and search impression count.
**Addresses:** "Search appearance count" and "profile view count" table stakes from FEATURES.md artist tools section.
**Avoids:** Pitfall 7 (MB rate limit pressure) — stats must derive from local SQLite only; zero new MB API calls on stats page render.
**Research flag:** Standard patterns. Skip research-phase. SQLite schema migration and impression-logging hooks are well-understood.

### Phase 3: AI Auto-News
**Rationale:** Extends the existing AI pipeline with one new prompt template. New SQLite cache table in `taste_db.rs` is the only Rust change. Depends on Phase 2 being stable for artist data context.
**Delivers:** 2-3 sentence AI-generated news blurb on artist pages, grounded in MusicBrainz release data, cached per-artist in taste.db, labeled as AI-generated.
**Uses:** Existing llama.cpp sidecar, `ai/engine.ts`, `ai/prompts.ts` (extend), `ai/local-provider.ts`.
**Avoids:** Pitfall 8 (AI hallucination) — prompt must include actual MB release data as context; free-form artist news generation is explicitly prohibited by research findings.
**Research flag:** Standard patterns for the AI prompt extension. Skip research-phase. The hallucination guard is a prompt engineering constraint, not a research question.

### Phase 4: Artist Static Site Generator
**Rationale:** Independent of Phases 1-3 but simpler than Phases 5-6. Introduces minijinja (new Rust dependency) and a `write_text_to_path` Rust command. The Faircamp precedent confirms the pattern is viable; the architecture is well-defined.
**Delivers:** "Generate my site" button on artist pages that produces a self-contained HTML/CSS folder (bio, discography, embedded players, buy links) for the artist to self-host anywhere.
**Uses:** `minijinja ^2.0` (Rust), `tauri-plugin-dialog` (existing), `reqwest` (existing for MB data fetch), `write_text_to_path` (new Rust command).
**Avoids:** Pitfall 9 (XSS in generated HTML) — minijinja auto-escapes by default; Wikipedia bio must be sanitized separately; test with artist name containing `<script>` before shipping.
**Research flag:** Light research-phase recommended. The minijinja template design and HTML sanitization approach deserve a focused planning session before implementation begins. The output format (self-contained inline CSS vs. linked files, single-page vs. multi-page) needs a decision.

### Phase 5: Listening Rooms
**Rationale:** Extends the established NIP-28 room infrastructure with kind:10311 events. Medium complexity — new Nostr event kind requires careful state machine design. Must be built after sustainability and stats phases to avoid scope creep. No dependency on AP.
**Delivers:** Listening rooms where a host picks an embed (Bandcamp/Spotify/YouTube/SoundCloud) and guests see and load the same embed; room participant list; host-only track switching; cleanup on navigation away.
**Uses:** NDK (existing), `rooms.svelte.ts` (extend), kind:10311 custom ephemeral event, `EmbedPlayer` component (existing, used as-is with reactive state binding).
**Avoids:** Pitfall 4 (embed sync impossibility) — "sync" means track URL broadcast only, no position synchronization; Pitfall 5 (Nostr clock skew) — implement monotonic `seq` counter tag; verify subscription cleanup on navigation (memory leak risk).
**Research flag:** Research-phase recommended. The kind:10311 event schema and state machine (host-only authority, seq counter, expiration handling, guest-join catch-up) need detailed design before any code is written. The interaction between `listeningRoomState` and the existing `EmbedPlayer` component is the key integration to specify.

### Phase 6: ActivityPub Outbound (Static Export)
**Rationale:** Most complex and most likely to require iteration. Placed last so no other phase depends on it. The static export pattern (generate files, user hosts them) avoids Pitfalls 1, 2, and 10. AP is intentionally scoped to export-only in v1.3; live inbox handling is v1.4+ territory.
**Delivers:** AP settings page (configure handle, hosting URL), RSA keypair generation per actor (WebCrypto API), export of actor.json/outbox.json/webfinger.json to user-selected directory. Fediverse-compatible actor that can be followed once the user uploads the files.
**Uses:** `axum ^0.8` + `tower ^0.5` (for future live-server evolution), `rsa ^0.9` + `sha2 ^0.10` (for keypair + future HTTP signatures), new `src/lib/activitypub/` module, taste.db `ap_settings` and `ap_outbox` tables.
**Avoids:** Pitfall 1 (serving from desktop) — static export only; Pitfall 2 (+server.ts dead in built app) — AP export is a Tauri command, not a SvelteKit route; Pitfall 10 (AP private key in desktop) — for v1.3 static export, the key is used only to embed a public key in the actor JSON; actual outbound signing is not required until live push delivery is added.
**Research flag:** Research-phase strongly recommended. AP JSON-LD format compatibility with Mastodon must be verified against the live spec before writing the generator. The content-type requirements (`application/activity+json` vs `application/jrd+json`), actor field completeness (inbox field must exist even for outbound-only), and WebFinger JSON structure all have Mastodon-specific nuances documented in PITFALLS.md that require a focused implementation design session.

### Phase Ordering Rationale

- **Risk escalation:** Phases 1-3 carry LOW risk (extend existing patterns with no new architecture). Phase 4 carries LOW-MEDIUM risk (new Rust dependency, new Tauri command, but well-understood pattern). Phase 5 carries MEDIUM risk (new Nostr event kind, relay-dependent behavior). Phase 6 carries MEDIUM-HIGH risk (AP spec compliance is the hardest testing target in the entire milestone).
- **Independence preserves velocity:** Phases 1-4 are fully independent of each other and of Phases 5-6. If listening rooms (Phase 5) hits unexpected relay behavior complexity, the four preceding phases are already shipped.
- **Dependency chain respected:** AI Auto-News (Phase 3) benefits from stats infrastructure (Phase 2) being stable. Listening rooms (Phase 5) depend on the existing NIP-28 rooms infrastructure, which is already working — no dependency on AP.
- **AP is last:** ActivityPub is the most likely candidate to ship in v1.3 with reduced scope and iterate in v1.3.x. Placing it last means it cannot block anything else.
- **Every phase adds E2E tests:** Per Pitfall 11 (pre-commit gate misses runtime failures), each phase completion requires at least 2-3 new `requiresApp: true` entries in the test manifest. This is a hard completion criterion for every phase.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Static Site Generator):** Template output format decision (inline CSS vs. linked files, single-page vs. multi-page), HTML sanitization approach for Wikipedia bio content, minijinja loader configuration for multi-file template sets.
- **Phase 5 (Listening Rooms):** kind:10311 event schema finalization (seq counter, expiration, guest join-sync), state machine spec (host-authority rules, guest-challenge handling), interaction design for "host picks track from artist page" UX flow.
- **Phase 6 (ActivityPub):** AP JSON-LD template validation against live Mastodon instance before building the generator; RSA keypair storage design (taste.db vs. OS keychain); outbox pagination strategy; WebFinger JSON-LD exact structure for `Content-Type: application/jrd+json`.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Sustainability):** All patterns established. `categorize.ts` already maps patronage/crowdfunding. NDK `fetchEvents` used throughout codebase. Static content screens are trivial.
- **Phase 2 (Artist Stats):** Pure SQLite query work. Schema migration follows existing taste_db.rs patterns. No new external integrations.
- **Phase 3 (AI Auto-News):** New prompt template extends established `prompts.ts` pattern. Cache table follows existing SQLite command patterns. Hallucination guard is a prompt constraint, not a research question.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against Cargo.toml, package.json, and codebase. Zero new npm packages confirmed by direct inspection. Rust library versions verified against crates.io. axum/Tauri runtime compatibility confirmed via multiple community reports. |
| Features | HIGH | Desktop constraint analysis verified (adapter-static, NAT/inbox impossibility). MB relationship type UUIDs verified against live MB docs. Embed iframe API limitations verified against platform docs (Bandcamp: no API; Spotify: Premium OAuth required; SoundCloud: async Widget API). |
| Architecture | MEDIUM-HIGH | New component structure derived from existing codebase patterns — HIGH confidence on extensions of established patterns. MEDIUM confidence on AP JSON-LD Mastodon compatibility (no direct precedent for a desktop app generating AP export files; static site AP guides used as proxy). |
| Pitfalls | HIGH | All critical pitfalls verified against official sources. Pitfall 2 (+server.ts dead) verified against Tauri official docs and community discussions. Pitfall 1 (AP serving) verified against ActivityPub W3C spec and Mastodon AP docs. Pitfall 4 (embed sync) verified against platform API docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Live Mastodon AP compatibility:** The AP JSON-LD generator's output format needs to be validated against a live Mastodon instance before Phase 6 is considered complete. The research establishes the correct fields and Content-Types but does not provide a tested end-to-end result. Treat this as a mandatory integration test before Phase 6 ships.
- **kind:10311 relay propagation latency:** The listening room architecture assumes relay latency of ~100-2000ms is acceptable for track-switch events. This needs empirical validation with Mercury's actual relay pool (`nos.lol`, `relay.damus.io`, `nostr.mom`, `relay.nostr.band`) during Phase 5 implementation. If latency is consistently above 3 seconds, the relay selection may need revisiting or the UX needs explicit latency framing.
- **Backer credits Nostr event kind:** Research recommends kind:30000 with a `d` tag for an addressable backer list. This should be confirmed against the NIP-51 spec during Phase 1 implementation to ensure NDK `fetchEvents` interprets it correctly. A signed JSON file in the Mercury repo is the fallback if Nostr-based backer lists prove unreliable.
- **minijinja multi-file template loading:** The Rust minijinja loader API for multi-file templates (index.html, releases.html, links.html) with partials needs to be prototyped before Phase 4 implementation begins. The architecture assumes it works as described; the implementation details should be confirmed early in Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- Mastodon ActivityPub spec (docs.joinmastodon.org/spec/activitypub/) — Actor requirements, inbox field requirement, Content-Type requirements
- Mastodon security docs (docs.joinmastodon.org/spec/security/) — HTTP signature requirements, RSA-SHA256, 12-hour date window
- W3C ActivityPub Specification (w3.org/TR/activitypub/) — Actor, inbox, outbox requirements
- NIP-53 spec (nips.nostr.com/53) — kind:30311 Live Activities, kind:10312 presence
- NIP-51 spec (nips.nostr.com/51) — kind:30003 bookmark sets / addressable lists
- NIP-38 spec (nips.nostr.com/38) — User status events for music listening
- MusicBrainz Artist-URL relationships (musicbrainz.org/relationships/artist-url) — patronage UUID 6f77d54e, crowdfunding UUID 93883cf6
- axum GitHub / crates.io — axum 0.8 current stable, Tokio-native confirmed
- Spotify iFrame API (developer.spotify.com) — Programmatic embed control documentation
- Faircamp static site generator (codeberg.org/simonrepp/faircamp) — Precedent for static musician sites from open data
- Direct codebase inspection: `categorize.ts`, `sessions.svelte.ts`, `rooms.svelte.ts`, `Cargo.toml`, `package.json`, `artist/[slug]/+page.ts`

### Secondary (MEDIUM confidence)
- maho.dev ActivityPub static site guide (2024) — WebFinger structure, actor JSON-LD template, Content-Type requirement
- Paul Kinlan — "Adding ActivityPub to your static site" — WebFinger dynamic parameter handling, inbox as hard blocker
- ActivityPub on a mostly static website (elvery.net) — Practical static site AP limitations, inbox blocker confirmed
- Tauri discussion #2942 — actix-web runtime conflict with Tauri Tokio; community-confirmed workaround
- MoonGuard blog — actix-web in Tauri, axum as simpler alternative

### Tertiary (LOW confidence, needs validation during implementation)
- kind:10311 as Mercury's listening room event kind — Mercury-custom event kind not yet tested against relay pool; behavior is inferred from existing kind:20001/20002 patterns
- AP static file export being followable from Mastodon without live inbox — Theoretical based on static site AP guides; requires live Mastodon end-to-end test to confirm

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
