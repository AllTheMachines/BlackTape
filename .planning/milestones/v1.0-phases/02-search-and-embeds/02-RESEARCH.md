# Phase 2: Search + Artist Pages + Embeds - Research

**Researched:** 2026-02-15
**Domain:** SvelteKit + Cloudflare D1/FTS5, MusicBrainz API, Platform Embeds (Bandcamp/Spotify/SoundCloud/YouTube)
**Confidence:** HIGH

## Summary

Phase 2 transforms Mercury from a placeholder landing page into a functional music discovery experience. The core loop is: search for an artist or tag, land on an artist page, press play via an embedded player. The tech stack is already decided (SvelteKit on Cloudflare Pages + D1), and Phase 1's data pipeline has produced a SQLite database with ~2.8M artists, tags, and FTS5 index.

The primary technical challenges are: (1) getting the existing SQLite database uploaded to Cloudflare D1 while staying within the 500MB free tier limit, (2) building fast FTS5 search with two distinct modes (artist name vs tags), (3) fetching external links from MusicBrainz API at runtime to power embeds, and (4) rendering four different embed players (Bandcamp, Spotify, SoundCloud, YouTube) with proper fallbacks.

**Primary recommendation:** Build server-side SvelteKit routes that query D1 via `platform.env.DB`, proxy MusicBrainz API calls through a server endpoint with rate limiting and caching, and render embeds as lazy-loaded iframes with platform-specific URL patterns. Use the MBID (MusicBrainz ID) as the primary artist identifier in URLs, with a human-readable slug for SEO (e.g., `/artist/radiohead-a74b1b7f`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-tier search: instant results for indexed data (FTS5), submit-and-wait for anything hitting external sources
- Separate search modes for artist names vs tags (not unified -- distinct entry points or toggle/prefix)
- Rich result cards: artist name, country, top tags, and match reason (why this result matched)
- Results displayed as a card grid, not a vertical list
- Balanced layout: info and embeds share equal weight -- neither dominates
- Content shown: tags, country, external links (platform icons/buttons), and bio snippet (from MusicBrainz/Wikipedia when available)
- Tags displayed as clickable chips -- clicking a tag triggers a tag search
- Clean slug URLs: `/artist/radiohead` -- human-readable and shareable
- All four platforms supported in Phase 2: Bandcamp, YouTube, Spotify, SoundCloud
- Priority order: Bandcamp first when available (aligns with independent music values), then others
- Data source: MusicBrainz URLs as primary source + live API lookup for missing links
- No-embed fallback: show external links only ("Listen on Bandcamp", etc.) -- no empty state, no search links
- Dark + minimal aesthetic -- dark background, clean typography, functional feel
- Reference: All The Machines (all-the-machines.com) -- dark, utilitarian, information-first, a tool not a magazine
- Information-dense layout -- pack in data, less scrolling, more results visible
- Landing page: search-first -- big search bar front and center, Google-style

### Claude's Discretion
- Loading skeletons and transition animations
- Exact spacing, typography choices, and color palette within dark theme
- Error state handling and edge cases
- Search debounce timing and UX micro-interactions
- Tag search mode UI (toggle, prefix, tabs -- whatever works best)
- Bio snippet length and formatting
- Embed player sizing and responsive behavior

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already decided -- from project setup)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50 | Full-stack framework | Already scaffolded, Svelte 5 with runes |
| Svelte | ^5.49 | Component framework | Already in place |
| @sveltejs/adapter-cloudflare | latest | Deploy to Cloudflare Workers/Pages | Required for D1 bindings |
| Cloudflare D1 | N/A (service) | SQLite database hosting | Free tier: 500MB DB, 5M reads/day, 100K writes/day |
| Wrangler CLI | latest | Local dev + deploy | Required for D1 local dev and database import |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/workers-types | latest | TypeScript types for D1, Cache API | Type safety in server routes |
| lite-youtube-embed | ^1.8 | Lightweight YouTube embeds | 224x faster than standard YouTube iframe, ~100KB vs 1.3MB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw D1 queries | Drizzle ORM | Adds abstraction; raw SQL is simpler for this read-heavy use case with known schema |
| lite-youtube-embed | Standard iframe | Standard iframe loads 1.3MB per embed; lite loads thumbnail until click |
| Custom slug generation | slugify npm package | Minimal utility; a simple regex replacement is sufficient for artist names |

