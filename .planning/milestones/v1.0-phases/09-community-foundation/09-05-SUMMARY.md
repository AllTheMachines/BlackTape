---
phase: 09-community-foundation
plan: 05
subsystem: community-ui
tags: [collections, shelves, settings, identity, import, export, tauri]
dependency_graph:
  requires: [09-01, 09-03]
  provides: [save-to-shelf-ui, settings-identity, settings-import, settings-export]
  affects: [artist-page, release-page, settings-page]
tech_stack:
  added: []
  patterns:
    - save-to-shelf dropdown with inline shelf creation
    - session-only credential state for OAuth tokens
    - match_artists_batch for cross-service artist matching
    - lazy dynamic import of collections module in Tauri onMount
key_files:
  created: []
  modified:
    - src/routes/artist/[slug]/+page.svelte
    - src/routes/artist/[slug]/release/[mbid]/+page.svelte
    - src/routes/settings/+page.svelte
decisions:
  - shelfCollections local $state mirrors collectionsState.collections after load — avoids reactive reference issues with dynamic import
  - tauriMode $state added to artist page (was previously using isTauri() inline only in onMount)
  - onMount in artist page restructured as single async IIFE — collections + AI bio in same Tauri block
  - parseCsvArtists handles any CSV with "Artist" column header (case-insensitive) — compatible with Last.fm/Spotify data downloads
  - match_artists_batch fallback returns clear error message if invoke fails (not available or throws)
  - avatarModeLocal cast restricted to 'generative' | 'edited' — 'preset' mode not exposed in settings UI
metrics:
  duration: 5min
  completed_date: 2026-02-22
  tasks_completed: 2
  files_modified: 3
---

# Phase 09 Plan 05: Collections UI + Settings Expansion Summary

Save-to-Shelf buttons wired onto artist and release discovery pages, with inline shelf creation. Settings page expanded with Identity (handle + avatar mode), Import Listening History (four platform cards with match-and-import), and Export (full data JSON dump).

## Tasks Completed

### Task 1: Save to Shelf buttons on artist and release pages

**Artist page (`src/routes/artist/[slug]/+page.svelte`):**
- Added `tauriMode`, `savedInCollections`, `showSaveDropdown`, `newShelfNameArtist`, `shelfCollections` state variables
- Restructured `onMount` as single async IIFE: loads collections first, then runs AI bio fallback
- `loadCollections()` + `isInAnyCollection('artist', data.artist.mbid)` called on mount in Tauri block
- Save to Shelf button placed in `artist-name-row` after FavoriteButton, wrapped in `{#if tauriMode}`
- Dropdown lists all user shelves with checkmark for already-saved collections
- Inline "New shelf..." input — Enter creates collection via `createCollection()` and immediately adds artist
- Button shows "✓ Saved" with accent border when `savedInCollections.length > 0`

**Release page (`src/routes/artist/[slug]/release/[mbid]/+page.svelte`):**
- Added `onMount` import and same state variables
- Collections loaded with `isInAnyCollection('release', data.mbid)`
- Save to Shelf button placed inside `action-rows` div, below `<BuyOnBar>`, wrapped in `{#if tauriMode}`
- `addToCollection` uses `data.mbid` as itemMbid, `release?.title ?? data.mbid` as name, `data.slug` as slug
- Inline new-shelf creation identical to artist page pattern

**CSS** (identical in both pages): `.save-shelf-wrapper`, `.save-shelf-btn`, `.save-shelf-btn.saved`, `.shelf-dropdown`, `.shelf-option`, `.shelf-option.in-collection`, `.new-shelf-inline`, `.new-shelf-input-sm`

**Verification:** `npm run check` — 0 errors. "Save to Shelf" found in both pages. Both buttons wrapped in `{#if tauriMode}`. `isInAnyCollection` called on mount.

---

### Task 2: Settings page Identity, Import, and Export sections

**Identity section:**
- Handle input bound to `identityHandle` state — saves on blur via `invoke('set_identity_value', { key: 'handle', value })`
- Avatar mode toggle buttons (Generative / Custom) call `saveAvatarMode()` from `$lib/identity/avatar`
- Link to `/profile` page
- `onMount` loads `identityHandle` via `get_identity_value` + `loadAvatarState()` for initial avatar mode

**Import Listening History section:**
- **Spotify card**: Client ID text input, "Import from Spotify" button calls `importFromSpotify(clientId)`, status line
- **Last.fm card**: Username + API key inputs, progress callback updates status line per page ("Fetching page N / M...")
- **Apple Music card**: Developer Token input, "Advanced" badge, calls `importFromAppleMusic(developerToken)`
- **CSV card**: File input (`.csv`), `parseCsvArtists()` extracts Artist column, calls `matchAndImport()`
- `matchAndImport()` helper: calls `invoke('match_artists_batch', { names })`, creates "Imported from [Platform]" collection, adds matched artists — returns "Matched N / M artists" summary string
- **All credentials are session-only `$state`** — no `invoke('set_identity_value')` for tokens/keys

