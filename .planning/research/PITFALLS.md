# Pitfalls Research

**Domain:** Test automation added to an existing SvelteKit + Tauri 2.0 + Playwright app
**Researched:** 2026-02-23
**Confidence:** HIGH (based on existing test suite code review + verified sources)

---

## Critical Pitfalls

### Pitfall 1: Hard `waitForTimeout` as a Substitute for Deterministic Waits

**What goes wrong:**
Tests pass locally but fail in CI or on slower hardware because the fixed timeout (`waitForTimeout(2000)`) expires before the element is ready. The symptom is a test that fails 1-in-5 runs with no reproducible root cause — the classic "flaky test."

**Why it happens:**
D3 visualizations (StyleMap, GenreGraph, TasteFingerprint) are async by nature — they run force simulations in requestAnimationFrame loops. Developers reach for a time delay as the easiest fix. The current suite already has this pattern in P6-05, P7-01, and P7-02 (hardcoded `waitForTimeout(3000)` and `waitForTimeout(4000)`). These tests are already marked in the `--fast` skip list precisely because they are slow and fragile.

**How to avoid:**
Replace fixed delays with deterministic completion signals. For D3 components: add a `data-ready="true"` attribute to the SVG container once simulation settles (after `simulation.on('end', ...)` fires or after N ticks). Tests wait for `[data-ready="true"]` instead of a timeout. This is a 5-line change in each D3 component and eliminates the entire category of flakiness.

```javascript
// WRONG — current pattern in P7-01
await page.waitForTimeout(4000);
const hasSvg = await page.locator('svg').count();

// RIGHT — deterministic signal from the component
await page.waitForSelector('svg[data-ready="true"]', { timeout: 15000 });
```

**Warning signs:**
- Tests in the `--fast` skip list that use `waitForTimeout` — these are already flagged as problem candidates
- Any test that uses `waitForLoadState('networkidle')` on a page that has ongoing polling or WebSocket connections (networkidle never fires)
- Tests that pass in isolation but fail when run in the full suite (timing budget exhausted)

**Phase to address:** Phase 1 (Foundation) — establish the `data-ready` pattern as a required convention before adding new test coverage

---

### Pitfall 2: Console Error Suppression Hiding Real Crashes

**What goes wrong:**
The web runner's `page.on('console', () => {})` and `page.on('pageerror', () => {})` silently discard ALL console output. This means a real JavaScript crash — a thrown exception, a failed fetch, a null dereference — produces no test failure. The page loads, the test's DOM assertion passes, and the bug is invisible.

**Why it happens:**
Console noise from third-party dependencies (NDK Nostr warnings, Svelte 5 hydration messages, Cover Art Archive CORS notices) causes false positives if ALL console errors become test failures. The simplest fix — silence everything — was chosen. But it threw out the signal with the noise.

**How to avoid:**
Capture console errors into a per-test array, then fail only on errors not in a known-noise allowlist. The allowlist should be explicit and reviewed, not a catch-all suppressor.

```javascript
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(err.message));

// After test fn runs:
const realErrors = consoleErrors.filter(e =>
  !KNOWN_NOISE.some(pattern => pattern.test(e))
);
if (realErrors.length > 0) {
  return { passed: false, error: `Console error: ${realErrors[0]}` };
}
```

The allowlist (`KNOWN_NOISE`) starts with zero entries and grows only when a specific noisy message is investigated and confirmed benign. Every addition to it should be a conscious decision, not a habit.

**Warning signs:**
- The web runner has `page.on('console', () => {})` — currently the case
- Pages that intermittently return wrong data but pass tests (crash is silent)
- "It passes the test but the feature is broken" reports from manual testing

**Phase to address:** Phase 1 (Foundation) — must be fixed before adding new web tests, or every new test inherits the blind spot

---

### Pitfall 3: Tests Coupled to CSS Classes That Break on Refactors

**What goes wrong:**
Tests use selectors like `.artist-card`, `.tag-chip`, `[class*="artist"]` that are tightly coupled to CSS implementation details. When a designer renames a class, restructures markup, or consolidates style modules (common in a Svelte 5 project using `<style>` scoped blocks), a dozen tests break simultaneously — for no behavioral reason.

**Why it happens:**
CSS class selectors are the easiest way to target elements. The existing suite already has this problem extensively: `page.locator('.artist-card, [data-artist], .card')`, `page.locator('.tag, .tag-chip, [class*="tag"]')`. These are three selectors in OR chains trying to compensate for class uncertainty — a sign the tests don't know what they're looking for.