### Installation
```bash
# Replace adapter-auto with adapter-cloudflare
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-cloudflare @cloudflare/workers-types

# Lightweight YouTube embed (only additional runtime dependency)
npm install lite-youtube-embed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  routes/
    +page.svelte                    # Landing: search bar, hero
    +page.server.ts                 # Landing: could serve trending/random artists
    +layout.svelte                  # Global layout, dark theme, nav
    search/
      +page.svelte                  # Search results page (card grid)
      +page.server.ts               # FTS5 query against D1
    artist/
      [slug]/
        +page.svelte                # Artist page (info + embeds)
        +page.server.ts             # D1 lookup + MusicBrainz API fetch
    api/
      search/
        +server.ts                  # JSON search API (for instant/AJAX search)
      artist/
        [mbid]/
          links/
            +server.ts              # Proxy MusicBrainz url-rels lookup
  lib/
    config.ts                       # Project name (already exists)
    db/
      queries.ts                    # D1 query functions (search, artist lookup)
    embeds/
      types.ts                      # Embed URL types + platform detection
      bandcamp.ts                   # Bandcamp embed URL builder
      spotify.ts                    # Spotify embed URL builder
      soundcloud.ts                 # SoundCloud embed URL builder
      youtube.ts                    # YouTube embed URL builder
    components/
      SearchBar.svelte              # Reusable search input
      SearchResults.svelte          # Card grid of results
      ArtistCard.svelte             # Individual result card
      EmbedPlayer.svelte            # Platform-aware embed wrapper
      TagChip.svelte                # Clickable tag chip
      ExternalLink.svelte           # "Listen on X" fallback link
    styles/
      theme.css                     # CSS custom properties (dark theme)
```

### Pattern 1: D1 Database Access in Server Load Functions
**What:** Access Cloudflare D1 via `platform.env.DB` in SvelteKit server load functions
**When to use:** Any page that needs database data (search results, artist pages)
**Example:**
```typescript
// src/routes/search/+page.server.ts
// Source: https://developers.cloudflare.com/d1/examples/d1-and-sveltekit/
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, platform }) => {
  const query = url.searchParams.get('q') ?? '';
  const mode = url.searchParams.get('mode') ?? 'artist'; // 'artist' | 'tag'

  if (!query.trim()) return { results: [], query, mode };

  const db = platform?.env?.DB;
  if (!db) return { results: [], query, mode, error: 'Database unavailable' };

  // FTS5 prefix search for instant results
  const sanitized = query.replace(/['"]/g, '').trim();

  let results;
  if (mode === 'tag') {
    // Tag search: find artists by tag name
    results = await db.prepare(`
      SELECT a.id, a.mbid, a.name, a.country, a.type,
        GROUP_CONCAT(at2.tag, ', ') as tags
      FROM artist_tags at1
      JOIN artists a ON a.id = at1.artist_id
      LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
      WHERE at1.tag LIKE ?
      GROUP BY a.id
      ORDER BY at1.count DESC
      LIMIT 50
    `).bind(`${sanitized}%`).all();
  } else {
    // Artist name search via FTS5
    results = await db.prepare(`
      SELECT a.id, a.mbid, a.name, a.country, a.type,
        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) as tags,
        rank
      FROM artists_fts fts
      JOIN artists a ON a.id = fts.rowid
      WHERE artists_fts MATCH ?
      ORDER BY rank
      LIMIT 50
    `).bind(`${sanitized}*`).all();
  }

  return { results: results?.results ?? [], query, mode };
};
```

