# Work Handoff - 2026-02-28

## Current Task
Getting the automated demo recorder (`tools/record-and-run.mjs`) to work properly for capturing a demo video of the BlackTape app.

## Context
Steve wants to record a demo video of the app. The tool `record-and-run.mjs` uses Playwright CDP + ffmpeg to automate a demo walkthrough and record it. Several bugs were found and fixed this session. Steve is now recording manually using OBS or similar — he was repeatedly restarting the app via `node tools/launch-cdp.mjs`.

## Progress
### Completed
- **Window capture fix** — ffmpeg now captures the BlackTape window specifically (`-i title=BlackTape`) instead of the full desktop. Previous run was capturing VS Code.
- **Vite auto-start** — `launch-cdp.mjs` now starts Vite dev server automatically if not running (debug binary connects to `localhost:5173`).
- **IPv6 port detection fix** — `waitForPort` was checking `127.0.0.1` but Vite binds to `[::1]`; fixed to use `localhost`.
- **Nav bug fixed** — `nav()` function was calling `safe(p => { window.location.href = p; })` where `p` was always `undefined` in the browser context (Playwright doesn't serialize closures). Fixed to `page.evaluate((url) => { window.location.href = url; }, path2)`.
- **Enter after search** — `typeInSearch()` now presses Enter after typing each genre/term.
- **App load wait** — `record-and-run.mjs` now waits 4s if it connects to a `chrome-error://` or `about:blank` URL before proceeding.

### In Progress
- Steve is manually recording the app using OBS (repeatedly restarting via `launch-cdp.mjs`).

### Remaining
- If Steve wants the automated demo recorder to work end-to-end, it needs a full test run. Several click interactions (play-all-btn, queue-btn, etc.) were timing out — the selectors may need updating for the current app version.
- Commit `tools/launch-cdp.mjs` and `tools/record-and-run.mjs` with all fixes.

## Key Decisions
- `launch-cdp.mjs` is the one-command launcher: starts Vite if needed, kills old mercury.exe, launches fresh with CDP on port 9224.
- The demo recorder is a separate concern from the manual OBS recording Steve is doing now.

## Relevant Files
- `tools/launch-cdp.mjs` — launches Vite + mercury.exe with CDP (modified this session)
- `tools/record-and-run.mjs` — automated demo recorder (modified this session, multiple bug fixes)
- `tools/record-demo.mjs` — older standalone demo script (not actively used)

## Git Status
- `BUILD-LOG.md` — modified (uncommitted log entries)
- `parachord-reference` — submodule modified content
- `tools/launch-cdp.mjs` and `tools/record-and-run.mjs` are untracked (not yet staged)

## Next Steps
1. Commit the two tool files: `tools/launch-cdp.mjs` and `tools/record-and-run.mjs`
2. If Steve wants to run the automated recorder again: `node tools/launch-cdp.mjs` then `node tools/record-and-run.mjs`
3. If click interactions still fail, audit selectors against current app markup

## Resume Command
After running `/clear`, run `/resume` to continue.
