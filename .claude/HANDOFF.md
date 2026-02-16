# Mercury — Handoff

## Current State

**Phase 3: Desktop App Foundation** — Executing Wave 3 (plan 03-04), checkpoint paused for debugging.

Plans 03-01 through 03-03 complete. Plan 03-04 tasks 1-2 committed, but checkpoint verification revealed a **blocking bug**: tauri-plugin-sql's bundled SQLite lacks FTS5 support.

## What's Done (This Session)

### Plan 03-03: Universal Load Functions ✓
- Created `src/lib/platform.ts` — `isTauri()` using `window.__TAURI_INTERNALS__`
- Created `src/routes/search/+page.ts` — universal search load (web passthrough / Tauri local DB)
- Created `src/routes/artist/[slug]/+page.ts` — universal artist load (web passthrough / Tauri local DB + MusicBrainz links, releases, Wikipedia bio)
- All external fetches independently try/caught for granular graceful degradation
- Commits: `d26c5a0`, `3f80257`, `4de1170`, `ea3bea2`

### Plan 03-04: Tasks 1-2 Done, Checkpoint Blocked
- **Task 1 ✓**: Added `check_database` Tauri command in `src-tauri/src/lib.rs`, created `DatabaseSetup.svelte` first-run UI, wired into `+page.svelte` landing page, updated `tauri-provider.ts` to use explicit `appDataDir()` path
- **Task 2 ✓**: Created `pipeline/compress-db.js` — gzip compression (778MB → 365MB), SHA256 checksum, .torrent file with public trackers
- **Task 3 (checkpoint)**: BLOCKED — search fails with FTS5 error
- Commits: `2e2bce1`, `f365c57`, `238414c`

### Hotfixes Applied During Debugging (uncommitted)
- `src-tauri/tauri.conf.json`: Changed `beforeDevCommand` to `cross-env VITE_TAURI=1 npm run dev` (fixes SSR being enabled in Tauri dev mode)
- `src-tauri/capabilities/default.json`: Added `sql:allow-load` permission
- `src/lib/db/tauri-provider.ts`: Normalized Windows backslashes to forward slashes in SQLite URI
- `src/routes/search/+page.ts`: Added temporary `debugError` field for error visibility
- `src/routes/search/+page.svelte`: Added temporary debug error display

## THE BLOCKING BUG

**Error:** `error returned from database: (code: 1) no such table: artists_fts`

**Root Cause:** `tauri-plugin-sql` uses sqlx with `libsqlite3-sys` bundled SQLite. The bundled build does NOT include FTS5 by default. The `artists_fts` virtual table (FTS5) exists in mercury.db but SQLite can't read it because the FTS5 extension isn't compiled in.

**The Fix:**
Create `src-tauri/.cargo/config.toml` with:
```toml
[env]
LIBSQLITE3_FLAGS = "-DSQLITE_ENABLE_FTS5"
```
This tells `libsqlite3-sys` to compile SQLite with FTS5 support. Requires a full Cargo rebuild (`cargo clean` in src-tauri/).

**Verification After Fix:**
1. `cargo clean` in `src-tauri/` (force recompile of SQLite)
2. `npx tauri dev` (or `npm run tauri:dev`)
3. Search for an artist — should return results from local DB
4. Click an artist — should show artist page with DB data + MusicBrainz enrichment

## What's Next

1. **Fix the FTS5 bug** (see above)
2. **Clean up debug code** — remove `debugError` from `+page.ts` and `+page.svelte`
3. **Complete 03-04 checkpoint** — approve the first-run flow
4. **Commit the hotfixes** — the tauri.conf.json, capabilities, and tauri-provider fixes need committing
5. **Continue to 03-05** (Wave 4) — auto-updater signing keys, NSIS installer
6. **Phase verification** after 03-05

Resume: fix the FTS5 bug, then `/gsd:execute-phase 3` to continue (or manually complete 03-04 checkpoint + 03-05).

## Important Context

- **Rust PATH**: Not in default terminal PATH. Run `set PATH=%USERPROFILE%\.cargo\bin;%PATH%` in CMD or `$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"` in PowerShell before `npx tauri dev`.
- **mercury.db location**: `C:\Users\User\AppData\Roaming\com.mercury.app\mercury.db` (779MB, already copied from `pipeline/data/mercury.db`)
- **Database Setup UI**: Working — shows when DB missing, "Check Again" transitions to search UI
- **Web build**: Fully working (`npm run build` passes, Tauri code tree-shaken out)
- **Compression pipeline**: Working — `node pipeline/compress-db.js` produces .gz, .sha256, .torrent

## Key Decisions Made This Session

- `isTauri()` uses `window.__TAURI_INTERNALS__` check — zero-import platform detection
- Universal `+page.ts` coexists with `+page.server.ts` — web SSR returns data unchanged, Tauri queries local DB
- Dynamic imports isolate Tauri dependencies from web bundle
- Each external fetch (links, releases, bio) independently try/caught
- `beforeDevCommand` must include `VITE_TAURI=1` for Tauri dev mode to work (SSR must be disabled)
- gzip over zstd for compression — built into Node.js, no native deps
