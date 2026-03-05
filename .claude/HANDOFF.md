# Work Handoff - 2026-03-05

## Current Task
Album favourites — frontend wiring (Task 3 of 3)

## Context
Adding favourite albums feature. Users can already favourite artists (now fixed to be reactive). The Rust backend for `favorite_releases` is built and deployed. Need to wire up the frontend: TS functions, FavoriteButton extension for releases, heart button on release/album pages, and show in Library.

## Progress

### Completed
- **FavoriteButton reactivity fix** — changed `favorited` from `$state` + onMount read to `$derived(tasteProfile.favorites.some(...))`. Now always in sync.
- **Rust backend** — added `favorite_releases` table to taste_db.rs, CRUD functions (`add_favorite_release`, `remove_favorite_release`, `get_favorite_releases`), registered in lib.rs. Binary rebuilt successfully.
- **Library Artists tab** — favourite artists now appear as link rows (♥ badge, click → artist page). Local library artists keep their expander. Search filters both.
- **Rabbit Hole** — JSON block stripped from AI correction response before display. Email feedback uses Cloudflare Worker (same as About page feedback). MBID included in email body.
- **Discover page** — Enter key on custom tag input now works.

### In Progress
- **Task 3: Frontend album favorites wiring** — NOT started yet. Rust is ready, frontend pending.

### Remaining
1. Add `favoriteReleases` array to `tasteProfile` state in `src/lib/taste/profile.svelte.ts`
2. Add `loadFavoriteReleases`, `addFavoriteRelease`, `removeFavoriteRelease`, `isFavoriteRelease` to `src/lib/taste/favorites.ts`
3. Call `loadFavoriteReleases` in `loadTasteProfile()` in `profile.svelte.ts`
4. Extend `FavoriteButton.svelte` to accept `itemType: 'artist' | 'release'` prop (or create `FavoriteReleaseButton.svelte`)
5. Add heart button on release/album pages (`src/routes/artist/[slug]/release/[mbid]/+page.svelte` — check if exists, or on `ReleaseCard.svelte`)
6. In `LibraryBrowser.svelte` Albums tab — show favourite albums. If local files match (compare album name + artist name case-insensitive) → show normally. If not owned → show with "not in library" style.
7. For non-owned favourite albums: if `spotifyState.connected` → open Spotify, else → link to `/artist/[artist_slug]` (albums tab)

## Key Decisions
- `spotifyState.connected` (from `src/lib/spotify/state.svelte.ts`) is the check for Spotify availability
- FavoriteRelease data shape: `{ release_mbid, release_name, artist_name, artist_slug, saved_at }`
- No `release_slug` stored (not needed — artist_slug + mbid is enough for navigation)
- Library Artists tab now shows favourited artists at top as `<a href="/artist/{slug}">` rows — no expander. Local artists below with expander.
- The Rust binary was stuck because llama-server.exe was still running as a child process. Had to kill PIDs 36668 and 18328 to free DLL locks before `cargo build` could succeed.

## Relevant Files
- `src/lib/taste/profile.svelte.ts` — add `favoriteReleases` to state + load in `loadTasteProfile`
- `src/lib/taste/favorites.ts` — add release favorite functions
- `src/lib/components/FavoriteButton.svelte` — extend for releases (or create separate component)
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — add heart button here
- `src/lib/components/LibraryBrowser.svelte` — show favourite albums in Albums tab
- `src/lib/spotify/state.svelte.ts` — `spotifyState.connected` for Spotify check
- `src-tauri/src/ai/taste_db.rs` — Rust CRUD already done
- `src-tauri/src/lib.rs` — Rust commands already registered

## Git Status
Clean — all changes auto-saved. Last commit: `d9c06591` (auto-save: 5 files @ 21:16).
Modified files captured: FavoriteButton.svelte, taste_db.rs, lib.rs, LibraryBrowser.svelte, library/+page.svelte.
Earlier auto-saves captured: rabbit-hole/+layout.svelte, discover/+page.svelte, profile/+page.svelte.

## Active Tasks
- #1 [completed] Fix FavoriteButton reactivity
- #2 [completed] Add favorite_releases Rust backend
- #3 [in_progress] Frontend: album favorites wiring — NEXT TASK

## Next Steps
1. Read `src/lib/taste/profile.svelte.ts` to understand tasteProfile shape
2. Read `src/lib/taste/favorites.ts` to understand existing pattern
3. Add `favoriteReleases` to profile state + load function
4. Add release favorite functions to favorites.ts
5. Check if `src/routes/artist/[slug]/release/[mbid]/+page.svelte` exists — that's where the heart button goes
6. Wire up LibraryBrowser Albums tab to show favourites
7. Reload app: `node tools/reload.mjs`

## Resume Command
After running `/clear`, run `/resume` to continue.
