/**
 * Imports genre/style tags from the Discogs masters dump into PostgreSQL.
 *
 * Reads the gzipped masters XML from stdin or --file <path>.
 * Matches Discogs artist names to our MusicBrainz artists by normalized name.
 * Inserts matched (artist_id, tag) pairs into artist_tags with ON CONFLICT DO NOTHING
 * so MusicBrainz tags are never overwritten.
 *
 * After all tags are inserted:
 *   1. Rebuilds tag_stats from scratch
 *   2. Recomputes uniqueness_score for all artists
 *   3. Re-runs build-similar-artists-pg.mjs
 *
 * Usage (on Hetzner — stream directly from Discogs CDN):
 *   curl -sL 'https://data.discogs.com/data/2026-03-01/discogs_20260301_masters.xml.gz' \
 *     | node pipeline/build-discogs-tags-pg.mjs
 *
 * Usage (local file):
 *   node pipeline/build-discogs-tags-pg.mjs --file /path/to/discogs_masters.xml.gz
 */

import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const BATCH_MASTERS  = 500_000;  // flush to Postgres after this many masters
const TAG_COUNT_VAL  = 1;        // count value for Discogs-sourced tags

// Discogs artist names to skip entirely
const SKIP_NAMES = new Set(['various artists', 'various', 'unknown artist', 'traditional', 'unknown']);

// ─── Postgres ─────────────────────────────────────────────────────────────────

const sql = postgres({
  host:             process.env.PG_HOST || 'localhost',
  port:             5432,
  database:         'blacktape',
  username:         'blacktape',
  password:         'bt_local_dev_2026',
  max:              3,
  connect_timeout:  30,
  idle_timeout:     600,
  ssl:              false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize an artist name for matching:
 *   "The Band (2)" → "the band"
 *   "AT&amp;T"     → "at t"  (strip punctuation after entity decode)
 */
function normalizeName(name) {
  return name
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, '')   // Discogs disambiguation suffix
    .replace(/[^\w\s]/g, ' ')        // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkip(normalized) {
  if (!normalized) return true;
  if (SKIP_NAMES.has(normalized)) return true;
  if (normalized.startsWith('various')) return true;
  return false;
}

// ─── Step 1: Load artist name map ────────────────────────────────────────────

console.log('[discogs-tags] Loading artists from Postgres...');
const artistRows = await sql`SELECT id, name FROM artists`;
const nameMap = new Map(); // normalized name → artist_id

for (const { id, name } of artistRows) {
  const key = normalizeName(name);
  if (key && !nameMap.has(key)) nameMap.set(key, id);
}
console.log(`[discogs-tags]   ${nameMap.size.toLocaleString()} normalized names indexed (${artistRows.length.toLocaleString()} artists total)`);

// ─── Step 2: Stream-parse gzipped XML ────────────────────────────────────────
//
// The Discogs masters XML has each <master>...</master> on a SINGLE line.
// No state machine needed — just regex each master line.

const fileArg = process.argv.indexOf('--file');
const source   = fileArg !== -1
  ? createReadStream(process.argv[fileArg + 1])
  : process.stdin;

const rl = createInterface({ input: source.pipe(createGunzip()), crlfDelay: Infinity });

// Accumulators
const pendingPairs = new Set(); // "artist_id:tag" strings, deduped
let mastersProcessed = 0;
let mastersMatched   = 0;
let totalInserted    = 0;

// ─── Batch insert helper ───────────────────────────────────────────────────────

async function flushBatch() {
  if (pendingPairs.size === 0) return;

  const rows = [];
  for (const pair of pendingPairs) {
    const colon    = pair.indexOf(':');
    const artistId = parseInt(pair.slice(0, colon));
    const tag      = pair.slice(colon + 1);
    rows.push({ artist_id: artistId, tag, count: TAG_COUNT_VAL });
  }
  pendingPairs.clear();

  // Batch insert in chunks to avoid pg parameter limits
  const CHUNK = 5000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await sql`
      INSERT INTO artist_tags ${sql(chunk, 'artist_id', 'tag', 'count')}
      ON CONFLICT DO NOTHING
    `;
    totalInserted += chunk.length;
  }

  process.stdout.write(
    `\r[discogs-tags]   ${mastersProcessed.toLocaleString()} masters | ` +
    `${mastersMatched.toLocaleString()} matched | ` +
    `${totalInserted.toLocaleString()} pairs inserted`
  );
}

