# Work Handoff - 2026-02-23 (updated)

## Current Task
Tauri search fix is complete — needs production build + real-device test

## Context
All code changes are committed (bed7835). The fix bypasses `tauri-plugin-sql` entirely:
- `src-tauri/src/mercury_db.rs` — `query_mercury_db` Rust command (generic SQL via rusqlite)
- `src-tauri/src/lib.rs` — mod wired, state initialized, commands registered
- `src/lib/db/tauri-provider.ts` — uses `invoke('query_mercury_db')` instead of `Database.load()`

`cargo check` passes. `npm run check` passes (0 errors).

## Remaining
1. **`npm run tauri build`** — production build (takes ~10 min)
2. Copy `mercury.db` to app data dir if not already there
3. Launch the built `.exe`, test search — should no longer hang

## Key Decisions (already implemented)
- Generic `query_mercury_db` command instead of 4 specific ones — covers ALL queries (discover, crate dig, genre graph, etc.) not just search
- `MercuryDbState(Mutex<Option<Connection>>)` — graceful startup even if mercury.db absent
- tauri-plugin-sql kept in Cargo.toml/capabilities but no longer used for mercury.db

## Resume Command
After running `/clear`, run `/resume` to continue.
