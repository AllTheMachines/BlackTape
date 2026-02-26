/**
 * Press screenshot generator — uses the real Tauri app with real data.
 *
 * Launches the debug binary with CDP, navigates to visually rich pages,
 * captures 2× retina screenshots. Does NOT replace the user's real mercury.db.
 *
 * Run:  node tools/take-press-screenshots.mjs
 *
 * Requirements:
 *   - Dev server running on http://localhost:5173  (npm run dev)
 *   - Tauri debug binary built
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'press-screenshots');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9222;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

fs.mkdirSync(OUT, { recursive: true });

function pollCdp(timeoutMs = 30000) {
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
      if (Date.now() >= deadline) return reject(new Error('CDP timeout'));
      setTimeout(attempt, 600);
    }
    attempt();
  });
}

async function save(page, name, { fullPage = false, scrollY = 0 } = {}) {
  if (scrollY) await page.evaluate(y => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(800);
  const outPath = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage });
  console.log(`  ✓ ${name}.png`);
}

let _baseUrl = 'http://localhost:5173';

async function goto(page, path_, waitMs = 3500) {
  // Use in-page navigation so SvelteKit's router handles the route
  await page.evaluate(p => { window.location.href = p; }, path_);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    process.exit(1);
  }

  console.log('Launching Tauri app...');
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
  await pollCdp(30000);
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  const pages = contexts[0]?.pages() ?? [];
  const page = pages[0];

  if (!page) throw new Error('No page found via CDP');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // Detect base URL from app (dev uses localhost:5173, prod uses tauri://localhost)
  const currentUrl = page.url();
  if (currentUrl.startsWith('tauri://')) {
    _baseUrl = 'tauri://localhost';
  } else if (currentUrl.includes('localhost:')) {
    _baseUrl = currentUrl.replace(/\/$/, '').split('/').slice(0, 3).join('/');
  }
  console.log('Base URL:', _baseUrl);

  console.log('Connected. Taking screenshots...\n');

  // ── 1. Discover (artist card grid with covers) ─────────────────────────
  await goto(page, '/discover', 6000);
  await save(page, '01-discover');
  await save(page, '01-discover-full', { fullPage: true });

  // ── 2. Search for a busy genre ─────────────────────────────────────────
  await goto(page, '/search?q=jazz', 7000);
  await save(page, '02-search-jazz');

  // ── 3. Radiohead artist page (lots of releases with cover art) ─────────
  await goto(page, '/artist/radiohead', 8000);
  await save(page, '03-artist-radiohead-header');
  await save(page, '03-artist-radiohead-discography', { scrollY: 350 });

  // ── 4. Try another well-known artist ───────────────────────────────────
  await goto(page, '/artist/aphex-twin', 8000);
  await save(page, '04-artist-aphex-twin');

  // ── 5. Style Map ───────────────────────────────────────────────────────
  await goto(page, '/style-map', 6000);
  await save(page, '05-style-map');

  // ── 6. Crate Digging ───────────────────────────────────────────────────
  await goto(page, '/crate-dig', 4000);
  await save(page, '06-crate-dig');

  // ── 7. Time Machine ────────────────────────────────────────────────────
  await goto(page, '/time-machine', 4000);
  await save(page, '07-time-machine');

  // ── 8. Scenes ──────────────────────────────────────────────────────────
  await goto(page, '/scenes', 4000);
  await save(page, '08-scenes');

  // ── 9. Knowledge Base genre page ───────────────────────────────────────
  await goto(page, '/kb/genre/jazz', 6000);
  await save(page, '09-kb-jazz');

  // ── 10. New & Rising ───────────────────────────────────────────────────
  await goto(page, '/new-rising', 5000);
  await save(page, '10-new-rising');

  // ── 11. Search — hip hop ───────────────────────────────────────────────
  await goto(page, '/search?q=hip+hop', 7000);
  await save(page, '11-search-hiphop');

  // ── 12. Portishead ─────────────────────────────────────────────────────
  await goto(page, '/artist/portishead', 8000);
  await save(page, '12-artist-portishead');

  console.log('\nDone! Shutting down...');
  try { await browser.close(); } catch (_) {}
  proc.kill();

  console.log(`\nScreenshots saved to: press-screenshots/\n`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
