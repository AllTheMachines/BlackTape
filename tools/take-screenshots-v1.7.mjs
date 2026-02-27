/**
 * BlackTape v1.7 Screenshot + QA Pass
 *
 * Uses Tauri binary + CDP. All v1.6 issues addressed:
 *   - Search uses mode=artist (not mode=tag) to show artist grid
 *   - Autocomplete uses artist name prefix ("Nick", "Slow") that actually matches
 *   - No Burial in any candidate list (data error — wrong artist)
 *   - Queue adds tracks from 3 different releases
 *   - Time Machine applies tag filter before capturing
 *   - Style Map zoom uses mouse wheel to actually zoom
 *   - KB uses post-punk (has a description), not shoegaze (empty)
 *   - Output: static/press-screenshots/v5/
 *
 * Run: node tools/take-screenshots-v1.7.mjs
 *
 * Requirements:
 *   - Tauri debug binary at src-tauri/target/debug/mercury.exe
 *   - Real mercury.db in %APPDATA%/com.blacktape.app/mercury.db
 *   - npm run dev running on port 5173
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'static', 'press-screenshots', 'v5');
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
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
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
    } catch {}
    await page.waitForTimeout(600);
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
    await page.waitForTimeout(800);
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
    // No mercury.exe running — fine
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
  await page.waitForTimeout(3000);

  console.log('Connected. App URL:', page.url());
  console.log(`Output dir: ${OUT}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Search — electronic (ARTISTS grid)
  // Fix: use mode=artist, not mode=tag. mode=tag showed the Tags tab in v1.6.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- 1. Search: electronic (artists grid) ---');
  await goto(page, '/search?q=electronic&mode=artist', 5000);
  const e1imgs = await waitForCardImages(page, 15000, 6);
  const e1mode = await page.evaluate(() => {
    const grid = document.querySelectorAll('.artist-card').length;
    const tagList = document.querySelectorAll('.tag-result, .tag-row').length;
    return { grid, tagList };
  });
  if (e1mode.tagList > 0 && e1mode.grid === 0) bug('search-electronic', 'Showing tags tab, not artist grid');
  console.log(`  ↳ ${e1imgs} images, ${e1mode.grid} artist cards`);
  await checkGridLayout(page, 'search-electronic');
  await save(page, 'search-electronic-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search — jazz (ARTISTS grid)
  // Fix: mode=artist. Check for duplicate track entries from v1.6.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 2. Search: jazz (artists grid) ---');
  await goto(page, '/search?q=jazz&mode=artist', 5000);
  const e2imgs = await waitForCardImages(page, 15000, 6);
  const e2dups = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.track-title, .song-title'))
      .map(el => el.textContent?.trim());
    const seen = new Map();
    for (const t of titles) {
      if (!t) continue;
      seen.set(t, (seen.get(t) ?? 0) + 1);
    }
    return Array.from(seen.entries()).filter(([, n]) => n > 1).map(([t, n]) => `${t} ×${n}`);
  });
  if (e2dups.length > 0) bug('search-jazz', `Duplicate tracks: ${e2dups.join(', ')}`);
  console.log(`  ↳ ${e2imgs} images, dups=${e2dups.length > 0 ? e2dups.join(', ') : 'none'}`);
  await checkGridLayout(page, 'search-jazz');
  await save(page, 'search-jazz-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Search — psychedelic rock (ARTISTS grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 3. Search: psychedelic rock (artists grid) ---');
  await goto(page, '/search?q=psychedelic+rock&mode=artist', 5000);
  const e3imgs = await waitForCardImages(page, 15000, 6);
  console.log(`  ↳ ${e3imgs} images`);
  await checkGridLayout(page, 'search-psychedelic-rock');
  await save(page, 'search-psychedelic-rock-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Search — autocomplete dropdown
  // Fix: type artist name fragment ("Nick", "Slow") not "post-" (no artist names
  // match "post-" in the DB). Capture ONLY when dropdown is actually visible.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 4. Search autocomplete ---');
  await goto(page, '/', 3000);
  const searchSel = 'input[type="search"], .search-input input, input[placeholder*="Search" i], input[placeholder*="Dig" i]';
  const searchInput = page.locator(searchSel).first();
  let autocompleteDone = false;
  if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
    const tryTerms = ['Nick', 'Slow', 'God', 'Grou', 'Boris'];
    for (const term of tryTerms) {
      if (autocompleteDone) break;
      await searchInput.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(200);
      await page.keyboard.type(term, { delay: 80 });
      let dropdownVisible = false;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(300);
        dropdownVisible = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="autocomplete-dropdown"], .autocomplete-list');
          if (!el) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return el.querySelectorAll('li, [data-testid="autocomplete-item"], .autocomplete-item').length > 0;
        });
        if (dropdownVisible) break;
      }
      if (dropdownVisible) {
        const itemCount = await page.evaluate(() =>
          document.querySelectorAll('[data-testid="autocomplete-item"], .autocomplete-item').length
        );
        console.log(`  ↳ Dropdown visible for "${term}" — ${itemCount} suggestions`);
        await save(page, 'search-autocomplete.png');
        autocompleteDone = true;
      } else {
        console.log(`  ↳ No dropdown for "${term}" — trying next`);
        await searchInput.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);
      }
    }
    if (!autocompleteDone) {
      bug('search-autocomplete', 'Autocomplete dropdown not visible for any artist prefix — possible bug');
      await save(page, 'search-autocomplete.png');
    }
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
    await page.evaluate(() => window.scrollTo(0, 0));
    await tryClick(page, '[data-testid="tab-discography"], button:has-text("Discography")');
    await page.waitForTimeout(1000);
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid, .discography-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 80) : 200;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-slowdive');
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
    await page.evaluate(() => window.scrollTo(0, 0));
    await tryClick(page, '[data-testid="tab-discography"], button:has-text("Discography")');
    await page.waitForTimeout(1000);
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid, .discography-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 80) : 200;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-the-cure');
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
    await page.evaluate(() => window.scrollTo(0, 0));
    await tryClick(page, '[data-testid="tab-discography"], button:has-text("Discography")');
    await page.waitForTimeout(1000);
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid, .discography-grid');
      return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 80) : 200;
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(600);
    await checkArtistPage(page, 'artist-nick-cave');
  } else {
    bug('artist-nick-cave', 'No search results for Nick Cave');
  }
  await save(page, 'artist-nick-cave-discography.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Artist page — Overview tab
  // No Burial (data error — shows German band not William Bevan).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 8. Artist overview tab ---');
  const overviewCandidates = ['Slowdive', 'Godspeed You! Black Emperor', 'Grouper', 'The Cure', 'Nick Cave and the Bad Seeds'];
  let overviewDone = false;
  for (const artist of overviewCandidates) {
    if (overviewDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await page.evaluate(() => window.scrollTo(0, 0));
    const clicked = await tryClick(page, '[data-testid="tab-overview"]') ||
                    await tryClick(page, '[data-testid="tab-btn-overview"]') ||
                    await tryClick(page, 'button:has-text("Overview")');
    if (!clicked) { console.log(`  ✗ No Overview tab for ${artist}`); continue; }
    await page.waitForTimeout(2500);
    const hasContent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tab-content-overview"], .overview-tab, .artist-relationships');
      return !!el && (el.textContent?.trim().length ?? 0) > 50;
    });
    const tagCount = await page.evaluate(() => document.querySelectorAll('.tag-chip, .genre-tag').length);
    if (!hasContent) { console.log(`  ↳ ${artist}: overview content thin — skipping`); continue; }
    if (tagCount === 0) bug('artist-overview', `No tags in overview for "${artist}"`);
    console.log(`  ↳ ${artist}: content=${hasContent}, tags=${tagCount}`);
    await save(page, 'artist-overview-tab.png');
    overviewDone = true;
  }
  if (!overviewDone) {
    bug('artist-overview', 'No Overview tab found with content on any candidate artist');
    await save(page, 'artist-overview-tab.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Release page — tracklist + play/queue buttons
  // No Burial in candidates.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 9. Release page ---');
  const releaseArtists = ['Slowdive', 'The Cure', 'Grouper', 'Nick Cave and the Bad Seeds'];
  let releaseDone = false;
  for (const artist of releaseArtists) {
    if (releaseDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await page.waitForTimeout(2000);
    const firstRelease = page.locator('a[href*="/release/"]').first();
    const rHref = await firstRelease.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (!rHref) { console.log(`  ✗ No release links for ${artist}`); continue; }
    await goto(page, rHref, 6000);
    const info = await page.evaluate(() => ({
      hasPlayBtn: !!document.querySelector('[data-testid="play-album-btn"], .btn-play-album'),
      hasQueueBtn: !!document.querySelector('[data-testid="queue-album-btn"], .btn-queue-album'),
      trackCount: document.querySelectorAll('.track, [data-testid="track-row"]').length,
      hasBuyLinks: document.querySelectorAll('a[href*="bandcamp"], a[href*="spotify"], a[href*="amazon"]').length,
    }));
    if (info.trackCount === 0) { console.log(`  ✗ No tracks for ${artist} — trying next`); continue; }
    if (!info.hasPlayBtn && !info.hasQueueBtn) bug('release-page', `No play/queue album buttons for "${artist}"`);
    console.log(`  ↳ ${artist}: play=${info.hasPlayBtn}, queue=${info.hasQueueBtn}, tracks=${info.trackCount}, buyLinks=${info.hasBuyLinks}`);
    await page.evaluate(() => window.scrollTo(0, 150));
    await page.waitForTimeout(500);
    await save(page, 'release-page-player.png');
    releaseDone = true;
  }
  if (!releaseDone) {
    bug('release-page', 'Could not navigate to any release page with tracks');
    await save(page, 'release-page-player.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Player bar — persistent bar with source badge visible
  // Navigate to artist, click embed pill to start playback, capture full window.
  // No Burial in candidates.
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
    const embedPill = page.locator('.platform-pill:not(.platform-pill--ext)').first();
    if (await embedPill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await embedPill.click();
      await page.waitForTimeout(3000);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const hasPlayerBar = await page.evaluate(() =>
      !!document.querySelector('.player-bar, [class*="player-bar"], .persistent-player')
    );
    if (!hasPlayerBar) bug('player-bar', 'Player bar element not found in DOM');
    else console.log('  ↳ Player bar visible');
    await save(page, 'player-bar-source.png');
    playerDone = true;
  }
  if (!playerDone) {
    bug('player-bar', 'No platform pills found on any candidate artist');
    await save(page, 'player-bar-source.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Queue panel — 4–5 DISTINCT tracks from different releases
  // Fix: v1.6 had "Futurism — Acemo" duplicated twice.
  // Now adds 1-2 tracks each from Slowdive, The Cure, and Grouper.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 11. Queue panel ---');
  // Clear existing queue
  await page.evaluate(() => {
    try { localStorage.removeItem('blacktape_queue'); } catch {}
  });
  await page.waitForTimeout(300);

  const queueArtists = ['Slowdive', 'The Cure', 'Grouper'];
  let totalQueued = 0;

  for (const artist of queueArtists) {
    if (totalQueued >= 5) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    await page.waitForTimeout(1500);
    const rHref = await page.locator('a[href*="/release/"]').first().getAttribute('href', { timeout: 4000 }).catch(() => null);
    if (!rHref) continue;
    await goto(page, rHref, 4000);
    const queueBtns = page.locator('[data-testid="queue-btn"], .queue-btn');
    const btnCount = await queueBtns.count().catch(() => 0);
    const toAdd = Math.min(btnCount, 2);
    for (let i = 0; i < toAdd; i++) {
      try {
        await queueBtns.nth(i).hover();
        await queueBtns.nth(i).click();
        await page.waitForTimeout(300);
        totalQueued++;
      } catch {}
    }
    console.log(`  ↳ ${artist}: added ${toAdd} tracks (total ${totalQueued})`);
  }

  const qOpened = await tryClick(page, '[data-testid="queue-toggle"]') ||
                  await tryClick(page, '.queue-toggle');
  if (!qOpened) bug('queue-panel', 'Queue toggle button not found');
  await page.waitForTimeout(1500);

  const qItems = await page.evaluate(() =>
    document.querySelectorAll('.queue-item, [class*="queue-track"]').length
  );
  if (qItems === 0 && totalQueued === 0) bug('queue-panel', 'No tracks could be added (no queue-btn found on any release)');
  else if (qItems === 0) bug('queue-panel', `${totalQueued} tracks queued but queue panel shows 0 items`);
  else console.log(`  ↳ Queue shows ${qItems} items`);

  await save(page, 'queue-panel.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Library — two-pane layout
  // Cannot automate native file picker via CDP — flag empty state as known limitation.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 12. Library ---');
  await goto(page, '/library', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const libInfo = await page.evaluate(() => ({
    hasAlbumPane: !!document.querySelector('[data-testid="album-list-pane"]'),
    hasTrackPane: !!document.querySelector('[data-testid="track-pane"]'),
    itemCount: document.querySelectorAll('.album-item, .library-artist, [class*="album-row"]').length,
  }));
  if (libInfo.itemCount === 0) {
    bug('library-two-pane', 'Library empty — requires local music folder (cannot automate native file picker)');
    console.log('  ↳ Library empty — capturing empty state');
  } else {
    console.log(`  ↳ ${libInfo.itemCount} items, albumPane=${libInfo.hasAlbumPane}, trackPane=${libInfo.hasTrackPane}`);
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
    await page.waitForTimeout(2500);
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    console.log(`  ↳ ${cnt} results`);
    if (cnt === 0) bug('discover-ambient-iceland', 'No results for ambient + Iceland');
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
    await page.waitForTimeout(2500);
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
    await page.waitForTimeout(2500);
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
  // 16. Time Machine — 1983 with post-punk filter
  // Fix: v1.6 showed truck-driving country, cante alentejano. Apply tag filter.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 16. Time Machine: 1983 ---');
  await goto(page, '/time-machine?year=1983', 6000);
  const tmFilter16 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tmFilter16.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tmFilter16.fill('post-punk');
    await page.waitForTimeout(2000);
    const cnt16a = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt16a === 0) {
      await tmFilter16.fill('synth-pop');
      await page.waitForTimeout(2000);
      const cnt16b = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      if (cnt16b === 0) {
        await tmFilter16.clear();
        await page.waitForTimeout(1500);
        console.log('  ↳ All filters empty — cleared filter');
      } else console.log(`  ↳ synth-pop: ${cnt16b} artists`);
    } else console.log(`  ↳ post-punk: ${cnt16a} artists`);
  } else {
    console.log('  ↳ Tag filter not found — capturing unfiltered');
  }
  const tm83imgs = await waitForCardImages(page, 12000, 3);
  const tm83cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (tm83cards === 0) bug('time-machine-1983', 'No artist cards for 1983');
  else console.log(`  ↳ ${tm83cards} artists, ${tm83imgs} images`);
  await save(page, 'time-machine-1983.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Time Machine — 1977 with punk filter
  // Fix: v1.6 showed Australian thrash, Estonian folk. Apply tag filter.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 17. Time Machine: 1977 ---');
  await goto(page, '/time-machine?year=1977', 6000);
  const tmFilter17 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tmFilter17.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tmFilter17.fill('punk');
    await page.waitForTimeout(2000);
    const cnt17a = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt17a === 0) {
      await tmFilter17.fill('disco');
      await page.waitForTimeout(2000);
      const cnt17b = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      if (cnt17b === 0) {
        await tmFilter17.fill('krautrock');
        await page.waitForTimeout(2000);
        const cnt17c = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
        if (cnt17c === 0) {
          await tmFilter17.clear();
          await page.waitForTimeout(1500);
          console.log('  ↳ All filters empty — cleared filter');
        } else console.log(`  ↳ krautrock: ${cnt17c} artists`);
      } else console.log(`  ↳ disco: ${cnt17b} artists`);
    } else console.log(`  ↳ punk: ${cnt17a} artists`);
  } else {
    console.log('  ↳ Tag filter not found — capturing unfiltered');
  }
  const tm77imgs = await waitForCardImages(page, 10000, 3);
  const tm77cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (tm77cards === 0) bug('time-machine-1977', 'No artists for 1977 with any filter');
  else console.log(`  ↳ ${tm77cards} artists, ${tm77imgs} images`);
  await save(page, 'time-machine-1977.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Style Map — zoomed out overview
  // Check for edge-clipping on labels (v1.6 had "tal", "instrumen" clipped).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 18. Style Map (overview) ---');
  await goto(page, '/style-map', 8000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const smInfo = await page.evaluate(() => {
    const svgEl = document.querySelector('svg');
    const textEls = svgEl ? Array.from(svgEl.querySelectorAll('text')) : [];
    const vw = window.innerWidth;
    let clipped = 0;
    for (const t of textEls) {
      const r = t.getBoundingClientRect();
      if (r.left < 4 || r.right > vw - 4) clipped++;
    }
    return { textCount: textEls.length, clipped, hasSvg: !!svgEl };
  });
  if (!smInfo.hasSvg) bug('style-map-overview', 'No SVG element found — map may not have rendered');
  if (smInfo.clipped > 0) bug('style-map-overview', `${smInfo.clipped} text labels clipped at canvas edges`);
  console.log(`  ↳ ${smInfo.textCount} text nodes, ${smInfo.clipped} clipped`);
  await save(page, 'style-map-overview.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Style Map — actually zoomed in via mouse wheel
  // Fix: v1.6 screenshot was pixel-identical to overview (zoom never applied).
  // Use page.mouse.wheel to scroll-zoom into center of map canvas.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 19. Style Map (zoomed in) ---');
  await goto(page, '/style-map', 8000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // Move mouse to center of SVG canvas before wheeling
  const mapCenter = await page.evaluate(() => {
    const svg = document.querySelector('svg, .style-map-container, [class*="style-map"]');
    if (!svg) return { x: 600, y: 380 };
    const r = svg.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.move(mapCenter.x, mapCenter.y);
  console.log(`  ↳ Zooming at (${mapCenter.x}, ${mapCenter.y})`);
  // Scroll-zoom in (negative deltaY = zoom in for D3 zoom)
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1500);
  // Verify the view changed from overview
  const zoomedState = await page.evaluate(() => {
    const svgEl = document.querySelector('svg');
    const g = svgEl?.querySelector('g[transform]');
    const transform = g?.getAttribute('transform') ?? '';
    return { transform, textCount: svgEl?.querySelectorAll('text').length ?? 0 };
  });
  console.log(`  ↳ transform: ${zoomedState.transform.slice(0, 60)}, texts: ${zoomedState.textCount}`);
  if (!zoomedState.transform || zoomedState.transform === 'translate(0,0) scale(1)') {
    bug('style-map-zoomed', 'Transform unchanged after wheel scroll — zoom may not be wired to mouse wheel');
  }
  await save(page, 'style-map-zoomed.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Knowledge Base — post-punk (skip shoegaze — confirmed empty description)
  // Filename kept as knowledge-base-shoegaze.png to match existing slideshow refs.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 20. Knowledge Base: post-punk ---');
  const kbCandidates = ['post-punk', 'krautrock', 'ambient', 'punk', 'shoegaze'];
  let kbDone = false;
  for (const genre of kbCandidates) {
    if (kbDone) break;
    await goto(page, `/kb/genre/${genre}`, 5000);
    // Dismiss any open map popups
    await tryClick(page, '.popup-close, .map-popup .close, [aria-label="Close"]', 1000);
    await page.waitForTimeout(500);
    const kbChecks = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const notFound = !h1 || /not found|404/i.test(document.body.innerText.slice(0, 200));
      const descEl = document.querySelector('.genre-description, .kb-description, [class*="description"], .prose, article p');
      const descText = descEl?.textContent?.trim() ?? '';
      const hasDesc = descText.length > 100 && !/no description|coming soon|no content/i.test(descText);
      const hasMarkdown = descText.includes('## ') || descText.startsWith('# ');
      const keyArtists = document.querySelectorAll('.key-artist-row, [class*="key-artist"] a, .artist-list a').length;
      return { h1, notFound, hasDesc, hasMarkdown, keyArtists, descLength: descText.length };
    });
    if (kbChecks.notFound) { console.log(`  ↳ ${genre}: not found`); continue; }
    if (!kbChecks.hasDesc) {
      console.log(`  ↳ ${genre}: description short/missing (${kbChecks.descLength} chars) — trying next`);
      if (genre === 'shoegaze') bug('knowledge-base', 'Shoegaze still has no description');
      continue;
    }
    if (kbChecks.hasMarkdown) bug(`knowledge-base-${genre}`, 'Raw markdown visible in content');
    if (kbChecks.keyArtists === 0) bug(`knowledge-base-${genre}`, 'No key artists listed');
    console.log(`  ↳ ${genre}: "${kbChecks.h1}", desc=${kbChecks.descLength}ch, keyArtists=${kbChecks.keyArtists}`);
    await save(page, 'knowledge-base-shoegaze.png');
    kbDone = true;
  }
  if (!kbDone) {
    bug('knowledge-base', 'No KB genre entries have descriptions');
    await save(page, 'knowledge-base-shoegaze.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. Artist Claim Form
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
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  try { await browser.close(); } catch {}
  proc.kill();
  if (devProc) devProc.kill();

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('SCREENSHOTS COMPLETE — v1.7');
  console.log(`Output: ${OUT}`);
  console.log('\nFiles saved:');
  try {
    fs.readdirSync(OUT).sort().forEach(f => console.log(`  ${f}`));
  } catch {}

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
