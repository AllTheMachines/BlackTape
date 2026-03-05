# Release Process & Auto-Updater — Maintained Reference

> **This document is the canonical reference for BlackTape's release and auto-update pipeline.**
> It is updated after every release cycle. Last updated: 2026-03-05 (v0.3.2).

---

## Why This Matters

The auto-updater is the silent guarantee that users always run the latest version. A broken updater means users stay on old software indefinitely — and they won't know. That's a trust problem and a safety problem (security fixes never land). This must work reliably on every release for both platforms.

---

## How the Updater Works (Overview)

1. App starts and checks the updater endpoint (configurable interval / on launch)
2. Tauri fetches `latest.json` from the endpoint URL in `tauri.conf.json`
3. If `latest.json` version > app version, update is available
4. Tauri downloads the platform-specific artifact (URL in `latest.json`)
5. Tauri verifies the download signature against the embedded pubkey
6. If valid: installs the update
7. On macOS: app closes, user sees banner, reopens manually
8. On Windows: NSIS installer runs in-place, app relaunches

**Updater endpoint:**
```
https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json
```

This URL resolves to the `latest.json` asset in the **latest non-prerelease** GitHub release. If a release is marked as prerelease, it does NOT serve from this URL.

---

## latest.json Format

Both platforms must be present in the same `latest.json`. If a platform entry is missing, users on that platform receive no update notification.

```json
{
  "version": "X.Y.Z",
  "notes": "Release notes.",
  "pub_date": "2026-03-05T11:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<base64-encoded minisign signature>",
      "url": "https://github.com/AllTheMachines/BlackTape/releases/download/vX.Y.Z/BlackTape_X.Y.Z_x64-setup.exe"
    },
    "darwin-aarch64": {
      "signature": "<base64-encoded minisign signature>",
      "url": "https://github.com/AllTheMachines/BlackTape/releases/download/vX.Y.Z/BlackTape.app.tar.gz"
    }
  }
}
```

**Critical signature format rule:**
- `signature` must be `base64(entire .sig file content)`
- On Windows (rsign2): the `.sig` file is raw minisign text → you MUST `base64 -w0 file.sig` it
- On macOS CI (Tauri): the `.sig` file Tauri produces is ALREADY base64-encoded → use `cat file.sig | tr -d '\n'` directly, NEVER `base64` again
- Double-encoding = "Invalid encoding in minisign data" crash in updater

---

## Signing Key

| File | Purpose |
|------|---------|
| `~/.tauri/blacktape-prod.key` | **ACTIVE** private signing key (base64-wrapped, password: `blacktape-ci-2026`) |
| `~/.tauri/blacktape-prod.key.pub` | **ACTIVE** public key |
| `~/.tauri/blacktape.key` | DEPRECATED — do not use |
| `tauri.conf.json` → `plugins.updater.pubkey` | Public key embedded in every app binary |

**WARNING: Do not rotate the signing key** without a plan for users on the old pubkey. They will not be able to verify signatures from the new key — their updater silently fails. They must manually reinstall. This happened at v0.3.0 (users on v0.2.0 could not auto-update).

---

## macOS Release (GitHub Actions — Automated)

macOS builds run on `macos-latest` (Apple Silicon) via `.github/workflows/build-macos.yml`.

### What the workflow does:
1. Checks out repo + installs deps
2. Downloads `llama-server` ARM64 binary from latest llama.cpp release
3. Imports Apple certificate from secrets (if configured)
4. Builds app with `npm run tauri build` — Tauri signs the updater bundle automatically using `TAURI_SIGNING_PRIVATE_KEY` secret
5. Uploads DMG artifact (14-day retention)
6. Uploads `.app.tar.gz` + `.sig` artifact (14-day retention)
7. **Attempts to patch `latest.json`** — downloads existing `latest.json` from the release, adds `darwin-aarch64` entry, re-uploads

### Known CI gotchas:
- **Workflow triggers:** `workflow_dispatch` (manual) or `push` with `v*` tags. Does NOT trigger on push to `main`.
- **Silent skip:** Step 7 silently skips if the GitHub release doesn't exist yet. You must create the release BEFORE triggering the workflow, or create it after and then re-trigger step 7 manually.
- **`releases/latest` only serves non-prerelease:** If you create the release as a prerelease for testing, the updater endpoint won't serve it. Promote it to latest after testing.
- **Artifact expiry:** CI artifacts expire in 14 days. If you need to re-upload, you must rebuild.

### Manual release steps (after workflow succeeds):
```bash
# 1. Create the GitHub release FIRST (workflow needs it to exist for latest.json upload)
gh release create vX.Y.Z --title "vX.Y.Z" --notes "Release notes" --prerelease

# 2. Trigger the workflow
gh workflow run build-macos.yml --ref main

# 3. Wait for build to complete (~4 min), then promote release
gh release edit vX.Y.Z --prerelease=false --latest

# 4. Verify the endpoint
curl -sL https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json
```

---

## Windows Release (Manual — No CI Yet)

