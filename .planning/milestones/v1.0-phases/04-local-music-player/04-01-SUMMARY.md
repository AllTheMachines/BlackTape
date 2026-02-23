---
phase: 04-local-music-player
plan: 01
subsystem: backend
tags: [rust, tauri, lofty, rusqlite, walkdir, audio-metadata, sqlite, scanner]

# Dependency graph
requires:
  - phase: 03-desktop-app
    provides: Tauri 2.0 desktop shell with plugin infrastructure
provides:
  - Rust music folder scanner with recursive directory traversal
  - lofty-based audio metadata reader for 8 formats
  - Separate library.db SQLite database for local music tracks
  - Tauri IPC commands for scan_folder, get_library_tracks, get/add/remove_music_folders
  - Asset protocol configuration for local audio file playback
  - Dialog plugin for native OS folder picker
affects: [04-02 audio-playback, 04-03 library-ui, 04-04 playback-controls, 04-05 integration]

# Tech tracking
tech-stack:
  added: [lofty 0.23, walkdir 2, rusqlite 0.31, tauri-plugin-dialog 2]
  patterns: [LibraryState managed state with Mutex<Connection>, Channel-based progress streaming, setup() callback for DB init]

key-files:
  created:
    - src-tauri/src/scanner/mod.rs
    - src-tauri/src/scanner/metadata.rs
    - src-tauri/src/library/mod.rs
    - src-tauri/src/library/db.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/tauri.conf.json
    - src-tauri/capabilities/default.json

key-decisions:
  - "rusqlite 0.31 (not 0.33) to avoid libsqlite3-sys link conflict with tauri-plugin-sql's sqlx dependency"
  - "library.db is separate from mercury.db — rusqlite for library, tauri-plugin-sql for mercury catalog"
  - "Scan progress batched every 50 files to avoid IPC flood"
  - "Year extracted from ItemKey::Year with RecordingDate fallback (lofty 0.23 has no Accessor::year())"
  - "All file paths normalized to forward slashes before storage"
  - "LibraryState uses Mutex<Connection> as Tauri managed state, initialized in setup() callback"

patterns-established:
  - "Separate databases pattern: rusqlite direct for library.db, tauri-plugin-sql for mercury.db"
  - "LibraryState(Mutex<Connection>) as managed Tauri state for thread-safe DB access"
  - "Channel<T> for streaming progress from async Tauri commands to frontend"
  - "setup() callback for app initialization that needs AppHandle (data dirs, DB init)"

# Metrics
duration: 7min
completed: 2026-02-16
---

# Phase 4 Plan 1: Music Scanner Backend Summary

**Rust folder scanner with lofty metadata reading, rusqlite library.db, and 5 Tauri IPC commands for scanning/querying local music**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-16T22:48:33Z
- **Completed:** 2026-02-16T22:55:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Metadata reader parses title, artist, album, album_artist, track/disc number, genre, year, duration from 8 audio formats (mp3, flac, ogg, m4a, aac, wav, opus, wv)
- Library database with local_tracks and music_folders tables, indexed on artist/album/path
- Scanner walks directories recursively, reads metadata via lofty, stores in library.db with file modification timestamps
- All 5 Tauri commands registered: scan_folder (with Channel progress), get_library_tracks, get_music_folders, add_music_folder, remove_music_folder
- Asset protocol enabled for audio file playback from user directories
- Dialog plugin configured for native OS folder picker

## Task Commits

Each task was committed atomically:

1. **Task 1: Rust dependencies, library database, and metadata reader** - `5f2c71c` (feat)
2. **Task 2: Scanner commands, folder picker, and Tauri integration** - `04c3a20` (feat)

## Files Created/Modified
- `src-tauri/src/scanner/metadata.rs` - lofty-based audio metadata reader with TrackMetadata struct
- `src-tauri/src/scanner/mod.rs` - Scanner orchestration with scan_folder, get/add/remove commands
- `src-tauri/src/library/db.rs` - SQLite operations for local_tracks and music_folders tables
- `src-tauri/src/library/mod.rs` - Library module entry point with re-exports
- `src-tauri/Cargo.toml` - Added lofty, walkdir, tauri-plugin-dialog, rusqlite dependencies
- `src-tauri/src/lib.rs` - Registered all commands, dialog plugin, setup() for DB init
- `src-tauri/tauri.conf.json` - Enabled asset protocol for audio file access
- `src-tauri/capabilities/default.json` - Added dialog:default and dialog:allow-open permissions

## Decisions Made
- **rusqlite 0.31 over 0.33:** Both rusqlite and tauri-plugin-sql (via sqlx) link native sqlite3 library. rusqlite 0.33 uses libsqlite3-sys 0.31 which conflicts with sqlx's libsqlite3-sys 0.28. Downgrading rusqlite to 0.31 resolves the conflict since both then use libsqlite3-sys 0.28.
- **Year extraction via ItemKey:** lofty 0.23 removed `Accessor::year()`. Replaced with `get_string(ItemKey::Year)` with `ItemKey::RecordingDate` fallback, parsing the first 4 chars as year.
- **protocol-asset feature:** Tauri 2 requires explicit `protocol-asset` feature in Cargo.toml when assetProtocol is enabled in tauri.conf.json.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] libsqlite3-sys link conflict between rusqlite and tauri-plugin-sql**
- **Found during:** Task 1 (cargo check)
- **Issue:** rusqlite 0.33 depends on libsqlite3-sys 0.31, but tauri-plugin-sql (via sqlx) depends on libsqlite3-sys 0.28. Cargo refuses two crates linking the same native library.
- **Fix:** Downgraded rusqlite from 0.33 to 0.31, which uses the same libsqlite3-sys 0.28 as sqlx.
- **Files modified:** src-tauri/Cargo.toml
- **Verification:** cargo check compiles cleanly
- **Committed in:** 5f2c71c (Task 1 commit)

**2. [Rule 1 - Bug] lofty 0.23 API changes for get_string and year**
- **Found during:** Task 1 (cargo check)
- **Issue:** `get_string()` takes `ItemKey` by value not reference in lofty 0.23, and `Accessor::year()` method was removed.
- **Fix:** Removed `&` from `ItemKey::AlbumArtist`, replaced `tag.year()` with `get_string(ItemKey::Year)` + `RecordingDate` fallback with string parsing.
- **Files modified:** src-tauri/src/scanner/metadata.rs
- **Verification:** cargo check compiles cleanly
- **Committed in:** 5f2c71c (Task 1 commit)

**3. [Rule 3 - Blocking] Missing protocol-asset feature for Tauri**
- **Found during:** Task 2 (cargo check)
- **Issue:** Tauri build script validates that Cargo.toml features match tauri.conf.json config. assetProtocol requires `protocol-asset` feature.
- **Fix:** Added `protocol-asset` to tauri features in Cargo.toml.
- **Files modified:** src-tauri/Cargo.toml
- **Verification:** cargo check compiles cleanly
- **Committed in:** 04c3a20 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for compilation. No scope creep. rusqlite version downgrade is functionally equivalent.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scanner backend complete and ready for frontend integration (04-03 library UI)
- Audio playback backend (04-02) can build on asset protocol and library.db
- All Tauri commands registered and available for `invoke()` from SvelteKit frontend
- library.db created automatically on app startup in app data directory

## Self-Check: PASSED

- All 9 key files verified present
- Commit 5f2c71c (Task 1) verified in git log
- Commit 04c3a20 (Task 2) verified in git log
- cargo check compiles with zero warnings

---
*Phase: 04-local-music-player*
*Completed: 2026-02-16*
