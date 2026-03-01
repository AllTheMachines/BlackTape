/**
 * audit-demo-artists.mjs — check data quality for recording storyboard artists
 *
 * For each artist in the storyboard, visits their page and reports:
 *   - Wikipedia photo present
 *   - Releases loaded (count)
 *   - Cover art loaded (how many of the first 4 resolved vs 404)
 *   - Overall quality score
 *
 * Usage: node tools/audit-demo-artists.mjs
 * Requires: app running with CDP (node tools/launch-cdp.mjs)
 */

import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9224';
const SETTLE_MS = 4000;    // wait after navigation for API data to load
const IMG_WAIT_MS = 3000;  // wait for images to resolve

const ARTISTS = [
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'My Bloody Valentine',         slug: 'my-bloody-valentine' },
  { name: 'Grouper',                     slug: 'grouper' },
];

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(15000);

const wait = ms => new Promise(r => setTimeout(r, ms));

async function checkCoverUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch { return false; }
}

async function auditArtist(artist) {
  console.log(`\n  Checking: ${artist.name} (/${artist.slug})`);

  // Navigate to artist page
  await page.evaluate(url => { window.location.href = url; }, `/artist/${artist.slug}`);
  await wait(SETTLE_MS);

  // Check Wikipedia photo — look for an <img> in the header art area
  const hasPhoto = await page.evaluate(() => {
    const img = document.querySelector('.artist-hero img, .artist-photo img, header img, .art-header img');
    if (!img) return false;
    return img.complete && img.naturalWidth > 0;
  }).catch(() => false);

  // Check releases — count release cards rendered
  const releaseCount = await page.evaluate(() => {
    const grid = document.querySelector('.releases-grid');
    if (!grid) return 0;
    return grid.children.length;
  }).catch(() => 0);

  // Check if discography section even exists (if 0 releases, it won't)
  const hasDiscography = await page.evaluate(() => {
    return !!document.querySelector('.discography');
  }).catch(() => false);

  // Get first 4 release cover URLs from page DOM
  const coverUrls = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.releases-grid img[src*="coverartarchive"]')];
    return imgs.slice(0, 4).map(img => img.src);
  }).catch(() => []);

  // Wait briefly for images to load then recheck
  await wait(IMG_WAIT_MS);

  const coversLoaded = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.releases-grid img[src*="coverartarchive"]')];
    return imgs.slice(0, 4).filter(img => img.complete && img.naturalWidth > 0).length;
  }).catch(() => 0);

  // Check for reload button (means releases failed to load)
  const hasReloadBtn = await page.evaluate(() => {
    return !!document.querySelector('.reload-btn');
  }).catch(() => false);

  // Score: 0-10
  let score = 0;
  if (hasPhoto) score += 3;
  if (releaseCount >= 5) score += 3;
  else if (releaseCount >= 2) score += 2;
  else if (releaseCount >= 1) score += 1;
  if (coversLoaded >= 3) score += 4;
  else if (coversLoaded >= 2) score += 2;
  else if (coversLoaded >= 1) score += 1;

  const result = {
    name: artist.name,
    slug: artist.slug,
    hasPhoto,
    releaseCount,
    coversLoaded,
    hasReloadBtn,
    score,
    grade: score >= 8 ? '✓ GOOD' : score >= 5 ? '~ OK' : '✗ POOR',
  };

  console.log(`    Photo: ${hasPhoto ? 'yes' : 'NO'} | Releases: ${releaseCount} | Covers: ${coversLoaded}/4 | Score: ${score}/10 ${result.grade}`);
  return result;
}

// ─── Run audit ───────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   Demo Artist Data Quality Audit                ║');
console.log('╚══════════════════════════════════════════════════╝');

const results = [];
for (const artist of ARTISTS) {
  const r = await auditArtist(artist);
  results.push(r);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   SUMMARY                                       ║');
console.log('╠══════════════════════════════════════════════════╣');
for (const r of results) {
  const pad = r.name.padEnd(32);
  console.log(`║  ${r.grade}  ${pad} ${r.score}/10  ║`);
}
console.log('╚══════════════════════════════════════════════════╝');

const poor = results.filter(r => r.score < 5);
if (poor.length > 0) {
  console.log('\n⚠ Poor artists that need replacements:');
  for (const r of poor) {
    console.log(`  - ${r.name} (score ${r.score}/10)`);
  }
} else {
  console.log('\n✓ All artists have acceptable data quality!');
}

await browser.close();
