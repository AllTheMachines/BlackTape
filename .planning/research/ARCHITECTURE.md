# Architecture Research

**Domain:** Test infrastructure integration for SvelteKit + Tauri 2.0 desktop app
**Researched:** 2026-02-23
**Confidence:** HIGH — based on direct source inspection of the existing codebase, official Tauri 2.0 docs, and verified cross-referencing

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    TEST SUITE ENTRY POINT                        │
│               tools/test-suite/run.mjs  (unchanged)             │
├───────────────┬──────────────────┬─────────────────┬────────────┤
│  method:code  │   method:web     │  method:rust    │ method:api │
│  (existing)   │   (existing)     │   (NEW)         │  (NEW)     │
├───────────────┼──────────────────┼─────────────────┼────────────┤
│ runners/      │ runners/         │ runners/        │ runners/   │
│ code.mjs      │ web.mjs          │ rust.mjs        │ api.mjs    │
│ (existing,    │ (existing,       │ cargo test      │ fetch +    │
│  unchanged)   │  extend only)    │ subprocess      │ assert     │
├───────────────┴──────────────────┴─────────────────┴────────────┤
│                       manifest.mjs                               │
│  PHASE_2..PHASE_12 (existing) + PHASE_13 (v1.2 new tests)       │
│  ALL_TESTS export is the single source of truth                  │
└──────────────────────────────────────────────────────────────────┘

