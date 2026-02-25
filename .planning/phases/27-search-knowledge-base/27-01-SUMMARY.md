---
phase: 27-search-knowledge-base
plan: 01
subsystem: database
tags: [sqlite, fts5, typescript, search, autocomplete, intent-parsing]

# Dependency graph
requires:
  - phase: 23-design-system
    provides: "Design system tokens and layout — no direct dependency but prerequisite for UI that consumes these queries"
provides:
  - "SearchIntent interface and parseSearchIntent() — natural language intent parser for city/label search"
  - "searchArtistsAutocomplete() — FTS5 prefix search for dropdown autocomplete"
  - "searchByCity() — searches artist_tags and country column for city/country matches"
  - "searchByLabel() — searches artist_tags via LIKE for label name matching"
  - "ArtistResult.match_type optional field — badge rendering signal for search page"
affects:
  - 27-02 (SearchBar autocomplete dropdown)
  - 27-03 (search page intent routing)
  - future search features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL column alias as literal string ('city' AS match_type) to carry result metadata without post-query transform"
    - "Dual-path city search: ISO country code match on artists.country + artist_tags LIKE for city-level queries"
    - "FTS5 prefix wildcard (sanitized + '*') with CASE ordering for prefix-first ranking in autocomplete"

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "match_type returned as SQL literal string ('city' AS match_type) — avoids post-query transform, flows directly to ArtistResult"
  - "City search uses dual-path: ISO code on artists.country for country-level + artist_tags for city-level (MusicBrainz encodes cities as tags)"
  - "parseSearchIntent entity is not lowercased — left as-is for display, callers normalize for DB queries"
  - "Autocomplete limit defaults to 5 — compact dropdown that doesn't overwhelm the search field"

patterns-established:
  - "Intent parser pattern: regex match on trimmed query, return typed object with raw + entity"
  - "Match type badge pattern: SQL literal alias in SELECT propagates through ArtistResult.match_type to UI"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03, SRCH-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 27 Plan 01: Search Query Functions Summary

**FTS5 autocomplete query + city/label search functions + natural language intent parser added to queries.ts**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T08:55:28Z
- **Completed:** 2026-02-25T08:57:20Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `parseSearchIntent()` detects city intent ("from Berlin", "artists in Tokyo") and label intent ("on Warp", "label Ninja Tune") from raw search queries, returning a typed `SearchIntent` object
- `searchArtistsAutocomplete()` provides fast FTS5 prefix search with prefix-first ordering — foundation for the typeahead dropdown in Plan 02
- `searchByCity()` and `searchByLabel()` provide dedicated search paths for the intent-routed search page in Plan 03
- `ArtistResult.match_type` optional field enables badge rendering ("via city", "via label") without changing any existing callers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SearchIntent type, parseSearchIntent, and match_type field** - `7c34869` (feat)
2. **Task 2: Add searchArtistsAutocomplete, searchByCity, searchByLabel** - `d472f47` (feat)

**Plan metadata:** (included in docs commit after SUMMARY)

## Files Created/Modified

- `src/lib/db/queries.ts` - Added SearchIntent interface, parseSearchIntent(), searchArtistsAutocomplete(), searchByCity(), searchByLabel(), and match_type field on ArtistResult

## Decisions Made

- **match_type as SQL literal:** `'city' AS match_type` in the SELECT clause returns a static string as a column — SQLite propagates it through to TypeScript as `ArtistResult.match_type` without any post-query transform. Clean and zero overhead.
- **Dual-path city search:** The `artists.country` column stores ISO codes (e.g. "DE", "GB"), so country-level queries like "artists from Germany" won't match "Germany" directly. Dual path: exact match on country code + `artist_tags` LIKE for city names (MusicBrainz encodes city associations as tags on artists). Best available strategy given the schema.
- **parseSearchIntent entity not lowercased:** The intent parser returns entity as typed — callers that pass to DB queries do their own `toLowerCase().trim()`. This keeps the intent object usable for display (showing "Berlin" not "berlin") without requiring a separate field.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four functions are exported from `src/lib/db/queries.ts` and ready to import
- Plan 02 (SearchBar autocomplete) can now import `searchArtistsAutocomplete`
- Plan 03 (search page intent routing) can import `parseSearchIntent`, `searchByCity`, `searchByLabel`
- Blocker from STATE.md ("city/label search requires FTS5 schema changes") resolved — no schema changes needed; existing `artist_tags` table is sufficient for city/label matching

---
*Phase: 27-search-knowledge-base*
*Completed: 2026-02-25*
