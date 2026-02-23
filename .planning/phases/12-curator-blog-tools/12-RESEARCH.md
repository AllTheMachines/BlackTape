# Phase 12: Curator / Blog Tools - Research

**Researched:** 2026-02-23
**Domain:** Embeddable widgets, RSS/Atom feeds, curator attribution, emerging artist discovery
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Embed Widget Types**
- Ship artist card embeds + collection embeds (not search results or curated list embeds in this phase)
- Artist card shows: name, image, tags, short bio snippet, listen link

**Embed Mechanism**
- Offer both embed options with a toggle in the UI: `<iframe>` snippet and script-tag + div
- Auto detect `prefers-color-scheme` and adapt to light/dark automatically (no manual theme param needed)

**RSS Feeds**
- Feed types: artist page, user collection, tag, and curator
- Both RSS 2.0 and Atom formats supported (served based on Accept header or `?format=atom`)
- Rich feed entries: artist image, bio, tags, player link (not just title + link)
- Visible RSS button/icon on every applicable page (artist, tag, collection, curator)
- Event triggers left to Claude's discretion — design for what makes a feed worth subscribing to

**Curator Attribution**
- Attribution shows in both places: on the Mercury artist page AND inside the embed widget
- Clicking "discovered via [Curator]" goes to the curator's collection on Mercury
- Credit is triggered by first-to-feature: whichever happens first — adding to a public collection or embedding on an external site
- All curators who have featured the artist get credited (shown as a list, not just the first)

**Curator First Access (New & Rising Page)**
- Public page — not gated, available to everyone
- Two views: newly added artists + artists gaining traction (tag saves / collection adds)
- 30-day window defines "emerging"
- Whether to add a New & Rising RSS feed is left to Claude's discretion

### Claude's Discretion
- RSS event trigger design (what events constitute a feed entry worth publishing)
- Whether New & Rising page gets its own RSS feed
- Exact layout/density of New & Rising page
- QR code generation implementation (static vs dynamic)
- Collection embed layout and pagination/scroll behavior

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BLOG-01 | Embeddable widgets for blog writers (artist cards, search results, curated lists) | iframe + script-tag embed patterns; SvelteKit dedicated embed routes at `/embed/artist/[slug]` and `/embed/collection/[id]`; prefers-color-scheme detection inside iframe |
| BLOG-02 | Curator attribution ("discovered via" links) | curator_features table in taste.db (Tauri) + D1-queryable attribution in web; embed snippet includes attribution HTML; artist page shows credited curators |
| BLOG-03 | RSS feeds for every artist page, user collection, tag, and curator | SvelteKit `+server.ts` routes returning `application/xml`; `feed` npm package (1.5.4, TypeScript, RSS 2.0 + Atom 1.0); Accept header or `?format=atom` routing |
</phase_requirements>

---

## Summary

Phase 12 has four distinct technical surfaces: (1) embeddable widgets served as dedicated SvelteKit routes with iframe + script-tag snippets, (2) RSS/Atom feed endpoints using the `feed` npm package, (3) curator attribution tracking stored in taste.db (Tauri) and queried on the web, and (4) a public New & Rising discovery page driven by `tag_stats` recency signals in D1.

