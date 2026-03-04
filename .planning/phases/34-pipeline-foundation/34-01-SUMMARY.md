---
phase: 34-pipeline-foundation
plan: 01
subsystem: database
tags: [sqlite, better-sqlite3, jaccard, pipeline, similar-artists, tag-overlap]

# Dependency graph
requires:
  - phase: build-tag-stats
    provides: artist_tags table with tag associations per artist
provides:
  - similar_artists table in mercury.db with symmetric top-10 Jaccard pairs
  - pipeline/build-similar-artists.mjs standalone pipeline script
affects:
  - 35-rabbit-hole (getSimilarArtists query targets similar_artists table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-phase similar-artist computation: score unique pairs → symmetric top-10 ranking → symmetry backfill → top-K enforcement + orphan cleanup"
    - "Pipeline script structure: ESM + createRequire for better-sqlite3, same pragma setup as build-tag-stats.mjs"
    - "Idempotency via DELETE FROM table at start of each run"
    - "INSERT OR IGNORE to handle UNION duplicates in symmetric insertion"

key-files:
  created:
    - pipeline/build-similar-artists.mjs
  modified: []

key-decisions:
  - "4-phase SQL approach to satisfy both top-10 and symmetry constraints: plan's original UNION SQL failed both checks"
  - "Symmetry backfill (D3) + top-K enforcement (D4) + orphan cleanup (D5) is the minimal correct solution"
  - "Jaccard >= 0.15 AND shared_tags >= 2 as dual filters — same thresholds as plan spec"
  - "INSERT OR IGNORE (not INSERT OR REPLACE) for symmetry pass to avoid score overwrites"

patterns-established:
  - "Jaccard similarity from artist_tags: shared_tags / (|A_tags| + |B_tags| - shared_tags)"
  - "Symmetric top-K storage pattern: compute undirected scores, expand both ways, rank independently, backfill reverses, trim and clean"

requirements-completed:
  - SIMILAR-ARTISTS-PIPELINE

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 34 Plan 01: Similar Artists Pipeline Summary

**Jaccard similarity pipeline from tag co-occurrence precomputes top-10 similar artists per artist stored symmetrically in mercury.db similar_artists table**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-04T12:21:25Z
- **Completed:** 2026-03-04T12:26:05Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Built `pipeline/build-similar-artists.mjs` — standalone Node.js pipeline script using the same ESM + createRequire pattern as `build-tag-stats.mjs`
- Created `similar_artists` table in mercury.db with 746 symmetric pairs across 218 artists
- All 4 integrity checks pass: total_pairs > 0, below_threshold = 0, max_per_artist = 10, asymmetric = 0
- Script is fully idempotent — running twice produces identical row counts (746)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create build-similar-artists.mjs pipeline script** - `add391a8` (feat)
2. **Task 1 fix: Enforce symmetry and top-K correctly** - `41f8bec2` (fix — auto-fix during verification)
3. **Task 2: Verify similar_artists data integrity** - (verification confirmed all checks pass, no separate commit needed)

## Files Created/Modified
- `pipeline/build-similar-artists.mjs` — Standalone pipeline script precomputing Jaccard similarity from artist tags

## Data Results (Task 2 Integrity Checks)

| Check | Result | Status |
|-------|--------|--------|
| total_pairs | 746 | PASS (> 0) |
| below_threshold (score < 0.15) | 0 | PASS (= 0) |
| max_per_artist | 10 | PASS (<= 10) |
| asymmetric pairs | 0 | PASS (= 0) |

**Artists with similarity data:** 218
**Sample DB context:** This is a subset of the full 2.6M artist dataset. On the full DB, computation will take 5-15 minutes and produce many more pairs.

## Decisions Made
- **4-phase SQL approach**: Plan's original UNION of ranked_forward + ranked_backward was incorrect. It could give any artist up to 20 entries (from both sides of UNION) and didn't guarantee symmetry. Fixed with: score unique pairs → symmetric expansion + top-10 ranking → symmetry backfill → top-K enforcement + orphan cleanup.
- **Top-K and symmetry are in tension on small datasets**: A popular artist appearing in 16 others' top-10 lists would get 16 reverse entries from the symmetry pass, exceeding 10. The enforcement pass (D4) trims to top-10, then D5 removes orphaned non-symmetric pairs created by the trim. This is the minimal correct solution.
- **Kept INSERT OR IGNORE** for the symmetry pass — avoids score overwrites when a pair is already stored in both directions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect SQL producing asymmetric pairs and max_per_artist > 10**
- **Found during:** Task 2 (data integrity verification)
- **Issue:** The plan's UNION of ranked_forward + ranked_backward WHERE rn <= 10 produced: (a) artists with up to 14-16 entries when they appeared in both sides of the UNION, and (b) 8 asymmetric pairs where A→B existed but B→A did not
- **Root cause:** The UNION combined two independently ranked sets for the same artist_id. ranked_backward rn <= 10 doesn't guarantee the reverse of every ranked_forward entry.
- **Fix:** Replaced with 4-phase approach — score unique undirected pairs, symmetric UNION ALL expansion with per-artist ranking, top-10 selection and direct insert, explicit symmetry backfill pass, top-K trim, orphan cleanup
- **Files modified:** `pipeline/build-similar-artists.mjs`
- **Verification:** All 4 integrity checks pass (total=746, threshold=0, max=10, asymmetric=0). Idempotent on second run.
- **Committed in:** `41f8bec2`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's SQL logic)
**Impact on plan:** Auto-fix required for correctness — the plan's SQL produced invalid data. No scope creep.

## Issues Encountered
- `sqlite3` CLI not on PATH on this machine — used Node.js + better-sqlite3 (already available in pipeline/) for all integrity checks. Results equivalent.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `similar_artists` table exists and is populated in mercury.db
- All integrity constraints verified
- Phase 35 (Rabbit Hole) can now implement `getSimilarArtists(artistId)` queries
- Script is ready to re-run against the full 2.6M artist DB when it's available

---
*Phase: 34-pipeline-foundation*
*Completed: 2026-03-04*
