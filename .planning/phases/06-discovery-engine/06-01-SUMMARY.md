---
phase: 06-discovery-engine
plan: 01
subsystem: database
tags: [sqlite, pipeline, better-sqlite3, tag-stats, tag-cooccurrence, discovery]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: artist_tags table with 672K rows powering the aggregations
provides:
  - tag_stats table: per-tag artist_count + total_votes, 57,905 unique tags indexed
  - tag_cooccurrence table: 2,359 tag pair edges with shared_artists, canonical ordering
  - Phase F buildTagStats() and buildTagCooccurrence() functions in pipeline/import.js
affects:
  - 06-discovery-engine (all subsequent plans use tag_stats and tag_cooccurrence for ranking and style map)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-compute aggregations at pipeline build time (Phase F), not at query time
    - Idempotent pipeline steps via DELETE-before-INSERT pattern
    - CHECK constraint for canonical ordering (tag_a < tag_b) in co-occurrence pairs
    - HAVING + LIMIT guards against combinatorial explosion in self-join

key-files:
  created: []
  modified:
    - pipeline/import.js

key-decisions:
  - "Pre-compute tag statistics at pipeline build time — on-demand GROUP BY against 672K artist_tags rows is too slow for page load"
  - "tag_cooccurrence filters: count >= 2 on both tags, shared_artists >= 5, LIMIT 10000 — prevent combinatorial explosion without losing meaningful signal"
  - "CHECK (tag_a < tag_b) constraint enforces canonical pair ordering, zero duplicate edges"

patterns-established:
  - "Phase F: Discovery Engine pre-computations run after FTS5 (Phase E) in pipeline main()"
  - "Idempotent steps: CREATE TABLE IF NOT EXISTS + DELETE FROM before INSERT"

requirements-completed: [DISC-02, DISC-03]

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 6 Plan 01: Tag Statistics Pre-computation Summary

**Pre-computed tag_stats (57,905 tags) and tag_cooccurrence (2,359 edges) tables baked into mercury.db at pipeline build time, enabling sub-millisecond discovery queries**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-20T22:34:17Z
- **Completed:** 2026-02-20T22:39:00Z
- **Tasks:** 2
- **Files modified:** 2 (pipeline/import.js, BUILD-LOG.md)

## Accomplishments

- Added `buildTagStats()` function to pipeline — aggregates artist_tags into per-tag statistics (57,905 rows, ~2s build time)
- Added `buildTagCooccurrence()` function to pipeline — computes tag pair co-occurrence strength with guards against combinatorial explosion (2,359 edges, ~1s build time)
- Both steps are idempotent, indexed, and emit progress logging consistent with the existing pipeline style
- Phase F block added to main() after FTS5, with section header matching existing pipeline conventions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tag_stats table to pipeline** - `c2f0f6c` (feat)
2. **Task 2: Add tag_cooccurrence table to pipeline** - `c2f0f6c` (feat, same commit — same file, same phase)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified

- `pipeline/import.js` — Added Phase F section with `buildTagStats()` and `buildTagCooccurrence()` functions, called from `main()` after Phase E (FTS5)
- `BUILD-LOG.md` — Entry 022 documenting decisions and verification results

## Decisions Made

- Pre-compute at pipeline build time rather than query time. On-demand GROUP BY against 672K artist_tags rows takes multiple seconds. Pre-computation drops this to sub-millisecond indexed lookups.
- tag_cooccurrence filters (count >= 2 on both tags, HAVING shared_artists >= 5, LIMIT 10000) were specified in the plan and validated as correct — they produce 2,359 meaningful genre relationships from a dataset that could naively generate millions of pairs.
- CHECK (tag_a < tag_b) constraint enforces canonical pair ordering. Zero violations found.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `SELECT COUNT(*) FROM tag_stats;` → 57,905 (above 50K threshold)
- `SELECT COUNT(*) FROM tag_cooccurrence;` → 2,359 (within 1K–10K target)
- `SELECT * FROM tag_stats WHERE tag = 'rock';` → `{tag: 'rock', artist_count: 16570, total_votes: 19263}` (high artist count as expected)
- Top co-occurrence pairs: hard rock + rock (187), alternative rock + rock (176), pop rock + rock (159), alternative rock + indie rock (150), classical + composer (147) — recognizable genre relationships
- Idempotency: re-run produces identical row counts, no errors
- Constraint violations: 0

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- tag_stats and tag_cooccurrence are live in mercury.db, ready for all Phase 6 discovery features
- Phase 6 Plan 2 (uniqueness scoring, tag browsing) can proceed immediately

## Self-Check: PASSED

- pipeline/import.js: FOUND
- 06-01-SUMMARY.md: FOUND
- commit c2f0f6c: FOUND

---
*Phase: 06-discovery-engine*
*Completed: 2026-02-20*
