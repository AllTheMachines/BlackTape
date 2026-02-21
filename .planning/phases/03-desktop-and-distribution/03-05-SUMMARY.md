---
phase: 03-desktop-and-distribution
plan: 05
subsystem: desktop
tags: [tauri, updater, signing, nsis, distribution, security]

# Dependency graph
requires:
  - phase: 03-desktop-and-distribution/03-04
    provides: First-run UI, database detection, distribution pipeline
  - phase: 03-desktop-and-distribution/03-01
    provides: DbProvider interface, TauriProvider, Tauri project scaffold
provides:
  - Updater signing key pair at ~/.tauri/mercury.key
  - Updater plugin configured with public key and placeholder endpoint
  - NSIS installer (Mercury_0.1.0_x64-setup.exe, ~3.9MB)
  - .gitignore entries protecting *.key and *.key.pub from git
affects:
  - distribution-pipeline
  - auto-update-infrastructure

# Tech tracking
tech-stack:
  added: []
  patterns:
    - tauri-plugin-updater configured in plugins.updater with pubkey + endpoints
    - NSIS currentUser install mode (handles WebView2 bootstrapping on Windows 10)
    - Signing keys kept in ~/.tauri/ (never in repo), protected by .gitignore

key-files:
  created: []
  modified:
    - src-tauri/tauri.conf.json
    - src-tauri/src/lib.rs
    - .gitignore

key-decisions:
  - "NSIS installer over MSI for WebView2 bootstrapping on Windows 10"
  - "Private key stored at ~/.tauri/mercury.key — gitignored, never committed"
  - "Updater endpoint is a placeholder (mercury-updates.example.com) — real server comes later"
  - "Database updates use full replacement download — diff-based updates explicitly deferred as future optimization"

requirements-completed: []

# Metrics
duration: ~5min
completed: 2026-02-16
---

# Phase 3 Plan 05: Auto-Updater Signing Keys and NSIS Installer Summary

**Tauri updater configured with cryptographic signing key pair; NSIS installer builds Mercury as a 3.9MB Windows setup executable**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-02-16
- **Tasks:** 1 (+ 1 checkpoint auto-approved)
- **Files modified:** 4

## Accomplishments

- Generated minisign signing key pair: private key at `~/.tauri/mercury.key`, public key embedded in `tauri.conf.json`
- Configured `tauri-plugin-updater` in `plugins.updater` with public key and placeholder endpoint URL using Tauri template variables (`{{target}}/{{arch}}/{{current_version}}`)
- Verified NSIS installer configuration (`bundle.targets: ["nsis"]`, `installMode: "currentUser"`) — produces `Mercury_0.1.0_x64-setup.exe`
- Added `.gitignore` entries for `*.key` and `*.key.pub` — private key cannot be committed
- Documented database update strategy: full replacement for Phase 3, diff-based updates deferred to future

## Task Commits

1. **Task 1: Generate signing keys and configure updater** - `0ee72ce` (feat)

## Files Created/Modified

- `src-tauri/tauri.conf.json` — Added `plugins.updater` block with pubkey and endpoint; version set to `0.1.0`; NSIS installer config confirmed
- `src-tauri/src/lib.rs` — Minor cleanup (tauri_plugin_updater already registered in prior phases)
- `.gitignore` — Added `*.key` and `*.key.pub` signing key exclusions

## Decisions Made

- NSIS installer over MSI: handles WebView2 bootstrapping automatically on Windows 10 (MSI requires manual WebView2 install)
- Private key at `~/.tauri/mercury.key` — never committed, user must back it up to a secure location (password manager, encrypted drive)
- Updater endpoint is a placeholder (`https://mercury-updates.example.com/...`) — real update server URL to be configured when hosting is set up
- Database update strategy: full mercury.db.gz replacement for Phase 3; diff-based updates (SQLite session extension / sqldiff) deferred as future optimization when update frequency and diff sizes are known

## Checkpoint: Autonomous Verification Results

The `checkpoint:human-verify` was executed autonomously per plan instructions. Results:

| Check | Status | Details |
|-------|--------|---------|
| Signing key exists | PASS | `~/.tauri/mercury.key` present |
| Public key in tauri.conf.json | PASS | `plugins.updater.pubkey` set |
| Private key NOT in git | PASS | `.gitignore` has `*.key`, `*.key.pub` |
| NSIS installer built | PASS | `src-tauri/target/release/bundle/nsis/Mercury_0.1.0_x64-setup.exe` exists |
| `npm run check` | PASS | 0 errors, 3 pre-existing warnings (unrelated to this plan) |
| `npm run build` | PASS | Cloudflare build succeeds, 0 errors |

## Deviations from Plan

None — plan executed exactly as written. Task 1 was completed in a prior session (commit `0ee72ce`) and verified intact. All must_haves satisfied.

## Phase 3 Complete

This plan completes Phase 3: Desktop App and Distribution. The full Phase 3 delivers:

1. **Plan 01:** DbProvider interface + TauriProvider — database abstraction layer
2. **Plan 02:** Tauri 2.0 project scaffold with dual-adapter SvelteKit build system
3. **Plan 03:** Universal load functions — search and artist pages work in both web and desktop
4. **Plan 04:** First-run setup UI, database detection, compression + torrent distribution pipeline
5. **Plan 05:** Auto-updater signing infrastructure + NSIS installer (this plan)

Mercury is now an unkillable, offline-first desktop application: local SQLite search, artist pages with live enrichment, first-run database setup, and auto-update infrastructure ready for when the update server is configured.

---
*Phase: 03-desktop-and-distribution*
*Completed: 2026-02-16*
