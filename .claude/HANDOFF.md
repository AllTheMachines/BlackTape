# Work Handoff - 2026-02-28

## Current Task
Release page stuck on "Loading release details…" for Radiohead — investigating / partially fixed.

## Context
Working through open GitHub issues. Fixed #50 (Discover speed) and #63 (album cover freeze) this session. After fixing #63, Steve reported the Radiohead release page still hangs on "Loading release details…". Root cause: MB rate-limiting — artist page now fires 2 parallel MB requests, and the release page immediately fires a 3rd, hitting MB's 1 req/sec limit. The fetch fails silently (no error state on page).

## Progress

### Completed This Session
- **#50 fixed & closed**: Discover page 11,000ms → 7ms via precomputed `uniqueness_score` column
- **#63 fixed & closed**: Artist page +page.ts — 3 sequential MB fetches → 2 parallel + 1 sequential, all with timeouts (8s links/releases, 5s bio). LinerNotes timeout added. Release page timeout 10s → 5s.
- **Release page error state** (a1176bb): Added `loadDone` state, error message shown when load fails, 429/503 retry with 1.2s delay.

### In Progress
- Steve is testing whether the Radiohead release now loads. The retry may or may not fix it depending on actual failure mode.

### Remaining / Uncertain
- Verify Radiohead release actually loads now (app was reloaded with latest code)
- If still broken, investigate further — could be empty `releases[]` from MB (e.g. MB returns the release group but the `release?release-group=` endpoint returns empty for some releases)
- Next issue to tackle: **#56** (Play Album button on release page) or **#51** (Discover filter tag input)

## Key Decisions
- Artist page parallel MB fetches: links + releases run via `Promise.all`, bio waits after (depends on links result for Wikipedia URL)
- `fetchSafe()` helper added to `+page.ts` — returns `Response | null`, catches all errors/aborts
- Release page retry: 429/503 → wait 1.2s → retry once. This is the most likely rate-limit fix.
- `loadDone = true` set at end of `loadRelease()` regardless of outcome — prevents infinite spinner

## Relevant Files
- `src/routes/artist/[slug]/+page.ts` — parallel MB fetches + timeouts (main fix for #63)
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — loadDone state + retry on 429/503
- `src/lib/components/LinerNotes.svelte` — 5s timeout added
- `src/lib/db/queries.ts` — getDiscoveryArtists rewritten to use uniqueness_score column
- `src-tauri/src/mercury_db.rs` — migrate_uniqueness_score() startup migration
- `pipeline/build-tag-stats.mjs` — computes uniqueness_score at pipeline build time
- `tools/compute-uniqueness.mjs` — one-time migration script for existing DBs
- `tools/debug-release.mjs` — debug script for testing MB release fetch via CDP

## Git Status
Clean except BUILD-LOG.md (needs session entry) and parachord-reference submodule.

## Debugging Context
- DB path: `C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db` (NOT com.mercury.app)
- uniqueness_score column already populated in both DBs (com.blacktape.app + com.mercury.app)
- MB API tested directly: Radiohead release fetch returns 200 in 352ms when not rate-limited
- The failure is likely: artist page fires 2 parallel MB requests → release page fires 3rd immediately → MB 429 → old code had no retry → `release` stays null → page hangs

## Next Steps
1. Confirm Radiohead release loads (Steve should test with app already reloaded)
2. If still broken, check: does MB return `releases: []` for that specific release group? Try `tools/debug-release.mjs` again while on the release page
3. Update BUILD-LOG.md with session summary
4. Move to next issue: **#56** (Play Album button — likely quick, button stub already exists in release page)

## Resume Command
After `/clear`, run `/resume` to continue.
