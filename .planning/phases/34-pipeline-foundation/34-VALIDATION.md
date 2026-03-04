---
phase: 34
slug: pipeline-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — pipeline scripts validated by DB inspection; Rust by manual test |
| **Config file** | none — Wave 0 notes required |
| **Quick run command** | `node pipeline/build-similar-artists.mjs --dry-run` / SQLite count queries |
| **Full suite command** | Run all 3 pipeline scripts + SQLite assertion queries + manual track cache test |
| **Estimated runtime** | ~5-20 minutes (similar_artists SQL may be slow at full scale) |

---

## Sampling Rate

- **After every task commit:** Inspect DB row counts or PRAGMA output confirming structural changes
- **After every plan wave:** Run full pipeline script for that wave + SQLite assertion queries
- **Before `/gsd:verify-work`:** All three workstreams validated end-to-end
- **Max feedback latency:** Varies — pipeline scripts run minutes, DB queries run seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | similar_artists table | manual | `SELECT COUNT(*) FROM similar_artists;` on mercury.db | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 1 | Symmetric pairs | manual | `SELECT COUNT(*) FROM similar_artists sa1 LEFT JOIN similar_artists sa2 ON sa1.artist_id=sa2.similar_id AND sa1.similar_id=sa2.artist_id WHERE sa2.artist_id IS NULL;` | ❌ W0 | ⬜ pending |
| 34-01-03 | 01 | 1 | Jaccard threshold | manual | `SELECT MIN(score), MAX(score) FROM similar_artists;` | ❌ W0 | ⬜ pending |
| 34-02-01 | 02 | 1 | Geocoding columns | manual | `PRAGMA table_info('artists');` — check city_lat, city_lng, city_precision | ❌ W0 | ⬜ pending |
| 34-02-02 | 02 | 1 | Geocoded artists | manual | `SELECT city_precision, COUNT(*) FROM artists WHERE city_precision IS NOT NULL GROUP BY city_precision;` | ❌ W0 | ⬜ pending |
| 34-03-01 | 03 | 2 | release_group_cache table | manual | `SELECT COUNT(*) FROM release_group_cache;` on taste.db (after visiting artist page) | ❌ W0 | ⬜ pending |
| 34-03-02 | 03 | 2 | Cache hit on 2nd visit | manual | Visit artist page twice; 2nd visit must be instant (no MB API call delay) | ❌ W0 | ⬜ pending |
| 34-04-01 | 04 | 2 | getSimilarArtists query | manual | TypeScript type check + manual artist page load | ❌ W0 | ⬜ pending |
| 34-04-02 | 04 | 2 | getGeocodedArtists query | manual | TypeScript type check + verify query returns lat/lng | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework configured — pipeline scripts validated by SQLite inspection queries
- [ ] Rust Tauri command tested via manual artist page load (no unit test infrastructure for taste_db commands)

*Existing infrastructure: no automated test files for pipeline scripts or Rust commands in this codebase. All validation is run-and-inspect.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| similar_artists table populated with symmetric pairs | Context: symmetric constraint | No test framework; SQL query validates | Run `SELECT COUNT(*) FROM similar_artists;` on mercury.db — should be >0; check symmetry with JOIN query |
| Jaccard ≥ 0.15 AND shared ≥ 2 for all stored pairs | Context: threshold filter | Needs DB inspection | `SELECT COUNT(*) FROM similar_artists WHERE score < 0.15;` — must be 0 |
| city_lat/city_lng/city_precision populated on artists | Context: geocoding scope | Needs DB inspection | `SELECT city_precision, COUNT(*) FROM artists WHERE city_lat IS NOT NULL GROUP BY city_precision;` |
| Track cache: second visit to artist page is instant | Context: on-demand caching | Requires manual UI interaction | Open artist page → check taste.db for rows → open same page again → verify no delay |
| Artists with no tags get no similar list entry | Context: no forced filler | DB inspection | `SELECT COUNT(*) FROM similar_artists WHERE artist_id NOT IN (SELECT DISTINCT artist_id FROM artist_tags);` — must be 0 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency documented per workstream
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
