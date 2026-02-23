# Work Handoff - 2026-02-23 (Tauri Navigation Fix)

## Current Task
Fix all Tauri navigation hangs — not just search, but all routes (artist pages, discover, kb, etc.)

## What Was Done This Session

### Root Cause (Fully Understood)
SvelteKit's client-side router fetches `__data.json` for every route with a `+page.server.ts`.
For dynamic paths (e.g. `/artist/[slug]`) that aren't pre-rendered, Tauri's `get_asset()` falls
back to serving `index.html`. SvelteKit then crashes on `JSON.parse('<DOCTYPE html...')`.

### Fixes Applied (all committed in this session)

**Fix 1 — `src/routes/search/+page.server.ts`** (from previous session, already committed):
- Pre-renders `build/search/__data.json` with `uses:{}` via Tauri-conditional prerender

**Fix 2 — `src-tauri/src/lib.rs`** (this session):
- Registered custom `tauri://` protocol handler via `.register_uri_scheme_protocol("tauri", ...)`
- Intercepts `__data.json` requests that fell back to `index.html` (detected by mime_type = text/html)
- Returns `{"type":"data","nodes":[null,{"type":"skip"}]}` — tells SvelteKit: no server data, use `+page.ts`
- All other requests served normally with CSP headers preserved

**Fix 3 — Cargo.toml** (this session):
- Added `"custom-protocol"` to tauri features
- Without this, `cfg(dev) = true` and Tauri points webview at `devUrl` (localhost:5173) instead of `tauri://localhost`
- With `"custom-protocol"`: `cfg(dev) = false`, webview uses `tauri://localhost`, our handler is invoked

**Diagnostic code cleaned up:**
- Removed `devtools` feature from Cargo.toml (had been there from debugging)
- Removed `open_devtools()` from lib.rs
- Reverted `TauriProvider.all()` to simple `invoke()` (removed timeout/console.logs)
- Removed console.log markers from `search/+page.ts`

## Current State — BUILD NOT YET COMPLETE

The rebuild with `custom-protocol` added failed because `mercury.exe` is still running (locking the file).

### To Complete:
1. **Close Mercury app** (if open)
2. **Kill llama-server if running** (locks DLLs in target/release/)
3. **Run**: `cd D:/Projects/Mercury/src-tauri && cargo build --release`
   - Should take ~1-2 min (only lib.rs changed)
4. **Test**: Launch `src-tauri/target/release/mercury.exe`
   - Search for "Radiohead" → should work ✓
   - Click on Radiohead artist → should load (previously hung) ✓
   - Navigate to another artist → should also work ✓

## Key Files Changed (uncommitted)
```
src-tauri/Cargo.toml           — added "custom-protocol" to tauri features
src-tauri/src/lib.rs           — added custom tauri:// protocol handler
src/lib/db/tauri-provider.ts   — cleaned up (reverted to simple invoke)
src/routes/search/+page.ts     — cleaned up (removed console.logs)
BUILD-LOG.md                   — session notes
```

## If Build Fails Again (llama DLL lock error)
The build script tries to update `target/release/llama-server.exe` but it may be locked:
```bash
rm -f "D:/Projects/Mercury/src-tauri/target/release/llama-server.exe"
# Then rebuild
```

## After Testing — Commit Message
```
fix(tauri): global __data.json handler prevents navigation crashes

Override tauri:// protocol to intercept missing __data.json requests.
SvelteKit fetches /__data.json for every server-load route. Dynamic paths
(e.g. /artist/[slug]) aren't pre-rendered — Tauri fell back to index.html,
causing JSON.parse crashes. Custom handler returns skip-node JSON instead.

Also adds custom-protocol feature so cfg(dev)=false and webview uses
tauri://localhost correctly in cargo build --release.
```

## Resume Command
After `/clear`, run `/resume` to continue.
