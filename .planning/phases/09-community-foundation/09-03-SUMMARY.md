---
phase: 09-community-foundation
plan: 03
subsystem: ui
tags: [svelte5, typescript, tauri, collections, import, spotify, lastfm, apple-music, csv, export]

# Dependency graph
requires:
  - phase: 09-community-foundation
    plan: 01
    provides: taste.db collections/collection_items tables + 14 Tauri commands (get_collections, add_collection_item, remove_collection_item, is_in_collection, get_all_collection_items, write_json_to_path, etc.)
provides:
  - collectionsState reactive $state module (collections.svelte.ts)
  - loadCollections/createCollection/deleteCollection/renameCollection/getCollectionItems/addToCollection/removeFromCollection/isInAnyCollection
  - Spotify PKCE OAuth import (tauri-plugin-oauth + user-provided Client ID)
  - Last.fm paginated scrobble import (username + API key, max 50 pages)
  - Apple Music MusicKit JS import (user-provided Developer Token)
  - CSV import with Artist column detection
  - exportAllUserData() full-data JSON export via write_json_to_path
  - CollectionShelf.svelte item grid with remove button
affects:
  - 09-04 (profile page UI — will use collectionsState + CollectionShelf)
  - 09-05 (artist match import flow — uses import modules + match_artists_batch)
  - 09-06 (fingerprint export UI — uses exportAllUserData())

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "collections.svelte.ts uses .svelte.ts extension for $state rune — same as profile.svelte.ts"
    - "import modules use dynamic imports for Tauri isolation (same pattern as history.ts/favorites.ts)"
    - "exportAllUserData() uses Promise.all for parallel data collection before single JSON write"
    - "CollectionShelf loads items on onMount via getCollectionItems() — async component init"

key-files:
  created:
    - src/lib/taste/collections.svelte.ts
    - src/lib/taste/import/spotify.ts
    - src/lib/taste/import/lastfm.ts
    - src/lib/taste/import/apple.ts
    - src/lib/taste/import/csv.ts
    - src/lib/taste/import/index.ts
    - src/lib/components/CollectionShelf.svelte
  modified: []

key-decisions:
  - "Spotify PKCE OAuth requires tauri-plugin-oauth localhost server — Spotify does not accept custom URI scheme redirects; user must provide their own Client ID (open-source UX friction, documented in code)"
  - "Last.fm import capped at 50 pages (10k tracks) — users with 100k+ scrobbles use CSV export path instead"
  - "Apple Music requires user-provided Developer Token — MusicKit JS loaded lazily (same pattern as Leaflet in Phase 7)"
  - "exportAllUserData() uses write_json_to_path (Plan 01's general-purpose command) — NOT export_play_history_to_path which has different signature"
  - "CollectionShelf href corrected: uses 'release' for release type (plan template had 'artist' for both types — auto-fixed)"

patterns-established:
  - "Import modules barrel pattern: each module exports typed interface + primary async function; index.ts re-exports types for consumers"
  - "All import functions use dynamic imports for Tauri deps — safe to call from web (will throw, caller handles)"

requirements-completed: [SOCIAL-01, SOCIAL-02, SOCIAL-04, COMM-01, COMM-02]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 09 Plan 03: Collections + Import Modules Summary

**collectionsState $state module, four music service import flows (Spotify PKCE/Last.fm/Apple MusicKit/CSV), full-data JSON export, and CollectionShelf grid component**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T22:07:24Z
- **Completed:** 2026-02-22T22:11:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- collections.svelte.ts reactive state module with full CRUD wrappers — the curation backbone for Phase 9
- Four import flows: Spotify PKCE OAuth, Last.fm paginated scrobbles, Apple MusicKit JS, CSV with Artist column detection
- exportAllUserData() collects all user data via Promise.all and writes via invoke('write_json_to_path') with web blob fallback
- CollectionShelf renders named collection items in a grid with remove buttons, zero vanity metrics

## Task Commits

Each task was committed atomically:

