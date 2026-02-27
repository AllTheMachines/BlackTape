# Mercury (working title)

## What This Is

A music discovery engine that indexes 2.8M+ artists from open databases, lets you explore through atomic tags, and embeds players from wherever the music already lives — Bandcamp, Spotify, SoundCloud, YouTube. Runs as a Tauri desktop app with a local SQLite database (offline-first). Not a platform. Not a streaming service. A search engine that becomes an ecosystem — with multi-source streaming (Spotify Connect, YouTube, SoundCloud, Bandcamp), a source switcher UI, service priority ordering, consistent design system, full queue management, artist relationship data, cross-linked discovery tools, and intelligent search.

v1.6 shipped: multi-source streaming — Spotify PKCE OAuth + Connect API playback, YouTube/SoundCloud/Bandcamp embeds, source switcher on every artist page, service priority drag-to-reorder, community features cleaned from UI, artist claim form. App is ready for public release.

## Core Value

Uniqueness is rewarded — the more niche you are, the more discoverable you become.

## Requirements

### Validated

- ✓ Data pipeline ingests MusicBrainz dumps into SQLite + FTS5 (2.8M artists) — v1.0
- ✓ Search 2.8M artists instantly from offline desktop — v1.0
- ✓ Artist profile pages with embedded players (Bandcamp, Spotify, SoundCloud, YouTube) — v1.0
- ✓ Tag display, tag-click navigation, tag intersection discovery — v1.0
- ✓ Desktop app with local SQLite (offline search), torrent distribution, auto-updater — v1.0
- ✓ Tag-based discovery with niche-first composite ranking and uniqueness scoring — v1.0
- ✓ Crate Digging Mode — serendipitous filtered browsing — v1.0
- ✓ Style map — D3 force visualization of tag relationships — v1.0
- ✓ Knowledge base — genre graph, scene maps, time machine, liner notes — v1.0
- ✓ Client-side AI recommendations from taste profile (open models, offline) — v1.0
- ✓ Natural-language discovery queries — v1.0
- ✓ AI-generated summaries for genres, artists, scenes — v1.0
- ✓ Taste profiling — builds from listening history, playback, collection — v1.0
- ✓ Underground aesthetic — OKLCH taste theming, panel layouts, streaming preference — v1.0
- ✓ Release pages with 5-platform buy links and affiliate disclosure — v1.0
- ✓ Pseudonymous identity — handles + pixel art avatars, local-first, no account — v1.0
- ✓ Collections / shelves — save artists and releases, multiple named shelves — v1.0
- ✓ Taste Fingerprint — generative D3 constellation unique to each user — v1.0
- ✓ Communication layer — NIP-17 encrypted DMs, NIP-28 scene rooms, ephemeral sessions — v1.0
- ✓ AI scene detection + scene directory with follow/suggest/vote interactions — v1.1
- ✓ Embeddable curator widgets, QR codes, RSS/Atom feeds for every page — v1.1
- ✓ Curator attribution + New & Rising first-discovery signals — v1.1
- ✓ Zero-click confidence — Playwright CDP E2E runner wired to live Tauri app, 22 Rust unit tests, pre-commit gate — v1.2
- ✓ `data-ready` signals on all D3 force simulations — deterministic test assertions — v1.2
- ✓ NProgress-style navigation progress indicator with startProgress/completeProgress API — v1.2
- ✓ Artist support links (Patreon/Ko-fi/crowdfunding) visually distinct + Mastodon share on artist/scene pages — v1.3
- ✓ Artist stats dashboard — uniqueness score, rarest tag, tag distribution, silent visit tracking — v1.3
- ✓ AI artist summaries — MusicBrainz-grounded, always labeled, cached in taste.db, regeneratable — v1.3
- ✓ Static site generator — self-contained HTML export with cover art, XSS-safe, zero Mercury dependency — v1.3
- ✓ Synchronized listening rooms via Nostr — host YouTube control, jukebox queue, participant presence — v1.3
- ✓ ActivityPub outbound — static AP actor export (actor.json + webfinger.json + outbox.json) for self-hosted Fediverse presence — v1.3
- ✓ v1.4 design system — CSS custom properties (layered dark greys, amber accent, 2px radius), custom Tauri titlebar, restyled app chrome, global base styles — v1.4
- ✓ Artist page redesign with MusicBrainz relationships (band members, influenced-by, labels), linked release credits, discography type filter + date sort, Mastodon "Share" label — v1.4
- ✓ Queue management — TrackRow on every track surface, Play Album/Play All/+ Queue All, slide-up queue panel with drag-reorder, localStorage persistence — v1.4
- ✓ Discover redesign (filter panel + artist grid) + cross-linking across all 7 discovery tools — v1.4
- ✓ Search autocomplete (FTS5 prefix, direct-to-artist), city/label intent parsing, intent chips, per-result match badges — v1.4
- ✓ KB genre page redesign — type badge pill, compact artist rows, colour-coded genre dots, genre map placeholder — v1.4
- ✓ UX cleanup — search type pills, discovery sidebar, dead link filtering, streaming preference UI, scope reduction (community features scoped back) — v1.5
- ✓ Streaming state coordination — activeSource module, service priority drag-to-reorder in Settings, player bar service badge — v1.6
- ✓ Spotify integration — PKCE OAuth guided connect flow, Spotify Connect API top-track playback, clear device-not-found feedback, disconnect/reconnect — v1.6
- ✓ Community features removed from UI (Scenes, Rooms, Chat, Fediverse hidden from all nav surfaces; code preserved) — v1.6
- ✓ YouTube + SoundCloud + Bandcamp embeds — artist page source switcher, EmbedPlayer with autoLoad, SoundCloud Widget API, Bandcamp url= spike confirmed — v1.6
- ✓ Release page Play Album button — activates best available streaming source for that release — v1.6
- ✓ Artist claim form — /claim route, "Are you X? Claim this page" on every artist page, Cloudflare Worker + KV + email notifications, CORS Tauri fix — v1.6

