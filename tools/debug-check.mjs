/**
 * Mercury Debug Check — headless test harness
 *
 * Tests everything without a UI:
 * 1. DB schema and queries (run directly against SQLite)
 * 2. HTTP routes (hits wrangler dev server if running)
 * 3. API routes (MusicBrainz proxy, soundcloud oEmbed)
 *
 * Run from project root:
 *   node tools/debug-check.mjs
 *   node tools/debug-check.mjs --http    # also test HTTP routes (needs wrangler running)
 *   node tools/debug-check.mjs --api     # also test external API calls
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('../pipeline/node_modules/better-sqlite3');
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ARGS = process.argv.slice(2);
const TEST_HTTP = ARGS.includes('--http');
const TEST_API = ARGS.includes('--api');
const HTTP_BASE = 'http://localhost:8788';

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ✗  ${label}`);
  if (detail) console.log(`       ${String(detail).split('\n')[0]}`);
  failed++;
  failures.push({ label, detail: String(detail) });
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ─── DB helpers ────────────────────────────────────────────────────────────

function openDb(path, label) {
  if (!existsSync(path)) {
    fail(`${label} exists`, `File not found: ${path}`);
    return null;
  }
  try {
    return new Database(path, { readonly: true });
  } catch (e) {
    fail(`${label} opens`, e.message);
    return null;
  }
}

function findWranglerDb() {
  const base = join(ROOT, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!existsSync(base)) return null;
  const files = readdirSync(base).filter(f => f.endsWith('.sqlite'));
  return files.length ? join(base, files[0]) : null;
}

function runQuery(db, label, sql, params = []) {
  try {
    const result = db.prepare(sql).all(...params);
    ok(`${label} (${result.length} rows)`);
    return result;
  } catch (e) {
    fail(label, e.message);
    return null;
  }
}

function runGet(db, label, sql, params = []) {
  try {
    const result = db.prepare(sql).get(...params);
    ok(`${label} (${result ? 'found' : 'null'})`);
    return result;
  } catch (e) {
    fail(label, e.message);
    return null;
  }
}

function checkSchema(db, label, tableName, expectedCols) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (cols.length === 0) {
      fail(`${label} table exists`, `Table '${tableName}' not found`);
      return false;
    }
    const colNames = cols.map(c => c.name);
    const missing = expectedCols.filter(c => !colNames.includes(c));
    if (missing.length) {
      fail(`${label} columns`, `Missing: ${missing.join(', ')}`);
      return false;
    }
    ok(`${label} schema (${cols.length} cols)`);
    return true;
  } catch (e) {
    fail(`${label} schema`, e.message);
    return false;
  }
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

async function get(path, label, expectStatus = 200) {
  try {
    const res = await fetch(`${HTTP_BASE}${path}`);
    if (res.status !== expectStatus) {
      fail(`GET ${path} (${label})`, `Expected HTTP ${expectStatus}, got ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
      return null;
    }
    ok(`GET ${path} → ${res.status}`);
    return res;
  } catch (e) {
    fail(`GET ${path} (${label})`, e.message);
    return null;
  }
}

async function getJson(path, label) {
  const res = await get(path, label);
  if (!res) return null;
  try {
    return await res.json();
  } catch (e) {
    fail(`${label} JSON parse`, e.message);
    return null;
  }
}

// ─── Run checks ────────────────────────────────────────────────────────────

// 1. Schema checks — mercury.db (pipeline DB)
section('mercury.db schema');
const mercuryPath = join(ROOT, 'pipeline/data/mercury.db');
const mercury = openDb(mercuryPath, 'mercury.db');
if (mercury) {
  checkSchema(mercury, 'artists', 'artists', ['id', 'mbid', 'name', 'slug', 'type', 'country', 'begin_year', 'ended']);
  checkSchema(mercury, 'artist_tags', 'artist_tags', ['artist_id', 'tag', 'count']);
  checkSchema(mercury, 'artists_fts', 'artists_fts', ['name']);
  checkSchema(mercury, 'tag_stats', 'tag_stats', ['tag', 'artist_count']);
  checkSchema(mercury, 'tag_cooccurrence', 'tag_cooccurrence', ['tag_a', 'tag_b', 'shared_artists']);
  mercury.close();
}

// 2. Schema checks — wrangler D1
section('Wrangler D1 schema');
const d1Path = findWranglerDb();
const d1 = d1Path ? openDb(d1Path, 'wrangler D1') : null;
if (!d1Path) {
  fail('wrangler D1 file exists', 'No .sqlite found in .wrangler/state/v3/d1/...');
} else if (d1) {
  checkSchema(d1, 'artists', 'artists', ['id', 'mbid', 'name', 'slug', 'type', 'country', 'begin_year', 'ended']);
  checkSchema(d1, 'artist_tags', 'artist_tags', ['artist_id', 'tag', 'count']);
  checkSchema(d1, 'tag_stats', 'tag_stats', ['tag', 'artist_count']);
  checkSchema(d1, 'tag_cooccurrence', 'tag_cooccurrence', ['tag_a', 'tag_b', 'shared_artists']);

  // 3. Query tests — all functions from queries.ts
  section('DB query tests (against wrangler D1)');

  // searchArtists (FTS path)
  runQuery(d1, 'searchArtists FTS — "radiohead"',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists_fts f
     JOIN artists a ON a.id = f.rowid
     WHERE artists_fts MATCH ?
     ORDER BY CASE WHEN LOWER(a.name) = ? THEN 0 WHEN LOWER(a.name) LIKE ? THEN 1 ELSE 2 END, f.rank
     LIMIT 50`,
    ['radiohead', 'radiohead', 'radiohead%']
  );

  // searchArtists (LIKE fallback path - empty query)
  runQuery(d1, 'searchArtists LIKE fallback — "%the%"',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            GROUP_CONCAT(at2.tag, ', ') AS tags
     FROM artists a
     LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
     WHERE a.name LIKE ?
     GROUP BY a.id
     ORDER BY CASE WHEN LOWER(a.name) = ? THEN 0 WHEN LOWER(a.name) LIKE ? THEN 1 ELSE 2 END, a.name
     LIMIT 50`,
    ['%the%', 'the', 'the%']
  );

  // searchByTag
  runQuery(d1, 'searchByTag — "jazz"',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            GROUP_CONCAT(at_all.tag, ', ') AS tags
     FROM artist_tags at1
     JOIN artists a ON a.id = at1.artist_id
     LEFT JOIN artist_tags at_all ON at_all.artist_id = a.id
     WHERE at1.tag = ?
     GROUP BY a.id
     ORDER BY at1.count DESC
     LIMIT 50`,
    ['jazz']
  );

  // getArtistBySlug
  runGet(d1, 'getArtistBySlug — "radiohead"',
    `SELECT a.id, a.mbid, a.name, a.slug, a.type, a.country, a.begin_year, a.ended,
            GROUP_CONCAT(at2.tag, ', ') AS tags
     FROM artists a
     LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
     WHERE a.slug = ?
     GROUP BY a.id`,
    ['radiohead']
  );

  // getPopularTags
  runQuery(d1, 'getPopularTags — top 100',
    `SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT ?`,
    [100]
  );

  // getArtistsByTagIntersection (1 tag)
  runQuery(d1, 'getArtistsByTagIntersection — ["jazz"]',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
            (SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id) AS artist_tag_count
     FROM artists a
     JOIN artist_tags at0 ON at0.artist_id = a.id AND at0.tag = ?
     GROUP BY a.id
     ORDER BY artist_tag_count ASC
     LIMIT 50`,
    ['jazz']
  );

  // getArtistsByTagIntersection (2 tags)
  runQuery(d1, 'getArtistsByTagIntersection — ["jazz", "soul"]',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
            (SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id) AS artist_tag_count
     FROM artists a
     JOIN artist_tags at0 ON at0.artist_id = a.id AND at0.tag = ?
     JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?
     GROUP BY a.id
     ORDER BY artist_tag_count ASC
     LIMIT 50`,
    ['jazz', 'soul']
  );

  // getDiscoveryRankedArtists
  runQuery(d1, 'getDiscoveryRankedArtists — top 50',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(at2.tag, ', ') FROM artist_tags at2 WHERE at2.artist_id = a.id) AS tags,
            COALESCE(
              (1.0 / NULLIF((SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id), 0)
               * (SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
                  FROM artist_tags at3 JOIN tag_stats ts ON ts.tag = at3.tag WHERE at3.artist_id = a.id)
               * CASE WHEN a.begin_year >= 2010 THEN 1.2 ELSE 1.0 END
               * CASE WHEN a.ended = 0 THEN 1.1 ELSE 1.0 END),
              0
            ) AS discovery_score
     FROM artists a
     WHERE a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
     ORDER BY discovery_score DESC
     LIMIT 50`
  );

  // getCrateDigArtists (random rowid start)
  const maxRow = d1.prepare('SELECT MAX(id) as max_id FROM artists').get();
  const randomStart = Math.floor(Math.random() * (maxRow?.max_id ?? 0));
  runQuery(d1, `getCrateDigArtists — rowid > ${randomStart}`,
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists a
     WHERE a.id > ? AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
     LIMIT 20`,
    [randomStart]
  );

  // getCrateDigArtists with tag filter
  runQuery(d1, 'getCrateDigArtists — tag=metal filter',
    `SELECT a.id, a.mbid, a.name, a.slug, a.country,
            (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
     FROM artists a
     WHERE a.id > ? AND EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)
       AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
     LIMIT 20`,
    [0, 'metal']
  );

  // getArtistUniquenessScore
  // Get Radiohead's ID first
  const radiohead = d1.prepare(`SELECT id FROM artists WHERE slug = 'radiohead' LIMIT 1`).get();
  if (radiohead) {
    runGet(d1, `getArtistUniquenessScore — Radiohead (id=${radiohead.id})`,
      `SELECT ROUND(COALESCE(
         (SELECT AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000.0
          FROM artist_tags at3
          JOIN tag_stats ts ON ts.tag = at3.tag
          WHERE at3.artist_id = ?),
         0), 2) AS uniqueness_score,
       (SELECT COUNT(*) FROM artist_tags WHERE artist_id = ?) AS tag_count`,
      [radiohead.id, radiohead.id]
    );
  } else {
    fail('getArtistUniquenessScore', 'radiohead slug not found in DB');
  }

  // getStyleMapData
  runQuery(d1, 'getStyleMapData nodes — top 50 tags',
    `SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT ?`,
    [50]
  );
  runQuery(d1, 'getStyleMapData edges — cooccurrence between top-50',
    `SELECT tc.tag_a, tc.tag_b, tc.shared_artists
     FROM tag_cooccurrence tc
     WHERE tc.tag_a IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)
       AND tc.tag_b IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)
     ORDER BY tc.shared_artists DESC`,
    [50, 50]
  );

  // Integrity checks
  section('Data integrity');

  const orphanTags = d1.prepare(`SELECT COUNT(*) as c FROM artist_tags WHERE artist_id NOT IN (SELECT id FROM artists)`).get();
  if (orphanTags.c > 0) fail(`No orphan artist_tags`, `${orphanTags.c} tags with no matching artist`);
  else ok(`No orphan artist_tags`);

  const nullSlugs = d1.prepare(`SELECT COUNT(*) as c FROM artists WHERE slug IS NULL OR slug = ''`).get();
  if (nullSlugs.c > 0) fail(`No null slugs`, `${nullSlugs.c} artists with empty slug`);
  else ok(`No null slugs`);

  const nullMbids = d1.prepare(`SELECT COUNT(*) as c FROM artists WHERE mbid IS NULL OR mbid = ''`).get();
  if (nullMbids.c > 0) fail(`No null MBIDs`, `${nullMbids.c} artists with empty mbid`);
  else ok(`No null MBIDs`);

  const dupSlugs = d1.prepare(`SELECT slug, COUNT(*) as c FROM artists GROUP BY slug HAVING c > 1`).all();
  if (dupSlugs.length > 0) fail(`No duplicate slugs`, `${dupSlugs.length} slug collisions: ${dupSlugs.slice(0,3).map(r=>r.slug).join(', ')}`);
  else ok(`No duplicate slugs`);

  const zeroArtistStats = d1.prepare(`SELECT COUNT(*) as c FROM tag_stats WHERE artist_count <= 0`).get();
  if (zeroArtistStats.c > 0) fail(`tag_stats artist_count > 0`, `${zeroArtistStats.c} rows with artist_count <= 0`);
  else ok(`tag_stats artist_count all > 0`);

  const invalidEdges = d1.prepare(`SELECT COUNT(*) as c FROM tag_cooccurrence WHERE tag_a >= tag_b`).get();
  if (invalidEdges.c > 0) fail(`tag_cooccurrence canonical order`, `${invalidEdges.c} edges where tag_a >= tag_b (not canonical)`);
  else ok(`tag_cooccurrence canonical order (tag_a < tag_b)`);

  d1.close();
}

// 4. HTTP route tests
if (TEST_HTTP) {
  section('HTTP routes (wrangler dev server)');

  // Check server is up
  let serverUp = false;
  try {
    const ping = await fetch(`${HTTP_BASE}/`, { signal: AbortSignal.timeout(3000) });
    serverUp = ping.ok || ping.status === 200;
    ok(`Wrangler server reachable (${ping.status})`);
  } catch (e) {
    fail('Wrangler server reachable', `Cannot reach ${HTTP_BASE} — is wrangler running? (npx wrangler pages dev .svelte-kit/cloudflare --port 8788)`);
  }

  if (serverUp) {
    await get('/', 'Landing page');
    await get('/search?q=radiohead', 'Search results');
    await get('/artist/radiohead', 'Artist page');
    await get('/discover', 'Discover (no tags)');
    await get('/discover?tags=jazz', 'Discover (single tag)');
    await get('/discover?tags=jazz,soul', 'Discover (two tags)');
    await get('/style-map', 'Style Map');
    await get('/crate', 'Crate page (web fallback)');

    // API routes
    const RADIOHEAD_MBID = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
    const linksJson = await getJson(`/api/artist/${RADIOHEAD_MBID}/links`, 'Links API — Radiohead');
    if (linksJson) {
      if (!('legacy' in linksJson)) fail('Links API response has "legacy" key', JSON.stringify(linksJson).slice(0, 100));
      else if (!('categorized' in linksJson)) fail('Links API response has "categorized" key', JSON.stringify(linksJson).slice(0, 100));
      else ok('Links API response structure valid');
    }

    const releasesJson = await getJson(`/api/artist/${RADIOHEAD_MBID}/releases`, 'Releases API — Radiohead');
    if (releasesJson) {
      if (!Array.isArray(releasesJson)) fail('Releases API returns array', typeof releasesJson);
      else ok(`Releases API returns ${releasesJson.length} releases`);
    }

    await get('/api/search?q=radiohead', 'Search API');

    // Edge cases
    await get('/artist/this-artist-does-not-exist-xyz123', '404 for unknown artist slug', 404);
    await get('/discover?tags=jazz,soul,metal,punk,ambient', 'Discover (5-tag max)');
  }
}

// 5. External API tests (optional)
if (TEST_API) {
  section('External API tests');
  const RADIOHEAD_MBID = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
  try {
    const mb = await fetch(`https://musicbrainz.org/ws/2/artist/${RADIOHEAD_MBID}?inc=url-rels&fmt=json`, {
      headers: { 'User-Agent': 'Mercury/0.1.0 (debug-check)', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (mb.ok) ok(`MusicBrainz API reachable (${mb.status})`);
    else fail('MusicBrainz API', `HTTP ${mb.status}`);
  } catch (e) {
    fail('MusicBrainz API reachable', e.message);
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailed checks:');
  for (const { label, detail } of failures) {
    console.log(`  ✗ ${label}`);
    if (detail && detail !== 'undefined') console.log(`    ${detail.split('\n')[0]}`);
  }
}
console.log('─'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
