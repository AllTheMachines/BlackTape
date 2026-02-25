# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24 after v1.4 milestone started)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** v1.4 The Interface — Phase 26 COMPLETE, Phase 27 (Autocomplete) is next

## Current Position

Phase: 27 of 27 (Autocomplete — next)
Plan: 0 of ? in current phase (Phase 26 all 4 plans complete)
Status: Phase 26 COMPLETE — all 9 requirements satisfied (DISC-01/02/03, XLINK-01..05, CRAT-01), 147 code checks passing
Last activity: 2026-02-25 — Phase 26 Plan 04 complete: PHASE_26 test manifest added (P26-01..P26-16), 13 code checks + 3 skip, 0 failures

Progress: [██████░░░░] 62% (v1.4 — Phase 26 complete 4/4 plans, 3/4 phases)

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
| Phase 24 P02 | 0 | 0 tasks | 1 files |
| Phase 25-queue-system-library P01 | 2 | 2 tasks | 2 files |
| Phase 25-queue-system-library P02 | ~4min | 2 tasks | 3 files |
| Phase 25-queue-system-library P03 | ~3min | 2 tasks | 5 files |
| Phase 25-queue-system-library P04 | ~1min | 1 task | 1 file |
| **Phase 25 Total** | **4 plans** | **9/9 requirements (QUEU-01..06, LIBR-01..03)** | **Complete** |
| Phase 26 P04 | 2min | 1 tasks | 1 files |
| **Phase 26 Total** | **4 plans** | **9/9 requirements (DISC-01..03, XLINK-01..05, CRAT-01)** | **Complete** |

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
- [Phase 25-01]: saveQueueToStorage called in every mutation to ensure consistency regardless of which code path triggers the change
- [Phase 25-01]: isQueueActive checks both tracks.length > 0 AND playerState.isPlaying — paused queue does NOT trigger insert-next
- [Phase 25-01]: TrackRow hover swap is pure CSS opacity transitions — no JS state, simpler and more performant
- [Phase 25-02]: Search page allPlayerTracks built as $derived for clean TrackRow contextTracks prop
- [Phase 25-02]: Release page Play Album / Queue Album are intentional UI stubs — MB tracks lack local paths; matching deferred per CONTEXT.md
- [Phase 25-02]: Artist page topPlayerTracks initialized as empty $state array — populated when local-to-MB matching lands
- [Phase 25-02]: Top Tracks section placed above Discography in overview tab — establishes UI hierarchy now, wired later
- [Phase 25-03]: Queue panel uses slide-up from player bar (not right-side slide-in) — full-width feel per CONTEXT.md; overlay backdrop removed
- [Phase 25-03]: Library sort controls removed entirely — always 'added' descending per LIBR-02; set in onMount
- [Phase 25-03]: Album auto-select uses $effect with !selectedAlbumKey guard to prevent reset when albums array updates
- [Phase 25-04]: Tests written against exact strings already present in source — no source changes needed when manifest added after Plans 01-03
- [Phase 26-03]: Native <select> used for country dropdown over datalist/combobox — simpler, accessible, no dependencies, consistent with decade dropdown
- [Phase 26-03]: selectedCountryCode replaces country $state — select values are controlled strings, no trim() needed
- [Phase 26-03]: 60 countries covers MusicBrainz strong-coverage territories without overwhelming list length
- [Phase 26-01]: ArtistResult.uniqueness_score is optional (?) so existing callers compile without changes — bar only renders when score is non-null
- [Phase 26-01]: getDiscoveryArtists falls back to discovery_score ordering when no filters set — ensures strong default Discover page state
- [Phase 26-01]: URL-driven filter state in Discover — goto() with keepFocus+noScroll on every change, no $state for filter values
- [Phase 26-01]: Tag chips sliced to 3 (from 5) in ArtistCard for compact medium-density grid
- [Phase 26-01]: <label> for Genre/Era filter headers converted to <span> — group labels without associated single control trigger a11y warnings
- [Phase 26-02]: Time Machine KB era cross-link targets /discover?era= — KB has no dedicated era pages; Discover era filter is the correct destination
- [Phase 26-02]: Crate Dig cross-links placed per-result below ArtistCard (not page-level) — contextual link follows the specific artist's primary tag
- [Phase 26-02]: StyleMap initialTag sets hoveredTag after simulation tick(500) completes — pre-highlights incoming node without interfering with physics layout
- [Phase 26-02]: XLINK-02 (KB → Discover) was already satisfied by existing KB genre page — no changes needed
- [Phase 26]: [Phase 26-04]: Tests written against actual source patterns first run — all 13 code checks pass without needing source changes

### Pending Todos
None

### Blockers/Concerns
- [Phase 27] City/label search requires FTS5 schema changes or additional index columns — assess during Phase 27 planning

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 26-04-PLAN.md (Phase 26 Plan 04 — test manifest P26-01..P26-16, Phase 26 COMPLETE)
Resume file: None
Next: Phase 27 (Autocomplete — artist name search only)
