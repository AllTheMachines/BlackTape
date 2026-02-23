# Feature Research

**Domain:** Complete test automation for SvelteKit + Tauri 2.0 music discovery app
**Researched:** 2026-02-23
**Confidence:** HIGH (derived from direct code analysis of existing test suite, API endpoints, and route structure)

---

## Context: What "Complete" Means Here

This is not a greenfield test suite design. Mercury has 62 existing tests across 11 phases. The milestone goal is "zero-click confidence" — Claude can verify every feature works without Steve clicking anything. The gaps were exposed by the Radiohead debugging session: silent JS crashes, unvalidated API shapes, no multi-step navigation flows.

The research question is: what test categories are table stakes vs differentiators vs traps, and where is the exact boundary between automatable and genuinely not.

---

## Feature Landscape

### Table Stakes (Must Have for Zero-Click Confidence)

Features that must exist for the test suite to actually prove Mercury works. Missing these means the suite gives false confidence.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Console error capture on every Playwright test | Silent JS crashes are the #1 false-pass failure mode. The Radiohead session proved this. | LOW | One-line Playwright change: `page.on('console', ...)` and `page.on('pageerror', ...)` with capture instead of suppress. Currently suppressed in web.mjs line 23-24. |
| API contract validation for all 15 endpoints | Response shape drift causes silent UI breakage. Code checks only verify files exist, not that they return valid data. | MEDIUM | Use `fetch()` directly against localhost:8788. Check status code, JSON structure, required fields. Not UI — pure HTTP. |
| Multi-step navigation flow tests | Single-page load tests can't catch broken link targets, missing query params, or navigation state corruption. | MEDIUM | Playwright: navigate to search → click artist card → verify artist page → click tag → verify /discover. Full chain. |
| Error state coverage (404, empty results, bad params) | Happy path tests only. Error states are where real crashes hide. | MEDIUM | API: invalid MBID → 400. Artist slug not found → graceful. Search with no results → empty array, not crash. |
| New & Rising page web test | P12 code checks verify files exist, but the /new-rising page has zero Playwright coverage. | LOW | Page loads, shows two sections (new artists, gaining traction), no console errors. |
| Scenes page web test | Same gap as new-rising — P10 code checks only. | LOW | /scenes loads, shows scene cards. |
| Embed route web test | /embed/artist/[slug] is a live page used by external bloggers. Zero tests. | LOW | Load /embed/artist/aphex-twin, verify iframe-safe content, no errors. |
| RSS feed content validation | P12 code checks verify routes exist, not that they return valid XML. | LOW | HTTP GET /api/rss/artist/aphex-twin, check Content-Type is application/rss+xml, check body contains `<rss` or `<feed`. |
| Tauri protocol handler code check | The __data.json fix (lib.rs line 62-74) is the fix for the Radiohead navigation crash. It has no test at all. | LOW | Code check: fileContains('src-tauri/src/lib.rs', '__data.json') |

### Differentiators (Beyond Baseline Coverage)

Features that make the test suite meaningfully better than basic coverage, without crossing into diminishing returns.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| API response shape snapshots | Catch field renames, type changes, null vs undefined drift before they hit the UI. Stronger than just checking status 200. | MEDIUM | Define expected shape per endpoint (e.g., `{ results: Array, query: string }`), validate response keys. |
| Console error threshold reporting | Rather than fail on any console.error, some errors are known/expected (3rd party embeds, CORS on external resources). A threshold or allowlist gives signal without noise. | MEDIUM | Collect errors, filter known patterns (Bandcamp iframe errors, SoundCloud oEmbed CORS), fail only on app-level errors. |
| Tag intersection navigation flow | /discover?tags=electronic+ambient tests multi-tag filtering — the core discovery mechanic. | MEDIUM | Playwright: load /discover?tags=electronic, click an additional tag, verify URL updates and results change. |
| Artist page live data section test | The MusicBrainz proxy (/api/artist/[mbid]/releases) is called async from artist pages. Verifying it returns in the page is important. | MEDIUM | On artist page, wait for .releases or equivalent selector, not just h1. |
| Time Machine API contract test | /api/time-machine?year=1990 is a parameterized endpoint with year validation. Test boundary cases. | LOW | year=1990 → 200 + { artists: Array, year: 1990 }. year=1800 → 400 (out of range). |
| /api/search mode=tag test | The search API has two modes (artist and tag). Only artist mode is tested via the UI. Tag mode is untested. | LOW | GET /api/search?q=electronic&mode=tag, verify { results: Array, mode: 'tag' }. |
| Unfurl POST API test | /api/unfurl is a POST endpoint — not currently tested at all. | LOW | POST with valid URL → 200 + { url, title }. POST with non-Mercury URL → 400. POST with no body → 400. |
| Curator-feature API validation | /api/curator-feature has complex parameter validation (MBID format, handle regex, source enum). | LOW | Missing curator → 400. Invalid handle format → 400. Valid params → 200. |