### Active

<!-- v1.7 — TBD, defined during /gsd:new-milestone -->

### Out of Scope

- Audio hosting — audio lives on artist infrastructure, always
- Paid tiers / premium features — everyone gets the same thing
- Algorithmic manipulation — no retention tricks
- Blockchain / tokens / crypto — none
- Tracking / ads — none
- API-for-profit — no businesses building on top
- Vanity metrics — no follower counts, like counts, or play counts, ever
- Spotify Web Playback SDK (in-app audio) — Widevine CDM not available in WebView2 (confirmed unresolved since 2018)
- Bundled Spotify client_id — Spotify Feb 2026 policy: dev cap = 5 users; Extended Access requires 250k MAU + legal entity

## Context

**Steve** — musician (Theatre of Delays, Spenza, Raw Stevens, Vox Sola), label co-founder (Vakant, Kwik Snax), 30 years of electronic music. This comes from lived frustration, not market analysis. Posted about this on Reddit 10 years ago.

**v1.0 shipped 2026-02-23.** Codebase grew to ~24,582 LOC TypeScript/Svelte + Rust.

**v1.1 shipped 2026-02-23.** Phases 11–12: scene building + curator tools.

**v1.2 shipped 2026-02-24.** Test automation milestone complete.

**v1.3 shipped 2026-02-24.** The Open Network — Phases 16–21: sustainability links, stats dashboard, AI summaries, static site generator, listening rooms, ActivityPub outbound. Codebase: ~38,456 LOC.

**v1.4 shipped 2026-02-25.** The Interface — Phases 23–27: full visual redesign, queue management, artist relationships, discovery cross-linking, search improvements. Codebase: ~30,036 LOC TypeScript/Svelte (net reduction from refactoring old styles). 164 code checks passing.

**v1.5 shipped 2026-02-26.** UX Cleanup — Phase 28: 7 plans covering scope reduction, streaming pref UI, dead link filtering, share buttons. 193 code checks passing.

**v1.6 shipped 2026-02-27.** The Playback Milestone — Phases 29–33: multi-source streaming, Spotify integration, embedded players (YouTube/SoundCloud/Bandcamp), artist claim form, UI cleanup. Codebase: ~32,939 LOC TypeScript/Svelte + 4,188 LOC Rust. 193 code checks, 0 failing.

**Tech stack:** SvelteKit (Svelte 5) + Tauri 2.0 + SQLite + FTS5. Client-side AI via llama.cpp sidecar (Qwen2.5 3B) + Nomic Embed. Nostr (NDK) for communications. Cloudflare Worker (artist claim backend).

**Known deployment steps before public launch:**
- Replace auto-updater endpoint placeholder in `tauri.conf.json`
- Set up BlackTape domain + Cloudflare Worker (`blacktape-signups.theaterofdelays.workers.dev` → production URL)

