# Work Handoff - 2026-03-05

## Current Task
macOS build pipeline — fixing rsign2 signing step (the build + notarization now works, but updater bundle signing fails).

## Context
NTS Radio (Will Dickson) is waiting on a Mac build for press coverage. The macOS GitHub Actions workflow builds, signs, and notarizes the DMG correctly. The blocker is signing the `.app.tar.gz` updater bundle with the project's minisign private key — rsign2 fails with "Wrong password for that key" even though `-W` (passwordless) is used.

## Progress

### Completed
- macOS GitHub Actions workflow: `.github/workflows/build-macos.yml`
- All 8 GitHub secrets configured (APPLE_CERTIFICATE, APPLE_ID, etc.)
- Root cause identified: **Tauri CLI has a bug** — it cannot decrypt scrypt-encrypted keys with empty passwords. This affects both our existing key AND freshly generated keys with `-p ""`.
- Workaround for Tauri build step: generate throwaway key with real password (`ci-throwaway-<timestamp>`), build with that, then replace the `.sig` with rsign2
- The throwaway key workaround works — "Build app (signed)" now PASSES (DMG + notarization succeeds)
- Fixed step condition bug: moved `APPLE_CERTIFICATE` to job-level env so `if: ${{ env.APPLE_CERTIFICATE != '' }}` correctly skips the unsigned step
- "Build app (unsigned — no cert configured)" now correctly SKIPPED

### In Progress
- **Build `22694911425` FAILED** at "Sign updater bundle with rsign2" step
  - rsign2 compiled successfully, found the `.app.tar.gz`
  - But `rsign sign -s /tmp/updater.key -W ...` → "Wrong password for that key"
  - The key written to `/tmp/updater.key` is somehow not matching what rsign2 expects

### Root Cause of Current Failure
The GitHub secret `TAURI_SIGNING_PRIVATE_KEY` was set to the **base64-encoded file content** (the outer base64 wrapper). The workflow does `base64 --decode` on it, which should give the raw minisign format. But rsign2 is still failing with wrong password.

Possible causes:
1. The GitHub secret was set to the wrong value (corrupted or different from current key file)
2. The base64 decode in CI produces a subtly different key file than what's on disk locally
3. Trailing newline issues with `printf '%s'` when writing the secret to a file

### Remaining
1. **Fix the key secret**: Re-set `TAURI_SIGNING_PRIVATE_KEY` GitHub secret to the DECODED raw minisign content:
   ```bash
   # On Windows local machine:
   cat ~/.tauri/blacktape.key | base64 -d | gh secret set TAURI_SIGNING_PRIVATE_KEY
   ```
   This sets the secret to the raw `untrusted comment: rsign encrypted secret key\n<key>` format, eliminating the double base64 issue.

2. **Update rsign2 signing step**: Remove the `base64 --decode` since the secret will already be in raw format:
   ```bash
   printf '%s\n' "$TAURI_SIGNING_PRIVATE_KEY" > /tmp/updater.key
   rsign sign -s /tmp/updater.key -W -x "$APP_SIG" "$APP_TAR"
   ```

3. **Trigger new build** and verify "Sign updater bundle with rsign2" passes

4. **Upload .app.tar.gz to v0.3.0 release** (workflow does this automatically if release exists)

5. **Verify latest.json** is patched with `darwin-aarch64` entry

6. **Send DMG to Will Dickson** (will@ntslive.co.uk)

7. **Update BUILD-LOG.md** with session summary

## Key Decisions
- **Tauri CLI signing bug**: Cannot decrypt scrypt-encrypted keys with empty password — confirmed affects even freshly generated keys. Workaround: throwaway key with real password for the Tauri build step, then rsign2 replaces the `.sig`.
- **rsign2 for Mac signing**: Same approach as Windows — manual signing with rsign2 after build
- **APPLE_CERTIFICATE at job level**: Moved to `jobs.build.env` so both step conditions evaluate correctly
- **macOS platform differences**: All core features (DB paths, model downloads, file paths) are cross-platform via Tauri's `app_data_dir()`. AI features need the macOS llama-server binary which the CI downloads automatically — end users are fine, only local devs on Mac need to manually fetch it.
- **Key on disk**: `~/.tauri/blacktape.key` is itself base64-encoded. Decoded content = raw minisign format. The GitHub secret should be the RAW (decoded) version, not the double-encoded version.

## Relevant Files
- `.github/workflows/build-macos.yml` — full CI pipeline (current state with all fixes)
- `src-tauri/tauri.macos.conf.json` — macOS bundle config (`["dmg", "app"]` targets)
- `src-tauri/tauri.conf.json` — updater endpoint + pubkey
- `~/.tauri/blacktape.key` — local private key (base64-encoded file)
- `~/.tauri/blacktape.key.pub` — local public key

## Current Workflow State
The "Build app (signed)" step generates a throwaway key and uses it for the Tauri build. This works. The rsign2 step then needs to sign the `.app.tar.gz` with the REAL key from the GitHub secret. The step fails because the key written from the secret is wrong.

## Git Status
Only `BUILD-LOG.md` has uncommitted changes (needs session summary).

## Exact Error
```
Sign updater bundle with rsign2:
  Installed package `rsign2 v0.6.6` (executable `rsign`)
  Signing: src-tauri/target/release/bundle/macos/BlackTape.app.tar.gz
  Wrong password for that key
  Error: Process completed with exit code 1.
```

## Next Steps
1. Re-set the GitHub secret with decoded key content:
   ```bash
   cat ~/.tauri/blacktape.key | base64 -d | gh secret set TAURI_SIGNING_PRIVATE_KEY
   ```
2. Update the rsign2 step in `.github/workflows/build-macos.yml` to write the secret directly (no base64 decode):
   ```bash
   printf '%s\n' "$TAURI_SIGNING_PRIVATE_KEY" > /tmp/updater.key
   ```
3. Trigger build: `gh workflow run build-macos.yml`
4. Watch: `gh run watch $(gh run list --workflow=build-macos.yml --limit=1 --json databaseId --jq '.[0].databaseId')`
5. If signing passes: download artifacts, upload to v0.3.0 release, verify latest.json
6. Update BUILD-LOG.md and commit

## Server Status (separate concern)
Similar artists pipeline was running on server (PID 8688) — check if complete:
```bash
ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -5 /opt/blacktape-api/similar-artists.log"
```

## Resume Command
After running `/clear`, run `/resume` to continue.