Infrastructure dependencies:
  method:web  → wrangler pages dev on :8788 (existing requirement)
  method:api  → wrangler pages dev on :8788 (same server, fetch to /api/*)
  method:code → filesystem only (no server needed)
  method:rust → cargo test in src-tauri/ (no server needed)
  method:skip → no execution (documented exclusion)
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `tools/test-suite/run.mjs` | Entry point, argument parsing, orchestration, summary | Existing — extend method dispatch only |
| `tools/test-suite/manifest.mjs` | Living test registry, all test definitions, ALL_TESTS export | Existing — append PHASE_13 array |
| `tools/test-suite/runners/web.mjs` | Playwright browser runner, page lifecycle, console capture | Existing — add console error collection |
| `tools/test-suite/runners/code.mjs` | File existence and grep checks | Existing — unchanged |
| `tools/test-suite/runners/api.mjs` | Fetch-based API contract tests, JSON shape validation | NEW file |
| `tools/test-suite/runners/rust.mjs` | Subprocess runner for `cargo test` in `src-tauri/` | NEW file |
| `src-tauri/src/mercury_db.rs` (tests mod) | Rust unit tests: sanitize_fts, query shape, FTS5 | Add `#[cfg(test)]` mod |
| `src-tauri/src/scanner/mod.rs` (tests mod) | Rust unit tests: metadata parsing | Add `#[cfg(test)]` mod |

---

## Recommended Project Structure

```
tools/test-suite/
├── run.mjs                 # Entry point (extend: add 'api' + 'rust' method dispatch)
├── manifest.mjs            # All tests (append PHASE_13 array, add to ALL_TESTS)
└── runners/
    ├── code.mjs            # Existing — unchanged
    ├── web.mjs             # Existing — add console error collection
    ├── api.mjs             # NEW — fetch-based API contract tests
    └── rust.mjs            # NEW — cargo test subprocess runner

src-tauri/src/
├── lib.rs                  # Unchanged
├── mercury_db.rs           # Add #[cfg(test)] mod with unit tests
├── scanner/
│   └── mod.rs              # Add #[cfg(test)] mod with unit tests
└── ai/
    └── taste_db.rs         # Add #[cfg(test)] mod for init verification
```

### Structure Rationale

- **Append-only to manifest.mjs:** The existing test count (62 tests) is a known baseline. New tests are added in a new `PHASE_13` array and appended to `ALL_TESTS`. Never modify existing phase arrays — regression protection.
- **New runners are additive files:** `api.mjs` and `rust.mjs` are new files, not modifications to existing runners. `run.mjs` dispatches on `method` already — adding two new method types requires only two new `if` branches in `main()`.
- **Rust tests live in source files:** `#[cfg(test)]` modules in the Rust source files they test. No separate test directory. This is the Rust standard pattern and keeps tests co-located with the logic they verify.
- **No tauri-driver:** Tauri 2.0's `tauri-driver` requires matching Edge WebDriver versions on Windows, has no macOS support, and requires a compiled app binary. For this project's test goals, web layer coverage via wrangler + code-level Tauri logic verification via `cargo test` achieves the same confidence without the binary dependency.

---

## Architectural Patterns

### Pattern 1: Console Error Capture on Every Web Test

**What:** Modify `runners/web.mjs` to collect `page.on('console', ...)` errors and `page.on('pageerror', ...)` events. If any `console.error` or uncaught JS exception fires during a test, the test fails automatically — even if the DOM assertions pass.

**When to use:** All web tests. Silent crashes (JS errors with no visible breakage) are the primary undetected failure mode in this app.

**Trade-offs:** Adds a minor overhead of tracking an error array per test. Some third-party scripts fire console warnings that are not app failures — filter by `msg.type() === 'error'` and check `msg.text()` against known-benign patterns.

**Example:**
```javascript
// In runners/web.mjs — change page setup from:
page.on('console', () => {});
page.on('pageerror', () => {});

// To:
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(err.message));

// After test.fn(page) resolves:
if (consoleErrors.length > 0 && !test.allowConsoleErrors) {
  passed = false;
  error = `Console errors: ${consoleErrors[0]}`;
}
```

### Pattern 2: API Contract Tests via Fetch

**What:** New `method: 'api'` test type. Each test makes a `fetch()` call to `localhost:8788/api/*`, checks HTTP status, then validates the JSON shape with a lightweight inline assertion function — no JSON schema library required.

**When to use:** Every `+server.ts` route that exists. Validates response structure contracts, not just "page loads."

**Trade-offs:** Requires wrangler to be running (same prerequisite as `method: 'web'`). Cannot test MusicBrainz-proxying endpoints fully because they hit the live MB API — mock the external call or test with a known-good MBID and accept flakiness risk for those tests.

**Example:**
```javascript
// runners/api.mjs
export async function runApiTests(tests) {
  const BASE = 'http://localhost:8788';
  const results = [];
  for (const test of tests) {
    let passed = false;
    let error = null;
    try {
      const res = await fetch(BASE + test.url, test.fetchOptions ?? {});
      passed = await test.fn(res);
    } catch (e) {
      error = e.message;
      passed = false;
    }
    results.push({ ...test, passed, error });
  }
  return results;
}

// manifest.mjs — API test shape
{
  id: 'P13-API-01', phase: 13, area: 'API',
  desc: '/api/search?q=radiohead returns { results: [], query, mode }',
  method: 'api', url: '/api/search?q=radiohead',
  fn: async (res) => {
    if (res.status !== 200) return false;
    const body = await res.json();
    return Array.isArray(body.results)
      && typeof body.query === 'string'
      && typeof body.mode === 'string';
  },
},
```

### Pattern 3: Rust Unit Tests via cargo test Subprocess

**What:** New `method: 'rust'` type in manifest. The `runners/rust.mjs` runner spawns `cargo test` in `src-tauri/` and parses stdout for pass/fail counts. Individual Rust `#[test]` functions are the actual assertions.

**When to use:** For Rust logic that is deterministic and has no UI dependency: `sanitize_fts()`, SQL query shape, DB init success, scanner metadata parsing.

**Trade-offs:** `cargo test` takes 30-60 seconds on first run (Rust compilation). Subsequent runs use the incremental cache and are fast (~2s). The subprocess runner cannot map individual Rust test names to manifest test IDs — one manifest entry covers the entire `cargo test` run (or filtered by `-- module_name`).

**Example:**
```javascript
// runners/rust.mjs
import { spawn } from 'child_process';
import path from 'path';

export async function runRustTests(tests) {
  // All rust tests map to a single cargo invocation (or per-module)
  return new Promise((resolve) => {
    const cwd = path.resolve(process.cwd(), 'src-tauri');
    const proc = spawn('cargo', ['test', '--', '--test-output=immediate'], {
      cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: true
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      const passed = code === 0;
      resolve(tests.map(t => ({
        ...t,
        passed,
        error: passed ? null : stderr.split('\n').find(l => l.includes('FAILED')) ?? 'cargo test failed'
      })));
    });
  });
}
```

**Rust test location:**
```rust
// src-tauri/src/mercury_db.rs
#[cfg(test)]
mod tests {
    use super::sanitize_fts;

    #[test]
    fn sanitize_fts_wraps_each_word_as_prefix_token() {
        let result = sanitize_fts("aphex twin");
        assert_eq!(result, r#""aphex"* "twin"*"#);
    }

    #[test]
    fn sanitize_fts_strips_fts5_special_chars() {
        let result = sanitize_fts("rock & roll");
        assert!(!result.contains('&'));
    }

    #[test]
    fn sanitize_fts_returns_empty_for_whitespace_only() {
        assert_eq!(sanitize_fts("   "), "");
    }
}
```

### Pattern 4: Navigation Flow Tests (Full User Journey)

**What:** Multi-step Playwright tests that navigate across multiple pages in sequence within a single test, verifying the full user flow. No page reload between steps.

**When to use:** Critical paths: search → artist page → tag click → discover page. These catch navigation crashes that single-page tests miss. The existing `__data.json` handler in `lib.rs` was specifically added to prevent one class of these crashes.

**Trade-offs:** Slightly slower than single-page tests. Harder to isolate failure cause. Keep to 3-5 critical flows, not exhaustive paths.

**Example:**
```javascript
{
  id: 'P13-NAV-01', phase: 13, area: 'Navigation',
  desc: 'Full flow: search → artist → tag → discover (no JS errors)',
  method: 'web', url: '/search?q=aphex+twin',
  fn: async (page) => {
    await page.waitForSelector('a[href*="/artist/"]', { timeout: 8000 });
    await page.locator('a[href*="/artist/"]').first().click();
    await page.waitForSelector('.tag, [class*="tag"]', { timeout: 8000 });
    await page.locator('a[href*="/discover"]').first().click();
    await page.waitForURL('**/discover**', { timeout: 8000 });
    await page.waitForSelector('.artist-card, .card', { timeout: 8000 });
    return true; // console error capture in runner handles silent crashes
  },
},
```

### Pattern 5: Phase Test Templates — Tests Written Before Code

**What:** For each new phase milestone, a `PHASE_N` array is created in `manifest.mjs` before implementation begins. Tests start as `method: 'skip'` with `reason: 'not yet implemented'` and are upgraded to `method: 'web'` or `method: 'code'` as each feature ships.

**When to use:** Every phase. This is the "pre-phase gate" requirement from the v1.2 milestone spec.

**Enforcement mechanism:** The test runner exit code is `1` if any non-skip test fails. CI gates on exit code. A test that exists as `method: 'skip'` with a clear reason is acceptable state — it documents intent. A missing test for a shipped feature is not acceptable.

**Template for a new phase:**
```javascript
// manifest.mjs — add before ALL_TESTS export
export const PHASE_N = [
  {
    id: 'PN-01', phase: N, area: 'FeatureArea',
    desc: 'Description of what user can do',
    method: 'skip',         // Start here
    reason: 'not yet implemented — upgrade when Phase N ships',
    // Upgrade to:
    // method: 'web', url: '/route', fn: async (page) => { ... }
    // or:
    // method: 'code', fn: fileExists('src/...'),
  },
];