### Pattern 2: MusicBrainz API Proxy with Rate Limiting
**What:** Proxy MusicBrainz API calls through a SvelteKit server endpoint to respect rate limits (1 req/sec) and cache responses
**When to use:** Fetching external links (URLs) for artist pages
**Example:**
```typescript
// src/routes/api/artist/[mbid]/links/+server.ts
import type { RequestHandler } from './$types';

const MB_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/your-repo)';

// Simple in-memory rate limiter (1 req/sec to MusicBrainz)
let lastRequest = 0;

export const GET: RequestHandler = async ({ params, platform }) => {
  const { mbid } = params;

  // Check cache first (Cloudflare Cache API)
  const cacheKey = `https://mercury.internal/api/artist/${mbid}/links`;
  const cache = platform?.caches?.default;
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // Rate limit: wait if needed
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();

  // Fetch from MusicBrainz
  const response = await fetch(
    `${MB_API}/artist/${mbid}?inc=url-rels&fmt=json`,
    { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'MusicBrainz API error' }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await response.json();

  // Extract platform URLs from relations
  const links = extractPlatformLinks(data.relations ?? []);

  const result = new Response(JSON.stringify(links), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400' // 24hr cache
    }
  });

  // Store in Cloudflare cache
  if (cache) {
    await cache.put(cacheKey, result.clone());
  }

  return result;
};

function extractPlatformLinks(relations: any[]) {
  const links: Record<string, string[]> = {
    bandcamp: [],
    spotify: [],
    soundcloud: [],
    youtube: [],
    other: []
  };

  for (const rel of relations) {
    if (rel['target-type'] !== 'url') continue;
    const url = rel.url?.resource ?? '';

    if (url.includes('bandcamp.com')) links.bandcamp.push(url);
    else if (url.includes('open.spotify.com')) links.spotify.push(url);
    else if (url.includes('soundcloud.com')) links.soundcloud.push(url);
    else if (url.includes('youtube.com') || url.includes('youtu.be')) links.youtube.push(url);
    else links.other.push(url);
  }

  return links;
}
```

### Pattern 3: Embed URL Construction
**What:** Convert platform URLs from MusicBrainz into embeddable iframe URLs
**When to use:** Rendering embedded players on artist pages
**Example:**
```typescript
// src/lib/embeds/spotify.ts
// Source: https://developer.spotify.com/documentation/embeds

/**
 * Convert a Spotify URL to an embed URL.
 * Input:  https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb
 * Output: https://open.spotify.com/embed/artist/4Z8W4fKeB5YxbusRsdQVPb
 */
export function spotifyEmbedUrl(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}`;
}

// src/lib/embeds/youtube.ts
/**
 * Extract YouTube video/channel ID for embedding.
 * Channels can't be embedded directly -- link to channel page instead.
 * Videos: https://www.youtube.com/embed/{videoId}
 */
export function youtubeEmbedUrl(url: string): string | null {
  // Video URL patterns
  const videoMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (videoMatch) return `https://www.youtube-nocookie.com/embed/${videoMatch[1]}`;
  return null; // Channel URLs can't be embedded
}

// src/lib/embeds/bandcamp.ts
/**
 * Bandcamp embeds require album/track IDs which are NOT in the URL.
 * The URL from MusicBrainz is like: https://artistname.bandcamp.com
 * To embed, we need: https://bandcamp.com/EmbeddedPlayer/album={albumId}/...
 *
 * Strategy: For Bandcamp, show "Listen on Bandcamp" link as fallback
 * unless we can scrape the album ID from the page meta tags.
 * Bandcamp does NOT have an oEmbed endpoint.
 */
export function bandcampEmbedUrl(url: string, albumId?: string): string | null {
  if (!albumId) return null; // Can't embed without album ID
  return `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=large/bgcol=0a0a0a/linkcol=e0e0e0/tracklist=false/transparent=true/`;
}

// src/lib/embeds/soundcloud.ts
// Source: https://developers.soundcloud.com/docs/oembed
/**
 * SoundCloud supports oEmbed. Fetch embed HTML from their endpoint.
 * Endpoint: https://soundcloud.com/oembed?url={url}&format=json
 */