### Anti-Features (Over-Testing Traps)

Test categories that seem valuable but create more problems than they solve in this specific context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full end-to-end Tauri desktop automation with WebDriver | "Test the actual desktop app, not just the web" | Tauri WebDriver requires a running compiled binary, which requires Rust compilation (~14GB, 15+ minutes). Completely incompatible with the "run before every phase" goal. False skip vs genuine unautomatable split gets muddied. | Code checks for Rust command registration. Protocol handler logic tested via code check. Mark actual desktop interaction (audio, OS dialogs) as genuine skips with specific reasons. |
| Visual regression screenshots | "Catch CSS regressions" | The OKLCH taste theming changes every user's palette dynamically. Screenshots of the same page will differ per run. Screenshot diffing requires a stable baseline that doesn't exist here. | Test that CSS custom properties are set (JS evaluation), not visual appearance. |
| MusicBrainz API live tests | "Test that artist profiles actually load data" | MusicBrainz rate-limits at 1 req/sec. A test suite that hits the live MB API will be slow, flaky (network), and potentially rate-limited. The Radiohead debugging session showed MusicBrainz data loads fine — it's the navigation crash that was the bug. | Test the proxy endpoint shape with a known-good MBID using caching. Accept that live MB data is an integration concern, not a unit/smoke concern. |
| Nostr communication layer E2E tests | "Prove DMs and rooms work" | Nostr requires live relay connection, ephemeral keys, and another connected client. All of this is network-dependent and non-deterministic. | Code checks verify NDK integration exists. Relay connectivity is genuinely unautomatable — mark as skip with explicit reason. |
| AI model inference tests | "Prove the AI actually recommends things" | llama.cpp inference requires the model to be downloaded (~2GB), the sidecar to be running, and takes 5-30 seconds per inference. A test that takes 30s and requires 2GB of setup is not a CI-compatible test. | Code check: sidecar command registration exists, model download path exists. Actual inference is a genuine skip. |
| Accessibility audits (axe-core, WAVE) | "Comprehensive a11y" | Axe-core fails on dynamic content (D3 SVGs, force simulations) with generic "SVG has no aria-label" violations. These are low-severity and known. Axe audits on every page would generate 50+ known violations, obscuring real failures. | Spot-check specific a11y patterns: search input has label, nav has aria-landmark, focus management after navigation. Not wholesale axe scan. |
| Performance benchmarks (LCP, FID, CLS) | "Prove it's fast" | Performance metrics are environment-dependent. Playwright's headless Chromium on a Windows dev machine will show different Core Web Vitals than Cloudflare Pages production. Benchmarks that can't be compared to a stable baseline are noise. | Verify page loads complete (networkidle) within reasonable timeout (15s). That's the practical threshold, not Core Web Vitals. |

---

## Feature Dependencies

```
Console Error Capture
    └──enables──> All other web tests being meaningful
                  (without capture, silent crashes = false passes)

API Contract Tests
    └──requires──> Wrangler dev server running (:8788)
    └──enables──> Confidence in UI tests (know data layer works)

Multi-Step Navigation Flows
    └──requires──> Console error capture (so flow failures are visible)
    └──requires──> Wrangler dev server running

Error State Tests
    └──requires──> API contract tests (know what valid looks like first)

Tauri code checks
    └──no browser dependency
    └──enables──> Confidence in Rust command layer without full desktop test
```

### Dependency Notes

- **Console error capture must come first.** Every existing Playwright test currently suppresses console errors silently. Adding capture to the existing runner makes all current tests stronger without writing new tests. This is the highest-leverage single change.
- **API contract tests are independent of UI tests.** They use `fetch()` directly, don't need Playwright, and can run even without the full wrangler dev server (using `--code-only`). Consider a third runner type: `api`.
- **Navigation flows require the whole stack.** They need wrangler + the D1 test database populated. They're the last things to add, not the first.

---

## MVP Definition

### Phase 1: Capture Silent Failures (Must Ship First)

The single highest-value change. Makes all 23 existing Playwright tests actually catch crashes.

