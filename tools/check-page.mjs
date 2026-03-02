import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

// What URL is the release build serving from?
console.log('Current URL:', page.url());

// Navigate to Radiohead using the app's actual origin
const origin = new URL(page.url()).origin;
console.log('Origin:', origin);

// Capture ALL console messages
page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

await page.goto(origin + '/artist/radiohead', { waitUntil: 'networkidle' });
await page.waitForTimeout(10000);

console.log('Final URL:', page.url());
const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
console.log('H1:', h1);
const releases = await page.evaluate(() => document.querySelectorAll('.releases-grid > *').length);
console.log('Release cards:', releases);

await browser.close();
