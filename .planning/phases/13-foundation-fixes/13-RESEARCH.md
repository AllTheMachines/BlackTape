# Phase 13: Foundation Fixes - Research

**Researched:** 2026-02-24
**Domain:** Test infrastructure repair + Tauri desktop progress indicator
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Progress Bar — Appearance**
- Thin top-of-page line (NProgress / GitHub / YouTube style)
- Color: Mercury accent color (amber/gold from the theme)
- Animation: Slides to ~80%, then jumps to 100% on completion, then fades out
- Tauri desktop only — no web version

**Progress Bar — Triggers**
- Show on everything that needs to be loaded (route changes AND async data loads)
- Show on all navigation events including back/forward
- Clear when all content is loaded (waits for data-ready signal, not just DOM-ready)
- Minimum display time of ~150–200ms to avoid a flash on very fast loads

**console.error Detection**
- Global to all tests — any console.error auto-fails the test, zero exceptions
- Everything fails: no filtering of third-party libraries or Tauri internals
- Failed test output must include the full console.error message for debugging

**D3 Readiness Signal**
- Fail with a clear "data-ready timeout" message if signal is never set (not a generic hang)

### Claude's Discretion
- How to handle tests that intentionally test error states (suppress/mock console.error in test code, or allowList mechanism — Claude picks what keeps the suite cleanest)
- When exactly to set data-ready: after DOM render vs after animation complete
- Which element receives the data-ready attribute (chart container or page wrapper)
- Whether data-ready is standardized to all pages or only D3 chart pages

### Deferred Ideas (OUT OF SCOPE)
- **Remove web/Playwright/wrangler from the project entirely** — Major architectural pivot decided 2026-02-24: Mercury is Tauri-desktop-only, no web version. This means:
  - WEB-01, WEB-02, WEB-03 requirements in Phase 13 are obsolete
  - INFRA-02 (wrangler environment check) is obsolete
  - The 23 Playwright web tests in `tools/test-suite/` need removal
  - CLAUDE.md references to Cloudflare Pages, D1, wrangler need updating
  - ARCHITECTURE.md web hosting section needs removal
  - This cleanup should happen before or alongside Phase 13 execution
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Console errors auto-detected on every test — silent JS crashes auto-fail the suite | Playwright `page.on('console')` event + `page.on('pageerror')` — hook into both at context level, collect errors per test |
| INFRA-03 | D3 animation tests use `data-ready` signals instead of hardcoded `waitForTimeout` | Playwright `page.waitForSelector('[data-ready]')` — component sets attribute after `simulation.tick()` and DOM update |
| INFRA-04 | New tests use `data-testid` attributes instead of CSS class selectors | Playwright `getByTestId()` or `[data-testid="x"]` selectors — test-stable, survive style refactors |
| UX-01 | Global animated top-bar progress indicator appears on every navigation click | SvelteKit `$navigating` store already imported in `+layout.svelte`; existing `.loading-bar` CSS exists; needs Tauri-specific navigation trigger |
| UX-02 | Loading indicator is always motion-based (animated, never static) | CSS `animation` on the bar element — frozen animation = frozen app diagnostic |
| UX-03 | Loading indicator clears automatically when navigation completes or errors out | `data-ready` signal drives clear; minimum display timer (150–200ms) prevents flash |
| UX-04 | Web and desktop both show indicator — `$navigating` drives web, equivalent Tauri events drive desktop | Tauri-only: needs custom progress state module since `$navigating` doesn't cover Tauri's `invoke()`-based data loads |
| PROC-02 | Full test suite must be green before any new phase begins execution | Current suite has web tests that won't run without wrangler; cleanup of web tests is prerequisite for a green baseline |
</phase_requirements>

## Summary

Phase 13 has two independent work streams: (1) repair the test suite's reliability infrastructure, and (2) add a Tauri desktop navigation progress indicator. Both are self-contained and can be planned as separate plan files.

The test suite repairs are the higher-priority work stream. The current web runner at `tools/test-suite/runners/web.mjs` silences all console events (`page.on('console', () => {})`) and ignores page errors (`page.on('pageerror', () => {})`). This means a JS crash that would visibly break the UI passes the suite silently. The "Radiohead scenario" referenced in requirements is exactly this: a page-level JS exception that the suite doesn't catch. Fixing this requires capturing console.error and pageerror events per test and failing the test if either fires.

