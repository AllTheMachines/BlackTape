# Phase 3: Desktop App Foundation - Research

**Researched:** 2026-02-16
**Domain:** Tauri 2.0 desktop shell, SvelteKit dual-build architecture, SQLite local access, database distribution
**Confidence:** HIGH

## Summary

This phase wraps the existing SvelteKit web app in a Tauri 2.0 desktop shell that reads a local SQLite database for offline search. The core challenge is architectural: the current codebase uses `+page.server.ts` files with Cloudflare D1 bindings, which cannot work in Tauri's static/SPA build (no server runtime). The solution requires a database abstraction layer and a dual-adapter build system so the same UI code serves both web (Cloudflare adapter with SSR) and desktop (static adapter with Tauri IPC).

Tauri 2.0 is stable at v2.10.2 (February 2026), well-documented, and has official SvelteKit integration guides. The SQL plugin (`tauri-plugin-sql`) provides a JavaScript API for SQLite queries including FTS5 support. The auto-updater plugin handles app updates with cryptographic signing. Database distribution requires compression of the ~816MB SQLite file (expected ~80-120MB with zstd) and a diff-based update mechanism using SQLite's session extension or `sqldiff`.

**Primary recommendation:** Build a database abstraction layer (`$lib/db/`) that provides the same query interface for both D1 (web) and Tauri SQL plugin (desktop), selected at runtime via `isTauri` detection. Use conditional SvelteKit adapters switched by environment variable.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/cli` | latest (2.x) | Tauri CLI for scaffolding, dev, and build | Official Tauri tooling |
| `tauri` (Rust crate) | 2.10.x | Desktop shell runtime | Core framework, stable since Oct 2024 |
| `tauri-plugin-sql` | 2.x | SQLite access from JavaScript via sqlx | Official plugin, supports FTS5 |
| `@tauri-apps/plugin-sql` | 2.x | JS bindings for SQL plugin | Official JS guest bindings |
| `tauri-plugin-updater` | 2.x | Auto-update mechanism | Official plugin, signature-verified updates |
| `@tauri-apps/plugin-updater` | 2.x | JS bindings for updater | Official JS guest bindings |
| `@tauri-apps/api` | 2.x | Core Tauri APIs (invoke, isTauri, path) | Official JS API |
| `@sveltejs/adapter-static` | latest | Static/SPA build for Tauri | Required -- Tauri has no server runtime |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tauri-apps/plugin-process` | 2.x | App relaunch after updates | Used with updater plugin |
| `cross-env` | latest | Cross-platform env vars in npm scripts | Switching adapters in build scripts |
| `create-torrent` / `webtorrent` | latest | Torrent file creation and seeding | Database distribution pipeline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tauri-plugin-sql` (sqlx) | `tauri-plugin-rusqlite2` (rusqlite) | rusqlite has better SQLite feature coverage but is a third-party fork; official plugin is safer |
| `tauri-plugin-sql` | Custom Rust commands with rusqlite | More control, but more Rust code to maintain; plugin is sufficient for read-only queries |
| SQLite session extension for diffs | `sqldiff` CLI tool | Session extension generates binary patchsets; sqldiff generates SQL scripts. Both work, but sqldiff is simpler for a read-only database |
| File-level compression (gzip/zstd) | sqlite-zstd (row-level compression) | File-level is simpler for distribution; row-level is for runtime compression. Use file-level for download, no runtime compression needed |

**Installation:**
```bash
# Frontend dependencies
npm install @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-updater @tauri-apps/plugin-process @sveltejs/adapter-static cross-env

# Tauri CLI (devDependency)
npm install -D @tauri-apps/cli

