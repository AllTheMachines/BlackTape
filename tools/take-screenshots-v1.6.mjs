/**
 * BlackTape v1.6 Screenshot + QA Pass
 *
 * Uses dev server + headless Chromium (no Tauri binary needed).
 * Captures all 21 screens at 1200x800 into static/screenshots/.
 *
 * Run: node tools/take-screenshots-v1.6.mjs
 *
 * Requirements: dev server running on http://localhost:5199
 * Start with: npx cross-env VITE_TAURI=1 npm run dev -- --port 5199
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'static', 'screenshots');
const BASE = 'http://localhost:5199';

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Bug log
// ---------------------------------------------------------------------------
const BUGS = [];
function bug(screen, description) {
  const entry = `[BUG] ${screen}: ${description}`;
  BUGS.push(entry);
  console.error(`  ⚠  ${entry}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function goto(page, route, waitMs = 3500) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function save(page, filename) {
  const outPath = path.join(OUT, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ✓ SAVED: ${filename}`);
}

async function tryClick(page, selector, timeoutMs = 3000) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: timeoutMs })) {
      await el.click();
      return true;
    }
  } catch {}
  return false;
}

async function waitForCardImages(page, timeoutMs = 15000, minImages = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.a-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    if (count >= minImages) return count;
    await page.waitForTimeout(600);
  }
  return await page.evaluate(() => {
    let loaded = 0;
    for (const img of document.querySelectorAll('.a-art img[src]')) {
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return loaded;
  });
}

async function waitForDiscographyCovers(page, timeoutMs = 18000, minCovers = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.cover-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    if (count >= minCovers) return count;
    await page.waitForTimeout(800);
  }
  return await page.evaluate(() => {
    let loaded = 0;
    for (const img of document.querySelectorAll('.cover-art img[src]')) {
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return loaded;
  });
}

async function navigateToArtist(page, artistName) {
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 5000);
  const firstCard = page.locator('a.artist-card').first();
  const href = await firstCard.getAttribute('href', { timeout: 6000 }).catch(() => null);
  if (!href) { console.log(`  ✗ No results for "${artistName}"`); return null; }
  await goto(page, href, 7000);
  return href;
}

// ---------------------------------------------------------------------------
// QA helpers
// ---------------------------------------------------------------------------
async function checkGridLayout(page, screenName) {
  const info = await page.evaluate(() => {
    const cards = document.querySelectorAll('.artist-card');
    let broken = 0;
    for (const c of cards) {
      if (c.getBoundingClientRect().height < 10) broken++;
    }
    let truncated = null;
    for (const n of document.querySelectorAll('.artist-name, .a-name')) {
      if (n.scrollWidth > n.clientWidth + 4) { truncated = n.textContent?.trim(); break; }
    }
    let brokenImgs = 0;
    for (const img of document.querySelectorAll('.a-art img')) {
      if (img.complete && img.naturalHeight === 0 && img.src && img.src.startsWith('http')) brokenImgs++;
    }
    return { total: cards.length, broken, truncated, brokenImgs };
  });
  if (info.total === 0) bug(screenName, 'No artist cards found — empty grid');
  if (info.broken > 0) bug(screenName, `${info.broken}/${info.total} cards have 0 height`);
  if (info.truncated) bug(screenName, `Artist name overflowing: "${info.truncated}"`);
  if (info.brokenImgs > 0) bug(screenName, `${info.brokenImgs} broken/failed images`);
  if (info.total > 0) console.log(`  ↳ ${info.total} cards, ${info.brokenImgs} broken imgs`);
}

async function checkArtistPage(page, screenName) {
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const badge = document.querySelector('.uniqueness-badge, [class*="badge"][class*="unique"], [class*="badge"][class*="niche"], [class*="badge"][class*="eclectic"]');
    const tabs = document.querySelector('[data-testid="tab-bar"], .tab-bar');
    const covers = { loaded: 0, total: 0 };
    for (const img of document.querySelectorAll('.cover-art img')) {
      covers.total++;
      if (img.complete && img.naturalHeight > 0) covers.loaded++;
    }
    return {
      name: h1?.textContent?.trim(),
      nameOverflow: h1 ? h1.scrollWidth > h1.clientWidth + 4 : false,
      hasBadge: !!badge,
      hasTabs: !!tabs,
      covers,
    };
  });
  if (!info.name) bug(screenName, 'Artist name h1 not found');
  else if (info.nameOverflow) bug(screenName, `Artist name truncated: "${info.name}"`);
  if (!info.hasBadge) bug(screenName, 'No uniqueness/niche/eclectic badge found');
  if (!info.hasTabs) bug(screenName, 'Tab bar not found');
  if (info.covers.total > 0 && info.covers.loaded === 0)
    bug(screenName, `Discography: ${info.covers.total} covers but none loaded`);
  console.log(`  ↳ "${info.name}", badge: ${info.hasBadge}, covers: ${info.covers.loaded}/${info.covers.total}`);
}

async function checkPlatformPills(page, screenName) {
  const pills = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.platform-pill')).map(p => ({
      text: p.textContent?.trim().replace(/\s+/g, ' ').slice(0, 30),
      isExt: p.classList.contains('platform-pill--ext'),
    }));
  });
  if (pills.length > 0) console.log(`  ↳ Platform pills (${pills.length}): ${pills.map(p => p.text).join(' | ')}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  // Wait for dev server
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const { default: http } = await import('http');
      await new Promise((res, rej) => {
        const req = http.get(BASE, r => { r.resume(); res(); });
        req.on('error', rej);
        req.setTimeout(1000, () => { req.destroy(); rej(new Error('timeout')); });
      });
      serverReady = true;
      break;
    } catch {
      console.log(`  Waiting for dev server... (${(i + 1) * 2}s)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!serverReady) throw new Error('Dev server not available after 40s');
  console.log('Dev server ready at', BASE);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();

  // Suppress noisy errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [console.error] ${msg.text().slice(0, 120)}`);
  });

  console.log('Browser ready. Output:', OUT, '\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Search — electronic (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- 1. Search: electronic ---');
  await goto(page, '/search?q=electronic&mode=tag', 4000);
  const e1imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e1imgs} images loaded`);
  await checkGridLayout(page, 'search-electronic');
  await save(page, 'search-electronic-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search — jazz (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 2. Search: jazz ---');
  await goto(page, '/search?q=jazz&mode=tag', 4000);
  const e2imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e2imgs} images loaded`);
  await checkGridLayout(page, 'search-jazz');
  await save(page, 'search-jazz-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Search — psychedelic rock (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 3. Search: psychedelic rock ---');
  await goto(page, '/search?q=psychedelic+rock&mode=tag', 4000);
  const e3imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e3imgs} images loaded`);
  await checkGridLayout(page, 'search-psychedelic-rock');
  await save(page, 'search-psychedelic-rock-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Search — autocomplete mid-type
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 4. Search autocomplete ---');
  await goto(page, '/', 2500);
  // Find search input
  const searchSel = 'input[type="search"], .search-input input, input[placeholder*="Search" i], input[placeholder*="search" i]';
  const searchInput = page.locator(searchSel).first();
  if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
    await searchInput.click();
    await page.waitForTimeout(300);
    await page.keyboard.type('post-', { delay: 100 });
    await page.waitForTimeout(2000); // wait for dropdown
    const hasDropdown = await page.evaluate(() => {
      const sel = '.autocomplete-list, .autocomplete, [class*="autocomplete"], [class*="suggestions"], [class*="dropdown"]';
      const el = document.querySelector(sel);
      return !!el && window.getComputedStyle(el).display !== 'none' && el.children.length > 0;
    });
    if (!hasDropdown) bug('search-autocomplete', 'Autocomplete dropdown not visible after typing "post-"');
    else console.log('  ↳ Autocomplete dropdown visible');
    await save(page, 'search-autocomplete.png');
  } else {
    bug('search-autocomplete', 'Search input not found on home page');
    await save(page, 'search-autocomplete.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Artist page — Slowdive
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 5. Artist: Slowdive ---');
  const slowdiveHref = await navigateToArtist(page, 'Slowdive');
  if (slowdiveHref) {
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200) : 300;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-slowdive');
    await checkPlatformPills(page, 'artist-slowdive');
  } else {
    bug('artist-slowdive', 'No search results for Slowdive');
  }
  await save(page, 'artist-slowdive-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Artist page — The Cure
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 6. Artist: The Cure ---');
  const cureHref = await navigateToArtist(page, 'The Cure');
  if (cureHref) {
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200) : 300;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-the-cure');
    await checkPlatformPills(page, 'artist-the-cure');
  } else {
    bug('artist-the-cure', 'No search results for The Cure');
  }
  await save(page, 'artist-the-cure-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Artist page — Nick Cave
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 7. Artist: Nick Cave ---');
  const nickCaveHref = await navigateToArtist(page, 'Nick Cave and the Bad Seeds');
  if (nickCaveHref) {
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200) : 300;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-nick-cave');
    await checkPlatformPills(page, 'artist-nick-cave');
  } else {
    bug('artist-nick-cave', 'No search results for Nick Cave');
  }
  await save(page, 'artist-nick-cave-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Artist page — Overview tab
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 8. Artist overview tab ---');
  const overviewCandidates = ['Burial', 'Godspeed You! Black Emperor', 'The Cure', 'Nick Cave and the Bad Seeds', 'Slowdive'];
  let overviewDone = false;
  for (const artist of overviewCandidates) {
    if (overviewDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await page.evaluate(() => window.scrollTo(0, 0));
    const clicked = await tryClick(page, '[data-testid="tab-overview"]') ||
                    await tryClick(page, '[data-testid="tab-btn-overview"]') ||
                    await tryClick(page, 'button:text("Overview")');
    if (!clicked) { console.log(`  ✗ No Overview tab for ${artist}`); continue; }
    await page.waitForTimeout(2500);
    const hasContent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tab-content-overview"], .overview-tab, .artist-relationships');
      return !!el && (el.textContent?.trim().length ?? 0) > 50;
    });
    const tagCount = await page.evaluate(() => document.querySelectorAll('.tag-chip, .genre-tag').length);
    if (!hasContent) bug('artist-overview', `Overview content empty for "${artist}"`);
    if (tagCount === 0) bug('artist-overview', `No tags in overview for "${artist}"`);
    console.log(`  ↳ ${artist}: content=${hasContent}, tags=${tagCount}`);
    await save(page, 'artist-overview-tab.png');
    overviewDone = true;
  }
  if (!overviewDone) {
    bug('artist-overview', 'No Overview tab found on any candidate artist');
    await save(page, 'artist-overview-tab.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Release page — Play Album button
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 9. Release page ---');
  const releaseArtists = ['Slowdive', 'Burial', 'The Cure', 'Grouper'];
  let releaseDone = false;
  for (const artist of releaseArtists) {
    if (releaseDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await page.waitForTimeout(2000);
    const firstRelease = page.locator('a[href*="/release/"]').first();
    const rHref = await firstRelease.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (!rHref) { console.log(`  ✗ No release links for ${artist}`); continue; }
    await goto(page, rHref, 5000);
    // Check play album button
    const hasPlayBtn = await page.evaluate(() =>
      !!document.querySelector('[data-testid="play-album-btn"], .play-album-btn')
    );
    if (!hasPlayBtn) bug('release-page', `Play Album button not found for ${artist}`);
    const trackCount = await page.evaluate(() =>
      document.querySelectorAll('.track-row, [data-testid="track-row"]').length
    );
    if (trackCount === 0) bug('release-page', 'No track rows on release page');
    console.log(`  ↳ ${artist} release: playBtn=${hasPlayBtn}, tracks=${trackCount}`);
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);
    await save(page, 'release-page-player.png');
    releaseDone = true;
  }
  if (!releaseDone) {
    bug('release-page', 'Could not navigate to any release page');
    await save(page, 'release-page-player.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Artist page — platform pills / embed toggle
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 10. Player bar / platform pills ---');
  const playerArtists = ['Grouper', 'Burial', 'Slowdive', 'The Cure', 'Boris'];
  let playerDone = false;
  for (const artist of playerArtists) {
    if (playerDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    const pills = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.platform-pill')).map(p => p.textContent?.trim().slice(0, 20))
    );
    if (pills.length === 0) { console.log(`  ✗ No platform pills for ${artist}`); continue; }
    console.log(`  ↳ ${pills.length} pills: ${pills.join(', ')}`);
    // Click first non-ext pill to trigger embed toggle
    const embedPill = page.locator('.platform-pill:not(.platform-pill--ext)').first();
    if (await embedPill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await embedPill.click();
      await page.waitForTimeout(2500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await save(page, 'player-bar-source.png');
    playerDone = true;
  }
  if (!playerDone) {
    bug('player-bar', 'No platform pills found on any candidate artist');
    await save(page, 'player-bar-source.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Queue panel
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 11. Queue panel ---');
  const qHref = await navigateToArtist(page, 'Slowdive');
  if (qHref) {
    await page.waitForTimeout(2000);
    const rHref = await page.locator('a[href*="/release/"]').first().getAttribute('href', { timeout: 4000 }).catch(() => null);
    if (rHref) {
      await goto(page, rHref, 4000);
      // Add tracks to queue
      const queueBtns = page.locator('[data-testid="queue-btn"], .queue-btn');
      const btnCount = await queueBtns.count();
      const toAdd = Math.min(btnCount, 5);
      for (let i = 0; i < toAdd; i++) {
        try { await queueBtns.nth(i).hover(); await queueBtns.nth(i).click(); await page.waitForTimeout(250); } catch {}
      }
      console.log(`  ↳ Clicked ${toAdd} queue buttons`);
      // Open queue
      const opened = await tryClick(page, '[data-testid="queue-toggle"]') ||
                     await tryClick(page, '.queue-toggle');
      if (!opened) bug('queue-panel', 'Queue toggle button not found');
      await page.waitForTimeout(1500);
      const qItems = await page.evaluate(() =>
        document.querySelectorAll('.queue-item, [class*="queue-track"]').length
      );
      if (qItems === 0) bug('queue-panel', 'Queue panel shows 0 items');
      else console.log(`  ↳ Queue shows ${qItems} items`);
    } else {
      bug('queue-panel', 'No release links for Slowdive');
    }
  } else {
    bug('queue-panel', 'Could not navigate to Slowdive');
  }
  await save(page, 'queue-panel.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Library — two-pane layout
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 12. Library ---');
  await goto(page, '/library', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const libInfo = await page.evaluate(() => ({
    hasAlbumPane: !!document.querySelector('[data-testid="album-list-pane"]'),
    hasTrackPane: !!document.querySelector('[data-testid="track-pane"]'),
    itemCount: document.querySelectorAll('.album-item, .library-artist, [class*="album-row"]').length,
  }));
  if (!libInfo.hasAlbumPane) bug('library', 'Album list pane not found');
  if (!libInfo.hasTrackPane) bug('library', 'Track pane not found');
  if (libInfo.itemCount === 0) console.log('  ↳ Library empty (expected — no local files in dev mode)');
  else console.log(`  ↳ ${libInfo.itemCount} library items`);
  await save(page, 'library-two-pane.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Discover — ambient + Iceland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 13. Discover: ambient + Iceland ---');
  await goto(page, '/discover?tags=ambient', 4000);
  const cInput = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput.fill('Iceland');
    await page.waitForTimeout(2000);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ ${cnt} results`);
    if (cnt === 0) {
      await cInput.clear();
      await page.waitForTimeout(1500);
    }
  } else {
    bug('discover-ambient-iceland', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-ambient-iceland');
  await save(page, 'discover-ambient-iceland.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Discover — noise rock + Japan
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 14. Discover: noise rock + Japan ---');
  await goto(page, '/discover?tags=noise+rock', 4000);
  const cInput2 = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput2.fill('Japan');
    await page.waitForTimeout(2000);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ ${cnt} results`);
    if (cnt === 0) bug('discover-noise-rock-japan', 'No results for noise rock + Japan');
  } else {
    bug('discover-noise-rock-japan', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-noise-rock-japan');
  await save(page, 'discover-noise-rock-japan.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. Discover — metal + Finland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 15. Discover: metal + Finland ---');
  await goto(page, '/discover?tags=metal', 4000);
  const cInput3 = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput3.fill('Finland');
    await page.waitForTimeout(2000);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ ${cnt} results`);
    if (cnt === 0) bug('discover-metal-finland', 'No results for metal + Finland');
  } else {
    bug('discover-metal-finland', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-metal-finland');
  await save(page, 'discover-metal-finland.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. Time Machine — 1983
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 16. Time Machine: 1983 ---');
  await goto(page, '/time-machine?year=1983', 6000);
  const tm83 = await waitForCardImages(page, 12000, 3);
  const tm83info = await page.evaluate(() => {
    const label = document.querySelector('.year-display, .year-label, [class*="year"]')?.textContent?.trim();
    const cards = document.querySelectorAll('.artist-card').length;
    return { label, cards };
  });
  if (!tm83info.label || !tm83info.label.includes('1983'))
    bug('time-machine-1983', `Year label wrong/missing: "${tm83info.label}"`);
  if (tm83info.cards === 0) bug('time-machine-1983', 'No artist cards for 1983');
  else console.log(`  ↳ ${tm83info.cards} artists, ${tm83} images`);
  await save(page, 'time-machine-1983.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Time Machine — 1977
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 17. Time Machine: 1977 ---');
  await goto(page, '/time-machine?year=1977', 6000);
  const tm77cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (tm77cards === 0) {
    console.log('  ↳ 1977 empty, trying 1991...');
    await goto(page, '/time-machine?year=1991', 6000);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt === 0) bug('time-machine-1977', 'No artists for 1977 or 1991');
    else { await waitForCardImages(page, 10000, 3); console.log(`  ↳ 1991: ${cnt} artists`); }
  } else {
    await waitForCardImages(page, 10000, 3);
    console.log(`  ↳ 1977: ${tm77cards} artists`);
  }
  await save(page, 'time-machine-1977.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Style Map — zoomed out
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 18. Style Map (overview) ---');
  await goto(page, '/style-map', 6000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const smInfo = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.style-map-node, [class*="node"], rect, circle').length;
    const hasZoom = !!document.querySelector('.zoom-controls, button[title*="zoom" i], .zoom-in');
    return { nodes, hasZoom };
  });
  if (smInfo.nodes === 0) bug('style-map-overview', 'No nodes found');
  if (!smInfo.hasZoom) bug('style-map-overview', 'No zoom controls');
  console.log(`  ↳ ${smInfo.nodes} nodes, zoom=${smInfo.hasZoom}`);
  await save(page, 'style-map-overview.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Style Map — zoomed in
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 19. Style Map (zoomed in) ---');
  await goto(page, '/style-map?tag=post-punk', 6000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  for (let i = 0; i < 4; i++) {
    const zoomed = await tryClick(page, '.zoom-in, button[title*="zoom in" i]', 1000);
    if (zoomed) await page.waitForTimeout(400); else break;
  }
  await page.waitForTimeout(800);
  const textNodes = await page.evaluate(() =>
    document.querySelectorAll('text, .node-label, [class*="label"]').length
  );
  if (textNodes === 0) bug('style-map-zoomed', 'No text/label nodes visible');
  await save(page, 'style-map-zoomed.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Knowledge Base — shoegaze
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 20. Knowledge Base: shoegaze ---');
  await goto(page, '/kb/shoegaze', 5000);
  let kbTitle = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  if (!kbTitle || kbTitle.toLowerCase().includes('not found') || kbTitle.toLowerCase().includes('404')) {
    console.log('  ↳ shoegaze not found, trying krautrock...');
    await goto(page, '/kb/krautrock', 5000);
    kbTitle = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  }
  console.log(`  ↳ KB title: "${kbTitle}"`);
  const kbChecks = await page.evaluate(() => {
    const hasRelated = document.querySelectorAll('.related-genres a, .related-tags a, [class*="related"] a').length > 0;
    const body = document.body.innerText;
    const hasMarkdown = body.includes('## ') || body.includes('**') || /^# /m.test(body);
    return { hasRelated, hasMarkdown };
  });
  if (!kbChecks.hasRelated) bug('knowledge-base-shoegaze', 'No related genre links');
  if (kbChecks.hasMarkdown) bug('knowledge-base-shoegaze', 'Raw markdown visible in content');
  await save(page, 'knowledge-base-shoegaze.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. Artist Claim Form
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 21. Artist Claim Form ---');
  await goto(page, '/claim', 3500);
  await page.evaluate(() => window.scrollTo(0, 0));
  const claimInfo = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea').length;
    const hasForm = !!document.querySelector('form, .claim-form');
    // Check for submit button (avoid :has-text which is CSS4 not querySelectorAll)
    let hasSubmit = !!document.querySelector('button[type="submit"]');
    if (!hasSubmit) {
      for (const b of document.querySelectorAll('button')) {
        if (/submit|claim|send/i.test(b.textContent ?? '')) { hasSubmit = true; break; }
      }
    }
    return { inputs, hasForm, hasSubmit };
  });
  if (claimInfo.inputs === 0) bug('artist-claim-form', 'No input fields on /claim page');
  if (!claimInfo.hasForm) bug('artist-claim-form', 'No <form> element found');
  if (!claimInfo.hasSubmit) bug('artist-claim-form', 'No submit button found');
  console.log(`  ↳ inputs=${claimInfo.inputs}, form=${claimInfo.hasForm}, submit=${claimInfo.hasSubmit}`);
  await save(page, 'artist-claim-form.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  await browser.close();

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('SCREENSHOTS COMPLETE');
  console.log(`Output: ${OUT}`);
  console.log('\nFiles saved:');
  fs.readdirSync(OUT).sort().forEach(f => console.log(`  ${f}`));

  console.log('\n═══════════════════════════════════════════════════');
  if (BUGS.length === 0) {
    console.log('✓ No bugs detected');
  } else {
    console.log(`⚠  BUGS FOUND (${BUGS.length}):`);
    BUGS.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
