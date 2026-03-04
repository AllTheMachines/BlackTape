// Node.js importer: reads extracted MusicBrainz TSV files, resolves lookups, imports to PostgreSQL
// Run on the server after MusicBrainz dumps are downloaded and extracted.
// Usage: node do-import-pg.mjs

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import postgres from 'postgres';

const EXTRACT_DIR = '/opt/mbdata/extracted';

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 1,
  onnotice: () => {},
});

// --- Parse helpers ---

function unescapeValue(val) {
  if (val === '\\N') return null;
  if (!val.includes('\\')) return val;
  let result = '';
  for (let i = 0; i < val.length; i++) {
    if (val[i] === '\\' && i + 1 < val.length) {
      const next = val[i + 1];
      if (next === '\\') { result += '\\'; i++; }
      else if (next === 'n') { result += '\n'; i++; }
      else if (next === 't') { result += '\t'; i++; }
      else { result += next; i++; }
    } else {
      result += val[i];
    }
  }
  return result;
}

async function parseFile(filePath, columns, onRow) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });
  let count = 0;
  for await (const line of rl) {
    if (!line) continue;
    const parts = line.split('\t');
    const row = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = i < parts.length ? unescapeValue(parts[i]) : null;
    }
    await onRow(row);
    count++;
    if (count % 100000 === 0) process.stdout.write(`\r  ${count.toLocaleString()}...`);
  }
  return count;
}

function formatNum(n) { return n.toLocaleString('en-US'); }
function elapsed(start) {
  const s = (Date.now() - start) / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
}

// Slug generation — same algorithm as pipeline/add-slugs.js
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric → hyphen
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens
}

// Table column definitions (matches MusicBrainz TSV COPY format)
const COLS = {
  artist: ['id','gid','name','sort_name','begin_date_year','begin_date_month','begin_date_day',
           'end_date_year','end_date_month','end_date_day','type','area','gender','comment',
           'edits_pending','last_updated','ended','begin_area','end_area'],
  artist_type: ['id','name','parent','child_order','description','gid'],
  area: ['id','gid','name','type','edits_pending','last_updated','begin_date_year',
         'begin_date_month','begin_date_day','end_date_year','end_date_month','end_date_day',
         'ended','comment'],
  tag: ['id','name','ref_count'],
  artist_tag: ['artist','tag','count','last_updated'],
};

const BATCH = 5000;

async function flushBatch(table, batch, columns) {
  if (!batch.length) return;
  await sql`INSERT INTO ${sql(table)} ${sql(batch, ...columns)} ON CONFLICT DO NOTHING`;
  batch.length = 0;
}

