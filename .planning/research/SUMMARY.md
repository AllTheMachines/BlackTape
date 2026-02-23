# Project Research Summary

**Project:** Mercury v1.2 — Complete Test Automation
**Domain:** Test automation for SvelteKit + Tauri 2.0 music discovery app
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

Mercury v1.2 is a test automation milestone, not a feature milestone. The goal is "zero-click confidence" — every meaningful behavior verifiable headlessly, with zero manual clicking required. The existing suite (62 tests across Phases 2-12) provides a baseline but has a fundamental blind spot: the Playwright web runner silently suppresses all JavaScript console output, meaning real crashes pass tests invisibly. The Radiohead debugging session confirmed this is not theoretical — a silent JS navigation crash shipped through the test suite undetected. Fixing this suppression is the single highest-leverage change in the entire milestone.

The recommended approach builds on the existing custom runner architecture without migrating to a framework. Three new capabilities are added additively: (1) console error capture in the existing web runner, (2) a new `api` method type backed by a fetch-based runner for contract testing all 15 endpoints, and (3) a new `rust` method type that runs `cargo test` in `src-tauri/` for Rust logic verification. The only new npm dependency is `zod` for API shape validation — though the architecture research argues persuasively that inline JavaScript assertions may suffice and zod can be deferred. All Playwright features needed are already present in the installed `playwright@1.58.2`.

The critical risk is over-engineering. Research identified five active pitfalls in the existing test suite right now: console suppression (critical), hard `waitForTimeout` on D3 tests (makes them flaky), CSS class selector coupling (breaks on style refactors), wrangler-down producing false-green exit codes (dangerous for gate conditions), and the Cloudflare D1 vs wrangler behavior gap (write semantics differ in production). All five must be addressed in the foundation phase before expanding test coverage, or every new test inherits the existing problems.

## Key Findings

### Recommended Stack

The existing stack is nearly complete — `playwright@1.58.2` already contains every API needed for the upgrade. The `page.consoleMessages()` and `page.pageErrors()` APIs (added in Playwright 1.57) enable clean post-load error inspection without managing event listener arrays. The web runner change is code surgery on existing files, not a new dependency.

For API contract testing, the choice between `zod` and inline assertions is a judgment call. Zod v4 (August 2025) is 14x faster and TypeScript-first, but the API responses in Mercury are simple flat objects. Inline assertions (`Array.isArray(body.results) && typeof body.query === 'string'`) are readable, zero-dependency, and consistent with the project's existing test style. Zod becomes the right call if responses grow complex; for v1.2, it is optional.

**Core technologies:**
- `playwright@1.58.2` (already installed): Console capture + navigation flows — no upgrade needed, `page.consoleMessages()` API already available
- `@tauri-apps/api/mocks` (already installed): Frontend IPC mocking via `mockIPC()` — zero new packages
- `cargo test` + tauri test feature: Rust unit testing via a single Cargo.toml dev-dependency addition
- `zod@4.x` (optional): API schema validation — use if responses become complex; inline assertions are fine for v1.2
- Native git hooks (`.githooks/pre-commit`): Pre-commit type check gate — already configured, zero new dependencies

**What NOT to add:** `tauri-driver` (fragile Edge version coupling, no macOS, 15-min compile per run), Vitest (no existing unit tests to run; Svelte 5 rune support requires complex browser mode setup), `@playwright/test` framework (would require migrating 62 existing tests), Husky (redundant with working `.githooks/` setup).

### Expected Features

**Must have (table stakes — zero-click confidence requires these):**
- Console error capture on every Playwright test — silent JS crashes are the proven #1 false-pass failure mode
- API contract validation for all 15 endpoints — response shape drift causes silent UI breakage
- Multi-step navigation flow tests — single-page load tests cannot catch broken link targets or navigation state corruption
- Error state coverage (404, empty results, bad params) — happy path only is where real crashes hide
- Tauri `__data.json` protocol handler code check — the specific fix for the Radiohead navigation crash has no test
- New & Rising page web test — Phase 12 was code-only; zero Playwright coverage
- Scenes page web test — Phase 10 was code-only; same gap

