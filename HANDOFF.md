# Mercury Handoff

**Date:** 2026-02-16
**Session:** Roadmap rewrite — desktop-first, 12 phases

## Where We Are

**Phase 1** (Data Pipeline): Complete
**Phase 2** (Web Gateway): Complete
**Phase 3+**: Not started — roadmap rewritten, ready to begin Phase 3

Last commit: `68d44d0` — docs: vision refinement — desktop-first, AI core, local player, knowledge base

## What Happened This Session

Rewrote the entire roadmap from 9 phases to 12 to reflect the desktop-first pivot from Entry 014. Added 3 new phases (Local Music Player, AI Foundation, Knowledge Base), 9 new requirements (PLAYER-01/02/03, AI-01/02/03/04, KB-01/02), moved Scene Maps/Time Machine/Liner Notes from Discovery to Knowledge Base, added Deferred section.

## What Needs Doing Next

1. **Phase 3: Desktop App Foundation** — the immediate next build:
   - Tauri 2.0 shell wrapping SvelteKit UI
   - Local SQLite instead of D1
   - Database distribution (download, torrent)
   - Offline search
   - Auto-update mechanism

2. **Open design questions** (not yet decided):
   - How the style/genre map UI actually works (interaction model TBD)
   - Which AI models to use (open models preferred, specifics TBD)
   - Social sharing mechanics (format of "generated artifacts" TBD)

3. **Known issues from Phase 2** (carried over):
   - Per-release streaming links empty (MB release-group API doesn't include streaming URLs)
   - EmbedPlayer.svelte + ExternalLink.svelte are dead code from old layout
   - SoundCloud oEmbed proxy untested with real URLs
   - Duplicate streaming section (Listen On bar + Links > Streaming show same links)

## Key Files to Read

| File | Why |
|------|-----|
| `BUILD-LOG.md` Entry 014 | All 10 decisions with reasoning and rejected alternatives |
| `BUILD-LOG.md` Entry 015 | Roadmap rewrite summary |
| `PROJECT.md` | Vision — desktop-first, AI core, knowledge base, local player |
| `.planning/ROADMAP.md` | New 12-phase roadmap |
| `.planning/REQUIREMENTS.md` | 56 requirements with traceability |
| `CLAUDE.md` | Build protocol, naming rules, dev environment |