async function main() {
  console.log('=== BlackTape: MusicBrainz → PostgreSQL Importer ===\n');

  // Step 1: Create schema
  console.log('--- Creating schema ---');
  await sql.unsafe(`
    DROP TABLE IF EXISTS artist_tags CASCADE;
    DROP TABLE IF EXISTS artists CASCADE;
    DROP TABLE IF EXISTS tag_stats CASCADE;
    DROP TABLE IF EXISTS tag_cooccurrence CASCADE;
    DROP TABLE IF EXISTS areas CASCADE;

    CREATE TABLE areas (
      id INTEGER PRIMARY KEY,
      gid UUID NOT NULL,
      name TEXT NOT NULL,
      comment TEXT
    );

    CREATE TABLE artists (
      id INTEGER PRIMARY KEY,
      mbid UUID NOT NULL,
      name TEXT NOT NULL,
      sort_name TEXT NOT NULL,
      slug TEXT,
      type TEXT,
      country TEXT,
      area_id INTEGER,
      gender TEXT,
      comment TEXT,
      begin_year SMALLINT,
      end_year SMALLINT,
      ended BOOLEAN DEFAULT FALSE,
      uniqueness_score FLOAT DEFAULT 0
    );

    CREATE TABLE artist_tags (
      artist_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (artist_id, tag)
    );

    CREATE TABLE tag_stats (
      tag TEXT PRIMARY KEY,
      artist_count INTEGER NOT NULL,
      total_votes INTEGER NOT NULL
    );

    CREATE TABLE tag_cooccurrence (
      tag_a TEXT NOT NULL,
      tag_b TEXT NOT NULL,
      shared_artists INTEGER NOT NULL,
      PRIMARY KEY (tag_a, tag_b),
      CHECK (tag_a < tag_b)
    );

    GRANT ALL ON ALL TABLES IN SCHEMA public TO blacktape;
  `);
  console.log('Schema created.\n');

  // Step 2: Build lookup maps
  console.log('--- Building lookup maps ---');

  const areaMap = new Map();
  const areaPath = `${EXTRACT_DIR}/area`;
  if (existsSync(areaPath)) {
    await parseFile(areaPath, COLS.area, async (row) => {
      if (row.id && row.name) areaMap.set(row.id, row.name);
    });
    console.log(`\n  areas: ${formatNum(areaMap.size)}`);
  }

  const typeMap = new Map();
  const typePath = `${EXTRACT_DIR}/artist_type`;
  if (existsSync(typePath)) {
    await parseFile(typePath, COLS.artist_type, async (row) => {
      if (row.id && row.name) typeMap.set(row.id, row.name);
    });
    console.log(`\n  artist_types: ${formatNum(typeMap.size)}`);
  }

  const tagMap = new Map();
  const tagPath = `${EXTRACT_DIR}/tag`;
  if (existsSync(tagPath)) {
    await parseFile(tagPath, COLS.tag, async (row) => {
      if (row.id && row.name) tagMap.set(row.id, row.name);
    });
    console.log(`\n  tags: ${formatNum(tagMap.size)}`);
  }
  console.log('');

  // Step 3: Import areas
  console.log('--- Importing areas ---');
  let t = Date.now();
  let batch = [];
  if (existsSync(areaPath)) {
    await parseFile(areaPath, COLS.area, async (row) => {
      batch.push({ id: parseInt(row.id), gid: row.gid, name: row.name, comment: row.comment || null });
      if (batch.length >= BATCH) await flushBatch('areas', batch, ['id','gid','name','comment']);
    });
    await flushBatch('areas', batch, ['id','gid','name','comment']);
  }
  const [{ count: areaCount }] = await sql`SELECT COUNT(*) FROM areas`;
  console.log(`\n  ${formatNum(parseInt(areaCount))} areas in ${elapsed(t)}\n`);

  // Step 4: Import artists
  console.log('--- Importing artists ---');
  t = Date.now();
  batch = [];
  const artistPath = `${EXTRACT_DIR}/artist`;
  if (!existsSync(artistPath)) throw new Error('artist file not found — did extraction succeed?');

  // Track slugs for collision handling (same as add-slugs.js)
  const slugCounts = new Map();

  await parseFile(artistPath, COLS.artist, async (row) => {
    const gender = row.gender === '1' ? 'Male' : row.gender === '2' ? 'Female' : row.gender === '3' ? 'Non-binary' : null;

    // Generate slug with collision handling
    let baseSlug = generateSlug(row.name) || 'artist';
    let slug = baseSlug;
    if (slugCounts.has(slug)) {
      // Collision: append first 8 chars of MBID (same as add-slugs.js)
      const mbidShort = (row.gid || '').replace(/-/g, '').slice(0, 8);
      slug = `${baseSlug}-${mbidShort}`;
    }
    slugCounts.set(baseSlug, (slugCounts.get(baseSlug) || 0) + 1);

    batch.push({
      id: parseInt(row.id),
      mbid: row.gid,
      name: row.name,
      sort_name: row.sort_name,
      slug,
      type: typeMap.get(row.type) || null,
      country: areaMap.get(row.area) || null,
      area_id: row.area ? parseInt(row.area) : null,
      gender,
      comment: row.comment || null,
      begin_year: row.begin_date_year ? parseInt(row.begin_date_year) : null,
      end_year: row.end_date_year ? parseInt(row.end_date_year) : null,
      ended: row.ended === 't',
    });
    if (batch.length >= BATCH) {
      await flushBatch('artists', batch, ['id','mbid','name','sort_name','slug','type','country','area_id','gender','comment','begin_year','end_year','ended']);
    }
  });
  await flushBatch('artists', batch, ['id','mbid','name','sort_name','slug','type','country','area_id','gender','comment','begin_year','end_year','ended']);
  const [{ count: artCount }] = await sql`SELECT COUNT(*) FROM artists`;
  console.log(`\n  ${formatNum(parseInt(artCount))} artists in ${elapsed(t)}\n`);

  // Step 5: Import artist tags
  console.log('--- Importing artist tags ---');
  t = Date.now();
  batch = [];
  let skipped = 0;
  const atPath = `${EXTRACT_DIR}/artist_tag`;
  if (existsSync(atPath)) {
    await parseFile(atPath, COLS.artist_tag, async (row) => {
      const tagName = tagMap.get(row.tag);
      if (!tagName) { skipped++; return; }
      const c = parseInt(row.count) || 0;
      if (c <= 0) { skipped++; return; }
      batch.push({ artist_id: parseInt(row.artist), tag: tagName, count: c });
      if (batch.length >= BATCH) await flushBatch('artist_tags', batch, ['artist_id','tag','count']);
    });
    await flushBatch('artist_tags', batch, ['artist_id','tag','count']);
  }
  const [{ count: tagCount }] = await sql`SELECT COUNT(*) FROM artist_tags`;
  console.log(`\n  ${formatNum(parseInt(tagCount))} tag links in ${elapsed(t)} (${formatNum(skipped)} skipped)\n`);

  // Step 6: Tag stats
  console.log('--- Building tag_stats ---');
  t = Date.now();
  await sql`
    INSERT INTO tag_stats (tag, artist_count, total_votes)
    SELECT tag, COUNT(*) AS artist_count, SUM(count) AS total_votes
    FROM artist_tags
    GROUP BY tag
  `;
  const [{ count: tsCount }] = await sql`SELECT COUNT(*) FROM tag_stats`;
  console.log(`  ${formatNum(parseInt(tsCount))} tags in ${elapsed(t)}`);

  // Step 7: Tag co-occurrence (top 20k edges)
  console.log('\n--- Building tag_cooccurrence (may take 2-5 min) ---');
  t = Date.now();
  await sql`
    INSERT INTO tag_cooccurrence (tag_a, tag_b, shared_artists)
    SELECT t1.tag, t2.tag, COUNT(*) AS shared_artists
    FROM artist_tags t1
    JOIN artist_tags t2 ON t1.artist_id = t2.artist_id AND t1.tag < t2.tag
    WHERE t1.count >= 2 AND t2.count >= 2
    GROUP BY t1.tag, t2.tag
    HAVING COUNT(*) >= 5
    ORDER BY shared_artists DESC
    LIMIT 20000
    ON CONFLICT DO NOTHING
  `;
  const [{ count: coocCount }] = await sql`SELECT COUNT(*) FROM tag_cooccurrence`;
  console.log(`  ${formatNum(parseInt(coocCount))} edges in ${elapsed(t)}`);

  // Step 8: Compute uniqueness_score per artist
  console.log('\n--- Computing uniqueness_score (may take 5-10 min) ---');
  t = Date.now();
  await sql.unsafe(`
    UPDATE artists
    SET uniqueness_score = sub.score
    FROM (
      SELECT at.artist_id,
             ROUND(CAST(AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000.0 AS numeric), 2) AS score
      FROM artist_tags at
      JOIN tag_stats ts ON ts.tag = at.tag
      GROUP BY at.artist_id
    ) sub
    WHERE artists.id = sub.artist_id
  `);
  const [{ count: scoredCount }] = await sql`SELECT COUNT(*) FROM artists WHERE uniqueness_score > 0`;
  console.log(`  ${formatNum(parseInt(scoredCount))} artists scored in ${elapsed(t)}`);

  // Step 9: Indexes
  console.log('\n--- Building indexes ---');
  t = Date.now();
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_mbid ON artists(mbid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_sort_name ON artists(sort_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_type ON artists(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_country ON artists(country)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_begin_year ON artists(begin_year)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artists_uniqueness ON artists(uniqueness_score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artist_tags_artist ON artist_tags(artist_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_artist_tags_tag ON artist_tags(tag)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tag_stats_count ON tag_stats(artist_count DESC)`;
  // Trigram index for fast ILIKE search
  await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops)');
  await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_artists_sort_trgm ON artists USING gin(sort_name gin_trgm_ops)');
  console.log(`  Done in ${elapsed(t)}`);

  // Summary
  console.log('\n=== Import Complete ===');
  const [{ count: aN }] = await sql`SELECT COUNT(*) FROM artists`;
  const [{ count: tN }] = await sql`SELECT COUNT(*) FROM artist_tags`;
  const [{ count: tsN }] = await sql`SELECT COUNT(*) FROM tag_stats`;
  const [{ count: sN }] = await sql`SELECT COUNT(*) FROM artists WHERE slug IS NOT NULL`;
  console.log(`  artists:       ${formatNum(parseInt(aN))}`);
  console.log(`  artist_tags:   ${formatNum(parseInt(tN))}`);
  console.log(`  tag_stats:     ${formatNum(parseInt(tsN))}`);
  console.log(`  with slugs:    ${formatNum(parseInt(sN))}`);

  await sql.end();
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
