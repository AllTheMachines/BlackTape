# Work Handoff - 2026-02-28

## Current Task
Autonomous testing pipeline — Steve wants me to self-test using CDP without human verification. App is currently launching with CDP on port 9224 via `node tools/launch-cdp.mjs`.

## Fixes Applied This Session (not yet committed)
1. **Discover freeze** (`src/lib/db/queries.ts:486`) — replaced 3 correlated subqueries per artist in ORDER BY with JOIN + GROUP BY. Was holding Rust DB Mutex 10-30s, blocking all navigation.
2. **About tab empty** (`src/routes/artist/[slug]/+page.ts`) — combined two MB API fetches (`url-rels` + `artist-rels+label-rels`) into one request to avoid rate limiting. About tab (members, influences, labels) should now load.

## Steve's Corrections (IMPORTANT — update your approach)
1. **No custom titlebar** — Steve says Titlebar was removed. `decorations: false` in tauri.conf.json. The `Titlebar.svelte` file still exists in code — verify if it's actively used or dead code
2. **No browser/web mode** — app is Tauri-only. The `{:else}` web mode branches in `+layout.svelte` are stale dead code. Do NOT reference web mode behavior
3. **Autonomous testing is broken** — I was getting 500 errors when navigating via CDP. Root cause: using `page.goto()` instead of `window.location.href`. Steve built an entire CDP testing infrastructure for this
4. **500 errors are recent** — something changed recently that broke my autonomous navigation

## CDP Testing Infrastructure
- **Launch:** `node tools/launch-cdp.mjs` — starts Vite (port 5173) + mercury.exe with CDP (port 9224)
- **Navigate:** `page.evaluate(() => { window.location.href = '/route'; })` + wait — NEVER `page.goto()`
- **Screenshot:** `node tools/snap.mjs <name.png>`
- **Test suite:** `node tools/test-suite/run.mjs`
- **Connect:** `chromium.connectOverCDP('http://127.0.0.1:9224')` via Playwright

## What To Do Next
1. Wait for app to fully launch (Vite was starting when context ran out)
2. Verify fixes work: navigate to Discover (should be fast now), check Radiohead About tab (should show members)
3. Investigate what broke the autonomous navigation recently — check `tools/record-and-run.mjs` and test suite for any recent changes
4. Check if Titlebar.svelte is still actively rendered or should be removed
5. Clean up stale web-mode code in `+layout.svelte` if confirmed dead

## Open v1.4 Issues
#61, #60, #54, #53, #57, #50, #49, #56, #48, #43, #44, #55, #52

## Resume Command
Run `/resume` after `/clear`
