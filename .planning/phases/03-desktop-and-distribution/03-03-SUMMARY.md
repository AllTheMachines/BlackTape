---
phase: 03-desktop-and-distribution
plan: 03
subsystem: ui, database
tags: [sveltekit, tauri, platform-detection, universal-load, musicbrainz, sqlite]

# Dependency graph
requires:
  - phase: 03-01
    provides: DbProvider interface, queries.ts with searchArtists/searchByTag/getArtistBySlug
  - phase: 03-02
    provides: Tauri scaffolding with adapter-static, TauriProvider, build:desktop script
provides:
  - Platform detection utility (isTauri) via __TAURI_INTERNALS__
  - Universal search load function (web passthrough + Tauri local DB)
  - Universal artist load function (web passthrough + Tauri local DB + MusicBrainz + Wikipedia)
affects: [04-data-pipeline-v2, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [universal-load-function, platform-detection, dynamic-import-isolation, graceful-degradation]

key-files:
  created:
    - src/lib/platform.ts
    - src/routes/search/+page.ts
    - src/routes/artist/[slug]/+page.ts
  modified: []

key-decisions:
  - "isTauri() uses window.__TAURI_INTERNALS__ check instead of importing from @tauri-apps/api/core -- avoids pulling Tauri API into web bundle at module level"
  - "Universal +page.ts coexists with +page.server.ts -- web SSR path returns data unchanged, Tauri path queries local DB"
  - "Dynamic imports for all Tauri-path dependencies (provider, queries, categorize, bio) -- tree-shaken out of web bundle"
  - "Artist page external fetches (links, releases, bio) each in independent try/catch -- individual fetch failures do not cascade"
  - "Release data fetched directly from MusicBrainz in Tauri context (no internal API proxy) -- matches ReleaseGroup type with links array"

patterns-established:
  - "Universal load pattern: +page.ts checks isTauri(), returns server data or queries locally"
  - "Dynamic import isolation: all Tauri-only imports are dynamic to prevent web build contamination"
  - "Independent graceful degradation: each external fetch wrapped separately so partial data still renders"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 3 Plan 3: Universal Load Functions Summary

**Universal +page.ts load functions for search and artist pages enabling dual web/desktop operation with platform detection via __TAURI_INTERNALS__**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T20:38:04Z
- **Completed:** 2026-02-16T20:43:31Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Platform detection utility that reliably identifies Tauri vs web context without importing @tauri-apps/api
- Search page works in both web (SSR with D1) and desktop (local SQLite) via universal load function
- Artist page works in both contexts with full external data enrichment (links, releases, bio from MusicBrainz/Wikipedia)
- All external API failures handled gracefully -- artist page renders from DB data alone if MusicBrainz/Wikipedia unreachable
- Web build completely unchanged in behavior (early return before any dynamic imports)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create platform detection and universal search load function** - `d26c5a0` (feat)
2. **Task 2: Create universal artist page load function -- DB query and data structure** - `3f80257` (feat)
3. **Task 3: Add releases and bio fetching to artist load function** - `4de1170` (feat)

## Files Created/Modified
- `src/lib/platform.ts` - Platform detection utility with isTauri() using __TAURI_INTERNALS__ window check
- `src/routes/search/+page.ts` - Universal search load: web passthrough or Tauri local DB query via getProvider()
- `src/routes/artist/[slug]/+page.ts` - Universal artist load: web passthrough or Tauri local DB + MusicBrainz links/releases + Wikipedia bio

## Decisions Made
- Used `window.__TAURI_INTERNALS__` for platform detection instead of importing from `@tauri-apps/api/core` -- the provider.ts already used the API import but for universal load functions that run in the web bundle, we need a zero-import check that doesn't pull in any Tauri packages
- Each external fetch (links, releases, bio) wrapped in independent try/catch blocks rather than one big try/catch -- this ensures a MusicBrainz timeout on releases doesn't prevent Wikipedia bio from loading
- Release fetching in Tauri context goes directly to MusicBrainz API rather than through the internal `/api/artist/[mbid]/releases` proxy -- the internal API routes use Cloudflare Cache API and platform.caches which don't exist in the Tauri context
- Used `PageLoad` type from `$types` to properly integrate with SvelteKit's type system -- initial attempt with raw `Record<string, unknown>` caused type errors in the Svelte component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type inference for universal load return**
- **Found during:** Task 1 (search load function)
- **Issue:** Initial implementation used `{ url: URL; data: Record<string, unknown> }` parameter type which caused the Svelte component to receive `unknown` types for all data properties (6 type errors)
- **Fix:** Used proper `PageLoad` type from `./$types` which gives `data` the correct `PageServerData` type, and added explicit type annotations on empty arrays (`[] as ArtistResult[]`) and nulls (`null as string | null`)
- **Files modified:** src/routes/search/+page.ts
- **Verification:** `npm run check` passes with 0 errors
- **Committed in:** d26c5a0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type fix was necessary for correctness. No scope creep.

## Issues Encountered
None beyond the type inference fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Search and artist pages now work in both web and desktop contexts
- Ready for 03-04 (database distribution/bundling) and 03-05 (end-to-end Tauri integration testing)
- Desktop app requires a local mercury.db file in the Tauri app data directory to function
- No rate limiting on MusicBrainz calls in Tauri context (acceptable for manual user browsing, may need attention if automated)

## Self-Check: PASSED

- All 3 created files verified present
- All 3 task commits verified in git log (d26c5a0, 3f80257, 4de1170)

---
*Phase: 03-desktop-and-distribution*
*Completed: 2026-02-16*
