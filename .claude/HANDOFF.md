# Work Handoff — v1.5 Phase 28: Bug Fixes

**Date:** 2026-02-26
**Status:** Ready to execute Phase 28

---

## Current Task

Fix **11 open bugs** as Phase 28 of v1.5 Streaming Integration milestone.

---

## What Was Done This Session

1. ✅ Transcribed and analyzed Parachord UAT video (Whisper small model)
2. ✅ Deep-dived Parachord codebase — plugin system, resolver order, ResolverCard UI
3. ✅ Documented Phase 30 design decisions (steal drag-to-reorder, avoid plugin complexity)
4. ✅ Verified plan coherence after Haiku session — plan is solid, one fix: 11 bugs not 9
5. ✅ All findings saved to BUILD-LOG.md and MEMORY.md
6. ✅ 164 code tests passing

---

## Context

**v1.5 milestone:** Add multi-source streaming (Spotify/YouTube/SoundCloud/Bandcamp) + fix bugs.
- Phase 28 (NOW): Fix 11 bugs
- Phase 29: Streaming API integration
- Phase 30: Service preference UI (drag-to-reorder like Parachord but simpler)

**Key Phase 30 insight from Parachord analysis:**
- Steal: drag-to-reorder grid, priority number badges, source badges on tracks
- Avoid: plugin system, user API key setup, multi-step OAuth, incremental resolution UI
- Mercury: hardcode 4 services, server-side auth, simple "Connected ✓" feedback

---

## Phase 28: 11 Bugs to Fix

| # | Title | Type |
|---|-------|------|
| #16 | Player controls have no icons | bug |
| #17 | Player bar too dark | bug |
| #3 | Dark/low-contrast typography | bug |
| #20 | Artist page album layout broken | bug |
| #21 | Double description (AI + DB both showing) | bug |
| #26 | Artist website should appear first in links | enhancement |
| #27 | Validate external links, remove dead sites | enhancement |
| #22 | Theme color picker does nothing | bug |
| #18 | Filter settings panel toggle broken | bug |
| #19 | KB genre/scene map link does nothing | bug |
| #23 | Scene page missing local library | bug |

---

## Relevant Files

- `src/lib/components/Player.svelte` — player controls + player bar
- `src/lib/player/state.svelte` — player state
- `src/app.css` or `src/lib/theme.css` — typography + contrast tokens
- `src/routes/artist/[slug]/+page.svelte` — album layout, double description, links
- `src/routes/settings/+page.svelte` — color picker, filter panel toggle
- `src/routes/kb/[slug]/+page.svelte` — KB map link
- `src/routes/scenes/[slug]/+page.svelte` — local library in scene
- `.planning/v1.5-PLAN.md` — full Phase 28 spec

---

## Next Steps

1. `cd /d/Projects/Mercury`
2. Read each bug's source file
3. Fix in logical groups (player first, then artist page, then settings/discovery)
4. Run `node tools/test-suite/run.mjs --code-only` after each group
5. Run full suite at end
6. Close GitHub issues as each bug is fixed
7. Commit with descriptive message
8. Move to Phase 29

---

## Git Status

Clean. Last real commit: `6c4c1a0` — Parachord deep analysis docs.

---

## Resume Command

```
/resume
```