// Add to ALL_TESTS:
export const ALL_TESTS = [
  ...PHASE_2, ...PHASE_3, /* ... */ ...PHASE_12,
  ...PHASE_N,   // <-- append here
  ...BUILD,
];
```

---

## Data Flow

### Test Execution Flow

```
node tools/test-suite/run.mjs [--phase N] [--web-only] [--code-only]
    |
    ├─ Filter ALL_TESTS by flags
    |
    ├─ method === 'code'  → runners/code.mjs  → fs.existsSync / regex  → pass/fail
    |
    ├─ method === 'build' → run.mjs inline    → npm run check          → pass/fail
    |
    ├─ method === 'web'   → runners/web.mjs   → Playwright + :8788     → pass/fail
    |                                                + console capture
    |
    ├─ method === 'api'   → runners/api.mjs   → fetch() + :8788        → pass/fail
    |
    ├─ method === 'rust'  → runners/rust.mjs  → cargo test subprocess  → pass/fail
    |
    └─ method === 'skip'  → logged, not executed
```

### Key Data Flows for What Needs Testing

**1. Web search flow (D1 + FTS5):**
```
GET /api/search?q=aphex+twin
  → +server.ts → D1Provider → searchArtists() → D1 FTS5 query
  → { results: ArtistResult[], query: string, mode: string }
