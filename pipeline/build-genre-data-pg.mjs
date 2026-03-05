/**
 * Imports genre data (genres + genre_relationships) into the Hetzner PostgreSQL database.
 *
 * Source: genres-export.json (generated from local SQLite pipeline/data/mercury.db)
 * This is a one-time import — genre data is static (built from Wikidata/Wikipedia).
 *
 * Tables created:
 *   genres             — 4086 genre/subgenre/style entries
 *   genre_relationships — parent/child links (rel_type: 'subgenre')
 *
 * Idempotent: drops and recreates tables on each run.
 *
 * Usage (on Hetzner server): node build-genre-data-pg.mjs
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 3,
  connect_timeout: 30,
  ssl: false,
});

(async () => {
  console.log('[genres] Connected to PostgreSQL');

  const { genres, genre_relationships } = JSON.parse(
    readFileSync(join(__dirname, 'data/genres-export.json'), 'utf8')
  );
  console.log(`[genres] Loaded ${genres.length} genres and ${genre_relationships.length} relationships`);

  // Create tables
  await sql`DROP TABLE IF EXISTS genre_relationships`;
  await sql`DROP TABLE IF EXISTS genres`;

  await sql`
    CREATE TABLE genres (
      id              INTEGER PRIMARY KEY,
      slug            TEXT NOT NULL,
      name            TEXT NOT NULL,
      type            TEXT,
      wikidata_id     TEXT,
      wikipedia_title TEXT,
      inception_year  INTEGER,
      origin_city     TEXT,
      origin_lat      REAL,
      origin_lng      REAL,
      mb_tag          TEXT
    )
  `;

  await sql`
    CREATE TABLE genre_relationships (
      from_id  INTEGER NOT NULL REFERENCES genres(id),
      to_id    INTEGER NOT NULL REFERENCES genres(id),
      rel_type TEXT NOT NULL
    )
  `;

  await sql`CREATE INDEX idx_genres_slug ON genres(slug)`;
  await sql`CREATE INDEX idx_genres_mb_tag ON genres(mb_tag)`;
  await sql`CREATE INDEX idx_genre_rels_from ON genre_relationships(from_id)`;
  await sql`CREATE INDEX idx_genre_rels_to ON genre_relationships(to_id)`;

  console.log('[genres] Tables created');

  // Insert genres in batches
  const BATCH = 500;
  for (let i = 0; i < genres.length; i += BATCH) {
    const batch = genres.slice(i, i + BATCH);
    await sql`
      INSERT INTO genres ${sql(batch, 'id', 'slug', 'name', 'type', 'wikidata_id', 'wikipedia_title', 'inception_year', 'origin_city', 'origin_lat', 'origin_lng', 'mb_tag')}
    `;
  }
  console.log(`[genres] Inserted ${genres.length} genres`);

  // Insert relationships in batches
  for (let i = 0; i < genre_relationships.length; i += BATCH) {
    const batch = genre_relationships.slice(i, i + BATCH);
    await sql`
      INSERT INTO genre_relationships ${sql(batch, 'from_id', 'to_id', 'rel_type')}
    `;
  }
  console.log(`[genres] Inserted ${genre_relationships.length} relationships`);

  // Verify
  const [{ cnt }] = await sql`SELECT COUNT(*) AS cnt FROM genres`;
  const [{ rel_cnt }] = await sql`SELECT COUNT(*) AS rel_cnt FROM genre_relationships`;
  console.log(`[genres] Verified: ${cnt} genres, ${rel_cnt} relationships in Postgres`);

  await sql.end();
  console.log('[genres] Done.');
})();
