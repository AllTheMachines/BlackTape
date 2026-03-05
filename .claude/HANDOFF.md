# Work Handoff - 2026-03-05

## Current State
v0.3.1 is production. macOS updater tested and confirmed working — app closes with clear "open the app again" message. Session wrapping up.

## Open Items
- **macOS auto-relaunch**: `open -n` is in the code but unreliable in `~/Applications/`. Low priority — the banner message covers it. Revisit if needed.
- **Windows v0.3.1**: No Windows build in v0.3.1 release. Not needed — when v0.3.2 ships with both platforms in `latest.json`, all users (Windows v0.3.0, macOS v0.3.1) will be offered the update simultaneously.
- **ARCHITECTURE.md**: Still references old `Mercury` URL in the updater section. Should be updated to `BlackTape`.

## Key Facts
- Current version: 0.3.1 (tauri.conf.json + Cargo.toml)
- Updater endpoint: `https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json`
- v0.3.1 GitHub release: macOS DMG + updater bundle + latest.json (darwin-aarch64)
- Icons: all regenerated from icon.png (correct design everywhere)
