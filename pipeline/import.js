// Step 2: Extract tables from tar.bz2 archives, parse TSV, build SQLite discovery index
// Slim pipeline: artists + tags + country only. Everything else is fetched live.
// Phases: A (extract) → B (lookup tables) → C (artists) → D (tags) → E (FTS5)

import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { Parser as TarParser } from 'tar';
import bz2 from 'unbzip2-stream';
import { TABLES, TABLE_ARCHIVES } from './lib/tables.js';
import { parseFile } from './lib/parse-tsv.js';

const DATA_DIR = join(import.meta.dirname, 'data');
const DOWNLOADS_DIR = join(DATA_DIR, 'downloads');
const EXTRACTED_DIR = join(DATA_DIR, 'extracted');
const DB_PATH = join(DATA_DIR, 'mercury.db');

// --- Progress helpers ---

function formatNum(n) {
  return n.toLocaleString('en-US');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

class Timer {
  constructor() { this.start = Date.now(); }
  elapsed() { return (Date.now() - this.start) / 1000; }
  rate(count) { return count / this.elapsed(); }
}

// --- Phase A: Extract tables from tar.bz2 ---

async function extractTables() {
  console.log('=== Phase A: Extract tables from archives ===\n');
  mkdirSync(EXTRACTED_DIR, { recursive: true });

  for (const [archive, tables] of Object.entries(TABLE_ARCHIVES)) {
    const archivePath = join(DOWNLOADS_DIR, archive);
    if (!existsSync(archivePath)) {
      throw new Error(`Archive not found: ${archivePath}\n  Run 'npm run download' first.`);
    }

    const needed = tables.filter(t => {
      const extracted = join(EXTRACTED_DIR, t);
      return !existsSync(extracted) || statSync(extracted).size === 0;
    });

    if (needed.length === 0) {
      console.log(`  ${archive}: all ${tables.length} tables already extracted, skipping.`);
      continue;
    }

    console.log(`  ${archive}: extracting ${needed.length} tables...`);
    const neededSet = new Set(needed);
    let extracted = 0;

    await new Promise((resolve, reject) => {
      const writeStreams = new Map();

      const tarParser = new TarParser({
        filter: (path) => {
          const parts = path.split('/');
          const tableName = parts[parts.length - 1];
          return neededSet.has(tableName);
        },
        onReadEntry: (entry) => {
          const parts = entry.path.split('/');
          const tableName = parts[parts.length - 1];

          if (!neededSet.has(tableName)) {
            entry.resume();
            return;
          }

          const destPath = join(EXTRACTED_DIR, tableName);
          const ws = createWriteStream(destPath);
          writeStreams.set(tableName, ws);

          entry.pipe(ws);
          ws.on('finish', () => {
            extracted++;
            const size = statSync(destPath).size;
            console.log(`    ${tableName} (${formatBytes(size)})`);
            writeStreams.delete(tableName);
          });
          ws.on('error', reject);
        }
      });

      const input = createReadStream(archivePath);
      const decompressor = bz2();

      input.pipe(decompressor).pipe(tarParser);

      tarParser.on('end', () => {
        const pending = [...writeStreams.values()].map(
          ws => new Promise(r => ws.on('finish', r))
        );
        Promise.all(pending).then(resolve);
      });
      tarParser.on('error', reject);
      decompressor.on('error', reject);
      input.on('error', reject);
    });

    console.log(`    → ${extracted} tables extracted from ${archive}\n`);
  }
}

// --- Phase B: Build lookup tables ---

function buildLookups() {
  console.log('=== Phase B: Build lookup tables ===\n');
  const lookups = {};

  const simpleTables = [
    { name: 'artist_type', key: 'id', value: 'name' },
    { name: 'area', key: 'id', value: 'name' },
    { name: 'tag', key: 'id', value: 'name' },
  ];

  for (const { name, key, value } of simpleTables) {
    const filePath = join(EXTRACTED_DIR, name);
    if (!existsSync(filePath)) {
      console.log(`  ${name}: file not found, skipping.`);
      lookups[name] = new Map();
      continue;
    }

    const map = new Map();
    const columns = TABLES[name];
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');
      const keyIdx = columns.indexOf(key);
      const valIdx = columns.indexOf(value);
      const k = parts[keyIdx];
      const v = parts[valIdx] === '\\N' ? null : parts[valIdx];
      if (k && v) map.set(k, v);
    }
    console.log(`  ${name}: ${formatNum(map.size)} entries`);
    lookups[name] = map;
  }

  console.log();
  return lookups;
}

