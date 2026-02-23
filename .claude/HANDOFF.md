# Work Handoff - 2026-02-23 (Search Hang Debug)

## Current Task
Debug and fix why search never completes in production Tauri app.

## Context
Production build (commit `348ec32`) works: JS executes, home page shows, `check_database` succeeds.
But navigating to `/search?q=Radiohead` makes the loading bar spin forever — the SvelteKit `load`
function in `src/routes/search/+page.ts` never returns.

## Investigation Summary

### Root cause NOT yet identified. Hypotheses in priority order:

1. **FTS5 query extremely slow** — mercury.db has 2.6M artists. The FTS5 MATCH query with
   `artists_fts MATCH 'Radiohead' ORDER BY ... f.rank LIMIT 50` might be doing expensive segment
   merging or housekeeping on first query. Should complete eventually but maybe takes minutes.

2. **Rust panic on blocking thread** — if `query_mercury_db` panics, the blocking thread dies
   without sending an IPC response. JS invoke() promise hangs forever. App window stays open.
   (Most likely if 15s timeout fires and issue doesn't recover.)

3. **sqlite-vec auto-extension conflict** — `register_vec_extension()` is called globally as
   `sqlite3_auto_extension` in `init_taste_db()`. mercury.db was opened BEFORE this call (safe),
   but if `match_artists_batch` opens a SECOND connection to mercury.db after the call, that
   connection would try to load sqlite-vec. This second connection + the shared state connection
   could create SQLite locking issues.

4. **MercuryDbState mutex poisoned** — if the mutex was poisoned by a panic on a previous attempt,
   `.lock()` would return `Err` → but we `map_err` this, so it should return a Rust error (not hang).

### Code trace
- `searchArtists(provider, q)` → `TauriProvider.all(sql, ...params)` → `invoke('query_mercury_db', {sql, params})`
- Rust: `query_mercury_db` locks `MercuryDbState`, gets `Option<Connection>`, runs FTS5 SQL
- `get_library_tracks` also called → locks `LibraryState` → returns all tracks in library.db
- `loadAiSettings()` (on layout mount, works fine) → uses `TasteDbState` (different mutex, no conflict)
- None of the 4 State types share mutexes or cross-lock each other → no deadlock possible (in theory)

### What DOES work
- `check_database` → no State, works ✓
- `get_all_ai_settings` → TasteDbState, works ✓ (layout mounts, AI settings loaded)
- `get_ai_status` → SidecarState, works ✓ (AI health poll loop runs)

### What HANGS
- `invoke('query_mercury_db', ...)` → MercuryDbState ← exact behavior to confirm with diagnostics

## Diagnostic Code Added (NOT YET REBUILT)

All changes are uncommitted. When you resume, you need to build first:

1. **`src-tauri/Cargo.toml`** — added `devtools` feature to tauri:
   ```toml
   tauri = { version = "2", features = ["protocol-asset", "devtools"] }
   ```

2. **`src-tauri/src/lib.rs`** — added `open_devtools()` in setup (unconditional, forces DevTools open):
   ```rust
   if let Some(window) = app.get_webview_window("main") {
       window.open_devtools();
   }
   ```

3. **`src/lib/db/tauri-provider.ts`** — added 15s timeout + console.log:
   - Logs SQL before invoke
   - Rejects with error message if invoke doesn't return within 15s
   - Logs row count after invoke succeeds

4. **`src/routes/search/+page.ts`** — added console.log at each step:
   - `[search] load start`
   - `[search] getProvider...`
   - `[search] searchArtists/searchByTag...`
   - `[search] results: N`
   - `[search] getLibraryTracks...`
   - `[search] getLibraryTracks done: N`

## Next Steps

### Step 1: Build production exe with diagnostics
```bash
npm run tauri build -- --no-bundle
```
(takes ~5 minutes, output at `src-tauri/target/release/mercury.exe`)

### Step 2: Launch exe and test
- Launch `mercury.exe`
- DevTools will open automatically
- Go to Console tab in DevTools
- Type "Radiohead" in search bar, hit Enter
- Watch console output

### Step 3: Interpret results
**Case A: Console shows `[search] load start` then `[search] getProvider...` then hangs**
→ The `getProvider()` itself hangs? Unlikely. Check for import errors.

**Case B: Console shows `[search] searchArtists/searchByTag...` then `query_mercury_db timed out (15s)`**
→ Rust command is not responding. Either:
- SQLite query is extremely slow (FTS5 issue)
- Rust panic (no IPC response)
→ **Fix A**: Increase SQLite analyze/busy timeout in `init_mercury_db`
→ **Fix B**: Add `PRAGMA analysis_limit=100;` before first query
→ **Fix C**: Use LIKE-only search as a fallback (skip FTS5)

**Case C: Console shows `[search] results: 0` then hangs at getLibraryTracks**
→ `query_mercury_db` works but `get_library_tracks` hangs
→ Fix: `scan_folder` might be holding LibraryState mutex; add timeout or make scan release lock periodically

**Case D: Console shows everything completes fine but page still hangs**
→ The hang is in the Svelte rendering, not the load function
→ Check the search page component for infinite loops or render errors

### Step 4: Apply fix based on diagnosis

**If FTS5 is slow**: Skip FTS5 in TypeScript, use LIKE only:
In `src/lib/db/queries.ts`, change `searchArtists` to always use the LIKE path:
```typescript
// Force LIKE fallback (skip FTS5) for now
const sanitized = ''; // sanitizeFtsQuery(query);
```

**If Rust panics**: Look at the actual panic message in DevTools stderr, add error handling.

**If it works in diagnostics**: The problem might be timing — load the app fresh and test before AI init runs.

### Step 5: Clean up diagnostics after fix
Remove console.logs, remove `open_devtools()`, remove devtools feature from Cargo.toml.
All files with temp debug code:
- `src-tauri/Cargo.toml` — remove `"devtools"` from tauri features
- `src-tauri/src/lib.rs` — remove `window.open_devtools()` block
- `src/lib/db/tauri-provider.ts` — restore simple `return invoke<T[]>(...)`
- `src/routes/search/+page.ts` — remove console.log lines

## Relevant Files
- `src/routes/search/+page.ts` — SvelteKit load function, calls search + library lookup
- `src/lib/db/tauri-provider.ts` — Tauri invoke wrapper for query_mercury_db
- `src/lib/db/queries.ts` — SQL queries (FTS5 search, LIKE fallback)
- `src-tauri/src/mercury_db.rs` — `query_mercury_db` Rust command (uses MercuryDbState mutex)
- `src-tauri/src/scanner/mod.rs` — `get_library_tracks` (uses LibraryState mutex)
- `src-tauri/src/lib.rs` — app setup, State registrations (order: library→mercury→taste)
- `src-tauri/src/ai/taste_db.rs` — calls `register_vec_extension()` as sqlite3_auto_extension
- `src-tauri/src/ai/embeddings.rs` — defines `register_vec_extension()` (global auto-extension!)

## Git Status
- Uncommitted changes in: BUILD-LOG.md, Cargo.toml, lib.rs, tauri-provider.ts, +page.ts
- All diagnostic code, NOT committed
- Last committed: `348ec32` (cleanup of previous debug code)

## Resume Command
After running `/clear`, run `/resume` to continue.
