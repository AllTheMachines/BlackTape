/**
 * Builds the similar_artists table in the Hetzner PostgreSQL database.
 *
 * Uses Jaccard similarity over shared tags.
 * Pairs must meet: jaccard >= 0.15 AND shared_tags >= 2.
 * Top-10 similar artists stored per artist.
 *
 * APPROACH: Computed entirely in Node.js memory — no Postgres temp tables,
 * no disk spill. The SQL self-join approach caused disk exhaustion (>61GB temp
 * files) because tags with hundreds of artists generate millions of intermediate
 * pair rows before GROUP BY can reduce them.
 *
 * TAG THRESHOLD: Only tags used by <= 500 artists are considered for similarity.
 * Tags like "jazz" or "rock" (thousands of artists) are too generic to signal
 * real similarity. The 500 threshold covers specific genre tags (e.g. "shoegaze",
 * "post-punk", "jazz fusion") while excluding broad ones.
 *
 * DATA STRUCTURE: pairShared uses nested integer-keyed plain objects rather than
 * a flat string-keyed object. String keys like "123:456" require heap allocation
 * per pair, causing GC pressure at 20M+ pairs. Integer-keyed objects use V8's
 * fast integer hash path with no string allocation, handling 20M pairs efficiently.
 *
 * Usage: node pipeline/build-similar-artists-pg.mjs
 */
import postgres from 'postgres';

const TAG_THRESHOLD = 500;   // ignore tags with more than this many artists
const MIN_SHARED   = 2;      // minimum shared tags to be considered similar
const MIN_JACCARD  = 0.15;   // minimum Jaccard score
const TOP_K        = 10;     // similar artists stored per artist
const BATCH_SIZE   = 5000;   // insert batch size

// Tags that pollute similarity — they describe metadata, geography, or release
// format rather than musical style. Two artists sharing "music video" or
// "british" tells you nothing about whether they sound alike.
const BLOCKED_TAGS = new Set([
  // MusicBrainz release types (applied to artists, not genres)
  'music video', 'interview', 'promotional', 'non-music', 'spoken word',
  'soundtrack', 'stage & screen', 'monolog', 'dialogue', 'live', 'demo',
  'compilation', 'remix', 'dj-mix', 'bootleg', 'mixtape/street',
  'audio drama', 'audiobook', 'spokenword',
  // Geographic — nationality/country/city (WHERE, not WHAT)
  'british', 'english', 'uk', 'american', 'us', 'usa', 'german', 'french',
  'swedish', 'norwegian', 'icelandic', 'danish', 'dutch', 'irish', 'scottish',
  'welsh', 'japanese', 'korean', 'australian', 'canadian', 'brazilian',
  'italian', 'spanish', 'russian', 'latin', 'african', 'chinese',
  'london', 'oxford', 'new york', 'los angeles', 'nashville', 'chicago',
  'manchester', 'seattle', 'berlin', 'toronto', 'melbourne', 'sydney',
  // Cultural era labels used as Britpop-style geographic identifiers
  'britpop', 'britrock', 'post-britpop',
]);

const sql = postgres({
  host: process.env.PG_HOST || 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 3,
  connect_timeout: 30,
  idle_timeout: 600,
  ssl: false,
});

console.log('[similar-artists] Connected to PostgreSQL');

// Step 1 — Ensure table exists and clear it
console.log('[similar-artists] Creating/clearing similar_artists table...');
await sql`
  CREATE TABLE IF NOT EXISTS similar_artists (
    artist_id  INTEGER NOT NULL REFERENCES artists(id),
    similar_id INTEGER NOT NULL REFERENCES artists(id),
    score      REAL NOT NULL,
    PRIMARY KEY (artist_id, similar_id)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_similar_artists_artist_id ON similar_artists(artist_id)`;
await sql`TRUNCATE similar_artists`;

// Step 2 — Load artist-tag pairs (only for tags within threshold)
console.log(`[similar-artists] Loading artist-tag pairs (tag threshold: <= ${TAG_THRESHOLD} artists)...`);
const rows = await sql`
  SELECT t.artist_id, t.tag
  FROM artist_tags t
  JOIN tag_stats ts ON ts.tag = t.tag AND ts.artist_count <= ${TAG_THRESHOLD}
`;
console.log(`  Loaded ${rows.length.toLocaleString()} artist-tag pairs`);

// Step 3 — Build tag → artists index and artist tag counts
const tagToArtists = new Map();   // tag -> int[]
const artistTagCount = new Map(); // artist_id -> count of qualifying tags

