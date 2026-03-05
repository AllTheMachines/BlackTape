/**
 * cdp-fetch-source.mjs — fetch compiled source of RabbitHoleArtistCard to find crash line
 */
import http from 'http';

const CDP_PORT = 9224;

const targets = await new Promise((resolve, reject) => {
  const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
  });
  req.on('error', reject);
});

const page = targets.find(t => t.type === 'page');
if (!page) { console.error('No page target found'); process.exit(1); }

// Fetch the compiled file directly
const fileUrl = 'http://localhost:5173/src/lib/components/RabbitHoleArtistCard.svelte';
const res = await new Promise((resolve, reject) => {
  http.get(fileUrl, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
  }).on('error', reject);
});

const lines = res.split('\n');
const start = Math.max(0, 354);
const end = Math.min(lines.length, 370);
console.log(`Lines ${start}-${end} of compiled RabbitHoleArtistCard.svelte:`);
for (let i = start; i < end; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
