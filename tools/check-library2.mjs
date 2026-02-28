import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Capture console messages
const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => logs.push({ type: 'ERROR', text: err.message }));

// Navigate to library and wait longer
await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(5000);

console.log('Console logs:', JSON.stringify(logs, null, 2));

// Check state
const state = await page.evaluate(() => {
  return {
    hasLibraryContent: !!document.querySelector('.library-content'),
    hasEmptyState: !!document.querySelector('.empty-state'),
    trackCountText: document.querySelector('.track-count')?.textContent ?? null
  };
});
console.log('State after 5s:', JSON.stringify(state));

await browser.close();