for (const { artist_id, tag } of rows) {
  // Skip blocked tags and garbage (HTML entities, non-ASCII, looks like an ID)
  if (BLOCKED_TAGS.has(tag)) continue;
  if (tag.includes('&') || tag.includes(';')) continue; // HTML entity artifacts
  if (/[^\x20-\x7E]/.test(tag)) continue; // non-ASCII characters
  if (/^[bcdfghjklmnpqrstvwxyz]{5,}/i.test(tag)) continue; // consonant-run gibberish
  if (tag.endsWith('-artiest')) continue; // Dutch Discogs artifact

  if (!tagToArtists.has(tag)) tagToArtists.set(tag, []);
  tagToArtists.get(tag).push(artist_id);

  artistTagCount.set(artist_id, (artistTagCount.get(artist_id) ?? 0) + 1);
}
console.log(`  ${tagToArtists.size.toLocaleString()} qualifying tags, ${artistTagCount.size.toLocaleString()} artists with tags`);

// Step 4 — Generate all pairs and accumulate shared tag counts in memory.
// Use nested integer-keyed plain objects: pairShared[lowId][highId] = count.
// Integer property access in V8 uses a fast integer hash path with no string
// allocation, unlike "lowId:highId" string keys which caused GC pressure at
// 20M+ pairs and ground the process to a halt.
console.log('[similar-artists] Computing pair shared tag counts...');
const pairShared = Object.create(null); // lowId -> { highId: sharedCount }

let pairOps = 0;
let pairCount = 0;
for (const [, artists] of tagToArtists) {
  const n = artists.length;
  if (n < 2) continue;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = artists[i] < artists[j] ? artists[i] : artists[j];
      const b = artists[i] < artists[j] ? artists[j] : artists[i];
      let aMap = pairShared[a];
      if (aMap === undefined) { pairShared[a] = aMap = Object.create(null); }
      if (aMap[b] === undefined) { aMap[b] = 1; pairCount++; }
      else aMap[b]++;
    }
  }
  pairOps += (n * (n - 1)) / 2;
}
console.log(`  ${pairOps.toLocaleString()} pair operations, ${pairCount.toLocaleString()} unique pairs`);

// Step 5 — Compute Jaccard scores and filter
console.log('[similar-artists] Computing Jaccard scores...');
// artistSimilar: artist_id -> array of { similar_id, score }
const artistSimilar = new Map();

for (const aKey of Object.keys(pairShared)) {
  const a = +aKey;
  const aMap = pairShared[a];
  const countA = artistTagCount.get(a) ?? 0;

  for (const bKey of Object.keys(aMap)) {
    const shared = aMap[bKey];
    if (shared < MIN_SHARED) continue;

    const b = +bKey;
    const countB = artistTagCount.get(b) ?? 0;
    const union = countA + countB - shared;
    if (union <= 0) continue;

    const jaccard = shared / union;
    if (jaccard < MIN_JACCARD) continue;

    if (!artistSimilar.has(a)) artistSimilar.set(a, []);
    if (!artistSimilar.has(b)) artistSimilar.set(b, []);
    artistSimilar.get(a).push({ similar_id: b, score: jaccard });
    artistSimilar.get(b).push({ similar_id: a, score: jaccard });
  }
}
console.log(`  ${artistSimilar.size.toLocaleString()} artists have at least one similar artist`);

// Step 6 — Take top-K per artist and build insert rows
console.log(`[similar-artists] Building top-${TOP_K} per artist...`);
const insertRows = [];

for (const [artist_id, similars] of artistSimilar) {
  similars.sort((x, y) => y.score - x.score);
  const topK = similars.slice(0, TOP_K);
  for (const { similar_id, score } of topK) {
    insertRows.push({ artist_id, similar_id, score });
  }
}
console.log(`  ${insertRows.length.toLocaleString()} rows to insert`);

// Step 7 — Insert in batches
console.log('[similar-artists] Inserting into similar_artists...');
let inserted = 0;
for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
  const batch = insertRows.slice(i, i + BATCH_SIZE);
  await sql`
    INSERT INTO similar_artists ${sql(batch, 'artist_id', 'similar_id', 'score')}
    ON CONFLICT DO NOTHING
  `;
  inserted += batch.length;
  if (inserted % 50000 === 0 || inserted === insertRows.length) {
    process.stdout.write(`\r  ${inserted.toLocaleString()} / ${insertRows.length.toLocaleString()} inserted`);
  }
}
console.log();

// Report
const total    = await sql`SELECT COUNT(*) AS n FROM similar_artists`;
const distinct = await sql`SELECT COUNT(DISTINCT artist_id) AS n FROM similar_artists`;
console.log('\n=== Done ===');
console.log(`  similar_artists: ${total[0].n} rows, ${distinct[0].n} artists with similarity data`);

await sql.end();
