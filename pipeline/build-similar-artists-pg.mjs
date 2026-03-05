/**
 * Builds the similar_artists table in the Hetzner PostgreSQL database.
 * Ported from build-similar-artists.mjs (SQLite) to PostgreSQL.
 *
 * Uses Jaccard similarity over shared tags.
 * Pairs must meet: jaccard >= 0.15 AND shared_tags >= 2.
 * Top-10 similar artists stored per artist (symmetric).
 *
 * Usage: node pipeline/build-similar-artists-pg.mjs
 * (run locally — connects directly to the Hetzner server via TCP)
 */
import postgres from 'postgres';

const sql = postgres({
  host: process.env.PG_HOST || 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 3,
  connect_timeout: 30,
  ssl: false,
});

console.log('[similar-artists-pg] Connected to PostgreSQL');

// Step 1 — Create table (idempotent)
console.log('[similar-artists-pg] Creating similar_artists table...');
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

// Step 2 — Temp table of per-artist tag counts
console.log('[similar-artists-pg] Building per-artist tag count cache...');
await sql`DROP TABLE IF EXISTS _artist_tag_counts`;
await sql`
  CREATE TEMP TABLE _artist_tag_counts AS
    SELECT artist_id, COUNT(*) AS tag_count
    FROM artist_tags
    GROUP BY artist_id
    HAVING COUNT(*) > 0
`;
await sql`CREATE INDEX ON _artist_tag_counts(artist_id)`;

// Step 3 — Scored pairs
// Tags used by >2000 artists (e.g. "jazz", "rock", "hip hop") are too generic
// to signal real similarity — and cause an explosion of pairs that fills disk.
// Filtering them out keeps the intermediate result manageable.
console.log('[similar-artists-pg] Computing Jaccard similarity pairs...');
await sql`SET work_mem = '256MB'`;
await sql`DROP TABLE IF EXISTS _scored_pairs`;
await sql`
  CREATE TEMP TABLE _scored_pairs AS
  WITH candidates AS (
    SELECT
      t1.artist_id,
      t2.artist_id AS similar_id,
      COUNT(*) AS shared
    FROM artist_tags t1
    JOIN artist_tags t2
      ON t1.tag = t2.tag AND t1.artist_id < t2.artist_id
    JOIN tag_stats ts
      ON ts.tag = t1.tag AND ts.artist_count <= 2000
    GROUP BY t1.artist_id, t2.artist_id
    HAVING COUNT(*) >= 2
  )
  SELECT
    c.artist_id,
    c.similar_id,
    c.shared::real / NULLIF(a1.tag_count + a2.tag_count - c.shared, 0) AS jaccard
  FROM candidates c
  JOIN _artist_tag_counts a1 ON a1.artist_id = c.artist_id
  JOIN _artist_tag_counts a2 ON a2.artist_id = c.similar_id
  WHERE c.shared::real / NULLIF(a1.tag_count + a2.tag_count - c.shared, 0) >= 0.15
`;
await sql`CREATE INDEX ON _scored_pairs(artist_id)`;
await sql`CREATE INDEX ON _scored_pairs(similar_id)`;

const pairCount = await sql`SELECT COUNT(*) AS n FROM _scored_pairs`;
console.log(`  ${pairCount[0].n} scored pairs found`);

// Step 4 — Insert top-10 per artist (symmetric)
console.log('[similar-artists-pg] Inserting top-10 similar artists per artist...');
await sql`
  INSERT INTO similar_artists (artist_id, similar_id, score)
  WITH symmetric AS (
    SELECT artist_id, similar_id, jaccard FROM _scored_pairs
    UNION ALL
    SELECT similar_id AS artist_id, artist_id AS similar_id, jaccard FROM _scored_pairs
  ),
  ranked AS (
    SELECT artist_id, similar_id, jaccard,
      ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY jaccard DESC) AS rn
    FROM symmetric
  )
  SELECT artist_id, similar_id, jaccard FROM ranked WHERE rn <= 10
  ON CONFLICT DO NOTHING
`;

// Step 5 — Symmetry pass
console.log('[similar-artists-pg] Symmetry pass...');
await sql`
  INSERT INTO similar_artists (artist_id, similar_id, score)
  SELECT similar_id AS artist_id, artist_id AS similar_id, score
  FROM similar_artists
  ON CONFLICT DO NOTHING
`;

// Step 6 — Top-K enforcement
console.log('[similar-artists-pg] Enforcing top-10 per artist...');
await sql`
  DELETE FROM similar_artists
  WHERE (artist_id, similar_id) IN (
    SELECT artist_id, similar_id FROM (
      SELECT artist_id, similar_id,
        ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY score DESC) AS rn
      FROM similar_artists
    ) ranked
    WHERE rn > 10
  )
`;

// Step 7 — Symmetry cleanup
await sql`
  DELETE FROM similar_artists sa
  WHERE NOT EXISTS (
    SELECT 1 FROM similar_artists s2
    WHERE s2.artist_id = sa.similar_id AND s2.similar_id = sa.artist_id
  )
`;

// Report
const total = await sql`SELECT COUNT(*) AS n FROM similar_artists`;
const distinct = await sql`SELECT COUNT(DISTINCT artist_id) AS n FROM similar_artists`;
console.log(`\n=== Done ===`);
console.log(`  similar_artists: ${total[0].n} pairs, ${distinct[0].n} artists with similarity data`);

await sql.end();
