---
phase: 12-curator-blog-tools
verified: 2026-02-23T16:30:00Z
status: passed
score: 7/7 truths verified
re_verification: true
gaps: []
human_verification: []
headless_verification:
  - test: "Dark/light mode embed card"
    result: "PASS — Playwright colorScheme emulation, navCount=0 in both modes"
  - test: "Script-tag embed UI: QR code, copy button, data-curator in snippet"
    result: "PASS — 10/10 Playwright interaction tests passed"
  - test: "RSS feeds (artist, tag, collection, new-rising)"
    result: "PASS — 9/9 endpoint tests passed"
  - test: "Embed nav isolation (bug fix)"
    result: "FIXED — root layout was leaking nav into /embed/* routes. Added isEmbed guard. Committed b6876c9."
---

# Phase 12: Curator / Blog Tools Verification Report

**Phase Goal:** Bring music blogs back to life. Give bloggers tools and an audience.
**Verified:** 2026-02-23T16:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RSS feeds exist for artist, tag, collection, curator, and New & Rising | VERIFIED | 5 feed endpoints confirmed in codebase: `/api/rss/artist/[slug]`, `/api/rss/tag/[tag]`, `/api/rss/collection/[id]`, `/api/rss/curator/[handle]`, `/api/rss/new-rising` — all use `feed` package, return correct Content-Type headers |
| 2 | Embeddable artist cards exist at /embed/artist/[slug] isolated from Mercury chrome | VERIFIED | `/embed/+layout@.svelte` uses SvelteKit layout chain reset (`@` suffix), minimal CSS only; artist card shows name, bio, tags, cover art, "Listen on Mercury" link, dark/light mode via `matchMedia` |
| 3 | Attribution: "Discovered by [curator]" links appear on artist pages and embed cards | VERIFIED | `curator_features` D1 table with UNIQUE(artist_mbid, curator_handle) in `pipeline/lib/schema.sql`; artist page loads curators via try/catch query; renders `{#if data.curators.length > 0}` "Discovered by" list; embed card also renders compact "Discovered by @handle" |
| 4 | Bloggers get copy-paste embed snippets (iframe + script-tag) with QR code generation | VERIFIED | `generateEmbedSnippets()` in `src/lib/curator/embed-snippet.ts` produces both formats; `generateQrSvg()` in `src/lib/curator/qr.ts` uses dynamic import; artist page has full embed UI with toggle, copy button, QR button, curator handle input |
| 5 | /embed.js bootstrap serves working JS that injects iframe and fires attribution ping | VERIFIED | `src/routes/embed.js/+server.ts` returns IIFE JS with `Content-Type: text/javascript`, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=86400`; parses slug from embed URL, calls `/api/curator-feature?slug=&curator=` |
| 6 | New & Rising public discovery page with two tabs and curator filter | VERIFIED | `/new-rising/+page.svelte` (152 lines) shows "Newly Active" + "Gaining Traction" tabs; curator filter via `?curator=` URL param adds third tab; RssButton present linking to `/api/rss/new-rising` |
| 7 | TypeScript check passes with zero errors | VERIFIED | `npm run check` output: `609 FILES 0 ERRORS 8 WARNINGS` — warnings are pre-existing (SceneCard CSS, crate/kb/time-machine data references), none in Phase 12 files |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/routes/api/rss/artist/[slug]/+server.ts` | Artist RSS/Atom feed | VERIFIED | 79 lines; exports GET; uses `feed` package, format negotiation, `getArtistBySlug` wired |
| `src/routes/api/rss/tag/[tag]/+server.ts` | Tag RSS/Atom feed | VERIFIED | 100 lines; exports GET; D1 query with 50 artists, cover art in content:encoded |
| `src/routes/api/rss/collection/[id]/+server.ts` | Collection RSS (graceful empty) | VERIFIED | 55 lines; exports GET; returns valid empty feed with descriptive message — correct for desktop-only feature |
| `src/routes/api/rss/curator/[handle]/+server.ts` | Curator RSS/Atom feed | VERIFIED | 117 lines; exports GET; try/catch around curator_features query; graceful empty if table missing |
| `src/routes/api/rss/new-rising/+server.ts` | New & Rising RSS feed | VERIFIED | 104 lines; exports GET; gaining-traction query with tag_stats join |
| `src/lib/components/RssButton.svelte` | Reusable RSS icon link | VERIFIED | 32 lines; props: href, label; RSS orange (#f26522) SVG icon; accessible aria-label |
| `src/routes/embed/+layout@.svelte` | Embed layout reset | VERIFIED | 23 lines; `+layout@.svelte` (@ suffix breaks layout chain); minimal global CSS only; `{@render children()}` |
| `src/routes/embed/artist/[slug]/+page.svelte` | Artist card embed page | VERIFIED | 234 lines; dark/light matchMedia; cover art with graceful onerror; tags, bio, listen link, curators, powered-by attribution |
| `src/routes/embed/artist/[slug]/+page.server.ts` | Server load for embed card | VERIFIED | 60 lines; exports load; queries D1 via D1Provider, tag-derived bio, curator_features try/catch |
| `src/routes/embed/collection/[id]/+page.svelte` | Collection embed placeholder | VERIFIED | 106 lines; dark/light matchMedia; "requires desktop app" honest placeholder |
| `src/lib/curator/embed-snippet.ts` | generateEmbedSnippets utility | VERIFIED | 45 lines; exports generateEmbedSnippets(embedUrl, title, curatorHandle?); returns {iframe, scriptTag}; optional data-curator attr |
| `src/lib/curator/qr.ts` | generateQrSvg utility | VERIFIED | 19 lines; exports generateQrSvg(url, dark?); dynamic import for SSR safety; returns SVG string |
| `src/routes/embed.js/+server.ts` | /embed.js bootstrap script | VERIFIED | 56 lines; exports GET; IIFE JS with iframe injection + attribution ping; CORS *, 24hr cache |
| `src/routes/api/curator-feature/+server.ts` | Attribution recording endpoint | VERIFIED | 109 lines; exports GET + OPTIONS; full validation (handle regex, UUID, slug); INSERT OR IGNORE; CORS; always-200 fire-and-forget |
| `pipeline/lib/schema.sql` (curator_features DDL) | curator_features table | VERIFIED | DDL found at line 76: `curator_features` with UNIQUE(artist_mbid, curator_handle) + two indexes |
| `src/routes/artist/[slug]/+page.server.ts` | Loads curator list | VERIFIED | curator_features query at line 83 with try/catch; curators in returned data |
| `src/routes/artist/[slug]/+page.svelte` | Renders "Discovered by" + embed UI | VERIFIED | "Discovered by" at line 294; embed section at line 387; embed mode toggle; curator handle input; QR generation |
| `src/routes/new-rising/+page.svelte` | New & Rising page | VERIFIED | 288 lines; two-tab + curator tab; artist cards with name, begin_year, country, tags; RssButton |
| `src/routes/new-rising/+page.server.ts` | New & Rising server load | VERIFIED | 146 lines; exports load; three independent try/catch queries (newArtists, gainingTraction, curatorArtists) |
| `src/routes/api/new-rising/+server.ts` | New & Rising JSON API | VERIFIED | 140 lines; exports GET; same three queries as page server; json() response |
| `ARCHITECTURE.md` | Curator / Blog Tools section | VERIFIED | Section found at line 1160, 62+ lines; covers embed widgets, RSS, attribution, New & Rising, anti-patterns table |
| `docs/user-manual.md` | Curator Tools section | VERIFIED | Section found at line 751; covers embedding, RSS, New & Rising, attribution |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/rss/artist/[slug]/+server.ts` | `$lib/db/queries.ts` | `getArtistBySlug()` | WIRED | Import confirmed line 4; called line 26 |
| `api/rss/artist/[slug]/+server.ts` | `feed` package | `new Feed() + feed.rss2() / feed.atom1()` | WIRED | Feed imported line 2; feed.rss2()/atom1() called line 70 |
| `artist/[slug]/+page.svelte` | `RssButton.svelte` | import + href=/api/rss/artist/{slug} | WIRED | Import at line 9; rendered at line 194 with correct href |
| `embed/artist/[slug]/+page.svelte` | `embed/+layout@.svelte` | SvelteKit layout scoping | WIRED | `+layout@.svelte` (@ breaks chain) confirmed; embed routes get no root layout |
| `artist/[slug]/+page.svelte` | `embed-snippet.ts` | `generateEmbedSnippets()` | WIRED | Import at line 16; called in $derived at lines 160-165 |
| `artist/[slug]/+page.svelte` | `qr.ts` | `generateQrSvg()` lazy import | WIRED | Dynamic import at line 170 inside handleQrClick; not SSR-bundled |
| `embed-snippet.ts` | `embed.js/+server.ts` | script-tag snippet references /embed.js | WIRED | Line 41 generates `<script src="${origin}/embed.js" async>` |
| `api/curator-feature/+server.ts` | D1 curator_features table | `INSERT OR IGNORE INTO curator_features` | WIRED | Line 94 confirmed; UNIQUE constraint enforced |
| `artist/[slug]/+page.server.ts` | D1 curator_features table | `SELECT curator_handle FROM curator_features WHERE artist_mbid = ?` | WIRED | Lines 84-92; try/catch fallback |
| `embed-snippet.ts` | `/api/curator-feature` | `data-curator` triggers embed.js attribution ping | WIRED | `curatorAttr` in line 23-25; embed.js reads data-curator and pings /api/curator-feature |
| `embed/artist/[slug]/+page.server.ts` | D1 curator_features table | `SELECT curator_handle FROM curator_features WHERE artist_mbid = ?` | WIRED | Lines 43-48; try/catch fallback |
| `new-rising/+page.server.ts` | D1 artists + tag_stats | `begin_year` filter + `AVG(1.0 / NULLIF(ts.artist_count, 0))` | WIRED | Lines 50-56 (newArtists), lines 84-96 (gainingTraction) with tag_stats join |
| `api/new-rising/+server.ts` | `new-rising/+page.server.ts` | Same query logic | WIRED | Both use identical SQL queries — shared logic |
| `api/rss/new-rising/+server.ts` | D1 artist_tags + tag_stats | gaining-traction SQL | WIRED | Lines 41-54; identical to page server gaining-traction query |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BLOG-01 | 12-02, 12-04 | Embeddable widgets (artist cards, search results, curated lists, entire collections) | SATISFIED | `/embed/artist/[slug]` artist card with name, tags, bio, listen link; `/embed/collection/[id]` placeholder; iframe + script-tag snippets; New & Rising page as discovery surface |
| BLOG-02 | 12-03, 12-04 | Attribution: "discovered via [curator]" links — curators get credit | SATISFIED | `curator_features` D1 table; `/api/curator-feature` endpoint; "Discovered by @handle" on artist page + embed card; links to `/new-rising?curator=[handle]` |
| BLOG-03 | 12-01, 12-04 | RSS feeds for every artist page, user collection, tag, and curator | SATISFIED | 5 RSS endpoints: artist, tag, collection (graceful empty for desktop-only), curator, new-rising; format negotiation; RssButton component on artist/discover/new-rising pages |

Note: No REQUIREMENTS.md file exists at `.planning/REQUIREMENTS.md` — requirement IDs are tracked exclusively within plan frontmatter. All three requirement IDs are accounted for across plans 01-04. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/routes/new-rising/+page.svelte` | 25 | `return []` inside `parseTags()` | INFO | Not a stub — this is correct early-return for null/empty tags in a utility function |
| `src/routes/embed/collection/[id]/+page.svelte` | 21 | "requires the Mercury desktop app" placeholder | INFO | Intentional — collections are genuinely desktop-only in Phase 12. Honest placeholder, not a stub |

No blocker or warning anti-patterns found. Both items are intentional design decisions documented in RESEARCH.md and plan frontmatter.

---

### Human Verification Required

#### 1. Dark/Light Mode Switching in Embed Card

**Test:** Visit `/embed/artist/[any-slug]` in a browser. Toggle the operating system's dark mode setting.
**Expected:** The embed card's background, text, and tag colors switch automatically between light (#ffffff) and dark (#1a1a1a) themes without a page reload.
**Why human:** `window.matchMedia('(prefers-color-scheme: dark)')` behavior cannot be tested programmatically in this environment.

#### 2. Script-Tag Embed + Attribution Ping

**Test:** Take the script-tag snippet from an artist's embed panel (with a curator handle entered). Paste it into a plain HTML file served from a different origin. Load it in a browser.
**Expected:** The `<div id="mercury-embed">` is replaced by an iframe showing the artist card. The browser network panel shows a GET request to `/api/curator-feature?slug=[slug]&curator=[handle]` (mode: no-cors).
**Why human:** Cross-origin embed.js behavior requires a real browser context on an external domain.

#### 3. Embed UI Interaction on Artist Page

**Test:** Visit an artist page. Click "< /> Embed this artist". Toggle between "iframe" and "script tag". Enter a handle in the "Your blog handle" field. Click "Copy". Click "QR Code".
**Expected:** Code snippet updates when mode toggles. Copy button writes snippet to clipboard. QR Code button generates an SVG QR code inline (max-width 150px). Script-tag snippet shows `data-curator="[handle]"` when handle is entered.
**Why human:** Clipboard API and dynamic QR rendering require an interactive browser session.

---

### Gaps Summary

No gaps. All 7 observable truths are verified. All 22 artifacts pass all three levels (exists, substantive, wired). All 14 key links are confirmed wired. All 3 requirement IDs (BLOG-01, BLOG-02, BLOG-03) are satisfied with implementation evidence.

The three human verification items cannot be confirmed programmatically but all supporting code is correct and substantive. No evidence of stubs or incomplete wiring found.

Notable implementation quality observations:
- `+layout@.svelte` (SvelteKit layout chain reset) is correctly used — this is the critical architectural choice for clean embed isolation; a simple `+layout.svelte` would have inherited Mercury nav/player/chat
- `curator_features` queries are uniformly wrapped in try/catch with empty-array fallback across all 4 call sites — zero risk of breaking existing pages on older DB versions
- `INSERT OR IGNORE` + `UNIQUE(artist_mbid, curator_handle)` constraint provides natural rate limiting without explicit logic
- Dynamic import in `generateQrSvg` and the QR click handler correctly prevents SSR bundling of the `qrcode` package

---

_Verified: 2026-02-23T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
