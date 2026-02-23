# Work Handoff - 2026-02-23

## Current Task
Debugging why JavaScript never executes in the production Tauri exe (WebView2 opens but JS is dead)

## Context
The tauri-plugin-sql hang fix was completed and committed (`bed7835`, `b5d9c24`). The fix uses direct rusqlite via `query_mercury_db` Rust command instead of `Database.load()`. Production build works (NSIS installer created, exe exists) but the app's JavaScript never runs.

## Progress

### Completed
- `mercury_db.rs` created — generic `query_mercury_db` SQL passthrough + 4 typed commands
- `lib.rs` wired up: MercuryDbState, 5 Tauri commands registered
- `tauri-provider.ts` updated: uses `invoke('query_mercury_db')` — no tauri-plugin-sql
- All above committed and working in dev (`npm run dev`)
- Multiple `npm run tauri build` runs completed successfully (NSIS installer at `bundle/nsis/`)
- WebView2 confirmed spawning: 5-6 `msedgewebview2.exe` child processes visible
- Ruled out: wrong exe, cfg(dev) flag, WebView2 user data cache (cleared `%LOCALAPPDATA%\com.mercury.app\EBWebView\`)
- Ruled out: frontend not embedded (confirmed build embeds from `../build`)

### In Progress
- Diagnosing root cause of JS not executing in WebView2

### Remaining
1. Find and fix the WebView2 JS execution issue
2. Clean up debug code in `src/routes/+page.svelte`
3. Test the actual search/artist pages work end-to-end in production build

## Key Decisions
- Skip tauri-plugin-sql entirely — use rusqlite directly via Rust commands
- Generic `query_mercury_db` passthrough handles all queries; typed commands available as alternatives
- `MercuryDbState(Mutex<Option<Connection>>)` — starts without DB, returns error on query if missing

## The Core Bug
**WebView2 spawns (5-6 child processes confirmed) but JavaScript NEVER executes.**

Evidence:
- Added `document.title = 'JS_OK:' + isTauri()` as the FIRST line of `checkDatabase()` with a 2-second hold
- Polled window title every 50ms for 7.5 seconds after launch
- Result: Title stays "Mercury" (native Tauri config) — `document.title` change never appears
- Same result after clearing WebView2 user data dir

What this means: WebView2 is opening but the page/JS is not loading. Possible causes:
- Virtual host `http://tauri.localhost/` not resolving or navigation failing silently
- Content serving issue with embedded assets
- WebView2 navigation error not surfacing anywhere visible
- Missing permission or capability for the web content to load

## Suggested Next Debugging Step
**Enable DevTools in release build** — modify `src-tauri/src/lib.rs` setup hook:

```rust
.setup(|app| {
    let window = app.get_webview_window("main").unwrap();
    window.open_devtools();  // Force devtools open — remove after debugging
    // ... rest of existing setup
    Ok(())
})
```

Then rebuild (`npm run tauri build`) and DevTools Console will show actual page/navigation errors.

**Alternative approach**: Check Tauri 2.x navigation event logging or add a navigation error handler.

## Relevant Files

- `src/routes/+page.svelte` — **HAS DEBUG CODE** (2s delay + document.title changes); NEEDS CLEANUP before shipping
- `src-tauri/src/mercury_db.rs` — New file, clean (no debug logging)
- `src-tauri/src/lib.rs` — Wired mercury_db module and state
- `src/lib/db/tauri-provider.ts` — Uses `invoke('query_mercury_db')`, clean
- `src-tauri/tauri.conf.json` — frontendDist: "../build", devtools NOT enabled

## Git Status
```
M  src/routes/+page.svelte   ← debug code present (uncommitted)
```

All other changes (`mercury_db.rs`, `lib.rs`, `tauri-provider.ts`) are committed in `bed7835`/`b5d9c24`.

## Next Steps
1. Enable WebView2 devtools in release build (add `window.open_devtools()` in `lib.rs` setup)
2. `npm run tauri build` → launch → DevTools Console shows actual load errors
3. Fix the root cause
4. Clean up `+page.svelte` debug code (remove document.title lines and 2s delay)
5. Final production test

## Resume Command
After running `/clear`, run `/resume` to continue.
