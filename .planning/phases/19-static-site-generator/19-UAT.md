---
status: complete
phase: 19-static-site-generator
source: 19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md
started: 2026-02-24T15:50:16Z
updated: 2026-02-24T15:50:16Z
---

## Current Test

[testing complete]

## Tests

### 1. P19 code checks pass (P19-01 through P19-11)
expected: All 11 Phase 19 code-level checks pass — files exist, functions present, testids in place, lib.rs wired correctly
result: pass

### 2. TypeScript + Svelte build check
expected: npm run check exits 0 with no new errors
result: pass

### 3. Rust unit tests pass (site_gen module)
expected: cargo test runs all site_gen tests — including build_html_cover_img_when_downloaded — with 0 failures
result: issue
reported: "site_gen::tests::build_html_cover_img_when_downloaded panicked: assertion failed: !html.contains('cover-placeholder') — CSS stylesheet always contains the .cover-placeholder selector so this string check never passes even when the img branch is taken"
severity: major

### 4. Export site button exists in artist page (Tauri-gated)
expected: Artist page has data-testid="export-site-btn" inside {#if tauriMode} block
result: pass

### 5. SiteGenDialog integration (opens, 5-state machine, dark theme)
expected: Clicking Export site opens the SiteGenDialog overlay — confirming state, folder picker, spinner, success/error states all functional
result: skipped
reason: requires running desktop app — Tauri dialog interactions cannot be headlessly tested

### 6. Generated HTML structure and cover art handling
expected: Exported site contains index.html with hex/RGB colors (no OKLCH), covers/ directory, and SVG placeholder for releases without downloaded covers
result: skipped
reason: requires running desktop app — file system output requires OS folder picker and actual generation run

## Summary

total: 6
passed: 3
issues: 1
pending: 0
skipped: 2

## Gaps

- truth: "cargo test passes with 0 failures for the site_gen module — including the build_html_cover_img_when_downloaded test"
  status: failed
  reason: "User reported: site_gen::tests::build_html_cover_img_when_downloaded panicked: assertion failed: !html.contains('cover-placeholder') — CSS stylesheet always contains the .cover-placeholder selector so this string check never passes even when the img branch is taken"
  severity: major
  test: 3
  root_cause: "Test assertion used bare substring 'cover-placeholder' which matched the CSS class selector '.cover-placeholder {' in the stylesheet. When the cover IS downloaded, the <img> branch is used (not the placeholder div), but the CSS still defines the .cover-placeholder rule. The assertion needed to check for the div element '<div class=\"cover-placeholder\">' to distinguish stylesheet presence from element presence."
  artifacts:
    - path: "src-tauri/src/site_gen.rs"
      issue: "Test assertion at line 801 checked html.contains('cover-placeholder') — matched CSS selector in stylesheet, not just the placeholder div"
  missing: []
  debug_session: ""
  fix_commit: "12bf81d"
  fix_status: resolved