// --- Phase C: Import artists ---

async function importArtists(db, lookups) {
  console.log('=== Phase C: Import artists ===\n');

  const filePath = join(EXTRACTED_DIR, 'artist');
  if (!existsSync(filePath)) throw new Error('artist table not extracted');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO artists (id, mbid, name, type, country, begin_year, ended)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const timer = new Timer();
  let count = 0;
  let batch = [];

  const flush = db.transaction((rows) => {
    for (const r of rows) insert.run(...r);
  });

  await parseFile(filePath, TABLES.artist, (row) => {
    const type = lookups.artist_type.get(row.type) || null;
    const country = lookups.area.get(row.area) || null;
    const beginYear = row.begin_date_year ? parseInt(row.begin_date_year, 10) : null;
    const ended = row.ended === 't' ? 1 : 0;

    batch.push([
      parseInt(row.id, 10), row.gid, row.name,
      type, country, beginYear, ended
    ]);

    if (batch.length >= 10000) {
      flush(batch);
      count += batch.length;
      batch = [];
      const rate = timer.rate(count);
      process.stdout.write(`\r  Importing artists... ${formatNum(count)} (${formatNum(Math.round(rate))}/s)`);
    }
  });

  if (batch.length > 0) {
    flush(batch);
    count += batch.length;
  }

  console.log(`\r  Artists imported: ${formatNum(count)} in ${formatDuration(timer.elapsed())}                    \n`);
  return count;
}

// --- Phase D: Import tags ---

async function importTags(db, lookups) {
  console.log('=== Phase D: Import artist tags ===\n');
  const filePath = join(EXTRACTED_DIR, 'artist_tag');
  if (!existsSync(filePath)) { console.log('  file not found, skipping.'); return 0; }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO artist_tags (artist_id, tag, count)
    VALUES (?, ?, ?)
  `);

  const timer = new Timer();
  let count = 0;
  let skipped = 0;
  let batch = [];

  const flush = db.transaction((rows) => {
    for (const r of rows) insert.run(...r);
  });

  await parseFile(filePath, TABLES.artist_tag, (row) => {
    const tagName = lookups.tag.get(row.tag);
    if (!tagName) { skipped++; return; }

    const tagCount = row.count ? parseInt(row.count, 10) : 0;
    if (tagCount <= 0) { skipped++; return; }

    batch.push([parseInt(row.artist, 10), tagName, tagCount]);

    if (batch.length >= 10000) {
      flush(batch);
      count += batch.length;
      batch = [];
      process.stdout.write(`\r  Importing tags... ${formatNum(count)} (${formatNum(Math.round(timer.rate(count)))}/s)`);
    }
  });

  if (batch.length > 0) {
    flush(batch);
    count += batch.length;
  }

  console.log(`\r  Tags imported: ${formatNum(count)} in ${formatDuration(timer.elapsed())} (${formatNum(skipped)} skipped)                    \n`);
  return count;
}

// --- Phase F: Discovery Engine pre-computations ---

function buildTagStats(db) {
  console.log('Building tag_stats (tag popularity statistics)...');
  const timer = new Timer();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_stats (
      tag TEXT PRIMARY KEY,
      artist_count INTEGER NOT NULL,
      total_votes INTEGER NOT NULL
    );
    DELETE FROM tag_stats;
    INSERT INTO tag_stats (tag, artist_count, total_votes)
    SELECT tag, COUNT(*) as artist_count, SUM(count) as total_votes
    FROM artist_tags
    GROUP BY tag;
    CREATE INDEX IF NOT EXISTS idx_tag_stats_artist_count ON tag_stats(artist_count DESC);
  `);

  const tagStatsCount = db.prepare('SELECT COUNT(*) as n FROM tag_stats').get();
  console.log(`  tag_stats: ${formatNum(tagStatsCount.n)} tags indexed in ${formatDuration(timer.elapsed())}\n`);
  return tagStatsCount.n;
}

