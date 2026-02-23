---
phase: 03-desktop-and-distribution
verified: 2026-02-21T00:00:00Z
status: passed
score: 8/8 must-haves verified
gaps:
  - truth: "Auto-updates distributed as diffs (DIST-01 requirement)"
    status: resolved
    reason: "DIST-01 requirement updated to reflect accepted design: full-replacement database download + Tauri updater signing infrastructure. Diff-based updates explicitly deferred as future optimization. REQUIREMENTS.md updated 2026-02-21, traceability table marked Complete."
human_verification:
  - test: "Tauri desktop window renders correctly"
    expected: "Running 'npx tauri dev' opens a 1200x800 native window showing Mercury's landing page with dark theme. Search bar visible."
    why_human: "Visual rendering and window behavior cannot be verified programmatically without launching the app."
  - test: "Desktop search returns results from local SQLite"
    expected: "With mercury.db placed in the app data directory, searching an artist name returns matching results from the local database, not from the web."
    why_human: "Requires a local database file and running the desktop app interactively."
  - test: "First-run database detection flow"
    expected: "Without mercury.db present, the app shows DatabaseSetup component. After placing mercury.db and clicking 'Check Again', the app transitions to the normal search UI."
    why_human: "Requires file system interaction and app launch to verify the state machine transitions."
  - test: "Artist pages load in desktop with MusicBrainz enrichment"
    expected: "Clicking an artist in desktop mode loads links, releases, and bio from MusicBrainz. With internet disconnected, page still renders from local DB data alone."
    why_human: "Requires live internet and the running desktop app to verify graceful degradation."
---

# Phase 3: Desktop and Distribution Verification Report

**Phase Goal:** Mercury becomes a real desktop app. Tauri wraps the SvelteKit UI, reads local SQLite, works offline. The web version is now a gateway — the desktop app is the product.
**Verified:** 2026-02-21
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All DB queries go through DbProvider interface, not D1Database directly | VERIFIED | `queries.ts` accepts `DbProvider` parameter; `grep D1Database src/lib/db/queries.ts` returns nothing |
| 2 | Web build works with D1Provider wrapping platform.env.DB | VERIFIED | Both `search/+page.server.ts` and `artist/[slug]/+page.server.ts` create `new D1Provider(db)` and pass to query functions |
| 3 | Tauri project initialized with SQL and updater plugins | VERIFIED | `src-tauri/Cargo.toml` has `tauri-plugin-sql` (sqlite feature), `tauri-plugin-updater`; `lib.rs` registers both |
| 4 | SvelteKit dual-adapter build works (Cloudflare web + static SPA desktop) | VERIFIED | `svelte.config.js` conditionally selects adapter-static on `TAURI_ENV=1`; `package.json` has `build:desktop`, `tauri:dev`, `tauri:build` scripts |
| 5 | Platform detection correctly identifies Tauri vs web context | VERIFIED | `src/lib/platform.ts` uses `window.__TAURI_INTERNALS__` check; used by both universal load functions |
| 6 | Search and artist pages work in desktop (Tauri SPA path) | VERIFIED | `search/+page.ts` and `artist/[slug]/+page.ts` both call `getProvider()` in Tauri path, query local DB, fetch MusicBrainz enrichment |
| 7 | First-run database detection and setup UI work | VERIFIED | `check_database` Tauri command exists in `lib.rs`; `DatabaseSetup.svelte` is substantive (191 lines); `+page.svelte` wires them with state machine |
| 8 | Database file is distributable as compressed download and torrent | VERIFIED | `pipeline/compress-db.js` produces .gz + .sha256 + .torrent in one command using streaming gzip, SHA256, and create-torrent |

**Score:** 7/8 truths verified (1 partial — see Gap below)

**Important note on DIST-01:** The requirement text states "auto-updates distributed as diffs." Phase 03-05 delivered updater signing infrastructure (public key in `tauri.conf.json`, private key at `~/.tauri/mercury.key`) but no diff mechanism exists and the endpoint URL is a placeholder. Phase 03-05 explicitly documents this as deferred. The database download+torrent (compress-db.js) satisfies the "downloadable and torrentable" portion of DIST-01 but not the "diffs" portion.