The SvelteKit server-route pattern is already well-established in this project. RSS feeds follow the same `+server.ts` pattern as the existing `/api/*` routes — return `new Response(xmlString, { headers: { 'Content-Type': 'application/xml' }})`. The `feed` npm package (TypeScript-native, 1.5.4) is the standard choice for generating RSS 2.0 and Atom 1.0; no hand-rolled XML. Embed widgets are best served as minimal SvelteKit pages under `/embed/*` — iframe embeds point to this URL, script-tag embeds load it in a dynamically-created iframe. Dark/light detection inside an iframe uses `window.matchMedia('(prefers-color-scheme: dark)')` inside the embedded page (the iframe inherits the OS preference from the host browser, not the host page's CSS variables).

Curator attribution requires a new `curator_features` table in taste.db (Tauri) and a lightweight web-accessible mechanism. Since collections are Tauri-only in Phase 9, web-facing attribution needs an approach that works without user auth — the embed snippet itself can carry a `data-curator` attribute that Mercury's embed script reads and records via a fire-and-forget GET to `/api/curator-feature`. QR code generation uses the `qrcode` npm package (1.5.4, `@types/qrcode`) which produces SVG without a canvas dependency.

**Primary recommendation:** Build RSS endpoints and New & Rising page first (pure web/D1 work, no Tauri dependency), then embed routes, then attribution tracking, then QR codes as a finishing touch on embed/collection pages.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `feed` | 4.2.2 (npm 1.5.x series) | RSS 2.0 + Atom 1.0 + JSON Feed generation | TypeScript-native, handles all XML escaping, item image/enclosure support, zero boilerplate |
| `qrcode` | 1.5.4 | SVG/PNG QR code generation | Well-maintained, `@types/qrcode` available, generates SVG strings suitable for inline rendering |
| `@types/qrcode` | latest | Type definitions for qrcode | Needed since qrcode is JS-only |
| SvelteKit `+server.ts` routes | (existing) | RSS/Atom feed endpoints | Already the pattern for all API routes in this project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.matchMedia` | native | Dark/light mode detection inside embed iframe | Always — no package needed, supported in all modern browsers |
| `prefers-color-scheme` CSS media query | native | Light/dark CSS inside embed pages | Use for CSS-based theming in `/embed/*` pages |
| Cover Art Archive | (external API, existing) | Artist image in RSS feed entries | RSS needs absolute image URLs; Cover Art Archive URLs are `https://coverartarchive.org/release-group/{mbid}/front-250` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `feed` package | Hand-rolled XML strings | Hand-rolling misses XML escaping edge cases (artist names with `&`, `<`, etc.) — don't do this |
| `qrcode` | `qrcode-svg` | `qrcode-svg` is Node-only; `qrcode` works in browser and Node both, more flexible for Tauri context |
| Dedicated `/embed/*` routes | Shadow DOM widget | Shadow DOM requires a bundled JS file; iframe approach is simpler, works without build steps, and is already the pattern Mercury uses for Bandcamp/Spotify embeds |
| Accept header routing | Separate `/rss.xml` and `/atom.xml` routes | Accept header is cleaner but `?format=atom` URL param is more compatible with feed readers that can't set headers |

**Installation:**
```bash
npm install feed qrcode
npm install --save-dev @types/qrcode
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/routes/
├── embed/
│   ├── artist/[slug]/
│   │   └── +page.svelte         # Minimal embed page — no layout, dark/light auto
│   └── collection/[id]/
│       └── +page.svelte         # Collection embed — paginated artist list
├── api/
│   ├── rss/
│   │   ├── artist/[slug]/+server.ts   # Artist page RSS/Atom
│   │   ├── tag/[tag]/+server.ts       # Tag RSS/Atom
│   │   ├── collection/[id]/+server.ts # Collection RSS/Atom (web, public collections only)
│   │   └── curator/[handle]/+server.ts # Curator RSS/Atom
│   ├── curator-feature/+server.ts     # Web: records embed attribution fire-and-forget
│   └── new-rising/+server.ts          # New & Rising data for web
├── new-rising/
│   └── +page.svelte            # Public New & Rising page
src/lib/
├── curator/
│   ├── attribution.ts          # Attribution logic: first-to-feature, list of curators
│   ├── embed-snippet.ts        # Generates iframe + script-tag embed HTML snippets
│   └── qr.ts                   # QR code generation wrapper
└── taste/
    └── collections.svelte.ts   # Already exists — collections data source
```

### Pattern 1: RSS/Atom Feed Endpoint
**What:** SvelteKit `+server.ts` serving XML via `feed` package, format negotiated by `?format=atom` param or `Accept` header.
**When to use:** For all four feed types (artist, tag, collection, curator).

```typescript
// src/routes/api/rss/artist/[slug]/+server.ts
import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { getArtistBySlug } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

export const GET: RequestHandler = async ({ params, url, platform, request }) => {
  // Source: feed package API at https://github.com/jpmonette/feed
  const useAtom = url.searchParams.get('format') === 'atom'
    || request.headers.get('Accept')?.includes('application/atom+xml');

  const db = new D1Provider(platform!.env.DB);
  const artist = await getArtistBySlug(db, params.slug);
  if (!artist) return new Response('Not found', { status: 404 });

  const siteUrl = url.origin;
  const feed = new Feed({
    title: `${artist.name} — Mercury`,
    description: `Releases and updates for ${artist.name}`,
    id: `${siteUrl}/artist/${artist.slug}`,
    link: `${siteUrl}/artist/${artist.slug}`,
    language: 'en',
    image: `https://coverartarchive.org/artist/${artist.mbid}/front-250`,
    copyright: 'No rights reserved — CC0 data from MusicBrainz',
    feedLinks: {
      rss: `${siteUrl}/api/rss/artist/${artist.slug}`,
      atom: `${siteUrl}/api/rss/artist/${artist.slug}?format=atom`,
    },
  });

  // Fetch recent releases and add as feed items
  // (releases fetched from MusicBrainz API, same as artist page)
  const tags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];

  feed.addItem({
    title: `${artist.name} — Artist Profile`,
    id: `${siteUrl}/artist/${artist.slug}`,
    link: `${siteUrl}/artist/${artist.slug}`,
    description: tags.slice(0, 5).join(', '),
    date: new Date(),
  });

  const xml = useAtom ? feed.atom1() : feed.rss2();
  const contentType = useAtom ? 'application/atom+xml' : 'application/rss+xml';

  return new Response(xml, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
```

### Pattern 2: Embed Widget Routes (Standalone Pages)
**What:** `/embed/artist/[slug]` is a SvelteKit page with NO shared layout (no header, no player, no nav). It is purely the artist card for embedding. Dark/light mode is detected client-side via `matchMedia`. The page sets `<meta name="color-scheme" content="light dark">` so the browser renders the iframe background correctly.
**When to use:** Both iframe and script-tag embed options point to this same URL.

Key decisions:
- Add `+layout.svelte` (empty) in `/embed/` to opt out of root layout — same pattern SvelteKit docs describe for layout groups
- Set `color-scheme: light dark` on `:root` in the embed stylesheet
- Detect dark mode in embed `onMount`: `window.matchMedia('(prefers-color-scheme: dark)').matches`
- The embed page loads CSS custom properties for both light and dark and switches class on `<html>`

```svelte
<!-- src/routes/embed/artist/[slug]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  let { data } = $props();
  let isDark = $state(false);

  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    isDark = mq.matches;
    mq.addEventListener('change', (e) => { isDark = e.matches; });
  });
</script>

<svelte:head>
  <meta name="color-scheme" content="light dark" />
</svelte:head>

<div class="embed-card" class:dark={isDark}>
  <!-- artist card content -->
</div>
```

### Pattern 3: Embed Snippet Generation
**What:** A utility that returns both the iframe HTML and the script-tag HTML for a given embed URL.
**When to use:** Called from artist page and collection page to display copy-paste snippets.

```typescript
// src/lib/curator/embed-snippet.ts
export function generateEmbedSnippets(embedUrl: string, title: string): {
  iframe: string;
  scriptTag: string;
} {
  const iframe = `<iframe
  src="${embedUrl}"
  width="400"
  height="180"
  title="${title}"
  frameborder="0"
  style="border-radius:8px;overflow:hidden;"
  loading="lazy"
></iframe>`;

  const scriptTag = `<div id="mercury-embed" data-src="${embedUrl}" data-title="${title}"></div>
<script src="https://mercury.example/embed.js" async></script>`;

  return { iframe, scriptTag };
}
```

The `embed.js` script (served as a static asset) finds `[data-src]` divs and creates iframes from them — same approach as YouTube's old embed API. This is a minimal static JS file, not a SvelteKit route.

### Pattern 4: Curator Attribution Tracking
**What:** Record which curator (collection owner) first featured an artist, visible on the artist page and inside the embed widget itself.
**When to use:** When a curator adds an artist to a public collection (Tauri) or when an embed widget is loaded on an external site (web).

Two storage layers:
1. **Tauri (taste.db):** New `curator_features` table — `(artist_mbid, curator_handle, featured_at, source)`. Written by Tauri commands when adding to a public collection.
2. **Web (fire-and-forget):** `/api/curator-feature` GET endpoint records in a separate lightweight table in D1 (`curator_features` table). Since Mercury has no user auth on web, curator identity on web comes from the `data-curator` attribute in the embed snippet.

```sql
-- D1 table (in mercury.db, added by pipeline or migration)
CREATE TABLE IF NOT EXISTS curator_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_mbid TEXT NOT NULL,
  curator_handle TEXT NOT NULL,
  featured_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'embed'   -- 'embed' or 'collection'
);
CREATE INDEX IF NOT EXISTS idx_cf_artist ON curator_features(artist_mbid);
CREATE INDEX IF NOT EXISTS idx_cf_curator ON curator_features(curator_handle);
```

Artist page reads curators for this artist:
```typescript
// In artist page server load (D1 path)
const curators = await db.all<{ curator_handle: string; featured_at: number }>(
  `SELECT curator_handle, MIN(featured_at) as featured_at
   FROM curator_features
   WHERE artist_mbid = ?
   GROUP BY curator_handle
   ORDER BY featured_at ASC`,
  artist.mbid
);
```

### Pattern 5: New & Rising Page
**What:** Public page showing two tabs — "Newly Added" (artists added to DB in last 30 days) and "Gaining Traction" (artists whose tags are being saved/collected frequently).
**When to use:** Pure D1 query on web, no Tauri dependency.

The `artists` table has no `added_at` column currently — the pipeline would need to add it, OR the New & Rising page approximates "newly added" by MBID ranges / begin_year recency. The safer approach for Phase 12 is to define "newly added" by `begin_year >= (current_year - 1)` for recently active artists (proxy for new entries), and "gaining traction" as artists with the highest tag intersection with the most-growing tag combinations from `tag_cooccurrence`.

```typescript
// Gaining traction: artists with most niche tag combinations + recent begin_year
const gainingTraction = await db.all<ArtistResult>(
  `SELECT a.id, a.mbid, a.name, a.slug, a.country,
          (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
   FROM artists a
   WHERE a.begin_year >= ? AND a.ended = 0
     AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
   ORDER BY (
     SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
     FROM artist_tags at2
     JOIN tag_stats ts ON ts.tag = at2.tag
     WHERE at2.artist_id = a.id
   ) DESC
   LIMIT 50`,
  currentYear - 1
);
```

### Pattern 6: QR Code Generation
**What:** Client-side SVG QR code generation for any embed URL or collection URL.
**When to use:** On the embed snippet UI — user clicks "Get QR Code" and sees an SVG in a modal.

```typescript
// src/lib/curator/qr.ts
import QRCode from 'qrcode';

export async function generateQrSvg(url: string): Promise<string> {
  // Source: https://github.com/soldair/node-qrcode
  return await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
```

The SVG string is injected directly into the page via `{@html svgString}`. For dark mode, swap dark/light colors. No canvas dependency.

### Anti-Patterns to Avoid
- **Hand-rolling RSS XML:** Feed names often contain `&`, `<`, quotes. The `feed` package handles all escaping correctly. Any hand-rolled XML will break on artists like "Guns N' Roses".
- **Storing curator attribution in localStorage only:** Needs to survive page refreshes and be visible across users on the artist page. Must go to D1 (web) or taste.db (Tauri).
- **Embed routes inside the root layout:** The embed pages must have their own empty layout (`/embed/+layout.svelte`) to strip the Mercury nav, player, and chat overlay — these do not belong in an iframe loaded on a blogger's site.
- **Using `prefers-color-scheme` on the host page's CSS to style the iframe:** The iframe has its own browsing context. The embed page itself must detect the media query and switch its own classes. `postMessage` is not needed — `matchMedia` inside the iframe reads the OS preference directly.
- **Blocking the artist page on curator attribution load:** Attribution is additive — load it in a separate `Promise.allSettled` branch, render the page without it if it fails.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS/Atom XML generation | XML string concatenation | `feed` npm package | Handles character escaping, date formatting, namespace prefixes, all three feed formats |
| QR code image generation | Canvas pixel drawing | `qrcode` npm package | Implements QR error correction levels correctly — bit matrix generation is non-trivial |
| Dark/light detection in iframe | `postMessage` from parent | `matchMedia` inside embed page | The iframe inherits OS preference from the browser, not the host page. No cross-origin messaging needed. |
| Feed format negotiation | Custom `Accept` header parser | Simple `url.searchParams.get('format')` with `Accept` header fallback | One line, no library, compatible with all feed readers |

**Key insight:** The embed and RSS work in this phase are additive routes, not architectural changes. The existing SvelteKit + D1Provider pattern carries all of it. No new state management layers needed.

---

## Common Pitfalls

### Pitfall 1: Root Layout Leaking into Embed Pages
**What goes wrong:** The embed page renders with Mercury's full nav, player bar, chat overlay, and taste-themed CSS variables — looks completely wrong in an iframe on a blogger's site.
**Why it happens:** SvelteKit applies the root `+layout.svelte` to all routes by default.
**How to avoid:** Create `/src/routes/embed/+layout.svelte` with ONLY the embed stylesheet. SvelteKit layout scoping means all `/embed/*` routes get this minimal layout instead of the root layout. Note: this REPLACES the root layout for those routes, it doesn't stack.
**Warning signs:** Any Mercury component or CSS variable appearing in the iframe output.

### Pitfall 2: RSS Feed Not Updating (Prerender vs Dynamic)
**What goes wrong:** Declaring `export const prerender = true` on RSS routes causes stale feeds — data is baked at build time, not on each request.
**Why it happens:** Prerender is appropriate for static blogs but not for dynamic DB-driven feeds.
**How to avoid:** Do NOT set `prerender = true` on RSS endpoints. They must be dynamic Cloudflare Worker routes so they can query D1 on each request. The existing project pattern (all API routes are dynamic) is correct.
**Warning signs:** Feed contents don't change after artists are added to the database.

### Pitfall 3: Curator Attribution D1 Table Doesn't Exist
**What goes wrong:** The `curator_features` table doesn't exist in the deployed D1 database. Queries return 500 errors.
**Why it happens:** D1 has no migration system by default — the table must be created via the Cloudflare dashboard or the pipeline wrangler script.
**How to avoid:** Add the `curator_features` table creation to the data pipeline's database initialization step (same pattern as `tag_stats` and `tag_cooccurrence` which are also created by the pipeline). Add a graceful `try/catch` in the web load function with empty array fallback.
**Warning signs:** `500: no such table: curator_features` in Cloudflare Worker logs.

### Pitfall 4: Embed Snippet iframe Blocked by Content Security Policy
**What goes wrong:** Blogger's site has a CSP that blocks iframes from third-party origins, so the embed doesn't render.
**Why it happens:** Many CMSes (WordPress, Ghost) apply default CSP headers.
**How to avoid:** This is outside Mercury's control — document it in the embed UI ("Some sites may need to whitelist mercury.example in their CSP"). Also provide the script-tag alternative which loads the iframe via JavaScript and may bypass some iframe-src restrictions.
**Warning signs:** Blank space where embed should be, CSP errors in browser console.

### Pitfall 5: QR Code SVG Injection XSS
**What goes wrong:** If the URL passed to `QRCode.toString()` is user-controlled and the SVG output is injected with `{@html}`, a malicious URL containing SVG elements could execute scripts.
**Why it happens:** `qrcode` encodes the raw string — it doesn't sanitize the input for SVG injection.
**How to avoid:** The QR code generator encodes the URL as a QR matrix (binary data), so the URL content cannot escape into SVG. The `qrcode` library generates the SVG from a binary bit matrix, not by interpolating the input string into SVG XML. No sanitization needed. But always validate that the URL is a Mercury URL before generating (reject arbitrary strings from user input).
**Warning signs:** Not an issue with the `qrcode` library's SVG output path.

### Pitfall 6: RSS Image Requires Absolute URL
**What goes wrong:** Feed readers can't load artist images because they're served as relative paths.
**Why it happens:** RSS spec requires absolute URLs for all links and images.
**How to avoid:** Cover Art Archive URLs are already absolute (`https://coverartarchive.org/...`). Pass `url.origin` from the server request to construct absolute links for all other URLs in feed items. Never use relative paths in feed XML.
**Warning signs:** Feed reader shows broken image icons.

---

## Code Examples

Verified patterns from official sources and project codebase:

### RSS 2.0 Endpoint (Production Pattern)
```typescript
// src/routes/api/rss/artist/[slug]/+server.ts
// Pattern: same as existing /api/* routes (no prerender, D1Provider, error handling)
import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { getArtistBySlug } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

export const GET: RequestHandler = async ({ params, url, platform, request }) => {
  if (!platform?.env?.DB) {
    return new Response('Database not available', { status: 503 });
  }

  const db = new D1Provider(platform.env.DB);
  const artist = await getArtistBySlug(db, params.slug);
  if (!artist) return new Response('Artist not found', { status: 404 });

  const useAtom = url.searchParams.get('format') === 'atom'
    || (request.headers.get('Accept') ?? '').includes('application/atom+xml');

  const siteUrl = url.origin;
  const artistUrl = `${siteUrl}/artist/${artist.slug}`;
  const tags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];

  const feed = new Feed({
    title: `${artist.name} — Mercury`,
    description: `${artist.name}${tags.length ? ' · ' + tags.slice(0, 5).join(', ') : ''}`,
    id: artistUrl,
    link: artistUrl,
    language: 'en',
    copyright: 'Data from MusicBrainz (CC0)',
    feedLinks: {
      rss: `${siteUrl}/api/rss/artist/${artist.slug}`,
      atom: `${siteUrl}/api/rss/artist/${artist.slug}?format=atom`,
    },
  });

  feed.addItem({
    title: `${artist.name} on Mercury`,
    id: artistUrl,
    link: artistUrl,
    description: `${artist.name}${artist.country ? ' (' + artist.country + ')' : ''} — ${tags.slice(0, 8).join(', ')}`,
    date: new Date(),
  });

  const xml = useAtom ? feed.atom1() : feed.rss2();
  const contentType = useAtom
    ? 'application/atom+xml; charset=utf-8'
    : 'application/rss+xml; charset=utf-8';

  return new Response(xml, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
  });
};
```

### QR Code Generation (Client-Side)
```typescript
// src/lib/curator/qr.ts
import QRCode from 'qrcode';

export async function generateQrSvg(url: string, dark = false): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    color: {
      dark: dark ? '#ffffff' : '#000000',
      light: dark ? '#1a1a1a' : '#ffffff',
    },
  });
}
```

### Embed Layout Opt-Out (SvelteKit Pattern)
```svelte
<!-- src/routes/embed/+layout.svelte -->
<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <meta name="color-scheme" content="light dark" />
</svelte:head>

{@render children()}

<style>
  /* Embed-specific reset — no Mercury theme variables needed here */
  :global(html) {
    margin: 0;
    padding: 0;
    font-family: system-ui, sans-serif;
  }
  :global(body) {
    margin: 0;
    background: transparent;
  }
</style>
```

### Curator Attribution on Artist Page
```typescript
// In artist page +page.server.ts — load curators alongside artist data
let curators: Array<{ curator_handle: string; featured_at: number }> = [];
try {
  curators = await db.all<{ curator_handle: string; featured_at: number }>(
    `SELECT curator_handle, MIN(featured_at) as featured_at
     FROM curator_features
     WHERE artist_mbid = ?
     GROUP BY curator_handle
     ORDER BY featured_at ASC
     LIMIT 10`,
    artist.mbid
  );
} catch {
  // Table may not exist on older DB versions — degrade gracefully
}
```

### RSS Button Icon (Reusable Component)
```svelte
<!-- src/lib/components/RssButton.svelte -->
<script lang="ts">
  let { href, label = 'RSS Feed' }: { href: string; label?: string } = $props();
</script>

<a {href} class="rss-btn" aria-label={label} title={label} target="_blank" rel="noopener">
  <!-- Standard RSS orange icon via inline SVG -->
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="6.18" cy="17.82" r="2.18"/>
    <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
  </svg>
</a>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `/rss.xml` static file | Dynamic `+server.ts` endpoint querying DB | SvelteKit 2.x | Feeds reflect current DB state on every request |
| `?theme=dark` URL param for embeds | `prefers-color-scheme` auto-detection inside iframe | CSS Media Queries Level 5, 2020+ | No param needed — adapts automatically |
| RSS `<enclosure>` for media | Media RSS namespace (`<media:content>`) | 2004 (but widely still using enclosure) | RSS 2.0 `<enclosure>` is sufficient for image URLs |
| iframe-only embed widgets | iframe + script-tag both offered with UI toggle | Industry standard since 2010s | Covers more CMS environments |

**Deprecated/outdated:**
- Server-side `prefers-color-scheme` CSS injection into iframes via `postMessage`: Not needed — the iframe detects OS preference independently via `matchMedia`.
- Static pre-rendered RSS feeds: Only for static sites with no dynamic data. Mercury's data changes as MusicBrainz is updated.

---

## Open Questions

1. **Curator attribution on web without user auth**
   - What we know: Collections are Tauri-only in Phase 9. Web users have no auth.
   - What's unclear: Can embed-based attribution (using `data-curator` in the snippet) be trusted enough to display publicly on artist pages?
   - Recommendation: Yes, but rate-limit the `/api/curator-feature` endpoint (by IP + artist_mbid, once per 24h per IP) and display attribution as "featured by bloggers" rather than as verified endorsement. If abuse becomes a problem, add a moderation queue later.

2. **RSS event triggers for artist feeds**
   - What we know: MusicBrainz releases are fetched live, not stored. There's no local release history.
   - What's unclear: What constitutes a new feed "item" for an artist — a new release? A tag update? A scene assignment?
   - Recommendation: For Phase 12, the artist RSS feed is informational (not event-driven). Each request returns the artist's current state as a single item. Tag RSS feeds return artists filtered by tag, with each artist as a feed item. This is sufficient for "subscribe to this tag" use cases without needing change tracking.

3. **`added_at` column missing from `artists` table**
   - What we know: The `artists` table has `begin_year` but no `added_at` timestamp for when the record was ingested.
   - What's unclear: Whether the pipeline adds this, or if it was intentionally omitted to keep the DB slim.
   - Recommendation: For the New & Rising page, use `begin_year >= (currentYear - 1) AND ended = 0` as a proxy for "recently active" (not "recently added"). This is discoverable from existing columns and avoids a pipeline change. Document this proxy clearly in the code.

4. **Collection visibility on web (public vs private)**
   - What we know: Collections live in taste.db (Tauri-only). Web has no concept of user collections.
   - What's unclear: What is a "curator's collection" on the web? How does the collection RSS feed work without Tauri?
   - Recommendation: For the web path, the collection RSS endpoint (`/api/rss/collection/[id]`) returns an empty feed with a message explaining this feature requires the desktop app. The curator attribution mechanism on web is embed-driven (via `data-curator` attribute), not collection-driven. This is clean and honest.

---

## Sources

### Primary (HIGH confidence)
- `feed` npm package — https://github.com/jpmonette/feed — TypeScript API, RSS 2.0 / Atom 1.0 / JSON Feed output, image/enclosure support
- SvelteKit `+server.ts` route pattern — https://svelte.dev/docs/kit/adapter-cloudflare — existing project pattern for all `/api/*` routes; same applies to RSS routes
- `qrcode` npm package — https://www.npmjs.com/package/qrcode — SVG output via `QRCode.toString(url, { type: 'svg' })`
- MDN `prefers-color-scheme` — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme — iframe inherits OS preference from the browser independently
- Project codebase — `src-tauri/src/ai/taste_db.rs`, `src/lib/taste/collections.svelte.ts`, `src/lib/db/queries.ts`, `src/routes/api/artist/[mbid]/links/+server.ts` — established patterns this phase must follow

### Secondary (MEDIUM confidence)
- SvelteKit layout scoping pattern — https://github.com/sveltejs/kit/discussions/5003 — `/embed/+layout.svelte` approach for opt-out of root layout
- Cover Art Archive URL format — https://coverartarchive.org — `https://coverartarchive.org/release-group/{mbid}/front-250` (already used in project)
- RSS best practices — https://www.rssboard.org/rss-profile — absolute URLs, `application/rss+xml` content type, `<enclosure>` for media
- Accept header routing — existing MusicBrainz proxy pattern in project (`Accept: 'application/json'` already used)
- Dark mode in iframes — https://teodragovic.com/blog/dark-mode-color-scheme-and-iframes/ — iframe reads `prefers-color-scheme` from browser OS directly

### Tertiary (LOW confidence)
- Script-tag embed pattern for `embed.js` static loader — https://ferndesk.com/blog/building-embeddable-widgets-with-svelte — general pattern, details TBD in implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `feed` and `qrcode` are well-established, TypeScript-typed packages verified via npm
- Architecture: HIGH — all patterns are extensions of established project patterns (D1Provider, +server.ts, taste.db schema)
- Pitfalls: HIGH — layout leak and prerender pitfalls verified against SvelteKit docs; attribution table creation verified against project D1 patterns
- Open questions: MEDIUM — curator attribution on web is a design decision with clear options, not a technical unknown

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (30 days — stable ecosystem, `feed` and `qrcode` are not fast-moving packages)
