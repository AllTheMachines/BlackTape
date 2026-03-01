import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Capture console errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));

await page.evaluate(() => { window.location.href = '/artist/the-cure'; });
await page.waitForTimeout(5000);

const state = await page.evaluate(() => {
  const grid = document.querySelector('.releases-grid');
  const discography = document.querySelector('.discography-section, [data-testid="discography"]');
  const overview = document.querySelector('[data-testid="tab-overview-content"]');
  return {
    hasGrid: !!grid,
    gridChildren: grid?.children.length || 0,
    hasDiscography: !!discography,
    overviewHTML: overview?.innerHTML?.slice(0, 300) || 'no overview'
  };
});

console.log('State:', JSON.stringify(state, null, 2));
console.log('Errors:', errors);
await browser.close();
