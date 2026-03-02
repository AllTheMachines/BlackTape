/**
 * Debug script: tests genre graph queries via Tauri CDP invoke.
 * Run with the Tauri app closed, then: node tools/debug-kb-genre.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'blacktape.exe');
const CDP_PORT = 9224;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

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
      if (Date.now() >= deadline) return reject(new Error('CDP timeout'));
      setTimeout(attempt, 600);
    }
    attempt();
  });
}

async function invokeQuery(page, sql, params = []) {
  return page.evaluate(
    ({ sql, params }) =>
      window.__TAURI__.core.invoke('query_mercury_db', { sql, params }),
    { sql, params }
  );
}

async function run() {
  const proc = spawn(BINARY, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
    stdio: 'ignore', detached: false,
  });
  proc.on('error', err => console.error('Process error:', err.message));

  console.log('Waiting for CDP...');
  await pollCdp();
  await new Promise(r => setTimeout(r, 4000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const page = browser.contexts()[0]?.pages()?.[0];
  if (!page) { console.error('No page'); process.exit(1); }

  // Capture all console messages and page errors
  page.on('console', msg => console.log(`[console.${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[pageerror]', err.message));

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2000);
  console.log('Connected:', page.url());

  // Navigate to KB and capture any errors
  console.log('\n--- Navigating to /kb ---');
  await page.evaluate(() => { window.location.href = '/kb'; });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(8000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('KB page contains "not yet available":', bodyText.includes('not yet available'));
  console.log('KB page contains "Genre":', bodyText.includes('Genre'));

  try { await browser.close(); } catch (_) {}
  proc.kill();
  console.log('Done.');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
