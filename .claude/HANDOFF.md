# Work Handoff — 2026-02-26

## Current Task
Press screenshots for marketing BEFORE Phase 28. Script is written but binary launch needs a fix.

## What Was Done This Session

### Press Screenshots (IN PROGRESS)
- ✅ DB researched — live DB at `%APPDATA%/com.mercury.app/mercury.db` is 782MB, 2.8M artists, 241K tagged artists
- ✅ Tags imported into pipeline dev DB (was empty — ran `pipeline/import-tags-only.mjs`)
- ✅ Screenshot script fully rewritten: `tools/take-press-screenshots.mjs` — outputs to `press-screenshots/v2/`
- ❌ Binary launch FAILING — mercury.exe exits immediately with "Failed to unregister class Chrome_WidgetWin_0"

### Phase 28
- ✅ Plans already committed (7 plans, 3 waves) — last commit: `plan(28): 7 plans in 3 waves`
- ✅ Phase 28 is ready to execute after screenshots are done

## Press Screenshot Fix Needed

### The Problem
`mercury.exe` launched from the script exits immediately. The error is:
```
[ERROR:ui\gfx\win\window_impl.cc:124] Failed to unregister class Chrome_WidgetWin_0. Error = 1411
```
This happens because an existing Tauri/WebView2 instance is already running (from `npm run tauri dev`).

### Solutions to Try
**Option A (recommended):** Use CDP port 9222 on the ALREADY-RUNNING Tauri instance
- The dev server is on port 5173 (confirmed running)
- Check if WebView2 already has a CDP endpoint via: `curl http://127.0.0.1:9222/json`
- The existing Tauri window might already have CDP if it was launched with the right env var

**Option B:** Kill the existing Tauri window first, then relaunch with CDP
```powershell
taskkill /F /IM mercury.exe
# Wait 2s
# Then run the screenshot script
```

**Option C:** Change the script to use the existing dev server via Playwright directly (non-Tauri)
- Most features work fine in browser mode EXCEPT Tauri invoke() calls (DB queries)
- Discover page needs DB → won't work
- Artist pages (MusicBrainz API) → DO work in browser mode
- Can use Playwright Chromium directly against localhost:5173

**Option D (best if Tauri window is open):** Re-enable CDP on running instance
The test runner uses `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`
when spawning the binary. If the window is already open, this won't apply.

### RECOMMENDED NEXT STEP
1. Close the currently open Tauri/mercury window (if visible on screen)
2. Run: `node tools/take-press-screenshots.mjs`
3. The script will launch a fresh instance with CDP enabled

### Screenshot Target Artists
Researched from live DB — key artist slugs:
- **Shot 4 (Very Niche artist):** `skinfields` — coldwave/darkwave/industrial, Europe, Very Niche score=553, 19 clean tags
- **Shot 12 (dense tag cloud):** `wavewulf` — NJ, 69 quality tags: ambient house, synthwave, electronica, nordic ambient, tim hecker
- **Shot 10 (search):** Use `/search?q=shoegaze&mode=tag` — 43 artists in Japan category

### Key Filter Combos (confirmed results in DB)
- `doom metal + Finland` → 100 artists ✓ (Shot 1)
- `black metal + Norway` → 244 artists ✓ (bonus)
- `post-punk + United Kingdom` → 379 artists ✓ (bonus)
- `krautrock + Germany` → 381 artists ✓ (bonus)
- `shoegaze + Japan` → 43 artists ✓
- `experimental,ambient,drone,industrial,noise rock` → many ✓ (Shot 3)

## v1.5 Plan Summary

**Goal:** Make BlackTape fully playable. Spotify is the priority.

| Phase | What | Status |
|-------|------|--------|
| 28 | UX Cleanup + Scope Reduction | Ready to execute |
| 29 | Spotify Full Integration ⭐ | Planned |
| 30 | Spotify UI Polish + Service Preference + Artist Claim Form | Planned |
| 🚀 | **SHIP v1.5 after Phase 30** | — |

## Next Steps
1. **Fix binary launch issue** (see options above) and run screenshot script
2. **Review screenshots** in `press-screenshots/v2/`
3. **Start Phase 28** — run `/gsd:execute-phase 28`

## Helper Scripts (in pipeline/)
- `pipeline/import-tags-only.mjs` — re-imports tags without full pipeline re-run
- `pipeline/query-live-db.cjs` — queries live AppData DB
- `pipeline/find-screenshot-artists.cjs` — finds NICHE artists by score
- `pipeline/find-filter-combos.cjs` — checks filter combo result counts
- `pipeline/check-db.cjs` — checks pipeline dev DB
