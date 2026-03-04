# Work Handoff - 2026-03-05

## Current Task
macOS build pipeline — signed, notarized DMG + updater bundle working end-to-end via GitHub Actions.

## Context
NTS Radio (Will Dickson, will@ntslive.co.uk) is waiting on a Mac build for press coverage. We set up the full pipeline today: Apple Developer ID cert, notarization, Tauri updater signing, and automatic latest.json patching. Also planning to test both the DMG install and the updater mechanism using GitHub Actions macOS runners (free, headless).

## Progress

### Completed
- macOS GitHub Actions workflow: `.github/workflows/build-macos.yml`
- Fixed llama.cpp asset format: `.tar.gz` not `.zip`, extracts to `llama-<tag>/llama-server`
- Fixed PKCS12 encryption: OpenSSL 3 default format rejected by macOS `security` tool — regenerated with legacy flags (`-keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -nomac`)
- All 8 GitHub secrets set:
  - `APPLE_CERTIFICATE` — base64 legacy p12 from `/tmp/blacktape-dev-legacy.p12`
  - `APPLE_CERTIFICATE_PASSWORD` — `blacktape-ci`
  - `APPLE_SIGNING_IDENTITY` — `Developer ID Application: Stephan Bolch (93MH3NBTSV)`
  - `APPLE_ID` — `info@all-the-machines.com`
  - `APPLE_PASSWORD` — app-specific password `suls-gikr-xjkv-mqgd`
  - `APPLE_TEAM_ID` — `93MH3NBTSV`
  - `KEYCHAIN_PASSWORD` — `ci-keychain-pw`
  - `TAURI_SIGNING_PRIVATE_KEY` — content of `~/.tauri/blacktape.key`
- Last successful signed+notarized build: run `22693521339` — `BlackTape_0.3.0_aarch64.dmg` (13MB)
- Fixed `tauri.macos.conf.json`: added `"app"` to targets so `.app.tar.gz` updater bundle is generated
- Workflow now uploads two artifacts: `BlackTape-macOS-arm64` (DMG) and `BlackTape-macOS-updater` (.app.tar.gz + .sig)
- `latest.json` update step wired in workflow — patches `darwin-aarch64` entry and uploads to GitHub release

### In Progress
- **Build `22693856879` running** — first build with `app` target + updater bundle capture
  - Check: `gh run list --workflow=build-macos.yml --limit=1`
  - Watch: `gh run watch 22693856879`

### Remaining
1. Verify build `22693856879` succeeds and produces `BlackTape-macOS-updater` artifact
2. Download `.app.tar.gz` and `.app.tar.gz.sig`, upload both to v0.3.0 GitHub release
3. Patch `latest.json` in v0.3.0 release to add `darwin-aarch64` entry (workflow may do this automatically if release exists)
4. **Updater test** (Option A — fake newer version):
   - Temporarily set `version: "99.0.0"` in `latest.json` on the release
   - Write a GitHub Actions test workflow that: installs v0.3.0 DMG on macOS runner, launches app, checks it fires the updater HTTP request against the fake version, verifies download + apply
   - Revert `latest.json` back to `0.3.0` after test passes
5. **Visual testing** — discussed BrowserStack (~$29/month starter) for actually seeing the UI; GitHub Actions headless is free but can't show the interface visually
6. Send DMG to Will Dickson once updater test passes
7. Update BUILD-LOG.md with session summary and commit

## Key Decisions
- **GitHub Actions for testing** — free, I can operate fully autonomously (headless); for visual UI testing BrowserStack is needed but not decided yet
- **Updater test strategy** — Option A: fake `version: "99.0.0"` in `latest.json` temporarily, test the full update flow, revert. No permanent version bump.
- **Key files for certs**: `/tmp/blacktape-dev.key` (private key), `/tmp/blacktape-dev-legacy.p12` (legacy p12) — these are TEMP files on Windows, not committed. If lost, regenerate CSR from `blacktape-dev.key` and re-download cert from Apple.
- **Developer cert**: `developerID_application.cer` was saved to Desktop, used to build the p12

## Relevant Files
- `.github/workflows/build-macos.yml` — full CI pipeline (build, sign, notarize, upload artifacts, patch latest.json)
- `src-tauri/tauri.macos.conf.json` — macOS bundle config (`["dmg", "app"]` targets)
- `src-tauri/tauri.conf.json` — updater endpoint + pubkey
- `src-tauri/tauri.windows.conf.json` — Windows bundle (for reference)

## Git Status
Only `BUILD-LOG.md` has uncommitted changes (needs session summary).

## Server Status (separate concern)
- Similar artists pipeline was running on server (PID 8688) — may have completed by now
- Check: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -5 /opt/blacktape-api/similar-artists.log"`
- If done: Rabbit Hole will show similar artist suggestions

## Next Steps
1. Wait for build `22693856879` to complete: `gh run watch 22693856879`
2. Download updater artifact: `gh run download 22693856879 --name BlackTape-macOS-updater --dir /tmp/macos-updater`
3. Upload `.app.tar.gz` to v0.3.0 release: `gh release upload v0.3.0 /tmp/macos-updater/*.app.tar.gz --clobber`
4. Check if `latest.json` was auto-patched by workflow; if not, patch manually and upload
5. Write test workflow for updater (GitHub Actions macOS, Option A)
6. Update BUILD-LOG.md and commit

## Resume Command
After running `/clear`, run `/resume` to continue.
