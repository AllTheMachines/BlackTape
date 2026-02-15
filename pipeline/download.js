// Step 1: Download MusicBrainz data dumps
// Fetches the latest dump date, downloads mbdump.tar.bz2 and mbdump-derived.tar.bz2

import { mkdirSync, existsSync, statSync, writeFileSync, readFileSync } from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://data.metabrainz.org/pub/musicbrainz/data/fullexport';
const DATA_DIR = join(import.meta.dirname, 'data');
const DOWNLOADS_DIR = join(DATA_DIR, 'downloads');

const FILES = ['mbdump.tar.bz2', 'mbdump-derived.tar.bz2'];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function progressBar(fraction, width = 30) {
  const filled = Math.round(fraction * width);
  return '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
}

async function getLatestDumpDate() {
  console.log('Fetching latest dump date...');
  const res = await fetch(`${BASE_URL}/LATEST`);
  if (!res.ok) throw new Error(`Failed to fetch LATEST: ${res.status} ${res.statusText}`);
  const date = (await res.text()).trim();
  console.log(`Latest dump: ${date}\n`);
  return date;
}

async function getRemoteFileSize(url) {
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) return null;
  const len = res.headers.get('content-length');
  return len ? parseInt(len, 10) : null;
}

async function downloadFile(url, destPath, fileName) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;
  const startTime = Date.now();

  const fileStream = createWriteStream(destPath);

  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fileStream.write(Buffer.from(value));
    downloadedBytes += value.byteLength;

    // Progress display
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = downloadedBytes / elapsed;
    const fraction = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
    const eta = totalBytes > 0 ? (totalBytes - downloadedBytes) / speed : 0;
    const pct = (fraction * 100).toFixed(1);

    process.stdout.write(
      `\r  ${fileName}  ${progressBar(fraction)} ${pct}%  ` +
      `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}  ` +
      `${formatBytes(speed)}/s  ETA ${formatDuration(eta)}   `
    );
  }

  await new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
    fileStream.end();
  });

  const elapsed = (Date.now() - startTime) / 1000;
  process.stdout.write(
    `\r  ${fileName}  ${progressBar(1)} 100%  ` +
    `${formatBytes(downloadedBytes)}  done in ${formatDuration(elapsed)}   \n`
  );

  return downloadedBytes;
}

async function main() {
  console.log('=== Mercury Pipeline: Download MusicBrainz Dumps ===\n');

  mkdirSync(DOWNLOADS_DIR, { recursive: true });

  // Get latest dump date
  const dumpDate = await getLatestDumpDate();
  const dumpDateFile = join(DOWNLOADS_DIR, 'dump-date.txt');

  // Check if we already have this dump
  if (existsSync(dumpDateFile)) {
    const existingDate = readFileSync(dumpDateFile, 'utf-8').trim();
    if (existingDate === dumpDate) {
      console.log(`Already have dump from ${dumpDate}. Checking files...\n`);
    } else {
      console.log(`New dump available (had ${existingDate}, now ${dumpDate}).\n`);
    }
  }

  for (const fileName of FILES) {
    const url = `${BASE_URL}/${dumpDate}/${fileName}`;
    const destPath = join(DOWNLOADS_DIR, fileName);

    // Check if file already exists with correct size
    if (existsSync(destPath)) {
      const localSize = statSync(destPath).size;
      const remoteSize = await getRemoteFileSize(url);

      if (remoteSize && localSize === remoteSize) {
        console.log(`  ${fileName}  already downloaded (${formatBytes(localSize)}), skipping.`);
        continue;
      } else if (remoteSize) {
        console.log(`  ${fileName}  size mismatch (local: ${formatBytes(localSize)}, remote: ${formatBytes(remoteSize)}), re-downloading.`);
      }
    }

    console.log(`  Downloading ${fileName}...`);
    await downloadFile(url, destPath, fileName);
  }

  // Save dump date
  writeFileSync(dumpDateFile, dumpDate + '\n');

  console.log('\nDownload complete. Run `npm run import` next.');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