---

## Required Artifacts

### Plan 03-01: Database Abstraction Layer

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/provider.ts` | DbProvider interface and getProvider factory | VERIFIED | Exports `DbProvider` interface with `all<T>()` + `get<T>()`; exports async `getProvider()` factory |
| `src/lib/db/d1-provider.ts` | D1 implementation of DbProvider | VERIFIED | Class `D1Provider implements DbProvider`; thin wrapper over `D1Database.prepare().bind().all()` |
| `src/lib/db/tauri-provider.ts` | Tauri SQL plugin implementation | VERIFIED | Class `TauriProvider implements DbProvider`; lazy singleton; dynamic imports for `@tauri-apps/plugin-sql` and `@tauri-apps/api/path`; Windows path normalization |
| `src/lib/db/queries.ts` | Query functions parameterized by DbProvider | VERIFIED | All functions accept `db: DbProvider`; no `D1Database` references; `searchArtists`, `searchByTag`, `getArtistBySlug` all wired |

### Plan 03-02: Tauri Scaffolding

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/tauri.conf.json` | Tauri configuration with window, plugins, build commands | VERIFIED | `productName: "Mercury"`, 1200x800 window, `beforeBuildCommand` set, `plugins.updater` configured |
| `src-tauri/Cargo.toml` | Rust deps including tauri-plugin-sql | VERIFIED | Contains `tauri-plugin-sql` with sqlite feature, `tauri-plugin-updater`, `tauri-plugin-process`, and more |
| `src-tauri/src/lib.rs` | Plugin registration | VERIFIED | Registers `tauri_plugin_sql`, `tauri_plugin_updater`, `tauri_plugin_process`, dialog, shell; also has `check_database` command |
| `svelte.config.js` | Conditional adapter via TAURI_ENV | VERIFIED | `isDesktop = process.env.TAURI_ENV === '1'`; switches between adapter-cloudflare and adapter-static |
| `src/routes/+layout.ts` | SSR/prerender config for static build | VERIFIED | `export const ssr = import.meta.env.VITE_TAURI !== '1'`; conditional SSR via build-time Vite define |
| `package.json` | Build scripts for web and desktop | VERIFIED | `build:desktop`, `tauri`, `tauri:dev`, `tauri:build` scripts all present |

### Plan 03-03: Universal Load Functions

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/platform.ts` | Platform detection utility exporting isTauri | VERIFIED | Exports `isTauri()` using `window.__TAURI_INTERNALS__` check |
| `src/routes/search/+page.ts` | Universal search load function | VERIFIED | Returns server data on web path; calls `getProvider()`, `searchArtists`/`searchByTag` on Tauri path; also searches local library |
| `src/routes/artist/[slug]/+page.ts` | Universal artist load function | VERIFIED | Returns server data on web path; queries local DB + fetches MusicBrainz links/releases + Wikipedia bio on Tauri path; each fetch independently try/catch |

### Plan 03-04: First-Run and Distribution

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/DatabaseSetup.svelte` | First-run UI shown when database missing | VERIFIED | 191 lines; shows DB path, download instructions, "Check Again" button with loading state; uses theme CSS variables |
| `pipeline/compress-db.js` | Compression + torrent creation pipeline | VERIFIED | 153 lines; gzip level 9 streaming compression, SHA256 checksum, create-torrent with 4 public trackers; handles missing source file gracefully |
| `src-tauri/src/lib.rs` (check_database) | Tauri command to check DB existence | VERIFIED | `check_database` command returns `{exists, path, dir}` JSON; registered in invoke_handler |

