# Work Handoff - 2026-03-05

## Current Task
macOS focus — v0.3.1 is live, updater tested. Ready for next macOS work.

## Context
Spent this session testing the macOS updater end-to-end on RentAMac (Mac Mini M4, DeskIn). Multiple bugs found and fixed. v0.3.1 is now the production release. User wants to continue working on macOS.

## Progress
### Completed
- macOS updater tested end-to-end on RentAMac
- Fixed double base64 encoding bug in CI workflow (`.sig` files already base64 on macOS)
- Fixed HTTP 403 on release upload (`permissions: contents: write` in workflow)
- Fixed GitHub API rate limiting in CI (auth header on llama.cpp release curl)
- Fixed macOS icon — all icons regenerated from `icon.png` (icns + pngs were old design)
- Fixed update UX — banner now says "Update installed — open the app again to use the new version"
- Enlarged update banner (padding 10px, font 0.88rem)
- Attempted auto-relaunch via `open -n <bundle>` — code is in place but unreliable in ~/Applications/
- v0.3.1 DMG uploaded to GitHub release
- BUILD-LOG.md and ARCHITECTURE.md updated
- All docs pushed

### Remaining
- **Next macOS work**: user said "lets focus on mac" but didn't specify the next task — ask at session start
- **Auto-relaunch**: `open -n` is in the code but doesn't reliably fire after bundle replacement in ~/Applications/. Low priority.
- **Windows v0.3.1**: no Windows build in v0.3.1 yet — will be handled when v0.3.2 ships (latest.json will include both platforms at that point, covering Windows v0.3.0 and macOS v0.3.1 users simultaneously)

## Key Decisions
- v0.3.1 is production — not reverting to 0.3.0
- Auto-relaunch is nice-to-have; the "open app again" message is the reliable UX fallback
- Windows users will be covered by v0.3.2 latest.json (both platforms), not a separate v0.3.1 Windows build
- macOS `.sig` files from Tauri CI are already base64 — use `cat | tr -d '\n'`, never `base64` again
- Icon source of truth: `icon.png` — run `npx tauri icon src-tauri/icons/icon.png` to regenerate all variants

## Relevant Files
- `src-tauri/src/updater.rs` — relaunch logic: `open -n` (macOS) vs `app.restart()` (other)
- `src/lib/components/UpdateBanner.svelte` — banner text + sizing
- `.github/workflows/build-macos.yml` — CI pipeline (authenticated curl, contents:write, cat not base64)
- `src-tauri/icons/` — all regenerated from icon.png
- `src-tauri/tauri.conf.json` — version 0.3.1, updater endpoint

## Git Status
Clean. All pushed to origin/main.

## GitHub Release State
- v0.3.1: macOS DMG + BlackTape.app.tar.gz + latest.json (darwin-aarch64 only)
- v0.3.0: still has Windows installer + full latest.json (both platforms)
- Updater endpoint: `https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json`

## Next Steps
1. Ask user what macOS work they want to do next
2. Launch app via `node tools/launch-cdp.mjs` if doing UI work

## Resume Command
After running `/clear`, run `/resume` to continue.
