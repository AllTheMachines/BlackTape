---
phase: 17-artist-stats-dashboard
plan: 01
subsystem: stats-dashboard
tags: [rust, svelte, sqlite, tauri, artist-stats]
requirements: [STAT-01, STAT-02]

dependency_graph:
  requires: []
  provides:
    - ArtistStats.svelte component (ready to import)
    - record_artist_visit Tauri command (ready to invoke)
    - getArtistTagDistribution() query (ready to call)
  affects:
    - src-tauri/src/ai/taste_db.rs
    - src-tauri/src/lib.rs
    - src/lib/db/queries.ts
    - src/lib/components/ArtistStats.svelte

tech_stack:
  added: []
  patterns:
    - Rust ON CONFLICT DO UPDATE for idempotent visit counting
    - Svelte 5 $derived for reactive sort/max computation
    - Dynamic import of getProvider() in onMount for Tauri-only DB access
    - Locked tier vocabulary (Common/Niche/Rare/Ultra Rare) separated from badge vocabulary

key_files:
  created:
    - src/lib/components/ArtistStats.svelte
  modified:
    - src-tauri/src/ai/taste_db.rs
    - src-tauri/src/lib.rs
    - src/lib/db/queries.ts

decisions:
  - "Tier vocabulary for stats hero locked as Common/Niche/Rare/Ultra Rare — distinct from UniquenessScore.svelte badge which uses Very Niche/Niche/Eclectic/Mainstream"
  - "Bar chart uses count DESC (MusicBrainz votes on this artist) for visual order; rarest tag identified via artist_count ASC from query (distribution[0])"
  - "visit_count tracking is completely silent — stored in taste.db, no UI surface, reserved for future local recommendations"
  - "COALESCE(ts.artist_count, 1) in getArtistTagDistribution ensures tags missing from tag_stats do not break query"

metrics:
  duration: "8 minutes"
  completed: "2026-02-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 17 Plan 01: Artist Stats Dashboard — Building Blocks Summary

**One-liner:** Rust visit-tracking command with ON CONFLICT upsert, tag distribution SQL query ordered rarest-first, and ArtistStats.svelte hero + bar chart component with locked tier vocabulary.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rust artist_visits table + record_artist_visit + lib.rs | dffdccb | taste_db.rs, lib.rs |
| 2 | queries.ts ArtistTagStat + getArtistTagDistribution + ArtistStats.svelte | 7f46158 | queries.ts, ArtistStats.svelte |

## What Was Built

### Task 1 — Rust Backend

**`src-tauri/src/ai/taste_db.rs`:**
- Added `artist_visits` table DDL to `init_taste_db()` CREATE batch (after `feature_requests`):
  ```sql
  CREATE TABLE IF NOT EXISTS artist_visits (
      artist_mbid TEXT PRIMARY KEY,
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_visited INTEGER NOT NULL
  );
  ```
- Added `record_artist_visit` Tauri command using `TasteDbState` (not MercuryDbState). Upserts with `visit_count = visit_count + 1` and updates `last_visited` timestamp.
- Added `#[cfg(test)]` module with `record_artist_visit_inserts_and_increments` test — verifies first insert (count=1) and second insert (count=2 via ON CONFLICT DO UPDATE).

**`src-tauri/src/lib.rs`:**
- Registered `ai::taste_db::record_artist_visit` in `tauri::generate_handler![]` immediately after `upvote_feature_request`.

### Task 2 — TypeScript Query + Svelte Component

**`src/lib/db/queries.ts`:**
- Added `ArtistTagStat` interface (tag, artist_count, count) with clear JSDoc explaining the global vs local distinction.
- Added `getArtistTagDistribution()` function: LEFT JOINs `artist_tags` with `tag_stats`, uses `COALESCE(ts.artist_count, 1)` for robustness, orders by `artist_count ASC` so `distribution[0]` is the rarest tag globally.

**`src/lib/components/ArtistStats.svelte`:**
- Props: `artistId: number`, `score: number | null`, `tagCount: number`
- `onMount`: dynamically imports `getProvider()` and `getArtistTagDistribution()`, fetches distribution
- `$derived` state: `sortedByCount` (by count DESC for bar chart), `maxCount` (for proportional bars), `rarestTag` (distribution[0].tag)
- Tier function: `getTier()` uses locked vocabulary (Ultra Rare ≥ 100, Rare ≥ 8, Niche ≥ 0.36, Common otherwise)
- Layout: loading state → hero (score + tier, or "No tag data") → rarest tag link → tag distribution bar chart
- All `data-testid` attributes: `artist-stats`, `stats-loading`, `stats-hero`, `rarest-tag`, `tag-distribution`
- Bar chart: plain `<a>` tag links (not TagChip), bars use `--text-accent` CSS variable, proportional to max count on this artist

## Verification

All checks passed:
- `cargo check` exits 0
- `cargo test` 24/24 passed — including `record_artist_visit_inserts_and_increments`
- `npm run check` 579 files, 0 errors
- All artifact checks confirmed:
  - `getArtistTagDistribution` exists in queries.ts (line 447)
  - `ai::taste_db::record_artist_visit` registered in lib.rs (line 171)
  - `artist_visits` DDL in taste_db.rs (line 116)
  - `ArtistStats.svelte` file exists

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/lib/components/ArtistStats.svelte` — FOUND
- `src/lib/db/queries.ts` contains `getArtistTagDistribution` — FOUND
- `src-tauri/src/ai/taste_db.rs` contains `artist_visits` DDL and `record_artist_visit` — FOUND
- `src-tauri/src/lib.rs` contains `ai::taste_db::record_artist_visit` — FOUND
- Commit `dffdccb` — FOUND (Task 1)
- Commit `7f46158` — FOUND (Task 2)
