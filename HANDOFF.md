# Mercury Handoff

**Date:** 2026-02-17
**Session:** Community vision questionnaire + roadmap rewrite

## Where We Are

**Phase 5** (AI Foundation): Human verification APPROVED last session. Plan 07 still needs completion steps (SUMMARY, STATE, ROADMAP updates, commit). Uncommitted bug fixes from last session still on disk.

**This session** was vision/planning — no code changes. Roadmap rewritten from 12 → 15 phases based on community layer vision.

## What Happened This Session

### Community Vision (Entry 020)
Steve wrote a raw vision piece about Mercury becoming a place where underground culture lives — finding people through shared taste, organizing without platforms, building something real. This is a philosophical expansion that reshapes everything from Phase 8 onward.

### Interactive Questionnaire (Entry 020 continued)
Went through 16 questions step by step. Key decisions:

**Identity:** Pseudonymous handles + lo-fi avatar builder + pure taste profiles (no bios, no photos — the music speaks)

**Finding People:** Three layered modes — taste overlap browsing, scene rooms, serendipitous matching. Toggleable local-to-global radius.

**Communication:** Layered (DMs + rooms + ephemeral). All encrypted. Infrastructure architecture DEFERRED — needs research. Hard constraint: zero server cost.

**Groups:** Self-organizing, small by default, no ceiling. Hybrid moderation (room creator + community flagging). No central content police.

**Creation tools:** Start with none. Add only if community asks.

**Aesthetic:** Dense and playful — panels, controls, dropdowns everywhere. Game-like cockpit feel. Taste-based theming (your music shapes your colors). Templates. Ongoing evolution.

**Anti-algorithm:** User control. Mercury provides tools, never decides for you.

**AI in community:** Taste translation + scene awareness + matchmaking context. Same local LLM from Phase 5.

**Licensing:** Free always. Open source decision deferred — depends on sustainability.

### Roadmap Rewrite
Old Phase 8 (Social Layer) split into three phases. Three new phases added:

| Phase | Name | What It Is |
|-------|------|-----------|
| 8 | Underground Aesthetic | Dense UI, taste-based theming, game-like feel. Ships FIRST — vibe before features. |
| 9 | Community Foundation | Identity system, taste matching, collections, import/export |
| 10 | Communication Layer | Encrypted DMs + scene rooms + ephemeral. Infra TBD. |
| 11 | Scene Building | AI scene detection, label collectives, organic community tools |

Old phases 9-12 renumbered to 12-15. Total: 15 phases.

## What Needs Doing Next

### 1. Finish Phase 5 (from LAST session — still pending)
- Commit the 5 bug fixes (still uncommitted from last session)
- Create `.planning/phases/05-ai-foundation/05-07-SUMMARY.md`
- Update STATE.md: Phase 5 = 7/7, status = Complete
- Mark Phase 5 complete in `.planning/ROADMAP.md`

### 2. After Phase 5
- `/gsd:verify-work 5` for phase-level verification
- Then `/gsd:plan-phase 6` or `/gsd:progress`

### 3. Deferred Decisions (captured in roadmap + build log)
- Communication infrastructure: Matrix vs P2P vs relay vs Nostr
- Licensing model: open source vs source-available
- Writing/discussion features: wait for community demand

## Files Changed This Session

| File | Change |
|------|--------|
| `BUILD-LOG.md` | Entry 020 (vision) + questionnaire decisions |
| `ROADMAP.md` | Rewritten — 12 → 15 phases, community vision integrated |
| `.planning/ROADMAP.md` | Detailed phase specs rewritten to match |
| `.planning/STATE.md` | Phase count updated (12 → 15) |

## Key Files Still Uncommitted (from LAST session)

| File | Change |
|------|--------|
| `src-tauri/build.rs` | DLL auto-copy to target dir |
| `src-tauri/src/ai/sidecar.rs` | Output logging via async task |
| `src/lib/ai/state.svelte.ts` | 180s timeout, crash detection |
| `src/routes/artist/[slug]/+page.server.ts` | Fallback data instead of 503 |
| `src/routes/explore/+page.svelte` | Conversation history pills |
| `src/routes/+layout.svelte` | Back button |
| `src/lib/components/TasteEditor.svelte` | FTS5 fallback for anchor search |

## Resume Command

```
/resume
```
