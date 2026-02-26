# Work Handoff — 2026-02-26

## Current Task
Take press screenshots for marketing before executing Phase 28.

## Context
Steve requested a full press screenshot set (12 shots + bonuses) using the real live database. The screenshot automation script is written and ready, but needs to be run with the Tauri app closed first. Phase 28 plans are already committed and ready to execute immediately after screenshots are done.

## Progress

### Completed
- ✅ Researched live DB — `%APPDATA%/com.mercury.app/mercury.db` is 782MB, 2.8M artists, 241K tagged artists
- ✅ Found best artist slugs and filter combos from DB queries
- ✅ Rewrote `tools/take-press-screenshots.mjs` with all 12 press shots + bonuses, outputs to `press-screenshots/v2/`
- ✅ Pipeline dev DB tags imported (`pipeline/import-tags-only.mjs` — was empty, now 724 artists tagged)
- ✅ Phase 28 plans committed (7 plans in 3 waves) — last commit: `plan(28): 7 plans in 3 waves`

### In Progress
- ❌ Screenshot script — written but failed to run because mercury.exe exits immediately

### Remaining
- Run the screenshot script successfully
- Review the output in `press-screenshots/v2/`
- Execute Phase 28 (`/gsd:execute-phase 28`)

## Key Decisions
- Screenshots go to `press-screenshots/v2/` (separate from old v1 shots)
- Shot 4 target: **Skinfields** (slug=`skinfields`) — Very Niche, coldwave/darkwave/industrial, Europe, 19 clean quality tags
- Shot 12 target: **Wavewulf** (slug=`wavewulf`) — NJ, 69 quality tags: ambient house, synthwave, electronica, nordic ambient, tim hecker
- Using CDP port **9223** (not 9222) to avoid conflict with any running instance

## The Blocker

`mercury.exe` exits immediately when launched by the script with:
```
[ERROR:ui\gfx\win\window_impl.cc:124] Failed to unregister class Chrome_WidgetWin_0. Error = 1411
```
**Cause:** Another Tauri/mercury window is open. The WebView2 class conflicts.

**Fix:** Close any open BlackTape/mercury windows, then run:
```
node tools/take-press-screenshots.mjs
```

## Key Filter Combos (confirmed from DB query)
- `doom metal + Finland` → 100 artists (Shot 1)
- `experimental,ambient,drone,industrial,noise rock` → many artists (Shot 3)
- `black metal + Norway` → 244 artists (bonus)
- `post-punk + United Kingdom` → 379 artists (bonus)
- `krautrock + Germany` → 381 artists (bonus)
- `shoegaze + Japan` → 43 artists (bonus)

## Relevant Files
- `tools/take-press-screenshots.mjs` — the full screenshot automation script (READY TO RUN)
- `press-screenshots/v2/` — output directory (created, empty)
- `pipeline/import-tags-only.mjs` — re-imports tags without full pipeline re-run
- `pipeline/query-live-db.cjs` — queries live AppData DB for research
- `pipeline/find-screenshot-artists.cjs` — finds NICHE artists by uniqueness score
- `pipeline/find-filter-combos.cjs` — checks filter combo result counts
- `.planning/phases/28-ux-cleanup-scope-reduction/` — all 7 Phase 28 plans (committed, ready)

## Git Status
```
modified: BUILD-LOG.md (3 lines added)
modified: parachord-reference (submodule)
untracked: pipeline/find-filter-combos.cjs
untracked: pipeline/find-screenshot-artists.cjs
untracked: pipeline/query-live-db.cjs
untracked: pipeline/check-db.cjs
untracked: tools/check-db.cjs (actually tools/check-db.cjs)
```
No source code changes uncommitted. Safe to proceed.

## Next Steps
1. **Close any open BlackTape/mercury app window** visible on screen
2. Run: `node tools/take-press-screenshots.mjs`
3. If binary still fails, launch manually in PowerShell to diagnose:
   ```powershell
   $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223"
   .\src-tauri\target\debug\mercury.exe
   ```
4. Review screenshots in `press-screenshots/v2/`
5. Run Phase 28: `/gsd:execute-phase 28`

## v1.5 Plan Summary
| Phase | What | Status |
|-------|------|--------|
| 28 | UX Cleanup + Scope Reduction | Ready to execute |
| 29 | Spotify Full Integration ⭐ | Planned |
| 30 | Spotify UI Polish + Service Preference + Artist Claim Form | Planned |
| 🚀 | **SHIP v1.5 after Phase 30** | — |

## Resume Command
After running `/clear`, run `/resume` to continue.
