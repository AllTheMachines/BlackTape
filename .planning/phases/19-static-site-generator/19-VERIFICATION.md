---
phase: 19-static-site-generator
verified: 2026-02-24T16:30:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Open artist page in Tauri app, click Export site button"
    expected: "SiteGenDialog modal appears with artist name, release count, tag count, bio availability"
    why_human: "Requires running Tauri desktop app — UI modal display cannot be headlessly tested"
  - test: "In SiteGenDialog confirming state, click Export site — OS folder picker opens"
    expected: "Native OS folder picker dialog appears (not a web dialog)"
    why_human: "Requires running Tauri desktop app with OS dialog interaction"
  - test: "Select a folder — generation runs, cover art downloads, index.html written to disk"
    expected: "Success state shows output_dir path and cover count; artist-slug subfolder with index.html and covers/ directory exists on disk"
    why_human: "Requires running Tauri app + actual filesystem write + network access to Cover Art Archive"
  - test: "Click Open folder in success state"
    expected: "OS file explorer opens to the output directory"
    why_human: "Requires running Tauri app + OS process spawn (explorer.exe/open/xdg-open)"
  - test: "Open generated index.html in a non-Chromium browser (Firefox, Safari)"
    expected: "Page renders correctly with dark theme, no OKLCH color errors, releases grid visible"
    why_human: "Cross-browser rendering of generated site cannot be verified headlessly"
---

# Phase 19: Static Site Generator Verification Report

