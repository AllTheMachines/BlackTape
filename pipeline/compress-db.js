/**
 * Database compression and torrent creation pipeline.
 *
 * Produces three distribution artifacts from mercury.db:
 *   1. mercury.db.gz        — gzip-compressed database
 *   2. mercury.db.gz.sha256 — SHA256 checksum for integrity verification
 *   3. mercury.db.gz.torrent — torrent file for P2P distribution
 *
 * Usage: node pipeline/compress-db.js
 */

import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import createTorrent from 'create-torrent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

const SOURCE_DB = join(DATA_DIR, 'mercury.db');
const OUTPUT_GZ = join(DATA_DIR, 'mercury.db.gz');
const OUTPUT_SHA = join(DATA_DIR, 'mercury.db.gz.sha256');
const OUTPUT_TORRENT = join(DATA_DIR, 'mercury.db.gz.torrent');

// Well-known public trackers for torrent distribution
const ANNOUNCE_LIST = [
	['udp://tracker.opentrackr.org:1337/announce'],
	['udp://open.stealth.si:80/announce'],
	['udp://tracker.openbittorrent.com:6969/announce'],
	['udp://open.demonii.com:1337/announce']
];

// Placeholder web seed — update when hosting is set up
const WEB_SEEDS = ['https://download.mercury.app/mercury.db.gz'];

function formatSize(bytes) {
	if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${bytes} B`;
}

async function compress() {
	console.log('--- Stage 1: Compression ---\n');

	if (!existsSync(SOURCE_DB)) {
		console.error(`Error: Source database not found at ${SOURCE_DB}`);
		console.error('Run the data pipeline first: npm run pipeline');
		process.exit(1);
	}

	const sourceSize = statSync(SOURCE_DB).size;
	console.log(`Source: ${SOURCE_DB}`);
	console.log(`Size:   ${formatSize(sourceSize)}`);
	console.log('\nCompressing with gzip... this may take a minute.');

	const startTime = Date.now();

	const gzip = createGzip({ level: 9 }); // Maximum compression
	await pipeline(
		createReadStream(SOURCE_DB),
		gzip,
		createWriteStream(OUTPUT_GZ)
	);

	const compressedSize = statSync(OUTPUT_GZ).size;
	const ratio = ((1 - compressedSize / sourceSize) * 100).toFixed(1);
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	console.log(`\nCompressed: ${OUTPUT_GZ}`);
	console.log(`Size:       ${formatSize(compressedSize)}`);
	console.log(`Ratio:      ${ratio}% reduction (${formatSize(sourceSize)} -> ${formatSize(compressedSize)})`);
	console.log(`Time:       ${elapsed}s`);

	return { sourceSize, compressedSize };
}

async function checksum() {
	console.log('\n--- Stage 2: Checksum ---\n');

	const hash = createHash('sha256');
	const stream = createReadStream(OUTPUT_GZ);

	for await (const chunk of stream) {
		hash.update(chunk);
	}

	const sha256 = hash.digest('hex');
	const checksumLine = `${sha256}  mercury.db.gz\n`;
	await writeFile(OUTPUT_SHA, checksumLine);

	console.log(`SHA256: ${sha256}`);
	console.log(`Written: ${OUTPUT_SHA}`);

	return sha256;
}

async function torrent() {
	console.log('\n--- Stage 3: Torrent ---\n');

	return new Promise((resolve, reject) => {
		createTorrent(OUTPUT_GZ, {
			name: 'mercury.db.gz',
			comment: 'Mercury music discovery database',
			createdBy: 'Mercury pipeline',
			announceList: ANNOUNCE_LIST,
			urlList: WEB_SEEDS
		}, async (err, torrentBuf) => {
			if (err) {
				reject(err);
				return;
			}

			await writeFile(OUTPUT_TORRENT, torrentBuf);

			const torrentSize = statSync(OUTPUT_TORRENT).size;
			console.log(`Torrent: ${OUTPUT_TORRENT}`);
			console.log(`Size:    ${formatSize(torrentSize)}`);
			console.log(`Trackers: ${ANNOUNCE_LIST.length} public trackers`);
			console.log(`Web seed: ${WEB_SEEDS[0]}`);

			resolve();
		});
	});
}

async function main() {
	console.log('Mercury Database Distribution Pipeline');
	console.log('======================================\n');

	const { sourceSize, compressedSize } = await compress();
	const sha256 = await checksum();
	await torrent();

	console.log('\n======================================');
	console.log('Distribution artifacts ready:\n');
	console.log(`  ${OUTPUT_GZ}`);
	console.log(`  ${OUTPUT_SHA}`);
	console.log(`  ${OUTPUT_TORRENT}`);
	console.log(`\nOriginal:   ${formatSize(sourceSize)}`);
	console.log(`Compressed: ${formatSize(compressedSize)}`);
	console.log(`Checksum:   ${sha256.substring(0, 16)}...`);
}

main().catch((err) => {
	console.error('\nPipeline failed:', err.message);
	process.exit(1);
});
