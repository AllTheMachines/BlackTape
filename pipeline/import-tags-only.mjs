/**
 * Targeted tag import: populate artist_tags for existing artists without re-importing everything.
 * Run from: D:/Projects/Mercury/pipeline/
 * Usage: node import-tags-only.mjs
 */
import { join } from 'path';
import Database from 'better-sqlite3';
import { parseFile } from './lib/parse-tsv.js';
import { TABLES } from './lib/tables.js';
import { existsSync } from 'fs';

const DATA_DIR = join(import.meta.dirname, 'data');
const EXTRACTED_DIR = join(DATA_DIR, 'extracted');
const DB_PATH = join(DATA_DIR, 'mercury.db');

function formatNum(n) { return n.toLocaleString('en-US'); }
function formatDuration(s) {
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
}
class Timer { constructor() { this.start = Date.now(); } elapsed() { return (Date.now()-this.start)/1000; } rate(n) { return n/this.elapsed(); } }

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// ---- Step 1: Load tag ID → name map ----
console.log('Step 1: Loading tag names...');
const t1 = new Timer();
const tagFile = join(EXTRACTED_DIR, 'tag');
const tagMap = new Map(); // id(number) → name(string)
await parseFile(tagFile, TABLES.tag, (row) => {
  if (row.name) tagMap.set(parseInt(row.id, 10), row.name);
});
console.log(`  ${formatNum(tagMap.size)} tags loaded in ${formatDuration(t1.elapsed())}`);

// ---- Step 2: Get set of valid artist IDs in DB ----
console.log('Step 2: Loading artist IDs from DB...');
const t2 = new Timer();
const artistIds = new Set(
  db.prepare('SELECT id FROM artists').all().map(r => r.id)
);
console.log(`  ${formatNum(artistIds.size)} artists in DB (${formatDuration(t2.elapsed())})`);

// ---- Step 3: Clear existing artist_tags and import ----
console.log('Step 3: Importing artist_tags...');
db.exec('DELETE FROM artist_tags');

const insert = db.prepare('INSERT OR IGNORE INTO artist_tags (artist_id, tag, count) VALUES (?, ?, ?)');
const flush = db.transaction((rows) => { for (const r of rows) insert.run(...r); });

const tagFile2 = join(EXTRACTED_DIR, 'artist_tag');
const t3 = new Timer();
let count = 0, skipped = 0;
let batch = [];

await parseFile(tagFile2, TABLES.artist_tag, (row) => {
  const artistId = parseInt(row.artist, 10);
  const tagId = parseInt(row.tag, 10);
  const tagCount = row.count ? parseInt(row.count, 10) : 0;

  if (!artistIds.has(artistId) || !tagMap.has(tagId) || tagCount <= 0) {
    skipped++;
    return;
  }

  batch.push([artistId, tagMap.get(tagId), tagCount]);
  if (batch.length >= 10000) {
    flush(batch);
    count += batch.length;
    batch = [];
    process.stdout.write(`\r  Tags: ${formatNum(count)} imported, ${formatNum(skipped)} skipped (${formatNum(Math.round(t3.rate(count+skipped)))} rows/s)`);
  }
});
if (batch.length > 0) { flush(batch); count += batch.length; }
console.log(`\n  Done: ${formatNum(count)} tags imported in ${formatDuration(t3.elapsed())}`);

// ---- Step 4: Rebuild tag_stats ----
console.log('Step 4: Rebuilding tag_stats...');
const t4 = new Timer();
db.exec(`
  DELETE FROM tag_stats;
  INSERT INTO tag_stats (tag, artist_count, total_votes)
  SELECT tag, COUNT(*) as artist_count, SUM(count) as total_votes
  FROM artist_tags
  GROUP BY tag;
`);
const tsCount = db.prepare('SELECT COUNT(*) as n FROM tag_stats').get();
console.log(`  ${formatNum(tsCount.n)} tags in tag_stats (${formatDuration(t4.elapsed())})`);

// ---- Step 5: Rebuild FTS ----
console.log('Step 5: Rebuilding artists_fts...');
const t5 = new Timer();
db.exec(`
  DELETE FROM artists_fts;
  INSERT INTO artists_fts (rowid, name, tags)
  SELECT a.id, a.name, COALESCE(t.tags, '')
  FROM artists a
  LEFT JOIN (
    SELECT artist_id, GROUP_CONCAT(tag, ' ') as tags
    FROM artist_tags
    GROUP BY artist_id
  ) t ON a.id = t.artist_id;
`);
console.log(`  FTS rebuilt in ${formatDuration(t5.elapsed())}`);

// ---- Step 6: Summary ----
const total = db.prepare('SELECT COUNT(*) as n FROM artist_tags').get();
const tagged = db.prepare('SELECT COUNT(DISTINCT artist_id) as n FROM artist_tags').get();
console.log(`\nDone!`);
console.log(`  ${formatNum(total.n)} total tag entries`);
console.log(`  ${formatNum(tagged.n)} artists now have tags`);
console.log(`  Top tags:`);
const topTags = db.prepare('SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT 20').all();
topTags.forEach(t => console.log(`    ${t.tag}: ${formatNum(t.artist_count)} artists`));

db.close();
console.log('\nDatabase updated. Restart dev server to pick up changes.');