# Rust plugins (in src-tauri/Cargo.toml)
# tauri-plugin-sql = { version = "2", features = ["sqlite"] }
# tauri-plugin-updater = "2"
```

## Architecture Patterns

### Recommended Project Structure
```
mercury/
├── src/                          # SvelteKit frontend (shared)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── queries.ts        # Query functions (EXISTING, refactored)
│   │   │   ├── provider.ts       # Database abstraction layer (NEW)
│   │   │   ├── d1-provider.ts    # D1 implementation for web (NEW)
│   │   │   └── tauri-provider.ts # Tauri SQL plugin implementation (NEW)
│   │   ├── platform.ts           # Platform detection utilities (NEW)
│   │   └── ...existing...
│   ├── routes/
│   │   ├── +layout.ts            # SSR/prerender config (NEW for Tauri)
│   │   └── ...existing...
│   └── app.d.ts                  # Type declarations (MODIFIED)
├── src-tauri/                    # Tauri backend (NEW)
│   ├── src/
│   │   ├── lib.rs                # Plugin registration, setup
│   │   └── main.rs               # Entry point
│   ├── capabilities/
│   │   └── default.json          # Permissions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── svelte.config.js              # Conditional adapter (MODIFIED)
├── package.json                  # Build scripts (MODIFIED)
└── pipeline/                     # Data pipeline (EXISTING)
    └── data/
        └── mercury.db            # Source database (816MB)
```

### Pattern 1: Database Abstraction Layer (CRITICAL)
**What:** A provider interface that abstracts D1 and Tauri SQL behind a common API, so query functions work unchanged.
**When to use:** Every database access in the app.
**Why critical:** The existing code passes `D1Database` objects from `platform.env.DB`. In Tauri, there is no `platform.env`. The abstraction must happen at the provider level, not in every route.

```typescript
// src/lib/db/provider.ts
export interface DbProvider {
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}

// src/lib/db/d1-provider.ts
export class D1Provider implements DbProvider {
  constructor(private db: D1Database) {}

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const { results } = await this.db
      .prepare(sql)
      .bind(...params)
      .all<T>();
    return results;
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const results = await this.all<T>(sql, ...params);
    return results[0] ?? null;
  }
}

// src/lib/db/tauri-provider.ts
import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:mercury.db');
  }
  return dbInstance;
}

export class TauriProvider implements DbProvider {
  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const db = await getDb();
    return db.select<T[]>(sql, params);
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const results = await this.all<T>(sql, ...params);
    return results[0] ?? null;
  }
}
```

### Pattern 2: Conditional Adapter Build
**What:** svelte.config.js selects adapter based on environment variable.
**When to use:** Build time -- `npm run build` for web, `npm run build:desktop` for Tauri.

```javascript
// svelte.config.js
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';

const isDesktop = process.env.TAURI_ENV === '1';

const config = {
  kit: {
    adapter: isDesktop
      ? adapterStatic({ fallback: 'index.html' })
      : adapterCloudflare({
          routes: { include: ['/*'], exclude: ['<all>'] }
        })
  }
};

