/**
 * bulk-audit-artists.mjs — fast cover art audit for 50 candidates
 *
 * Usage: node tools/bulk-audit-artists.mjs
 * Requires: app running with CDP (node tools/launch-cdp.mjs)
 */

import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9224';
const SETTLE_MS = 3500;
const IMG_WAIT_MS = 3000;

const CANDIDATES = [
  // Already confirmed 6
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'My Bloody Valentine',         slug: 'my-bloody-valentine' },
  { name: 'Cocteau Twins',               slug: 'cocteau-twins' },
  { name: 'Ride',                        slug: 'ride-3f575ecd' },
  { name: 'Mazzy Star',                  slug: 'mazzy-star' },
  { name: 'Beach House',                 slug: 'beach-house' },
  // Post-punk / Goth
  { name: 'Joy Division',                slug: 'joy-division' },
  { name: 'Bauhaus',                     slug: 'bauhaus-0688add2' },
  { name: 'Siouxsie and the Banshees',   slug: 'siouxsie-and-the-banshees' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'The Birthday Party',          slug: 'the-birthday-party' },
  { name: 'Gang of Four',                slug: 'gang-of-four' },
  { name: 'The Fall',                    slug: 'the-fall-d5da1841' },
  // Electronic / Ambient
  { name: 'Aphex Twin',                  slug: 'aphex-twin' },
  { name: 'Boards of Canada',            slug: 'boards-of-canada-69158f97' },
  { name: 'Massive Attack',              slug: 'massive-attack' },
  { name: 'Portishead',                  slug: 'portishead' },
  { name: 'Brian Eno',                   slug: 'brian-eno' },
  { name: 'Burial',                      slug: 'burial-9ddce51c' },
  { name: 'Tangerine Dream',             slug: 'tangerine-dream' },
  // Krautrock / Experimental
  { name: 'Kraftwerk',                   slug: 'kraftwerk' },
  { name: 'Faust',                       slug: 'faust-0568e321' },
  { name: 'Can',                         slug: 'can' },
  // Post-rock
  { name: 'Mogwai',                      slug: 'mogwai-d700b3f5' },
  { name: 'Explosions in the Sky',       slug: 'explosions-in-the-sky' },
  { name: 'Sigur Rós',                   slug: 'sigur-ros' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'Stars of the Lid',            slug: 'stars-of-the-lid' },
  // Experimental / Noise / Drone
  { name: 'Swans',                       slug: 'swans-3285dc48' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Einstürzende Neubauten',      slug: 'einsturzende-neubauten' },
  { name: 'Throbbing Gristle',           slug: 'throbbing-gristle' },
  { name: 'Coil',                        slug: 'coil-c16fbb7e' },
  { name: 'Current 93',                  slug: 'current-93' },
  { name: 'Death in June',               slug: 'death-in-june' },
  // Folk / Singer-Songwriter
  { name: 'Nick Drake',                  slug: 'nick-drake' },
  { name: 'Scott Walker',                slug: 'scott-walker-99524243' },
  { name: 'Leonard Cohen',               slug: 'leonard-cohen' },
  { name: 'Tom Waits',                   slug: 'tom-waits' },
  { name: 'Talk Talk',                   slug: 'talk-talk' },
  { name: 'Dead Can Dance',              slug: 'dead-can-dance' },
  { name: 'This Mortal Coil',            slug: 'this-mortal-coil' },
  // Alternative / Indie
  { name: 'Radiohead',                   slug: 'radiohead' },
  { name: 'Pixies',                      slug: 'pixies' },
  { name: 'Sonic Youth',                 slug: 'sonic-youth' },
  { name: 'Pavement',                    slug: 'pavement-36bfa85f' },
  { name: 'PJ Harvey',                   slug: 'pj-harvey' },
  { name: 'Grouper',                     slug: 'grouper' },
  { name: 'Flying Saucer Attack',        slug: 'flying-saucer-attack' },
  // Singer-Songwriter
  { name: 'Kate Bush',                   slug: 'kate-bush' },
  { name: 'Björk',                       slug: 'bjork-87c5dedd' },
  { name: 'Bonnie "Prince" Billy',       slug: 'bonnie-prince-billy' },
  { name: 'Bill Callahan',               slug: 'bill-callahan' },
  { name: 'Sparklehorse',                slug: 'sparklehorse' },
  { name: 'Red House Painters',          slug: 'red-house-painters' },
  { name: 'Galaxie 500',                 slug: 'galaxie-500' },
  { name: 'Low',                         slug: 'low' },
];

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(8000);

const wait = ms => new Promise(r => setTimeout(r, ms));

const results = [];

console.log(`\nAuditing ${CANDIDATES.length} artists...\n`);
console.log('STATUS\tCOVERS\tRELEASES\tSLUG\t\t\t\tNAME');
console.log('─'.repeat(80));

for (const artist of CANDIDATES) {
  try {
    await page.evaluate((url) => { window.location.href = url; }, `/artist/${artist.slug}`);
    await wait(SETTLE_MS);

    // Count releases shown
    const releaseCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-testid="release-card"], .release-card, .release-item, [class*="release"]');
      return items.length;
    }).catch(() => 0);

    // Check cover images — look for <img> tags that resolved (naturalWidth > 0)
    await wait(IMG_WAIT_MS);
    const coverStats = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const coverImgs = imgs.filter(img => {
        const src = img.src || '';
        return src.includes('coverartarchive') ||
               src.includes('archive.org') ||
               src.includes('musicbrainz') ||
               src.includes('discogs') ||
               (img.naturalWidth > 50 && img.naturalHeight > 50 && src.startsWith('http'));
      });
      const loaded = coverImgs.filter(img => img.naturalWidth > 0 && img.complete);
      return { total: coverImgs.length, loaded: loaded.length };
    }).catch(() => ({ total: 0, loaded: 0 }));

    const status = coverStats.loaded >= 4 ? '✓ GOOD' : coverStats.loaded >= 2 ? '~ OK' : '✗ POOR';
    const row = { ...artist, releaseCount, coverStats, status };
    results.push(row);

    console.log(`${status}\t${coverStats.loaded}/${coverStats.total}\t${releaseCount}\t\t${artist.slug.padEnd(28)}\t${artist.name}`);
  } catch (e) {
    results.push({ ...artist, status: '✗ ERROR', error: e.message.slice(0, 50) });
    console.log(`✗ ERR\t-\t-\t\t${artist.slug.padEnd(28)}\t${artist.name}\t(${e.message.slice(0, 40)})`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log('RESULTS SUMMARY');
console.log('═'.repeat(80));

const good = results.filter(r => r.status === '✓ GOOD');
const ok   = results.filter(r => r.status === '~ OK');
const poor = results.filter(r => r.status === '✗ POOR' || r.status === '✗ ERROR');

console.log(`\n✓ GOOD (${good.length}):`);
good.forEach(r => console.log(`  ${r.slug}\t${r.name}`));

console.log(`\n~ OK (${ok.length}):`);
ok.forEach(r => console.log(`  ${r.slug}\t${r.name}`));

console.log(`\n✗ POOR/ERROR (${poor.length}):`);
poor.forEach(r => console.log(`  ${r.slug}\t${r.name}\t${r.error || ''}`));

await browser.close();
