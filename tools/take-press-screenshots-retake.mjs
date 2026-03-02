/**
 * Mercury Press Screenshot Retake — Artist page top-of-page captures
 *
 * Retakes 3 artist page shots with scroll position fixed to y=0 so the
 * artist name heading is not clipped.
 *
 * Output overwrites matching files in press-screenshots/v3/
 *
 * Run: node tools/take-press-screenshots-retake.mjs
 *
 * Requirements:
 *   - Tauri debug binary at src-tauri/target/debug/blacktape.exe
 *   - Real mercury.db in %APPDATA%/com.mercury.app/mercury.db
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'press-screenshots', 'v3');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'blacktape.exe');
const CDP_PORT = 9223;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Core helpers (same as v3)
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

async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function waitForDiscographyCovers(page, timeoutMs = 15000, minCovers = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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
    await page.waitForTimeout(800);
  }
  const final = await page.evaluate(() => {
    let loaded = 0;
    for (const img of document.querySelectorAll('.cover-art img[src]')) {
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return loaded;
  });
  console.log(`  ↳ ${final} cover(s) loaded (timeout)`);
  return final;
}

async function navigateToArtist(page, artistName) {
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 6000);
  const firstCard = page.locator('a.artist-card').first();
  const href = await firstCard.getAttribute('href', { timeout: 5000 }).catch(() => null);
  if (!href) {
    console.log(`  ✗ No search results for "${artistName}"`);
    return null;
  }
  await goto(page, href, 8000);
  return href;
}

// ---------------------------------------------------------------------------
// Fixed artist page shot — scrolls to y=0 so the artist name is at the top
// ---------------------------------------------------------------------------

async function artistPageShotTopAligned(page, artistName, filename, minCovers = 4) {
  console.log(`\nRetaking: ${artistName}`);
  const href = await navigateToArtist(page, artistName);
  if (!href) return false;

  const hasDisc = await page.locator('.releases-grid, .discography').first()
    .isVisible({ timeout: 4000 }).catch(() => false);
  if (!hasDisc) {
    console.log(`  ✗ No discography for "${artistName}"`);
    return false;
  }

  // Scroll to very top — artist name must not be clipped
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Wait for discography covers to load at this scroll position
  const coverCount = await waitForDiscographyCovers(page, 15000, minCovers);

  if (coverCount < minCovers) {
    console.log(`  ✗ Only ${coverCount} covers for "${artistName}" (need ${minCovers}) — skip`);
    return false;
  }

  const outPath = path.join(OUT, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ✓ SAVED: ${filename}`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const RETAKES = [
  { name: 'The Cure',                  file: 'artist-the-cure-discography.png' },
  { name: 'Nick Cave and the Bad Seeds', file: 'artist-nick-cave-discography.png' },
  { name: 'Slowdive',                  file: 'artist-slowdive-discography.png' },
];

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
  console.log(`Output dir: ${OUT}`);
  console.log('\nNote: scrolling to y=0 before each shot so artist name is fully visible.\n');

  let done = 0;
  for (const { name, file } of RETAKES) {
    const ok = await artistPageShotTopAligned(page, name, file);
    if (ok) done++;
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`RETAKES COMPLETE: ${done}/${RETAKES.length}`);
  console.log(`Output: ${OUT}`);
  console.log('\nFiles updated:');
  for (const { file } of RETAKES) {
    const exists = fs.existsSync(path.join(OUT, file));
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  }

  try { await browser.close(); } catch (_) {}
  proc.kill();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