export default config;
```

### Pattern 3: Platform Detection at Runtime
**What:** Detect whether running in Tauri webview or browser to select the correct database provider.
**When to use:** In universal load functions and components that need data.

```typescript
// src/lib/platform.ts
export function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}
```

**Note:** `isTauri` can also be imported from `@tauri-apps/api/core` in Tauri 2.

### Pattern 4: Universal Load Functions (Replacing Server Load)
**What:** Move data loading from `+page.server.ts` to `+page.ts` so it works in both web (SSR) and desktop (SPA) contexts.
**When to use:** For the Tauri build. The web build can keep `+page.server.ts` for SSR benefits.
**Architecture decision required:** Two approaches exist:

**Approach A -- Dual files (recommended):**
Keep `+page.server.ts` for the web build. For the desktop build, the adapter-static SPA mode means these files are ignored at runtime since SSR is disabled. The `+page.ts` universal load function receives data from `+page.server.ts` on the server, but in SPA mode with SSR disabled, only `+page.ts` runs. So you need `+page.ts` files that can load data client-side in the desktop context.

**Approach B -- API-first refactor:**
Move all database queries behind `/api/` routes. On web, these work as SvelteKit server routes. In Tauri, replace fetch calls with Tauri IPC invoke calls. This keeps the same data flow pattern.

**Recommendation: Approach A with a twist.** The existing `+page.server.ts` files continue to work for the web build (Cloudflare adapter). Add `+page.ts` files that check `isTauri()`: if true, load data via Tauri SQL plugin; if false (web SPA fallback), the data comes from the server load function's data prop.

### Pattern 5: Tauri Configuration
**What:** Core tauri.conf.json setup.

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Mercury",
  "identifier": "com.mercury.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "cross-env TAURI_ENV=1 npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../build"
  },
  "app": {
    "windows": [
      {
        "title": "Mercury",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  },
  "plugins": {
    "sql": {
      "preload": {
        "db": "sqlite:mercury.db"
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Forking the UI code for desktop:** Never maintain separate Svelte components. One codebase, two build targets.
- **Using `+page.server.ts` exclusively:** These will not execute in Tauri. Any route that uses ONLY server load functions will break in the desktop build.
- **Hardcoding D1Database type everywhere:** Abstract behind the provider interface so the type system works for both platforms.
- **Embedding the database in the app bundle:** The 816MB database should be downloaded separately after first launch, not bundled with the installer.
- **Skipping updater signatures:** Tauri requires cryptographic signatures for updates. Cannot be disabled. Generate keys early.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite access from JS in Tauri | Custom Rust commands for every query | `tauri-plugin-sql` | Plugin handles connection pooling, async, serialization |
| App auto-updates | Custom download/replace logic | `tauri-plugin-updater` | Handles signatures, platform differences, rollback |
| Windows installer | Custom NSIS scripts | Tauri's built-in bundler | Generates both NSIS and MSI with WebView2 bootstrapping |
| Torrent creation | Custom BitTorrent implementation | `create-torrent` + `webtorrent` npm packages | Mature, handles all the protocol complexity |
| Database diffing | Row-by-row comparison scripts | `sqldiff` (SQLite built-in tool) | Generates SQL or binary changesets efficiently |
| Platform detection | Window property sniffing | `isTauri` from `@tauri-apps/api/core` | Official, maintained, handles edge cases |

**Key insight:** Tauri's plugin ecosystem handles the hard desktop problems (updates, signing, installers). The custom work is the database abstraction layer and the build pipeline -- these are project-specific.

## Common Pitfalls

### Pitfall 1: +page.server.ts Files Breaking in Tauri
**What goes wrong:** The app builds but pages return errors because `+page.server.ts` load functions try to access `platform.env.DB` which doesn't exist in the static/SPA build.
**Why it happens:** Tauri uses `adapter-static` which produces a pure SPA. There is no server runtime. Files named `+page.server.ts` are excluded from the static build entirely.
**How to avoid:** Add `+page.ts` universal load functions that detect the platform and load data via Tauri SQL plugin when running in desktop mode. The `+page.server.ts` files remain for the web build.
**Warning signs:** 503 errors on search, "Database not available" messages, blank pages.

### Pitfall 2: Database File Location
**What goes wrong:** The Tauri SQL plugin looks for `mercury.db` in the app's config directory, but the file is 816MB and isn't bundled with the installer.
**Why it happens:** `Database.load('sqlite:mercury.db')` resolves relative to `tauri::path::BaseDirectory::App`, which varies by OS.
**How to avoid:** Implement a first-run setup flow: check if database exists, if not, show download UI. Store the database in the app data directory. Handle the path resolution explicitly.
**Warning signs:** "Database not found" errors on first launch.

### Pitfall 3: Database Size Mismatch
**What goes wrong:** The actual database is 816MB, not 30-50MB as originally projected. Distribution becomes harder.
**Why it happens:** The projection was based on a slim schema estimate. The actual data with 2.8M artists, millions of tags, and FTS5 indexes is larger.
**How to avoid:** Compress with zstd for download (expected ~80-120MB). Consider running `VACUUM` on the database before distribution. Consider whether all tags are needed (filtering low-count tags could significantly reduce size). The FTS5 index alone may be substantial.
**Warning signs:** Users complaining about download size or time.

### Pitfall 4: IPC Overhead for Rapid Queries
**What goes wrong:** Search-as-you-type feels sluggish because each keystroke triggers a Tauri IPC invoke (~0.5ms overhead per call) plus JSON serialization of results.
**Why it happens:** Tauri IPC uses JSON-RPC under the hood. For small payloads this is fast, but for result sets of 50 artists with tags, the serialization adds up.
**How to avoid:** Debounce search input (200-300ms). The 0.5ms IPC overhead is negligible compared to the SQLite query time. The real concern is unnecessary queries during typing.
**Warning signs:** UI freezes during rapid typing.

### Pitfall 5: WebView2 on Windows
**What goes wrong:** App fails to launch on older Windows installations that don't have WebView2 installed.
**Why it happens:** WebView2 is preinstalled on Windows 11 but not guaranteed on Windows 10.
**How to avoid:** Tauri's NSIS installer automatically bootstraps WebView2. Use NSIS (not MSI) as the primary Windows installer format for this reason.
**Warning signs:** Users reporting blank windows or crashes on Windows 10.

### Pitfall 6: Vite Asset Inlining and CSP
**What goes wrong:** Small assets (<4KB) get base64-inlined by Vite, which conflicts with Content Security Policy restrictions in Tauri.
**Why it happens:** Tauri has stricter CSP than browsers. Inline data URIs may be blocked.
**How to avoid:** Set `build.assetsInlineLimit: 0` in vite.config.ts for the desktop build to disable asset inlining.
**Warning signs:** Missing icons, broken styles, CSP errors in the webview console.

### Pitfall 7: Updater Key Management
**What goes wrong:** You lose the private signing key and can never push updates to existing installations.
**Why it happens:** The key is generated once and if not backed up, it's gone forever.
**How to avoid:** Generate the signing key pair early. Back up the private key securely. The public key goes in `tauri.conf.json`. The private key is set as an environment variable during builds.
**Warning signs:** N/A -- this is a one-time catastrophic failure with no warning.

## Code Examples

### Database Provider Usage in a Load Function
```typescript
// src/routes/search/+page.ts (universal load function for Tauri)
import { getProvider } from '$lib/db/provider';
import { searchArtists, searchByTag } from '$lib/db/queries';

