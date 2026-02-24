# Mercury (working title)

## What This Is

A music discovery engine that indexes 2.8M+ artists from open databases, lets you explore through atomic tags, and embeds players from wherever the music already lives — Bandcamp, Spotify, SoundCloud, YouTube. Runs as a Tauri desktop app with a local SQLite database (offline-first). Not a platform. Not a streaming service. A search engine that becomes an ecosystem.

v1.0 shipped: data pipeline → desktop app → local music player → client-side AI → tag discovery engine → knowledge base → underground aesthetic → community foundation → encrypted communication layer.

v1.1 shipped: scene building → curator/blog tools.

v1.2 shipped: test automation complete — Playwright CDP E2E runner, Rust unit tests, pre-commit gate. Web gateway removed — Tauri-desktop-only confirmed.

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

### Active

- [ ] Interoperability — ActivityPub, Fediverse federation (v1.3)
- [ ] Listening rooms — shared real-time synchronized playback (v1.3)
- [ ] Artist tools — claiming, dashboard, auto-news, self-hosted site generator (v1.3)
- [ ] Sustainability infrastructure — sponsors, Ko-fi, Patreon, backer credits

### Out of Scope

- Audio hosting — audio lives on artist infrastructure, always
- Paid tiers / premium features — everyone gets the same thing
- Algorithmic manipulation — no retention tricks
- Blockchain / tokens / crypto — none
- Tracking / ads — none
- API-for-profit — no businesses building on top
- Vanity metrics — no follower counts, like counts, or play counts, ever

## Context

**Steve** — musician (Theatre of Delays, Spenza, Raw Stevens, Vox Sola), label co-founder (Vakant, Kwik Snax), 30 years of electronic music. This comes from lived frustration, not market analysis. Posted about this on Reddit 10 years ago.

**v1.0 shipped 2026-02-23.** Codebase grew to ~24,582 LOC TypeScript/Svelte + Rust.

**v1.1 shipped 2026-02-23.** Phases 11–12: scene building + curator tools.

**v1.2 shipped 2026-02-24.** Test automation milestone complete:
- Test suite: 72 code/build checks + 22 Rust unit tests + 12 Tauri E2E tests (requires running app)
- Pre-commit gate: `--code-only` runs 2–5s on every commit
- Web gateway removed — Tauri-desktop-only (all web tests removed from suite)

**Tech stack:** SvelteKit (Svelte 5) + Tauri 2.0 + SQLite + FTS5. Client-side AI via llama.cpp sidecar (Qwen2.5 3B) + Nomic Embed. Nostr (NDK) for communications.

**Known deployment steps before public launch:**
- Replace auto-updater endpoint placeholder in `tauri.conf.json`

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

---
*Last updated: 2026-02-24 after v1.2 milestone (Zero-Click Confidence)*
