import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

const logs = [];
page.on('console', msg => { if (msg.type() === 'error') logs.push(msg.text()); });
page.on('pageerror', err => logs.push('PAGE ERROR: ' + err.message));

await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(4000);

console.log('Errors:', JSON.stringify(logs));

const state = await page.evaluate(() => ({
  hasLibraryContent: !!document.querySelector('.library-content'),
  hasEmptyState: !!document.querySelector('.empty-state'),
  albumItemCount: document.querySelectorAll('[data-testid="album-list-item"]').length,
  trackCountText: document.querySelector('.track-count')?.textContent ?? null
}));
console.log('State:', JSON.stringify(state));

await browser.close();