```
Test: `method: 'api'` — validate response shape and that `results.length > 0` for known-good queries.

**2. MusicBrainz proxy flow:**
```
GET /api/artist/{mbid}/links
  → +server.ts → fetch MusicBrainz WS → categorize → { legacy, categorized }
GET /api/artist/{mbid}/releases
  → +server.ts → fetch MusicBrainz WS → { releases: [] }
```
Test: `method: 'api'` with known stable MBID (Aphex Twin: `f22942a1-6f70-4263-be92-3c7a8e7b21ef`). Accept external dependency risk — mark with `allowFlakiness: true` comment.

**3. Tauri protocol handler flow (the __data.json fix):**
```
tauri:// request → lib.rs register_uri_scheme_protocol
  → path ends with __data.json?
    → asset mime_type is text/html? → return empty JSON stub
    → asset mime_type is application/json? → return asset bytes
  → other path → resolver.get() → bytes or 404
```
Test: `method: 'rust'` — unit test the stub response logic in isolation (stub the resolver, verify response body is valid SvelteKit data format).

**4. RSS feed flow:**
```
GET /api/rss/artist/{slug}  → XML response, Content-Type: application/rss+xml
GET /api/rss/tag/{tag}      → XML response
GET /api/rss/new-rising     → XML response
```
Test: `method: 'api'` — validate Content-Type header and that response body contains `<rss` or `<feed`.

---

## Integration Points

### Existing → New Integration: run.mjs Method Dispatch

Current `run.mjs` dispatches on `method` implicitly through filter + runner routing. To add `api` and `rust` support:

1. Add filter arrays: `const apiTests = tests.filter(t => t.method === 'api');` and `const rustTests = tests.filter(t => t.method === 'rust');`
2. Update the summary `log()` line to include `apiTests.length`
3. Add two execution blocks following the existing web block pattern
4. Add `--api-only` and `--rust-only` flags to the args parsing (optional convenience)

**Critical:** The existing 62 tests continue to run unchanged. New method types are additive dispatches.

### Existing → New Integration: web.mjs Console Error Capture

The current web.mjs suppresses all console output:
```javascript
page.on('console', () => {});
page.on('pageerror', () => {});
```

The upgrade replaces suppression with collection. Tests that legitimately emit console errors (none currently known) can opt out with `allowConsoleErrors: true` in the manifest entry. The `runWebTests()` function signature stays unchanged — results still return `{ ...test, passed, error }`.

**Risk:** Zero. Existing tests either pass on DOM assertions (no change) or fail on undetected console errors (new detection = intended behavior).

### Tauri Testing: Deliberate Boundary Decision

**tauri-driver is NOT recommended for this project.** Rationale:

| Factor | tauri-driver | Current approach |
|--------|-------------|------------------|
| Platform | Windows + Linux only (macOS unsupported per official docs 2025) | All platforms |
| Setup | Compiled .exe, matching Edge WebDriver version required | No binary dependency |
| Coverage | Full Tauri UI automation | Web layer via wrangler, Rust logic via cargo test |
| Maintenance | Fragile (driver version coupling) | Stable |
| Confidence gain | High for UI interactions already marked `method: 'skip'` | Same — those stay skip |

The Tauri-specific behavior that matters for automated coverage:

| Tauri Feature | Test Approach | Method |
|---------------|--------------|--------|
| `__data.json` protocol handler logic | Rust unit test of response construction | `rust` |
| `sanitize_fts()` for FTS5 safety | Rust unit test | `rust` |
| `query_mercury_db` SQL passthrough shape | Rust unit test with in-memory SQLite | `rust` |
| DB init (library.db, taste.db, mercury.db) | Rust unit test, verify tables exist | `rust` |
| Navigation flows (no crashes) | Web layer via wrangler (same HTML/JS bundle) | `web` |
| Audio playback | skip — requires running desktop app | `skip` |
| OS file dialogs | skip — requires running desktop app | `skip` |
| Tauri window management | skip — requires running desktop app | `skip` |

The SvelteKit code that runs in Tauri is the same bundle tested by Playwright against wrangler. The `isTauri()` branches are guarded by `import('...')` that only resolve in Tauri context. Those branches are tested implicitly by their Rust-side command handlers via `cargo test`.

### Phase Test Template Enforcement

The pre-phase gate pattern — "full suite must be green before any new phase executes" — is enforced through:

1. `run.mjs` exit code `1` on any non-skip failure
2. Every new phase starts with its `PHASE_N` array in manifest (method: `skip` for not-yet-built features)
3. As features ship within a phase, tests are upgraded from `skip` to `web`/`code`/`api`/`rust`
4. The `/gsd:verify-work` session at phase end runs the full suite and must exit `0`

**Template location:** `tools/test-suite/manifest.mjs` — the `PHASE_N` constant follows the last existing phase constant, before the `BUILD` constant and before the `ALL_TESTS` export.

---

## Build Order for New Test Components

The following order respects dependencies and minimizes integration risk:

**Step 1: Console error capture in web.mjs (no new files, modify existing)**
- Zero breaking risk to existing 62 tests
- Immediately catches silent crashes in all existing web tests
- Dependency: none

**Step 2: api.mjs runner + API contract tests in manifest PHASE_13**
- Requires wrangler running (same as web tests — same CI step)
- Tests: `/api/search`, `/api/genres`, `/api/scenes`, `/api/new-rising`, RSS feeds
- Dependency: Step 1 complete (clean baseline first)

**Step 3: Rust unit tests in src-tauri/ source files**
- Add `#[cfg(test)]` mods to `mercury_db.rs` and `scanner/mod.rs`
- Tests: `sanitize_fts`, `json_to_sql`, in-memory DB init
- Dependency: none (cargo test is independent of wrangler)

