# Work Handoff - 2026-03-05

## Current Task
macOS updater end-to-end test via RentAMac + fix relaunch-after-update bug.

## Context
We're testing the macOS updater using a rented Mac Mini M4 (RentAMac, $15/day, DeskIn remote desktop). We created a temporary v0.3.1 release on GitHub to test that v0.3.0 detects and installs the update. Several bugs were found and fixed during the session.

## Progress
### Completed
- v0.3.1 version bump (tauri.conf.json + Cargo.toml)
- GitHub release v0.3.1 created with correct `latest.json` and `BlackTape.app.tar.gz`
- RentAMac machine connected (Mac Mini M4, macOS 26.3, DeskIn device ID 788165954)
- v0.3.0 DMG installed on RentAMac (in ~/Applications/ — NOT /Applications/ due to read-only fs)
- **Updater successfully detected v0.3.1 and installed it** ✅
- Fixed double-encoding bug: Tauri macOS `.sig` file is already base64 — don't base64 it again
- Fixed `contents:write` permission in build-macos.yml
- Fixed app just silently closing after update — now uses `app.restart()` instead of `process::exit(0)`
- Improved banner messages: "Downloading update..." / "Update installed — reopening..."

### In Progress
- The relaunch fix (`app.restart()`) is committed and pushed but NOT yet built into a DMG
- The v0.3.1 release on GitHub still has the old binary (without the relaunch fix)

### Remaining
1. Build new v0.3.1 macOS DMG with the relaunch fix (trigger build-macos.yml)
2. Update `latest.json` on v0.3.1 release with new signature (workflow now handles this correctly)
3. Test on RentAMac: install v0.3.0 → update → confirm app relaunches automatically
4. Clean up after test:
   - Delete v0.3.1 GitHub release
   - Revert tauri.conf.json + Cargo.toml back to version 0.3.0
   - Commit + push the revert
5. Update BUILD-LOG.md with full session summary

## Key Decisions
- **RentAMac over GitHub Actions** for interactive macOS testing ($15/day, Mac Mini M4)
- **~/Applications/ not /Applications/** — system folder is read-only, updater can't replace app there
- **Tauri macOS .sig files are already base64-encoded** — do NOT base64 them again. Use `cat file | tr -d '\n'` in the workflow. (Windows rsign2 .sig files contain raw minisign text and DO need base64 encoding — different behavior per platform)
- **app.restart() not process::exit(0)** for macOS relaunch after update

## Relevant Files
- `src-tauri/src/updater.rs` — relaunch fix: uses `app.restart()` + `Manager` import
- `src/lib/components/UpdateBanner.svelte` — improved messages during update
- `.github/workflows/build-macos.yml` — fixed: `contents:write` permission + `cat` instead of `base64`
- `src-tauri/tauri.conf.json` — currently at version 0.3.1 (temporary)
- `src-tauri/Cargo.toml` — currently at version 0.3.1 (temporary)
- `BUILD-LOG.md` — 3 lines uncommitted auto-save, needs full session summary

## Git Status
- `BUILD-LOG.md` modified (auto-save, not staged)
- Branch is 1 commit ahead of origin (already pushed — the relaunch fix commit)

## GitHub Release State
- v0.3.1 release exists on GitHub (full release, not pre-release)
- Assets: `BlackTape.app.tar.gz` (from build run 22711379396) + `latest.json` with correct single-encoded signature
- WARNING: v0.3.1 is currently the "latest" release — the updater endpoint serves it to all macOS users
- The `.app.tar.gz` on the release does NOT yet contain the relaunch fix (old build)

## Errors Encountered (resolved)
- `Invalid encoding in minisign data` — caused by double base64-encoding the .sig file. Fixed.
- `HTTP 403` on gh release upload in workflow — fixed by adding `permissions: contents: write`
- `Read-only file system (os error 30)` — app was in /Applications/. Fixed by using ~/Applications/
- `The signature verification failed` — .app.tar.gz and .sig were from different builds. Fixed by replacing the asset.

## Next Steps
1. Trigger `build-macos.yml` workflow: `gh workflow run build-macos.yml`
2. The workflow will build with relaunch fix, upload new .app.tar.gz, and update latest.json automatically (permissions + encoding now both fixed)
3. On RentAMac: trash the current BlackTape in ~/Applications/, reinstall v0.3.0 DMG, trigger update → should download, install, and relaunch automatically
4. After successful test: `gh release delete v0.3.1 -y`, revert versions in tauri.conf.json + Cargo.toml to 0.3.0, commit + push
5. Write BUILD-LOG.md session summary

## Resume Command
After running `/clear`, run `/resume` to continue.
