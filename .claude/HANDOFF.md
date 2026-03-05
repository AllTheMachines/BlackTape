# Work Handoff - 2026-03-05

## Current Task
macOS testing of v0.3.0 via GitHub Actions — automated UI tests + updater test.

## Context
v0.3.0 is released on GitHub with Windows + macOS (aarch64) artifacts. We're using GitHub Actions macOS runners + screencapture to test the app on macOS without a physical Mac. VNC was abandoned (black screen issues on headless runners) in favour of screencapture → HTTP → ngrok viewer.

## Progress
### Completed
- v0.3.0 macOS DMG confirmed installable on GitHub Actions runner
- **Gatekeeper test PASSED**: shows "Apple checked it for malicious software and none was detected" + Open/Cancel dialog — best possible outcome for unsigned app
- App launches and renders UI correctly (setup wizard, menu bar, queue panel all visible)
- Live screencapture browser viewer working (ngrok HTTP + python HTTP server + screencapture loop)
- Workflow now runs automated tests + uploads screenshots as artifacts

### In Progress
- Automated test run #15 (run 22698896053) failed at "Launch BlackTape" with error -10673
- Error: `_LSOpenURLsWithCompletionHandler() failed with error -10673`
- Root cause: the Gatekeeper test (step 1) launches the quarantined app in background, which poisons Launch Services state for subsequent `open` calls, even after quarantine is stripped and process is killed
- Tests 2/3/4 (setup wizard, search, navigation) never ran

### Remaining
- Fix -10673: either reset Launch Services after quarantine test, or restructure workflow so Gatekeeper test runs AFTER functional tests
- Get search + navigation + setup wizard screenshots
- **Update test on macOS**: Steve wants to verify the updater works on macOS (not just Windows). v0.3.0 is the ONLY release so far — no v0.2.0 macOS DMG exists. To test updater: need to either (a) wait for v0.4.0, or (b) install v0.3.0 and manually trigger update check against a fake v0.4.0 latest.json
- Send DMG to Will Dickson at NTS (will@ntslive.co.uk) — Gatekeeper result already confirms it's safe to send
- Update BUILD-LOG.md with session summary

## Key Decisions
- VNC abandoned — GitHub Actions macOS runners are headless, VNC shows black screen
- screencapture + HTTP server + ngrok = working alternative to view the screen
- Gatekeeper result is good enough to send DMG to Will even before functional tests complete
- Update test on macOS requires a previous release to exist — currently impossible

## Relevant Files
- `.github/workflows/macos-vnc.yml` — the macOS test workflow (has Gatekeeper test + 4 automated UI tests + live viewer)
- `BUILD-LOG.md` — 3 lines of uncommitted auto-save changes

## -10673 Fix Options
Option A (recommended): Move Gatekeeper test to LAST, after functional tests. That way -10673 only affects the final step which is optional.

Option B: Reset Launch Services after quarantine test:
```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
```

Option C: Use `open` without `sudo -u runner` — runner IS already the runner user, sudo might be redundant.

## Git Status
- `BUILD-LOG.md` modified (3 lines auto-save, not staged)
- Branch is 2 commits ahead of origin (both pushed: BUILD-LOG auto-saves)

## Active GitHub Actions Run
- Run 22698896053 — FAILED at "Launch BlackTape"
- No active run currently

## Update Test (macOS) — Steve's Question
Steve asked about testing the updater on macOS (not just Windows, which was tested end-to-end with v0.2.0→v0.3.0). Currently impossible because:
- v0.3.0 is the only GitHub release
- No previous macOS build exists to install and then update FROM
Options:
1. Wait until v0.4.0 is released, then test v0.3.0→v0.4.0 updater on macOS
2. Create a "fake" v0.2.0-mac tag with an old build and test against that
3. Accept that updater was tested on Windows end-to-end and macOS updater code is identical (Tauri handles it)

## Next Steps
1. Fix the workflow — move Gatekeeper test to last, or try `open` without `sudo -u runner`
2. Run the functional tests (setup wizard, search, navigation) and download artifacts
3. Address update test question — probably option 1 (wait for v0.4.0)
4. Send DMG to Will Dickson: https://github.com/AllTheMachines/BlackTape/releases/download/v0.3.0/BlackTape_0.3.0_aarch64.dmg
5. Write BUILD-LOG session summary and commit

## Resume Command
After running `/clear`, run `/resume` to continue.
