---
phase: 16-sustainability-links
verified: 2026-02-24T11:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Artist page with Patreon/Ko-fi links — verify Support section renders below Links block with platform icons"
    expected: "A 'Support' heading appears with labelled links prefixed by platform icons (e.g. ♥ Patreon, ☕ Ko-fi)"
    why_human: "Requires a live artist record in the DB that has support-category links; cannot inject test fixture without running app"
  - test: "Artist page with NO support links — verify no Support heading appears"
    expected: "The support-section block is completely absent from the DOM"
    why_human: "Conditional render — must be confirmed in running app against a real artist with no crowdfunding URLs"
  - test: "Mastodon share button on artist and scene pages — click opens sharetomastodon.github.io with correct pre-populated text"
    expected: "Browser opens https://sharetomastodon.github.io/?text=<encoded artist/scene name> on Mercury — mercury://artist/<mbid> or mercury://scene/<slug>"
    why_human: "External URL navigation — cannot be verified headlessly in static analysis"
  - test: "Backers page empty state — with MERCURY_PUBKEY empty, page shows 'Backer credits coming soon.' (not a spinner or error)"
    expected: "After mount, loading spinner disappears and 'Backer credits coming soon.' text is visible"
    why_human: "Requires running app; MERCURY_PUBKEY is empty string so the empty-state branch fires immediately on mount"
  - test: "About page Support section — verify three funding links and 'View backers' link are visible and clickable"
    expected: "Ko-fi, GitHub Sponsors, Open Collective links present; 'View backers →' navigates to /backers"
    why_human: "UI layout and navigation confirmation requires running app"
---

# Phase 16: Sustainability Links — Verification Report

**Phase Goal:** Users can support artists and Mercury through visible, non-intrusive funding links that respect the open ethos
**Verified:** 2026-02-24T11:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Artist pages with Patreon/Ko-fi/crowdfunding links show a distinct 'Support' section below the generic links block | VERIFIED | `src/routes/artist/[slug]/+page.svelte` lines 404-421: `{#if data.categorizedLinks.support.length > 0}` renders `.support-section` with `.section-title "Support"` and per-link anchors |
| 2 | Artist pages with no support links show no 'Support' heading at all | VERIFIED | Same conditional — `{#if data.categorizedLinks.support.length > 0}` — section is entirely absent from DOM when array is empty; no fallback heading rendered |
| 3 | Support links do not appear twice (excluded from the generic links loop) | VERIFIED | Line 380: `{#if category !== 'support'}` guard wraps the entire generic link group — support category is skipped in `LINK_CATEGORY_ORDER` loop |
| 4 | Artist page header has a Mastodon share icon that is always visible (not in overflow menu) | VERIFIED | Lines 261-268: `<a class="share-mastodon-btn">` placed inside `.artist-name-row` div, outside the `{#if tauriMode}` block — renders on all platforms |
| 5 | Scene page header has a Mastodon share icon that is always visible | VERIFIED | `src/routes/scenes/[slug]/+page.svelte` lines 127-134: share button is in `.scene-title-row` outside `{#if isTauri()}` block |
| 6 | Clicking either share icon opens sharetomastodon.github.io with pre-populated text containing the artist/scene name and a mercury:// deep link | VERIFIED (code) / HUMAN (runtime) | `mastodonShareUrl` ($derived, line 142-144) and `sceneMastodonShareUrl` ($derived, lines 21-25) both construct `https://sharetomastodon.github.io/?text=` with `encodeURIComponent(name + mercury:// deep link)` |
| 7 | About page has a 'Support' section with the exact mission copy and three funding links (Ko-fi, GitHub Sponsors, Open Collective) | VERIFIED | `src/routes/about/+page.svelte` lines 40-50: section with `id="support"`, copy "Mercury runs on no ads, no tracking, no VC money — just people who care about music.", three `.support-link-item` anchors |
| 8 | About page 'View backers' link navigates to /backers | VERIFIED | Line 49: `<a href="/backers" class="view-backers-link">View backers →</a>` |
| 9 | Backers page loads with state machine: spinner on mount, loaded/empty/error states with retry | VERIFIED | `src/routes/backers/+page.svelte`: `FetchState` type, `$state` for fetchState starting at `'loading'`, full `{#if fetchState === 'loading'}` / `'loaded'` / `'empty'` / `'error'` branches; retry button calls `handleRetry()` which resets to loading |