**How to avoid:**
Use `data-testid` attributes for elements that tests need to find. `data-testid` is explicitly for testing, never used by CSS, and survives any style refactor.

```html
<!-- In the component -->
<div class="artist-card fancy-card-v2" data-testid="artist-card">

<!-- In the test -->
await page.waitForSelector('[data-testid="artist-card"]', { timeout: 8000 });
```

Apply `data-testid` selectively — only to elements that tests actually need to locate. Do not `data-testid` every element; that's its own maintenance burden.

**Warning signs:**
- Selectors with OR chains of class variants (`.card, .artist-card, [class*="card"]`)
- Tests that break after CSS-only commits with no logic changes
- The `[class*="artist"]` pattern, which matches anything with "artist" in any class name — highly fragile

**Phase to address:** Phase 1 for the convention; applied incrementally to existing tests as routes are touched

---

### Pitfall 4: Wrangler Dependency with Silent or Unhelpful Failure

**What goes wrong:**
The test runner requires wrangler running on `:8788`. When wrangler is not running, the current code correctly detects the failure and prints a warning. However, it reports all web tests as `passed: null` (skipped), not `passed: false` (failed). This means the test summary shows "All tests passed" with a skip count — a false green that could ship in a CI pre-phase gate check.

**Why it happens:**
The current `checkWrangler()` function resolves to `false` when wrangler is down, and the runner treats wrangler-skipped tests as skipped (null), not failed. The intent was to be helpful, but it creates a situation where a broken environment produces a green result.

**How to avoid:**
When wrangler is not running, exit with code 1, not code 0. Treat the missing server as a setup error (exit code 2 from the spec), not a skip. In a pre-phase gate context, a silent skip is indistinguishable from a real pass.

Additionally: the `5000ms` timeout in `checkWrangler()` adds 5 seconds of wait when wrangler is down. This should fail fast (500ms) with a clear, actionable error that includes the exact startup command.

**Warning signs:**
- CI pipeline showing green with a large "Skipped" count and zero web test results
- Running `node tools/test-suite/run.mjs` on a machine where wrangler was not started, getting exit code 0
- Pre-phase gates that accept null results as passing

**Phase to address:** Phase 1 (Foundation) — fix before using the suite as a gate condition

---

### Pitfall 5: Cloudflare D1 vs. Wrangler SQLite Behavior Gaps

**What goes wrong:**
Tests pass against wrangler's local SQLite emulation but the same queries behave differently against production Cloudflare D1. The gaps include: read-after-write consistency (writes go to primary, reads can return stale data from replicas immediately after write), JavaScript boolean coercion (D1 stores `true` as `1`, returns `1` not `true`), and transaction semantics (D1 forbids `BEGIN TRANSACTION` — only one write transaction is open at once globally).

**Why it happens:**
Wrangler's local D1 is a real SQLite database — fully ACID, fully transactional, single-process. Production D1 is a distributed SQLite system with replication. The test environment and production environment are not equivalent, and the gap is invisible until production deployment.

**How to avoid:**
- Never test D1 read-after-write in the same request cycle. If a test inserts a row and immediately reads it back, that test is testing an assumption D1 doesn't guarantee.
- For Mercury specifically: the web app is read-only against D1 (artists + tags, ingested by pipeline). Write paths don't exist in the web layer. This eliminates most of the risk, but it should be explicitly documented as a constraint, not discovered by accident.
- Mark any test that makes write assumptions with a `// D1-CAUTION:` comment explaining the limitation.
- Test the Wrangler-incompatible SQLite pragma assumptions: D1 does not support `PRAGMA journal_mode=WAL` — if test setup uses this pragma, it will fail in production.

**Warning signs:**
- API tests that pass in wrangler but return unexpected results in Cloudflare preview deployments
- Tests that do write-then-read sequences
- FTS5 behavior differences: wrangler supports FTS5, but the tokenizer configuration may differ from the compiled SQLite in production