**Should have (differentiators, Phase 2-3):**
- Console error allowlist/threshold — distinguish app-level errors from known benign third-party noise (NDK, Bandcamp CORS)
- Tag intersection navigation flow — tests the core discovery mechanic end-to-end
- `/api/search mode=tag` contract test — tag search mode is currently untested
- `/api/unfurl` POST API test — only POST endpoint, currently untested
- Artist page live data section test — verifies async MusicBrainz proxy response appears in DOM

**Defer to v2+:**
- Full Tauri WebDriver automation (tauri-driver) — fragile, no macOS, CI incompatible
- Vitest component tests — no existing unit tests to migrate; complex Svelte 5 rune setup
- Visual regression screenshots — OKLCH taste theming shifts dynamically; no stable baseline exists
- MusicBrainz live API tests — rate-limited, network-dependent, already proxied correctly
- Nostr relay connectivity tests — requires two live clients, non-deterministic

**Target suite size after v1.2:** ~95 tests (+33 from 62 current). ~42 code checks, 1 build, ~27 web, ~5 navigation flows, ~13 API contracts, ~7 genuine skips (unchanged).

### Architecture Approach

The architecture is strictly additive. The existing `tools/test-suite/run.mjs` entry point dispatches on `method` — extending it means adding two new `if` branches for `api` and `rust`. Two new runner files are created (`runners/api.mjs`, `runners/rust.mjs`). The existing `runners/web.mjs` and `runners/code.mjs` are modified minimally. New tests land in a `PHASE_13` array in `manifest.mjs`, appended to `ALL_TESTS` — existing phase arrays are never touched. Rust unit tests live in `#[cfg(test)]` modules inside the source files they test (`mercury_db.rs`, `scanner/mod.rs`) — the Rust standard pattern.

**Major components:**
1. `tools/test-suite/run.mjs` — entry point; extend method dispatch only (add `api` and `rust` branches)
2. `tools/test-suite/runners/web.mjs` — modify to capture console errors instead of suppressing them
3. `tools/test-suite/runners/api.mjs` (NEW) — fetch-based API contract tests against wrangler :8788
4. `tools/test-suite/runners/rust.mjs` (NEW) — `cargo test` subprocess runner in `src-tauri/`
5. `tools/test-suite/manifest.mjs` — append `PHASE_13` array; never modify existing phase arrays
6. `src-tauri/src/mercury_db.rs` + `scanner/mod.rs` — add `#[cfg(test)]` modules for Rust unit tests

### Critical Pitfalls

1. **Console error suppression hiding real crashes** — The current `page.on('console', () => {})` is the most dangerous active issue. Replace with capture-and-filter. Start the allowlist empty and add to it consciously. Fix this in Phase 1 before adding any new web tests, or every new test inherits the blind spot.

2. **Hard `waitForTimeout` for D3 async renders** — P6-05, P7-01, P7-02 already use `waitForTimeout(3000/4000)` and are in the `--fast` exclusion list as a tacit admission they are unreliable. The fix is a `data-ready="true"` attribute emitted by D3 components when their simulation settles. Establish this pattern in Phase 1; it prevents all future D3 test flakiness.

3. **Wrangler-down producing false-green exit code** — The current runner exits with code 0 when wrangler is not running, reporting skipped tests as passing. In a gate context, this is indistinguishable from genuine success. Fix: exit code 1 when wrangler is absent, with a fast-fail (500ms timeout, not 5000ms) and the exact startup command in the error message.

4. **CSS class selector coupling** — Existing tests use OR-chains like `.artist-card, [data-artist], .card` that break on style refactors. Use `data-testid` attributes for all test-critical elements. Apply to new tests immediately; retrofit existing tests incrementally as routes are touched.

5. **Cloudflare D1 vs wrangler SQLite behavior gap** — D1 is a distributed SQLite system with replication; wrangler local is a single-process ACID SQLite. Gaps include boolean coercion (D1 returns `1` not `true`), transaction semantics (`BEGIN TRANSACTION` forbidden in D1), and eventual read consistency. Mercury's web layer is read-only, which eliminates most risk — document this constraint explicitly and add `// D1-CAUTION:` comments on any test making write assumptions.

## Implications for Roadmap

Based on combined research, a 3-phase structure with a pre-flight gate is the right approach.

### Phase 1: Foundation Fixes (Repair First)

