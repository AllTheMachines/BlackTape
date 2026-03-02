#!/usr/bin/env node
/**
 * Import mercury.db into Cloudflare D1.
 *
 * Strategy:
 * 1. Use `better-sqlite3` to read from the local mercury.db
 * 2. Dump each base table as SQL INSERT statements (skip FTS5 shadow tables)
 * 3. Split into chunks that fit within wrangler's limits
 * 4. Import via `wrangler d1 execute`
 * 5. Recreate FTS5 virtual table and populate in batches
 *
 * Usage:
 *   node scripts/import-db.mjs <path-to-mercury.db>
 *
 * Prerequisites:
 *   - npm install better-sqlite3 (in this directory or globally)
 *   - wrangler authenticated (wrangler login)
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DB_NAME = 'mercury-db'; // must match wrangler.toml database_name
const CHUNK_DIR = join(import.meta.dirname, '..', '.import-chunks');
const MAX_CHUNK_SIZE = 90 * 1024; // 90KB per file (wrangler limit is 100KB per statement batch)

// Tables to export (in dependency order). Excludes FTS5 virtual/shadow tables.
const TABLES = [
	'artists',
	'artist_tags',
	'genres',
	'genre_relationships',
	'tag_stats',
	'tag_cooccurrence',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const dbPath = process.argv[2];
if (!dbPath || !existsSync(dbPath)) {
	console.error('Usage: node scripts/import-db.mjs <path-to-mercury.db>');
	console.error('  The database file must exist at the given path.');
	process.exit(1);
}

// Dynamic import better-sqlite3
let Database;
try {
	Database = (await import('better-sqlite3')).default;
} catch {
	console.error('better-sqlite3 not found. Install it:');
	console.error('  npm install better-sqlite3');
	process.exit(1);
}

const db = new Database(resolve(dbPath), { readonly: true });

// Prepare chunk directory
if (existsSync(CHUNK_DIR)) rmSync(CHUNK_DIR, { recursive: true });
mkdirSync(CHUNK_DIR, { recursive: true });

console.log('=== Mercury D1 Import ===\n');

// ---------------------------------------------------------------------------
// Step 1: Export schema (CREATE TABLE statements, no FTS5)
// ---------------------------------------------------------------------------

console.log('Step 1: Exporting schema...');

const schemaRows = db
	.prepare(
		`SELECT sql FROM sqlite_master
		 WHERE type='table'
		   AND name IN (${TABLES.map(() => '?').join(',')})
		 ORDER BY name`
	)
	.all(...TABLES);

let schemaSql = schemaRows.map((r) => r.sql + ';').join('\n');

// Also export indexes
const indexRows = db
	.prepare(
		`SELECT sql FROM sqlite_master
		 WHERE type='index'
		   AND tbl_name IN (${TABLES.map(() => '?').join(',')})
		   AND sql IS NOT NULL`
	)
	.all(...TABLES);

schemaSql += '\n' + indexRows.map((r) => r.sql + ';').join('\n');

const schemaFile = join(CHUNK_DIR, '000-schema.sql');
writeFileSync(schemaFile, schemaSql);
console.log(`  Schema written to 000-schema.sql (${schemaRows.length} tables, ${indexRows.length} indexes)`);

// ---------------------------------------------------------------------------
// Step 2: Export table data as INSERT chunks
// ---------------------------------------------------------------------------

console.log('\nStep 2: Exporting table data...');

let chunkIndex = 1;

function escapeValue(val) {
	if (val === null || val === undefined) return 'NULL';
	if (typeof val === 'number') return String(val);
	// Escape single quotes by doubling them
	return "'" + String(val).replace(/'/g, "''") + "'";
}

for (const table of TABLES) {
	const count = db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get().c;
	console.log(`  ${table}: ${count.toLocaleString()} rows`);

	if (count === 0) continue;

	// Get column names
	const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
	const colNames = columns.map((c) => c.name);
	const colList = colNames.map((n) => `"${n}"`).join(', ');

	// Stream rows in batches
	const BATCH_SIZE = 500;
	let offset = 0;
	let currentChunk = '';
	let currentSize = 0;

	while (offset < count) {
		const rows = db
			.prepare(`SELECT * FROM "${table}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
			.all();

		for (const row of rows) {
			const values = colNames.map((col) => escapeValue(row[col])).join(', ');
			const stmt = `INSERT INTO "${table}" (${colList}) VALUES (${values});\n`;

			if (currentSize + stmt.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
				// Flush chunk
				const chunkFile = join(CHUNK_DIR, `${String(chunkIndex).padStart(4, '0')}-${table}.sql`);
				writeFileSync(chunkFile, currentChunk);
				chunkIndex++;
				currentChunk = '';
				currentSize = 0;
			}

			currentChunk += stmt;
			currentSize += stmt.length;
		}

		offset += BATCH_SIZE;
	}

	// Flush remaining
	if (currentChunk.length > 0) {
		const chunkFile = join(CHUNK_DIR, `${String(chunkIndex).padStart(4, '0')}-${table}.sql`);
		writeFileSync(chunkFile, currentChunk);
		chunkIndex++;
		currentChunk = '';
		currentSize = 0;
	}
}

// ---------------------------------------------------------------------------
// Step 3: FTS5 recreation
// ---------------------------------------------------------------------------

console.log('\nStep 3: Preparing FTS5 recreation...');

const ftsFile = join(CHUNK_DIR, `${String(chunkIndex).padStart(4, '0')}-fts5.sql`);
writeFileSync(
	ftsFile,
	`CREATE VIRTUAL TABLE IF NOT EXISTS artists_fts USING fts5(name, content=artists, content_rowid=id);\n`
);
chunkIndex++;

// FTS5 population in batches (avoid 30-sec timeout)
const artistCount = db.prepare('SELECT COUNT(*) as c FROM artists').get().c;
const FTS_BATCH = 50000;
for (let off = 0; off < artistCount; off += FTS_BATCH) {
	const ftsBatchFile = join(CHUNK_DIR, `${String(chunkIndex).padStart(4, '0')}-fts5-populate.sql`);
	writeFileSync(
		ftsBatchFile,
		`INSERT INTO artists_fts(rowid, name) SELECT id, name FROM artists LIMIT ${FTS_BATCH} OFFSET ${off};\n`
	);
	chunkIndex++;
}

db.close();

console.log(`\nGenerated ${chunkIndex - 1} SQL chunk files in ${CHUNK_DIR}`);

// ---------------------------------------------------------------------------
// Step 4: Import into D1
// ---------------------------------------------------------------------------

console.log('\nStep 4: Importing into D1...');
console.log('  This may take a while for large databases.\n');

const { readdirSync } = await import('fs');
const files = readdirSync(CHUNK_DIR).filter((f) => f.endsWith('.sql')).sort();

for (let i = 0; i < files.length; i++) {
	const file = files[i];
	const filePath = join(CHUNK_DIR, file);
	console.log(`  [${i + 1}/${files.length}] Importing ${file}...`);

	try {
		execSync(`npx wrangler d1 execute ${DB_NAME} --remote --config=wrangler.toml --file="${filePath}"`, {
			cwd: join(import.meta.dirname, '..'),
			stdio: 'pipe',
			timeout: 120_000, // 2 min per chunk
		});
	} catch (err) {
		console.error(`  ERROR importing ${file}:`);
		console.error(`  ${err.stderr?.toString().trim() || err.message}`);
		console.error('  Stopping import. Fix the issue and re-run from this chunk.');
		process.exit(1);
	}
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

console.log('\nImport complete! Cleaning up chunks...');
rmSync(CHUNK_DIR, { recursive: true });

console.log('\nDone. Verify with:');
console.log(`  npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT COUNT(*) FROM artists"`);