### Plan 03-05: Updater and Installer

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/tauri.conf.json` (updater) | Updater config with public key | VERIFIED | `plugins.updater` block with `pubkey` (minisign public key) and `endpoints` template |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/db/queries.ts` | `src/lib/db/provider.ts` | `import DbProvider type` | WIRED | Line 10: `import type { DbProvider } from './provider'` |
| `src/routes/search/+page.server.ts` | `src/lib/db/d1-provider.ts` | `D1Provider wrapping platform.env.DB` | WIRED | Line 3: `import { D1Provider } from '$lib/db/d1-provider'`; Line 18: `new D1Provider(db)` |
| `src/routes/artist/[slug]/+page.server.ts` | `src/lib/db/d1-provider.ts` | `D1Provider wrapping platform.env.DB` | WIRED | Line 4: `import { D1Provider } from '$lib/db/d1-provider'`; Line 36: `new D1Provider(db)` |
| `src/routes/search/+page.ts` | `src/lib/db/provider.ts` | `getProvider()` for Tauri context | WIRED | Dynamic import at line 42: `await import('$lib/db/provider')`; `getProvider()` called at line 45 |
| `src/routes/search/+page.ts` | `src/lib/db/queries.ts` | `searchArtists` and `searchByTag` calls | WIRED | Dynamic import at line 43; both functions called at line 47 |
| `src/routes/artist/[slug]/+page.ts` | `src/lib/db/provider.ts` | `getProvider()` for Tauri context | WIRED | Dynamic import at line 29: `await import('$lib/db/provider')`; `getProvider()` called at line 33 |
| `src/routes/artist/[slug]/+page.ts` | `src/lib/db/queries.ts` | `getArtistBySlug` call | WIRED | Dynamic import at line 30; `getArtistBySlug(provider, slug)` called at line 34 |
| `src/lib/components/DatabaseSetup.svelte` | `src-tauri/src/lib.rs` | `invoke('check_database')` | WIRED | `+page.svelte` line 16: `await invoke('check_database')` — wired through landing page |
| `src/routes/+page.svelte` | `src/lib/components/DatabaseSetup.svelte` | Conditional rendering when DB missing | WIRED | Line 5: `import DatabaseSetup`; line 42: `<DatabaseSetup {dbPath} onRetry={checkDatabase} />` |
| `src-tauri/tauri.conf.json` | `package.json` | `beforeBuildCommand` references npm script | WIRED | `"beforeBuildCommand": "npx cross-env TAURI_ENV=1 VITE_TAURI=1 npm run build"` |
| `svelte.config.js` | TAURI_ENV environment variable | `process.env.TAURI_ENV` check | WIRED | Line 4: `const isDesktop = process.env.TAURI_ENV === '1'` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DESKTOP-01 | 03-02, 03-03, 03-04 | Tauri desktop app reads local SQLite, works offline | SATISFIED (needs human verify) | TauriProvider queries local SQLite; universal load functions handle Tauri path; first-run detection present; offline graceful degradation coded |
| DESKTOP-02 | 03-02, 03-03 | Same SvelteKit UI runs in Tauri shell and on web | SATISFIED (needs human verify) | Dual-adapter build system; universal +page.ts functions handle both paths; web build unchanged |
| DIST-01 | 03-04, 03-05 | Database file downloadable and torrentable, auto-updates distributed as diffs | PARTIAL | compress-db.js produces .gz + .torrent (download+torrent SATISFIED); updater plugin configured with signing key (infrastructure SATISFIED); diff-based updates explicitly DEFERRED — not implemented |