function buildTagCooccurrence(db) {
  console.log('Building tag_cooccurrence (for style map visualization)...');
  console.log('  This may take 30-60s on the full dataset...');
  const timer = new Timer();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_cooccurrence (
      tag_a TEXT NOT NULL,
      tag_b TEXT NOT NULL,
      shared_artists INTEGER NOT NULL,
      PRIMARY KEY (tag_a, tag_b),
      CHECK (tag_a < tag_b)
    );
    DELETE FROM tag_cooccurrence;
    INSERT OR REPLACE INTO tag_cooccurrence (tag_a, tag_b, shared_artists)
    SELECT t1.tag, t2.tag, COUNT(*) as shared_artists
    FROM artist_tags t1
    JOIN artist_tags t2 ON t1.artist_id = t2.artist_id AND t1.tag < t2.tag
    WHERE t1.count >= 2 AND t2.count >= 2
    GROUP BY t1.tag, t2.tag
    HAVING shared_artists >= 5
    ORDER BY shared_artists DESC
    LIMIT 10000;
    CREATE INDEX IF NOT EXISTS idx_cooccurrence_tag_a ON tag_cooccurrence(tag_a);
    CREATE INDEX IF NOT EXISTS idx_cooccurrence_tag_b ON tag_cooccurrence(tag_b);
  `);

  const coocCount = db.prepare('SELECT COUNT(*) as n FROM tag_cooccurrence').get();
  console.log(`  tag_cooccurrence: ${formatNum(coocCount.n)} edges computed in ${formatDuration(timer.elapsed())}\n`);
  return coocCount.n;
}

// --- Phase E: Build FTS5 index ---

function buildFTS(db) {
  console.log('=== Phase E: Build FTS5 search index ===\n');
  const timer = new Timer();

  console.log('  Building FTS5 index (this may take a while)...');

  db.exec(`
    INSERT INTO artists_fts (rowid, name, tags)
    SELECT
      a.id,
      a.name,
      COALESCE(t.tags, '')
    FROM artists a
    LEFT JOIN (
      SELECT artist_id, GROUP_CONCAT(tag, ' ') as tags
      FROM artist_tags
      GROUP BY artist_id
    ) t ON t.artist_id = a.id
  `);

  const count = db.prepare('SELECT COUNT(*) as n FROM artists_fts').get().n;
  console.log(`  FTS5 index built: ${formatNum(count)} entries in ${formatDuration(timer.elapsed())}\n`);
  return count;
}

// --- Main ---

async function main() {
  console.log('=== Mercury Pipeline: Build Discovery Index ===\n');
  const totalTimer = new Timer();

  // Phase A
  await extractTables();

  // Phase B
  const lookups = buildLookups();

  // Initialize database
  console.log('=== Creating SQLite database ===\n');
  if (existsSync(DB_PATH)) {
    console.log(`  Removing existing database: ${DB_PATH}`);
    unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');

  const schema = readFileSync(join(import.meta.dirname, 'lib', 'schema.sql'), 'utf-8');
  db.exec(schema);
  console.log('  Schema created.\n');

  // Phase C
  await importArtists(db, lookups);

  // Phase D
  await importTags(db, lookups);

  // Phase E
  buildFTS(db);

  // Phase F: Discovery Engine pre-computations
  console.log('=== Phase F: Discovery Engine pre-computations ===\n');
  buildTagStats(db);
  buildTagCooccurrence(db);

  // Final stats
  const fileSize = statSync(DB_PATH).size;
  console.log('=== Import Complete ===\n');
  console.log(`  Database: ${DB_PATH}`);
  console.log(`  Size: ${formatBytes(fileSize)}`);
  console.log(`  Total time: ${formatDuration(totalTimer.elapsed())}`);
  console.log(`\nRun 'npm run verify' to test search.\n`);

  db.close();
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
