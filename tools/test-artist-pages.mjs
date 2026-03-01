/**
 * test-artist-pages.mjs — dry-run of just the artist pages section
 *
 * Visits each storyboard artist, scrolls through discography, clicks a release,
 * tabs through Stats/About. Confirms the sequence looks good before recording.
 *
 * Usage: node tools/test-artist-pages.mjs
 */

import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9224';
const COUNT_MS = 1000; // slightly faster than real recording for testing

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

async function nav(path, settle = 3000) {
  console.log('  nav →', path);
  await page.evaluate(url => { window.location.href = url; }, path).catch(() => {});
  await wait(settle);
}

async function drift(cx = 640, cy = 400, px = 20) {
  for (let i = 0; i <= 8; i++) {
    await page.mouse.move(cx + Math.sin(i * 0.8) * px, cy + Math.cos(i * 0.5) * (px * 0.5), { steps: 4 });
    await wait(60);
  }
}

async function count(n, cx = 640, cy = 400) {
  for (let i = 0; i < n; i++) {
    await drift(cx + Math.sin(i) * 40, cy, 15);
    await wait(COUNT_MS - 480);
  }
}

async function scroll(px, steps = 20) {
  const dy = px / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy);
    await wait(60);
  }
  await wait(200);
}

async function click(sel, timeout = 6000) {
  try {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    await wait(600);
    return true;
  } catch (e) {
    console.warn('  click failed:', sel.slice(0, 50), '—', e.message.slice(0, 50));
    return false;
  }
}

async function clickText(text) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout: 4000 });
    await wait(400);
    return true;
  } catch { return false; }
}

// ─── Test ────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║   Artist Pages Test Run                     ║');
console.log('╚══════════════════════════════════════════════╝\n');

for (let i = 0; i < ARTISTS.length; i++) {
  const artist = ARTISTS[i];
  console.log(`\n[${i + 1}/${ARTISTS.length}] ${artist.name}`);

  await nav(`/artist/${artist.slug}`, 3500);

  // Check if page loaded (has discography or at least artist name visible)
  const loaded = await page.evaluate(() => {
    const heading = document.querySelector('h1, .artist-name');
    const discog = document.querySelector('.discography, .releases-grid');
    const reloadBtn = document.querySelector('.reload-btn');
    return {
      hasHeading: !!heading,
      headingText: heading?.textContent?.trim().slice(0, 40),
      hasDiscog: !!discog,
      releaseCount: document.querySelectorAll('.releases-grid > *').length,
      hasReloadBtn: !!reloadBtn,
    };
  }).catch(() => ({ hasHeading: false }));

  console.log(`  Page: heading="${loaded.headingText}" | releases=${loaded.releaseCount} | reloadBtn=${loaded.hasReloadBtn}`);

  if (loaded.hasReloadBtn) {
    console.log('  ⚠ Reload button visible — MusicBrainz data missing! Clicking reload...');
    await click('.reload-btn');
    await wait(4000);
  }

  if (!loaded.hasDiscog) {
    console.log(`  ✗ No discography for ${artist.name} — SKIP`);
    continue;
  }

  // Overview: drift + scroll + click release
  await drift(640, 400, 30);
  await count(2);
  await scroll(700, 25);
  await wait(200);

  const clickedRelease = await click('a[href*="/release/"]');
  if (clickedRelease) {
    await wait(2000);
    const releaseLoaded = await page.evaluate(() => ({
      title: document.querySelector('h1, .release-title')?.textContent?.trim().slice(0, 40),
      hasTracks: !!document.querySelector('.track-list, .track, .tracklist'),
    })).catch(() => ({}));
    console.log(`  Release: "${releaseLoaded.title}" | tracks=${releaseLoaded.hasTracks}`);
    await count(2);
    await page.goBack().catch(() => nav(`/artist/${artist.slug}`, 2000));
    await wait(2000);
  }

  // Stats tab
  const statsOk = await click('[data-testid="tab-stats"]') || await clickText('Stats');
  if (statsOk) await count(2);

  // About tab
  const aboutOk = await click('[data-testid="tab-about"]') || await clickText('About');
  if (aboutOk) await count(2);

  // Back to Overview
  await click('[data-testid="tab-overview"]') || await clickText('Overview');
  await count(1);

  console.log(`  ✓ ${artist.name} — OK`);
}

console.log('\n✓ Test run complete.');
await browser.close();
