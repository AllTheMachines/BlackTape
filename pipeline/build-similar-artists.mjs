/**
 * Standalone script: precomputes pairwise Jaccard similarity between all artists
 * in mercury.db and stores the top-10 results per artist in similar_artists table.
 *
 * Similarity is computed from shared tags (sonic similarity via tag overlap).
 * Pairs must meet: Jaccard score >= 0.15 AND shared_tags >= 2.
 * Results are symmetric — if (A, B) exists, (B, A) also exists.
 * Each artist has at most 10 entries (top-K enforced via ROW_NUMBER).
 *
 * Usage: node pipeline/build-similar-artists.mjs
 */
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'mercury.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000');

// Step B — Create similar_artists table (idempotent)
console.log('[similar-artists] Building similar_artists table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS similar_artists (
    artist_id  INTEGER NOT NULL REFERENCES artists(id),
    similar_id INTEGER NOT NULL REFERENCES artists(id),
    score      REAL NOT NULL,
    PRIMARY KEY (artist_id, similar_id)
  );
  CREATE INDEX IF NOT EXISTS idx_similar_artists_artist_id ON similar_artists(artist_id);
  DELETE FROM similar_artists;
`);

// Step C — Build temp table of per-artist tag counts
db.exec(`
  CREATE TEMP TABLE _artist_tag_counts AS
    SELECT artist_id, COUNT(*) as tag_count
    FROM artist_tags
    GROUP BY artist_id
    HAVING tag_count > 0;
  CREATE INDEX _atc_idx ON _artist_tag_counts(artist_id);
`);

// Step D — Compute and insert similar artists
console.log('[similar-artists] Computing Jaccard similarity (may take 5-15 min on full DB)...');
db.exec(`
  INSERT OR IGNORE INTO similar_artists (artist_id, similar_id, score)
  WITH candidates AS (
    SELECT
      t1.artist_id,
      t2.artist_id AS similar_id,
      COUNT(*) AS shared
    FROM artist_tags t1
    JOIN artist_tags t2
      ON t1.tag = t2.tag AND t1.artist_id < t2.artist_id
    GROUP BY t1.artist_id, t2.artist_id
    HAVING shared >= 2
  ),
  scored AS (
    SELECT
      c.artist_id,
      c.similar_id,
      c.shared * 1.0 / NULLIF(a1.tag_count + a2.tag_count - c.shared, 0) AS jaccard
    FROM candidates c
    JOIN _artist_tag_counts a1 ON a1.artist_id = c.artist_id
    JOIN _artist_tag_counts a2 ON a2.artist_id = c.similar_id
    WHERE c.shared * 1.0 / NULLIF(a1.tag_count + a2.tag_count - c.shared, 0) >= 0.15
  ),
  ranked_forward AS (
    SELECT artist_id, similar_id, jaccard,
      ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY jaccard DESC) AS rn
    FROM scored
  ),
  ranked_backward AS (
    SELECT similar_id AS artist_id, artist_id AS similar_id, jaccard,
      ROW_NUMBER() OVER (PARTITION BY similar_id ORDER BY jaccard DESC) AS rn
    FROM scored
  )
  SELECT artist_id, similar_id, jaccard FROM ranked_forward WHERE rn <= 10
  UNION
  SELECT artist_id, similar_id, jaccard FROM ranked_backward WHERE rn <= 10;
`);

// Step E — Report results and close
const count = db.prepare('SELECT COUNT(*) as n FROM similar_artists').get();
const distinct = db.prepare('SELECT COUNT(DISTINCT artist_id) as n FROM similar_artists').get();
console.log(`  similar_artists: ${count.n} pairs, ${distinct.n} artists with similarity data`);

db.close();
console.log('Done.');