The D3 timing issue comes from hardcoded `waitForTimeout()` calls in the test manifest (2000ms for `/kb`, 3000ms for `/style-map`, 4000ms for the genre graph SVG check). These are fragile and slow. The correct pattern is to set a `data-ready` attribute on the container element after the D3 `simulation.tick()` call completes and Svelte has updated the DOM, then use `page.waitForSelector('[data-ready]')` in the test.

The progress indicator for Tauri desktop is a UX addition. The layout already has the mechanism: `$navigating` from `$app/stores` drives a `.loading-bar` div (see `+layout.svelte` lines 102–104). However, `$navigating` only covers SvelteKit router transitions, not async `invoke()` data loads that happen inside Tauri pages after navigation completes. The user decision requires showing the bar for "everything that needs to be loaded," which means extending the system with a writable store that page-level `onMount` callbacks can set.

**Primary recommendation:** Do the web-test removal and console.error capture first (they unblock PROC-02 and enable a true green baseline), then add `data-ready` signals to D3 components, then implement the Tauri progress bar as the last plan.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | ^1.58.2 (already installed) | Browser automation for console/error capture | Already in project; `page.on('console')` and `page.on('pageerror')` are stable APIs |
| SvelteKit `$app/stores` | (bundled with SvelteKit ^2.50.2) | `$navigating` reactive store for route transitions | Already imported in layout; the canonical SvelteKit navigation signal |
| Svelte 5 `$state` / writable store | (bundled) | Custom progress bar state for Tauri data-load signals | `progressState.svelte.ts` pattern matches existing state modules (aiState, layoutState) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | No new packages required | All capabilities exist in Playwright + SvelteKit APIs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `data-ready` attribute | NProgress npm package | NProgress adds a dependency and assumes web; project already has the CSS pattern, just needs the trigger wired correctly |
| Per-test console capture | Global context-level capture | Context-level capture is simpler but loses which test caused which error; per-test capture (collect errors into array, fail if non-empty) is cleaner |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Pattern 1: Console Error Capture per Test (INFRA-01)

The current `web.mjs` runner suppresses all console events. The fix is to collect console errors per test page and fail if any are captured.

**What:** Before calling `test.fn(page)`, attach listeners that push to a local array. After `test.fn` resolves, check the array.

**Example (web.mjs change):**
```javascript
// In runWebTests(), replace:
page.on('console', () => {});
page.on('pageerror', () => {});

// With:
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', err => {
  consoleErrors.push(err.message);
});

// After test.fn(page) resolves, before push to results:
if (consoleErrors.length > 0 && passed) {
  passed = false;
  error = `console.error: ${consoleErrors[0]}`;
}
```

**Claude's discretion — intentional error state tests:** The cleanest approach is to pass an `allowConsoleErrors: true` flag in the test object definition. Tests that intentionally navigate to error states (e.g., 404 pages) opt out explicitly. The runner checks this flag before failing. No global allowlist; the opt-out is per test.

### Pattern 2: data-ready Signal for D3 Components (INFRA-03)

**What:** After `simulation.tick()` completes synchronously and Svelte updates the DOM, set a `data-ready` attribute on the container element.

**Where to set it:** On the outermost container `<div>` of the D3 component (e.g., `<div bind:this={container} data-ready={layoutNodes.length > 0 ? 'true' : undefined}>`).

**When to set it:** After `layoutNodes = settled` (the final assignment). With Svelte 5 reactivity, `$state` updates are synchronous within the tick; the attribute will be present in the DOM on the next microtask. This is *after* DOM render, *before* animation completion — which is correct, since the animation is CSS-only (no JS state changes after the assignment).

**Components affected:**
- `src/lib/components/StyleMap.svelte` — `simulation.tick(500)` → `layoutNodes = settled` at line 85
- `src/lib/components/GenreGraph.svelte` — `simulation.tick(300)` at line 97
- `src/lib/components/TasteFingerprint.svelte` — `simulation.tick(300)` at line 75

