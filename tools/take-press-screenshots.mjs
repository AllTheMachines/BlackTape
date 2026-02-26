/**
 * BlackTape Press Screenshot Automation — v2
 *
 * Launches the Tauri debug binary with CDP, connects Playwright,
 * takes all press shots for marketing. Uses the real live database
 * (782MB, 2.8M artists, 241K tagged).
 *
 * Run:  node tools/take-press-screenshots.mjs
 *
 * Requirements:
 *   - Dev server running on http://localhost:5173 (npm run dev)
 *   - Tauri debug binary built at src-tauri/target/debug/mercury.exe
 *   - Real mercury.db in %APPDATA%/com.mercury.app/mercury.db
 *
 * Output: press-screenshots/v2/
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Output to v2 subfolder to keep separate from old shots
const OUT = path.join(ROOT, 'press-screenshots', 'v2');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9223; // use 9223 to avoid conflicting with any running instance on 9222
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pollCdp(timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(`${CDP_BASE}/json`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        schedule();
      });
      req.setTimeout(1000, () => { req.destroy(); schedule(); });
      req.on('error', schedule);
    }
    function schedule() {
      if (Date.now() >= deadline) return reject(new Error(`CDP not available after ${timeoutMs}ms`));
      setTimeout(attempt, 600);
    }
    attempt();
  });
}

/**
 * Navigate via SvelteKit router (in-page), wait for content to settle.
 * waitMs: time after navigation to wait for API calls, images, etc.
 */
async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

/**
 * Save a screenshot with scroll offset.
 * scrollY: pixels to scroll before shooting (0 = top)
 * extraWait: ms to wait after scrolling
 */
