# Stack Research

**Domain:** Test automation — SvelteKit + Tauri 2.0 + Cloudflare D1 music discovery app
**Researched:** 2026-02-23
**Confidence:** HIGH (Playwright/Zod/Vitest), MEDIUM (tauri-driver — officially supported but fragile on Windows)

---

## Context: What Already Exists

This is a subsequent-milestone research document. The baseline is NOT a greenfield test setup — the following are already installed and working:

| Already Present | Version | Notes |
|-----------------|---------|-------|
| `playwright` (npm) | ^1.58.2 | Used directly via API (not `@playwright/test`) |
| Custom test runner | `tools/test-suite/run.mjs` | Node.js script, 3 test method types: web/code/skip |
| Playwright web runner | `tools/test-suite/runners/web.mjs` | Chromium headless, `page.on('console', () => {})` suppresses all output |
| 62 tests total | 23 web, 38 code, 7 skip | Skips are desktop-only (audio, OS dialogs, file pickers) |

**The key architecture decision:** Mercury's test suite is a custom runner using `playwright` directly (not `@playwright/test` with its config system). This must be preserved — the milestone adds capabilities to this existing pattern, not a framework swap.

---

## Recommended Stack Additions

### Layer 1: Extending Playwright (Highest ROI, Zero New Dependencies)

The existing web.mjs runner actively suppresses console output (`page.on('console', () => {})`). This must be inverted to capture errors.

**No new packages needed.** All required APIs are in the already-installed `playwright@1.58.2`:

| API | Purpose | Version Available |
|-----|---------|------------------|
| `page.on('console', msg => ...)` | Capture console.error, console.warn | All Playwright versions |
| `page.on('pageerror', err => ...)` | Capture uncaught JS exceptions | All Playwright versions |
| `page.consoleMessages()` | Retrieve buffered console messages after page load | Playwright 1.57+ (we have 1.58.2) |
| `page.pageErrors()` | Retrieve buffered page errors after page load | Playwright 1.57+ (we have 1.58.2) |
| `page.on('requestfailed', req => ...)` | Capture failed network requests | All Playwright versions |
| `page.on('response', resp => ...)` | Inspect API response shapes passively | All Playwright versions |
| `page.route(pattern, handler)` | Intercept + validate outgoing requests | All Playwright versions |

**Pattern for the runner update:**

The `web.mjs` runner needs a `consoleErrors` array per page. Change `page.on('console', () => {})` to collect `msg.type() === 'error'` entries. Expose collected errors in test results so failing tests can report "2 console errors captured." The `page.consoleMessages()` method (new in 1.57) is a cleaner alternative to event listeners for post-load inspection.

### Layer 2: API Contract Testing — Zod

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `zod` | ^3.24 or 4.x | Schema validation for API responses | TypeScript-first, runtime validation, excellent DX |

**Zod 4 released August 2025** — 14x faster parsing, 20x fewer TypeScript compiler instantiations, native JSON schema generation. Migration from v3 is straightforward. Use v4 for new installs.

**Why Zod over AJV:** AJV requires separate JSON Schema definitions that diverge from TypeScript types. Zod schemas ARE the TypeScript types — `z.infer<typeof schema>` gives you the type automatically. For a TypeScript-first SvelteKit codebase this is the right choice. AJV is better when you need OpenAPI/Swagger interoperability, which Mercury does not.

**Usage pattern in test suite:**

```typescript
// In test manifest, a 'code' test that fetches and validates:
import { z } from 'zod';

const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  country: z.string().optional(),
});

// Fetch from wrangler dev and validate shape
const res = await fetch('http://localhost:8788/api/artist/aphex-twin');
const data = await res.json();
ArtistSchema.parse(data); // throws ZodError if shape is wrong
```

The test manifest's `method: 'code'` tests can do HTTP fetches directly — no browser needed for contract tests.

**RSS/XML feeds:** Zod doesn't parse XML. Use the built-in `DOMParser` in a Node.js environment (via `@xmldom/xmldom`) or assert structural presence with regex + string checks. Do not add a full XML validation library for Mercury's small number of XML endpoints.