**Rationale:** Three critical bugs exist in the current test infrastructure right now. Every new test written before fixing them inherits the defects. These must come first — not because they are glamorous, but because the test suite cannot be trusted as a gate until they are resolved.

**Delivers:**
- Console error capture in `web.mjs` (replaces suppression with capture-and-filter + allowlist)
- Wrangler-down exit code fix (false green → exit code 1 with actionable error)
- `data-ready` convention established for D3 components (removes `waitForTimeout` from P6-05, P7-01, P7-02)
- `data-testid` convention documented for all new tests going forward

**Addresses (from FEATURES.md):** Console error capture (P1 table stakes), Tauri protocol handler code check (P1 table stakes), New & Rising page web test, Scenes page web test.

**Avoids (from PITFALLS.md):** Pitfalls 1, 2, 3, 4 — all must be addressed before expanding coverage.

**Research flag:** Standard patterns — no deep research needed. All changes are modifications to existing files using already-documented Playwright APIs.

### Phase 2: API Contract Layer

**Rationale:** After the foundation is clean, prove the data plumbing works independent of UI. API contract tests use `fetch()` directly — no browser, no Playwright overhead. They catch response shape drift before it reaches the UI layer and run fast (under 5 seconds). This is the highest-signal new coverage category.

**Delivers:**
- `runners/api.mjs` — new runner for fetch-based API contract tests
- 13 new API contract tests covering all `+server.ts` routes
- Error state coverage: invalid params, missing required fields, out-of-range values
- RSS feed content validation (Content-Type headers + XML structure)
- `run.mjs` extended with `api` method dispatch

**Uses (from STACK.md):** Inline assertions preferred over Zod for this project's flat response shapes. If responses grow complex mid-phase, add `zod@4.x` then.

**Avoids (from PITFALLS.md):** D1/wrangler gap — document read-only model constraint and add D1-CAUTION comments.

**Research flag:** Standard patterns — `fetch()` in Node.js against localhost is well-documented. No phase-specific research needed.

### Phase 3: Navigation Flows + Rust Unit Tests

**Rationale:** Multi-step navigation flows are the last layer to add because they depend on both Phase 1 (console capture active, so flow failures are visible) and Phase 2 (API layer verified, so flow failures are not data-layer bugs). Rust unit tests are independent of wrangler but depend on nothing else — they could be Phase 2, but grouping them here keeps "test expansion" in one phase and "infrastructure fixes" in the first two.

**Delivers:**
- 5 navigation flow tests (search → artist → tag → discover; embed route; KB genre click)
- `runners/rust.mjs` — `cargo test` subprocess runner
- `#[cfg(test)]` modules in `mercury_db.rs` and `scanner/mod.rs`
- Rust unit tests: `sanitize_fts`, in-memory DB init, scanner metadata parsing
- `run.mjs` extended with `rust` method dispatch

**Implements (from ARCHITECTURE.md):** Phase test template pattern — PHASE_13 array structure, append-only to manifest.

**Avoids (from PITFALLS.md):** Anti-pattern 1 (tauri-driver, already rejected); Anti-pattern 2 (modifying existing phase arrays); Anti-pattern 3 (blocking Rust tests on wrangler).

**Research flag:** Rust subprocess runner for `cargo test` is straightforward but the stdout parsing (extracting pass/fail from cargo output format) may need iteration. Mark for light validation after implementation.

### Phase Ordering Rationale

- Foundation must come first because the current test infrastructure has active defects that corrupt the meaning of all existing tests. Building on a broken foundation compounds the problem.
- API contract tests come before navigation flows because knowing the data layer is correct eliminates a class of false-positive failures in multi-step flow tests.
- Rust tests are grouped with navigation flows (not API tests) to keep phase scope clean — neither depends on the other, but both complete the "full coverage" story together.
- The `data-ready` convention for D3 (Phase 1) is a prerequisite for the navigation flows (Phase 3) that touch pages with D3 visualizations.
- tauri-driver is deliberately excluded from all phases. The confidence gains do not justify the fragility cost. The 7 genuine skips remain `method: 'skip'` with documented reasons.

### Research Flags

Needs phase-specific research before planning:
- None identified. All three phases use well-documented patterns from official sources.

