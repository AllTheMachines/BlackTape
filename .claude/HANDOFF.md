# Work Handoff - 2026-03-05

## Current State
v0.3.1 is the production release. macOS updater tested and working (app closes with clear message, no auto-relaunch — acceptable). Session complete.

## Open Items
- Windows v0.3.1 build needed: v0.3.1 `latest.json` only has `darwin-aarch64`. Windows users on v0.3.0 won't see the update. Need to build Windows locally, sign with rsign2, upload installer + update `latest.json` with windows-x86_64 entry.
- macOS auto-relaunch: `open -n` attempt is in the code but not reliable in `~/Applications/`. Low priority — the "open app again" message covers it.

## Key Facts
- Current version: 0.3.1 (in tauri.conf.json + Cargo.toml)
- v0.3.1 GitHub release: macOS DMG + updater bundle + latest.json (darwin-aarch64 only)
- v0.3.0 GitHub release: still has Windows installer + full latest.json (both platforms)
- Icons: all regenerated from icon.png (correct design everywhere now)
