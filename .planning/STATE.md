# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.4 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.4 The Interface — Phase 24: Artist Page

## Current Position

Phase: 24 of 27 (Artist Page)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase 24 complete — all 3 plans executed, all 15 P24 tests passing
Last activity: 2026-02-25 — Phase 24 Plan 03 complete: release credits collapsible, discography filter/sort, all 15 P24 tests (~8 min, 2 tasks + 1 deviation, 4 files)

Progress: [████░░░░░░] 20% (v1.4 — 1/5 phases complete, Phase 24 3/3 plans)

## Performance Metrics

**Velocity (v1.3 reference):**
- Total plans completed: 17 plans across 6 phases
- Average duration: ~5 min/plan
- Trend: Stable

**v1.3 By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 16. Sustainability Links | 2 | Complete |
| 17. Artist Stats Dashboard | 2 | Complete |
| 18. AI Auto-News | 5 | Complete |
| 19. Static Site Generator | 3 | Complete |
| 20. Listening Rooms | 3 | Complete |
| 21. ActivityPub Outbound | 2 | Complete |
| Phase 23 P01 | 3 | 2 tasks | 5 files |
| Phase 23 P02 | ~7min | 3 tasks | 5 files |
| Phase 23 P03 | ~4min | 2 tasks | 4 files |
| **Phase 23 Total** | **3 plans** | **5/5 DSYS requirements** | **Complete ✓** |

## Accumulated Context

### Decisions
- v1.4 phase dependency: Phases 24, 25, 26, 27 all depend on Phase 23 (design system must land first)
- Phase 25 and 26 can execute in parallel after Phase 23 (no mutual dependency)
- Queue system (Phase 25) targets all track surfaces — search results, artist page, release page, library
- Cross-linking (Phase 26) adds navigation between tools without restructuring any tool's core logic
- Autocomplete (Phase 27) scoped to artist names only (song title search deferred to future milestone)
- [23-01] Dynamic import of @tauri-apps/api/window in Titlebar handlers to avoid SSR errors in dev/web mode
- [23-01] PROJECT_NAME from config.ts used in Titlebar logo (not hardcoded) — single-variable naming rule
- [23-02] LeftSidebar nav grouped into Discover/Library/Account sections with Unicode icons matching mockup spec
- [23-02] Header hidden via class:hidden={tauriMode} in layout — preserves web fallback, ControlBar acts as topbar
- [23-02] Player control buttons use filled bg-4 box style (24x24, border) not borderless ghost — matches mockup
- [23-02] Play button uses acc-bg + b-acc + acc amber pattern (not solid white circle)
- [23-03] fileContains() in test runner returns a function, not a boolean — negation tests must call: !fileContains(path, str)()
- [23-03] Global button/input base styles placed in theme.css (not separate file) — Svelte components inherit automatically, can override locally
- [23-03] TagFilter uses parallel chip styles (not TagChip component) because it needs button elements with disabled state, not anchor elements
- [24-01] External MB artist links use musicbrainz.org/artist/{mbid} not local /artist/slug — relationship MBIDs don't map to local slugs without a DB lookup
- [24-01] Test manifest scoped per plan — future-plan tests deferred to avoid pre-commit hook failures on unimplemented features
- [24-01] About tab hidden entirely (not just empty) when hasRelationships is false — cleaner UX for artists with no MB relationship data
- [24-03] rawCredits scoped outside try/catch so slug resolution via getProvider() can happen independently with its own graceful catch
- [24-03] Existing release.credits (Credit[]) kept alongside new data.credits (CreditEntry[]) — serve different display purposes
- [24-03] Discography filter uses $derived(() => ...) wrapping for callable derived function pattern in Svelte 5

### Pending Todos
None

### Blockers/Concerns
- [Phase 27] City/label search requires FTS5 schema changes or additional index columns — assess during Phase 27 planning

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 24-03-PLAN.md (Phase 24 Plan 03 — release credits + discography controls + full P24 test manifest)
Resume file: None
Next: Phase 25 — Queue Management