**Phase to address:** Phase 2 (API Contract Tests) — document the D1/wrangler gap before writing endpoint tests

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Silence all console events in the runner | Eliminates false positives from dep warnings | Real JS crashes become invisible; bugs pass tests | Never — use an allowlist instead |
| `waitForTimeout` for D3/async renders | Simple to write | Tests become timing-dependent; flaky on slow machines | Never — add a `data-ready` signal |
| CSS class selectors without `data-testid` | Fast to write | Breaks on every style refactor | Only for read-only assertions on structural elements (e.g., "there is an `<h1>`") |
| `fileContains` checks instead of behavior tests | No browser needed, fast | Proves code exists but not that it works | Acceptable for Tauri-only features that cannot be headlessly verified |
| `waitForLoadState('networkidle')` on all pages | Simple uniform behavior | Hangs forever on pages with polling/WebSockets/analytics | Only for static pages with no ongoing network activity |
| Treating wrangler-skipped tests as null (not fail) | Friendly UX when server isn't running | Pre-phase gate produces false green | Never in automated gate context |

---

## Integration Gotchas

Common mistakes when connecting the test suite to external systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Wrangler + D1 | Assuming local behavior matches production | Document the read/write gaps; Mercury's read-only web model mitigates most risk |
| Playwright + SvelteKit SSR | Interacting before hydration completes | Use `waitForSelector('[data-hydrated]')` or wait for specific interactive element to be enabled |
| Playwright + Tauri WebView2 | Trying to run browser tests against the Tauri window directly | Use CDP remote debugging port; requires the app to be running; mark as `skip` in headless suite |
| Playwright + MusicBrainz live API | Tests that depend on live external API responses | Use specific artists (Aphex Twin, Radiohead) that are certain to exist; document that network failures = test skips, not failures |
| Playwright + Bandcamp/Spotify embeds | Testing embed presence when embeds are behind auth/geo | Test that the embed container exists, not that the iframe content loaded |
| Nostr (NDK) + Playwright | NDK generates console warnings on every page load | Add NDK warnings to the console noise allowlist explicitly |

---

## Performance Traps

Patterns that work at small scale but fail as the suite grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Shared browser context across all web tests | Tests interfere via cookies, localStorage, scroll position | Each test gets a fresh page (current approach is correct); consider fresh context for stateful tests | At ~30 web tests — already at that scale |
| Sequential web test execution | Suite takes 5+ minutes as test count grows | Tests are already sequential; acceptable at current scale but will hurt at 50+ web tests | At ~50 web tests, consider parallel context groups |
| `globSync` in `anyFileContains` called per-test | Slow startup when code tests number in the hundreds | Cache the glob results once per run, not per test call | At ~150 code tests |
| `npm run check` in BUILD-01 blocking all other tests | TypeScript errors that take 90 seconds delay feedback | Run build check last (current approach is correct) or move to parallel pre-check | Already handled — BUILD is last |
| `waitForLoadState('networkidle')` on artist page | Artist page fetches bio from MB API async — networkidle may wait 15+ seconds | Use `domcontentloaded` + wait for specific element (artists have h1 immediately) | Any page with an async external API call |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Console error capture:** The runner calls `page.on('console', () => {})` — check that this is replaced with capture-and-filter before claiming the suite catches silent crashes
- [ ] **Wrangler gate behavior:** Verify that `node tools/test-suite/run.mjs` exits with code 1 (not 0) when wrangler is down — currently exits 0 with skips
- [ ] **D3 tests in --fast:** P6-05, P7-01, P7-02 are in the `--fast` skip list — they are excluded from fast runs and use `waitForTimeout`. These are not verifying anything deterministically.
- [ ] **Tauri protocol handler:** No test currently verifies that `tauri://` protocol handler responds correctly to routes — the `fileExists` code checks prove the handler code exists, but not that it works
- [ ] **API contract shape:** Web tests verify page loads (DOM element exists) but do not validate API response shape (`/api/search` returns `{ artists: Artist[] }`, not just an HTTP 200)
- [ ] **Console error allowlist:** If console capture is added, the allowlist must exist from day one or every test will fail on NDK/Nostr warnings that are benign
- [ ] **Mobile viewport reset:** P2-09 calls `page.setViewportSize({ width: 375 })` but shares a browser context — if the next test runs at 375px instead of 1280px, it's subtly wrong (each test gets a new page, so this is mitigated, but context-level viewport state is not reset)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Flaky timeout tests blocking CI | MEDIUM | Add `data-ready` attributes to D3 components; replace `waitForTimeout` calls one by one; takes 2-4 hours per component |
| CSS class selector breakage after refactor | LOW | Replace broken selectors with `data-testid` selectors; 15 minutes per broken test |
| Silent crash going undetected | HIGH | Add console capture to runner; audit all existing tests for pages that may have been silently failing; re-run suite |
| False green from wrangler-down | LOW | Change null result to false; fix exit code; 30-minute runner change |
| D1/wrangler production gap discovered | HIGH | Reproduce against Cloudflare preview deployment; identify which queries differ; may require data pipeline changes |
| Test helper abstraction too deep to debug | MEDIUM | Flatten helpers back to inline code; Mercury's current helpers (`fileExists`, `fileContains`) are appropriately thin — do not add deep abstractions |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hard `waitForTimeout` (D3 tests) | Phase 1 — establish `data-ready` convention | D3 tests removed from `--fast` skip list; suite passes in under 60 seconds |
| Console error suppression | Phase 1 — replace silent handler with capture+filter | A test that deliberately triggers a console.error fails the suite |
| CSS class selector coupling | Phase 1 — establish `data-testid` convention; Phase 2+ — apply to new tests | A CSS-only refactor of a tested component does not break any test |
| Wrangler false green | Phase 1 — fix exit codes and gate behavior | Running the suite without wrangler exits code 1, not code 0 |
| D1/wrangler gap | Phase 2 (API contract tests) — document assumptions | API tests note D1 constraints in comments; read-only model confirmed |
| Implementation-testing (fileExists only) | Phase 2+ — supplement code checks with behavior tests | Each phase adds at least one web test that exercises actual behavior, not just file presence |
| Over-engineering test helpers | All phases — review before adding new helpers | Test helper files stay under 100 lines; any abstraction that requires reading another file to understand a test is rejected |

