// Navigate to KID A MNESIA and capture all console logs
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[LR]') || text.includes('[loadRelease]') || text.includes('Release fetch') || text.includes('[TRACE]')) {
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[PAGE] ${text}`);
  }
});

// Go to Radiohead page
await page.evaluate(() => { window.location.href = '/artist/radiohead'; });
await page.waitForTimeout(4000);

// Navigate directly to KID A MNESIA using the known MBID
const kidAMbid = '6f25f9fb-e9e3-4c0d-8904-ecb8b46cd8aa';
const href = `/artist/radiohead/release/${kidAMbid}`;
console.log('Navigating to', href);
await page.evaluate((h) => { window.location.href = h; }, href);

// Wait up to 12 seconds
console.log('Waiting for logs...');
await page.waitForTimeout(12000);

// Check final DOM state
const state = await page.evaluate(() => {
  const loading = document.querySelector('.release-loading p');
  return {
    loadingText: loading?.textContent,
    hasRelease: !!document.querySelector('.release-hero'),
  };
});

console.log('\n--- Final state ---');
console.log(state);
console.log('\n--- All LR logs ---');
logs.forEach(l => console.log(l));

await browser.close();
