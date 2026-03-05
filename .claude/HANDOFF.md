# Work Handoff - 2026-03-05

## Current Task
macOS updater v0.3.1→v0.3.2 confirmed working. GitHub issue #92 and release-process.md created. No active coding task.

## Context
This session was focused on testing the macOS auto-updater end-to-end again. We created v0.3.2, built it via CI, manually assembled the release (CI silently skipped latest.json because the release didn't exist first), verified the live endpoint, and confirmed the update fired on the RentAMac machine. Then created a comprehensive GitHub issue and a maintained reference doc capturing everything learned about the updater pipeline.

## Progress
### Completed
- Bumped version to 0.3.2 in `tauri.conf.json` and `Cargo.toml`
- Triggered macOS CI build (`build-macos.yml`, run 22714375098) — succeeded in 3m4s
- Created v0.3.2 GitHub release (started as prerelease)
- Downloaded `.app.tar.gz` + `.sig` from CI artifacts
- Built correct `latest.json` (version 0.3.2, darwin-aarch64, signature already base64 from CI)
- Uploaded `.app.tar.gz` and `latest.json` to v0.3.2 release
- Promoted v0.3.2 to "latest" non-prerelease
- Verified live endpoint: `curl -sL https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json` returns v0.3.2
- macOS updater confirmed working by Steve on RentAMac (v0.3.1 → v0.3.2)
- Created `docs/release-process.md` — comprehensive maintained reference for the full release pipeline
- Created GitHub issue #92 — auto-updater reliability tracking issue with full bug history, research agenda, and priority work items
- Committed and pushed all changes

### In Progress
- Nothing actively in progress

### Remaining
- **Windows update for current users:** Windows users on v0.3.0 have received no update notification for v0.3.1 or v0.3.2 — latest.json only has darwin-aarch64. A Windows build of v0.3.2 + patched latest.json is needed to cover them. Tracked in issue #92.
- **BUILD-LOG.md** has unstaged changes (auto-save hook added 3 lines). Should be committed.
- **Unpushed commit:** `0688befc wip: auto-save` — one commit ahead of origin (BUILD-LOG auto-save).

## Key Decisions
- v0.3.2 is the production release (not a test — it's now "latest" on GitHub)
- Windows users will be addressed when we do a full Windows v0.3.2 build
- `docs/release-process.md` is the canonical reference — always update it after a release cycle
- Issue #92 is where research and work tracking for updater reliability lives
- The CI silent-skip bug (latest.json not uploaded when release doesn't exist) is documented and tracked but not yet fixed in the workflow

## Relevant Files
- `docs/release-process.md` — NEW: canonical release/updater reference doc
- `src-tauri/tauri.conf.json` — version bumped to 0.3.2
- `src-tauri/Cargo.toml` — version bumped to 0.3.2
- `.github/workflows/build-macos.yml` — macOS CI pipeline (has the silent-skip bug on latest.json step)
- `src-tauri/src/updater.rs` — macOS relaunch logic (`open -n` approach)
- `src/lib/components/UpdateBanner.svelte` — banner text + sizing

## Git Status
- `BUILD-LOG.md` — modified, not staged (auto-save hook, 3 lines added)
- One unpushed commit: `0688befc wip: auto-save`
- All substantive work is committed and pushed

## GitHub Release State
- v0.3.2: latest release. Has `BlackTape.app.tar.gz` + `latest.json` (darwin-aarch64 only). No Windows entry.
- v0.3.1: superseded. macOS only.
- v0.3.0: has Windows installer. Windows users still on v0.3.0 (no newer Windows build).
- Updater endpoint: `https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json`

## Next Steps
1. Push the pending auto-save commit (`git push origin main`) or let it accumulate
2. Do a Windows build of v0.3.2 to cover Windows users (see `docs/release-process.md` for the full workflow)
3. After Windows build: patch `latest.json` with both `windows-x86_64` and `darwin-aarch64` entries and re-upload to v0.3.2 release
4. Work on issue #92 items — priority 1 is fixing the CI silent-skip

## Resume Command
After running `/clear`, run `/resume` to continue.
