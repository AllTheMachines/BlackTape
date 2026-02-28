# Work Handoff - 2026-02-28

## Tab Switching Bug — FIXED

**Root cause confirmed:** `--disable-shared-workers` in `launch-cdp.mjs` was preventing Vite 7's HMR SharedWorker from initializing, which caused Svelte 5's event delegation to never register its document-level click listener. All `onclick={}` handlers silently did nothing.

**What was fixed:**
- `tools/launch-cdp.mjs` — removed `--disable-shared-workers` flag
- `tools/snap.mjs` — rewrote to use raw CDP WebSocket instead of Playwright (avoids SharedWorker target assertion)

**To verify:** Launch app via `node tools/launch-cdp.mjs`, click Overview/Stats/About tabs on any artist page. They should switch correctly now.

**Known remaining issue:** Other screenshot tools (`take-screenshots-v1.7.mjs`, etc.) still use Playwright `connectOverCDP` at port 9224 and may fail if Vite is running due to SharedWorker. These are low-priority since they're run infrequently.

## Open v1.4 Issues
#61, #60, #54, #53, #57, #50, #49, #56, #48, #43, #44, #55, #52

## Test State
193/193 code checks passing.

## Resume Command
Run `/resume` after `/clear`
