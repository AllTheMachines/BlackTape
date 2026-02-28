// Navigate DIRECTLY to release URL (no artist page first) and check lifecycle
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

const logs = [];
const ts = () => `+${Date.now() - start}ms`;
let start = Date.now();

page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[LR]') || text.includes('[loadRelease]') || text.includes('[MOUNT]')) {
    logs.push(`${ts()} [${msg.type()}] ${text}`);
    console.log(`${ts()} PAGE: ${text}`);
  }
});

// Navigate directly to KID A MNESIA release page (full reload)
const kidAMbid = '6f25f9fb-e9e3-4c0d-8904-ecb8b46cd8aa';
const href = `/artist/radiohead/release/${kidAMbid}`;
console.log('Navigating directly to release page...');
start = Date.now();
await page.evaluate((h) => { window.location.href = h; }, href);

// Wait 15s
await page.waitForTimeout(15000);

const state = await page.evaluate(() => ({
  loadingText: document.querySelector('.release-loading p')?.textContent,
  hasRelease: !!document.querySelector('.release-hero'),
  url: window.location.pathname
}));

console.log('\n--- Final state ---', state);
console.log('\n--- Timed logs ---');
logs.forEach(l => console.log(l));

await browser.close();
