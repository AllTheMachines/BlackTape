# Work Handoff - 2026-02-25

## Current Task
Fix remaining 2 open UAT issues: #4 (Discover grid) and #8 (Library cover art)

## Decisions Made This Session

### #4 — Discover page: drop thumbnails, use compact list
Steve's call: the large square placeholder grid looks broken because it promises images and never delivers. Switch to a **compact list layout** — name, tags, country, uniqueness bar — no image thumbnails. Looks intentional, loads instantly. Images are a future data pipeline concern.

**What to change:**
- `src/lib/components/ArtistCard.svelte` — remove `.a-art` div (the initials square), tighten layout to a compact list row
- May need CSS changes in the Discover page grid to switch from grid to list layout (`src/routes/discover/+page.svelte`)

### #8 — Library cover art: Rust feature, full implementation
Steve said "yes do it". Plan:
1. **`src-tauri/src/scanner/metadata.rs`** — during scan, read first embedded artwork (ID3v2 `APIC` tag / FLAC `METADATA_BLOCK_PICTURE`), write to a cache file in app data dir keyed by `{artist}-{album}.jpg` (or hash)
2. **`src-tauri/src/mercury_db.rs`** — add `cover_art_path TEXT` column to `library_albums` (or however albums are stored) — check actual schema first
3. **`src-tauri/src/lib.rs`** — register a `get_album_art` command or use `convertFileSrc` on the cache path; alternatively store small images as base64 in DB (simpler, no file management)
4. **`src/lib/components/LibraryBrowser.svelte`** — display `<img>` from the art path/base64 instead of the initials `{getInitials()}` div

**Key decision to make before coding:** cache file vs. base64 in DB
- **Cache file** (app data dir): cleaner for large art, needs path management, needs custom protocol or `convertFileSrc`
- **Base64 in DB**: simpler plumbing (no files to manage), works directly in `<img src="data:image/jpeg;base64,...">`, slightly larger DB but fine for 256x256 thumbnails
- **Recommendation:** base64, stored as TEXT in DB, max 256×256 resize during scan. Avoids file management complexity entirely.

## Relevant Files

### #4 (Discover compact list)
- `src/lib/components/ArtistCard.svelte` — remove `.a-art` square, style as list row
- `src/routes/discover/+page.svelte` — likely needs grid → list CSS change
- Check other pages that use `ArtistCard` (Crate Dig, Time Machine, Scenes) — they may want the same treatment or may keep cards

### #8 (Library cover art)
- `src-tauri/src/scanner/metadata.rs` — add artwork extraction during scan
- `src-tauri/src/mercury_db.rs` — schema: check `library_tracks` / `library_albums` table structure, add cover art column
- `src-tauri/src/lib.rs` — no new command needed if using base64 in DB
- `src/lib/components/LibraryBrowser.svelte` — display art instead of initials

## Current State
- All other UAT issues closed (11/14). 164/164 tests passing.
- No uncommitted changes.
- Branch: main

## Next Steps
1. Fix #4 first (smaller change)
2. Then #8 (Rust work — read existing scanner/DB schema before touching anything)
3. Run `npm run check` after #4
4. Run `npm run check` + `cargo test` after #8
5. Close both GitHub issues

## Resume Command
After `/clear`, run `/resume` to continue.
