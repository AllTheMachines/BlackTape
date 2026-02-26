/**
 * Press screenshot generator for BlackTape.
 *
 * Navigates to the most visually rich pages and captures high-resolution
 * screenshots suitable for press use. Run with:
 *   node tools/take-screenshots.mjs
 *
 * Requires dev server running on http://localhost:5199
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../press-screenshots');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:5199';

// Pages to screenshot with descriptive filenames
const SHOTS = [
  {
    name: '01-discover',
    url: `${BASE}/discover`,
    desc: 'Discover page — artist grid with cover art',
    waitFor: '.artist-card, .artist-grid, [class*="artist"], [class*="grid"]',
    wait: 3000,
  },
  {
    name: '02-crate-dig',
    url: `${BASE}/crate-dig`,
    desc: 'Crate Digging — search by country/era',
    waitFor: 'main, .page-content, h1',
    wait: 2000,
  },
  {
    name: '03-explore',
    url: `${BASE}/explore`,
    desc: 'Explore page',
    waitFor: 'main, .page-content, h1',
    wait: 2000,
  },
  {
    name: '04-style-map',
    url: `${BASE}/style-map`,
    desc: 'Style Map — genre constellation',
    waitFor: 'canvas, svg, [data-ready], main',
    wait: 4000,
  },
  {
    name: '05-scenes',
    url: `${BASE}/scenes`,
    desc: 'Scene rooms',
    waitFor: 'main, .scene-card, h1',
    wait: 2500,
  },
  {
    name: '06-time-machine',
    url: `${BASE}/time-machine`,
    desc: 'Time Machine — browse by decade',
    waitFor: 'main, h1',
    wait: 2000,
  },
  {
    name: '07-new-rising',
    url: `${BASE}/new-rising`,
    desc: 'New & Rising artists',
    waitFor: 'main, h1',
    wait: 2000,
  },
  {
    name: '08-kb',
    url: `${BASE}/kb`,
    desc: 'Knowledge Base — genre map',
    waitFor: 'main, h1',
    wait: 2000,
  },
  {
    name: '09-search-results',
    url: `${BASE}/search?q=jazz`,
    desc: 'Search results for jazz — artist rows',
    waitFor: '.artist-result, [class*="result"], main',
    wait: 3000,
  },
  {
    name: '10-about',
    url: `${BASE}/about`,
    desc: 'About page',
    waitFor: 'main, h1',
    wait: 1500,
  },
];

async function run() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch();

  // Standard wide screenshot (1440×900)
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,  // retina — 2880×1800 effective
  });

  for (const shot of SHOTS) {
    const page = await ctx.newPage();
    try {
      console.log(`  → ${shot.name}: ${shot.url}`);
      await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 15000 });

      // Try to wait for specific element, fall back to just waiting
      try {
        await page.waitForSelector(shot.waitFor, { timeout: 5000 });
      } catch {
        // element didn't appear — still screenshot whatever loaded
      }

      // Extra wait for animations/data
      await page.waitForTimeout(shot.wait);

      const outPath = join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`     ✓ saved ${shot.name}.png`);
    } catch (err) {
      console.error(`     ✗ ${shot.name} failed: ${err.message}`);
    }
    await page.close();
  }

  // Also try to find an artist with a loaded discography
  // by navigating to search first, then clicking through
  const artistPage = await ctx.newPage();
  try {
    console.log('  → Trying artist page via search...');
    await artistPage.goto(`${BASE}/search?q=radiohead`, { waitUntil: 'networkidle', timeout: 12000 });
    await artistPage.waitForTimeout(3000);

    // Click first artist result
    const firstResult = artistPage.locator('a[href*="/artist/"]').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await artistPage.waitForTimeout(5000); // wait for MB API data + cover art
      await artistPage.screenshot({ path: join(OUT_DIR, '11-artist-radiohead.png'), fullPage: false });
      console.log('     ✓ saved 11-artist-radiohead.png');

      // Scroll down to see discography
      await artistPage.evaluate(() => window.scrollBy(0, 300));
      await artistPage.waitForTimeout(1500);
      await artistPage.screenshot({ path: join(OUT_DIR, '12-artist-discography.png'), fullPage: false });
      console.log('     ✓ saved 12-artist-discography.png');
    }
  } catch (err) {
    console.error(`     ✗ artist page failed: ${err.message}`);
  }
  await artistPage.close();

  // Full-page screenshot of discover
  const fullPage = await ctx.newPage();
  try {
    console.log('  → Full-page discover...');
    await fullPage.goto(`${BASE}/discover`, { waitUntil: 'networkidle', timeout: 15000 });
    await fullPage.waitForTimeout(4000);
    await fullPage.screenshot({ path: join(OUT_DIR, '13-discover-full.png'), fullPage: true });
    console.log('     ✓ saved 13-discover-full.png');
  } catch (err) {
    console.error(`     ✗ full discover failed: ${err.message}`);
  }
  await fullPage.close();

  await browser.close();
  console.log(`\nDone. Screenshots saved to: press-screenshots/`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
