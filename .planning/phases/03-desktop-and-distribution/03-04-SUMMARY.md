---
phase: 03-desktop-and-distribution
plan: 04
subsystem: desktop
tags: [tauri, sqlite, rust, svelte, gzip, torrent, first-run, distribution]

# Dependency graph
requires:
  - phase: 03-desktop-and-distribution/03-03
    provides: Universal load functions for search and artist pages — Tauri-aware data layer
  - phase: 03-desktop-and-distribution/03-01
    provides: DbProvider interface, TauriProvider, database abstraction layer
provides:
  - check_database Tauri command that checks mercury.db existence in app data dir
  - DatabaseSetup.svelte first-run UI component shown when database is missing
  - Landing page database detection flow (checking/missing/ready states)
  - pipeline/compress-db.js distribution script producing .gz + .sha256 + .torrent
affects:
  - 03-05-desktop-and-distribution
  - distribution-pipeline
  - first-run-experience

# Tech tracking
tech-stack:
  added: [create-torrent npm package]
  patterns:
    - check_database Tauri command returns {exists, path, dir} JSON
    - First-run state machine: checking -> ready | missing
    - isTauri() gate for all Tauri-specific initialization code
    - Streaming gzip compression via Node.js pipeline() for large files
    - appDataDir() path normalization — replaceAll backslashes, ensure trailing slash

key-files:
  created:
    - src/lib/components/DatabaseSetup.svelte
    - pipeline/compress-db.js
  modified:
    - src-tauri/src/lib.rs
    - src/routes/+page.svelte
    - src/lib/db/tauri-provider.ts

key-decisions:
  - "Database not bundled with installer — first-run UI guides user to download mercury.db separately"
  - "Gzip (level 9) for database compression — built into Node.js, no native dependencies. 53% reduction on 778MB db"
  - "Torrent distribution uses public trackers + web seed placeholder URL"
  - "TauriProvider uses explicit appDataDir path for database loading (not implicit relative path)"

patterns-established:
  - "First-run detection: invoke check_database on mount, render DatabaseSetup when missing"
  - "appDataDir() path normalization: replaceAll('\\', '/').replace(/\\/?$/, '/') for SQLite URI"
  - "Distribution pipeline stages: compress -> checksum -> torrent, each independently logged"

requirements-completed: [DIST-01]

# Metrics
duration: ~12min
completed: 2026-02-16
---

# Phase 3 Plan 04: Database Detection, First-Run UI, and Distribution Pipeline Summary

**Tauri command checks mercury.db on launch, shows setup screen if missing, compression pipeline produces 778MB->365MB gzip + SHA256 + torrent artifacts**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-16T21:49Z
- **Completed:** 2026-02-16T22:56Z
- **Tasks:** 2 (+ 1 checkpoint)
- **Files modified:** 7

## Accomplishments
- `check_database` Tauri command returns `{exists, path, dir}` — used to detect whether mercury.db is present in the app data directory on first launch
- `DatabaseSetup.svelte` full-page setup screen shows download instructions, expected file path, and a "Check Again" button with loading state
- Landing page wired to show checking/missing/ready states — web build always shows ready, Tauri builds check on mount
- `compress-db.js` pipeline produces three distribution artifacts in one command: `.gz` (53% reduction), `.sha256` checksum, `.torrent` with 4 public trackers and web seed URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Database detection command and first-run UI** - `2e2bce1` (feat)
2. **Task 2: Database compression and torrent creation pipeline** - `f365c57` (feat)
3. **State update** - `238414c` (docs)
4. **Bug fix: database path separator** - `6c3288f` (fix)

**Plan metadata:** (this SUMMARY.md)

## Files Created/Modified
- `src-tauri/src/lib.rs` — Added `check_database` command registered in invoke_handler
- `src/lib/components/DatabaseSetup.svelte` — First-run setup screen with DB path display and retry button
- `src/routes/+page.svelte` — Database detection state machine on mount; conditional rendering
- `src/lib/db/tauri-provider.ts` — Explicit appDataDir path with Windows backslash normalization
- `pipeline/compress-db.js` — Full distribution pipeline: gzip compress, SHA256 checksum, torrent creation
- `pipeline/package.json` — Added create-torrent dependency
- `pipeline/package-lock.json` — Lock file update

## Decisions Made
- Database not bundled with installer — 778MB is too large; first-run UI guides user to download separately
- Gzip level 9 (maximum compression) using built-in Node.js zlib — no native dependencies, 53% reduction achieved
- Torrent uses 4 public trackers + placeholder web seed URL (https://download.mercury.app/mercury.db.gz) — update when hosting is set up
- TauriProvider uses explicit `appDataDir()` path rather than relying on tauri-plugin-sql's implicit resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Windows path separator causing wrong database location**
- **Found during:** Post-Task 1 verification (Tauri dev testing)
- **Issue:** `appDataDir()` returns path without trailing slash on Windows. Concatenating filename directly produced `com.mercury.appmercury.db` instead of `com.mercury.app/mercury.db`. SQLite silently created an empty DB at the wrong path, causing search to return no results.
- **Fix:** Added path normalization: `dir.replaceAll('\\', '/').replace(/\/?$/, '/')` to ensure forward slashes and trailing slash before concatenating filename
- **Files modified:** `src/lib/db/tauri-provider.ts`
- **Verification:** Desktop search returned results after fix; database correctly located
- **Committed in:** `6c3288f`

---

**Total deviations:** 1 auto-fixed (Rule 1 - path separator bug)
**Impact on plan:** Critical correctness fix — desktop search was completely broken without it. No scope creep.

## Issues Encountered
- Windows path separator bug: `appDataDir()` omits trailing slash, concatenation without separator created malformed path. Fixed immediately, documented in BUILD-LOG.md entry #028.

## User Setup Required
None — no external service configuration required. The compression pipeline uses public trackers and a placeholder web seed URL that will be updated when hosting is configured.

## Next Phase Readiness
- First-run experience complete — desktop app correctly detects database presence
- Distribution pipeline ready to generate artifacts once the full mercury.db is built
- Plan 03-05 (auto-updater + NSIS installer) can proceed — this plan's artifacts are the prerequisite
- Web seed URL placeholder in compress-db.js needs updating when hosting is configured

---
*Phase: 03-desktop-and-distribution*
*Completed: 2026-02-16*
