// Step 3: Verify the Mercury discovery index — test search, print stats

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = join(import.meta.dirname, 'data', 'mercury.db');

function formatNum(n) {
  return n.toLocaleString('en-US');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function section(title) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(50));
}

function search(db, query, limit = 5) {
  const start = performance.now();
  const results = db.prepare(`
    SELECT a.name, a.type, a.country,
           artists_fts.rank
    FROM artists_fts
    JOIN artists a ON a.id = artists_fts.rowid
    WHERE artists_fts MATCH ?
    ORDER BY artists_fts.rank
    LIMIT ?
  `).all(query, limit);
  const elapsed = (performance.now() - start).toFixed(1);

  console.log(`\n  "${query}" (${elapsed}ms, ${results.length} results):`);
  for (const r of results) {
    const parts = [r.name];
    if (r.type) parts.push(`[${r.type}]`);
    if (r.country) parts.push(`(${r.country})`);
    console.log(`    ${parts.join(' ')}`);
  }
  return { results, elapsed };
}

function tagSearch(db, tag, limit = 5) {
  const start = performance.now();
  const results = db.prepare(`
    SELECT a.name, a.type, a.country, at2.count as tag_count
    FROM artist_tags at2
    JOIN artists a ON a.id = at2.artist_id
    WHERE at2.tag = ?
    ORDER BY at2.count DESC
    LIMIT ?
  `).all(tag, limit);
  const elapsed = (performance.now() - start).toFixed(1);

  console.log(`\n  tag:"${tag}" (${elapsed}ms, ${results.length} results):`);
  for (const r of results) {
    const parts = [r.name];
    if (r.type) parts.push(`[${r.type}]`);
    if (r.country) parts.push(`(${r.country})`);
    parts.push(`(votes: ${r.tag_count})`);
    console.log(`    ${parts.join(' ')}`);
  }
  return { results, elapsed };
}

function main() {
  console.log('=== Mercury Discovery Index: Verify ===');

  if (!existsSync(DB_PATH)) {
    console.error(`\n  Database not found: ${DB_PATH}`);
    console.error("  Run 'npm run import' first.\n");
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  // --- Table counts ---
  section('Table Counts');
  const artistCount = db.prepare('SELECT COUNT(*) as n FROM artists').get().n;
  const tagCount = db.prepare('SELECT COUNT(*) as n FROM artist_tags').get().n;
  const ftsCount = db.prepare('SELECT COUNT(*) as n FROM artists_fts').get().n;
  const uniqueTags = db.prepare('SELECT COUNT(DISTINCT tag) as n FROM artist_tags').get().n;

  console.log(`  artists:      ${formatNum(artistCount)}`);
  console.log(`  artist_tags:  ${formatNum(tagCount)}`);
  console.log(`  unique tags:  ${formatNum(uniqueTags)}`);
  console.log(`  FTS entries:  ${formatNum(ftsCount)}`);

  // --- Database size ---
  section('Database Size');
  const fileSize = statSync(DB_PATH).size;
  console.log(`  File: ${DB_PATH}`);
  console.log(`  Size: ${formatBytes(fileSize)}`);

  // --- Name searches (FTS5) ---
  section('Name Searches (FTS5)');
  search(db, 'radiohead');
  search(db, 'aphex twin');
  search(db, 'boards of canada');
  search(db, 'board*');
  search(db, 'bjork');

  // --- Tag searches (exact match) ---
  section('Tag Searches');
  tagSearch(db, 'dark ambient');
  tagSearch(db, 'shoegaze');
  tagSearch(db, 'field recording');
  tagSearch(db, 'electronic', 10);

  // --- Niche tag discovery ---
  section('Niche Tag Discovery');
  const nicheTags = db.prepare(`
    SELECT tag, COUNT(*) as artist_count
    FROM artist_tags
    WHERE count >= 1
    GROUP BY tag
    HAVING artist_count BETWEEN 2 AND 10
    ORDER BY RANDOM()
    LIMIT 5
  `).all();

  console.log('\n  Random niche tags (2-10 artists each):');
  for (const t of nicheTags) {
    console.log(`    "${t.tag}" — ${t.artist_count} artists`);
  }

  // --- Top tags (the style map backbone) ---
  section('Top 20 Tags (Style Map)');
  const topTags = db.prepare(`
    SELECT tag, COUNT(*) as artist_count, SUM(count) as total_votes
    FROM artist_tags
    GROUP BY tag
    ORDER BY artist_count DESC
    LIMIT 20
  `).all();

  for (const t of topTags) {
    console.log(`  ${t.tag.padEnd(25)} ${formatNum(t.artist_count).padStart(8)} artists  ${formatNum(t.total_votes).padStart(8)} votes`);
  }

  // --- Artist type distribution ---
  section('Artist Type Distribution');
  const types = db.prepare(`
    SELECT COALESCE(type, 'Unknown') as type, COUNT(*) as n
    FROM artists
    GROUP BY type
    ORDER BY n DESC
  `).all();

  for (const t of types) {
    console.log(`  ${(t.type || 'Unknown').padEnd(20)} ${formatNum(t.n).padStart(10)}`);
  }

  // --- Country distribution (top 20) ---
  section('Top 20 Countries');
  const countries = db.prepare(`
    SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as n
    FROM artists
    GROUP BY country
    ORDER BY n DESC
    LIMIT 20
  `).all();

  for (const c of countries) {
    console.log(`  ${c.country.padEnd(25)} ${formatNum(c.n).padStart(10)}`);
  }

  // --- Tag co-occurrence (style map connections) ---
  section('Style Map: Tag Connections (sample)');
  const cooccurrence = db.prepare(`
    SELECT t1.tag as tag_a, t2.tag as tag_b, COUNT(*) as shared_artists
    FROM artist_tags t1
    JOIN artist_tags t2 ON t1.artist_id = t2.artist_id AND t1.tag < t2.tag
    WHERE t1.count >= 2 AND t2.count >= 2
    GROUP BY t1.tag, t2.tag
    ORDER BY shared_artists DESC
    LIMIT 15
  `).all();

  console.log('\n  Most connected style pairs:');
  for (const c of cooccurrence) {
    console.log(`    "${c.tag_a}" ↔ "${c.tag_b}"  (${formatNum(c.shared_artists)} shared artists)`);
  }

  console.log('\n=== Verification Complete ===\n');
  db.close();
}

main();
