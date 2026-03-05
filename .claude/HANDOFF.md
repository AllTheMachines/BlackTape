# Work Handoff - 2026-03-05

## Current Task
macOS build pipeline — WORKING. Need to create v0.3.0 release and upload macOS artifacts.

## Status: BUILD PIPELINE COMPLETE ✅

### What Was Accomplished This Session
- **Root cause found**: rsign2 has an ARM bug — fails to decrypt empty-password keys on macOS (works on Windows x86)
- **Fix**: Generated new key `~/.tauri/blacktape-prod.key` with real password "blacktape-ci-2026"
- **Updated**: `tauri.conf.json` pubkey (new key), GitHub secrets (TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD)
- **Simplified workflow**: Removed rsign2 entirely — Tauri CLI now signs natively with the real key
- **All steps pass**: Build, sign, notarize, DMG artifact, update bundle artifact all WORK
- **Latest.json**: Fails with HTTP 403 because v0.3.0 release doesn't exist on GitHub yet — expected

### Remaining Steps
1. **Create v0.3.0 GitHub release** (if not already done for Windows)
2. **Download macOS artifacts** from run 22696167799:
   - `BlackTape-macOS-arm64` artifact → DMG
   - `BlackTape-macOS-updater` artifact → .app.tar.gz + .sig
3. **Upload macOS artifacts to the release**:
   ```bash
   gh run download 22696167799 --name BlackTape-macOS-arm64 --dir /tmp/mac-artifacts
   gh run download 22696167799 --name BlackTape-macOS-updater --dir /tmp/mac-artifacts
   gh release upload v0.3.0 /tmp/mac-artifacts/BlackTape*.dmg /tmp/mac-artifacts/*.app.tar.gz /tmp/mac-artifacts/*.app.tar.gz.sig
   ```
4. **Re-run the workflow** to auto-patch latest.json (or patch manually):
   The CI already computed the correct darwin-aarch64 signature — it just couldn't upload because the release didn't exist. Re-triggering after creating the release will work.
   OR patch latest.json manually using the output shown in run 22696167799 logs.
5. **Send DMG to Will Dickson** (will@ntslive.co.uk) — NTS Radio press coverage

### Key Changes Made (Key Rotation)
- Old signing key: `~/.tauri/blacktape.key` (empty password — DEPRECATED)
- New signing key: `~/.tauri/blacktape-prod.key` (password: "blacktape-ci-2026")
- **Impact**: v0.2.0 users can't auto-update to v0.3.0 (pubkey changed). Must manually install.
- tauri.conf.json pubkey updated to new key

### Build Log
- Run 22696167799 is the successful run — all steps green except latest.json upload (403 = no release)
- Workflow: `.github/workflows/build-macos.yml`

## Git Status
BUILD-LOG.md has uncommitted changes (needs session summary). No other uncommitted files.

## Next Steps Summary
1. Check if v0.3.0 Windows release exists on GitHub
2. Download macOS artifacts from run 22696167799
3. Upload to v0.3.0 release (create it first if needed)
4. Re-trigger workflow OR manually patch latest.json
5. Send DMG to Will
6. Update BUILD-LOG.md
