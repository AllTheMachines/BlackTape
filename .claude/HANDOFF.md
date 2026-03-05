# Work Handoff - 2026-03-05

## Current Task
macOS testing of v0.3.0 via GitHub Actions — automated UI tests + updater test.

## Context
v0.3.0 is released on GitHub with Windows + macOS (aarch64) artifacts. We're using GitHub Actions macOS runners + screencapture to test the app on macOS without a physical Mac. Gatekeeper was confirmed passing in a previous run.

## Progress
### Completed
- v0.3.0 macOS DMG confirmed installable on GitHub Actions runner
- **Gatekeeper test PASSED** (previous run): shows "Apple checked it for malicious software and none was detected" — best possible outcome for unsigned app
- App launches and renders UI correctly (confirmed from earlier screenshots)
- Live screencapture browser viewer working (ngrok HTTP + python HTTP server)
- **-10673 fix LANDED**: moved Gatekeeper test to last in workflow — run #16 (22699098978) confirmed "Launch BlackTape" PASSED
- One screenshot captured (test-01-setup-wizard.png, 91751 bytes) — uploaded as artifact

### In Progress
- Run #16 (22699098978) — FAILED at "Test 2 — Setup wizard completes"
- Error: `185:195: execution error: Can't get item 1 of {}. (-1728)`
- This is an AppleScript error: the script does `item 1 of btn` inside `repeat with btn in allBtns`, but `allBtns` contains empty sub-lists (windows with no buttons), causing -1728 when accessing item 1 of an empty list

### Remaining
- Fix AppleScript error handling in Test 2 (wrap button access in try/end try)
- Download and review test-01-setup-wizard.png artifact to see app state
- Get search + navigation screenshots (Tests 3 & 4)
- Decide on macOS updater test approach (RentAMac.io at $15/day was discussed as an option for interactive testing)
- Send DMG to Will Dickson at NTS (will@ntslive.co.uk) — Gatekeeper result already confirms it's safe to send
- Update BUILD-LOG.md with session summary

## Key Decisions
- **-10673 root cause confirmed**: Gatekeeper test poisoned Launch Services for subsequent open() calls. Fix = move Gatekeeper test to last step. WORKING.
- **RentAMac.io** ($15/day, dedicated Mac Mini M4) discussed as alternative for interactive/updater testing — GitHub Actions is for automated regression, RentAMac for one-off interactive sessions
- Updater test on macOS: best option is wait for v0.4.0 (v0.3.0 is only release with macOS artifacts) — or use RentAMac for manual test
- DMG is safe to send to Will even without functional test completion — Gatekeeper already confirmed clean

## Relevant Files
- `.github/workflows/macos-vnc.yml` — the macOS test workflow (restructured: functional tests first, Gatekeeper last)
- `BUILD-LOG.md` — 3 lines of uncommitted auto-save changes

## AppleScript Fix Needed
Current broken code in Test 2:
```applescript
set allBtns to every button of every window
repeat with btn in allBtns
  if name of (item 1 of btn) is "Continue" then  -- FAILS if btn is empty list
    click (item 1 of btn)
  end if
end repeat
```

Fix — wrap in try/end try:
```applescript
set allBtns to every button of every window
repeat with btn in allBtns
  try
    if name of (item 1 of btn) is "Continue" then
      click (item 1 of btn)
    end if
  end try
end repeat
```

Or restructure to iterate buttons directly:
```applescript
repeat with w in every window
  repeat with btn in every button of w
    try
      if name of btn is "Continue" then
        click btn
      end if
    end try
  end repeat
end repeat
```

## Git Status
- `BUILD-LOG.md` modified (3 lines auto-save, not staged)
- Branch is 2 commits ahead of origin (both pushed)

## Active GitHub Actions
- Run 22699098978 — COMPLETED (failure at Test 2), took 40s total
- Artifact uploaded: `macos-test-screenshots` (contains test-01-setup-wizard.png)
- Download artifact to see app state: `gh run download 22699098978 -n macos-test-screenshots -D /tmp/mac-screenshots`

## Next Steps
1. Fix AppleScript in Test 2 (add try/end try around button access)
2. Consider also making Test 2 non-failing (use `|| true` or set `continue-on-error: true`) since setup wizard may not always appear
3. Trigger another run and download artifacts to verify screenshots look correct
4. Decide: RentAMac for interactive updater test, or wait for v0.4.0?
5. Send DMG to Will Dickson
6. Write BUILD-LOG session summary

## Resume Command
After running `/clear`, run `/resume` to continue.