### Layer 3: Tauri Desktop Testing — Two Separate Concerns

Desktop testing breaks into two completely separate problems with different tools:

#### 3a. Rust Unit Testing (cargo test) — Already Available, Zero Cost

The Tauri 2.0 `tauri` crate includes a `test` module with a mock runtime. Enabling it requires one Cargo.toml change:

```toml
[dev-dependencies]
tauri = { version = "2", features = ["test"] }
```

This enables `tauri::test::mock_builder()`, `mock_context()`, and `noop_assets()`. With these, Rust `#[cfg(test)]` modules can test command handlers in isolation without starting a real WebView. The SQLite/rusqlite code, FTS5 queries, library scanner, and AI sidecar startup logic are all testable this way.

**What cargo test covers:**
- Rust command handlers (scan_folder, search queries, DB writes)
- SQLite schema correctness
- Data pipeline logic (MusicBrainz parsing, tag normalization)
- Library scanner correctness (lofty metadata reading)
- AI sidecar process lifecycle

**What it cannot cover:** Any UI interaction, IPC from frontend, or anything requiring WebView.

#### 3b. Frontend IPC Mocking — @tauri-apps/api/mocks (Already Installed)

`@tauri-apps/api` is already a dependency (`^2.10.1`). The `mocks` submodule (`@tauri-apps/api/mocks`) is part of that package:

| Function | Purpose |
|----------|---------|
| `mockIPC(handler)` | Intercept all frontend→Rust IPC calls, return fake responses |
| `mockWindows(labels)` | Fake multi-window contexts for window-specific code |
| `clearMocks()` | Reset between tests |

This is for unit-testing Svelte components that call `invoke('command', args)` — you mock the Rust response and test the frontend reaction. No running Tauri binary needed.

**Integration with Vitest browser mode** (see Layer 4): Run these mocks inside the real browser during component tests.

#### 3c. End-to-End Tauri App Testing — tauri-driver (HIGH COMPLEXITY, LOW PRIORITY)

| Tool | Install | Platform |
|------|---------|---------|
| `tauri-driver` | `cargo install tauri-driver --locked` (v2.0.4) | Windows + Linux only |
| `msedgedriver` (Windows) | Match Edge browser version exactly | Critical: version mismatch = hanging |
| `@wdio/cli` (WebdriverIO) | `npm install -D @wdio/cli` | Test framework on top of tauri-driver |

**Reality check for this project:**

tauri-driver works by wrapping the native WebDriver server (EdgeDriver on Windows, WebKitWebDriver on Linux). The **version matching requirement for Edge Driver is fragile** — if Windows Update upgrades Edge between sessions, tests can hang silently. macOS is not supported at all. The setup requires building a production binary (`tauri build`) before each test run, which takes 5-15 minutes for a Rust project this size.

**Verdict:** Do NOT add tauri-driver for v1.2. The ROI is poor:
- Most Tauri-specific behavior is testable via `cargo test` + `mockIPC`
- The 7 currently-skipped tests are genuinely untestable headlessly (audio playback, OS file dialogs)
- tauri-driver cannot test audio playback either — it's still headless
- The maintenance burden (Edge version matching, binary build requirement) outweighs any new coverage

**Mark for v1.3 if needed.** If a future phase introduces critical IPC flows that can't be mocked, revisit.

### Layer 4: Component Testing — Vitest (Optional, Deferred)

| Library | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^3.x | Unit + component test runner |
| `@vitest/browser` | ^3.x | Real browser component tests (Playwright provider) |
| `vitest-browser-svelte` | ^1.x | Svelte 5 component rendering in real browser |

**Why not for v1.2:**
- Mercury has no existing unit tests — adding Vitest is greenfield work
- The custom runner at `tools/test-suite/run.mjs` already covers integration behavior
- Svelte 5 runes (used throughout Mercury) have limited jsdom support, requiring browser mode which adds setup complexity
- Coverage of Svelte components requires either jsdom (broken with Svelte 5 runes) or Playwright-backed browser mode (works but complex)

