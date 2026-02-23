---
phase: 11-scene-building
plan: "01"
subsystem: database
tags: [rust, tauri, rusqlite, sqlite, taste_db, scene-detection]

# Dependency graph
requires:
  - phase: 09-community-foundation
    provides: "collections/taste.db pattern established; unchecked_transaction pattern for batch writes"
  - phase: 10-communication-layer
    provides: "taste.db schema finalized with all prior tables"
provides:
  - "detected_scenes table in taste.db — slug, name, tags (JSON), artist_mbids (JSON), listener_count, is_emerging, detected_at"
  - "scene_follows table in taste.db — which scenes user follows"
  - "scene_suggestions table in taste.db — user-suggested artists for scenes (UNIQUE on scene_slug+artist_name)"
  - "feature_requests table in taste.db — upvote-style vote tracking per feature_id"
  - "8 Tauri commands for scene CRUD: get/save detected_scenes, follow/unfollow/get_follows, suggest/get_suggestions, upvote_feature_request"
affects: [11-02, 11-03, 11-04, 11-05, scene-detection, scene-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "unchecked_transaction() for batch DB writes on Mutex<Connection> (established in Phase 5, reused here)"
    - "UNIQUE(scene_slug, artist_name) in scene_suggestions — artist_name is the free-text discriminator, NOT artist_mbid (empty string collides)"

key-files:
  created: []
  modified:
    - src-tauri/src/ai/taste_db.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "scene_suggestions uses UNIQUE(scene_slug, artist_name): users type free-text artist names at suggestion time, MBID is unavailable. Using artist_mbid would cause all free-text suggestions to silently fail INSERT OR IGNORE on the second attempt (empty string collision)"
  - "save_detected_scenes does full DELETE + INSERT batch (not merge): detection engine always produces a fresh full result set, not incremental updates"
  - "is_emerging stored as INTEGER 0/1 in SQLite, converted to bool in Rust struct — rusqlite has no native bool column type"

patterns-established:
  - "Scene table pattern: slug as TEXT PRIMARY KEY with JSON string columns for arrays (tags, artist_mbids)"
  - "Boolean columns as INTEGER NOT NULL DEFAULT 0 with bool conversion in query_map closure"

requirements-completed: [COMM-07, COMM-08]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 11 Plan 01: Scene Data Layer Summary

**Four taste.db tables and eight Tauri commands giving Phase 11's scene detection engine its complete read/write data layer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T12:06:37Z
- **Completed:** 2026-02-23T12:09:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `detected_scenes`, `scene_follows`, `scene_suggestions`, `feature_requests` tables to taste.db schema without touching existing tables
- Implemented 8 Tauri command functions in taste_db.rs following established patterns (lock Mutex, query, return Result<T, String>)
- Registered all 8 commands in lib.rs invoke_handler
- Cargo build 0 errors, npm run check 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scene tables and commands to taste_db.rs** - `5325c7e` (feat)
2. **Task 2: Register scene commands in lib.rs invoke handler** - `e487c6a` (feat)

## Files Created/Modified
- `src-tauri/src/ai/taste_db.rs` - Four new CREATE TABLE blocks added to execute_batch(); two new structs (DetectedSceneRow, SceneSuggestionRow); 8 new Tauri command functions
- `src-tauri/src/lib.rs` - 8 new entries in invoke_handler! macro

## Decisions Made
- `scene_suggestions` uses `UNIQUE(scene_slug, artist_name)` not `UNIQUE(scene_slug, artist_mbid)`: free-text suggestions have no MBID at entry time, so an empty artist_mbid string would collide on a second suggestion and silently fail INSERT OR IGNORE
- `save_detected_scenes` does full DELETE + re-INSERT inside a transaction (not upsert/merge): detection results are always a complete replacement set, not incremental patches
- `unchecked_transaction()` reused for `save_detected_scenes` batch write — same pattern as `store_embedding` in embeddings.rs, avoids double mutable borrow on Mutex<Connection>

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scene data layer is complete. Plans 02+ can read and write all four tables via Tauri IPC
- All existing taste.db tables and commands are unmodified — zero regression risk
- The `detected_scenes` table is empty until Plan 02+ implements the AI detection engine that populates it

---
*Phase: 11-scene-building*
*Completed: 2026-02-23*
