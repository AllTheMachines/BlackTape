/**
 * Seed fixture database for Tauri E2E tests.
 * Creates tools/test-suite/fixtures/mercury-test.db with 15 known artists.
 *
 * Run:  node tools/test-suite/fixtures/seed-test-db.mjs
 * Or:   npm run test:seed-db
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const OUTPUT_PATH = path.join(__dirname, 'mercury-test.db');
const SCHEMA_PATH = path.join(ROOT, 'pipeline', 'lib', 'schema.sql');

// 15 known artists with fixed slugs — search and discover E2E tests rely on these.
// MBIDs are real where known, valid UUID format throughout.
const ARTISTS = [
  { mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711', name: 'Radiohead',        slug: 'radiohead',        country: 'GB', tags: ['alternative rock', 'rock', 'experimental'] },
  { mbid: '69188f3e-4d50-44d3-b3b4-ef13a61bb8e8', name: 'Boards of Canada', slug: 'boards-of-canada', country: 'GB', tags: ['electronic', 'ambient', 'idm'] },
  { mbid: '410c9baf-5469-4f83-a1a0-ab97e5ffa7c5', name: 'Autechre',         slug: 'autechre',         country: 'GB', tags: ['electronic', 'idm', 'experimental'] },
  { mbid: '6e564b79-33e1-4ddf-b88b-e9a34e3e42b1', name: 'Burial',           slug: 'burial',           country: 'GB', tags: ['electronic', 'dubstep', 'ambient'] },
  { mbid: 'f22942a1-6f70-4263-a028-9c606e4a6714', name: 'Aphex Twin',       slug: 'aphex-twin',       country: 'IE', tags: ['electronic', 'ambient', 'idm'] },
  { mbid: '1dc4c347-a1db-4c87-a5da-8ae06d81f796', name: 'Massive Attack',   slug: 'massive-attack',   country: 'GB', tags: ['trip-hop', 'electronic', 'uk'] },
  { mbid: 'ca5dd5a0-0db8-4abe-a5f6-2b0ec7c1d14b', name: 'Portishead',      slug: 'portishead',       country: 'GB', tags: ['trip-hop', 'electronic', 'alternative'] },
  { mbid: 'a5f9b6c7-8d0e-4f2e-9e3d-1a2b3c4d5e6f', name: 'Four Tet',        slug: 'four-tet',         country: 'GB', tags: ['electronic', 'ambient', 'idm'] },
  { mbid: 'b6a0c7d8-9e1f-4a3b-0f4e-2c3d4e5f6a7b', name: 'Flying Lotus',    slug: 'flying-lotus',     country: 'US', tags: ['electronic', 'hip-hop', 'jazz'] },
  { mbid: 'c7b1d8e9-0f2a-4b3c-1a5f-3d4e5f6a7b8c', name: 'Arca',            slug: 'arca',             country: 'VE', tags: ['electronic', 'experimental', 'avant-garde'] },
  { mbid: 'd8c2e9f0-1a3b-4c4d-2b6a-4e5f6a7b8c9d', name: 'Andy Stott',      slug: 'andy-stott',       country: 'GB', tags: ['electronic', 'techno', 'ambient'] },
  { mbid: 'e9d3f0a1-2b4c-4d5e-3c7b-5f6a7b8c9d0e', name: 'Actress',         slug: 'actress',          country: 'GB', tags: ['electronic', 'techno', 'idm'] },
  { mbid: 'f0e4a1b2-3c5d-4e6f-4d8c-6a7b8c9d0e1f', name: 'The Caretaker',   slug: 'the-caretaker',    country: 'GB', tags: ['electronic', 'ambient', 'hauntology'] },
  { mbid: 'a1f5b2c3-4d6e-4f7a-5e9d-7b8c9d0e1f2a', name: 'Huerco S.',       slug: 'huerco-s',         country: 'US', tags: ['electronic', 'ambient', 'house'] },
  { mbid: 'b2a6c3d4-5e7f-4a8b-6f0e-8c9d0e1f2a3b', name: 'Prefuse 73',      slug: 'prefuse-73',       country: 'US', tags: ['electronic', 'hip-hop', 'idm'] },
];

export default async function seedDb() {
  if (existsSync(OUTPUT_PATH)) unlinkSync(OUTPUT_PATH);
  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const db = new DatabaseSync(OUTPUT_PATH);
  db.exec('PRAGMA journal_mode = WAL');

  // Initialize schema (artists, artist_tags, artists_fts, indexes, genres, etc.)
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Prepared statements
  const insertArtist = db.prepare(
    'INSERT INTO artists (mbid, name, slug, type, country) VALUES (?, ?, ?, ?, ?)'
  );
  const insertTag = db.prepare(
    'INSERT INTO artist_tags (artist_id, tag, count) VALUES (?, ?, ?)'
  );
  const insertFts = db.prepare(
    'INSERT INTO artists_fts (rowid, name, tags) VALUES (?, ?, ?)'
  );

  for (let i = 0; i < ARTISTS.length; i++) {
    const a = ARTISTS[i];
    const rowId = i + 1;
    insertArtist.run(a.mbid, a.name, a.slug, 'Group', a.country ?? null);
    const tagsStr = a.tags.join(' ');
    for (const tag of a.tags) {
      insertTag.run(rowId, tag, 100);
    }
    insertFts.run(rowId, a.name, tagsStr);
  }

  // tag_stats — mirrors what build-tag-stats.mjs Phase F produces
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_stats (
      tag TEXT PRIMARY KEY,
      artist_count INTEGER NOT NULL,
      total_votes INTEGER NOT NULL
    );
    INSERT INTO tag_stats (tag, artist_count, total_votes)
    SELECT tag, COUNT(*) AS artist_count, SUM(count) AS total_votes
    FROM artist_tags
    GROUP BY tag;
    CREATE INDEX IF NOT EXISTS idx_tag_stats_artist_count ON tag_stats(artist_count DESC);
  `);

  db.close();

  const totalTags = ARTISTS.reduce((s, a) => s + a.tags.length, 0);
  console.log(`✓ Fixture DB created: ${OUTPUT_PATH}`);
  console.log(`  ${ARTISTS.length} artists, ${totalTags} tag entries`);
}

// Run directly when called from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDb().catch(e => { console.error(e.message); process.exit(1); });
}
