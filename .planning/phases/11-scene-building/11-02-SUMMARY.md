---
phase: 11-scene-building
plan: "02"
subsystem: scene-detection
tags: [typescript, svelte5, sqlite, tauri, scene-detection, tag-cooccurrence, anti-rich-get-richer]

# Dependency graph
requires:
  - phase: 11-01
    provides: "taste.db tables (detected_scenes, scene_follows) + Tauri commands (save_detected_scenes, get_detected_scenes, get_favorite_artists)"
  - phase: 07-knowledge-base
    provides: "genres table with mb_tag column — used by isNovelTagCombination() to classify emerging scenes"
  - phase: 06-discovery-engine
    provides: "tag_cooccurrence and tag_stats tables — primary data source for scene detection seeds"
provides:
  - "src/lib/scenes/types.ts — DetectedScene, SceneArtist, SceneSuggestion, PartitionedScenes interfaces"
  - "src/lib/scenes/detection.ts — detectScenes(), partitionScenes(), loadCachedScenes(), findTagClusterSeeds(), validateListenerOverlap()"
  - "src/lib/scenes/state.svelte.ts — Svelte 5 $state reactive scenesState + loadScenes()"
  - "src/lib/scenes/index.ts — barrel re-export for all types, state, detection functions"
  - "src/lib/ai/prompts.ts — sceneDescription prompt added to PROMPTS object"
affects: [11-03, 11-04, 11-05, scene-ui, scene-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getInvoke() dynamic import pattern for Tauri invoke calls (consistent with signals.ts, scanner.ts, ai/)"
    - "getProvider() factory for mercury.db queries (consistent with discover page, taste signal flows)"
    - "Fisher-Yates shuffle on both partition tiers — prevents order lock-in for anti-rich-get-richer design"
    - "isTauri() guard at function entry — returns [] immediately on web, zero breakage"
    - "Dynamic import of detection.ts inside loadScenes() — defers heavy module load, breaks circular dep risk"

key-files:
  created:
    - src/lib/scenes/types.ts
    - src/lib/scenes/detection.ts
    - src/lib/scenes/state.svelte.ts
    - src/lib/scenes/index.ts
  modified:
    - src/lib/ai/prompts.ts

key-decisions:
  - "Two-tier partition: emerging (isEmerging OR listenerCount <= 2) vs active (established). Both shuffled to prevent identical scene ordering on every load — anti-rich-get-richer by design"
  - "Niche filter on tag seeds (< 200 artists per tag) ensures mainstream genres never appear as scene candidates — the algorithm exclusively surfaces micro-scenes"
  - "isNovelTagCombination() checks KB genres table: tag combos not registered as named genres are the most interesting emerging scenes"
  - "Dynamic JOINs in getClusterArtists() for 1/2/3 tag counts rather than a variable-length query — clean SQL, correct results, no D1 parameter limit risk"
  - "loadCachedScenes() parses JSON string fields from Rust — tags and artist_mbids stored as JSON text in SQLite, parsed back to string[] on TypeScript side"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 11 Plan 02: Scene Detection Engine Summary

**Tag co-occurrence seeds clustered into typed DetectedScene objects with Fisher-Yates-shuffled two-tier anti-rich-get-richer partitioning**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T12:12:26Z
- **Completed:** 2026-02-23T12:15:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `src/lib/scenes/` module directory with 4 files
- Implemented full scene detection pipeline in `detection.ts`:
  - `findTagClusterSeeds()` — tag_cooccurrence query with niche filters (< 200 artists, >= 5 shared)
  - `groupTagPairsIntoClusters()` — iterative union-find merge, caps at 50 clusters
  - `getClusterArtists()` — dynamic 1/2/3-tag JOIN queries, up to 20 artists per scene
  - `isNovelTagCombination()` — KB genres table check, returns true for unknown tag combos
  - `validateListenerOverlap()` — Tauri invoke for favorite_artists, counts scene overlap
  - `detectScenes()` — full pipeline, caches to taste.db via save_detected_scenes
  - `partitionScenes()` — two-tier split with Fisher-Yates shuffle on both arrays
  - `loadCachedScenes()` — reads taste.db cache, parses JSON array fields
- Created `state.svelte.ts` with Svelte 5 `$state` reactive scenesState + `loadScenes(forceDetect?)`
- Created `index.ts` barrel re-export
- Added `sceneDescription` to PROMPTS object in `src/lib/ai/prompts.ts`
- npm run check: 0 errors, 6 pre-existing warnings (unchanged)

## Task Commits

1. **Task 1: Create scenes types and detection algorithm** - `6f4afbc` (feat)
2. **Task 2: Scenes state module + AI scene description prompt** - `e821681` (feat)

## Files Created/Modified

- `src/lib/scenes/types.ts` — DetectedScene, SceneArtist, SceneSuggestion, PartitionedScenes
- `src/lib/scenes/detection.ts` — 8 exported functions; full detection pipeline
- `src/lib/scenes/state.svelte.ts` — ScenesState $state, loadScenes()
- `src/lib/scenes/index.ts` — barrel re-export for all scenes module exports
- `src/lib/ai/prompts.ts` — sceneDescription added to PROMPTS object

## Decisions Made

- Niche filter (< 200 artists per tag) on seed query — ensures mainstream tags never become scene candidates; the algorithm exclusively surfaces micro-scenes
- Two-tier partition with Fisher-Yates shuffle on both arrays — prevents the same scenes always appearing first; anti-rich-get-richer by design
- Dynamic JOIN count in `getClusterArtists()` (1/2/3 tags) rather than variable-length SQL — clean, correct, and avoids D1 parameter limit edge cases
- `loadCachedScenes()` parses JSON string fields — tags and artist_mbids stored as JSON text in Rust/SQLite, converted back to string[] on read
- Dynamic import of detection.ts inside `loadScenes()` — defers heavy module load, consistent with other async module boundary patterns (dms.ts, rooms.ts)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 scene module files are in place with correct exports
- detection.ts exports match exactly what Plan 03 (scene UI) will need to import
- scenesState is reactive and ready for Svelte components to bind
- sceneDescription prompt ready for Plan 03/04 AI-generated scene vibe text
- All existing files unmodified except prompts.ts (additive change only)

---
*Phase: 11-scene-building*
*Completed: 2026-02-23*

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/scenes/types.ts
- FOUND: src/lib/scenes/detection.ts
- FOUND: src/lib/scenes/state.svelte.ts
- FOUND: src/lib/scenes/index.ts
- FOUND: src/lib/ai/prompts.ts (sceneDescription at line 46)

Commits verified:
- FOUND: 6f4afbc — feat(11-02): create scenes types and detection algorithm
- FOUND: e821681 — feat(11-02): scenes state module, barrel export, and AI scene description prompt
