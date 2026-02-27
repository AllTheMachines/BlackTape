/**
 * BlackTape v1.6 Screenshot + QA Pass
 *
 * Captures all 21 screens at 1200x800 into static/screenshots/.
 * Also notes visual bugs to stderr as it goes.
 *
 * Run: node tools/take-screenshots-v1.6.mjs
 *
 * Requirements:
 *   - Tauri debug binary at src-tauri/target/debug/mercury.exe
 *   - Real mercury.db in %APPDATA%/com.blacktape.app/mercury.db
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'static', 'screenshots');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9224;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
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
// CDP helpers
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

// ---------------------------------------------------------------------------
// Navigation / screenshot helpers
// ---------------------------------------------------------------------------
async function goto(page, route, waitMs = 4000) {
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
    const count = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.a-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    if (count >= minImages) return count;
    await page.waitForTimeout(700);
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
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 6000);
  const firstCard = page.locator('a.artist-card').first();
  const href = await firstCard.getAttribute('href', { timeout: 5000 }).catch(() => null);
  if (!href) { console.log(`  ✗ No results for "${artistName}"`); return null; }
  await goto(page, href, 8000);
  return href;
}

// ---------------------------------------------------------------------------
// QA helpers — examine page state and flag bugs
// ---------------------------------------------------------------------------
async function checkGridLayout(page, screenName) {
  // Check for broken grid (cards with 0 height)
  const broken = await page.evaluate(() => {
    const cards = document.querySelectorAll('.artist-card');
    let brokenCount = 0;
    for (const c of cards) {
      if (c.getBoundingClientRect().height < 10) brokenCount++;
    }
    return { total: cards.length, broken: brokenCount };
  });
  if (broken.broken > 0) bug(screenName, `${broken.broken}/${broken.total} cards have 0 height`);
  if (broken.total === 0) bug(screenName, 'No artist cards found — empty grid');

  // Check for truncated artist names with ellipsis at start of name (likely too short container)
  const truncated = await page.evaluate(() => {
    const names = document.querySelectorAll('.artist-name, .a-name');
    for (const n of names) {
      if (n.scrollWidth > n.clientWidth + 2) return n.textContent?.trim() ?? '';
    }
    return null;
  });
  if (truncated) bug(screenName, `Artist name overflowing: "${truncated}"`);

  // Check for images that failed to load (broken img elements)
  const brokenImgs = await page.evaluate(() => {
    let count = 0;
    for (const img of document.querySelectorAll('.a-art img, .cover-art img')) {
      if (img.complete && img.naturalHeight === 0 && img.src && !img.src.endsWith('placeholder')) count++;
    }
    return count;
  });
  if (brokenImgs > 0) bug(screenName, `${brokenImgs} broken/failed images`);
}

async function checkArtistPage(page, screenName, artistName) {
  // Check artist name not truncated
  const nameEl = await page.evaluate(() => {
    const h1 = document.querySelector('h1.artist-name, h1, .page-title');
    if (!h1) return null;
    return {
      text: h1.textContent?.trim(),
      overflow: h1.scrollWidth > h1.clientWidth + 2
    };
  });
  if (!nameEl) {
    bug(screenName, 'Artist name h1 not found');
  } else if (nameEl.overflow) {
    bug(screenName, `Artist name truncated: "${nameEl.text}"`);
  }

  // Check badge (uniqueness/niche/eclectic) is visible
  const hasBadge = await page.evaluate(() => {
    const el = document.querySelector('.uniqueness-badge, .niche-badge, .eclectic-badge, [class*="badge"]');
    return !!el && el.textContent?.trim().length > 0;
  });
  if (!hasBadge) bug(screenName, 'No uniqueness/niche/eclectic badge found');

  // Check tab bar
  const hasTabs = await page.evaluate(() => !!document.querySelector('[data-testid="tab-bar"], .tab-bar'));
  if (!hasTabs) bug(screenName, 'Tab bar not found');

  // Check for cover art loading (discography)
  const covers = await page.evaluate(() => {
    let loaded = 0, total = 0;
    for (const img of document.querySelectorAll('.cover-art img')) {
      total++;
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return { loaded, total };
  });
  if (covers.total > 0 && covers.loaded === 0) bug(screenName, `Discography: ${covers.total} covers but none loaded`);
  console.log(`  ↳ Covers: ${covers.loaded}/${covers.total} loaded`);
}

async function checkPlatformPills(page, screenName) {
  const pills = await page.evaluate(() => {
    const pillEls = document.querySelectorAll('.platform-pill');
    const result = [];
    for (const p of pillEls) {
      const style = window.getComputedStyle(p);
      result.push({
        text: p.textContent?.trim().replace(/\s+/g, ' '),
        color: style.color,
        borderColor: style.borderColor,
      });
    }
    return result;
  });
  if (pills.length === 0) {
    // Platform row might not have any links for this artist
    console.log(`  ↳ No platform pills (artist may have no streaming links)`);
  } else {
    console.log(`  ↳ Platform pills (${pills.length}): ${pills.map(p => p.text.split(' ')[0]).join(', ')}`);
    // Check that pills have non-default color (brand color applied)
    for (const p of pills) {
      // rgb(var(--text-primary)) default is typically white/grey — anything else = brand color applied
      if (p.color === 'rgb(255, 255, 255)' || p.color === 'rgb(229, 229, 229)' || p.color === 'rgba(0, 0, 0, 0)') {
        // Could be brand white or default — not necessarily a bug
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    process.exit(1);
  }

  // Kill any existing mercury.exe instances before launching
  try {
    const { execSync } = createRequire(import.meta.url)('child_process');
    execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
    console.log('Killed existing mercury.exe instances');
    await new Promise(r => setTimeout(r, 1500));
  } catch (_) {
    // No existing instances — fine
  }

  console.log('Launching Tauri app (CDP port 9224)...');
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
  await page.waitForTimeout(2000);

  const initialUrl = page.url();
  console.log('Initial URL:', initialUrl);

  // If stuck on error page, navigate explicitly to tauri://localhost
  if (initialUrl.startsWith('chrome-error://') || initialUrl === 'about:blank') {
    console.log('Page on error/blank — navigating to tauri://localhost...');
    await page.goto('tauri://localhost/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);
    console.log('After nav:', page.url());
  }

  // Set window size to 1200x800
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(500);

  console.log('Connected. URL:', page.url());
  console.log(`Output: ${OUT}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Search — electronic (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 1. Search: electronic ---');
  await goto(page, '/search?q=electronic&mode=tag', 6000);
  await waitForCardImages(page, 15000, 6);
  await page.waitForTimeout(1000);
  await checkGridLayout(page, 'search-electronic');
  await save(page, 'search-electronic-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search — jazz (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 2. Search: jazz ---');
  await goto(page, '/search?q=jazz&mode=tag', 6000);
  await waitForCardImages(page, 15000, 6);
  await page.waitForTimeout(1000);
  await checkGridLayout(page, 'search-jazz');
  await save(page, 'search-jazz-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Search — psychedelic rock (grid)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 3. Search: psychedelic rock ---');
  await goto(page, '/search?q=psychedelic+rock&mode=tag', 6000);
  await waitForCardImages(page, 15000, 6);
  await page.waitForTimeout(1000);
  await checkGridLayout(page, 'search-psychedelic-rock');
  await save(page, 'search-psychedelic-rock-grid.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Search — autocomplete mid-type
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 4. Search autocomplete ---');
  await goto(page, '/', 3000);
  // Type "post-punk" character by character to trigger autocomplete
  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[data-testid*="search"], .search-input input').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await page.waitForTimeout(300);
    // Type "post-" to trigger dropdown
    await page.keyboard.type('post-', { delay: 80 });
    await page.waitForTimeout(1500); // wait for autocomplete to appear
    // Check if autocomplete dropdown appeared
    const hasDropdown = await page.evaluate(() => {
      const el = document.querySelector('.autocomplete-list, .autocomplete, [class*="autocomplete"], [class*="suggest"], .search-suggestions');
      return !!el && window.getComputedStyle(el).display !== 'none';
    });
    if (!hasDropdown) bug('search-autocomplete', 'Autocomplete dropdown did not appear after typing "post-"');
    await save(page, 'search-autocomplete.png');
  } else {
    // Try from search page
    await goto(page, '/search', 2000);
    const searchInput2 = page.locator('input').first();
    if (await searchInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput2.click();
      await page.keyboard.type('post-', { delay: 80 });
      await page.waitForTimeout(1500);
      await save(page, 'search-autocomplete.png');
    } else {
      bug('search-autocomplete', 'Could not find search input on home or search page');
      await save(page, 'search-autocomplete.png');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Artist page — Slowdive (discography tab)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 5. Artist: Slowdive ---');
  const slowdiveHref = await navigateToArtist(page, 'Slowdive');
  if (slowdiveHref) {
    // Scroll to show discography grid
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      if (!grid) return 300;
      return Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200);
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(800);
    await checkArtistPage(page, 'artist-slowdive', 'Slowdive');
    await checkPlatformPills(page, 'artist-slowdive');
    await save(page, 'artist-slowdive-discography.png');
  } else {
    bug('artist-slowdive', 'No search results for Slowdive');
    await save(page, 'artist-slowdive-discography.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Artist page — The Cure (discography tab)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 6. Artist: The Cure ---');
  const cureHref = await navigateToArtist(page, 'The Cure');
  if (cureHref) {
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      if (!grid) return 300;
      return Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200);
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(800);
    await checkArtistPage(page, 'artist-the-cure', 'The Cure');
    await checkPlatformPills(page, 'artist-the-cure');
    await save(page, 'artist-the-cure-discography.png');
  } else {
    bug('artist-the-cure', 'No search results for The Cure');
    await save(page, 'artist-the-cure-discography.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Artist page — Nick Cave
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 7. Artist: Nick Cave ---');
  const nickCaveHref = await navigateToArtist(page, 'Nick Cave and the Bad Seeds');
  if (nickCaveHref) {
    const scrollTo = await page.evaluate(() => {
      const grid = document.querySelector('.releases-grid');
      if (!grid) return 300;
      return Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 200);
    });
    await page.evaluate(y => window.scrollTo(0, y), scrollTo);
    await waitForDiscographyCovers(page, 15000, 4);
    await page.waitForTimeout(800);
    await checkArtistPage(page, 'artist-nick-cave', 'Nick Cave');
    await checkPlatformPills(page, 'artist-nick-cave');
    await save(page, 'artist-nick-cave-discography.png');
  } else {
    bug('artist-nick-cave', 'No search results for Nick Cave and the Bad Seeds');
    await save(page, 'artist-nick-cave-discography.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Artist page — Overview tab (Godspeed or Burial for rich overview)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 8. Artist overview tab ---');
  const overviewArtists = ['Godspeed You! Black Emperor', 'Burial', 'Nick Cave and the Bad Seeds', 'Slowdive', 'The Cure'];
  let overviewDone = false;
  for (const artist of overviewArtists) {
    if (overviewDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    // Click Overview tab
    const clicked = await tryClick(page, '[data-testid="tab-overview"]') ||
                    await tryClick(page, '[data-testid="tab-btn-overview"]') ||
                    await tryClick(page, 'button:has-text("Overview")');
    if (clicked) {
      await page.waitForTimeout(3000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      // Check for relationship sections
      const hasRelationships = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="tab-content-overview"], .artist-relationships, .overview-tab');
        return !!el && el.textContent?.trim().length > 50;
      });
      if (!hasRelationships) bug('artist-overview', `Overview tab content empty for "${artist}"`);
      // Check for tags
      const tagCount = await page.evaluate(() => document.querySelectorAll('.tag-chip, .genre-tag').length);
      if (tagCount === 0) bug('artist-overview', `No tags visible in overview for "${artist}"`);
      await save(page, 'artist-overview-tab.png');
      overviewDone = true;
    }
  }
  if (!overviewDone) {
    bug('artist-overview', 'Could not find Overview tab on any artist');
    await save(page, 'artist-overview-tab.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Release page — Play Album button
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 9. Release page ---');
  // Navigate to an artist with discography, click first release
  const releaseArtists = ['Slowdive', 'Burial', 'The Cure', 'Grouper'];
  let releaseDone = false;
  for (const artist of releaseArtists) {
    if (releaseDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    // Wait for discography to load
    await page.waitForTimeout(3000);
    // Click first release card
    const firstRelease = page.locator('a[href*="/release/"]').first();
    const releaseHref = await firstRelease.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (!releaseHref) { console.log(`  ✗ No release links for "${artist}"`); continue; }
    await goto(page, releaseHref, 6000);
    // Check Play Album button
    const hasPlayBtn = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="play-album-btn"], button.play-album, .play-album-btn');
      return !!btn;
    });
    if (!hasPlayBtn) bug('release-page', 'Play Album button not found on release page');
    // Check for track list
    const trackCount = await page.evaluate(() => document.querySelectorAll('.track-row, [data-testid="track-row"]').length);
    if (trackCount === 0) bug('release-page', 'No track rows on release page');
    else console.log(`  ↳ ${trackCount} track rows`);
    // Scroll to show tracks + play button
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
  // 10. Player bar — source badge
  // (Navigate to release page and start playback via a SoundCloud/YouTube embed)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 10. Player bar ---');
  // We'll stay on the release page and try to trigger play
  // But actual audio playback requires user interaction. Instead, navigate to
  // an artist with streaming links and click the embed trigger to load it.
  const playerArtists = ['Grouper', 'Burial', 'Slowdive', 'The Cure'];
  let playerDone = false;
  for (const artist of playerArtists) {
    if (playerDone) break;
    const href = await navigateToArtist(page, artist);
    if (!href) continue;
    // Check if platform pills exist
    const pills = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.platform-pill')).map(p => p.textContent?.trim().replace(/\s+/g, ' '));
    });
    if (pills.length === 0) { console.log(`  ✗ No platform pills for ${artist}`); continue; }
    console.log(`  ↳ Pills: ${pills.slice(0, 4).join(', ')}`);
    // Click first embed-capable pill (SoundCloud or Spotify — not ext link)
    const pillBtn = page.locator('.platform-pill:not(.platform-pill--ext)').first();
    if (await pillBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pillBtn.click();
      await page.waitForTimeout(3000); // wait for embed to load
      // Check if embed appeared
      const hasEmbed = await page.evaluate(() => {
        const el = document.querySelector('.embed-container, iframe, .embed-player');
        return !!el;
      });
      if (!hasEmbed) bug('player-bar', `Clicking platform pill did not open embed for ${artist}`);
    }
    // Scroll to show artist header + platform pills + embed
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await save(page, 'player-bar-source.png');
    playerDone = true;
  }
  if (!playerDone) {
    bug('player-bar', 'Could not set up a player bar state for screenshot');
    await save(page, 'player-bar-source.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Queue panel
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 11. Queue panel ---');
  // Navigate to a release page and add tracks to queue
  const queueArtist = await navigateToArtist(page, 'Slowdive');
  if (queueArtist) {
    await page.waitForTimeout(2000);
    // Click first release
    const firstRelease = page.locator('a[href*="/release/"]').first();
    const rHref = await firstRelease.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (rHref) {
      await goto(page, rHref, 5000);
      // Add multiple tracks to queue via queue buttons
      const queueBtns = page.locator('[data-testid="queue-btn"], .queue-btn, button[title*="Queue"], button[aria-label*="queue"]');
      const btnCount = await queueBtns.count();
      const toAdd = Math.min(btnCount, 5);
      for (let i = 0; i < toAdd; i++) {
        try {
          await queueBtns.nth(i).click();
          await page.waitForTimeout(300);
        } catch {}
      }
      console.log(`  ↳ Added ${toAdd} tracks to queue`);
      // Open queue panel
      const opened = await tryClick(page, '[data-testid="queue-toggle"]') ||
                     await tryClick(page, '.queue-toggle, button[title*="queue" i], button[aria-label*="queue" i]');
      if (!opened) bug('queue-panel', 'Could not find queue toggle button');
      await page.waitForTimeout(1500);
      // Check queue items
      const queueCount = await page.evaluate(() =>
        document.querySelectorAll('.queue-item, [class*="queue-track"], [data-testid="queue-item"]').length
      );
      if (queueCount === 0) bug('queue-panel', 'Queue panel shows 0 items after adding tracks');
      else console.log(`  ↳ Queue shows ${queueCount} items`);
      // Check for drag handles
      const hasDragHandles = await page.evaluate(() =>
        !!document.querySelector('[draggable="true"], .drag-handle, [class*="drag"]')
      );
      if (!hasDragHandles) bug('queue-panel', 'No drag handles visible in queue panel');
      await save(page, 'queue-panel.png');
    } else {
      bug('queue-panel', 'No release links for Slowdive');
      await save(page, 'queue-panel.png');
    }
  } else {
    bug('queue-panel', 'Could not navigate to Slowdive');
    await save(page, 'queue-panel.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Library — two-pane layout
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 12. Library ---');
  await goto(page, '/library', 5000);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Check two-pane structure
  const hasAlbumPane = await page.evaluate(() =>
    !!document.querySelector('[data-testid="album-list-pane"]')
  );
  const hasTrackPane = await page.evaluate(() =>
    !!document.querySelector('[data-testid="track-pane"]')
  );
  if (!hasAlbumPane) bug('library', 'Album list pane ([data-testid="album-list-pane"]) not found');
  if (!hasTrackPane) bug('library', 'Track pane ([data-testid="track-pane"]) not found');
  // Check for content vs empty state
  const libraryContent = await page.evaluate(() =>
    document.querySelectorAll('.album-item, .library-artist, [class*="album-row"], [class*="track-row"]').length
  );
  if (libraryContent === 0) {
    bug('library', 'Library appears empty — no album or track rows found');
    console.log('  ↳ Library is empty (no local files scanned)');
  } else {
    console.log(`  ↳ ${libraryContent} library items`);
  }
  await save(page, 'library-two-pane.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Discover — ambient + Iceland
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 13. Discover: ambient + Iceland ---');
  await goto(page, '/discover?tags=ambient', 5000);
  // Set country
  const countryInput = page.locator('#country-input, input[placeholder*="Country" i], input[placeholder*="country" i]').first();
  if (await countryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await countryInput.fill('Iceland');
    await page.waitForTimeout(2000);
    // Check if country filter applied
    const hasResults = await page.evaluate(() => document.querySelectorAll('.artist-card').length > 0);
    if (!hasResults) {
      bug('discover-ambient-iceland', 'No results for ambient + Iceland');
      // Fall back to any country
      await countryInput.clear();
      await page.waitForTimeout(1500);
    } else {
      const count = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
      console.log(`  ↳ ${count} results for ambient + Iceland`);
    }
  } else {
    bug('discover-ambient-iceland', 'Country input not found on Discover page');
  }
  await waitForCardImages(page, 12000, 3);
  await checkGridLayout(page, 'discover-ambient-iceland');
  await save(page, 'discover-ambient-iceland.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Discover — noise rock + Japan
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 14. Discover: noise rock + Japan ---');
  await goto(page, '/discover?tags=noise+rock', 5000);
  const countryInput2 = page.locator('#country-input, input[placeholder*="Country" i], input[placeholder*="country" i]').first();
  if (await countryInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await countryInput2.fill('Japan');
    await page.waitForTimeout(2000);
    const count = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (count === 0) bug('discover-noise-rock-japan', 'No results for noise rock + Japan');
    else console.log(`  ↳ ${count} results`);
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
  await goto(page, '/discover?tags=metal', 5000);
  const countryInput3 = page.locator('#country-input, input[placeholder*="Country" i], input[placeholder*="country" i]').first();
  if (await countryInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
    await countryInput3.fill('Finland');
    await page.waitForTimeout(2000);
    const count = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (count === 0) bug('discover-metal-finland', 'No results for metal + Finland');
    else console.log(`  ↳ ${count} results`);
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
  const tm83Images = await waitForCardImages(page, 12000, 3);
  // Check year label
  const yearLabel = await page.evaluate(() => {
    const el = document.querySelector('.year-display, .year-label, [class*="year"]');
    return el?.textContent?.trim();
  });
  if (!yearLabel || !yearLabel.includes('1983')) bug('time-machine-1983', `Year label missing or incorrect: "${yearLabel}"`);
  const cardCount83 = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (cardCount83 === 0) bug('time-machine-1983', 'No artist cards for year 1983');
  else console.log(`  ↳ ${cardCount83} artists, ${tm83Images} images`);
  await save(page, 'time-machine-1983.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Time Machine — alternate year (1977)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 17. Time Machine: 1977 ---');
  await goto(page, '/time-machine?year=1977', 6000);
  const tm77Images = await waitForCardImages(page, 12000, 3);
  const cardCount77 = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
  if (cardCount77 === 0) {
    // Try 1991
    console.log('  ↳ 1977 empty, trying 1991...');
    await goto(page, '/time-machine?year=1991', 6000);
    await waitForCardImages(page, 12000, 3);
    const count91 = await page.evaluate(() => document.querySelectorAll('.artist-card').length);
    if (count91 === 0) bug('time-machine-1977', 'No artists for 1977 or 1991');
    else console.log(`  ↳ 1991: ${count91} artists`);
    await save(page, 'time-machine-1977.png'); // named per prompt spec
  } else {
    console.log(`  ↳ 1977: ${cardCount77} artists, ${tm77Images} images`);
    await save(page, 'time-machine-1977.png');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Style Map — zoomed out
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 18. Style Map (overview) ---');
  await goto(page, '/style-map', 8000);
  // Wait for data-ready signal
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // Check nodes rendered
  const nodeCount = await page.evaluate(() =>
    document.querySelectorAll('.style-map-node, [class*="node"], rect, circle').length
  );
  if (nodeCount === 0) bug('style-map-overview', 'No nodes/rects found in Style Map');
  else console.log(`  ↳ ${nodeCount} nodes/shapes`);
  // Check zoom controls
  const hasZoomControls = await page.evaluate(() =>
    !!document.querySelector('.zoom-controls, button[title*="zoom" i], .zoom-in, .zoom-out')
  );
  if (!hasZoomControls) bug('style-map-overview', 'No zoom controls visible');
  await save(page, 'style-map-overview.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Style Map — zoomed in (post-punk cluster)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 19. Style Map (zoomed in) ---');
  // Navigate with a tag param to pre-zoom/highlight
  await goto(page, '/style-map?tag=post-punk', 8000);
  await page.waitForSelector('[data-ready]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // Try clicking zoom in a few times
  for (let i = 0; i < 3; i++) {
    const zoomed = await tryClick(page, '.zoom-in, button[title*="zoom in" i], button[aria-label*="zoom in" i]', 1000);
    if (zoomed) await page.waitForTimeout(400);
    else break;
  }
  await page.waitForTimeout(1000);
  // Check node labels readable (some text nodes)
  const textNodes = await page.evaluate(() =>
    document.querySelectorAll('text, .node-label, [class*="label"]').length
  );
  if (textNodes === 0) bug('style-map-zoomed', 'No text/label nodes visible after zoom');
  await save(page, 'style-map-zoomed.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Knowledge Base — shoegaze entry
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 20. Knowledge Base: shoegaze ---');
  await goto(page, '/kb/shoegaze', 6000);
  // Check if it loaded or redirected to 404
  const kbTitle = await page.evaluate(() => document.querySelector('h1, .kb-title')?.textContent?.trim());
  if (!kbTitle || kbTitle.toLowerCase().includes('404') || kbTitle.toLowerCase().includes('not found')) {
    // Try krautrock
    console.log('  ↳ shoegaze not found, trying krautrock...');
    await goto(page, '/kb/krautrock', 6000);
    const kbTitle2 = await page.evaluate(() => document.querySelector('h1, .kb-title')?.textContent?.trim());
    if (!kbTitle2 || kbTitle2.toLowerCase().includes('404')) {
      bug('knowledge-base-shoegaze', 'KB genre entries not loading (404 or empty)');
    }
  }
  // Check related genres
  const hasRelated = await page.evaluate(() => {
    const el = document.querySelector('.related-genres, .related-tags, [class*="related"]');
    return !!el && el.querySelectorAll('a, .tag-chip').length > 0;
  });
  if (!hasRelated) bug('knowledge-base-shoegaze', 'No related genre links visible');
  // Check for markdown content (no raw ## headers showing)
  const markdownArtifacts = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.includes('## ') || body.includes('**') || body.match(/^\s*#\s/m);
  });
  if (markdownArtifacts) bug('knowledge-base-shoegaze', 'Raw markdown symbols visible in rendered KB content');
  await save(page, 'knowledge-base-shoegaze.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. Artist Claim Form (/claim)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- 21. Artist Claim Form ---');
  await goto(page, '/claim', 4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Check form fields
  const hasNameField = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea');
    return inputs.length >= 1;
  });
  if (!hasNameField) bug('artist-claim-form', 'No input fields found on /claim page');
  // Check submit button
  const hasSubmit = await page.evaluate(() => {
    const btns = document.querySelectorAll('button[type="submit"], button:has-text("Submit"), button:has-text("Claim"), .submit-btn');
    return btns.length > 0;
  });
  if (!hasSubmit) bug('artist-claim-form', 'No submit button found on /claim page');
  // Check layout
  const hasLayout = await page.evaluate(() => !!document.querySelector('form, .claim-form'));
  if (!hasLayout) bug('artist-claim-form', 'No form element found — page may not have loaded');
  await save(page, 'artist-claim-form.png');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup + report
  // ═══════════════════════════════════════════════════════════════════════════
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

  try { await browser.close(); } catch (_) {}
  proc.kill();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
