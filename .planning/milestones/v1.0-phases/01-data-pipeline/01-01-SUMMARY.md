---
phase: 01-data-pipeline
plan: 01
subsystem: database
tags: [musicbrainz, sqlite, fts5, pipeline, node]

requires:
  - phase: none
    provides: nothing (first phase)
provides:
  - MusicBrainz data pipeline (download, extract, import)
  - SQLite database with FTS5 full-text search (2.8M artists)
  - Tag system with 672K artist-tag links
  - Verification script for database health
affects: [search, discovery, desktop, distribution]

tech-stack:
  added: [better-sqlite3, tar, unbzip2-stream]
  patterns: [pipeline scripts in pipeline/, MusicBrainz TSV parsing]

key-files:
  created:
    - pipeline/download.js
    - pipeline/import.js
    - pipeline/verify.js
    - pipeline/lib/schema.sql
    - pipeline/lib/tables.js
    - pipeline/lib/parse-tsv.js

key-decisions:
  - "Slim DB: artists + tags + country only (not releases, URLs, bios)"
  - "Mercury is independent catalog, not MusicBrainz frontend"
  - "5 MusicBrainz tables (artist, artist_type, area, tag, artist_tag) — slimmed from 15"

patterns-established:
  - "Pipeline scripts in pipeline/ directory with own package.json"
  - "Data files in pipeline/data/ (gitignored — 7GB+ downloads)"
  - "MusicBrainz PostgreSQL COPY format parsing via custom TSV parser"

duration: pre-GSD
completed: 2026-02-14
---

# Phase 1: Data Pipeline Summary

**MusicBrainz data pipeline built and verified — 2.8M artists searchable via FTS5.**

## Performance

- **Duration:** Pre-GSD (built in initial session)
- **Completed:** 2026-02-14
- **Files modified:** 8

## Accomplishments
- Pipeline downloads MusicBrainz dumps (mbdump.tar.bz2 + mbdump-derived.tar.bz2)
- Extracts 5 tables: artist, artist_type, area, tag, artist_tag
- Imports into SQLite with FTS5 full-text search index
- 2,803,984 artists indexed with 672,966 tag links
- Database: 713MB on disk (pre-compression)
- Verification script confirms search works ("radiohead" returns instant results)

## Task Commits

1. **Pipeline + build log viewer** - `0fb8268` (feat)

## Key Artifacts
- `pipeline/data/mercury.db` — the SQLite database (gitignored)
- `pipeline/download.js` — downloads MusicBrainz dumps with progress
- `pipeline/import.js` — extract, lookup tables, artists, tags, FTS5
- `pipeline/verify.js` — search test, stats, tag co-occurrence, style map preview

## Next Phase Readiness
Phase 2 can begin — the database is populated and searchable.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-14*
