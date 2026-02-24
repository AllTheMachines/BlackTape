---
phase: 19-static-site-generator
plan: 01
subsystem: rust-backend
tags: [rust, tauri, html-generation, site-gen, reqwest, serde]

# Dependency graph
requires:
  - phase: 18-ai-auto-news
    provides: existing taste.db patterns, Tauri command conventions, reqwest async pattern from download.rs
provides:
  - generate_artist_site async Tauri command (Rust)
  - open_in_explorer sync Tauri command (Rust)
  - ArtistSitePayload/ReleaseSitePayload/ReleaseLinkPayload/SiteGenResult structs
  - html_escape() XSS-safe text escaping (inline, no crate)
  - download_cover() best-effort async cover art download
  - build_html() complete HTML document with inline Mercury dark theme CSS
  - dialog:allow-save capability in default.json
affects: [19-02, 19-03, future-phase-site-gen-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline html_escape() instead of html-escape crate — 5 substitutions, auditable, zero dependency"
    - "r##\"...\"## raw string for SVG with hex color attributes (avoids \"# closing r#\"...\"# delimiter)"
    - "Sequential cover downloads in loop — avoids Cover Art Archive rate-limiting"
    - "HashSet<String> downloaded_mbids — tracks successful downloads for cover vs placeholder decision"
    - "generate_artist_site and download_covers are co-located — HTML generation uses downloaded set directly"

key-files:
  created:
    - src-tauri/src/site_gen.rs
  modified:
    - src-tauri/capabilities/default.json

key-decisions:
  - "Inline html_escape() with 5-char substitutions — no crate needed, fully auditable"
  - "r##\"...\"## raw string delimiter for SVG placeholder (SVG fill=#1c1c1c contains \"# which terminates r#\"...\"#)"
  - "Sequential cover downloads (not parallel) — avoids Cover Art Archive rate-limiting per research recommendation"
  - "std::process::Command for open_in_explorer — avoids new crates and plugin-shell path-with-spaces Windows bug"
  - "Hex/RGB colors in generated CSS (not OKLCH) — generated site viewed in any browser, not just Chromium/WebView2"
  - "cover_art_url kept optional in ReleaseSitePayload — releases without covers use SVG placeholder, never abort"

patterns-established:
  - "site_gen pattern: all HTML generation in single Rust module via format!() — no template engine"
  - "Best-effort download pattern: download_cover() returns bool, caller tracks successes in HashSet"

requirements-completed: [SITE-01, SITE-02, SITE-03, SITE-04]

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 19 Plan 01: Static Site Generator — Rust Backend Summary

**Rust site_gen.rs module with html_escape(), sequential reqwest cover downloads, format!() HTML generation, and cross-platform open_in_explorer via std::process::Command — zero new crates**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-24T15:29:03Z
- **Completed:** 2026-02-24T15:35:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src-tauri/src/site_gen.rs` (803 lines) — complete Rust backend for Phase 19 static site export
- All text fields protected against XSS via inline `html_escape()` (5-char substitution, no crate)
- Generated HTML uses hex/RGB colors only (no OKLCH) — works in all browsers, not just Chromium/WebView2
- Cover art downloads are sequential and best-effort — missing covers use inline SVG placeholder, generation never aborts
- `open_in_explorer` uses `std::process::Command` — cross-platform, no new crates, avoids Windows path-with-spaces bug in plugin-shell
- Added `dialog:allow-save` to capabilities — prerequisite for save-dialog pattern in Plan 02/03

## Task Commits

Each task was committed atomically:

1. **Task 1: Create site_gen.rs with Rust HTML generation backend** - `069fb32` (feat)
2. **Task 2: Add dialog:allow-save to capabilities** - `19f8f46` (feat)

## Files Created/Modified

- `src-tauri/src/site_gen.rs` — New module: ArtistSitePayload/ReleaseSitePayload/ReleaseLinkPayload/SiteGenResult structs, html_escape(), download_cover(), build_tags_html(), build_releases_html(), build_html(), generate_artist_site command, open_in_explorer command, full unit test suite
- `src-tauri/capabilities/default.json` — Added `dialog:allow-save` after `dialog:allow-open`

## Decisions Made

- **Inline html_escape()**: 5-char inline substitution handles all XSS-relevant HTML entities. The html-escape crate adds a dependency for functionality that's trivially verifiable as 5 lines of string replace.
- **r##"..."## raw string delimiter**: SVG placeholder uses `fill="#1c1c1c"` which contains `"#` — this terminates `r#"..."#`. Using `r##"..."##` is the idiomatic Rust fix.
- **Sequential cover downloads**: Cover Art Archive is a public service. Parallel downloads risk rate-limiting. Sequential loop is simpler, safe, and fast enough for per-artist export (typically <20 releases).
- **std::process::Command for folder reveal**: `tauri-plugin-shell open()` has a documented Windows bug with space-containing paths (GitHub #6431). `std::process::Command` is stdlib, cross-platform, fire-and-forget via `.spawn()`.
- **Hex/RGB in generated CSS**: Mercury app uses OKLCH (WebView2/Chromium supports it). Generated site is viewed in users' own browsers — Firefox ESR, Safari <15.4, and IE do not support OKLCH. Translated all theme colors to hex equivalents.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed raw string delimiter for SVG with hex color attributes**
- **Found during:** Task 1 — compilation check
- **Issue:** SVG placeholder string `fill="#1c1c1c"` contains `"#` which terminates `r#"..."#` raw string. Cargo reported a parse error at the hex color value.
- **Fix:** Changed delimiter from `r#"..."#` to `r##"..."##` for the SVG placeholder string only.
- **Files modified:** `src-tauri/src/site_gen.rs` (line 130)
- **Verification:** `cargo check` passes with only expected dead_code warnings (module not yet in lib.rs invoke_handler — that's Plan 03)
- **Committed in:** `069fb32` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — compile error)
**Impact on plan:** Necessary fix. No scope creep. The raw string delimiter issue is a Rust-specific gotcha when embedding SVG with CSS hex colors.

## Issues Encountered

- Raw string termination: `r#"..."#` cannot contain `"#` inside the string body. Fixed with `r##"..."##`. Clean Rust pattern, straightforward fix.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `site_gen.rs` is complete and compiles (verified by temporarily adding `mod site_gen;` to lib.rs, then reverting — Plan 03 handles permanent registration)
- Plan 02 can now build `SiteGenDialog.svelte` importing the TypeScript-side invoke signature
- Plan 03 registers `generate_artist_site` and `open_in_explorer` in lib.rs `invoke_handler![]` and adds the "Export site" button to the artist page
- `dialog:allow-save` is already in capabilities — Plan 02/03 can use it immediately

---
*Phase: 19-static-site-generator*
*Completed: 2026-02-24*
