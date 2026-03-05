/**
 * Finalize step after Discogs import — run this after geocoding finishes
 * to avoid deadlocking on the artists table.
 *
 * 1. Rebuilds uniqueness_score for all artists
 * 2. Re-runs build-similar-artists-pg.mjs
 *
 * Usage: node pipeline/build-finalize-pg.mjs
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres({
  host:            'localhost',
  port:            5432,
  database:        'blacktape',
  username:        'blacktape',
  password:        'bt_local_dev_2026',
  max:             3,
  connect_timeout: 30,
  idle_timeout:    600,
  ssl:             false,
});

console.log('[finalize] Recomputing uniqueness_score...');
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
const scored = await sql`SELECT COUNT(*) AS n FROM artists WHERE uniqueness_score > 0`;
console.log(`  uniqueness_score: ${scored[0].n.toLocaleString()} artists scored`);

await sql.end();

console.log('[finalize] Launching build-similar-artists-pg.mjs...');
const child = spawn('node', [join(__dirname, 'build-similar-artists-pg.mjs')], { stdio: 'inherit' });
await new Promise((resolve, reject) => {
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`exited ${code}`)));
  child.on('error', reject);
});

console.log('[finalize] All done.');
