import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

const t0 = Date.now();
await page.evaluate(() => { window.location.href = '/library'; });

// Poll until albums appear or 15s timeout
let thumbCount = 0;
let timeToFirstRender = null;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(500);
  const counts = await page.evaluate(() => ({
    thumbs: document.querySelectorAll('.album-thumb').length,
    imgs: document.querySelectorAll('.album-thumb-img').length,
    loading: document.body.innerText.includes('Loading library')
  }));
  if (counts.thumbs > 0 && timeToFirstRender === null) {
    timeToFirstRender = Date.now() - t0;
    thumbCount = counts.thumbs;
    console.log(`✓ Library rendered in ${timeToFirstRender}ms — ${counts.thumbs} albums, ${counts.imgs} with covers`);
  }
  if (counts.imgs > 0) {
    const elapsed = Date.now() - t0;
    console.log(`✓ Covers appeared at ${elapsed}ms — ${counts.imgs} thumbnails loaded`);
    break;
  }
}

if (timeToFirstRender === null) {
  const elapsed = Date.now() - t0;
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log(`✗ Library never rendered after ${elapsed}ms`);
  console.log('Body:', body);
}

await browser.close();