export async function soundcloudEmbedHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json&maxheight=166`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.html ?? null;
  } catch {
    return null;
  }
}
```

### Pattern 4: Artist Slug URL Strategy
**What:** Use MBID as the unique identifier with human-readable prefix for SEO
**When to use:** Artist page URLs
**Example:**
```typescript
// The user wants: /artist/radiohead
// Problem: Artist names are NOT unique. There are multiple "John Smith" entries.
// Solution: Store a slug column in the database. For duplicates, append MBID suffix.
//   /artist/radiohead         (unique name -> clean slug)
//   /artist/john-smith-a74b1b7f (duplicate name -> slug with MBID prefix)
//
// Lookup strategy:
// 1. Try exact slug match in artists table
// 2. If ambiguous, use MBID suffix to disambiguate
//
// Slug generation (in pipeline or at import time):
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '');           // Trim leading/trailing hyphens
}
```

### Anti-Patterns to Avoid
- **Querying D1 from client-side code:** D1 is only accessible from Workers/server routes. All DB queries must go through `+page.server.ts` or `+server.ts` files.
- **Calling MusicBrainz API directly from the browser:** Exposes rate limiting to client behavior, no caching, CORS issues. Always proxy through server routes.
- **Loading all four embeds eagerly:** Each embed iframe is heavy (especially YouTube at 1.3MB). Load embeds lazily -- show placeholders until user interaction.
- **Storing external URLs in the local database:** URLs change. MusicBrainz is the source of truth for external links. Fetch live, cache aggressively.
- **Using FTS5 MATCH without sanitizing input:** User input must be cleaned of special characters (`"`, `'`, `*`, `(`, `)`) that have meaning in FTS5 query syntax, or queries will fail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube embed performance | Standard `<iframe>` for YouTube | `lite-youtube-embed` web component | Standard iframe loads 1.3MB + dozens of requests before user clicks play. Lite loads only a thumbnail. 224x faster. |
| Spotify embed URL generation | Manual URL parsing | Spotify oEmbed API (`https://open.spotify.com/oembed?url=...`) | Returns pre-built HTML, handles edge cases, provides thumbnail data |
| SoundCloud embed generation | Manual iframe building | SoundCloud oEmbed API (`https://soundcloud.com/oembed?url=...&format=json`) | Returns embed HTML with correct parameters, handles all URL formats |
| FTS5 query sanitization | Custom regex | Dedicated sanitize function | FTS5 has many special characters (`NEAR`, `AND`, `OR`, `NOT`, `*`, `"`, `{`, `}`) that can cause query failures |
| CSS dark theme | Inline styles everywhere | CSS custom properties on `:root` | Single source of truth for colors; easy to maintain and extend |

**Key insight:** The embed problem is NOT about building players -- it's about URL transformation. Each platform has a different URL format for browsing vs embedding, and Mercury's job is to detect the platform from MusicBrainz URLs and transform them into embed URLs. Bandcamp is the hardest because it requires album IDs that aren't in the URL.

## Common Pitfalls

### Pitfall 1: D1 Free Tier Database Size (500MB limit)
**What goes wrong:** The Phase 1 pipeline produces a ~100-200MB SQLite database for 2.8M artists + tags + FTS5 index. This fits within the 500MB free tier limit, but just barely when accounting for FTS5 overhead. Adding more data (Discogs, future phases) could push past it.
**Why it happens:** D1 free tier limits each database to 500MB. The paid tier allows 10GB.
**How to avoid:** Monitor database size after D1 import. The slim schema (artists + tags + country) was specifically designed to stay small. If size becomes an issue, options are: (a) upgrade to Workers Paid ($5/mo, 10GB limit), (b) shard across multiple D1 databases, (c) strip low-value data (artists with 0 tags, ended=1 with no tags).
**Warning signs:** Import fails or D1 reports database near capacity.