**Phase Goal:** Users can export an artist page as a complete, self-contained static website (HTML + cover art images) to any folder on their machine.
**Verified:** 2026-02-24
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths derived from plan frontmatter `must_haves` across all three plans.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Rust `generate_artist_site` command compiles and exists in codebase | VERIFIED | `src-tauri/src/site_gen.rs` line 530 — `pub async fn generate_artist_site(...)`. All 6 commits confirmed in git log. |
| 2 | Cover art is downloaded best-effort — missing covers do not abort generation | VERIFIED | `download_cover()` returns `bool`; caller loop inserts MBID to `HashSet` only on `true`. Failed downloads fall through to SVG placeholder. Generation continues regardless. |
| 3 | Generated HTML has all user text passed through `html_escape()` — XSS not possible | VERIFIED | `name`, `bio`, `tags`, `country`, `type`, release `title`, `year` all call `html_escape()` before format interpolation. 5 unit tests confirm `<script>`, `&`, `"`, `'`, `<>` all escaped. URLs in `href=` attrs are not escaped (correct). |
| 4 | Generated HTML has zero external dependencies (no CDN links, no external fonts) | VERIFIED | Grep found no `cdn.`, `fonts.googleapis.com`, or `<script src=`. Unit test `build_html_no_external_dependencies` asserts all three. Inline CSS only, no `<link>` tags. |
| 5 | Output folder named from `artist.slug` — filesystem-safe | VERIFIED | `PathBuf::from(&output_dir).join(&artist.slug)` — slug comes from DB, already lowercase hyphenated. |
| 6 | `SiteGenDialog.svelte` exists with full 5-state machine | VERIFIED | File exists at 387 lines. States `confirming`, `picking`, `generating`, `success`, `error` all present with template branches. |
| 7 | Dialog shows preview before picker opens (artist name, release count, tag count) | VERIFIED | `confirming` state renders `{artist.name}`, `{releases.length}` releases, `{tagList.length}` tags, `{bio ? 'included' : 'not available'}` |
| 8 | Generation triggers `generate_artist_site` Rust command with full artist payload | VERIFIED | `invoke<...>('generate_artist_site', { outputDir: selected, artist: artistPayload })` at line 81-84. `artistPayload` maps all releases with `cover_art_url` (snake_case). |
| 9 | Success state shows `output_dir` and `cover_count` with Open folder button | VERIFIED | `data-testid="site-gen-success"` div shows `generationResult?.output_dir` and `generationResult?.cover_count`. "Open folder" button calls `handleOpenFolder()` via `invoke('open_in_explorer', ...)`. |
| 10 | `generate_artist_site` and `open_in_explorer` registered in `lib.rs` invoke_handler | VERIFIED | Lines 175-176 of `lib.rs` — `site_gen::generate_artist_site,` and `site_gen::open_in_explorer,` inside `tauri::generate_handler![...]`. |
| 11 | Artist page has Export site button visible in Tauri mode only | VERIFIED | `{#if tauriMode}` guard at line 284 wraps `<button class="export-site-btn" data-testid="export-site-btn">Export site</button>`. |
| 12 | Test manifest has Phase 19 entries and all pass | VERIFIED | `PHASE_19` array with 12 entries (P19-01 through P19-12) in `manifest.mjs`. Test suite run: 11/11 code checks pass, P19-12 correctly skipped. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/site_gen.rs` | generate_artist_site command, open_in_explorer command, ArtistSitePayload structs, html generation | VERIFIED | 803 lines. All 4 exports present. 18 unit tests covering XSS, hex colors, external deps, placeholder logic. |
| `src-tauri/capabilities/default.json` | `dialog:allow-save` permission | VERIFIED | Line 16 — `"dialog:allow-save"` present immediately after `"dialog:allow-open"`. |
| `src/lib/components/SiteGenDialog.svelte` | 5-state machine dialog, min 100 lines | VERIFIED | 387 lines. All 5 states implemented. All 4 `data-testid` attributes present. |
| `src-tauri/src/lib.rs` | `mod site_gen` declaration + commands in invoke_handler | VERIFIED | Line 5 `mod site_gen;`. Lines 175-176 register both commands. |
| `src/routes/artist/[slug]/+page.svelte` | Export site button + SiteGenDialog conditional render | VERIFIED | `SiteGenDialog` imported (line 12), `showSiteGen = $state(false)` (line 26), button (lines 285-293), dialog render (lines 552-559). |
| `tools/test-suite/manifest.mjs` | PHASE_19 test entries exported in ALL_TESTS | VERIFIED | Lines 1259-1334 define `PHASE_19`. Line 1368 `...PHASE_19,` in `ALL_TESTS`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `site_gen.rs` | `covers/{mbid}.jpg` | `reqwest::get()` download loop | VERIFIED | `download_cover(url, &dest).await` at line 545; `dest = covers_path.join(format!("{}.jpg", release.mbid))` |
| `site_gen.rs` | `index.html` | `build_html()` format! call | VERIFIED | `let html = build_html(&artist, &downloaded_mbids)` then `std::fs::write(out_path.join("index.html"), html.as_bytes())` |
| `build_html` | `html_escape` | every text field | VERIFIED | `name`, `bio`, `tags` pills, `country`, `type`, release `title`, `year` all call `html_escape()`. URLs in `href=` correctly not escaped. |
| `SiteGenDialog.svelte` | `generate_artist_site` Rust command | `invoke('generate_artist_site', ...)` | VERIFIED | Line 82-84; camelCase props mapped to snake_case payload matching Rust struct. |
| `SiteGenDialog.svelte` | `@tauri-apps/plugin-dialog` | `open({ directory: true, multiple: false })` | VERIFIED | Line 49; lazy-imported inside `handleConfirm()`. |
| `SiteGenDialog.svelte` | `open_in_explorer` Rust command | `invoke('open_in_explorer', { path })` | VERIFIED | Line 97; called inside `handleOpenFolder()` with `.catch(() => {})` (intentional fire-and-forget). |
| `lib.rs` | `site_gen.rs` | `mod site_gen` declaration | VERIFIED | Line 5 of `lib.rs` — `mod site_gen;` alongside `mod ai;`, `mod library;`, `mod mercury_db;`, `mod scanner;`. |
| `+page.svelte` | `SiteGenDialog.svelte` | `import SiteGenDialog` | VERIFIED | Line 12 — static import. Rendered at lines 552-559 with correct props: `artist={data.artist}`, `releases={data.releases}`, `bio={effectiveBio}`, `onclose`. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| SITE-01 | 19-01, 19-02, 19-03 | User can generate a self-contained HTML/CSS artist page for any artist and export it to a user-selected local directory | SATISFIED | `generate_artist_site` creates `output_dir/{slug}/index.html`. OS folder picker via `plugin-dialog`. Wired through SiteGenDialog confirm flow. |
| SITE-02 | 19-01, 19-02 | Generated site includes artist bio, top tags, discography with release covers, and platform buy/stream links | SATISFIED | `build_html()` renders bio, `build_tags_html()` renders tags, `build_releases_html()` renders covers + platform links. All passed to Rust via `artistPayload`. |
| SITE-03 | 19-01 | Generated site has zero runtime dependency on Mercury, external APIs, or any hosted service for basic display | SATISFIED | Inline CSS only (no external fonts/CDN). Cover images downloaded locally into `covers/` subfolder at generation time. Footer link to GitHub is informational only, not required for rendering. |
| SITE-04 | 19-01 | Generated HTML is sanitized — artist names and bios with special characters or markup cannot inject scripts | SATISFIED | `html_escape()` applied to all user text before `format!()` interpolation. 5 unit tests verify `<`, `>`, `&`, `"`, `'` escape. XSS unit test `build_html_no_xss_in_name` and `build_html_no_xss_in_bio` confirm `<script>` tags cannot appear in output. |

