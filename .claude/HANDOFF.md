# Work Handoff — v1.5 Streaming Integration Milestone

**Date:** 2026-02-26
**Status:** Planning complete, Phase 28 ready to start

---

## Current Task

Plan and begin execution of **v1.5 Streaming Integration** milestone: Add Spotify/YouTube/SoundCloud/Bandcamp playback APIs to Mercury, fix 9 open bugs, implement service preference UI.

---

## Context

After comparing Mercury to Parachord (Tomahawk rebuilt in 1 month), confirmed they solve different problems:
- **Parachord:** Eliminate app-switching friction (aggregation)
- **Mercury:** Discover music by taste, not algorithm (discovery + artist enablement)

**Decision:** Add multi-source playback to Mercury. Mercury becomes "Parachord's aggregation + Mercury's discovery."

---

## Progress

### ✅ Completed
- Downloaded and analyzed Parachord codebase (`parachord-reference/`)
- Wrote comprehensive Parachord analysis: `.planning/PARACHORD-ANALYSIS.md`
- Created v1.5 milestone with 3-phase breakdown
- Updated MILESTONES.md with v1.5 entry
- Created detailed PLAN.md for v1.5 (phases 28-30)
- Updated BUILD-LOG.md with v1.5 decision
- Saved all findings to auto-memory (MEMORY.md)
- Identified 10 open bugs to fix in Phase 28

### 🔄 In Progress
- **User recorded Parachord video** — pending upload for `/uat-review` analysis

### ⏳ Remaining
- **Phase 28:** Fix 9 bugs (player UI, artist page, settings) — 1-2 weeks
- **Phase 29:** Streaming API integration — 2-3 weeks
- **Phase 30:** Service preference UI — 1 week
- Run full test suite after each phase

---

## Key Decisions

1. Mercury + streaming APIs keeps Mercury competitive while maintaining discovery focus
2. Don't copy Parachord's plugin complexity — hardcode services only
3. Steal UI: drag-to-reorder service priority in Settings
4. Service indicator on player bar + available services as clickable badges
5. Skip incremental resolver responses — show all services at once

---

## Relevant Files

**Planning:**
- `.planning/PARACHORD-ANALYSIS.md`
- `.planning/v1.5-PLAN.md`
- `.planning/MILESTONES.md`
- `BUILD-LOG.md` (uncommitted)

**Code:**
- `src/lib/components/Player.svelte` — Player bar
- `src/lib/player/state.svelte` — Player state
- `src-tauri/src/` — Streaming API work (Phase 29)

**Reference:**
- `parachord-reference/` — Parachord codebase

---

## Git Status

```
Changes not staged for commit:
  modified:   BUILD-LOG.md (3 insertions)
```

**Next:** Commit BUILD-LOG.md once Phase 28 work begins.

---

## Next Steps

1. Resume context with `/resume`
2. Analyze Parachord video (if uploaded) with `/uat-review`
3. Start Phase 28: Fix bugs #16, #17 (player UI + contrast)
4. Run test suite after all 9 bugs fixed
5. Move to Phase 29 (streaming APIs)

---

## Phase 28 Bugs

| # | Title | Priority |
|---|-------|----------|
| #16 | Player controls have no icons | High |
| #17 | Player bar too dark | High |
| #3 | Dark/low-contrast typography | High |
| #20 | Artist page album layout broken | High |
| #21 | Double description | Medium |
| #22 | Theme color picker non-functional | Medium |
| #18 | Filter settings panel toggle broken | Medium |
| #19 | KB genre/scene map link broken | Medium |
| #23 | Scene page missing local library | Medium |

---

## Resume Command

```
/resume
```

This will restore full context after `/clear`.

---

## Critical Notes

- **Video analysis first** — Don't skip; refines Phase 30 UX
- **Phase 28 prerequisite** — Must complete before Phase 29
- **Keep Phase 30 simple** — 2-3 clicks max for service switching
- **Mercury's discovery is the differentiator** — Don't overshadow with API work
