/**
 * BlackTape v1.7 Screenshot + QA Pass
 *
 * Uses Tauri binary + CDP (page.goto, not window.location.href). All v1.6 issues addressed:
 *   - Search: mode=tag (searchByTag) for genre grid, NOT mode=artist (name FTS)
 *   - Scroll past local library results to show discovery grid before capture
 *   - Autocomplete: locator.fill() instead of keyboard.type() — reliable Svelte event dispatch
 *   - No Burial in any candidate list (data error — wrong artist)
 *   - Queue adds tracks from 3 different releases
 *   - Time Machine applies tag filter before capturing
 *   - Style Map zoom uses mouse wheel to actually zoom
 *   - KB uses post-punk (has a description), not shoegaze (empty)
 *   - Output: static/press-screenshots/v5/
 *
 * Run: node tools/take-screenshots-v1.7.mjs
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'press-screenshots', 'v5');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9224;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
// Debug binary loads from dev server. Release binary uses tauri.localhost.
// The connected URL tells us: page.url() starts with http://localhost:5173 in debug mode.
const APP_BASE = 'http://localhost:5173';
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
// Skip-already-done helper
// ---------------------------------------------------------------------------
function alreadyDone(filename) {
  return fs.existsSync(path.join(OUT, filename));
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

async function goto(_page, route, waitMs = 2000) {
  const t0 = Date.now();
  const url = `${APP_BASE}${route}`;
  console.log(`  → ${route}`);
  // Use 'commit' (navigation committed) not 'domcontentloaded' — for SPA routes the
  // document doesn't change so domcontentloaded can be unreliable after many navigations.
  // 'commit' resolves as soon as navigation is confirmed by the browser.
  try {
    await getPage().goto(url, { waitUntil: 'commit', timeout: 12000 });
    console.log(`  ↳ goto committed in ${Date.now() - t0}ms`);
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.error(`  ✗ goto FAILED after ${elapsed}ms: ${err.message.split('\n')[0]}`);
    console.error(`    Reconnecting CDP and retrying...`);
    await reconnectCDP();
    // getPage() now returns the fresh page from the reconnected session
    await getPage().goto(url, { waitUntil: 'commit', timeout: 15000 });
    console.log(`  ↳ goto committed after reconnect in ${Date.now() - t0}ms`);
  }
  // Pure JS timer — avoids CDP hanging post-navigation
  await new Promise(r => setTimeout(r, waitMs));
}

async function save(page, filename) {
  const outPath = path.join(OUT, filename);
  if (fs.existsSync(outPath)) {
    console.log(`  ⊘ SKIP (exists): ${filename}`);
    return;
  }
  await page.screenshot({ path: outPath, fullPage: false, timeout: 15000 });
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
    await new Promise(r => setTimeout(r, 600));
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
    console.log(`  ↳ 0 card image(s) loaded`);
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
    await new Promise(r => setTimeout(r, 800));
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
    return 0;
  }
}

async function navigateToArtist(page, artistName) {
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 6000);
  console.log(`  ↳ looking for artist card...`);
  // Use evaluate() instead of locator.getAttribute() — locators can hang on CDP when
  // the page JS context is unstable after many navigations.
  const href = await Promise.race([
    getPage().evaluate(() => document.querySelector('a.artist-card')?.getAttribute('href') ?? null),
    new Promise((_, rej) => setTimeout(() => rej(new Error('artist card lookup timeout')), 8000)),
  ]).catch(err => { console.error(`  ✗ artist card lookup failed: ${err.message}`); return null; });
  if (!href) { console.log(`  ✗ No results for "${artistName}"`); return null; }
  console.log(`  ↳ found href: ${href}`);
  await goto(page, href, 8000);
  return href;
}

// Scroll the discovery grid into view (past local library section).
// The search page shows local library tracks above the discovery grid.
// For screenshots, we want to show the discovery grid.
async function scrollToDiscovery(page) {
  const scrolled = await page.evaluate(() => {
    const disc = document.querySelector('.discovery-section, .results-grid');
    if (!disc) return 0;
    const top = disc.getBoundingClientRect().top + window.scrollY;
    const scrollTo = Math.max(0, top - 20);
    window.scrollTo(0, scrollTo);
    return scrollTo;
  });
  if (scrolled > 0) {
    console.log(`  ↳ Scrolled to discovery section (y=${scrolled})`);
    await new Promise(r => setTimeout(r, 400));
  }
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
// Startup helpers
// ---------------------------------------------------------------------------
let proc = null;
let browser = null;
let page = null;
// Accessor so goto() can get the fresh page after a reconnect (avoids parameter shadowing)
const getPage = () => page;

async function launchTauri() {
  // Kill any existing mercury.exe
  try {
    execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
    console.log('Killed existing mercury.exe');
    await new Promise(r => setTimeout(r, 1500));
  } catch {}

  console.log(`Launching Tauri app (CDP port ${CDP_PORT})...`);
  proc = spawn(BINARY, [], {
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

  browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  page = contexts[0]?.pages()?.[0];
  if (!page) throw new Error('No page found via CDP');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  page.setDefaultTimeout(15000);
  console.log('Connected. App URL:', page.url());
}

async function reconnectCDP() {
  console.log('  ⚡ Reconnecting CDP...');
  try { await browser.close(); } catch {}
  if (proc) { proc.kill(); await new Promise(r => setTimeout(r, 2500)); }
  await launchTauri();
  console.log('  ✓ CDP reconnected');
}

async function ensureAlive() {
  try {
    const result = await Promise.race([
      page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      })),
      new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timeout')), 12000)),
    ]);
    // If we're on a 500/error page, navigate home to clear the broken state
    // so the next goto() doesn't hang due to WebView2 being in a bad state.
    if (result.h1 === '500') {
      console.log('  ⚡ Error page (500) detected — navigating home to reset state...');
      await page.goto(`${APP_BASE}/`, { waitUntil: 'commit', timeout: 8000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch {
    console.log('  ⚡ CDP unresponsive — reconnecting...');
    await reconnectCDP();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let _runStart = Date.now();
function ts() {
  const s = Math.floor((Date.now() - _runStart) / 1000);
  return `[${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}]`;
}

async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    console.error('Build with: cd src-tauri && cargo build');
    process.exit(1);
  }

  // --- Step 1: Ensure dev server is running on 5173 ---
  // Tauri .exe compiled build serves from frontendDist — dev server not required.
  // But if one is running, leave it alone.

  // --- Step 2: Launch Tauri with CDP ---
  await launchTauri();
  console.log(`Output dir: ${OUT}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Search — electronic (TAGS mode → searchByTag → artist discovery grid)
  // Key fix: mode=tag calls searchByTag('electronic'), NOT FTS artist name search.
  // Scroll past local library section to show the discovery grid.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`${ts()} --- 1. Search: electronic (tag discovery grid) ---`);
  if (alreadyDone('search-electronic-grid.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/search?q=electronic&mode=tag', 5000);
  await waitForCardImages(page, 15000, 6);
  const e1info = await page.evaluate(() => ({
    cards: document.querySelectorAll('.artist-card').length,
    hasLocalSection: !!document.querySelector('.local-section'),
    hasDiscovery: !!document.querySelector('.discovery-section'),
  }));
  console.log(`  ↳ ${e1info.cards} cards, hasLocal=${e1info.hasLocalSection}`);
  if (e1info.cards === 0) bug('search-electronic', 'No artist cards (searchByTag returned empty)');
  await scrollToDiscovery(page);
  await checkGridLayout(page, 'search-electronic');
  await save(page, 'search-electronic-grid.png');
  } // end screen 1

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search — jazz (TAGS mode)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 2. Search: jazz (tag discovery grid) ---');
  if (alreadyDone('search-jazz-grid.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/search?q=jazz&mode=tag', 5000);
  await waitForCardImages(page, 15000, 6);
  // Check for duplicate library tracks (v1.6 bug)
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
  const e2cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (e2dups.length > 0) bug('search-jazz', `Duplicate tracks: ${e2dups.join(', ')}`);
  if (e2cards === 0) bug('search-jazz', 'No artist cards for jazz tag search');
  console.log(`  ↳ ${e2cards} cards, dups=${e2dups.length > 0 ? e2dups.join(', ') : 'none'}`);
  await scrollToDiscovery(page);
  await checkGridLayout(page, 'search-jazz');
  await save(page, 'search-jazz-grid.png');
  } // end screen 2

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Search — psychedelic rock (TAGS mode)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 3. Search: psychedelic rock (tag discovery grid) ---');
  if (alreadyDone('search-psychedelic-rock-grid.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/search?q=psychedelic+rock&mode=tag', 5000);
  await waitForCardImages(page, 15000, 6);
  const e3cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (e3cards === 0) bug('search-psychedelic-rock', 'No artist cards for psychedelic rock');
  console.log(`  ↳ ${e3cards} cards`);
  await scrollToDiscovery(page);
  await checkGridLayout(page, 'search-psychedelic-rock');
  await save(page, 'search-psychedelic-rock-grid.png');
  } // end screen 3

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Search — autocomplete dropdown
  // Key fix: use locator.fill() not keyboard.type() — fill() reliably triggers
  // Svelte's oninput handler. keyboard.type() was causing CDP instability.
  // Try artist name prefixes that exist in the DB.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 4. Search autocomplete ---');
  if (alreadyDone('search-autocomplete.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/', 3000);
  const searchSel = [
    '.search-input input',
    'input[placeholder*="Search" i]',
    'input[placeholder*="Dig" i]',
    'input[placeholder*="search" i]',
    'input[type="search"]',
  ].join(', ');
  const searchInput = page.locator(searchSel).first();
  let autocompleteDone = false;
  const inputVisible = await searchInput.isVisible({ timeout: 4000 }).catch(() => false);
  if (inputVisible) {
    const tryTerms = ['Slow', 'Nick', 'God', 'Boris', 'Grou'];
    for (const term of tryTerms) {
      if (autocompleteDone) break;
      // locator.fill() focuses the element, clears it, and types the text,
      // dispatching native input events that Svelte oninput handlers respond to.
      await searchInput.fill(term);
      // Poll for dropdown — async DB query may take 300-800ms
      let dropdownVisible = false;
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 250));
        dropdownVisible = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="autocomplete-dropdown"], .autocomplete-list');
          if (!el) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return el.querySelectorAll('li, [data-testid="autocomplete-item"], .autocomplete-item').length > 0;
        }).catch(() => false);
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
        console.log(`  ↳ No dropdown for "${term}"`);
        // Clear input before next attempt
        await searchInput.fill('');
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!autocompleteDone) {
      bug('search-autocomplete', 'Autocomplete dropdown not visible for any artist prefix');
      await save(page, 'search-autocomplete.png');
    }
  } else {
    bug('search-autocomplete', 'Search input not found on home page');
    await save(page, 'search-autocomplete.png');
  }
  // Clear any text left in search input to prevent affecting subsequent navigation
  try { await searchInput.fill(''); } catch {}
  await new Promise(r => setTimeout(r, 500));
  } // end screen 4

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Artist page — Slowdive
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 5. Artist: Slowdive ---');
  if (alreadyDone('artist-slowdive-discography.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/artist/slowdive', 8000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForDiscographyCovers(page, 15000, 4);
  await new Promise(r => setTimeout(r, 600));
  await checkArtistPage(page, 'artist-slowdive');
  await save(page, 'artist-slowdive-discography.png');
  } // end screen 5

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Artist page — The Cure
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 6. Artist: The Cure ---');
  if (alreadyDone('artist-the-cure-discography.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/artist/the-cure', 8000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForDiscographyCovers(page, 15000, 4);
  await new Promise(r => setTimeout(r, 600));
  await checkArtistPage(page, 'artist-the-cure');
  await save(page, 'artist-the-cure-discography.png');
  } // end screen 6

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Artist page — Nick Cave
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 7. Artist: Nick Cave ---');
  if (alreadyDone('artist-nick-cave-discography.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/artist/nick-cave-the-bad-seeds', 8000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForDiscographyCovers(page, 15000, 4);
  await new Promise(r => setTimeout(r, 600));
  await checkArtistPage(page, 'artist-nick-cave');
  await save(page, 'artist-nick-cave-discography.png');
  } // end screen 7

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Artist page — Overview tab
  // No Burial (data error — wrong artist in DB).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 8. Artist overview tab ---');
  if (alreadyDone('artist-overview-tab.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  const overviewCandidates = [
    { name: 'Slowdive', slug: '/artist/slowdive' },
    { name: 'Godspeed You! Black Emperor', slug: '/artist/godspeed-you-black-emperor' },
    { name: 'Grouper', slug: '/artist/grouper' },
    { name: 'Nick Cave', slug: '/artist/nick-cave-the-bad-seeds' },
  ];
  let overviewDone = false;
  for (const artist of overviewCandidates) {
    if (overviewDone) break;
    await goto(page, artist.slug, 8000);
    await page.evaluate(() => window.scrollTo(0, 0));
    const clicked = await tryClick(page, '[data-testid="tab-overview"]') ||
                    await tryClick(page, '[data-testid="tab-btn-overview"]') ||
                    await tryClick(page, 'button:has-text("Overview")');
    if (!clicked) { console.log(`  ✗ No Overview tab for ${artist.name}`); continue; }
    await new Promise(r => setTimeout(r, 2500));
    const hasContent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tab-content-overview"], .overview-tab, .artist-relationships');
      return !!el && (el.textContent?.trim().length ?? 0) > 50;
    });
    const tagCount = await page.evaluate(() => document.querySelectorAll('.tag-chip, .genre-tag').length);
    if (!hasContent) { console.log(`  ↳ ${artist.name}: overview content thin — skipping`); continue; }
    if (tagCount === 0) bug('artist-overview', `No tags in overview for "${artist.name}"`);
    console.log(`  ↳ ${artist.name}: content=${hasContent}, tags=${tagCount}`);
    await save(page, 'artist-overview-tab.png');
    overviewDone = true;
  }
  if (!overviewDone) {
    bug('artist-overview', 'No Overview tab with content on any candidate artist');
    await save(page, 'artist-overview-tab.png');
  }
  } // end screen 8

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Release page — tracklist + play/queue buttons
  // No Burial in candidates.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 9. Release page ---');
  if (alreadyDone('release-page-player.png')) { console.log('  ⊘ skip'); } else {
  await reconnectCDP(); // Fresh start after screen 8's instability (multiple reconnects/500s)
  // Navigate directly by slug — avoid navigateToArtist() search-navigate pattern that corrupts CDP
  const releaseArtistSlugs = [
    { name: 'Slowdive', slug: '/artist/slowdive' },
    { name: 'Grouper', slug: '/artist/grouper' },
    { name: 'Nick Cave', slug: '/artist/nick-cave-the-bad-seeds' },
  ];
  // Safe evaluate with timeout — page.evaluate can hang on unstable CDP sessions
  const safeEval9 = (fn) => Promise.race([
    getPage().evaluate(fn),
    new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), 3000)),
  ]).catch(() => null);
  let releaseDone = false;
  for (const { name, slug } of releaseArtistSlugs) {
    if (releaseDone) break;
    await goto(page, slug, 3000);
    // Poll for release links — overview tab is default, releases loaded via MB API (can take 5-20s)
    // Note: there is NO Discography tab; discography section lives in the Overview tab.
    let rHref = null;
    for (let i = 0; i < 25; i++) {
      rHref = await safeEval9(() => document.querySelector('a[href*="/release/"]')?.getAttribute('href') ?? null);
      if (rHref) { console.log(`  ↳ ${name}: release link found (${Math.round(i * 0.8)}s)`); break; }
      await new Promise(r => setTimeout(r, 800));
    }
    if (!rHref) { console.log(`  ✗ No release links for ${name} (timeout 20s)`); continue; }
    console.log(`  ↳ navigating to release: ${rHref}`);
    await goto(page, rHref, 6000);
    const info = await page.evaluate(() => ({
      hasPlayBtn: !!document.querySelector('[data-testid="play-album-btn"], .btn-play-album'),
      hasQueueBtn: !!document.querySelector('[data-testid="queue-album-btn"], .btn-queue-album'),
      trackCount: document.querySelectorAll('.track, [data-testid="track-row"]').length,
      hasBuyLinks: document.querySelectorAll('a[href*="bandcamp"], a[href*="spotify"], a[href*="amazon"]').length,
    }));
    if (info.trackCount === 0) { console.log(`  ✗ No tracks for ${name} — trying next`); continue; }
    if (!info.hasPlayBtn && !info.hasQueueBtn) bug('release-page', `No play/queue album buttons for "${name}"`);
    console.log(`  ↳ ${name}: play=${info.hasPlayBtn}, queue=${info.hasQueueBtn}, tracks=${info.trackCount}, buyLinks=${info.hasBuyLinks}`);
    await page.evaluate(() => window.scrollTo(0, 150));
    await new Promise(r => setTimeout(r, 500));
    await save(page, 'release-page-player.png');
    releaseDone = true;
  }
  if (!releaseDone) {
    bug('release-page', 'Could not navigate to any release page with tracks');
    await ensureAlive(); // Page may be in bad state — reset before screenshot
    await save(page, 'release-page-player.png');
  }
  } // end screen 9

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Player bar — persistent bar with source badge
  // No Burial in candidates.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 10. Player bar ---');
  if (alreadyDone('player-bar-source.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  // Navigate directly by slug — avoid navigateToArtist() search-navigate pattern
  const playerArtistSlugs = [
    { name: 'Grouper', slug: '/artist/grouper' },
    { name: 'Slowdive', slug: '/artist/slowdive' },
    { name: 'Nick Cave', slug: '/artist/nick-cave-the-bad-seeds' },
  ];
  let playerDone = false;
  for (const { name, slug } of playerArtistSlugs) {
    if (playerDone) break;
    await goto(page, slug, 5000);
    // Wait for platform pills to load (may require external API)
    let pills = [];
    for (let i = 0; i < 12; i++) {
      pills = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.platform-pill')).map(p => p.textContent?.trim().slice(0, 20))
      ).catch(() => []);
      if (pills.length > 0) break;
      await new Promise(r => setTimeout(r, 800));
    }
    if (pills.length === 0) { console.log(`  ✗ No platform pills for ${name}`); continue; }
    console.log(`  ↳ ${pills.length} pills: ${pills.join(', ')}`);
    const embedPill = page.locator('.platform-pill:not(.platform-pill--ext)').first();
    if (await embedPill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await embedPill.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    const hasPlayerBar = await page.evaluate(() =>
      !!document.querySelector('.player-bar, [class*="player-bar"], .persistent-player')
    );
    if (!hasPlayerBar) bug('player-bar', 'Player bar element not found in DOM');
    await save(page, 'player-bar-source.png');
    playerDone = true;
  }
  if (!playerDone) {
    bug('player-bar', 'No platform pills found on any candidate artist');
    await save(page, 'player-bar-source.png');
  }
  } // end screen 10

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Queue panel — 4–5 DISTINCT tracks from different releases
  // Fix: v1.6 had same track repeated. Now adds tracks from 3 different artists.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 11. Queue panel ---');
  if (alreadyDone('queue-panel.png')) { console.log('  ⊘ skip'); } else {
  await reconnectCDP(); // Fresh start — page.evaluate() can hang after many navigations
  // Clear existing queue from localStorage
  await page.evaluate(() => {
    try { localStorage.removeItem('blacktape_queue'); } catch {}
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));

  // Navigate directly by slug — avoid navigateToArtist() search-navigate pattern
  const queueArtistSlugs = [
    { name: 'Slowdive', slug: '/artist/slowdive' },
    { name: 'Grouper', slug: '/artist/grouper' },
    { name: 'Nick Cave', slug: '/artist/nick-cave-the-bad-seeds' },
  ];
  let totalQueued = 0;

  // Helper: safe evaluate with 3s timeout (page.evaluate can hang on unstable CDP)
  const safeEval = (fn) => Promise.race([
    getPage().evaluate(fn),
    new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), 3000)),
  ]).catch(() => null);

  for (const { name, slug } of queueArtistSlugs) {
    if (totalQueued >= 5) break;
    await goto(page, slug, 3000);
    // Poll for release links — discography is in Overview tab (no separate tab to click).
    let rHref2 = null;
    for (let i = 0; i < 25; i++) {
      rHref2 = await safeEval(() => document.querySelector('a[href*="/release/"]')?.getAttribute('href') ?? null);
      if (rHref2) { console.log(`  ↳ ${name}: release link found (${Math.round(i * 0.8)}s)`); break; }
      await new Promise(r => setTimeout(r, 800));
    }
    if (!rHref2) { console.log(`  ✗ No release links for ${name} (timeout 20s)`); continue; }
    const rHref = rHref2;
    await goto(page, rHref, 4000);
    const queueBtns = page.locator('[data-testid="queue-btn"], .queue-btn');
    const btnCount = await queueBtns.count().catch(() => 0);
    const toAdd = Math.min(btnCount, 2);
    for (let i = 0; i < toAdd; i++) {
      try {
        await queueBtns.nth(i).hover();
        await queueBtns.nth(i).click();
        await new Promise(r => setTimeout(r, 300));
        totalQueued++;
      } catch {}
    }
    console.log(`  ↳ ${name}: added ${toAdd} tracks (total ${totalQueued})`);
  }

  const qOpened = await tryClick(page, '[data-testid="queue-toggle"]') ||
                  await tryClick(page, '.queue-toggle');
  if (!qOpened) bug('queue-panel', 'Queue toggle button not found');
  await new Promise(r => setTimeout(r, 1500));

  const qItems = await page.evaluate(() =>
    document.querySelectorAll('.queue-item, [class*="queue-track"]').length
  );
  if (qItems === 0 && totalQueued === 0) bug('queue-panel', 'No tracks queued (no queue-btn found on any release)');
  else if (qItems === 0) bug('queue-panel', `${totalQueued} tracks queued but queue panel shows 0 items`);
  else console.log(`  ↳ Queue shows ${qItems} items`);
  await save(page, 'queue-panel.png');
  } // end screen 11

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Library — two-pane layout
  // Requires local music folder — cannot automate native file picker via CDP.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 12. Library ---');
  if (alreadyDone('library-two-pane.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/library', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const libInfo = await page.evaluate(() => ({
    hasAlbumPane: !!document.querySelector('[data-testid="album-list-pane"]'),
    hasTrackPane: !!document.querySelector('[data-testid="track-pane"]'),
    itemCount: document.querySelectorAll('.album-item, .library-artist, [class*="album-row"]').length,
  }));
  if (libInfo.itemCount === 0) {
    bug('library-two-pane', 'Library empty — requires local music folder (cannot automate native file picker)');
  } else {
    console.log(`  ↳ ${libInfo.itemCount} items, albumPane=${libInfo.hasAlbumPane}, trackPane=${libInfo.hasTrackPane}`);
  }
  await save(page, 'library-two-pane.png');
  } // end screen 12

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Discover — ambient + Iceland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 13. Discover: ambient + Iceland ---');
  if (alreadyDone('discover-ambient-iceland.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/discover?tags=ambient', 4000);
  const cInput = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput.fill('Iceland');
    await new Promise(r => setTimeout(r, 2500));
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt === 0) bug('discover-ambient-iceland', 'No results for ambient + Iceland');
    else console.log(`  ↳ ${cnt} results`);
  } else {
    bug('discover-ambient-iceland', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-ambient-iceland');
  await save(page, 'discover-ambient-iceland.png');
  } // end screen 13

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Discover — noise rock + Japan
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 14. Discover: noise rock + Japan ---');
  if (alreadyDone('discover-noise-rock-japan.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/discover?tags=noise+rock', 4000);
  const cInput2 = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput2.fill('Japan');
    await new Promise(r => setTimeout(r, 2500));
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt === 0) bug('discover-noise-rock-japan', 'No results for noise rock + Japan');
    else console.log(`  ↳ ${cnt} results`);
  } else {
    bug('discover-noise-rock-japan', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-noise-rock-japan');
  await save(page, 'discover-noise-rock-japan.png');
  } // end screen 14

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. Discover — metal + Finland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 15. Discover: metal + Finland ---');
  if (alreadyDone('discover-metal-finland.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/discover?tags=metal', 4000);
  const cInput3 = page.locator('#country-input, input[placeholder*="Country" i]').first();
  if (await cInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cInput3.fill('Finland');
    await new Promise(r => setTimeout(r, 2500));
    const cnt = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt === 0) bug('discover-metal-finland', 'No results for metal + Finland');
    else console.log(`  ↳ ${cnt} results`);
  } else {
    bug('discover-metal-finland', 'Country input not found');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-metal-finland');
  await save(page, 'discover-metal-finland.png');
  } // end screen 15

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. Time Machine — 1983 with post-punk filter
  // Fix: v1.6 unfiltered showed truck-driving country. Apply .tag-input filter.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 16. Time Machine: 1983 ---');
  if (alreadyDone('time-machine-1983.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/time-machine?year=1983', 6000);
  const tmFilter16 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tmFilter16.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tmFilter16.fill('post-punk');
    await new Promise(r => setTimeout(r, 2000));
    const cnt16a = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt16a === 0) {
      await tmFilter16.fill('synth-pop');
      await new Promise(r => setTimeout(r, 2000));
      const cnt16b = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      if (cnt16b === 0) {
        await tmFilter16.fill('');
        await new Promise(r => setTimeout(r, 1500));
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
  } // end screen 16

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Time Machine — 1977 with punk filter
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 17. Time Machine: 1977 ---');
  if (alreadyDone('time-machine-1977.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/time-machine?year=1977', 6000);
  const tmFilter17 = page.locator('.tag-input, input[placeholder*="Filter by genre" i]').first();
  if (await tmFilter17.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tmFilter17.fill('punk');
    await new Promise(r => setTimeout(r, 2000));
    const cnt17a = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (cnt17a === 0) {
      await tmFilter17.fill('disco');
      await new Promise(r => setTimeout(r, 2000));
      const cnt17b = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      if (cnt17b === 0) {
        await tmFilter17.fill('krautrock');
        await new Promise(r => setTimeout(r, 2000));
        const cnt17c = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
        if (cnt17c === 0) { await tmFilter17.fill(''); await new Promise(r => setTimeout(r, 1500)); console.log('  ↳ All filters empty'); }
        else console.log(`  ↳ krautrock: ${cnt17c} artists`);
      } else console.log(`  ↳ disco: ${cnt17b} artists`);
    } else console.log(`  ↳ punk: ${cnt17a} artists`);
  } else {
    console.log('  ↳ Tag filter not found — capturing unfiltered');
  }
  const tm77imgs = await waitForCardImages(page, 10000, 3);
  const tm77cards = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (tm77cards === 0) bug('time-machine-1977', 'No artists for 1977');
  else console.log(`  ↳ ${tm77cards} artists, ${tm77imgs} images`);
  await save(page, 'time-machine-1977.png');
  } // end screen 17

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Style Map — zoomed out overview
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 18. Style Map (overview) ---');
  if (alreadyDone('style-map-overview.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/style-map', 8000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
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
  if (!smInfo.hasSvg) bug('style-map-overview', 'No SVG element found');
  if (smInfo.clipped > 0) bug('style-map-overview', `${smInfo.clipped} text labels clipped at canvas edges`);
  console.log(`  ↳ ${smInfo.textCount} text nodes, ${smInfo.clipped} clipped`);
  await save(page, 'style-map-overview.png');
  } // end screen 18

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Style Map — actually zoomed in via mouse wheel
  // Fix: v1.6 was pixel-identical to overview (zoom never applied).
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 19. Style Map (zoomed in) ---');
  if (alreadyDone('style-map-zoomed.png')) { console.log('  ⊘ skip'); } else {
  await ensureAlive();
  await goto(page, '/style-map', 8000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  const mapCenter = await page.evaluate(() => {
    const svg = document.querySelector('svg, .style-map-container, [class*="style-map"]');
    if (!svg) return { x: 600, y: 380 };
    const r = svg.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.move(mapCenter.x, mapCenter.y);
  console.log(`  ↳ Zooming at (${mapCenter.x}, ${mapCenter.y})`);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -150);
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 1500));
  const zoomedState = await page.evaluate(() => {
    const svgEl = document.querySelector('svg');
    const g = svgEl?.querySelector('g[transform]');
    return {
      transform: g?.getAttribute('transform') ?? '',
      textCount: svgEl?.querySelectorAll('text').length ?? 0,
    };
  });
  console.log(`  ↳ transform: ${zoomedState.transform.slice(0, 60)}, texts: ${zoomedState.textCount}`);
  if (!zoomedState.transform || zoomedState.transform === 'translate(0,0) scale(1)') {
    bug('style-map-zoomed', 'Transform unchanged — zoom may not be wired to mouse wheel');
  }
  await save(page, 'style-map-zoomed.png');
  } // end screen 19

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Knowledge Base — post-punk (skip shoegaze — empty description)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 20. Knowledge Base: post-punk ---');
  await reconnectCDP(); // fresh start — page.evaluate() can hang after many navigations
  const kbCandidates = ['post-punk', 'krautrock', 'ambient', 'punk', 'shoegaze'];
  let kbDone = false;
  for (const genre of kbCandidates) {
    if (kbDone) break;
    await goto(getPage(), `/kb/genre/${genre}`, 5000);
    await tryClick(getPage(), '.popup-close, .map-popup .close, [aria-label="Close"]', 1000);
    await new Promise(r => setTimeout(r, 500));
    const kbChecks = await getPage().evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const notFound = !h1 || /not found|404/i.test(document.body.innerText.slice(0, 200));
      const descEl = document.querySelector('.genre-description, .kb-description, [class*="description"], .prose, article p');
      const descText = descEl?.textContent?.trim() ?? '';
      const hasDesc = descText.length > 100 && !/no description|coming soon|no content/i.test(descText);
      const hasMarkdown = descText.startsWith('# ') || descText.includes('\n## ');
      const keyArtists = document.querySelectorAll('.key-artist-row, [class*="key-artist"] a, .artist-list a').length;
      return { h1, notFound, hasDesc, hasMarkdown, keyArtists, descLength: descText.length };
    });
    if (kbChecks.notFound) { console.log(`  ↳ ${genre}: not found`); continue; }
    if (!kbChecks.hasDesc) {
      console.log(`  ↳ ${genre}: description too short (${kbChecks.descLength} chars) — trying next`);
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
  await ensureAlive();
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
  if (proc) proc.kill();

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('SCREENSHOTS COMPLETE — v1.7');
  console.log(`Output: ${OUT}`);
  console.log('\nFiles saved:');
  try { fs.readdirSync(OUT).sort().forEach(f => console.log(`  ${f}`)); } catch {}

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
