# Work Handoff - 2026-02-28

## ACTIVE BUG: About/Stats/Overview tab switching broken in real app

Steve confirmed: clicking the About tab does nothing. Likely all 3 tabs are broken (not just About).

### Root cause hypothesis
Svelte 5 `onclick={fn}` uses event delegation — it stores the handler as `btn.__click` and attaches a single `click` listener at the document level. That root listener is registered via `delegate()` at module init time. The `--disable-shared-workers` flag added to mercury.exe launch args (to fix CDP/Playwright) may be disrupting Vite's HMR module loading, causing the Svelte runtime to not fully initialise the delegation root listener.

### What to investigate first
1. Check if ALL tabs are broken (Overview + Stats + About) or just About
2. Check if the issue existed BEFORE the `--disable-shared-workers` flag was added (revert that flag in `launch-cdp.mjs` and test)
3. If removing `--disable-shared-workers` fixes tabs → the flag was breaking Svelte's HMR init

### The fix path
Option A — Remove `--disable-shared-workers` and find another way to fix Playwright's shared_worker crash (e.g., wrap `connectOverCDP` in try/catch, or filter targets before connecting).

Option B — Change tab buttons from Svelte 5 `onclick` delegation to direct `addEventListener` in `onMount`, bypassing delegation entirely.

Option C — Change `onclick={fn}` to Svelte's legacy `on:click={fn}` syntax which compiles to direct `addEventListener` on the element (not delegation).

**Recommended: Try Option A first** (remove --disable-shared-workers, test tabs). If tabs work → the flag was the culprit. Then fix Playwright differently.

### Files changed this session (all committed)
- `src/lib/db/queries.ts` — Discover freeze fix (JOIN+GROUP BY)
- `src/routes/artist/[slug]/+page.ts` — About tab MB API combined request
- `src/routes/+layout.ts` — `ssr = false` hardcoded
- `tools/launch-cdp.mjs` — VITE_TAURI=1 + --disable-shared-workers (SUSPECT)
- `src/lib/components/ArtistRelationships.svelte` — empty state
- `src/routes/artist/[slug]/+page.svelte` — About tab always visible

### Test state
193/193 code checks passing.

## Open v1.4 Issues
#61, #60, #54, #53, #57, #50, #49, #56, #48, #43, #44, #55, #52

## Resume Command
Run `/resume` after `/clear`