**If added later:** Use `@vitest/coverage-v8` (not istanbul — has SvelteKit compatibility issues). The V8 provider produces identical coverage reports since Vitest 3.2.0 which added AST-based remapping.

**Verdict:** Skip for v1.2. Phase-specific research recommended before adding.

### Layer 5: Pre-commit Automation — Minimal Script Approach

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| Native git hook | n/a | Run `npm run check` before commits | Already have `.githooks/` configured |

**Recommended approach:** Extend the existing `.githooks/` system rather than adding Husky.

The project already has `core.hooksPath = .githooks` configured and a working `post-commit` hook. Adding a `pre-commit` hook in the same directory requires zero new dependencies:

```bash
# .githooks/pre-commit
#!/bin/bash
echo "Running type check..."
npm run check
if [ $? -ne 0 ]; then
  echo "Type check failed. Commit aborted."
  exit 1
fi
```

For test gates: run `node tools/test-suite/run.mjs --code-only` (fast, ~2s) in pre-commit. Skip `--web-only` tests in pre-commit (requires wrangler running, too slow). Run full suite in pre-push instead.

**Why not Husky v9:**
- Husky adds a `prepare` npm lifecycle hook and modifies `package.json`
- The project already has a working git hooks directory at `.githooks/`
- Husky is redundant overhead when you have a working hooks path configured
- Husky's value is for teams who don't control gitconfig — a solo project with established hooks doesn't need it

**Why not lint-staged:** Mercury's TypeScript check runs on the whole project (`svelte-check --tsconfig`), not per-file. lint-staged's per-file model doesn't map to SvelteKit's check behavior. Running the check on staged files only gives false negatives (cross-file type errors missed).

---

## Installation

```bash
# Layer 2: API contract testing (only new npm dependency)
npm install -D zod

# Layer 3a: Rust unit testing (Cargo.toml dev-dependency only)
# Add to src-tauri/Cargo.toml:
# [dev-dependencies]
# tauri = { version = "2", features = ["test"] }

# Layer 5: Pre-commit hook (no npm install needed)
# Create .githooks/pre-commit and chmod +x it

# NOT needed for v1.2:
# npm install -D @wdio/cli                  (tauri-driver, deferred)
# npm install -D vitest @vitest/browser     (component tests, deferred)
# npm install -D husky                      (redundant with existing hooks)
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Zod v4 | AJV | AJV requires separate JSON Schema defs that diverge from TS types; no benefit for this codebase |
| Zod v4 | Joi | Joi is Node-only, older ecosystem, weaker TypeScript inference |
| cargo test + mockIPC | tauri-driver WebdriverIO | tauri-driver: fragile Edge version matching, no macOS, 15min build per run |
| Native git hooks | Husky v9 | Redundant — project already has `.githooks/` configured; Husky adds zero value solo |
| Native git hooks | lint-staged | SvelteKit check is project-wide, not per-file; per-file linting gives false negatives |
| page.on('console') + page.consoleMessages() | External logging service | Overkill for a test suite; built-in Playwright APIs handle this fully |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | Istanbul has SvelteKit workspace compatibility bugs; V8 now produces equivalent reports |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@playwright/test` framework | Would require migrating existing 62 tests to `.spec.ts` format; the custom runner is intentional and working | Keep `playwright` direct API usage in `tools/test-suite/` |
| `tauri-driver` (v1.2) | Fragile Edge version matching, no macOS support, requires full binary build per run, covers no new ground vs mockIPC | cargo test + `@tauri-apps/api/mocks` |
| Vitest (v1.2) | No existing unit tests to run; Svelte 5 rune support requires browser mode complexity | Phase-specific research before adding |
| `jest` | Not compatible with SvelteKit's ESM-first build; Vitest supersedes it for Vite-based projects | Vitest if/when unit tests are added |
| `cypress` | Electron-based, large install, worse DX than Playwright which is already installed | Playwright (already present) |
| XML schema validation library (`libxmljs2`, etc.) | Over-engineered for 1-2 RSS feeds | Structural string/regex assertions on feed output |
| `supertest` | Node HTTP assertion library; not applicable to SvelteKit serverless/edge functions on Cloudflare | Direct fetch() in code tests against wrangler :8788 |

