# Mercury (working title)

## What This Is

A music discovery engine that indexes 2.8M+ artists from open databases, lets you explore through atomic tags, and embeds players from wherever the music already lives — Bandcamp, Spotify, SoundCloud, YouTube. Runs as a Tauri desktop app with a local SQLite database (offline-first) and a Cloudflare-hosted web gateway. Not a platform. Not a streaming service. A search engine that becomes an ecosystem.

v1.0 shipped: data pipeline → web gateway → desktop app → local music player → client-side AI → tag discovery engine → knowledge base → underground aesthetic → community foundation → encrypted communication layer.

## Core Value

Uniqueness is rewarded — the more niche you are, the more discoverable you become.

## Requirements

### Validated

- ✓ Data pipeline ingests MusicBrainz dumps into SQLite + FTS5 (2.8M artists) — v1.0
- ✓ Search 2.8M artists instantly from web and offline desktop — v1.0
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

### Active

- [ ] Scene building — AI scene detection, label collectives, community creation tools
- [ ] Curator / blog tools — embeddable widgets, attribution, RSS feeds
- [ ] Interoperability — ActivityPub, Fediverse federation
- [ ] Listening rooms — shared real-time synchronized playback
- [ ] Artist tools — claiming, dashboard, auto-news, self-hosted site generator
- [ ] Embeddable collections for external websites
- [ ] Writing and discussion features (community-requested)
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

**v1.0 shipped 2026-02-23.** Codebase: ~24,100 LOC TypeScript/Svelte + Rust across 456 files. 15 phases, 71 plans, 299 git commits in 9 days.

**Tech stack:** SvelteKit (Svelte 5) + Tauri 2.0 + SQLite + FTS5 + Cloudflare Pages + D1. Client-side AI via llama.cpp sidecar (Qwen2.5 3B) + Nomic Embed. Nostr (NDK) for communications.

**Known deployment steps before public launch:**
- Replace `wrangler.jsonc` placeholder D1 database ID with real Cloudflare D1 database
- Replace auto-updater endpoint placeholder in `tauri.conf.json`

Pre-project research (2026-02-14) saved in ControlCenter:
- `D:/Projects/_ControlCenter/.planning/music-platform/research/` — 4 deep research reports
- `D:/Projects/_ControlCenter/.planning/music-platform/SESSION-2026-02-14.md` — full origin story

## Constraints

- **$0 infrastructure**: Cloudflare free tier (Pages + D1). No hosting costs.
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

---
*Last updated: 2026-02-23 after v1.0 milestone*