export const load = async ({ url, data }) => {
  // In web SSR mode, data comes from +page.server.ts
  if (data?.results) return data;

  // In Tauri SPA mode, query locally
  const q = url.searchParams.get('q')?.trim() ?? '';
  const mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';

  if (!q) {
    return { results: [], query: '', mode, matchedTag: null, error: false };
  }

  try {
    const provider = await getProvider();
    const results = mode === 'tag'
      ? await searchByTag(provider, q)
      : await searchArtists(provider, q);
    return { results, query: q, mode, matchedTag: mode === 'tag' ? q : null, error: false };
  } catch (err) {
    console.error('Search error:', err);
    return { results: [], query: q, mode, matchedTag: null, error: true };
  }
};
```

### Refactored Query Function (Provider-Based)
```typescript
// src/lib/db/queries.ts (refactored to use DbProvider instead of D1Database)
import type { DbProvider } from './provider';

export async function searchArtists(
  db: DbProvider,
  query: string,
  limit: number = 50
): Promise<ArtistResult[]> {
  const sanitized = sanitizeFtsQuery(query);
  const lowerQuery = query.toLowerCase().trim();

  if (!sanitized) {
    return db.all<ArtistResult>(
      `SELECT a.id, a.mbid, a.name, a.slug, a.country,
              GROUP_CONCAT(at2.tag, ', ') AS tags
       FROM artists a
       LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
       WHERE a.name LIKE ?
       GROUP BY a.id
       ORDER BY
         CASE
           WHEN LOWER(a.name) = ? THEN 0
           WHEN LOWER(a.name) LIKE ? THEN 1
           ELSE 2
         END,
         a.name
       LIMIT ?`,
      `%${query}%`, lowerQuery, lowerQuery + '%', limit
    );
  }

  return db.all<ArtistResult>(
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists_fts f
     JOIN artists a ON a.id = f.rowid
     WHERE artists_fts MATCH ?
     ORDER BY
       CASE
         WHEN LOWER(a.name) = ? THEN 0
         WHEN LOWER(a.name) LIKE ? THEN 1
         ELSE 2
       END,
       f.rank
     LIMIT ?`,
    sanitized, lowerQuery, lowerQuery + '%', limit
  );
}
```

### Tauri SQL Plugin Bind Value Difference
```typescript
// IMPORTANT: D1 uses .bind() with positional args
// tauri-plugin-sql uses $1, $2 placeholders and an array
// Both use ? placeholders for SQLite -- they are compatible!
// D1: db.prepare(sql).bind(val1, val2).all()
// Tauri: db.select(sql, [val1, val2])
// The provider abstraction handles this difference.
```

### Build Scripts
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:desktop": "cross-env TAURI_ENV=1 vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### SvelteKit Layout for Tauri Build
```typescript
// src/routes/+layout.ts
// This file is needed for the static/SPA build.
// For the web build (Cloudflare adapter), SSR is handled by +layout.server.ts.
// The TAURI_ENV check happens at build time via Vite's define config.

// When building for desktop (adapter-static):
export const ssr = false;
export const prerender = false;
```

**Note:** This file should only set `ssr = false` in the desktop build. For the web build, SSR should remain enabled. This can be handled by the conditional adapter -- when `adapter-static` is used with `fallback: 'index.html'`, SvelteKit automatically operates in SPA mode regardless of this setting.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri 1.x (single process) | Tauri 2.x (plugin architecture) | Oct 2024 | Plugins are now separate crates; more modular |
| `window.__TAURI__` detection | `isTauri` from `@tauri-apps/api/core` | Tauri 2.0 | Official API, no more window sniffing |
| WiX-only Windows installer | NSIS + WiX both supported | Tauri 2.0 | NSIS handles WebView2 bootstrapping |
| Manual IPC serialization | Automatic serde serialization | Tauri 2.0 | Commands auto-serialize/deserialize with serde |
| SvelteKit adapter-auto | Explicit adapter selection | SvelteKit 2.x | Must explicitly choose adapter per target |

**Deprecated/outdated:**
- Tauri 1.x APIs -- the v2 API is different. Don't follow v1 guides.
- `window.__TAURI_METADATA__` -- deprecated in v2, use `isTauri` from `@tauri-apps/api/core` instead.
- MSI-only Windows distribution -- NSIS is now recommended for better WebView2 handling.

## Open Questions

1. **Database size optimization**
   - What we know: The actual database is 816MB, much larger than the 30-50MB projection. Compressed it should be ~80-120MB.
   - What's unclear: How much can the database be reduced by filtering low-count tags or optimizing the FTS5 index? What is the FTS5 index size vs data size?
   - Recommendation: Run `VACUUM` on the database, measure component sizes (artists table, tags table, FTS5 index). Test zstd compression. Consider a tag count threshold (e.g., only tags with count >= 2) to reduce size.

2. **Database download UX**
   - What we know: The database needs to be downloaded separately from the app installer. First-run experience matters.
   - What's unclear: Should the download happen inside the app with a progress bar, or should users download the file separately? How to handle interrupted downloads?
   - Recommendation: In-app download with progress bar. Show a "Download Database" screen on first launch. Use chunked download with resume support.

3. **Torrent distribution priority**
   - What we know: Torrent distribution is in the requirements (DIST-01). WebTorrent exists as a library.
   - What's unclear: Is torrent a day-one requirement, or can direct download come first? How many seeders are needed for it to be useful?
   - Recommendation: Start with direct download (HTTP). Add torrent as a second distribution channel later. Torrent makes more sense once there are enough users to seed.

4. **Database update mechanism**
   - What we know: SQLite session extension can generate binary changesets/patchsets. `sqldiff` can generate SQL scripts. MusicBrainz publishes weekly dumps.
   - What's unclear: What's the size of a typical weekly diff? Is it small enough to download frequently? Can the FTS5 index be incrementally updated?
   - Recommendation: For v1, implement full database replacement (download new compressed DB, swap). Diff-based updates are an optimization for later when update frequency and diff sizes are known.

5. **Bind parameter syntax compatibility**
   - What we know: D1 uses `.prepare(sql).bind(...args).all()`. Tauri SQL plugin uses `db.select(sql, args)`. Both use `?` as the placeholder for SQLite.
   - What's unclear: Are there edge cases where D1's SQL dialect differs from sqlx's SQLite dialect? FTS5 MATCH syntax compatibility?
   - Recommendation: The provider abstraction handles the API difference. The SQL itself should be identical since both target SQLite. Test FTS5 MATCH queries early in the Tauri context.

## Sources

### Primary (HIGH confidence)
- [Tauri v2 SvelteKit Guide](https://v2.tauri.app/start/frontend/sveltekit/) -- Official setup instructions, adapter-static requirement, SSR configuration
- [Tauri v2 SQL Plugin](https://v2.tauri.app/plugin/sql/) -- Plugin setup, JavaScript API, permissions, migration support
- [Tauri v2 Updater Plugin](https://v2.tauri.app/plugin/updater/) -- Auto-update mechanism, signing, static JSON vs dynamic server
- [Tauri v2 Calling Rust](https://v2.tauri.app/develop/calling-rust/) -- IPC pattern, command definition, state management
- [Tauri v2 Configuration](https://v2.tauri.app/reference/config/) -- tauri.conf.json schema reference
- [Tauri v2 Releases](https://v2.tauri.app/release/) -- Current version: 2.10.2 (Feb 2026)
- [Tauri SQL Plugin Source](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/sql/guest-js/index.ts) -- TypeScript API: `Database.select<T>()` returns `Promise<T>`, `Database.load()` connects to SQLite
- [SvelteKit Loading Data Docs](https://svelte.dev/docs/kit/load) -- Universal vs server load functions

### Secondary (MEDIUM confidence)
- [Tauri + SvelteKit Discussion #6423](https://github.com/tauri-apps/tauri/discussions/6423) -- Community experience reports, +page.server.ts incompatibility confirmed
- [SvelteKit Universal Architecture](https://nsarrazin.com/blog/sveltekit-universal) -- Conditional adapter pattern with environment variables
- [Conditional SvelteKit Adapters](https://www.ryanfiller.com/blog/tips/conditional-sveltekit-adapters) -- Environment variable pattern for adapter switching
- [Tauri IPC Discussion #5690](https://github.com/tauri-apps/tauri/discussions/5690) -- IPC latency ~0.5ms for small payloads
- [SQLite Session Extension](https://sqlite.org/sessionintro.html) -- Binary changeset/patchset generation for database diffs
- [sqldiff Utility](https://www.sqlite.org/sqldiff.html) -- SQL script generation for database differences

### Tertiary (LOW confidence)
- Compression ratio estimates (80-120MB for 816MB database with zstd) -- based on general benchmarks, not tested on Mercury's specific data distribution
- WebTorrent for in-app torrent functionality -- not verified for Tauri context specifically

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Tauri 2.0 is stable, plugins are official, SvelteKit integration is documented
- Architecture: HIGH -- The dual-adapter pattern is well-established; the database abstraction is a standard adapter pattern
- Pitfalls: HIGH -- Multiple sources confirm the +page.server.ts issue; database size is measured from actual data
- Distribution: MEDIUM -- Compression ratios are estimates; diff mechanism needs testing with actual data

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (Tauri 2.x is stable; major changes unlikely in 30 days)
