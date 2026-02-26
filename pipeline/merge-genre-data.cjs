/**
 * Merge genre data from pipeline/data/mercury.db into the live AppData DB.
 * Run after build-genre-data.mjs to make KB data available in the app.
 *
 * Usage: node pipeline/merge-genre-data.cjs
 */

const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const PIPELINE_DB = path.join(__dirname, 'data', 'mercury.db');
const LIVE_DB = path.join(os.homedir(), 'AppData', 'Roaming', 'com.blacktape.app', 'mercury.db');
const SCHEMA = require('fs').readFileSync(path.join(__dirname, 'lib', 'schema.sql'), 'utf8');

console.log('Pipeline DB:', PIPELINE_DB);
console.log('Live DB:    ', LIVE_DB);

const src = new Database(PIPELINE_DB, { readonly: true });
const dst = new Database(LIVE_DB);

// Drop and recreate tables with current schema (handles legacy schema mismatch)
dst.exec('DROP TABLE IF EXISTS genre_relationships');
dst.exec('DROP TABLE IF EXISTS genres');
const genreTableDef = SCHEMA.match(/CREATE TABLE IF NOT EXISTS genres[\s\S]*?;/)?.[0]?.replace('IF NOT EXISTS', '') ?? '';
const relTableDef   = SCHEMA.match(/CREATE TABLE IF NOT EXISTS genre_relationships[\s\S]*?;/)?.[0]?.replace('IF NOT EXISTS', '') ?? '';
if (genreTableDef) dst.exec(genreTableDef);
if (relTableDef)   dst.exec(relTableDef);

// Count source data
const srcGenres = src.prepare('SELECT COUNT(*) AS n FROM genres').get();
const srcRels   = src.prepare('SELECT COUNT(*) AS n FROM genre_relationships').get();
console.log(`Source: ${srcGenres.n} genres, ${srcRels.n} relationships`);

if (srcGenres.n === 0) {
  console.log('No genre data in pipeline DB — nothing to merge. Run build-genre-data.mjs first.');
  process.exit(1);
}

// Copy in a transaction
dst.exec('DELETE FROM genre_relationships');
dst.exec('DELETE FROM genres');

const allGenres = src.prepare('SELECT * FROM genres').all();
const allRels   = src.prepare('SELECT * FROM genre_relationships').all();

const insertGenre = dst.prepare(`
  INSERT OR IGNORE INTO genres
    (id, slug, name, type, wikidata_id, wikipedia_title, inception_year,
     origin_city, origin_lat, origin_lng, mb_tag)
  VALUES
    (@id, @slug, @name, @type, @wikidata_id, @wikipedia_title, @inception_year,
     @origin_city, @origin_lat, @origin_lng, @mb_tag)
`);
const insertRel = dst.prepare(`
  INSERT OR IGNORE INTO genre_relationships (from_id, to_id, rel_type)
  VALUES (@from_id, @to_id, @rel_type)
`);

const runMerge = dst.transaction(() => {
  for (const g of allGenres) insertGenre.run(g);
  for (const r of allRels)   insertRel.run(r);
});

runMerge();

const dstGenres = dst.prepare('SELECT COUNT(*) AS n FROM genres').get();
const dstRels   = dst.prepare('SELECT COUNT(*) AS n FROM genre_relationships').get();
console.log(`Merged:  ${dstGenres.n} genres, ${dstRels.n} relationships into live DB`);

src.close();
dst.close();
console.log('Done.');