**Test-side usage:**
```javascript
// Replace:
await page.waitForTimeout(3000); // D3 simulation takes time

// With:
await page.waitForSelector('[data-ready="true"]', { timeout: 15000 });
// If timeout fires: error message = "data-ready timeout — D3 component never signaled completion"
```

**Which element:** The component's root container div is the right choice — it's always present in the DOM before the simulation runs, and setting it directly eliminates the need for a wrapper query.

**Standardization scope:** Apply `data-ready` only to D3 chart pages (`/style-map`, `/kb`, `/time-machine`), not to all pages. Non-D3 pages use `waitForSelector` on meaningful content elements. Expanding to all pages is over-engineering for this phase.

### Pattern 3: data-testid Attributes (INFRA-04)

**What:** New tests in Phase 13 use `data-testid` instead of CSS class selectors.

**Approach:** When the Phase 13 plan adds new code checks (for progress bar, data-ready, etc.), the test assertions use `data-testid` where applicable. Existing Phase 2–12 tests are not retrofitted (out of scope for this phase — that would require touching all source components).

**Example for progress bar test:**
```svelte
<!-- In +layout.svelte -->
<div class="loading-bar" data-testid="nav-progress-bar" aria-hidden="true"></div>
```

```javascript
// In test:
const bar = await page.locator('[data-testid="nav-progress-bar"]');
```

### Pattern 4: Tauri Desktop Progress Indicator (UX-01 through UX-04)

**Current state:** The layout already has a working progress bar for web:
```svelte
{#if $navigating}
  <div class="loading-bar" aria-hidden="true"></div>
{/if}
```

The `.loading-bar` CSS is already defined with a `loading-slide` keyframe animation. The issue: `$navigating` is null in Tauri after SvelteKit router navigation completes but while Tauri `invoke()` calls are still in flight inside `+page.ts` universal load functions.

**Required extension:** A writable `navProgress` state module that Tauri pages can use to extend the bar's visibility past the SvelteKit router event.

**Pattern (new file `src/lib/nav-progress.svelte.ts`):**
```typescript
// Writable state: true = show bar, false = hide
export let navProgress = $state({ active: false });
let _minTimer: ReturnType<typeof setTimeout> | null = null;

export function startProgress() {
  navProgress.active = true;
}

export function completeProgress() {
  // Minimum display time: 150ms to prevent flash on fast loads
  _minTimer = setTimeout(() => {
    navProgress.active = false;
    _minTimer = null;
  }, 150);
}
```

**Layout integration (Tauri-only):**
```svelte
{#if $navigating || (tauriMode && navProgress.active)}
  <div class="loading-bar" data-testid="nav-progress-bar" aria-hidden="true"></div>
{/if}
```

**Page-level usage (example in `+page.ts` universal load):**
```typescript
import { isTauri } from '$lib/platform';
import { startProgress, completeProgress } from '$lib/nav-progress.svelte';

export async function load({ params }) {
  if (isTauri()) startProgress();
  try {
    // ... existing load logic ...
    return { data };
  } finally {
    if (isTauri()) completeProgress();
  }
}
```

**Animation — NProgress style:** The user decision specifies "slides to ~80%, then jumps to 100% on completion, then fades out." The current CSS does a full sweep animation. For the NProgress style, the correct approach is:

1. On `startProgress()`: add a CSS class that animates width from 0% to 80% (3-second ease-out, gives illusion of loading)
2. On `completeProgress()`: switch to a CSS class that instantly sets width to 100%, then triggers fade-out with opacity 0 over 200ms

This requires changing from the current `scaleX` transform animation to a `width` + `opacity` two-phase animation, OR using a CSS custom property that JS writes to. The `$state`-based approach that drives a CSS class toggle is cleanest in Svelte 5.

**Back/forward navigation:** SvelteKit's `$navigating` store fires for browser history navigation. Tauri's `history.back()` button calls `history.back()` (line 110 in layout), which triggers SvelteKit router — so `$navigating` fires. No special handling needed for back/forward.

