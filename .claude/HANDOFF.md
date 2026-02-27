# Work Handoff - 2026-02-27

## Current Task
Screenshot QA session — capture all 21 screens at 1200×800, find bugs, fix them.

## Context
This session has been fighting to get the screenshot script working. The core problem is now understood and the fix is clear — just needs execution.

## The Problem (fully diagnosed)

The Tauri debug binary connects to the **Vite dev server at `http://localhost:5173`** (set as `devUrl` in `tauri.conf.json`). It doesn't load from `build/` in debug mode.

When the dev server isn't running on 5173, the binary shows `chrome-error://chromewebdata/` and all navigation fails.

The dev server (`npm run dev`) alone can't take screenshots because all DB queries fail with:
```
Error: getProvider() cannot be used in the web build. Create a D1Provider from platform.env.DB in your server hooks.
```

**The correct approach:**
1. Start `npm run dev` (on port 5173, the default)
2. Launch the Tauri binary with CDP enabled
3. Connect Playwright to the binary via CDP — this gets real DB access through `tauri-plugin-sql`
4. Navigate using `window.location.href` (NOT `page.goto()`) since the binary is already on `tauri://localhost`

## Script Status

`tools/take-screenshots-v1.6.mjs` — exists but currently uses dev server directly (wrong approach).

It needs to be rewritten to use the Tauri binary + CDP approach (like `tools/take-press-screenshots-v3.mjs` does), but:
- Navigate using `window.location.href = route` (relative URLs work from tauri://localhost)
- Kill existing mercury.exe before launching
- Port: 9224
- Wait longer for initial page load (app may take 5-10s to fully load after CDP connects)

## Exact Fix Needed

Look at `tools/take-press-screenshots-v3.mjs` — it's the working reference implementation. The v3 script successfully captured 49 screenshots. Adopt its `goto()` pattern:

```js
async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}
```

And its startup sequence:
```js
await pollCdp(35000);
await new Promise(r => setTimeout(r, 3000));  // Wait for page to load
const browser = await chromium.connectOverCDP(CDP_BASE);
// ... get page
await page.waitForLoadState('domcontentloaded').catch(() => {});
await page.waitForTimeout(3000);
// Don't check URL here — just start navigating
```

Also: make sure dev server on 5173 is running BEFORE launching the binary.

## Two Real Bugs Found (not script issues — actual app bugs)

1. **`/kb/shoegaze` and `/kb/krautrock` return 404** — The KB genre route is broken. The URL pattern `/kb/[genre]` is not matching. Need to check `src/routes/kb/` structure.

2. **Library pane testids missing** — `[data-testid="album-list-pane"]` and `[data-testid="track-pane"]` not found in the DOM when screenshot was taken. This might be because the library is empty (no local files scanned) and those panes only render with content.

Both bugs need investigation after screenshots are working.

## What Screenshots Look Like Right Now

`static/screenshots/` has 21 files — all captured, but they're empty/blank (dev server with no DB). They need to be retaken with the correct approach.

## Steps to Complete

1. Kill any mercury.exe and dev servers
2. Start `npm run dev` (port 5173) — let it fully start
3. Rewrite `tools/take-screenshots-v1.6.mjs` to use the Tauri binary + CDP approach from v3
4. Run the script
5. Review screenshots (read each PNG)
6. Fix any real bugs found (KB routes, library pane visibility, etc.)
7. Update BUILD-LOG.md with full session summary

## Key Files
- `tools/take-press-screenshots-v3.mjs` — working reference for Tauri CDP approach
- `tools/take-screenshots-v1.6.mjs` — script to fix (currently using wrong approach)
- `static/screenshots/` — output directory (21 blank files currently)
- `src/routes/kb/` — check for the 404 bug

## Resume Command
After running `/clear`, run `/resume` to continue.
