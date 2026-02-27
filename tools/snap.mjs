/**
 * snap.mjs — take one screenshot of the running app via CDP
 * Usage: node tools/snap.mjs <filename>
 * Example: node tools/snap.mjs artist-slowdive-discography.png
 *
 * Requires: app running with CDP on port 9224
 * Launch app: set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9224 && mercury.exe
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'press-screenshots', 'v5');
const filename = process.argv[2];

if (!filename) {
  console.error('Usage: node tools/snap.mjs <filename.png>');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const outPath = path.join(OUT, filename);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }

await page.screenshot({ path: outPath, fullPage: false });
console.log('✓ Saved:', outPath);
await browser.close();
