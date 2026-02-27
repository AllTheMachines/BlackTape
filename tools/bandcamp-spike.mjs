/**
 * Bandcamp Spike Script — Tests whether url= parameter renders in Tauri WebView2
 *
 * Launches the Mercury debug binary via CDP, injects a Bandcamp iframe,
 * and observes whether it loads within 12 seconds.
 *
 * Run: node tools/bandcamp-spike.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CDP_PORT = 9222;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const LAUNCH_TIMEOUT_MS = 45_000;
const SPIKE_TIMEOUT_MS = 12_000;

const BANDCAMP_SPIKE_URL =
  'https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/';

function pollCdp(timeoutMs) {
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
      if (Date.now() >= deadline) {
        return reject(new Error(`CDP not available after ${timeoutMs}ms`));
      }
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

async function runSpike() {
  const binaryPath = path.join(ROOT_DIR, 'src-tauri', 'target', 'debug', 'mercury.exe');
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Binary not found: ${binaryPath}`);
  }

  console.log('Launching Mercury debug binary with CDP...');
  const proc = spawn(binaryPath, [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    },
    stdio: 'ignore',
    detached: false,
  });

  proc.on('error', (err) => {
    console.error(`Process error: ${err.message}`);
  });

  try {
    console.log('Waiting for CDP to become available...');
    await pollCdp(LAUNCH_TIMEOUT_MS);
    console.log('CDP available. Connecting via Playwright...');

    await new Promise(r => setTimeout(r, 2000)); // Let WebView2 init

    const browser = await chromium.connectOverCDP(CDP_BASE);
    const contexts = browser.contexts();
    if (contexts.length === 0) throw new Error('No browser contexts found');
    const pages = contexts[0].pages();
    if (pages.length === 0) throw new Error('No pages found');
    const page = pages[0];

    await page.waitForLoadState('load');
    // Wait for SvelteKit hydration and routing to settle
    await new Promise(r => setTimeout(r, 3000));
    console.log('Connected. Running Bandcamp spike...');
    console.log(`Spike URL: ${BANDCAMP_SPIKE_URL}`);

    // Inject Bandcamp iframe and observe for SPIKE_TIMEOUT_MS
    const result = await page.evaluate(async ({ spikeUrl, timeoutMs }) => {
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.src = spikeUrl;
        iframe.width = '400';
        iframe.height = '120';
        iframe.style.cssText =
          'position:fixed;top:10px;left:10px;z-index:9999;background:white;border:2px solid red;';

        let loaded = false;

        iframe.addEventListener('load', () => {
          loaded = true;
          resolve({ result: 'load_event_fired', note: 'iframe onload fired — content may be visible' });
        });

        iframe.addEventListener('error', (e) => {
          resolve({ result: 'error', note: 'iframe onerror fired: ' + e.message });
        });

        document.body.appendChild(iframe);

        // Monitor Network requests for Bandcamp
        setTimeout(() => {
          if (!loaded) {
            resolve({ result: 'timeout', note: `No load event after ${timeoutMs}ms — likely blank or blocked` });
          }
        }, timeoutMs);
      });
    }, { spikeUrl: BANDCAMP_SPIKE_URL, timeoutMs: SPIKE_TIMEOUT_MS });

    console.log('\n=== SPIKE RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
    return result;
  } finally {
    proc.kill();
    await new Promise(r => setTimeout(r, 500));
  }
}

runSpike()
  .then((result) => {
    console.log('\n=== INTERPRETATION ===');
    if (result.result === 'load_event_fired') {
      console.log('PASSES: Bandcamp iframe onload fired in WebView2.');
      console.log('Recommendation: Use iframe embed with 5s timeout fallback.');
    } else if (result.result === 'timeout') {
      console.log('FAILS: Bandcamp iframe did not load within 12 seconds.');
      console.log('Recommendation: Bandcamp remains external-link-only for v1.6.');
    } else {
      console.log('FAILS: Bandcamp iframe errored.');
      console.log('Recommendation: Bandcamp remains external-link-only for v1.6.');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Spike script failed:', err.message);
    process.exit(1);
  });