**data-ready as completion signal:** The progress bar should stay active until `data-ready` is set on the page's main content, not just until the load function resolves. However, the current `+page.ts` universal load functions do all DB/API work in `load()` — by the time the page component mounts, data is available. Setting `completeProgress()` in `finally {}` of the load function is the correct trigger point, because SvelteKit awaits the load function before rendering the page component.

### Anti-Patterns to Avoid
- **Hardcoded waitForTimeout:** Any test that passes because of a timing assumption will fail on slow CI. Replace all four instances in `manifest.mjs` with `waitForSelector` on content or `data-ready`.
- **Global console.error allowlist pre-populated:** The STATE.md decision is explicit: "console allowlist starts empty — entries added consciously after first run." Do not add any entries preemptively.
- **Playwright `networkidle` for D3 pages:** The style-map and kb tests already use this, but `networkidle` is unreliable and slow. The `data-ready` pattern replaces it.
- **NProgress npm package:** Adds a dependency with its own CSS. The existing `.loading-bar` CSS in the layout is sufficient; just extend the state control.
- **Applying data-testid retrofits to all existing tests:** Out of scope. INFRA-04 says new tests use data-testid, not that old tests must be refactored.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Console error capture | Custom console intercept | Playwright's `page.on('console')` and `page.on('pageerror')` | Native browser-level capture, catches errors that `console.error` interception misses |
| Progress bar animation timing | JavaScript timer that polls DOM | CSS animation + `$state` reactive toggle | CSS handles all timing; JS just toggles a boolean |
| D3 completion detection | Polling `layoutNodes.length` in a `setInterval` | Svelte 5 reactive `$state` update that drives `data-ready` attribute | D3 `simulation.tick()` is synchronous; the assignment is immediate |

**Key insight:** All three problems (console capture, progress animation, D3 readiness) have existing, simple solutions in Playwright and SvelteKit APIs. No new packages needed.

## Common Pitfalls

### Pitfall 1: console.error Capture Races
**What goes wrong:** `pageerror` event fires after `test.fn(page)` resolves if the error is triggered by an async operation (e.g., a failed fetch that logs to console inside a `catch`).
**Why it happens:** Playwright's page event listeners are asynchronous; some console output happens after the test assertion.
**How to avoid:** After `test.fn(page)` resolves, add a brief `await page.waitForTimeout(200)` (or `waitForLoadState('networkidle', {timeout: 2000}).catch(() => {})`) before checking `consoleErrors`. This gives pending async errors time to surface.
**Warning signs:** A test passes locally but fails when run in sequence with others due to timing.

### Pitfall 2: data-ready on Conditional Renders
**What goes wrong:** The D3 component only renders when data is non-empty (e.g., `{#if data.nodes.length === 0}` in `style-map/+page.svelte`). If the DB has no data, the `StyleMap` component never mounts, `data-ready` is never set, and the test times out.
**Why it happens:** The test waits for `[data-ready]` but the component never renders.
**How to avoid:** Either set `data-ready` on the page wrapper (not the D3 container) and include it unconditionally, or have the test first check for the empty state before waiting for `data-ready`. The cleanest fix: the page wrapper always gets `data-ready` — the component sets it after its init, the page sets it after determining data is absent.
**Warning signs:** Timeout rather than assertion failure.

### Pitfall 3: Svelte 5 — data-ready Attribute Reactivity
**What goes wrong:** Setting a `data-ready` attribute via a reactive expression in Svelte 5 may not reflect immediately if the assignment happens inside an `onMount` callback that runs after the component is already in the DOM.
**Why it happens:** `onMount` runs after the first DOM render but before Playwright can observe attribute changes if there's no explicit Svelte flush.
**How to avoid:** In Svelte 5, `$state` mutations are batched but synchronous within the same microtask. Setting `layoutNodes = settled` inside `onMount` is sufficient — Svelte will update the DOM before yielding to the event loop. `waitForSelector` will observe the attribute correctly.
**Warning signs:** `waitForSelector('[data-ready]')` times out even though the component renders correctly.

### Pitfall 4: Progress Bar Stuck (never clears)
**What goes wrong:** If `completeProgress()` is not called in a `finally` block and the load function throws, the progress bar stays visible forever.
**Why it happens:** Exception in load function skips the `completeProgress()` call.
**How to avoid:** Always use `try/finally` in load functions that call `startProgress()`.
**Warning signs:** Progress bar visible after an error state navigation.

