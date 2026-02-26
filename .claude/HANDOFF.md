# Work Handoff — 2026-02-26

## Current Task
Press screenshots — script is built, needs one more run with `npm run tauri dev`

## Context
Project was renamed from Mercury to BlackTape this session. All rename work is committed (b7e5917). Screenshots were attempted but failed due to WebView2 routing — fix is known and simple.

## What Was Done This Session
- ✅ Renamed project: Mercury → BlackTape
  - `src/lib/config.ts` — PROJECT_NAME, BLACKTAPE_PUBKEY
  - `src-tauri/tauri.conf.json` — productName, identifier (`com.blacktape.app`), window title
  - 20+ user-facing strings across all routes and components
  - `static/logo.png` + `static/favicon.svg` copied from `/d/Projects/blacktapesite/static/`
  - Test manifest P16-04 updated for BLACKTAPE_PUBKEY
- ✅ 164 tests passing, 0 errors

## Screenshots Status
**Script:** `tools/take-press-screenshots.mjs`
**Problem:** Playwright's `page.goto()` and `window.location.href` both fail in the debug binary CDP context — WebView2 intercepts navigation and returns 404.
**Root cause:** The debug binary needs the full `npm run tauri dev` environment (which proxies WebView navigation through Vite). Launching the binary standalone doesn't wire up routing correctly.

**Fix (next session):**
1. Run `npm run tauri dev` in a terminal (starts Vite + Tauri together)
2. Once the app window is open, run: `node tools/take-press-screenshots.mjs`
3. The script will connect via CDP and navigate through all pages
4. Real data: 2.8M artists in `%APPDATA%/com.mercury.app/mercury.db` — cover art loads from Cover Art Archive

**Pages to screenshot (already in the script):**
- Discover (artist grid, full of cover art)
- Search results for jazz / hip-hop
- Radiohead artist page (header + discography grid)
- Aphex Twin, Boards of Canada artist pages
- Style Map, Crate Dig, Time Machine, Scenes, KB Jazz, New & Rising

**Note on AppData path:** The Tauri binary still uses `com.mercury.app` (Rust binary name unchanged — Cargo.toml was intentionally not renamed). The real user DB is at `C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db`. The `com.blacktape.app` identifier in tauri.conf.json only takes effect after a full `cargo build`.

## Git Status
- All clean, no uncommitted changes
- Last commit: `b7e5917` — rename: Mercury → BlackTape

## Next Steps
1. Take screenshots — run `npm run tauri dev`, then `node tools/take-press-screenshots.mjs`
2. Continue Phase 29 (Streaming API Integration) — was the active task before the rename
   - Phase 29 plan: `.planning/v1.5-PLAN.md`
   - Main work: mount `EmbedPlayer.svelte` on artist page (it exists but isn't used)
   - Pre-fetch SoundCloud oEmbed in artist page load function

## Resume Command
After running `/clear`, run `/resume` to continue.
