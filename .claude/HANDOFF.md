# Work Handoff - 2026-03-05

## Current Task
Testing the v0.3.0 macOS build via GitHub Actions VNC session.

## Context
v0.3.0 is fully released on GitHub with both Windows and macOS artifacts. We set up a GitHub Actions macOS workflow that spins up a real Apple M1 runner, installs the BlackTape DMG, and exposes the desktop via VNC through ngrok. This lets us test the app on macOS without a physical Mac.

## Progress
### Completed
- v0.3.0 release complete: DMG + updater bundle uploaded, latest.json patched with darwin-aarch64 entry
- GitHub Actions VNC workflow created: `.github/workflows/macos-vnc.yml`
- ngrok auth token set as GitHub secret (NGROK_AUTH_TOKEN)
- Fixed: ngrok TCP requires card on file (user added card)
- Fixed: dscl -passwd requires old password — switched to sysadminctl to create `vncuser`
- Fixed: black screen — added `open -a Finder` and `open -a BlackTape` to wake display
- Run #6 is currently LIVE: `0.tcp.us-cal-1.ngrok.io:10188`

### In Progress
- VNC session #6 (run 22697960682) is running — user is about to connect with TigerVNC
- Connect: `0.tcp.us-cal-1.ngrok.io:10188`, user: `vncuser`, pass: `testpass123`

### Remaining
- Connect via TigerVNC and verify app works on macOS
- Test the updater (app should check for updates on launch — but since this IS v0.3.0, need v0.4.0 to test update flow, or just confirm the check fires)
- Cancel workflow when done testing
- Send DMG to Will Dickson (will@ntslive.co.uk) at NTS Radio
- Update BUILD-LOG.md with session summary

## Key Decisions
- VNC approach: GitHub Actions macOS runner + ngrok TCP tunnel = free macOS GUI access
- Created `vncuser` (password: testpass123) instead of modifying `runner` user (no password set)
- Launched Finder + BlackTape in workflow to wake the display before VNC connects

## Relevant Files
- `.github/workflows/macos-vnc.yml` — the VNC workflow (committed, pushed)
- `BUILD-LOG.md` — has 3 lines of uncommitted auto-save changes (minor, safe to commit or discard)

## Git Status
- `BUILD-LOG.md` modified (3 lines, auto-save additions) — not staged
- Branch is 2 commits ahead of origin (both pushed successfully)

## Active GitHub Actions Run
- Run ID: 22697960682
- URL: https://github.com/AllTheMachines/BlackTape/actions/runs/22697960682
- VNC: `0.tcp.us-cal-1.ngrok.io:10188` / user: `vncuser` / pass: `testpass123`
- Session expires after 6 hours or when cancelled

## Next Steps
1. Connect TigerVNC to `0.tcp.us-cal-1.ngrok.io:10188` (user: vncuser, pass: testpass123)
2. Verify app opens, search works, Gatekeeper doesn't block it
3. Cancel the workflow run when done
4. Email Will Dickson with DMG link: https://github.com/AllTheMachines/BlackTape/releases/download/v0.3.0/BlackTape_0.3.0_aarch64.dmg
5. Commit BUILD-LOG.md session summary

## Resume Command
After running `/clear`, run `/resume` to continue.