// ─── Line-by-line parser ──────────────────────────────────────────────────────
// Each master is one line: <master id="N">.....</master>

for await (const rawLine of rl) {
  // Only process master lines
  if (!rawLine.includes('<master ') && !rawLine.includes('<master>')) continue;
  if (!rawLine.includes('</master>')) continue;

  mastersProcessed++;

  // Extract <artists> section (not <extraartists>)
  const artistsBlock = rawLine.match(/<artists>([\s\S]*?)<\/artists>/)?.[1] ?? '';
  const artistNames  = [...artistsBlock.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => m[1]);

  // Extract genres and styles
  const genresBlock  = rawLine.match(/<genres>([\s\S]*?)<\/genres>/)?.[1] ?? '';
  const genres       = [...genresBlock.matchAll(/<genre>([\s\S]*?)<\/genre>/g)].map(m => m[1].trim().toLowerCase());

  const stylesBlock  = rawLine.match(/<styles>([\s\S]*?)<\/styles>/)?.[1] ?? '';
  const styles       = [...stylesBlock.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1].trim().toLowerCase());

  const tags = [...genres, ...styles];
  if (artistNames.length === 0 || tags.length === 0) continue;

  for (const rawName of artistNames) {
    const key      = normalizeName(rawName);
    if (shouldSkip(key)) continue;
    const artistId = nameMap.get(key);
    if (!artistId) continue;

    mastersMatched++;
    for (const tag of tags) {
      pendingPairs.add(`${artistId}:${tag}`);
    }
  }

  if (mastersProcessed % BATCH_MASTERS === 0) {
    await flushBatch();
  }
}

// Final flush for any remaining pairs
await flushBatch();
console.log(); // newline after progress line

console.log('\n[discogs-tags] === Parse complete ===');
console.log(`  Masters processed : ${mastersProcessed.toLocaleString()}`);
console.log(`  Masters matched   : ${mastersMatched.toLocaleString()}`);
console.log(`  Pairs inserted    : ${totalInserted.toLocaleString()}`);

// ─── Step 3: Rebuild tag_stats ────────────────────────────────────────────────

console.log('\n[discogs-tags] Rebuilding tag_stats...');
await sql`TRUNCATE tag_stats`;
await sql`
  INSERT INTO tag_stats (tag, artist_count, total_votes)
  SELECT tag, COUNT(*) AS artist_count, SUM(count) AS total_votes
  FROM artist_tags
  GROUP BY tag
`;
const tagStatsCount = await sql`SELECT COUNT(*) AS n FROM tag_stats`;
console.log(`  tag_stats: ${tagStatsCount[0].n.toLocaleString()} tags`);

// ─── Step 4: Rebuild uniqueness_score ─────────────────────────────────────────

console.log('[discogs-tags] Recomputing uniqueness_score...');
await sql`
  UPDATE artists SET uniqueness_score = sub.score
  FROM (
    SELECT at.artist_id,
      ROUND(CAST(AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000.0 AS numeric), 2) AS score
    FROM artist_tags at
    JOIN tag_stats ts ON ts.tag = at.tag
    GROUP BY at.artist_id
  ) sub
  WHERE artists.id = sub.artist_id
`;
const scoredCount = await sql`SELECT COUNT(*) AS n FROM artists WHERE uniqueness_score > 0`;
console.log(`  uniqueness_score: ${scoredCount[0].n.toLocaleString()} artists scored`);

await sql.end();

// ─── Step 5: Re-run similar artists ──────────────────────────────────────────

console.log('\n[discogs-tags] Launching build-similar-artists-pg.mjs...');

const similarScript = join(__dirname, 'build-similar-artists-pg.mjs');
const child = spawn('node', [similarScript], { stdio: 'inherit' });

await new Promise((resolve, reject) => {
  child.on('close', code => {
    if (code === 0) resolve();
    else reject(new Error(`build-similar-artists-pg.mjs exited with code ${code}`));
  });
  child.on('error', reject);
});

console.log('\n[discogs-tags] All done.');
