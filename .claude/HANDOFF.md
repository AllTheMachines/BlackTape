# Mercury — Handoff

## Current State

**Phase 4: Local Music Player — COMPLETE.** All 5 plans executed, human verification passed. Phase 5 (AI Foundation) is next.

## What Was Done This Session

### Phase 4 Execution — All Waves Complete

**Wave 1 (parallel):** 04-01 Rust scanner + 04-02 Player frontend
**Wave 2:** 04-03 Library browser
**Wave 3:** 04-04 Unified discovery
**Wave 4:** 04-05 Human verification — 3 bugs found and fixed:
- `cross-env` → `npx cross-env` in tauri.conf.json
- Discovery expand button replaced with labeled "Discover" pill
- Search load function dynamic imports moved inside try/catch

### Bug Fix: tauri.conf.json beforeDevCommand
Changed `cross-env VITE_TAURI=1 npm run dev` to `npx cross-env VITE_TAURI=1 npm run dev` (same for beforeBuildCommand).

## How to Resume

Next phase: `/gsd:plan-phase 5` (AI Foundation)

## Key Architecture (for new context)

- `DbProvider` interface abstracts D1 (web) vs SQLite (desktop)
- `isTauri()` checks `window.__TAURI_INTERNALS__` — zero-import platform detection
- Player module: `$lib/player/` — state.svelte.ts, audio.svelte.ts, queue.svelte.ts
- Library module: `$lib/library/` — types.ts, scanner.ts, store.svelte.ts, matching.ts
- Scanner backend: `src-tauri/src/scanner/` + `src-tauri/src/library/`
- library.db (rusqlite) is separate from mercury.db (tauri-plugin-sql)
- Signing key: `~/.tauri/mercury.key` — **BACK THIS UP**
- Branch: `main`, not pushed
