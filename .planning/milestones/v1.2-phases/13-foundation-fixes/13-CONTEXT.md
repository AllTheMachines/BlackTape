# Phase 13: Foundation Fixes - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Repair the test suite so it can be trusted as a gate: detect silent JS crashes, eliminate flaky timing in D3 tests, add a navigation progress indicator for Tauri desktop. This phase is Tauri-desktop-only — web/Playwright/wrangler requirements are being removed from scope (see Deferred section).

</domain>

<decisions>
## Implementation Decisions

### Progress Bar — Appearance
- Thin top-of-page line (NProgress / GitHub / YouTube style)
- Color: Mercury accent color (amber/gold from the theme)
- Animation: Slides to ~80%, then jumps to 100% on completion, then fades out
- Tauri desktop only — no web version

### Progress Bar — Triggers
- Show on everything that needs to be loaded (route changes AND async data loads)
- Show on all navigation events including back/forward
- Clear when all content is loaded (waits for data-ready signal, not just DOM-ready)
- Minimum display time of ~150–200ms to avoid a flash on very fast loads

### console.error Detection
- Global to all tests — any console.error auto-fails the test, zero exceptions
- Everything fails: no filtering of third-party libraries or Tauri internals
- Failed test output must include the full console.error message for debugging

### D3 Readiness Signal
- Fail with a clear "data-ready timeout" message if signal is never set (not a generic hang)

### Claude's Discretion
- How to handle tests that intentionally test error states (suppress/mock console.error in test code, or allowList mechanism — Claude picks what keeps the suite cleanest)
- When exactly to set data-ready: after DOM render vs after animation complete
- Which element receives the data-ready attribute (chart container or page wrapper)
- Whether data-ready is standardized to all pages or only D3 chart pages

</decisions>

<specifics>
## Specific Ideas

- "Everything that needs to be loaded" — progress bar is a loading state indicator, not just a route transition indicator
- Zero tolerance for console.errors — silent crashes can no longer pass the suite undetected

</specifics>

<deferred>
## Deferred Ideas

- **Remove web/Playwright/wrangler from the project entirely** — Major architectural pivot decided 2026-02-24: Mercury is Tauri-desktop-only, no web version. This means:
  - WEB-01, WEB-02, WEB-03 requirements in Phase 13 are obsolete
  - INFRA-02 (wrangler environment check) is obsolete
  - The 23 Playwright web tests in `tools/test-suite/` need removal
  - CLAUDE.md references to Cloudflare Pages, D1, wrangler need updating
  - ARCHITECTURE.md web hosting section needs removal
  - This cleanup should happen before or alongside Phase 13 execution

</deferred>

---

*Phase: 13-foundation-fixes*
*Context gathered: 2026-02-24*
