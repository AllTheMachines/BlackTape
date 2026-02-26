/**
 * BlackTape Press Screenshot Automation — v2 (revised)
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
 * Keepers (already done, not overwritten):
 *   - discover-niche-filters-shoegaze-japan.png
 *   - artist-niche-badge-obscure.png
 *   - artist-stats-tab.png
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
const OUT = path.join(ROOT, 'press-screenshots', 'v2');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9223;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

// Keeper shots — skip if they already exist
const KEEPERS = new Set([
  'discover-niche-filters-shoegaze-japan.png',
  'artist-niche-badge-obscure.png',
  'artist-stats-tab.png',
]);

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
 */
async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

/**
 * Save a screenshot with scroll offset.
 */
async function save(page, filename, { scrollY = 0, extraWait = 0 } = {}) {
  if (KEEPERS.has(filename) && fs.existsSync(path.join(OUT, filename))) {
    console.log(`  ⏭ ${filename} (keeper — skipping)`);
    return;
  }
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
 * Click element matching selector (non-fatal).
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

/**
 * Wait for Wikipedia thumbnail images to appear in card grids.
 * Polls for .a-art img[src] — returns when at least minImages are visible.
 * Gives up after timeoutMs and proceeds anyway.
 */
async function waitForCardImages(page, timeoutMs = 10000, minImages = 3) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.a-art img[src]').length
    );
    if (count >= minImages) {
      console.log(`  ↳ ${count} card image(s) loaded`);
      return true;
    }
    await page.waitForTimeout(600);
  }
  const final = await page.evaluate(() =>
    document.querySelectorAll('.a-art img[src]').length
  );
  console.log(`  ↳ ${final} card image(s) loaded (timeout reached)`);
  return false;
}

/**
 * Try discover filter combos in order, return first that yields results.
 * combos: array of { tags, country, filename } — country is a full name like "Finland".
 *
 * Strategy: navigate with tags via URL (reliable), then set country via UI
 * (using SvelteKit's own goto() via the country text input, which avoids
 * the full-reload/load-function timing issue with URL-based country params).
 */