Windows builds must be done locally. There is no CI pipeline for Windows yet (see issue #XXX).

### Signing Note
`npx tauri signer sign` and the Tauri CLI signing step both **hang indefinitely on Windows** — they block on a console password prompt internally even for password-protected keys. **Do not use Tauri CLI for signing on Windows.** Use rsign2 instead.

### Full Windows Release Workflow:

```bash
# 1. Build (no signing env var — just build the binary)
npx tauri build

# 2. Sign with rsign2 (decode key first — rsign2 needs raw minisign format)
INSTALLER="src-tauri/target/release/bundle/nsis/BlackTape_X.Y.Z_x64-setup.exe"
base64 -d ~/.tauri/blacktape-prod.key > /tmp/prod-raw.key
rsign sign -s /tmp/prod-raw.key -p "blacktape-ci-2026" -W \
  -x "${INSTALLER}.sig" \
  "${INSTALLER}"
rm /tmp/prod-raw.key  # clean up key from temp

# 3. Encode the signature for latest.json
# IMPORTANT: rsign2 produces raw minisign TEXT → must base64-encode for latest.json
SIG=$(base64 -w0 "${INSTALLER}.sig")

# 4. Build latest.json (with both platforms if macOS already released)
# ...update the windows-x86_64 entry and keep darwin-aarch64 from the existing latest.json

# 5. Upload to GitHub release
gh release upload vX.Y.Z "${INSTALLER}" "${INSTALLER}.sig" latest.json --clobber

# 6. Verify
curl -sL https://github.com/AllTheMachines/BlackTape/releases/latest/download/latest.json
```

---

## Cross-Platform latest.json Coordination

This is an operational risk. Both platforms must appear in the same `latest.json`. The current workflow is:

1. macOS CI runs → produces `darwin-aarch64` entry
2. Windows build runs (manually) → adds `windows-x86_64` entry to the same file

**The problem:** If macOS ships first and Windows ships later, Windows users get no update notification until the Windows build is ready and `latest.json` is patched. And vice versa. Right now, v0.3.1 and v0.3.2 shipped macOS-only — Windows users on v0.3.0 have not received update notifications for either release.

**Minimum viable fix:** Never promote a release to "latest" until both platform entries are in `latest.json`.

---

## Version Bumping

Always bump in both places:
```bash
# src-tauri/tauri.conf.json
"version": "X.Y.Z"

# src-tauri/Cargo.toml
version = "X.Y.Z"
```

Cargo.lock will update on next build. The pre-commit test suite validates that Tauri config names the app correctly.

---

## Verified Working Scenarios

| Scenario | Status | Notes |
|----------|--------|-------|
| Windows v0.2.x → v0.3.0 | ✓ Tested | Full end-to-end with NSIS installer |
| macOS v0.3.1 → v0.3.2 | ✓ Tested | Tested on Mac Mini M4 via RentAMac/DeskIn |
| Windows v0.3.0 → v0.3.x | ✗ NOT TESTED | No Windows build for v0.3.1 or v0.3.2 yet |
| Cross-platform simultaneous update | ✗ NOT TESTED | Never done |

---

## Bugs Found and Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| "Invalid encoding in minisign data" | macOS CI `.sig` is already base64 — we ran `base64` again | Use `cat file.sig \| tr -d '\n'` not `base64` |
| HTTP 403 on release upload | Missing `permissions: contents: write` in workflow | Added to `build-macos.yml` |
| CI silently skips latest.json | Release didn't exist when workflow ran step 7 | Create release before triggering workflow |
| GitHub API rate limit in CI | Unauthenticated curl for llama.cpp latest release | Added `Authorization: Bearer $GH_TOKEN` header |
| Updater banner unclear | App closed with no message after update installed | Banner now says "open the app again" |
| Auto-relaunch unreliable on macOS | macOS caching/quarantine after bundle replacement | Kept explicit "reopen" message as reliable fallback |
| rsign2 ARM bug | Empty-password keys fail to decrypt on macOS ARM | Rotated to password-protected key |
| Key rotation breaks updater for old users | Old pubkey embedded in their binary can't verify new sigs | Manual reinstall required — document in release notes |
| Tauri CLI signer hangs on Windows | Internal console password prompt, even with `--ci` | Use rsign2 on Windows |

---

## Known Risks & Open Questions

1. **No Windows CI pipeline** — Windows releases require a developer machine. If the machine is unavailable, no Windows release.
2. **Silent CI skip** — If someone forgets to create the GitHub release first, the latest.json update is silently skipped and no error is shown.
3. **Prerelease promotion** — If a release isn't promoted from prerelease, the endpoint serves the wrong version.
4. **Cross-platform sync** — No atomic mechanism ensures both platforms ship together.
5. **No health check** — Nothing monitors whether `latest.json` is well-formed and reachable after each release.
6. **No updater test in CI** — The updater is only tested manually on real devices.
7. **Tauri updater internals** — We don't have full visibility into when/how Tauri checks for updates (interval, retry logic, failure handling).

---

## Research Backlog

See GitHub issue #92 for the full research agenda and open questions.
