---
phase: 34-pipeline-foundation
plan: "03"
subsystem: database
tags: [rust, tauri, sqlite, musicbrainz, api, caching, reqwest, tokio]

# Dependency graph
requires:
  - phase: 34-pipeline-foundation
    provides: taste.db initialization pattern via init_taste_db and TasteDbState mutex
provides:
  - get_or_cache_releases Tauri command for cache-first MB release+track fetching
  - release_group_cache table in taste.db (artist_mbid, release_group_mbid, title, type, year)
  - release_track_cache table in taste.db (release_group_mbid, track_mbid, title, number, duration)
  - CachedRelease and CachedTrack structs in src-tauri/src/ai/track_cache.rs
affects:
  - Phase 35 frontend integration (artist page invokes get_or_cache_releases instead of live MB fetch)
  - Any future plan reading track data from taste.db

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cache-first async Tauri command with Mutex lock released before HTTP calls
    - MB API rate-limit compliance via tokio::time::sleep(1100ms) between per-release track fetches
    - Non-fatal track fetch errors (eprintln + continue) — release list returned regardless
    - INSERT OR REPLACE for idempotent re-caching

key-files:
  created:
    - src-tauri/src/ai/track_cache.rs
  modified:
    - src-tauri/src/ai/taste_db.rs
    - src-tauri/src/ai/mod.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "Cache-first: second call returns immediately without any MB API hit (check release_group_cache by artist_mbid)"
  - "Track fetch errors are non-fatal: releases are cached and returned even if track fetches fail for some release groups"
  - "Rate-limit sleep (1100ms) applied within single invocation only; concurrent invocations not serialized (acceptable for single-artist navigation)"
  - "INSERT OR REPLACE on both cache tables: safe for re-caching if user wants fresh data"
  - "Mutex lock released before each async HTTP call: minimum lock hold time"

patterns-established:
  - "Track cache pattern: async Tauri command checks cache → releases mutex → fetches HTTP → reacquires mutex to store"
  - "NULLS LAST in ORDER BY for SQLite 3.30+ (available in Tauri's bundled SQLite)"

requirements-completed:
  - TRACK-CACHE-COMMAND

# Metrics
duration: 15min
completed: 2026-03-04
---

# Phase 34 Plan 03: Track Cache Summary

**Cache-first MusicBrainz release+track fetching via get_or_cache_releases Tauri command backed by release_group_cache and release_track_cache tables in taste.db**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-04T12:35:00Z
- **Completed:** 2026-03-04T12:50:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Two new taste.db tables (`release_group_cache`, `release_track_cache`) with idempotent CREATE TABLE IF NOT EXISTS — safe on existing instances
- `src-tauri/src/ai/track_cache.rs` with `CachedRelease` and `CachedTrack` structs plus the `get_or_cache_releases` async Tauri command
- Cache-first logic: first call fetches MB release-groups endpoint + per-release recordings (with 1100ms rate-limit sleep); second call returns immediately from SQLite
- Track fetch errors (network failure, 404) are logged but non-fatal — release list always returned
- Registered in `ai/mod.rs` and `lib.rs` invoke_handler; all 196 test suite checks pass

## Tauri Command Interface

```rust
// Frontend invocation (Phase 35 integration):
invoke("get_or_cache_releases", { artistMbid: string }) → Promise<CachedRelease[]>

// CachedRelease (matches ReleaseGroup shape used by +page.ts):
{ mbid: string, title: string, year: number | null, release_type: string, fetched_at: number }

// CachedTrack (stored in release_track_cache, readable by future plans):
{ track_mbid: string, release_group_mbid: string, title: string, track_number: number | null, duration_ms: number | null }
```

## taste.db Schema

```sql
CREATE TABLE IF NOT EXISTS release_group_cache (
    artist_mbid          TEXT NOT NULL,
    release_group_mbid   TEXT NOT NULL,
    title                TEXT NOT NULL,
    release_type         TEXT,
    first_release_year   INTEGER,
    fetched_at           INTEGER NOT NULL,
    PRIMARY KEY (artist_mbid, release_group_mbid)
);
CREATE INDEX IF NOT EXISTS idx_rgc_artist ON release_group_cache(artist_mbid);

CREATE TABLE IF NOT EXISTS release_track_cache (
    release_group_mbid   TEXT NOT NULL,
    track_mbid           TEXT NOT NULL,
    title                TEXT NOT NULL,
    track_number         INTEGER,
    duration_ms          INTEGER,
    fetched_at           INTEGER NOT NULL,
    PRIMARY KEY (release_group_mbid, track_mbid)
);
CREATE INDEX IF NOT EXISTS idx_rtc_release ON release_track_cache(release_group_mbid);
```

## Rate Limiting Note

First visit to an artist with N release groups takes approximately N * 1.1 seconds to populate the cache (1100ms sleep between each per-release track fetch to stay within MB 1 req/sec limit). Subsequent visits are instant — no network request made.

Concurrent invocations of `get_or_cache_releases` are not serialized. This is acceptable because the expected usage pattern is single-artist-at-a-time navigation; a user cannot realistically trigger two simultaneous artist-page loads.

## Task Commits

1. **Task 1: Add release cache tables to taste.db schema** - `e5a2b17e` (feat)
2. **Task 2: Implement track_cache.rs and register command** - `a492573c` (feat)

## Files Created/Modified

- `src-tauri/src/ai/track_cache.rs` — New module: CachedRelease/CachedTrack structs, get_cached_releases helper, get_or_cache_releases Tauri command (cache-first, MB fetch, rate-limit sleep, track population)
- `src-tauri/src/ai/taste_db.rs` — Added release_group_cache and release_track_cache CREATE TABLE IF NOT EXISTS to execute_batch
- `src-tauri/src/ai/mod.rs` — Added `pub mod track_cache;`
- `src-tauri/src/lib.rs` — Registered `ai::track_cache::get_or_cache_releases` in invoke_handler

## Decisions Made

- Cache-first strategy: check `release_group_cache` by `artist_mbid` before any network call. Empty result triggers fresh fetch.
- Track fetch errors are non-fatal: `eprintln!` + `continue` — command always returns the release list.
- Rate-limit sleep (1100ms) applied only within a single invocation; concurrent invocations not serialized (acceptable usage pattern).
- `INSERT OR REPLACE` on both tables: safe for re-caching if user manually invalidates cache in future.
- Mutex lock released before each async HTTP call to minimize lock contention.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — `tokio` with `time` feature and `reqwest` with `json` feature were already present in `Cargo.toml`. Build succeeded on first attempt with zero errors.

## User Setup Required

None — no external service configuration required. Cache populates automatically on first artist page visit.

## Next Phase Readiness

- `get_or_cache_releases` command is registered and callable from the frontend
- Phase 35 can wire the artist page to invoke this command instead of the live MB API call in `+page.ts`
- Both cache tables are in taste.db and will be created on app startup for all existing users
- The `CachedRelease` struct fields (`mbid`, `title`, `year`, `release_type`) match the `ReleaseGroup` interface used by `+page.ts` — minimal adapter needed in frontend

---
*Phase: 34-pipeline-foundation*
*Completed: 2026-03-04*