### Pitfall 2: MusicBrainz API Rate Limiting
**What goes wrong:** MusicBrainz enforces a strict 1 request per second rate limit per IP. Exceeding this results in 503 responses and potential IP bans.
**Why it happens:** Multiple users loading artist pages simultaneously, each triggering a MusicBrainz API call for external links.
**How to avoid:** (1) Cache responses aggressively using Cloudflare Cache API (24hr TTL is reasonable -- URLs don't change often). (2) Implement server-side rate limiting with a simple timestamp check. (3) Set a proper `User-Agent` header (required by MusicBrainz). (4) Consider batch-prefetching popular artist links.
**Warning signs:** 503 responses from MusicBrainz, slow artist page loads.

### Pitfall 3: Bandcamp Embed Limitation
**What goes wrong:** Bandcamp does NOT support oEmbed. The embed URL requires an album ID (numeric) that is NOT present in the artist page URL stored in MusicBrainz. You cannot simply transform `https://artist.bandcamp.com` into an embed.
**Why it happens:** Bandcamp's embed system requires internal album/track IDs that are only available from the embed code generator on their site.
**How to avoid:** For Phase 2, default to showing "Listen on Bandcamp" as an external link. To enable embeds, you would need to: (a) scrape the album ID from the Bandcamp page's meta tags, or (b) use the Bandcamp API (limited access, requires partner application). The fallback approach aligns with the locked decision: "No-embed fallback: show external links only."
**Warning signs:** Empty Bandcamp embed sections. This is expected and handled by the fallback design.

### Pitfall 4: FTS5 Query Syntax Errors
**What goes wrong:** User input containing FTS5 special characters (`"`, `NEAR`, `AND`, `OR`, `NOT`, `*`, `(`, `)`) causes SQLite to throw parse errors.
**Why it happens:** FTS5 has a query language with operators. Raw user input is passed as a query without sanitization.
**How to avoid:** Strip or escape all FTS5 special characters before constructing the MATCH clause. Use parameterized queries. Wrap in try/catch and fall back to LIKE query if FTS5 fails.
**Warning signs:** 500 errors on search with certain input strings.

### Pitfall 5: D1 Import Process (SQL, not SQLite file)
**What goes wrong:** You try to import the raw `mercury.db` SQLite file into D1 directly.
**Why it happens:** D1 does not accept raw `.sqlite3` files. You must convert to SQL statements first.
**How to avoid:** (1) Export the local database to SQL: `sqlite3 mercury.db .dump > mercury.sql`. (2) Remove `BEGIN TRANSACTION` and `COMMIT` statements. (3) Remove any `_cf_KV` references. (4) Import: `npx wrangler d1 execute mercury-db --remote --file=mercury.sql`. Max import file size: 5GB.
**Warning signs:** Import command fails with format errors.

### Pitfall 6: Artist Name Slug Collisions
**What goes wrong:** Two artists have the same name (e.g., multiple "Phoenix" entries in MusicBrainz). The slug `/artist/phoenix` is ambiguous.
**Why it happens:** Artist names are NOT unique in MusicBrainz. There are thousands of duplicate names.
**How to avoid:** Add a `slug` column to the database during pipeline import. For unique names, use the clean slug. For duplicates, append a short MBID prefix: `phoenix-a74b1b7f`. The lookup first tries exact slug match, then falls back to MBID prefix matching.
**Warning signs:** Wrong artist displayed, or 404 for valid artist names.

## Code Examples

### Cloudflare D1 + SvelteKit Type Setup
```typescript
// src/app.d.ts
// Source: https://developers.cloudflare.com/d1/examples/d1-and-sveltekit/

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
      };
      context: {
        waitUntil(promise: Promise<any>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
```

### Wrangler Configuration
```jsonc
// wrangler.jsonc
{
  "name": "mercury",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_als"],
  "pages_build_output_dir": ".svelte-kit/cloudflare",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mercury-db",
      "database_id": "<your-database-id>"
    }
  ]
}
```

### SvelteKit Adapter Config
```javascript
// svelte.config.js
// Source: https://svelte.dev/docs/kit/adapter-cloudflare
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};

export default config;
```

### FTS5 Search with Prefix Matching
```typescript
// src/lib/db/queries.ts

export function sanitizeFtsQuery(input: string): string {
  // Remove FTS5 special characters, keep only alphanumeric + spaces
  return input
    .replace(/['"(){}[\]*:^~]/g, '')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
    .trim();
}

export async function searchArtists(db: D1Database, query: string, limit = 50) {
  const clean = sanitizeFtsQuery(query);
  if (!clean) return [];

  try {
    // FTS5 prefix search: "radio*" matches "Radiohead"
    const result = await db.prepare(`
      SELECT a.id, a.mbid, a.name, a.country, a.type,
        (SELECT GROUP_CONCAT(tag, '|')
         FROM (SELECT tag FROM artist_tags WHERE artist_id = a.id ORDER BY count DESC LIMIT 5)
        ) as top_tags,
        rank
      FROM artists_fts fts
      JOIN artists a ON a.id = fts.rowid
      WHERE artists_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).bind(`${clean}*`, limit).all();

    return result.results ?? [];
  } catch {
    // Fallback to LIKE if FTS5 query fails
    const result = await db.prepare(`
      SELECT a.id, a.mbid, a.name, a.country, a.type,
        (SELECT GROUP_CONCAT(tag, '|')
         FROM (SELECT tag FROM artist_tags WHERE artist_id = a.id ORDER BY count DESC LIMIT 5)
        ) as top_tags
      FROM artists a
      WHERE a.name LIKE ?
      ORDER BY a.name
      LIMIT ?
    `).bind(`%${clean}%`, limit).all();

    return result.results ?? [];
  }
}