1. **Task 1: Create collections.svelte.ts reactive state module** - `553d4b7` (feat)
2. **Task 2: Create import modules, export function, and CollectionShelf component** - `e77ffc8` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/taste/collections.svelte.ts` - collectionsState $state + loadCollections + full CRUD wrappers
- `src/lib/taste/import/spotify.ts` - PKCE OAuth via tauri-plugin-oauth, top 50 artists
- `src/lib/taste/import/lastfm.ts` - Paginated scrobble import, aggregates play count by artist
- `src/lib/taste/import/apple.ts` - MusicKit JS lazy-loaded, returns saved library artists
- `src/lib/taste/import/csv.ts` - parseCsvArtists() + readFileAsText(), zero dependencies
- `src/lib/taste/import/index.ts` - exportAllUserData() + type re-exports for consumers
- `src/lib/components/CollectionShelf.svelte` - Item grid with type badge + remove button

## Decisions Made
- **Spotify Client ID is user-provided:** Open-source apps cannot embed a Client ID — users must register at developer.spotify.com. This is documented in the module as "known UX friction."
- **Last.fm capped at 50 pages:** Users with 100k+ scrobbles can use CSV export instead; uncapped pagination would take minutes.
- **write_json_to_path confirmed:** exportAllUserData() uses the Plan 01 general-purpose command, not export_play_history_to_path (different signature).
- **CollectionShelf href fix:** Plan template had `'artist'` for both item types in the href. Corrected to use `'release'` for release items.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect href routing in CollectionShelf**
- **Found during:** Task 2 (create CollectionShelf.svelte)
- **Issue:** The plan's template used `'artist'` for both artist and release item types in the href: `/{item.item_type === 'artist' ? 'artist' : 'artist'}/${item.item_slug}` — this would always route to `/artist/...` even for releases
- **Fix:** Corrected to `/{item.item_type === 'artist' ? 'artist' : 'release'}/${item.item_slug}`
- **Files modified:** src/lib/components/CollectionShelf.svelte
- **Verification:** Template renders correct routes for both types
- **Committed in:** e77ffc8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor routing bug fix. No scope creep.

## Issues Encountered

**Pre-existing error in avatar.ts (out of scope):** `src/lib/identity/avatar.ts` has a TypeScript error from Plan 02 WIP: `Module '"@dicebear/pixel-art"' has no exported member 'pixelArt'`. This was present before Plan 03 execution. Our 7 new files introduced 0 new TypeScript errors. Logged to `deferred-items.md` for Plan 02 resolution.

## User Setup Required
None for this plan. However, import modules require user-side setup before use:
- **Spotify:** User registers app at developer.spotify.com, provides Client ID in Mercury UI
- **Last.fm:** User creates API key at last.fm/api, provides it in Mercury UI
- **Apple Music:** User generates MusicKit Developer Token via Apple Developer portal

These are user actions, not developer environment setup.

## Next Phase Readiness
- collectionsState ready for Plan 04 (profile page UI — CollectionShelf display, collection management UI)
- Import modules ready for Plan 05 (import flow UI — will use importFromSpotify/importFromLastFm/etc. + match_artists_batch for catalog matching)
- exportAllUserData() ready for Plan 06 (fingerprint/data export UI)
- No blockers for Plan 04.

## Self-Check

**Files exist:**
- src/lib/taste/collections.svelte.ts — FOUND
- src/lib/taste/import/spotify.ts — FOUND
- src/lib/taste/import/lastfm.ts — FOUND
- src/lib/taste/import/apple.ts — FOUND
- src/lib/taste/import/csv.ts — FOUND
- src/lib/taste/import/index.ts — FOUND
- src/lib/components/CollectionShelf.svelte — FOUND
- .planning/phases/09-community-foundation/09-03-SUMMARY.md — FOUND

**Commits exist:**
- 553d4b7 — Task 1 (collections.svelte.ts reactive state module)
- e77ffc8 — Task 2 (import modules + CollectionShelf)

## Self-Check: PASSED

---
*Phase: 09-community-foundation*
*Completed: 2026-02-22*
