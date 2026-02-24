# Requirements: Mercury v1.2 — Zero-Click Confidence

**Defined:** 2026-02-23
**Core Value:** Every feature, route, and user flow is verifiable without manual intervention — provably working without Steve clicking a single button.

---

## v1.2 Requirements

### INFRA — Foundation Fixes

Fix the active defects in the existing test infrastructure before expanding coverage. Every new test written before these are fixed inherits the defects.

- [x] **INFRA-01**: Console errors auto-detected on every Playwright test — silent JS crashes auto-fail the suite (no more Radiohead scenarios passing silently)
- [x] **INFRA-03**: D3 animation tests use `data-ready` signals instead of hardcoded `waitForTimeout` — flaky timing-dependent tests eliminated
- [x] **INFRA-04**: New tests use `data-testid` attributes instead of CSS class selectors — tests survive style refactors

### API — Contract Coverage

Every endpoint proven to return the right shape, independent of the UI layer.

- [ ] **[DEFERRED → v1.3] API-01**: Every JSON API endpoint has a fetch-based contract test validating response shape, required fields, and correct status codes
- [ ] **[DEFERRED → v1.3] API-02**: API error states tested — invalid params, missing required fields, out-of-range values all return graceful responses (not crashes)
- [ ] **[DEFERRED → v1.3] API-03**: RSS feed endpoints return valid XML with correct Content-Type headers
- [ ] **[DEFERRED → v1.3] API-04**: POST `/api/unfurl` has a contract test (only POST endpoint, currently zero coverage)

### E2E — Tauri End-to-End Testing

Key user flows driven through the real running Tauri app via Playwright CDP.

- [x] **E2E-01**: Playwright CDP runner connects to running Tauri app (WebView2) without installing new test frameworks — Playwright already present, CDP via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`
- [x] **E2E-02**: Fixture DB (`tools/test-suite/fixtures/mercury-test.db`) is seeded with 15 known artists/tags; tests are deterministic and isolated from the real user DB
- [x] **E2E-03**: App launch smoke tests pass — window title, homepage, Settings and About pages load without error
- [x] **E2E-04**: Search → artist page flow passes with fixture DB — "radiohead" returns results, clicking navigates to `/artist/radiohead` with correct name and tags
- [x] **E2E-05**: Discovery flow (tag filter) and error paths (unknown route, empty search) pass

### FLOW — Navigation Flows

Multi-step user journeys tested end-to-end, not just static page loads.

- [ ] **FLOW-01**: Search → click artist → navigate to a second artist — no crash, no console.error throughout the full journey
- [ ] **FLOW-02**: Artist page → click a tag → tag discovery page loads with results
- [ ] **FLOW-03**: Error states navigate correctly — 404 routes render error page, empty search renders empty state UI (not blank screen)
- [ ] **FLOW-04**: Navigation flow tests verify loading indicator lifecycle — appears on click, clears on completion (catches both "nothing happened" and "got stuck")

### RUST — Rust Unit Tests

Rust logic verified in isolation, without compiling the full Tauri binary.

- [ ] **RUST-01**: FTS5 query sanitization function tested in isolation (`mercury_db.rs`) — edge cases, empty input, special characters
- [ ] **RUST-02**: `__data.json` protocol handler logic tested in isolation (`lib.rs`) — correct JSON returned for SvelteKit data paths
- [ ] **RUST-03**: Scanner metadata parsing tested with synthetic input (`scanner/mod.rs`) — title, artist, album, year extracted correctly

### UX — Loading States

Every interaction gives immediate animated feedback, making frozen states visually and programmatically distinguishable from loading states.

- [x] **UX-01**: Global animated top-bar progress indicator appears on every navigation click, immediately — before any network request is sent (YouTube/NProgress style, thin bar at top of viewport)
- [x] **UX-02**: Loading indicator is always motion-based (animated, never static) — a frozen animation means a frozen app, not a loading one
- [x] **UX-03**: Loading indicator clears automatically when navigation completes or errors out
- [x] **UX-04**: Web and desktop (Tauri) both show the indicator — SvelteKit's `$navigating` store drives web, equivalent Tauri navigation events drive desktop

### PROC — Process Gate

Prevents future regressions from being committed or shipped.

- [ ] **PROC-01**: Pre-commit hook runs `--code-only` tests on every commit (2–5s, gates every commit automatically)
- [x] **PROC-02**: Full test suite must be green before any new phase begins execution — not advisory, a hard gate
- [ ] **PROC-03**: Every future phase plan includes a mandatory TEST-PLAN section specifying tests to be written — tests are defined before code, not after

---

## Future Requirements (v1.3+)

### Deferred Test Coverage

- Visual regression screenshots — OKLCH taste theming shifts dynamically; no stable baseline exists in v1.2
- Vitest component tests — no existing unit tests to migrate; Svelte 5 rune support requires complex browser mode setup, defer until there's a concrete test to write
- Tauri WebDriver (tauri-driver) — fragile Edge version coupling on Windows, no macOS support; `cargo test` covers the meaningful Rust logic
- MusicBrainz live API tests — rate-limited, network-dependent; the proxy routes are already verified structurally by API contract tests
- Nostr relay connectivity tests — requires two live clients, non-deterministic by nature

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Audio playback testing | Requires audio hardware; genuinely unautomatable |
| OAuth flow testing with real accounts | Requires live Spotify/Apple credentials; security boundary |
| AI model inference testing | 2GB model download; CI-incompatible |
| Nostr relay delivery verification | Non-deterministic; external network state |
| OS native dialog testing (file picker, save dialog) | OS-level UI outside WebView; genuinely unautomatable |
| tauri-driver / WebDriver for Tauri | No macOS support, fragile Edge version matching on Windows, 15-min compile per run |
| Husky | Redundant — project already has working `.githooks/` with `core.hooksPath` configured |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 13 Plan 01 | Complete |
| INFRA-02 | Phase 13 | Pending |
| INFRA-03 | Phase 13 | Complete |
| INFRA-04 | Phase 13 | Complete |
| WEB-01 | Phase 13 | Pending |
| WEB-02 | Phase 13 | Pending |
| WEB-03 | Phase 13 | Pending |
| UX-01 | Phase 13 | Complete |
| UX-02 | Phase 13 | Complete |
| UX-03 | Phase 13 | Complete |
| UX-04 | Phase 13 | Complete |
| PROC-02 | Phase 13 Plan 01 | Complete |
| API-01 | Phase 14 (deferred → v1.3) | Deferred |
| API-02 | Phase 14 (deferred → v1.3) | Deferred |
| API-03 | Phase 14 (deferred → v1.3) | Deferred |
| API-04 | Phase 14 (deferred → v1.3) | Deferred |
| E2E-01 | Phase 14 | Complete |
| E2E-02 | Phase 14 | Complete |
| E2E-03 | Phase 14 | Complete |
| E2E-04 | Phase 14 | Complete |
| E2E-05 | Phase 14 | Complete |
| FLOW-01 | Phase 15 | Pending |
| FLOW-02 | Phase 15 | Pending |
| FLOW-03 | Phase 15 | Pending |
| FLOW-04 | Phase 15 | Pending |
| RUST-01 | Phase 15 | Pending |
| RUST-02 | Phase 15 | Pending |
| RUST-03 | Phase 15 | Pending |
| PROC-01 | Phase 15 | Pending |
| PROC-03 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 30 total (25 original + 5 E2E; 4 API deferred to v1.3)
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-24 — Phase 14 replaced API Contract Layer with Tauri E2E; API-01–API-04 deferred to v1.3; E2E-01–E2E-05 added*
