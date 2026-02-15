// Add URL-safe slugs to existing artists table.
// Handles collisions: duplicate slugs get first 8 chars of MBID appended.
// Idempotent — safe to re-run.

import { existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = join(import.meta.dirname, 'data', 'mercury.db');

function generateSlug(name) {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // strip diacritics
		.replace(/[^a-z0-9]+/g, '-') // non-alphanumeric -> hyphen
		.replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}

function main() {
	if (!existsSync(DB_PATH)) {
		console.error(`Database not found: ${DB_PATH}`);
		console.error("Run 'npm run import' first.");
		process.exit(1);
	}

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	// Add slug column if it doesn't exist
	const columns = db.prepare("PRAGMA table_info('artists')").all();
	const hasSlug = columns.some((c) => c.name === 'slug');

	if (!hasSlug) {
		console.log('Adding slug column to artists table...');
		db.exec('ALTER TABLE artists ADD COLUMN slug TEXT');
	}

	// Generate slugs for all artists
	console.log('Generating slugs...');
	const artists = db.prepare('SELECT id, mbid, name FROM artists').all();
	console.log(`  ${artists.length.toLocaleString()} artists to process`);

	// First pass: generate slugs and detect collisions
	const slugMap = new Map(); // slug -> [{ id, mbid }]
	for (const artist of artists) {
		const slug = generateSlug(artist.name);
		if (!slugMap.has(slug)) {
			slugMap.set(slug, []);
		}
		slugMap.get(slug).push({ id: artist.id, mbid: artist.mbid });
	}

	// Count collisions
	let collisions = 0;
	let unique = 0;
	for (const [, entries] of slugMap) {
		if (entries.length > 1) {
			collisions += entries.length;
		} else {
			unique++;
		}
	}
	console.log(`  Unique slugs: ${unique.toLocaleString()}`);
	console.log(`  Collisions: ${collisions.toLocaleString()} artists share a slug with another`);

	// Second pass: update all rows with slugs (collisions get MBID suffix)
	const update = db.prepare('UPDATE artists SET slug = ? WHERE id = ?');

	const applyAll = db.transaction(() => {
		let updated = 0;
		for (const [slug, entries] of slugMap) {
			if (entries.length === 1) {
				update.run(slug, entries[0].id);
			} else {
				// Collision: append first 8 chars of MBID
				for (const entry of entries) {
					const disambiguated = `${slug}-${entry.mbid.slice(0, 8)}`;
					update.run(disambiguated, entry.id);
				}
			}
			updated += entries.length;
			if (updated % 100000 === 0) {
				process.stdout.write(
					`\r  Updating... ${updated.toLocaleString()} / ${artists.length.toLocaleString()}`
				);
			}
		}
		return updated;
	});

	const updated = applyAll();
	console.log(
		`\r  Updated: ${updated.toLocaleString()} artists                                    `
	);

	// Create index
	console.log('Creating slug index...');
	db.exec('CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug)');

	// Verify
	const nullCount = db.prepare('SELECT COUNT(*) as n FROM artists WHERE slug IS NULL').get().n;
	const totalCount = db.prepare('SELECT COUNT(*) as n FROM artists').get().n;
	console.log(`\nDone.`);
	console.log(`  Total artists: ${totalCount.toLocaleString()}`);
	console.log(`  With slugs: ${(totalCount - nullCount).toLocaleString()}`);
	console.log(`  Missing slugs: ${nullCount.toLocaleString()}`);

	db.close();
}

main();
