/**
 * One-time migration: add uniqueness_score to artists table.
 *
 * Computes score = avg(1 / tag_artist_count) * 1000 for each artist.
 * Artists with rare tags (few other artists share those tags) score high.
 *
 * Run once after pipeline import, or after upgrading from an old DB.
 * Safe to re-run — clears existing scores and recomputes.
 */
import { createRequire } from 'module';
const require = createRequire(new URL('../pipeline/package.json', import.meta.url));
const Database = require('better-sqlite3');

const DB_PATH = 'C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db';

console.log('Opening DB:', DB_PATH);
const db = new Database(DB_PATH);

// --- Step 1: Add column if it doesn't exist ---
const cols = db.prepare("PRAGMA table_info(artists)").all();
const hasCol = cols.some(c => c.name === 'uniqueness_score');
if (!hasCol) {
  console.log('Adding uniqueness_score column...');
  db.prepare("ALTER TABLE artists ADD COLUMN uniqueness_score REAL DEFAULT 0").run();
} else {
  console.log('uniqueness_score column already exists.');
}

// --- Step 2: Add index if it doesn't exist ---
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_artists_uniqueness'").get();
if (!indexes) {
  console.log('Creating index idx_artists_uniqueness...');
  db.prepare("CREATE INDEX idx_artists_uniqueness ON artists(uniqueness_score DESC)").run();
} else {
  console.log('Index idx_artists_uniqueness already exists.');
}

// --- Step 3: Compute scores in bulk ---
// Use a CTE to compute all scores from artist_tags + tag_stats, then bulk update.
// artist_tags has 672K rows — this runs in ~1-2 seconds total.
console.log('Computing scores (this takes a few seconds)...');
const t0 = Date.now();

// Use a temp table for speed — avoid correlated UPDATE
db.prepare("DROP TABLE IF EXISTS _tmp_scores").run();
db.prepare(`
  CREATE TEMP TABLE _tmp_scores AS
  SELECT at.artist_id,
         ROUND(COALESCE(AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000, 0), 4) AS score
  FROM artist_tags at
  LEFT JOIN tag_stats ts ON ts.tag = at.tag
  GROUP BY at.artist_id
`).run();
console.log('  Scores computed in', Date.now()-t0, 'ms');

// Add index to temp table for fast join
db.prepare("CREATE INDEX _tmp_scores_idx ON _tmp_scores(artist_id)").run();

// Bulk update artists
const t1 = Date.now();
const result = db.prepare(`
  UPDATE artists
  SET uniqueness_score = (
    SELECT score FROM _tmp_scores WHERE artist_id = artists.id
  )
  WHERE id IN (SELECT artist_id FROM _tmp_scores)
`).run();
console.log('  Updated', result.changes, 'artists in', Date.now()-t1, 'ms');

db.prepare("DROP TABLE IF EXISTS _tmp_scores").run();
db.close();

const total = Date.now()-t0;
console.log('\nDone in', total, 'ms.');
console.log('Discover page should now load in ~5ms.');