- [x] Console error capture in web.mjs runner — collect `pageerror` and `console.error` events, fail test if app-level errors detected
- [x] Tauri protocol handler code check (P2-era gap: the `__data.json` fix has no test)
- [x] New & Rising page web test (P12 was code-only — `dev` gap)
- [x] Scenes page web test (P10 was code-only)

### Phase 2: API Contract Layer

Proves the data plumbing works, independent of UI.

- [x] /api/search contract: `{ results: Array, query: string, mode: string }`, status 200
- [x] /api/search empty query: `{ results: [] }`, not error
- [x] /api/new-rising contract: `{ newArtists: Array, gainingTraction: Array }`, status 200
- [x] /api/genres contract: `{ nodes: Array, edges: Array }`, status 200
- [x] /api/scenes contract: `{ scenes: Array }`, status 200
- [x] /api/time-machine?year=1990: `{ artists: Array, year: 1990 }`, status 200
- [x] /api/time-machine year out of range: status 400
- [x] /api/unfurl POST valid URL: status 200, has `url` field
- [x] /api/unfurl POST no body: status 400
- [x] /api/curator-feature missing curator: status 400
- [x] /api/rss/artist/[slug] Content-Type: application/rss+xml, body contains `<rss`
- [x] /api/rss/new-rising: valid RSS XML
- [x] /api/artist/[mbid]/releases with invalid MBID: status 400

### Phase 3: Navigation Flow Tests

Multi-step user journeys that cover the actual paths users take.

- [x] Search → click artist card → artist page loaded with correct name
- [x] Artist page → click tag link → /discover?tags= with results
- [x] /discover tag filter → URL updated, results filtered to tag
- [x] /kb genre click → genre detail page (or graceful 404, not crash)
- [x] Embed route: /embed/artist/aphex-twin loads, has artist name, no console errors

### Add After Validation

- [ ] Tag intersection navigation (add second tag, URL updates)
- [ ] /api/search mode=tag contract test
- [ ] /api/artist/[mbid]/links endpoint test
- [ ] RSS Atom format: ?format=atom returns application/atom+xml
- [ ] Curator-feature CORS headers on OPTIONS: Access-Control-Allow-Origin: *

### Future Consideration

- [ ] SoundCloud oEmbed proxy test — depends on external SoundCloud oEmbed API being up
- [ ] /api/rss/collection and /api/rss/curator feeds — require populated curator_features table
- [ ] Playwright accessibility spot-checks (focus management, input labels)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Console error capture in runner | HIGH (makes all 23 tests meaningful) | LOW (3 lines in web.mjs) | P1 |
| API contract tests (all 13 endpoints) | HIGH (proves data layer) | MEDIUM (new `api` runner or fetch in web tests) | P1 |
| Tauri __data.json handler code check | HIGH (covers the actual crash fix) | LOW (1 fileContains check) | P1 |
| New & Rising + Scenes page web tests | MEDIUM (fills P10/P12 web gaps) | LOW (2 new web test entries) | P1 |
| Multi-step navigation flows | HIGH (catches real integration bugs) | MEDIUM (3-4 Playwright flows) | P2 |
| Embed route web test | MEDIUM (external bloggers depend on it) | LOW (1 web test) | P2 |
| RSS content validation | MEDIUM (RSS readers depend on it) | LOW (fetch + header check) | P2 |
| Error state tests (404, bad params) | HIGH (error paths are where crashes hide) | LOW-MEDIUM (mix of API + web) | P2 |
| Tag intersection flow | MEDIUM (core discovery mechanic) | MEDIUM (Playwright multi-step) | P3 |
| Console error allowlist/threshold | LOW-MEDIUM (reduces false failures from 3rd party) | MEDIUM (pattern matching logic) | P3 |
| Axe a11y spot-checks | LOW (specific patterns only) | MEDIUM | P3 |
| Nostr relay connectivity | LOW (network-dependent) | HIGH (requires live relay) | Skip |
| AI inference testing | LOW (setup too heavy) | HIGH (model download required) | Skip |
| Visual regression screenshots | LOW (theming makes baseline unstable) | HIGH | Skip |
| Full Tauri WebDriver automation | LOW (Rust compile time too high) | VERY HIGH | Skip |
| MusicBrainz live API tests | LOW (rate-limit risk, already proxied) | MEDIUM | Skip |

---

## The Automatable / Not-Automatable Boundary

This is the most important thing to get right. False skips waste future effort. Missing the boundary causes test suite bloat or gaps.

### Definitively Automatable

