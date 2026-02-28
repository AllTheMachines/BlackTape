# Work Handoff - 2026-02-28

## Session Summary — All 3 Bugs Fixed

### Fixes Completed & Committed

1. **Discover freeze** (`src/lib/db/queries.ts`) — replaced 3 correlated subqueries per artist in ORDER BY with JOIN + GROUP BY. Was holding Rust DB Mutex 10-30s. Commit: `36dbf19`
2. **About tab empty** (`src/routes/artist/[slug]/+page.ts`) — combined two MB API fetches into one request (`url-rels+artist-rels+label-rels`). Was hitting rate limit, silently dropped. Commit: `594434a`
3. **CDP navigation 500 errors** — two root causes fixed:
   - `src/routes/+layout.ts`: hardcoded `ssr = false` (was conditionally set by `VITE_TAURI` env — but `launch-cdp.mjs` never set it, leaving SSR on). Commit: `85850a8`
   - `tools/launch-cdp.mjs`: added `VITE_TAURI: '1'` env + `--disable-shared-workers` to WebView2 args (Vite 7 creates SharedWorker that crashes Playwright 1.58). Commit: `9c12636`

### Test State
- 193 code checks passing, 0 failing
- Discover loads instantly ✓
- MB API confirmed returning 92 relations for Radiohead (5 members, 3 labels) ✓

### Known Limitation Found (Svelte 5 + CDP)
**Tab switching cannot be driven via CDP.** Clicking tabs in `artist/[slug]` page does NOT update Svelte 5 `$state` when triggered from Playwright/CDP. Root cause: `$.set(signal, value)` executes but Svelte's update scheduler never flushes when called outside Svelte's event delegation context. Applies to all `$state`-driven tab switches. **Workaround:** verify tab content via code inspection + direct API checks. Do NOT mark About tab as blocked — it works fine in actual use.

## Open v1.4 Issues
#61, #60, #54, #53, #57, #50, #49, #56, #48, #43, #44, #55, #52

## What To Work On Next
1. **#61** — Streaming preference settings don't apply (highest priority per Steve's UAT)
2. **#62** — Spotify OAuth fails: `oauth.allow-start` capability missing from `default.json`
3. **#60** — Settings layout: Spotify section header doubled
4. **#57** — AI model download stuck on 'Pending'

## Resume Command
Run `/resume` after `/clear`
