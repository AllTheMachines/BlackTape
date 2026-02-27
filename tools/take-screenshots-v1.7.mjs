/**
 * BlackTape v1.7 Screenshot + QA Pass
 *
 * Uses Tauri binary + CDP (same approach as take-press-screenshots-v3.mjs).
 * Captures all 21 screens at 1200×800 into static/screenshots/.
 * Also copies final shots to press-screenshots/v5/.
 *
 * Run: node tools/take-screenshots-v1.7.mjs
 *
 * v1.7 fixes vs v1.6:
 *  - Search grids: scroll to show discovery grid, not library track list
 *  - Autocomplete: type in artist mode so dropdown appears; flag bug if not
 *  - Burial removed from all candidate lists (data error — wrong artist)
 *  - Player bar: navigate to /discover after triggering playback (cleaner subject)
 *  - Queue panel: build queue from 3 different artists' releases
 *  - Time Machine: apply tag filter before capturing
 *  - Style Map zoomed: modify SVG viewBox to zoom into a genre cluster
 *  - KB: use post-punk or krautrock (not shoegaze — no description)
 *  - Press screenshots: copy to press-screenshots/v5/ at end
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'static', 'screenshots');
const PRESS_OUT = path.join(ROOT, 'press-screenshots', 'v5');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9224;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const DEV_PORT = 5173;
const DEV_BASE = `http://localhost:${DEV_PORT}`;
const http = createRequire(import.meta.url)('http');

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
// Core helpers
// ---------------------------------------------------------------------------

function pollHttp(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode < 500) return resolve();
        schedule();
      });
      req.setTimeout(1000, () => { req.destroy(); schedule(); });
      req.on('error', schedule);
    }
    function schedule() {
      if (Date.now() >= deadline) return reject(new Error(`Not available after ${timeoutMs}ms: ${url}`));
      setTimeout(attempt, 600);
    }
    attempt();
  });
}

function pollCdp(timeoutMs = 40000) {
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

async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  // Use evaluate to trigger navigation — fire-and-forget (context is destroyed on nav)
  await page.evaluate(r => { window.location.href = r; }, route).catch(() => {});
  // waitForLoadState with an explicit timeout so it never hangs forever
  await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
  // Pure Node sleep — doesn't require page to be alive
  await sleep(waitMs);
}

async function save(page, filename) {
  const outPath = path.join(OUT, filename);
  try {
    await page.screenshot({ path: outPath, fullPage: false, timeout: 15000 });
    console.log(`  ✓ SAVED: ${filename}`);
  } catch (err) {
    console.error(`  ✗ SCREENSHOT FAILED (${filename}): ${err.message.split('\n')[0]}`);
    // Write a blank placeholder so the slot isn't empty
    try {
      const blank = Buffer.alloc(0);
      fs.writeFileSync(outPath, blank);
    } catch {}
  }
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForCardImages(page, timeoutMs = 15000, minImages = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const count = await page.evaluate(() => {
        let loaded = 0;
        for (const img of document.querySelectorAll('.a-art img[src]')) {
          if (img.complete && img.naturalHeight > 0) loaded++;
        }
        return loaded;
      });
      if (count >= minImages) {
        console.log(`  ↳ ${count} card image(s) loaded`);
        return count;
      }
    } catch {
      // Context may be mid-navigation — wait and retry
    }
    await sleep(600);
  }
  try {
    const final = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.a-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    console.log(`  ↳ ${final} card image(s) loaded (timeout)`);
    return final;
  } catch {
    console.log(`  ↳ 0 card image(s) loaded (context unavailable)`);
    return 0;
  }
}

async function waitForDiscographyCovers(page, timeoutMs = 18000, minCovers = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const count = await page.evaluate(() => {
        let loaded = 0;
        for (const img of document.querySelectorAll('.cover-art img[src]')) {
          if (img.complete && img.naturalHeight > 0) loaded++;
        }
        return loaded;
      });
      if (count >= minCovers) {
        console.log(`  ↳ ${count} cover(s) loaded`);
        return count;
      }
    } catch {}
    await sleep(800);
  }
  try {
    const final = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.cover-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    console.log(`  ↳ ${final} cover(s) loaded (timeout)`);
    return final;
  } catch {
    console.log(`  ↳ 0 cover(s) loaded (context unavailable)`);
    return 0;
  }
}

async function navigateToArtist(page, artistName) {
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 5000);
  const firstCard = page.locator('a.artist-card').first();
  const href = await firstCard.getAttribute('href', { timeout: 6000 }).catch(() => null);
  if (!href) { console.log(`  ✗ No results for "${artistName}"`); return null; }
  await goto(page, href, 7000);
  return href;
}

// Scroll the discovery grid into view and put it near the top of the viewport
async function scrollToDiscoveryGrid(page) {
  await page.evaluate(() => {
    // Try to scroll to discovery section (artists tagged with the query)
    const grid = document.querySelector('.discovery-section, .results-grid');
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const target = Math.max(0, window.scrollY + rect.top - 80);
      window.scrollTo(0, target);
    } else {
      window.scrollTo(0, 0);
    }
  });
  await sleep(400);
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
    let brokenImgs = 0;
    for (const img of document.querySelectorAll('.a-art img')) {
      if (img.complete && img.naturalHeight === 0 && img.src && img.src.startsWith('http')) brokenImgs++;
    }
    return { total: cards.length, broken, brokenImgs };
  });
  if (info.total === 0) bug(screenName, 'No artist cards found — empty grid');
  if (info.broken > 0) bug(screenName, `${info.broken}/${info.total} cards have 0 height`);
  if (info.brokenImgs > 0) bug(screenName, `${info.brokenImgs} broken/failed images`);
  if (info.total > 0) console.log(`  ↳ ${info.total} cards, ${info.brokenImgs} broken imgs`);
}

async function checkArtistPage(page, screenName) {
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const badge = document.querySelector('.uniqueness-badge, [class*="badge"][class*="unique"], [class*="badge"][class*="niche"], [class*="badge"][class*="eclectic"]');
    const tabs = document.querySelector('[data-testid="artist-tabs"], .artist-tab-bar');
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    console.error('Build with: cd src-tauri && cargo build');
    process.exit(1);
  }

  // --- Step 1: Ensure dev server is running on 5173 ---
  let devServerAlreadyRunning = false;
  try {
    await pollHttp(DEV_BASE, 2000);
    devServerAlreadyRunning = true;
    console.log('Dev server already running on', DEV_PORT);
  } catch {
    devServerAlreadyRunning = false;
  }

  let devProc = null;
  if (!devServerAlreadyRunning) {
    console.log('Starting dev server on port 5173...');
    devProc = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      shell: true,
      stdio: 'ignore',
      detached: false,
    });
    devProc.on('error', err => console.error('Dev server error:', err.message));
    console.log('Waiting for dev server to be ready...');
    await pollHttp(DEV_BASE, 60000);
    console.log('Dev server ready.');
    await new Promise(r => setTimeout(r, 2000));
  }

  // --- Step 2: Kill any existing mercury.exe ---
  try {
    execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
    console.log('Killed existing mercury.exe');
    await new Promise(r => setTimeout(r, 1500));
  } catch {
    // No mercury.exe running — that's fine
  }

  // --- Step 3: Launch Tauri binary with CDP ---
  console.log(`Launching Tauri app (CDP port ${CDP_PORT})...`);
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
  await pollCdp(40000);
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()?.[0];
  if (!page) throw new Error('No page found via CDP');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await sleep(3000);

  console.log('Connected. App URL:', page.url());
  console.log(`Output dir: ${OUT}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Search — electronic (ARTISTS tab, discovery grid)
  // v1.7 fix: scroll to .discovery-section to show artist grid, not library tracks
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- 1. Search: electronic (artists tab) ---');
  await goto(page, '/search?q=electronic&mode=tag', 5000);
  const e1imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e1imgs} images loaded`);
  await scrollToDiscoveryGrid(page);
  const e1cardCount = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (e1cardCount === 0) bug('search-electronic', 'No artist cards — discovery grid not rendered');
  else console.log(`  ↳ Discovery grid: ${e1cardCount} cards`);
  await checkGridLayout(page, 'search-electronic');
  await save(page, 'search-electronic-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search — jazz (ARTISTS tab, discovery grid)
  // v1.7: scroll to grid, verify no duplicate tracks in library section
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 2. Search: jazz (artists tab) ---');
  await goto(page, '/search?q=jazz&mode=tag', 5000);
  const e2imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e2imgs} images loaded`);
  await scrollToDiscoveryGrid(page);
  // Check for duplicate library tracks (v1.6 issue: "You Ain't Really Down" x3)
  const jazzDupes = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.local-section [data-testid="search-track-row"], .local-tracks .track-row'));
    const titles = rows.map(r => r.querySelector('.track-title, .title')?.textContent?.trim()).filter(Boolean);
    const seen = new Set();
    const dupes = [];
    for (const t of titles) { if (seen.has(t)) dupes.push(t); else seen.add(t); }
    return dupes;
  });
  if (jazzDupes.length > 0) bug('search-jazz', `Duplicate library tracks: ${jazzDupes.join(', ')}`);
  await checkGridLayout(page, 'search-jazz');
  await save(page, 'search-jazz-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Search — psychedelic rock (discovery grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 3. Search: psychedelic rock ---');
  await goto(page, '/search?q=psychedelic+rock&mode=tag', 5000);
  const e3imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e3imgs} images loaded`);
  await scrollToDiscoveryGrid(page);
  await checkGridLayout(page, 'search-psychedelic-rock');
  await save(page, 'search-psychedelic-rock-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Search — autocomplete dropdown
  // v1.7: Navigate to /search page (has SearchBar with autocomplete).
  //        The home page may be in 'checking' state — avoid it.
  //        Click the SearchBar's input (NOT the ControlBar search) — selector
  //        uses .search-bar context to avoid the always-visible ControlBar input.
  //        Type "post-punk" — flag bug if no dropdown (autocomplete is artist-name-only).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 4. Search autocomplete ---');
  await goto(page, '/search?q=&mode=artist', 4000);
  // SearchBar input is inside .search-bar div — distinguish from ControlBar's #control-bar-search
  const searchBarInput = page.locator('.search-bar input[type="search"]').first();
  if (await searchBarInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchBarInput.click();
    await sleep(300);
    // Make sure we're in artist mode (click the Artists button in SearchBar's mode toggle)
    const artistModeBtn = page.locator('.search-bar .mode-btn:text("Artists")').first();
    if (await artistModeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await artistModeBtn.click();
      await sleep(200);
    }
    // Clear any existing text and type "post-punk" — matches the brief exactly
    await searchBarInput.fill('');
    await page.keyboard.type('post-punk', { delay: 120 });
    await sleep(2500);
    const dropdownInfo = await page.evaluate(() => {
      const el = document.querySelector('.autocomplete-list, [data-testid="autocomplete-dropdown"]');
      return {
        exists: !!el,
        visible: el ? window.getComputedStyle(el).display !== 'none' : false,
        itemCount: el ? el.querySelectorAll('.autocomplete-item, [data-testid="autocomplete-item"]').length : 0,
      };
    });
    if (!dropdownInfo.exists || !dropdownInfo.visible || dropdownInfo.itemCount === 0) {
      bug('search-autocomplete', 'Autocomplete dropdown not visible after typing "post-punk" — autocomplete is artist-name-only (tag search does not show suggestions)');
    } else {
      console.log(`  ↳ Autocomplete dropdown visible: ${dropdownInfo.itemCount} suggestions`);
    }
    await save(page, 'search-autocomplete.png');
  } else {
    bug('search-autocomplete', 'SearchBar input (.search-bar input[type="search"]) not found on /search page');
    await save(page, 'search-autocomplete.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Artist page — Slowdive (discography tab)
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
    await sleep(600);
    await checkArtistPage(page, 'artist-slowdive');
  } else {
    bug('artist-slowdive', 'No search results for Slowdive');
  }
  await save(page, 'artist-slowdive-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Artist page — The Cure (discography tab)
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
    await sleep(600);
    await checkArtistPage(page, 'artist-the-cure');
  } else {
    bug('artist-the-cure', 'No search results for The Cure');
  }
  await save(page, 'artist-the-cure-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Artist page — Nick Cave & The Bad Seeds (discography tab)
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
    await sleep(600);
    await checkArtistPage(page, 'artist-nick-cave');
  } else {
    bug('artist-nick-cave', 'No search results for Nick Cave');
  }
  await save(page, 'artist-nick-cave-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Artist page — Overview tab (no Burial)
  // v1.7: Burial removed (data error — wrong artist in DB).
  //        Try Grouper, Godspeed, Slowdive, The Cure in order.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 8. Artist overview tab ---');
  const overviewCandidates = ['Grouper', 'Godspeed You! Black Emperor', 'Slowdive', 'The Cure', 'Nick Cave and the Bad Seeds'];
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
    await sleep(2500);
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
  // 9. Release page — tracklist + buy links (no Burial)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 9. Release page ---');
  const releaseArtists = ['Slowdive', 'The Cure', 'Grouper', 'Nick Cave and the Bad Seeds'];
  let releaseDone = false;
  for (const artist of releaseArtists) {
    if (releaseDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await sleep(2000);
    const firstRelease = page.locator('a[href*="/release/"]').first();
    const rHref = await firstRelease.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (!rHref) { console.log(`  ✗ No release links for ${artist}`); continue; }
    await goto(page, rHref, 5000);
    const hasPlayBtn = await page.evaluate(() =>
      !!document.querySelector('[data-testid="play-album-btn"], .btn-play-album')
    );
    const trackCount = await page.evaluate(() =>
      document.querySelectorAll('.track, [data-testid="track-row"]').length
    );
    if (trackCount === 0) bug('release-page', 'No track rows on release page');
    console.log(`  ↳ ${artist} release: playBtn=${hasPlayBtn}, tracks=${trackCount}`);
    await page.evaluate(() => window.scrollTo(0, 200));
    await sleep(500);
    await save(page, 'release-page-player.png');
    releaseDone = true;
  }
  if (!releaseDone) {
    bug('release-page', 'Could not navigate to any release page');
    await save(page, 'release-page-player.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Player bar — source badge visible
  // v1.7: After triggering playback, navigate to /search to show player bar
  //        as the clear subject (not the artist embed page).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 10. Player bar ---');
  const playerArtists = ['Grouper', 'Slowdive', 'The Cure', 'Boris'];
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
    // Click the first embed pill to trigger playback
    const embedPill = page.locator('.platform-pill:not(.platform-pill--ext)').first();
    if (await embedPill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await embedPill.click();
      await sleep(2500);
    }
    // Navigate to search page so player bar at bottom is the clear subject
    await goto(page, '/search?q=slowdive&mode=artist', 3000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    // Verify player bar visible
    const hasPlayerBar = await page.evaluate(() =>
      !!document.querySelector('.player-bar, [data-testid="player-bar"], .now-playing-bar, .cassette-reels')
    );
    if (!hasPlayerBar) bug('player-bar', 'Player bar element not found on page');
    else console.log(`  ↳ Player bar visible`);
    await save(page, 'player-bar-source.png');
    playerDone = true;
  }
  if (!playerDone) {
    bug('player-bar', 'No platform pills found on any candidate artist');
    await save(page, 'player-bar-source.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Queue panel — 4-5 distinct tracks from different artists
  // v1.7: Build queue from Slowdive + The Cure + Nick Cave releases
  //        to avoid the "same track repeated" issue from v1.6.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 11. Queue panel (multi-artist) ---');
  const queueSources = [
    { artist: 'Slowdive', count: 2 },
    { artist: 'The Cure', count: 2 },
    { artist: 'Nick Cave and the Bad Seeds', count: 1 },
  ];
  let totalQueued = 0;
  for (const { artist, count } of queueSources) {
    const href = await navigateToArtist(page, artist);
    if (!href) { console.log(`  ✗ Skipping ${artist} (not found)`); continue; }
    await sleep(1500);
    const rHref = await page.locator('a[href*="/release/"]').first().getAttribute('href', { timeout: 4000 }).catch(() => null);
    if (!rHref) { console.log(`  ✗ No release for ${artist}`); continue; }
    await goto(page, rHref, 4000);
    const queueBtns = page.locator('[data-testid="queue-btn"], .queue-btn');
    const btnCount = await queueBtns.count();
    const toAdd = Math.min(btnCount, count);
    for (let i = 0; i < toAdd; i++) {
      try { await queueBtns.nth(i).hover(); await queueBtns.nth(i).click(); await sleep(300); } catch {}
    }
    totalQueued += toAdd;
    console.log(`  ↳ Added ${toAdd} tracks from ${artist}`);
  }
  // Open queue panel
  const opened = await tryClick(page, '[data-testid="queue-toggle"]') ||
                 await tryClick(page, '.queue-toggle');
  if (!opened) bug('queue-panel', 'Queue toggle button not found');
  await sleep(1500);
  const qItems = await page.evaluate(() =>
    document.querySelectorAll('.queue-item, [class*="queue-track"]').length
  );
  if (qItems === 0) bug('queue-panel', `Queue panel shows 0 items (added ${totalQueued} buttons)`);
  else console.log(`  ↳ Queue shows ${qItems} items (added from ${queueSources.length} artists)`);
  await save(page, 'queue-panel.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Library — two-pane layout
  // v1.7: Try to check if library has content via Tauri invoke first.
  //        If not, attempt to add Windows Music folder and scan.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 12. Library ---');
  // Try to load library via Tauri commands (best-effort)
  const libraryTrackCount = await page.evaluate(async () => {
    try {
      if (!window.__TAURI__) return 0;
      const { invoke } = window.__TAURI__.core;
      const tracks = await invoke('get_library_tracks');
      return Array.isArray(tracks) ? tracks.length : 0;
    } catch { return -1; }
  });
  console.log(`  ↳ Library via invoke: ${libraryTrackCount} tracks`);

  if (libraryTrackCount === 0) {
    // Try to add a common music folder and trigger a scan
    const added = await page.evaluate(async () => {
      try {
        if (!window.__TAURI__) return false;
        const { invoke } = window.__TAURI__.core;
        // Try the Windows user Music folder
        const paths = [
          'C:/Users/User/Music',
          'C:/Users/Public/Music',
        ];
        for (const p of paths) {
          try { await invoke('add_music_folder', { path: p }); return p; } catch {}
        }
        return false;
      } catch { return false; }
    });
    if (added) {
      console.log(`  ↳ Added folder: ${added} — navigating to /library to trigger scan`);
      await goto(page, '/library', 5000);
      // Wait a bit for potential scan to start
      await sleep(3000);
    } else {
      console.log('  ↳ Could not add music folder — capturing empty state');
    }
  }

  await goto(page, '/library', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const libInfo = await page.evaluate(() => ({
    hasAlbumPane: !!document.querySelector('[data-testid="album-list-pane"]'),
    hasTrackPane: !!document.querySelector('[data-testid="track-pane"]'),
    itemCount: document.querySelectorAll('.album-item, .library-artist, [class*="album-row"]').length,
    hasEmptyState: !!document.querySelector('[data-testid="library-empty"], .empty-state, .add-folder-prompt'),
  }));
  if (libInfo.itemCount === 0) {
    bug('library-two-pane', 'Library empty — "Add a music folder" empty state shown. Needs manual setup for press screenshot.');
  } else {
    console.log(`  ↳ ${libInfo.itemCount} library items`);
  }
  await save(page, 'library-two-pane.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Discover — ambient + Iceland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 13. Discover: ambient + Iceland ---');
  await goto(page, '/discover?tags=ambient', 4000);
  const cInput = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput.fill('Iceland');
    await sleep(2000);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ ${cnt} results`);
    if (cnt === 0) {
      await cInput.clear();
      await sleep(1500);
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
    await sleep(2000);
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
    await sleep(2000);
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
  // 16. Time Machine — 1983, filtered to post-punk/synth-pop
  // v1.7: After loading the year, fill the tag filter input to show relevant genres.
  //        Uses the `.tag-input` filter below the genre graph.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 16. Time Machine: 1983 (filtered: synth-pop) ---');
  await goto(page, '/time-machine?year=1983', 6000);
  // Click 80s decade button to anchor the decade
  const clicked80s = await tryClick(page, 'button.decade-btn:text("80s")', 2000);
  if (!clicked80s) console.log('  ↳ Could not click 80s decade button — using URL year directly');
  await sleep(1500);
  // Apply tag filter to show era-relevant genres (post-punk, synth-pop, new wave)
  const tagFilter83 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tagFilter83.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tagFilter83.fill('synth');
    // Trigger the oninput debounce (500ms)
    await tagFilter83.dispatchEvent('input');
    await sleep(2000);
    const cnt83 = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ Filter "synth": ${cnt83} artists for 1983`);
    if (cnt83 === 0) {
      // Fallback: clear filter and use unfiltered
      await tagFilter83.fill('');
      await tagFilter83.dispatchEvent('input');
      await sleep(1500);
      bug('time-machine-1983', 'No artists for 1983 with filter "synth" — capturing unfiltered view');
    }
  } else {
    console.log('  ↳ Tag filter input not found — capturing unfiltered view');
  }
  const tm83 = await waitForCardImages(page, 12000, 3);
  const tm83info = await page.evaluate(() => {
    const label = document.querySelector('.year-label, [class*="year-label"], label[for="year-slider"]')?.textContent?.trim();
    const cards = document.querySelectorAll('.artist-card').length;
    return { label, cards };
  });
  if (!tm83info.label || !tm83info.label.includes('1983'))
    console.log(`  ↳ Year label: "${tm83info.label}" (may not include year if filtered differently)`);
  if (tm83info.cards === 0) bug('time-machine-1983', 'No artist cards for 1983');
  else console.log(`  ↳ ${tm83info.cards} artists, ${tm83} images`);
  await save(page, 'time-machine-1983.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Time Machine — 1977, filtered to punk/disco/krautrock
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 17. Time Machine: 1977 (filtered: punk) ---');
  await goto(page, '/time-machine?year=1977', 6000);
  const clicked70s = await tryClick(page, 'button.decade-btn:text("70s")', 2000);
  if (!clicked70s) console.log('  ↳ Could not click 70s decade button');
  await sleep(1500);
  const tagFilter77 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tagFilter77.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tagFilter77.fill('punk');
    await tagFilter77.dispatchEvent('input');
    await sleep(2000);
    const cnt77 = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ Filter "punk": ${cnt77} artists for 1977`);
    if (cnt77 === 0) {
      // Try disco
      await tagFilter77.fill('disco');
      await tagFilter77.dispatchEvent('input');
      await sleep(1500);
      const cntDisco = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      console.log(`  ↳ Filter "disco": ${cntDisco} artists`);
      if (cntDisco === 0) {
        await tagFilter77.fill('');
        await tagFilter77.dispatchEvent('input');
        await sleep(1500);
        bug('time-machine-1977', 'No artists for 1977 with punk/disco filter — capturing unfiltered');
      }
    }
  }
  const tm77imgs = await waitForCardImages(page, 10000, 3);
  const tm77cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  console.log(`  ↳ ${tm77cards} artists, ${tm77imgs} images`);
  await save(page, 'time-machine-1977.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Style Map — zoomed out overview
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 18. Style Map (overview) ---');
  await goto(page, '/style-map', 8000);
  await page.waitForSelector('[data-ready="true"]', { timeout: 20000 }).catch(() => {});
  await sleep(3000);
  const smInfo = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.node, .style-map-node').length;
    const svgNodes = document.querySelectorAll('svg .node g').length;
    const hasZoom = !!document.querySelector('.zoom-controls, button[title*="zoom" i], .zoom-in');
    return { nodes, svgNodes, hasZoom };
  });
  if (smInfo.nodes === 0 && smInfo.svgNodes === 0) bug('style-map-overview', 'No nodes found in style map');
  if (!smInfo.hasZoom) console.log(`  ↳ No zoom controls (known — d3-force only, no zoom UI)`);
  console.log(`  ↳ nodes=${smInfo.nodes}, svg g nodes=${smInfo.svgNodes}`);
  await save(page, 'style-map-overview.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Style Map — zoomed into post-punk cluster
  // v1.7 fix: Navigate with initialTag=post-punk, then modify SVG viewBox
  //           to zoom into the highlighted node area.
  //           This makes the shot meaningfully different from the overview.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 19. Style Map (zoomed in: post-punk) ---');
  await goto(page, '/style-map?tag=post-punk', 8000);
  await page.waitForSelector('[data-ready="true"]', { timeout: 20000 }).catch(() => {});
  await sleep(3000);

  const zoomed = await page.evaluate(() => {
    const svg = document.querySelector('.style-map-svg, .style-map-container svg');
    if (!svg) return { success: false, reason: 'SVG not found' };

    // Find the post-punk node by its text content
    const textEls = Array.from(svg.querySelectorAll('text'));
    let targetText = textEls.find(t => t.textContent?.toLowerCase().includes('post-punk'));
    if (!targetText) {
      // Fallback: find any highlighted/hovered node
      targetText = textEls.find(t => t.closest('g')?.querySelector('rect[fill*="acc"]') ||
                                      t.closest('g')?.querySelector('rect[stroke*="acc"]'));
    }
    if (!targetText) {
      // Fallback: use the center of the SVG with a 3x zoom on arbitrary cluster
      const w = parseFloat(svg.getAttribute('width') || '800');
      const h = parseFloat(svg.getAttribute('height') || '600');
      svg.setAttribute('viewBox', `${w * 0.3} ${h * 0.3} ${w * 0.35} ${h * 0.35}`);
      return { success: true, reason: 'fallback center zoom' };
    }

    // Get the node's parent <g> transform to find absolute position
    const g = targetText.closest('g.node') || targetText.parentElement;
    let cx = 0, cy = 0;
    if (g) {
      const transform = g.getAttribute('transform') || '';
      const m = transform.match(/translate\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*\)/);
      if (m) { cx = parseFloat(m[1]); cy = parseFloat(m[2]); }
    }
    // If transform parse failed, use the SVG dimensions center as fallback
    if (cx === 0 && cy === 0) {
      const w2 = parseFloat(svg.getAttribute('width') || '800');
      const h2 = parseFloat(svg.getAttribute('height') || '600');
      cx = w2 / 2; cy = h2 / 2;
    }

    // Zoom in: show a 280×190 window around the target node
    const zw = 280, zh = 190;
    const vx = cx - zw / 2;
    const vy = cy - zh / 2;
    svg.setAttribute('viewBox', `${vx} ${vy} ${zw} ${zh}`);
    return { success: true, reason: `zoomed to post-punk at (${cx.toFixed(0)}, ${cy.toFixed(0)})` };
  });

  console.log(`  ↳ Zoom: ${zoomed.success ? zoomed.reason : 'FAILED — ' + zoomed.reason}`);
  if (!zoomed.success) bug('style-map-zoomed', `Could not zoom: ${zoomed.reason}`);
  await sleep(500);
  await save(page, 'style-map-zoomed.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Knowledge Base — post-punk or krautrock (not shoegaze — no description)
  // v1.7: Try post-punk first (likely has description), then krautrock fallback.
  //        Dismiss any open map popups before capturing.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 20. Knowledge Base: post-punk / krautrock ---');
  const kbSlugs = ['post-punk', 'krautrock', 'ambient', 'noise-rock'];
  let kbDone = false;
  for (const slug of kbSlugs) {
    if (kbDone) break;
    await goto(page, `/kb/genre/${slug}`, 5000);
    const kbInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const title = h1?.textContent?.trim();
      const notFound = !title || title.toLowerCase().includes('not found') || title.toLowerCase().includes('404');
      const body = document.body.innerText;
      // Check for real description (more than 50 chars of prose)
      const descEl = document.querySelector('.genre-description, .scene-description, .description, main p');
      const descText = descEl?.textContent?.trim() ?? '';
      const hasDesc = descText.length > 50 && !descText.includes('This scene has no description');
      const hasMarkdown = body.includes('## ') || body.includes('**') || /^# /m.test(body);
      const mapPopup = document.querySelector('.leaflet-popup, .map-popup, [class*="popup"]');
      return { title, notFound, hasDesc, descText: descText.slice(0, 80), hasMarkdown, hasPopup: !!mapPopup };
    });
    console.log(`  ↳ KB [${slug}]: "${kbInfo.title}", hasDesc=${kbInfo.hasDesc}, hasPopup=${kbInfo.hasPopup}`);
    if (kbInfo.notFound) { console.log(`  ✗ Not found, trying next slug`); continue; }
    if (!kbInfo.hasDesc) { console.log(`  ✗ No description for ${slug}, trying next`); continue; }
    if (kbInfo.hasMarkdown) bug('knowledge-base', `Raw markdown visible in content for ${slug}`);
    // Dismiss any open map popup
    if (kbInfo.hasPopup) {
      await tryClick(page, '.leaflet-popup-close-button, .map-popup-close, [aria-label="Close popup"]');
      await sleep(600);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await save(page, 'knowledge-base-shoegaze.png'); // keep original filename for continuity
    kbDone = true;
  }
  if (!kbDone) {
    bug('knowledge-base', 'No KB entry found with a description — tried: ' + kbSlugs.join(', '));
    await save(page, 'knowledge-base-shoegaze.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. Artist Claim Form (/claim)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 21. Artist Claim Form ---');
  await goto(page, '/claim', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const claimInfo = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea').length;
    const hasForm = !!document.querySelector('form, .claim-form');
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
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  try { await browser.close(); } catch (_) {}
  proc.kill();
  if (devProc) devProc.kill();

  // ═══════════════════════════════════════════════════════════════════════════
  // Copy to press-screenshots/v5/
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\nCopying to press-screenshots/v5/...`);
  fs.mkdirSync(PRESS_OUT, { recursive: true });
  let copied = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith('.png')) continue;
    fs.copyFileSync(path.join(OUT, f), path.join(PRESS_OUT, f));
    copied++;
  }
  console.log(`  ✓ ${copied} files copied to ${PRESS_OUT}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('SCREENSHOTS COMPLETE (v1.7)');
  console.log(`Output: ${OUT}`);
  console.log(`Press:  ${PRESS_OUT}`);
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