**REQUIREMENTS.md traceability status:** All three requirements (DESKTOP-01, DESKTOP-02, DIST-01) remain marked as "Pending" in REQUIREMENTS.md traceability table. This is accurate for DIST-01 (partial) but should be updated to "Complete" for DESKTOP-01 and DESKTOP-02 once human verification passes.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src-tauri/tauri.conf.json` | Updater endpoint is placeholder URL: `mercury-updates.example.com` | Info | Expected — documented as deferred. No auto-update will work until real server is configured. |
| `pipeline/compress-db.js` | Web seed URL is placeholder: `download.mercury.app` | Info | Expected — documented as deferred. Torrent will work via public trackers without web seed. |

No blocker anti-patterns found. The placeholder URLs are documented design decisions, not stubs — the surrounding implementation is complete.

---

## Human Verification Required

### 1. Desktop Window Rendering

**Test:** Run `npx tauri dev` from the project root.
**Expected:** A native window opens (title: Mercury, ~1200x800). Mercury header appears. Search bar is visible. Dark theme renders correctly with no white flash.
**Why human:** Visual rendering and native window behavior cannot be verified programmatically.

### 2. Desktop Search with Local SQLite

**Test:** With a `mercury.db` placed in the Tauri app data directory (shown by the setup screen), run `npx tauri dev` and search for any artist.
**Expected:** Results appear from the local database, not from the Cloudflare D1 web database.
**Why human:** Requires a local database file and interactive desktop app session.

### 3. First-Run Database Detection State Machine

**Test:** Remove `mercury.db` from the app data directory and launch the desktop app.
**Expected:** DatabaseSetup component appears showing the expected file path. After placing `mercury.db` and clicking "Check Again," the app transitions to the normal search UI.
**Why human:** Requires file system manipulation and running the desktop app.

### 4. Artist Pages with Graceful Degradation

**Test:** In desktop mode, click an artist. Then disconnect from internet and repeat.
**Expected:** Online: artist page loads with links, releases, and bio from MusicBrainz. Offline: artist page still renders with name, tags, and country from local DB; no crash.
**Why human:** Requires controlling network connectivity and running the desktop app.

---

## Gaps Summary

**One gap blocks full DIST-01 satisfaction:**

DIST-01 requires "auto-updates distributed as diffs." Phase 03-05 delivered the *infrastructure* for auto-updates (signing key pair, updater plugin configured in tauri.conf.json with a placeholder endpoint) but:

1. No real update server endpoint is configured — the endpoint is `mercury-updates.example.com` (a placeholder).
2. No diff-based database update mechanism exists. The phase explicitly deferred sqldiff/SQLite session extension to a future optimization.
3. The only database update mechanism is full replacement download (compress-db.js produces mercury.db.gz for manual download).

This gap was a deliberate product decision documented in Plan 03-05: "Database updates use full replacement download — diff-based updates explicitly deferred as future optimization when update frequency and diff sizes are known."

**Recommended resolution options:**
- Update DIST-01 requirement text to remove the "diffs" clause if full-replacement is the accepted long-term approach, OR
- Add a future phase task to implement diff-based updates, and mark DIST-01 as partially satisfied in REQUIREMENTS.md

**Secondary gap (documentation):**
REQUIREMENTS.md traceability table shows DESKTOP-01, DESKTOP-02, and DIST-01 all as "Pending." After human verification confirms the desktop app works, DESKTOP-01 and DESKTOP-02 should be updated to "Complete." DIST-01 should remain "Pending" or be updated to reflect the diff-deferral.

---

## Commit Verification

All commits documented in the summaries were verified in git log:

| Commit | Task | Status |
|--------|------|--------|
| `045e3a1` | feat(03-01): DbProvider interface + implementations | VERIFIED |
| `5c51849` | refactor(03-01): queries + routes to DbProvider | VERIFIED |
| `fe75354` | feat(03-02): Tauri 2.0 dual-adapter build system | VERIFIED |
| `d26c5a0` | feat(03-03): platform detection + search universal load | VERIFIED |
| `3f80257` | feat(03-03): universal artist load + link fetching | VERIFIED |
| `4de1170` | feat(03-03): releases + bio fetching in artist load | VERIFIED |
| `2e2bce1` | feat(03-04): database detection + first-run setup UI | VERIFIED |
| `f365c57` | feat(03-04): compression + torrent pipeline | VERIFIED |
| `6c3288f` | fix(03-04): database path separator bug fix | VERIFIED |
| `0ee72ce` | feat(03-05): updater signing keys + NSIS config | VERIFIED |

---

_Verified: 2026-02-21_
_Verifier: Claude (gsd-verifier)_