async function save(page, filename, { scrollY = 0, extraWait = 0 } = {}) {
  if (scrollY > 0) {
    await page.evaluate(y => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(600);
  }
  if (extraWait > 0) await page.waitForTimeout(extraWait);
  const outPath = path.join(OUT, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ✓ ${filename}`);
}

/**
 * Click element matching selector (non-fatal — logs if not found).
 */
async function tryClick(page, selector) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click();
      return true;
    }
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    console.error('Build with: cd src-tauri && cargo build');
    process.exit(1);
  }

  console.log('Launching Tauri app (CDP port 9223)...');
  const proc = spawn(BINARY, [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    },
    stdio: 'ignore',
    detached: false,
  });
  proc.on('error', err => console.error('Process error:', err.message));

  console.log('Waiting for CDP...');
  await pollCdp(35000);
  // Extra settle time for WebView2 to finish loading SvelteKit
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()?.[0];
  if (!page) throw new Error('No page found via CDP');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(3000);

  console.log('Connected. App URL:', page.url());
  console.log(`Output dir: ${OUT}\n`);

  // ── Shot 1: Discover — doom metal + Finland (100 results) ─────────────────
  console.log('Shot 1: Discover — doom metal + Finland');
  await goto(page, '/discover?tags=doom+metal&country=Finland', 5000);
  // Ensure filter panel is open
  await tryClick(page, '.filter-toggle-btn');
  await page.waitForTimeout(600);
  await save(page, 'discover-niche-filters-doom-finland.png');

  // ── Shot 2: Discover — raw uniqueness feed, no filters ────────────────────
  console.log('Shot 2: Discover — raw uniqueness feed');
  await goto(page, '/discover', 5000);
  await save(page, 'discover-raw-uniqueness-feed.png');

  // ── Shot 3: Discover — 5 tags simultaneously ──────────────────────────────
  console.log('Shot 3: Discover — multi-tag filter (experimental + ambient + drone + industrial + noise rock)');
  await goto(page, '/discover?tags=experimental,ambient,drone,industrial,noise+rock', 5000);
  await tryClick(page, '.filter-toggle-btn');
  await page.waitForTimeout(600);
  await save(page, 'discover-multi-tag-filter.png');

  // ── Shot 4: Niche artist — Skinfields (Very Niche, coldwave/darkwave) ──────
  // Skinfields: slug=skinfields, Very Niche score=553, country=Europe
  // Tags: darkwave, experimental, industrial, minimal electronic, coldwave, dark electronic...
  console.log('Shot 4: Artist — Skinfields (Very Niche, coldwave/darkwave/industrial)');
  await goto(page, '/artist/skinfields', 8000); // MusicBrainz API needs time
  await save(page, 'artist-niche-badge-obscure.png');

  // ── Shot 5: Same artist, scrolled to discography ───────────────────────────
  console.log('Shot 5: Artist discography view — Skinfields scrolled down');
  await save(page, 'artist-discography-view.png', { scrollY: 600, extraWait: 1500 });

  // ── Shot 6: Artist stats/about tab ────────────────────────────────────────
  console.log('Shot 6: Artist stats tab');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const statsClicked = await tryClick(page, 'button:has-text("Stats")');
  if (!statsClicked) await tryClick(page, '[role="tab"]:has-text("Stats")');
  await page.waitForTimeout(2000);
  await save(page, 'artist-stats-tab.png');

  // ── Shot 7: Time Machine ───────────────────────────────────────────────────
  console.log('Shot 7: Time Machine');
  await goto(page, '/time-machine', 4000);
  // Try years: 1991, 1988, 1994 — find one with results
  for (const year of ['1991', '1988', '1994', '1983', '1979']) {
    const yearInput = page.locator('input[type="range"]').first();
    if (await yearInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Set range input to year value
      await yearInput.evaluate((el, y) => {
        el.value = y;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, year);
      await page.waitForTimeout(2500);
      // Check if there are results (no "no artists" message)
      const noResults = await page.locator('text=No artists, text=no results, .empty-state').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (!noResults) {
        console.log(`  Using year ${year}`);
        await save(page, `time-machine-${year}.png`);
        break;
      }
    } else {
      // Try clicking the year or navigating with a URL param
      await goto(page, `/time-machine?year=${year}`, 3000);
      await save(page, `time-machine-${year}.png`);
      break;
    }
  }

  // ── Shot 8: Knowledge Base ─────────────────────────────────────────────────
  console.log('Shot 8: Knowledge Base genre graph');
  await goto(page, '/kb', 6000); // genre graph may need time
  // Only save if graph has content (not empty state)
  const kbHasContent = await page.locator('canvas, .genre-graph, .kb-graph, svg').first().isVisible({ timeout: 3000 }).catch(() => false);
  if (kbHasContent) {
    await save(page, 'knowledge-base-genre-graph.png');
  } else {
    console.log('  KB graph not rendered — saving whatever is there');
    await save(page, 'knowledge-base-genre-graph.png');
  }

  // ── Shot 9: Crate Dig ─────────────────────────────────────────────────────
  console.log('Shot 9: Crate Dig');
  await goto(page, '/crate', 5000);
  await save(page, 'crate-dig-loaded.png');

  // ── Shot 10: Search results — shoegaze (tag search) ───────────────────────
  console.log('Shot 10: Search — shoegaze (tag mode, real results)');
  await goto(page, '/search?q=shoegaze&mode=tag', 6000);
  await save(page, 'search-results-loaded.png');

  // ── Shot 11: Listen On section — Skinfields ───────────────────────────────
  console.log('Shot 11: Listen On section — Skinfields');
  await goto(page, '/artist/skinfields', 7000);
  // Scroll down slightly to where Listen On typically appears
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  // Try to find the listen on section and crop to it
  const listenOnEl = page.locator('.listen-on, .streaming-section, text=Listen On').first();
  const listenVisible = await listenOnEl.isVisible({ timeout: 3000 }).catch(() => false);
  if (listenVisible) {
    await listenOnEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const box = await listenOnEl.boundingBox().catch(() => null);
    if (box) {
      const y = Math.max(0, box.y - 80);
      const h = Math.min(500, box.height + 200);
      await page.screenshot({
        path: path.join(OUT, 'artist-listen-on-links.png'),
        clip: { x: 0, y, width: 1440, height: h },
      });
      console.log('  ✓ artist-listen-on-links.png (cropped to Listen On)');
    } else {
      await save(page, 'artist-listen-on-links.png', { scrollY: 300 });
    }
  } else {
    await save(page, 'artist-listen-on-links.png', { scrollY: 250 });
  }

  // ── Shot 12: Dense tag cloud — Wavewulf ───────────────────────────────────
  // Wavewulf (NJ): 69 tags including ambient house, synthwave, electronica, new age, nordic ambient, tim hecker
  console.log('Shot 12: Dense tag cloud — Wavewulf (69 quality tags)');
  await goto(page, '/artist/wavewulf', 7000);
  // Scroll to tags section
  const tagsEl = page.locator('.tags-section, .tag-list, .artist-tags, .genre-tags').first();
  const tagsVisible = await tagsEl.isVisible({ timeout: 3000 }).catch(() => false);
  if (tagsVisible) {
    await tagsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  } else {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(600);
  }
  await save(page, 'artist-tag-cloud-dense.png');

  // ── Bonus shots for variety ────────────────────────────────────────────────
  console.log('\nBonus shots:');

  console.log('  Black metal + Norway');
  await goto(page, '/discover?tags=black+metal&country=Norway', 4000);
  await tryClick(page, '.filter-toggle-btn');
  await page.waitForTimeout(600);
  await save(page, 'discover-niche-filters-black-metal-norway.png');

  console.log('  Post-punk + UK');
  await goto(page, '/discover?tags=post-punk&country=United+Kingdom', 4000);
  await page.waitForTimeout(600);
  await save(page, 'discover-niche-filters-post-punk-uk.png');

  console.log('  Krautrock + Germany');
  await goto(page, '/discover?tags=krautrock&country=Germany', 4000);
  await page.waitForTimeout(600);
  await save(page, 'discover-niche-filters-krautrock-germany.png');

  console.log('  Shoegaze + Japan');
  await goto(page, '/discover?tags=shoegaze&country=Japan', 4000);
  await page.waitForTimeout(600);
  await save(page, 'discover-niche-filters-shoegaze-japan.png');

  // Full-page discover for density shot
  console.log('  Doom metal USA full feed');
  await goto(page, '/discover?tags=doom+metal&country=United+States', 4000);
  await save(page, 'discover-doom-metal-usa.png');

  // Explore page
  console.log('  Explore page');
  await goto(page, '/explore', 3000);
  await save(page, 'explore-page.png');

  console.log('\n=== All screenshots done ===');
  console.log(`Saved to: ${OUT}`);
  console.log('Files:');
  fs.readdirSync(OUT).sort().forEach(f => console.log(`  ${f}`));

  try { await browser.close(); } catch (_) {}
  proc.kill();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