**Your Data section:**
- "Export All Data" button calls `exportAllUserData()` from `$lib/taste/import/index`
- Brief explanation of what is exported
- `exportStatus` state shows progress/completion

**CSS added:** `.text-input`, `.btn-group`, `.btn-toggle`, `.btn-toggle.active`, `.profile-link`, `.import-card`, `.import-card-header`, `.import-platform`, `.badge-advanced`, `.import-card-desc`, `.import-card-fields`, `.import-card-actions`, `.import-btn`, `.import-file-label`, `.import-file-input`, `.import-status`, `.export-row`, `.export-btn`

**Verification:** `npm run check` — 0 errors. All four import functions found. `exportAllUserData` found. Identity section found. No vanity metrics added.

---

## npm run check + build results

- `npm run check`: 0 errors, 6 pre-existing warnings (crate/kb/time-machine pages — out of scope)
- `npm run build`: succeeded, exit 0

## Import placement

Artist page: Save to Shelf button in `artist-name-row` div — inline alongside `UniquenessScore` and `FavoriteButton`. Correct placement: part of artist identity block, visible without scrolling.

Release page: Save to Shelf button inside `action-rows` div below `<BuyOnBar>`. Correct placement: grouped with other action items in the hero panel.

## Import status feedback

Each import card has a `{#if status}` status line displayed inline below the button using `.import-status` (italic, secondary text). Status updates synchronously during the async flow:
- Spotify: "Connecting to Spotify..." → "Matching artists..." → "Matched N / M artists..."
- Last.fm: "Fetching scrobbles..." → "Fetching page N / M..." → "Matching artists..." → result
- Apple Music: "Authorizing with Apple Music..." → "Matching artists..." → result
- CSV: "Reading file..." → "Parsed N artists — matching..." → result

## match_artists_batch availability

`match_artists_batch` is a Rust command added in Plan 01 (lib.rs free function). Called via `invoke('match_artists_batch', { names: string[] })`. Returns `MatchResult[]` with `{ name, mbid, slug }`. If the invoke throws (e.g., command not available), `matchAndImport()` returns a descriptive error string rather than crashing. No fallback re-implementation — the Rust command is the canonical matching path.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | cc48e9d | feat(09-05): add Save to Shelf buttons on artist and release pages |
| 2 | 4e624d6 | feat(09-05): expand Settings page with Identity, Import, and Export sections |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Artist page onMount restructured from early-return to single async IIFE**
- **Found during:** Task 1
- **Issue:** Original onMount did `if (data.bio) return; if (!isTauri()) return;` — adding collections loading in Tauri block required restructuring. Early return on `data.bio` would have prevented collections from loading when a bio existed.
- **Fix:** Consolidated into single `if (!tauriMode) return;` guard with async IIFE. AI bio block is now conditional inside the IIFE (`if (!data.bio) { ... }`). Same behavior, correct structure.
- **Files modified:** `src/routes/artist/[slug]/+page.svelte`
- **Commit:** cc48e9d

**2. [Rule 2 - Missing] Added `shelfCollections` local state mirror**
- **Found during:** Task 1
- **Issue:** Plan referenced `collectionsState.collections` directly in template. `collectionsState` is loaded via dynamic import inside onMount — cannot be referenced directly in template without importing at module level (which would break web build).
- **Fix:** Added `shelfCollections = $state<Array<{ id: string; name: string }>>([])` as a local mirror, assigned from `collectionsState.collections` after load. Updated after `createCollection()` inline.
- **Files modified:** Both artist and release pages
- **Commit:** cc48e9d

**3. [Rule 2 - Missing] avatarModeLocal type restricted to 'generative' | 'edited'**
- **Found during:** Task 2
- **Issue:** `AvatarMode` type includes 'preset' but Settings UI only exposes Generative/Custom toggle. Assignment from `avatarState.mode` needed narrowing.
- **Fix:** Cast `avatarModeLocal` as `'generative' | 'edited'` with ternary: `avatarState.mode === 'edited' ? 'edited' : 'generative'`. Safe — 'preset' falls back to 'generative' display.
- **Files modified:** `src/routes/settings/+page.svelte`
- **Commit:** 4e624d6

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/routes/artist/[slug]/+page.svelte | FOUND |
| src/routes/artist/[slug]/release/[mbid]/+page.svelte | FOUND |
| src/routes/settings/+page.svelte | FOUND |
| .planning/phases/09-community-foundation/09-05-SUMMARY.md | FOUND |
| Commit cc48e9d | FOUND |
| Commit 4e624d6 | FOUND |