Everything in the table stakes and differentiators sections above. Key insight: **"requires Tauri" does not mean "skip."** It means use a code check instead of a Playwright test. The Tauri binary doesn't have to be running to verify that `lib.rs` registers a command.

| Category | Method | Why |
|----------|--------|-----|
| API endpoint existence | code (fileExists) | File must exist for endpoint to work |
| API response shape | api (fetch) | HTTP against wrangler, no browser needed |
| Page renders without crash | web (Playwright + error capture) | Browser required, but headless works |
| Multi-step navigation | web (Playwright) | Requires browser navigation |
| Rust command registration | code (fileContains) | Command must appear in lib.rs invoke handler |
| DB schema (table names) | code (fileContains in taste_db.rs) | Schema in source, not runtime |
| Component existence | code (fileExists) | File must exist to be importable |
| Build passes (TypeScript) | build (npm run check) | No browser, no network |
| RSS XML structure | api (fetch + string check) | HTTP response, no browser |

### Definitively Not Automatable

The genuine skips. These are not "hard to automate" — they are impossible without a running desktop app interacting with real OS or hardware.

| Skip Reason | Why Genuinely Unautomatable |
|-------------|---------------------------|
| Audio playback (Player.svelte) | Requires OS audio system + hardware output. No headless equivalent. |
| Library folder scan (scan_folder command) | Requires real filesystem folder with music files on the user's machine. Fixture-based workaround would need Rust test harness, out of scope. |
| OS save dialog (PNG export) | Native OS dialog, no web automation API can interact with it. |
| Spotify PKCE OAuth | Requires a real Spotify account + browser redirect + human authorization. |
| Panel drag-to-resize (PaneForge) | Requires native Tauri window with actual mouse drag — headless Playwright can't interact with Tauri native window chrome. |
| AI model download + inference | Requires ~2GB model file, llama.cpp sidecar to start, and 5-30s inference time. Not CI-compatible. |
| Nostr DM delivery | Requires two connected clients on live relay. Non-deterministic. |
| Taste theming (OKLCH hue shift) | Visual — can code-check that the function exists, but verifying the actual rendered hue requires a human eye or unstable screenshot diff. |

### The Gray Zone (Case by Case)

| Item | Assessment | Recommendation |
|------|------------|----------------|
| MusicBrainz proxy response (artist releases) | Automatable but flaky (live API, rate limit). | Code check that the route exists + API test with a known-cached MBID. Accept that live data is an integration concern. |
| First-run database setup flow | DatabaseSetup.svelte exists (code check done). Actual first-run flow requires empty app data dir. | Code check only. The flow is low-risk — it's a file-copy UI. |
| Nostr connection (NDK init) | Can test that NDK is imported and initialized, not that it connects. | Code check for NDK import in comms module. Connection is skip. |
| SoundCloud oEmbed proxy | Route exists (code check done). Live test requires SoundCloud oEmbed API to be up. | Code check only. External API availability is not Mercury's concern to test. |

---

## What the Test Suite Should Look Like After This Milestone

**Current state:** 62 tests. 23 web (page loads). 38 code (file/grep). 7 skips. No API tests. No console capture. No flows.

**Target state after v1.2:**

| Category | Count | Method | New? |
|----------|-------|--------|------|
| Code checks (file + grep) | ~42 | code | +4 (Tauri handler, 3 new P13+ checks) |
| Build check | 1 | build | no |
| Web page load tests | ~27 | web | +4 (new-rising, scenes, embed, about) |
| Web navigation flow tests | ~5 | web | +5 all new |
| API contract tests | ~13 | api (new method) or web | +13 all new |
| Genuine skips | ~7 | skip | same |
| **Total** | **~95** | | **+33** |

The 33 new tests close every identified gap without crossing into diminishing-returns territory.

---

## Sources

- Direct analysis: `D:/Projects/Mercury/tools/test-suite/manifest.mjs` (existing 62 tests)
- Direct analysis: `D:/Projects/Mercury/tools/test-suite/runners/web.mjs` (console error suppression gap identified at lines 23-24)
- Direct analysis: all 15 API endpoints in `src/routes/api/**` (response shapes, error handling)
- Direct analysis: `src/routes/**/*.svelte` (22 routes, cross-referenced against test coverage)
- Direct analysis: `src-tauri/src/lib.rs` (Tauri protocol handler, command registration)
- Project context: `D:/Projects/Mercury/.planning/PROJECT.md` (milestone definition, what "complete" means)

---
*Feature research for: Mercury v1.2 — Complete Test Automation*
*Researched: 2026-02-23*