---

## Stack Patterns by Variant

**For console error capture (extending existing web tests):**
- Modify `tools/test-suite/runners/web.mjs` to collect errors per page
- Use `page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })`
- Use `page.on('pageerror', err => errors.push(err.message))`
- Alternatively (cleaner for post-load inspection): `await page.consoleMessages()` after load
- Return errors in test result; fail if unexpected errors present

**For API contract tests (new 'api' method type in manifest):**
- Add `method: 'api'` to manifest, backed by direct `fetch()` calls + Zod parsing
- No browser launch needed — runs in Node.js process directly
- Tests against `http://localhost:8788` (same wrangler instance as web tests)

**For Rust unit tests:**
- Standard `#[cfg(test)]` modules inside Rust source files
- `cargo test -p mercury-lib` to run only app tests (not dependency tests)
- Enable `tauri` test feature in `[dev-dependencies]` for command handler mocking

**For pre-commit gate:**
- Fast path: `node tools/test-suite/run.mjs --code-only` (2-5 seconds)
- Pre-push path: full suite (requires wrangler running — document this)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `playwright@1.58.2` | All existing tests | `page.consoleMessages()` / `page.pageErrors()` require 1.57+ — already satisfied |
| `zod@4.x` | TypeScript 5.9.3 | Zod 4 requires TS 5.x — satisfied |
| `tauri` test feature | `tauri@2.x` | Must match the project's tauri crate version; check `src-tauri/Cargo.lock` |
| `@tauri-apps/api/mocks` | `@tauri-apps/api@2.10.1` | Already installed — no new package needed |
| `cargo test` | Rust edition 2021 | Already the project's edition |

---

## Sources

- [Playwright release notes](https://playwright.dev/docs/release-notes) — confirmed page.consoleMessages() and page.pageErrors() added in 1.57; we have 1.58.2. HIGH confidence.
- [Playwright Network docs](https://playwright.dev/docs/network) — page.route(), page.on('response'), page.on('requestfailed') patterns. HIGH confidence.
- [Tauri 2.0 Testing overview](https://v2.tauri.app/develop/tests/) — cargo test + mock runtime vs WebDriver. HIGH confidence.
- [Tauri 2.0 WebDriver docs](https://v2.tauri.app/develop/tests/webdriver/) — tauri-driver install, platform limits, Edge version matching warning. HIGH confidence.
- [Tauri 2.0 Mocking docs](https://v2.tauri.app/develop/tests/mocking/) — mockIPC, mockWindows, clearMocks. HIGH confidence.
- [Zod v4 release](https://zod.dev/v4) — stable release August 2025, 14x speed, native JSON schema, TS 5.x required. HIGH confidence.
- [Vitest coverage docs](https://vitest.dev/guide/coverage.html) — v8 vs istanbul, SvelteKit istanbul bug, v8 parity since 3.2.0. MEDIUM confidence.
- [Svelte testing docs](https://svelte.dev/docs/svelte/testing) — vitest-browser-svelte for Svelte 5 runes. MEDIUM confidence.
- [Husky docs](https://typicode.github.io/husky/) — v9 current, pre-commit patterns. HIGH confidence (but NOT recommended for this project).
- tauri-driver v2.0.4 confirmed via crates.io search. MEDIUM confidence (couldn't access crates.io page directly).
- @crabnebula/tauri-driver — npm package exists, macOS-compatible fork. MEDIUM confidence.

---

## Critical Finding: Playwright Already Has Everything Needed

The single most important finding: **every Playwright feature needed for v1.2 is already available in the installed playwright@1.58.2 package.** The `page.consoleMessages()` and `page.pageErrors()` APIs (new in 1.57) enable cleaner post-load error inspection without event listener management. The web.mjs runner change is code surgery, not a new dependency.

The only genuinely new npm dependency for v1.2 is `zod` for API contract testing.

---

*Stack research for: Mercury v1.2 test automation (SvelteKit + Tauri 2.0)*
*Researched: 2026-02-23*