---

## Mercury-Specific Observations (from existing test suite code review)

These are issues found by reading the existing test code directly, not from research.

**Current `web.mjs` runner — lines 22-23:**
```javascript
page.on('console', () => {});
page.on('pageerror', () => {});
```
This is the most critical active pitfall. Every web test currently runs blind to JavaScript errors.

**Current `manifest.mjs` — P2-07:**
```javascript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
```
This test (artist page external links) uses both `networkidle` AND a hard timeout as a double-wait. The artist page fetches live data from MusicBrainz API — `networkidle` may hang if MB is slow. Two waits compound the problem.

**Current `manifest.mjs` — P6-05, P7-01, P7-02:**
D3 tests with `waitForTimeout(3000)` and `waitForTimeout(4000)`. These are explicitly in the `--fast` exclusion list in `run.mjs`, which is a tacit acknowledgment that they are unreliable.

**`fileContains` checks (Phases 3-12):**
The majority of tests for Phases 3-12 prove code exists, not that it works. This is the right call for Tauri-only features that cannot be headlessly tested. The pitfall is assuming these tests provide confidence about behavior — they only prove the feature was written, not that it runs correctly.

**`anyFileContains` with glob — `code.mjs` line 27:**
This scans the entire `src/lib/**/*.ts` tree on each call. At the current test count it's fast. As the codebase grows past 500 TypeScript files, this could add seconds per call. Cache the glob results.

---

## Sources

- Playwright official docs on `waitForTimeout` antipattern: https://www.checklyhq.com/blog/never-use-page-waitfortimeout/
- SvelteKit + Playwright hydration race conditions: https://spin.atomicobject.com/hydration-sveltekit-tests/
- BrowserStack on `waitForLoadState` options and tradeoffs: https://www.browserstack.com/guide/playwright-waitforloadstate
- Playwright flaky test detection and prevention: https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/
- Over-engineering test automation patterns: https://testrigor.com/blog/over-engineering-tests/
- Test behavior not implementation (CSS coupling): https://codeling.dev/blog/testing-behavior-or-implementation/
- Cloudflare D1 local development and behavior differences: https://developers.cloudflare.com/d1/best-practices/local-development/
- D1 transaction limitations and consistency model: https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Tauri 2.0 WebView2 Windows testing via CDP: https://github.com/Haprog/playwright-cdp
- Tauri WebDriver cleanup issues on Windows: https://github.com/tauri-apps/tauri/issues/8610
- Test coverage diminishing returns: https://thoughtbot.com/blog/unit-and-functional-tests-are-as-useful-as-100-code
- 17 Playwright testing mistakes: https://elaichenkov.github.io/posts/17-playwright-testing-mistakes-you-should-avoid/
- Direct code review: `D:/Projects/Mercury/tools/test-suite/runners/web.mjs` (console suppression pattern identified)
- Direct code review: `D:/Projects/Mercury/tools/test-suite/manifest.mjs` (waitForTimeout usage identified)

---
*Pitfalls research for: adding comprehensive test automation to Mercury (SvelteKit + Tauri 2.0 + Playwright)*
*Researched: 2026-02-23*