Pre-project research (2026-02-14) saved in ControlCenter:
- `D:/Projects/_ControlCenter/.planning/music-platform/research/` — 4 deep research reports
- `D:/Projects/_ControlCenter/.planning/music-platform/SESSION-2026-02-14.md` — full origin story

## Constraints

- **$0 infrastructure**: No hosting costs (desktop-only, no server).
- **No audio**: Never host audio. Embed from artist platforms only.
- **Open source always**: No decisions that lock into proprietary ecosystems.
- **Codename**: "Mercury" is temporary. Name lives in `src/lib/config.ts` only.
- **Pure public good**: Patronage + grants only. No paid advantages.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SvelteKit over Next.js | Compiles away framework, independent project, Cloudflare adapter | ✓ Good |
| SQLite + FTS5 | Single-file, portable, distributable, free | ✓ Good |
| Slim DB (artists + tags + country only) | "The internet is the database" — fetch details live | ✓ Good |
| Desktop at Phase 3 (not 5) | Unkillable local version too important to delay | ✓ Good |
| No paid tiers ever | Pure public good — music is the only differentiator | ✓ Good |
| MusicBrainz as seed, not dependency | Mercury builds own catalog; survives if MB disappears | ✓ Good |
| Build own style map | Bottom-up from tag co-occurrence; styles emerge from artists | ✓ Good |
| Client-side AI only | No cloud dependency; user data never leaves machine | ✓ Good |
| Nostr for communication | Zero server cost; open protocol; NIP-17 gift-wrap DMs + NIP-28 rooms | ✓ Good |
| OKLCH theming | Perceptually uniform — taste hue shifts don't change apparent brightness | ✓ Good |
| Phase 8 before community | Vibe has to be right before people arrive | ✓ Good |
| Pseudonymous identity | Music speaks, not bios. Local-first, no central account | ✓ Good |
| Tauri-desktop-only (web removed) | Maintenance overhead of dual platform outweighed benefits; desktop is the product; AI only runs locally | ✓ Good |
| Playwright CDP for Tauri E2E | Direct browser protocol (CDP), no extra test framework; Playwright already in codebase | ✓ Good |
| Rust unit test helper extraction | `parse_year_from_tags` extracted to enable isolated testing without full Tauri binary compile | ✓ Good |
| Phases 14–15 outside GSD workflow | Speed over process — test infra sprint; accepted tech debt (no VERIFICATION.md/SUMMARY.md) | ⚠️ Revisit (use GSD for v1.3) |
| CSS custom properties design system (v1.4) | Single theme.css source of truth for all tokens; components reference vars not hardcoded values | ✓ Good |
| TrackRow reusable component pattern (v1.4) | Single component for all track surfaces eliminates duplication; queue actions consistent everywhere | ✓ Good |
| FTS5 prefix search for autocomplete (v1.4) | Leverages existing FTS5 index; prefix-first ORDER BY ensures best matches appear first | ✓ Good |
| onmousedown + 150ms blur delay for autocomplete (v1.4) | Prevents race condition where blur fires before click registers — no JS state hacks needed | ✓ Good |
| Genre map placeholder instead of live ForceGraph (v1.4) | GenreGraph was too heavy for the KB genre page; placeholder acknowledges feature without blocking redesign | — Pending (v1.7 candidate) |
| User-provided Spotify client_id (not bundled) (v1.6) | Spotify Feb 2026 policy blocks bundled IDs at < 250k MAU; user brings own key via Settings wizard | ✓ Good |
| Spotify Connect API over Web Playback SDK (v1.6) | Widevine CDM unavailable in WebView2 — Connect API (controls Spotify Desktop) is the only viable path | ✓ Good |
| Bandcamp url= embed parameter (v1.6) | Spike confirmed: `url=` works in WebView2 (not just iframe src); unlocks album-level embeds from release page | ✓ Good |
| {#key activeService} pattern for embed unmounting (v1.6) | Svelte's keyed blocks destroy/recreate on key change — cleanest way to unmount competing embeds without manual lifecycle | ✓ Good |
| Cloudflare Worker for artist claims (v1.6) | Keeps artist claim backend at $0 infra cost; KV storage + Resend email; CORS covers tauri://localhost | ✓ Good |
| Community features hidden not deleted (v1.6) | Code preserved in $lib/comms/ — only render paths removed; allows revival in v1.7+ if desired | ✓ Good |

---
*Last updated: 2026-02-27 after v1.6 milestone — The Playback Milestone*