### Pitfall 5: Web Test Removal Order
**What goes wrong:** Removing the 23 Playwright web tests before establishing a code-only baseline means the PROC-02 gate cannot be verified against a known state.
**Why it happens:** If web tests are removed and the remaining code tests have failures, it's unclear which failures are new vs pre-existing.
**How to avoid:** Run `node tools/test-suite/run.mjs --code-only` before removing web tests. Record the baseline pass count. Then remove web tests. Then verify code-only still passes at the same count.
**Warning signs:** "All tests passed" but fewer tests ran than expected.

## Code Examples

Verified patterns from codebase and Playwright API:

### Current web.mjs runner — problem section
```javascript
// tools/test-suite/runners/web.mjs (lines 22-23) — CURRENT (broken)
page.on('console', () => {});    // silences all console
page.on('pageerror', () => {});  // silences all page errors
```

### Fixed web.mjs runner — console capture
```javascript
// Collect per-test
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => {
  consoleErrors.push(err.message ?? String(err));
});

// After test.fn resolves:
await page.waitForTimeout(200); // allow async errors to surface
if (consoleErrors.length > 0 && passed !== false) {
  passed = false;
  error = `console.error detected: ${consoleErrors[0]}`;
}
```

### Test opt-out for intentional error states
```javascript
// In manifest.mjs test object:
{
  id: 'P7-03', phase: 7, area: 'Knowledge Base',
  desc: 'KB genre detail page renders without crashing (unknown slug shows 404)',
  method: 'web', url: '/kb/test-slug-that-does-not-exist',
  allowConsoleErrors: true,   // ← Claude's discretion: opt-out flag
  fn: async (page) => {
    await page.waitForLoadState('domcontentloaded');
    const text = await page.textContent('body');
    return text.length > 50;
  },
},
```

### data-ready attribute in StyleMap.svelte
```svelte
<!-- Container element -->
<div bind:this={container} class="style-map-container"
     data-ready={layoutNodes.length > 0 ? 'true' : undefined}>
  <svg ...>
    <!-- D3 nodes and edges rendered from layoutNodes -->
  </svg>
</div>
```
After `simulation.tick(500)` completes and `layoutNodes = settled` is assigned, Svelte 5 reactively sets `data-ready="true"`.

### Test using data-ready instead of waitForTimeout
```javascript
// Replace P6-05 in manifest.mjs:
{
  id: 'P6-05', phase: 6, area: 'Style Map',
  desc: '/style-map page loads and D3 renders',
  method: 'web', url: '/style-map',
  fn: async (page) => {
    // data-ready signals D3 simulation complete — no hardcoded timer
    await page.waitForSelector('[data-ready="true"]', { timeout: 15000 });
    const hasSvg = await page.locator('svg, canvas').count();
    return hasSvg > 0;
  },
},
```

### Tauri progress state module (new file)
```typescript
// src/lib/nav-progress.svelte.ts
export let navProgress = $state({ active: false, completing: false });

let _minTimer: ReturnType<typeof setTimeout> | null = null;

export function startProgress() {
  if (_minTimer) clearTimeout(_minTimer);
  navProgress.active = true;
  navProgress.completing = false;
}

export function completeProgress() {
  navProgress.completing = true;
  _minTimer = setTimeout(() => {
    navProgress.active = false;
    navProgress.completing = false;
    _minTimer = null;
  }, 180); // 180ms: above 150ms minimum, comfortable margin
}
```

### Layout integration (Tauri-specific bar condition)
```svelte
<!-- In +layout.svelte, replace the existing loading-bar block -->
{#if $navigating || (tauriMode && navProgress.active)}
  <div
    class="loading-bar"
    class:completing={tauriMode && navProgress.completing}
    data-testid="nav-progress-bar"
    aria-hidden="true"
  ></div>
{/if}
```