**Step 4: rust.mjs runner + connect to run.mjs dispatch**
- Wire the subprocess runner into the entry point
- Add manifest entry `{ method: 'rust' }` for the cargo test run
- Dependency: Step 3 (Rust tests must exist before runner is useful)

**Step 5: Navigation flow tests in manifest PHASE_13**
- Multi-step Playwright tests using the upgraded web.mjs (Step 1)
- Dependency: Steps 1 and 2 complete (console capture active, baseline clean)

**Step 6: Error state tests**
- 404 routes (non-existent artist slug, bad API params)
- Empty search (no results)
- Missing DB response (503 from /api/search when DB is absent)
- All `method: 'web'` or `method: 'api'` — no new infrastructure

---

## Anti-Patterns

### Anti-Pattern 1: Adding tauri-driver to the CI stack

**What people do:** Install `tauri-driver`, compile the Tauri binary, run WebdriverIO against the built app.

**Why it's wrong:** Requires a full Rust + Tauri binary build in CI (adds 10-20 minutes). Breaks on macOS (no WKWebView driver). Creates fragile Edge WebDriver version coupling on Windows. The actual coverage gained is for UI interactions that are already marked `method: 'skip'` — none of the failing test coverage comes from the web layer being inaccessible.

**Do this instead:** Use wrangler for the web layer (identical HTML/JS bundle). Use `cargo test` for Rust logic. Leave genuine desktop-only interactions as `method: 'skip'` with documented reasons.

