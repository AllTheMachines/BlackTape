---
phase: 13-foundation-fixes
plan: "01"
subsystem: test-infrastructure
tags: [test-suite, playwright, manifest, proc-02, baseline]
dependency_graph:
  requires: []
  provides: [PROC-02-green-baseline, console-capturing-web-runner]
  affects: [tools/test-suite/manifest.mjs, tools/test-suite/runners/web.mjs, tools/test-suite/run.mjs]
tech_stack:
  added: []
  patterns: [console-capture-per-test, allowConsoleErrors-opt-out]
key_files:
  created: []
  modified:
    - tools/test-suite/manifest.mjs
    - tools/test-suite/runners/web.mjs
    - tools/test-suite/run.mjs
decisions:
  - "23 web tests converted to skip (not deleted) — test IDs preserved for history"
  - "consoleErrors captured per-test in web runner with allowConsoleErrors opt-out flag"
  - "checkWrangler() left in place with dormant comment — zero-cost dead code until web tests return"
  - "Baseline documented in run.mjs header comment: 63 passing, 30 skipped, exits 0"
metrics:
  duration: "5 min"
  completed: "2026-02-24"
  tasks: 2
  files: 3
---

# Phase 13 Plan 01: Remove Web Tests and Establish PROC-02 Baseline Summary

**One-liner:** Removed 23 Playwright web tests from manifest (Tauri-desktop-only project), added per-test console.error capture to web runner, established verifiable PROC-02 green baseline (63 passing, 30 skipped, exits 0).

## What Was Changed

### manifest.mjs — Web Tests Converted to Skip

All 23 `method: 'web'` tests converted to `method: 'skip'` with reason `'Web version removed — Mercury is Tauri-desktop-only'`. Test objects retained with original id/phase/area/desc for historical continuity.

Converted tests:
- **PHASE_2:** P2-01 through P2-11 (11 tests) — homepage, search, artist page, navigation, mobile
- **PHASE_5:** P5-05 (1 test) — explore page web gate
- **PHASE_6:** P6-01 through P6-06 (6 tests) — discover, tag filter, style map, crate dig
- **PHASE_7:** P7-01 through P7-04 (4 tests) — KB page, genre graph SVG, genre detail 404, time machine
- **PHASE_8:** P8-05 (1 test) — settings desktop-only gate

Header comment updated: `method 'web'` is now "reserved for future use — currently all converted to skip (Tauri-desktop-only)".

### runners/web.mjs — Console Error Capture

Replaced console suppression pattern with per-test capture:

```javascript
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => {
  consoleErrors.push(err.message ?? String(err));
});
```

After `test.fn(page)` resolves, waits 200ms for async errors then fails the test if any console.error was detected (unless `test.allowConsoleErrors === true`).

### run.mjs — Baseline Documentation

- Added `// No web tests currently — wrangler check is dormant` comment to `checkWrangler()`
- Added comment to fast-filter IDs: `// Previously slow web tests — now all skip; filter is harmless but kept for reference`
- Added baseline header comment: `// Baseline (Phase 13, 2026-02-24): 63 passing (62 code + 1 build), 0 web, 30 skipped — exits 0`

## Baseline Test Counts

| Category | Count |
|----------|-------|
| Code checks passing | 62 |
| Build check passing | 1 |
| Web tests | 0 |
| Skipped (desktop-only) | 7 (original) |
| Skipped (web-converted) | 23 |
| **Total skipped** | **30** |
| **Total passing** | **63** |
| **Exit code** | **0** |

## Exit Code Verification

```
$ node tools/test-suite/run.mjs
 All tests passed ✓
$ echo $?
0
```

```
$ node tools/test-suite/run.mjs --code-only
 All tests passed ✓
$ echo $?
0
```

```
$ grep -c "method: 'web'" tools/test-suite/manifest.mjs
0
```

PROC-02 gate is established and green.

## Console Error Tests Needing allowConsoleErrors

None. All existing tests that were previously `method: 'web'` have been converted to skip. The `allowConsoleErrors` flag is available for future web tests that intentionally trigger console.error as part of their verification.

## Deviations from Plan

None — plan executed exactly as written.

The plan mentioned "38 code tests" in the verify section — the actual count is 62 code + 1 build = 63 total passing. This discrepancy is because phases 9–12 added 24 additional code tests since the plan's count was written. The important outcome (all code tests green, zero failures) is achieved.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| tools/test-suite/manifest.mjs | FOUND |
| tools/test-suite/runners/web.mjs | FOUND |
| tools/test-suite/run.mjs | FOUND |
| .planning/phases/13-foundation-fixes/13-01-SUMMARY.md | FOUND |
| Commit 17445e4 (task 1) | FOUND |
| Commit 1ec5e84 (task 2) | FOUND |