Standard patterns (skip research-phase):
- **Phase 1:** Playwright console capture APIs are well-documented and available in the installed version. Exit code behavior is standard Node.js.
- **Phase 2:** `fetch()` against localhost + inline assertions is elementary. No external API contracts to research.
- **Phase 3:** Rust `#[cfg(test)]` modules and `cargo test` subprocess are standard Rust patterns. The `runners/rust.mjs` subprocess implementation follows the same pattern as any Node.js child_process spawn.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on direct source inspection of installed packages + official Playwright 1.57 release notes confirming API availability. Zod v4 confirmed from official release docs. |
| Features | HIGH | Derived entirely from direct code analysis of the existing 62-test suite, all 15 API endpoints, and all 22 routes — not inference from generic research. |
| Architecture | HIGH | Based on direct inspection of `run.mjs`, `manifest.mjs`, `web.mjs`, `lib.rs`, `mercury_db.rs`. Official Tauri 2.0 docs confirmed tauri-driver platform limitations. |
| Pitfalls | HIGH | Three of the five critical pitfalls are identified from direct code review of the existing test suite — lines cited, not inferred. Two (D1 gap, CSS coupling) are from official Cloudflare D1 docs and established testing literature. |

**Overall confidence:** HIGH

### Gaps to Address

- **Console error allowlist starting state:** The allowlist for known-benign console errors (NDK Nostr warnings, Bandcamp CORS) starts empty. It will need entries added on first test run against the full suite. This is expected — establish the list in Phase 1 and add entries consciously.
- **Rust `cargo test` output parsing:** The `runners/rust.mjs` subprocess runner needs to parse cargo's stdout format to extract individual test pass/fail. Cargo's output format is stable but should be validated against the actual output before shipping the runner.
- **MusicBrainz proxy test flakiness:** The `/api/artist/{mbid}/releases` and `/api/artist/{mbid}/links` endpoints hit the live MB API. Tests using these endpoints should be marked `allowFlakiness: true` in comments and treated as advisory (not gate-blocking) if they fail due to MB being slow or down.
- **`globSync` performance ceiling:** `anyFileContains` in `code.mjs` uses `globSync` on every call. Acceptable at 38 code tests; should be cached if the code check count exceeds ~150. Flag for Phase 3 review.

## Sources

### Primary (HIGH confidence)
- [Playwright release notes](https://playwright.dev/docs/release-notes) — `page.consoleMessages()` and `page.pageErrors()` confirmed added in 1.57; installed version is 1.58.2
- [Playwright Network docs](https://playwright.dev/docs/network) — `page.route()`, `page.on('response')`, `page.on('requestfailed')` patterns
- [Tauri 2.0 Testing overview](https://v2.tauri.app/develop/tests/) — cargo test + mock runtime vs WebDriver
- [Tauri 2.0 WebDriver docs](https://v2.tauri.app/develop/tests/webdriver/) — tauri-driver install, platform limits, Edge version matching; macOS not supported confirmed
- [Tauri 2.0 Mocking docs](https://v2.tauri.app/develop/tests/mocking/) — `mockIPC`, `mockWindows`, `clearMocks`
- [Zod v4 release](https://zod.dev/v4) — stable August 2025, 14x speed, TS 5.x required
- [Cloudflare D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/) — D1 vs wrangler behavior gaps
- Direct code inspection: `tools/test-suite/run.mjs`, `manifest.mjs`, `runners/web.mjs`, `runners/code.mjs`
- Direct code inspection: `src-tauri/src/lib.rs`, `src-tauri/src/mercury_db.rs`
- Direct code inspection: all 15 `src/routes/api/**` endpoints and 22 routes

### Secondary (MEDIUM confidence)
- [Vitest coverage docs](https://vitest.dev/guide/coverage.html) — v8 vs istanbul; SvelteKit istanbul bug; v8 parity since 3.2.0 (Vitest deferred to v1.3+)
- [Svelte testing docs](https://svelte.dev/docs/svelte/testing) — vitest-browser-svelte for Svelte 5 runes (context for why Vitest was deferred)
- tauri-driver v2.0.4 on crates.io — confirmed package exists; macOS fork by @crabnebula confirmed

### Tertiary (LOW confidence)
- @crabnebula/tauri-driver — macOS-compatible fork mentioned in Tauri community; not evaluated in detail (not needed for this milestone)

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