### Anti-Pattern 2: Modifying Existing Phase Arrays

**What people do:** Edit `PHASE_2`, `PHASE_3`, etc. to add new test IDs or change existing ones.

**Why it's wrong:** The existing 62 tests are a verified baseline. Changing them means you can no longer determine if a regression came from a code change or a test change. The manifest comment says "Never remove."

**Do this instead:** Append only. New tests for new features go in new `PHASE_N` arrays. If an existing test is wrong (wrong selector, wrong URL), fix the test but preserve the test ID and intent.

### Anti-Pattern 3: Blocking the Full Suite on Wrangler for Rust/Code Tests

**What people do:** Gate all test execution on wrangler being up, even for `method: 'code'` and `method: 'rust'` tests.

**Why it's wrong:** Code checks and Rust tests run in under 5 seconds without any server. Making them skip when wrangler is absent prevents fast feedback in non-web contexts (e.g., a pure Rust change that breaks `sanitize_fts`).

**Do this instead:** The existing runner already handles this correctly — code checks run first, always. The wrangler check gates only `method: 'web'` and `method: 'api'` tests. Maintain this separation for new runner types.

### Anti-Pattern 4: JSON Schema Libraries for API Contract Tests

**What people do:** Add `ajv` or `zod` for schema validation in API tests.

**Why it's wrong:** Adds a dependency for simple shape checking. The existing test style uses inline JavaScript assertions — consistent, readable, zero-dependency. The API responses in this project are simple flat objects.

**Do this instead:** Inline type checks: `Array.isArray(body.results) && typeof body.query === 'string'`. Only reach for schema libraries if API responses are deeply nested with complex conditional shapes (they aren't here).

---

## Scaling Considerations

This is a test infrastructure component — scaling considerations map to "what breaks as the test count grows."

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 62 tests (current) | All tests run serially — acceptable, ~30s total |
| 100-150 tests (post v1.2) | Still serial, ~60s. Consider `--fast` flag expansion |
| 200+ tests | Split manifest into per-phase files: `manifest-p2.mjs`, `manifest-p3.mjs` etc., imported by `manifest.mjs`. Runner architecture unchanged. |
| CI parallel runs | Split by `--phase N` flag across parallel GitHub Actions jobs if needed |

### Scaling Priorities

1. **First bottleneck:** Web test count. Each Playwright test spins up a new page. At 50+ web tests, total runtime may exceed 2 minutes. Mitigation: increase parallel pages in `web.mjs` (currently one page at a time), or share browser context across tests with the same URL.

2. **Second bottleneck:** Rust compilation time. First `cargo test` run after a code change can take 30-60 seconds. Mitigation: GitHub Actions caching of `~/.cargo` and `src-tauri/target`. Local dev is already fast after initial build.

---

## Sources

- Tauri 2.0 WebDriver documentation (verified 2026-02-23): [WebDriver | Tauri](https://v2.tauri.app/develop/tests/webdriver/)
- Direct inspection: `D:/Projects/Mercury/tools/test-suite/run.mjs` — existing runner architecture
- Direct inspection: `D:/Projects/Mercury/tools/test-suite/manifest.mjs` — full 62-test manifest
- Direct inspection: `D:/Projects/Mercury/tools/test-suite/runners/web.mjs` — Playwright page lifecycle
- Direct inspection: `D:/Projects/Mercury/src-tauri/src/lib.rs` — Tauri command registration and protocol handler
- Direct inspection: `D:/Projects/Mercury/src-tauri/src/mercury_db.rs` — `sanitize_fts` and query patterns
- Official Tauri 2.0 WebDriver: [WebdriverIO example | Tauri](https://v2.tauri.app/develop/tests/webdriver/example/webdriverio/) — macOS not supported confirmed

---

*Architecture research for: Test infrastructure integration — SvelteKit + Tauri 2.0*
*Researched: 2026-02-23*