export async function searchByTag(db: D1Database, tag: string, limit = 50) {
  const clean = tag.replace(/['"]/g, '').trim().toLowerCase();
  if (!clean) return [];

  const result = await db.prepare(`
    SELECT a.id, a.mbid, a.name, a.country, a.type,
      at1.count as match_count,
      at1.tag as matched_tag,
      (SELECT GROUP_CONCAT(tag, '|')
       FROM (SELECT tag FROM artist_tags WHERE artist_id = a.id ORDER BY count DESC LIMIT 5)
      ) as top_tags
    FROM artist_tags at1
    JOIN artists a ON a.id = at1.artist_id
    WHERE at1.tag = ?
    ORDER BY at1.count DESC
    LIMIT ?
  `).bind(clean, limit).all();

  return result.results ?? [];
}
```

### Wikipedia Bio Snippet Fetching
```typescript
// src/lib/bio.ts
// Source: https://en.wikipedia.org/api/rest_v1/

/**
 * Fetch a short bio snippet from Wikipedia.
 * MusicBrainz url-rels often include a Wikipedia link for the artist.
 * Extract the page title from the URL and use Wikipedia's REST API.
 */
export async function fetchWikipediaBio(wikiUrl: string): Promise<string | null> {
  // Extract page title from Wikipedia URL
  const match = wikiUrl.match(/wikipedia\.org\/wiki\/(.+)/);
  if (!match) return null;

  const title = decodeURIComponent(match[1]);
  const lang = wikiUrl.match(/\/\/(\w+)\.wikipedia/)?.[1] ?? 'en';

  try {
    const resp = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': 'Mercury/0.1.0' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.extract ?? null; // Plain text extract (first paragraph)
  } catch {
    return null;
  }
}
```

### Dark Theme CSS Custom Properties
```css
/* src/lib/styles/theme.css */
/* Dark + minimal aesthetic, information-dense, utilitarian */
:root {
  /* Background layers (darkest to lightest) */
  --bg-base: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;
  --bg-hover: #222222;

  /* Text hierarchy */
  --text-primary: #e0e0e0;
  --text-secondary: #888888;
  --text-muted: #555555;
  --text-accent: #ffffff;

  /* Borders */
  --border-subtle: #1e1e1e;
  --border-default: #2a2a2a;
  --border-hover: #3a3a3a;

  /* Interactive */
  --link-color: #7eb8da;
  --tag-bg: #1a2332;
  --tag-text: #7eb8da;
  --tag-border: #2a3a4a;

  /* Platform colors */
  --bandcamp-color: #1da0c3;
  --spotify-color: #1db954;
  --soundcloud-color: #ff5500;
  --youtube-color: #ff0000;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Layout */
  --max-width: 1200px;
  --card-radius: 6px;
  --input-radius: 6px;
}
```

### Embed Player Component Pattern
```svelte
<!-- src/lib/components/EmbedPlayer.svelte -->
<script lang="ts">
  import type { PlatformLinks } from '$lib/embeds/types';

  let { links }: { links: PlatformLinks } = $props();

  // Priority order: Bandcamp > Spotify > SoundCloud > YouTube
  const platforms = [
    { key: 'bandcamp', label: 'Bandcamp', color: 'var(--bandcamp-color)' },
    { key: 'spotify', label: 'Spotify', color: 'var(--spotify-color)' },
    { key: 'soundcloud', label: 'SoundCloud', color: 'var(--soundcloud-color)' },
    { key: 'youtube', label: 'YouTube', color: 'var(--youtube-color)' },
  ] as const;

  let activeEmbed = $state<string | null>(null);
</script>

<div class="embeds">
  {#each platforms as platform}
    {#if links[platform.key]?.length > 0}
      <div class="embed-slot">
        {#if activeEmbed === platform.key}
          <!-- Lazy-loaded iframe renders here -->
          <iframe
            src={links[platform.key + '_embed']}
            title="{platform.label} player"
            loading="lazy"
            allow="autoplay; encrypted-media"
          ></iframe>
        {:else}
          <!-- Placeholder: click to load -->
          <button onclick={() => activeEmbed = platform.key}>
            Listen on {platform.label}
          </button>
        {/if}
      </div>
    {/if}
  {/each}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| adapter-cloudflare-workers (separate) | @sveltejs/adapter-cloudflare (unified) | 2024 | Single adapter for both Pages and Workers |
| YouTube `<iframe>` (1.3MB) | lite-youtube-embed web component (~100KB) | 2020+ (mature) | 224x faster initial load, privacy-friendly (youtube-nocookie.com) |
| Cloudflare Pages Functions | SvelteKit server routes on Workers | 2024+ | Functions in `/functions` are NOT deployed; use SvelteKit endpoints instead |
| adapter-auto (generic) | adapter-cloudflare (specific) | Always | adapter-auto may not correctly detect Cloudflare, always use specific adapter |

**Deprecated/outdated:**
- `@sveltejs/adapter-cloudflare-workers`: Merged into `@sveltejs/adapter-cloudflare`. Use the unified adapter.
- `/functions` directory: Cloudflare Pages Functions are NOT compatible with SvelteKit. Implement as SvelteKit server endpoints instead.
- `wrangler.toml`: Still works but `wrangler.jsonc` is now preferred for comments and cleaner syntax.

## Open Questions

1. **Bandcamp Embed Album IDs**
   - What we know: Bandcamp embeds require numeric album IDs not present in MusicBrainz URLs. Bandcamp has no public oEmbed endpoint.
   - What's unclear: Whether scraping album IDs from Bandcamp page meta tags is reliable/allowed by their ToS. The Bandcamp API exists but requires partner application approval.
   - Recommendation: Default to "Listen on Bandcamp" external link fallback for Phase 2. Investigate album ID scraping as a Phase 2 follow-up if demand warrants it. This aligns with the locked decision on no-embed fallback.

2. **Database Size After D1 Import**
   - What we know: Local SQLite is ~100-200MB. D1 free tier allows 500MB per database. FTS5 virtual tables add overhead.
   - What's unclear: Exact D1 storage size after import (D1's internal format may differ from local SQLite). Also: D1 export does NOT support virtual tables, complicating backup/migration.
   - Recommendation: Import and measure. If it exceeds 500MB, options: upgrade to paid ($5/mo), strip low-tag-count artists, or defer FTS5 to query time.

3. **Slug Collision Scale**
   - What we know: MusicBrainz has ~2.8M artists. Artist names are NOT unique. Duplicate names are common.
   - What's unclear: Exact number of duplicate slugs. Could be thousands.
   - Recommendation: Run a deduplication query during pipeline import to identify collisions. Generate slug column with MBID suffix for duplicates. The pipeline should be extended to produce this column.

4. **Wikipedia Bio Coverage**
   - What we know: MusicBrainz url-rels include Wikipedia links for many (but not all) artists. Wikipedia's REST API provides page summaries.
   - What's unclear: What percentage of the 2.8M artists have Wikipedia pages linked in MusicBrainz. For niche artists, bio may be unavailable.
   - Recommendation: Fetch Wikipedia bio as a best-effort enhancement. Display gracefully when unavailable (omit the bio section entirely, don't show "No bio available").

5. **YouTube Embed for Channels vs Videos**
   - What we know: MusicBrainz stores YouTube channel URLs for artists, not individual video URLs. YouTube channels cannot be embedded as players.
   - What's unclear: Best strategy to get an embeddable video from a channel URL.
   - Recommendation: For Phase 2, show YouTube as an external link ("Visit YouTube Channel") unless a specific video URL is available. Getting the latest video from a channel requires the YouTube Data API (quota-limited), which is out of scope for Phase 2.

## Sources

### Primary (HIGH confidence)
- [Cloudflare D1 + SvelteKit Guide](https://developers.cloudflare.com/d1/examples/d1-and-sveltekit/) -- complete setup, code examples, type declarations
- [SvelteKit Cloudflare Adapter](https://svelte.dev/docs/kit/adapter-cloudflare) -- adapter config, platform bindings, deployment
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) -- 500MB free tier, 10GB paid, 50 queries/invocation free
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) -- 5M reads/day, 100K writes/day free
- [Cloudflare D1 Import/Export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) -- SQL import process, 5GB file limit
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) -- url-rels include, JSON format, rate limiting (1 req/sec)
- [Spotify Embed Docs](https://developer.spotify.com/documentation/embeds) -- oEmbed API, iframe format, supported entity types
- [SoundCloud oEmbed](https://developers.soundcloud.com/docs/oembed) -- endpoint, JSON format, response structure
- [SQLite FTS5 Reference](https://sqlite.org/fts5.html) -- prefix queries, tokenizers, query syntax
- [SvelteKit Routing](https://svelte.dev/docs/kit/routing) -- dynamic params, slug routes, load functions
- [SvelteKit Loading Data](https://svelte.dev/docs/kit/load) -- server load, url.searchParams, streaming

### Secondary (MEDIUM confidence)
- [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed) -- 224x faster, ~100KB, privacy-friendly; verified via npm and GitHub
- [Bandcamp Embed Help](https://get.bandcamp.help/hc/en-us/articles/23020711574423) -- no oEmbed, requires album ID, manual embed generation
- [MusicBrainz Artist-URL Types](https://musicbrainz.org/relationships/artist-url) -- relationship type names for platform detection
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) -- caching external API responses in Workers
- [D1 Sharding Strategy](https://pizzaconsole.com/blog/posts/programming/d1-sharding) -- horizontal scaling for D1 databases

### Tertiary (LOW confidence)
- All The Machines (all-the-machines.com) design reference -- could not access site (SSL certificate error), design direction based on user description only ("dark, utilitarian, information-first, a tool not a magazine")

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- SvelteKit + Cloudflare D1 is well-documented with official examples
- Architecture: HIGH -- patterns verified against official Cloudflare and SvelteKit docs
- Embeds: HIGH for Spotify/SoundCloud/YouTube (official APIs), MEDIUM for Bandcamp (no oEmbed, manual process)
- Pitfalls: HIGH -- D1 limits, MusicBrainz rate limiting, FTS5 syntax are well-documented
- Slug strategy: MEDIUM -- collision handling approach is sound but collision count unknown until pipeline runs

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable stack, 30-day validity)