async function discoverFilterShot(page, combos) {
  for (const { tags, country, filename } of combos) {
    const tagParam = Array.isArray(tags) ? tags.join(',') : tags;

    // Step 1: Navigate with tags only (no country) — this reliably triggers load
    await goto(page, `/discover?tags=${encodeURIComponent(tagParam)}`, 5000);

    // Step 2: Fill the country input if specified, using UI (triggers SvelteKit goto)
    if (country) {
      const countryInput = page.locator('#country-input').first();
      if (await countryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await countryInput.fill(country);
        // The oninput handler has a 300ms debounce then calls SvelteKit goto()
        await page.waitForTimeout(1500); // debounce + navigation + DB query
      }
    }

    // Check if there are artist rows
    const count = await page.evaluate(() =>
      document.querySelectorAll('.artist-card').length
    );
    if (count > 0) {
      console.log(`  ✓ ${tagParam} + ${country} → ${count} results`);
      await save(page, filename);
      return filename;
    }
    console.log(`  ✗ ${tagParam} + ${country} → no results, trying next`);
  }
  console.log('  ! all combos failed — saving last attempt anyway');
  const last = combos[combos.length - 1];
  await save(page, last.filename);
  return last.filename;
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
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()?.[0];
  if (!page) throw new Error('No page found via CDP');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(3000);

  console.log('Connected. App URL:', page.url());
  console.log(`Output dir: ${OUT}\n`);

  // ── Shot 1: Discover — niche filter, real results (replaces doom+finland) ─
  // Country must be ISO code — full country names don't match DB values.
  // Try combos in order; use first that returns artists.
  console.log('Shot 1: Discover — niche filter (doom/black metal + Scandinavia)');
  await discoverFilterShot(page, [
    { tags: 'doom metal',  country: 'Finland', filename: 'discover-niche-filters-doom-finland.png' },
    { tags: 'black metal', country: 'Sweden',  filename: 'discover-niche-filters-doom-finland.png' },
    { tags: 'black metal', country: 'Finland', filename: 'discover-niche-filters-doom-finland.png' },
    { tags: 'death metal', country: 'Sweden',  filename: 'discover-niche-filters-doom-finland.png' },
  ]);

  // ── Shot 2: Discover — raw uniqueness feed, no filters ────────────────────
  console.log('Shot 2: Discover — raw uniqueness feed');
  await goto(page, '/discover', 5000);
  await save(page, 'discover-raw-uniqueness-feed.png');

  // ── Shot 3: Discover — 5 tags simultaneously ──────────────────────────────
  console.log('Shot 3: Discover — multi-tag filter');
  await goto(page, '/discover?tags=experimental,ambient,drone,industrial,noise+rock', 5000);
  await save(page, 'discover-multi-tag-filter.png');

  // ── Shot 4: Niche artist — Skinfields (KEEPER) ────────────────────────────
  if (!fs.existsSync(path.join(OUT, 'artist-niche-badge-obscure.png'))) {
    console.log('Shot 4: Artist — Skinfields (Very Niche, coldwave/darkwave/industrial)');
    await goto(page, '/artist/skinfields', 8000);
    await save(page, 'artist-niche-badge-obscure.png');
  } else {
    console.log('Shot 4: artist-niche-badge-obscure.png — keeper, skipping');
  }

  // ── Shot 5: Same artist, scrolled to discography ───────────────────────────
  console.log('Shot 5: Artist discography view — Skinfields scrolled down');
  await goto(page, '/artist/skinfields', 6000);
  await save(page, 'artist-discography-view.png', { scrollY: 600, extraWait: 1500 });

  // ── Shot 6: Artist stats/about tab (KEEPER) ───────────────────────────────
  if (!fs.existsSync(path.join(OUT, 'artist-stats-tab.png'))) {
    console.log('Shot 6: Artist stats tab');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const statsClicked = await tryClick(page, 'button:has-text("Stats")');
    if (!statsClicked) await tryClick(page, '[role="tab"]:has-text("Stats")');
    await page.waitForTimeout(2000);
    await save(page, 'artist-stats-tab.png');
  } else {
    console.log('Shot 6: artist-stats-tab.png — keeper, skipping');
  }

  // ── Shot 7: Time Machine — wait for Wikipedia images ──────────────────────
  console.log('Shot 7: Time Machine (with image loading)');
  // Try years with most artists (1991 has GLASSTIQUE etc). URL param triggers load.
  const tmYears = ['1991', '1988', '1994', '1983'];
  for (const year of tmYears) {
    await goto(page, `/time-machine?year=${year}`, 5000);
    const hasResults = await page.evaluate(() =>
      document.querySelectorAll('.artist-card').length > 0
    );
    if (hasResults) {
      console.log(`  Using year ${year}`);
      await waitForCardImages(page, 10000, 3);
      await save(page, `time-machine-${year}.png`);
      break;
    }
  }

  // ── Shot 8: Knowledge Base genre graph ────────────────────────────────────
  console.log('Shot 8: Knowledge Base genre graph');
  await goto(page, '/kb', 8000);
  const kbText = await page.evaluate(() => document.body.innerText);
  if (kbText.includes('not yet available')) {
    console.log('  KB graph still empty — skipping (run merge-genre-data.cjs first)');
  } else {
    const kbHasGraph = await page.locator('canvas, .genre-graph, .kb-graph, svg').first()
      .isVisible({ timeout: 4000 }).catch(() => false);
    console.log(`  KB graph ${kbHasGraph ? 'rendered' : 'loaded (no canvas/svg found)'}`);
    await save(page, 'knowledge-base-genre-graph.png');
  }

  // ── Shot 9: Crate Dig — filtered dig, wait for images ─────────────────────
  console.log('Shot 9: Crate Dig — shoegaze + 90s');
  await goto(page, '/crate', 4000);
  // Fill tag input
  const tagInput = page.locator('.filter-input').first();
  if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tagInput.fill('shoegaze');
  }
  // Select 1990s (index 4 in decades array: Any/50s/60s/70s/80s/90s...)
  const decadeSelect = page.locator('select.filter-select').first();
  if (await decadeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await decadeSelect.selectOption({ index: 4 }); // 1990s
  }
  // Click Dig
  await tryClick(page, '.dig-btn');
  // Wait for results + images
  await page.waitForTimeout(3000);
  await waitForCardImages(page, 10000, 3);
  await save(page, 'crate-dig-loaded.png');

  // ── Shot 10: Search results — wait for images ─────────────────────────────
  // Use "post-punk" for variety (shoegaze-japan is already a keeper)
  console.log('Shot 10: Search — post-punk (tag mode, with images)');
  await goto(page, '/search?q=post-punk&mode=tag', 6000);
  await waitForCardImages(page, 10000, 3);
  await save(page, 'search-results-loaded.png');

  // ── Shot 11: Listen On section — Skinfields ───────────────────────────────
  console.log('Shot 11: Listen On section — Skinfields');
  await goto(page, '/artist/skinfields', 7000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
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
  console.log('Shot 12: Dense tag cloud — Wavewulf (69 quality tags)');
  await goto(page, '/artist/wavewulf', 7000);
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

  // ── Bonus shots ───────────────────────────────────────────────────────────
  console.log('\nBonus shots:');

  // Replace black-metal-norway (no results) — try combos with full country names
  console.log('  Black metal — trying Norway/Sweden/Finland');
  await discoverFilterShot(page, [
    { tags: 'black metal', country: 'Norway',  filename: 'discover-niche-filters-black-metal-norway.png' },
    { tags: 'black metal', country: 'Sweden',  filename: 'discover-niche-filters-black-metal-norway.png' },
    { tags: 'black metal', country: 'Finland', filename: 'discover-niche-filters-black-metal-norway.png' },
  ]);

  // Post-punk + UK
  console.log('  Post-punk + UK');
  await discoverFilterShot(page, [
    { tags: 'post-punk', country: 'United Kingdom', filename: 'discover-niche-filters-post-punk-uk.png' },
    { tags: 'post-punk', country: 'United States',  filename: 'discover-niche-filters-post-punk-uk.png' },
  ]);

  // Krautrock + Germany
  console.log('  Krautrock + Germany');
  await discoverFilterShot(page, [
    { tags: 'krautrock', country: 'Germany', filename: 'discover-niche-filters-krautrock-germany.png' },
  ]);

  // Shoegaze + Japan (KEEPER)
  if (!fs.existsSync(path.join(OUT, 'discover-niche-filters-shoegaze-japan.png'))) {
    console.log('  Shoegaze + Japan (JP)');
    await discoverFilterShot(page, [
      { tags: 'shoegaze', country: 'JP', filename: 'discover-niche-filters-shoegaze-japan.png' },
    ]);
  } else {
    console.log('  discover-niche-filters-shoegaze-japan.png — keeper, skipping');
  }

  // Full-page discover for density
  console.log('  Doom metal USA full feed');
  await discoverFilterShot(page, [
    { tags: 'doom metal', country: 'United States', filename: 'discover-doom-metal-usa.png' },
  ]);

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