### CSS for NProgress-style animation
```css
/* Replace the current loading-slide animation in +layout.svelte */

/* Phase 1: advance to ~80% (appears while loading) */
.loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  z-index: 200;
  background: var(--text-accent);
  width: 80%;
  transition: width 0.1s ease-out;
  animation: loading-advance 3s ease-out forwards;
}

/* Phase 2: snap to 100% and fade */
.loading-bar.completing {
  animation: none;
  width: 100%;
  transition: width 0.1s ease-out, opacity 0.15s ease-out 0.1s;
  opacity: 0;
}

@keyframes loading-advance {
  from { width: 0%; }
  to   { width: 80%; }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitForTimeout(N)` for async content | `waitForSelector('[data-ready]')` | Standard Playwright practice since v1.10 | Eliminates timing-dependent failures |
| Suppress all console events | Capture + fail on console.error | Required by INFRA-01 | Catches silent crashes |
| `$navigating` only | `$navigating || navProgress.active` | Phase 13 adds this | Covers Tauri data-load gaps |

**Deprecated/outdated:**
- `page.waitForTimeout()` as primary wait mechanism: Playwright docs now recommend event-driven waits (`waitForSelector`, `waitForResponse`, `waitForURL`) over fixed timers.
- `networkidle` for pages with D3: SvelteKit with Tauri doesn't have a stable network idle state; D3 is synchronous after data load.

## Open Questions

1. **Should web tests be removed in Plan 1 or as a prerequisite before Plan 1?**
   - What we know: PROC-02 requires the suite to be green; web tests require wrangler; wrangler is being removed from the project.
   - What's unclear: Is the web-removal architectural pivot (from CONTEXT.md deferred section) in scope for Phase 13 execution?
   - Recommendation: Remove web tests as the first plan (Plan 1: "Clean up web infrastructure"), then console.error capture (Plan 2), then data-ready signals (Plan 3), then Tauri progress bar (Plan 4). This gives a clean PROC-02 gate after Plan 1.

2. **Does the Tauri `$navigating` store fire for history.back() navigation?**
   - What we know: The layout calls `history.back()` directly. SvelteKit's `$navigating` store fires when the SvelteKit router handles a navigation event.
   - What's unclear: Whether `history.back()` in Tauri triggers SvelteKit router's `beforeNavigate` / `afterNavigate` hooks.
   - Recommendation: Assume it does (SvelteKit intercepts popstate events). If testing reveals it doesn't, add a `window.addEventListener('popstate')` trigger for `startProgress()` in the layout.

3. **Which D3 pages are tested by the code-only suite vs web tests being removed?**
   - What we know: P6-05 (style-map), P7-01 and P7-02 (kb genre graph) are web tests. They'll be removed with the Playwright tests.
   - What's unclear: Should Phase 13 add replacement code-checks for these D3 pages, or defer until a future Tauri testing approach?
   - Recommendation: Add code-only checks (file existence + `simulation.tick` pattern) as Phase 13 replacements. The actual rendering cannot be verified headlessly until a Tauri testing approach exists (deferred to v1.3).

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `tools/test-suite/runners/web.mjs`, `manifest.mjs`, `src/routes/+layout.svelte`, `src/lib/components/StyleMap.svelte`, `GenreGraph.svelte`, `TasteFingerprint.svelte`
- SvelteKit `$app/stores` — `$navigating` store behavior verified in layout.svelte (line 5 import, line 102 usage)
- Playwright API — `page.on('console')` and `page.on('pageerror')` are stable, long-standing Playwright APIs

### Secondary (MEDIUM confidence)
- CSS animation approach for NProgress style — based on the existing `.loading-bar` animation in `+layout.svelte` (lines 407–434); NProgress-style two-phase width animation is a well-established pattern

### Tertiary (LOW confidence)
- `history.back()` triggering SvelteKit `$navigating` in Tauri — not verified; based on understanding of SvelteKit popstate interception

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing Playwright/SvelteKit APIs
- Architecture (console capture): HIGH — direct code inspection + Playwright API
- Architecture (data-ready): HIGH — Svelte 5 reactivity well understood, component pattern verified
- Architecture (progress bar): MEDIUM — `$navigating` + Tauri interaction has one LOW confidence open question
- Pitfalls: HIGH — all pitfalls derived from direct code inspection of existing patterns

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable stack, 30-day validity)