All 4 requirement IDs (SITE-01, SITE-02, SITE-03, SITE-04) are accounted for across plans 01-03. No orphaned requirements found in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SiteGenDialog.svelte` | 97 | `.catch(() => {})` on `open_in_explorer` invoke | Info | Intentional fire-and-forget — opening OS file explorer has no meaningful error recovery path. Not a stub. |

No blockers found. No TODO/FIXME/placeholder comments in new code. No empty implementations.

### Human Verification Required

#### 1. Export site button appears in Tauri mode

**Test:** Run the Mercury desktop app, open any artist page, look for "Export site" button in the header action row.
**Expected:** Button appears alongside the Mastodon share link. Button is absent in web/browser mode.
**Why human:** Requires running Tauri desktop app — button visibility is gated by `{#if tauriMode}` runtime state.

#### 2. Folder picker dialog opens on confirm

**Test:** Click "Export site" → dialog appears with preview → click "Export site" confirm button.
**Expected:** Native OS folder picker opens (Windows Explorer folder browser on Windows).
**Why human:** Requires running Tauri app with OS dialog interaction. Cannot be headlessly tested.

#### 3. Full export to disk with cover art

**Test:** Select a folder → wait for generation.
**Expected:** Success state shows output path and cover count. On disk: `{selected_folder}/{artist-slug}/index.html` exists and `covers/` contains `.jpg` files for downloaded releases.
**Why human:** Requires running Tauri app + filesystem writes + live network access to Cover Art Archive.

#### 4. Open folder reveals output in OS explorer

**Test:** In success state, click "Open folder".
**Expected:** OS file explorer (Windows Explorer on Windows) opens to the artist-slug output folder.
**Why human:** Requires running Tauri app and OS process spawn.

#### 5. Generated HTML cross-browser rendering

**Test:** Open `index.html` in Firefox or Safari.
**Expected:** Dark theme renders correctly, no color errors (all hex/RGB, no OKLCH), release grid shows 2 columns on desktop, cover images or SVG placeholders display correctly.
**Why human:** Cross-browser rendering validation requires human inspection.

### Gaps Summary

No gaps. All automated checks passed. The full pipeline from user click to disk-written self-contained site is wired and substantiated. Five human-only items remain (UI interactions requiring the running desktop app) but these are not blockers — automated evidence covers all structural claims.

---

_Verified: 2026-02-24_
_Verifier: Claude (gsd-verifier)_
