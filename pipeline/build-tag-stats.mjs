/**
 * Standalone script: runs only Phase F (tag_stats + tag_cooccurrence)
 * on the existing pipeline/data/mercury.db without touching other data.
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

// tag_stats
console.log('Building tag_stats...');
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
const tagCount = db.prepare('SELECT COUNT(*) as n FROM tag_stats').get();
console.log(`  tag_stats: ${tagCount.n} tags indexed`);

// tag_cooccurrence
console.log('Building tag_cooccurrence (may take 30-60s)...');
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
console.log(`  tag_cooccurrence: ${coocCount.n} edges computed`);

db.close();
console.log('Done.');