**Score:** 9/9 truths verified (5 require human runtime confirmation for visual/behavioral aspects)

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/routes/artist/[slug]/+page.svelte` | Support section + Mastodon share button in artist header | VERIFIED | Contains `support-section` class (line 406), `share-mastodon-btn` class (line 265), `mastodonShareUrl` $derived (line 142), `supportIcon()` function (line 147), `category !== 'support'` guard (line 380) |
| `src/routes/scenes/[slug]/+page.svelte` | Mastodon share button in scene header | VERIFIED | Contains `share-mastodon-btn` class (line 131), `sceneMastodonShareUrl` $derived (lines 21-25) with nullable guard |
| `src/lib/config.ts` | MERCURY_PUBKEY constant | VERIFIED | Line 8: `export const MERCURY_PUBKEY = '';` — placeholder empty string, comment explains intent |
| `src/routes/about/+page.svelte` | Support section with mission copy + funding links + view backers link | VERIFIED | Section at lines 40-50 contains exact copy "Mercury runs on no ads, no tracking, no VC money — just people who care about music." |
| `src/routes/backers/+page.svelte` | Backer credits screen with Nostr fetch | VERIFIED | New file, 240 lines; `fetchEvents` call at line 30, full state machine, CTA at line 103 |

All artifacts: substantive (no stubs), wired (imported/referenced by routes), functional.

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `artist/+page.svelte` | `data.categorizedLinks.support` | `{#if data.categorizedLinks.support.length > 0}` | WIRED | Conditional render at line 405 directly gates on the support array — no intermediate indirection |
| `artist/+page.svelte` | `sharetomastodon.github.io` | `$derived mastodonShareUrl` | WIRED | Line 142-144: `$derived` constructs full URL with `encodeURIComponent`; anchor at line 262 uses `href={mastodonShareUrl}` |
| `scenes/+page.svelte` | `sharetomastodon.github.io` | `$derived sceneMastodonShareUrl` | WIRED | Lines 21-25: nullable guard (`data.scene ? ... : '#'`), anchor at line 128 uses `href={sceneMastodonShareUrl}` |
| `backers/+page.svelte` | `$lib/comms/nostr.svelte.js (ndkState)` | dynamic import + `initNostr()` in `loadBackers()` | WIRED | Line 21: `const { initNostr, ndkState } = await import('$lib/comms/nostr.svelte.js')` inside `loadBackers()` — called from `onMount` |
| `backers/+page.svelte` | `$lib/config.ts (MERCURY_PUBKEY)` | `import MERCURY_PUBKEY from '$lib/config'` | WIRED | Line 3: `import { PROJECT_NAME, MERCURY_PUBKEY } from '$lib/config'` — used at lines 15 and 91 |
| `about/+page.svelte` | `backers/+page.svelte` | `href='/backers'` | WIRED | Line 49: `<a href="/backers" class="view-backers-link">View backers →</a>` |

All 6 key links: WIRED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SUST-01 | 16-01-PLAN.md | User can see Patreon/Ko-fi/crowdfunding links for artists on artist pages, visually distinguished from info/social links | SATISFIED | `.support-section` with `.section-title "Support"`, distinct CSS styling, `category !== 'support'` guard prevents double-render — support links never appear in generic Links block |
| SUST-02 | 16-01-PLAN.md | User can share any artist or scene page to the Fediverse via a pre-populated Mastodon share link (URL-scheme only, no AP protocol) | SATISFIED | Both artist and scene pages have `.share-mastodon-btn` anchors outside any platform guard, linking to `sharetomastodon.github.io` with URL-encoded artist name + mercury:// deep link |
| SUST-03 | 16-02-PLAN.md | User can view Mercury project funding links (Ko-fi, GitHub Sponsors, Open Collective) in the About screen | SATISFIED | `about/+page.svelte` section `id="support"` contains three anchors to ko-fi.com/mercury, github.com/sponsors/mercury, opencollective.com/mercury with exact mission copy |
| SUST-04 | 16-02-PLAN.md | User can view a backer credits screen listing Mercury supporters, fetched from a Nostr list event | SATISFIED | `/backers` route exists with full Nostr `fetchEvents({kinds:[30000], authors:[MERCURY_PUBKEY], '#d':['backers']})` — currently shows "Backer credits coming soon" because `MERCURY_PUBKEY` is empty string placeholder (by design — Nostr identity not yet generated) |

All 4 requirements from REQUIREMENTS.md: SATISFIED. No orphaned requirements.

REQUIREMENTS.md confirms all four SUST-* IDs are mapped to Phase 16 and marked `[x]` complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/routes/about/+page.svelte` | 44 | `<!-- TODO: Replace placeholder URLs with real account URLs when Mercury's accounts are created -->` | Info | Intentional — funding account URLs (ko-fi.com/mercury etc.) are placeholder paths. Comment documents the intent clearly. Not a code stub — the UI is fully rendered. No code logic depends on these URLs being real. |
| `src/lib/config.ts` | 7-8 | `MERCURY_PUBKEY = ''` with comment "Placeholder: fill in once..." | Info | Intentional design decision documented in SUMMARY. Empty pubkey triggers graceful empty state in backers page ("Backer credits coming soon") — this is the correct behavior until Mercury's Nostr identity is generated. |
| Various | - | `placeholder=` in input elements | Info | HTML input placeholder attributes — not code stubs |

No blocker anti-patterns. All flagged items are intentional, documented design decisions.

---

### Build Check

`npm run check` result: **0 ERRORS, 8 WARNINGS** (all pre-existing warnings in unrelated files — `SceneCard.svelte`, `crate/+page.svelte`, `kb/+page.svelte`, `new-rising/+page.svelte`, `time-machine/+page.svelte`). No new warnings introduced by Phase 16.

### Commit Verification

All 4 commits documented in SUMMARYs verified present in git history:
- `382ee4e` — feat(16-01): add Support section and Mastodon share button to artist page
- `14eeade` — feat(16-01): add Mastodon share button to scene page
- `afbf6b5` — feat(16-02): add MERCURY_PUBKEY to config and Support section to About page
- `7c01210` — feat(16-02): create /backers route with Nostr kind:30000 backer credits fetch

---

### Human Verification Required

The following items require a running desktop app to confirm — all static code analysis passes.

#### 1. Artist Support Section Renders Correctly

**Test:** Open the app, navigate to an artist page that has Patreon or Ko-fi links in MusicBrainz (e.g., search for a crowdfunding-active indie artist)
**Expected:** A "Support" heading appears below the "Links" section with platform-icon-prefixed links (♥ for Patreon, ☕ for Ko-fi, ♡ for generic); clicking opens the artist's funding page
**Why human:** Requires live artist data with `data.categorizedLinks.support.length > 0`

#### 2. Artist Page — No Support Links = No Heading

**Test:** Navigate to an artist page that has no crowdfunding links (most artists)
**Expected:** No "Support" heading visible anywhere on the page; generic links render normally
**Why human:** Conditional render — DOM inspection required in running app

#### 3. Mastodon Share Button — Artist Page

**Test:** On any artist page, click the "↑" share button in the artist name row
**Expected:** System browser (or Tauri WebView) opens `https://sharetomastodon.github.io/?text=<encoded text>` where text contains the artist name and a `mercury://artist/<mbid>` deep link
**Why human:** External URL navigation cannot be verified headlessly

#### 4. Mastodon Share Button — Scene Page

**Test:** Navigate to a scene page (e.g., /scenes, click a scene), click the "↑" share button in the scene title row
**Expected:** Opens `sharetomastodon.github.io` with scene name and `mercury://scene/<slug>` deep link
**Why human:** Same as above

#### 5. Backers Page — Empty State

**Test:** Navigate to /backers (or click "View backers →" on the About page)
**Expected:** Loading spinner appears briefly on mount, then "Backer credits coming soon." text appears (because MERCURY_PUBKEY is empty string — no Nostr fetch attempted)
**Why human:** Mount lifecycle and reactive state transition requires running app

---

### Gaps Summary

No gaps. All 9 observable truths are verified at the code level. All 4 requirements (SUST-01 through SUST-04) are satisfied. All 5 key links are wired. Build passes with 0 errors. 4 commits confirmed in git history.

The two intentional "placeholder" items (funding URLs in About page, empty MERCURY_PUBKEY) are documented design decisions — not implementation gaps. They represent future operational setup (creating Mercury's actual funding accounts and Nostr identity), not missing code functionality. The code correctly handles both states gracefully.

---

_Verified: 2026-02-24T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
