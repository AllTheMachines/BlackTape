import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

console.log('Testing library load speed fix...');
const t0 = Date.now();
await page.evaluate(() => { window.location.href = '/library'; });

// Poll for albums (without covers) appearing
let firstRenderMs = null;
let firstCoverMs = null;

for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500);
  const elapsed = Date.now() - t0;
  const counts = await page.evaluate(() => ({
    thumbs: document.querySelectorAll('.album-thumb').length,
    imgs: document.querySelectorAll('.album-thumb-img').length,
    loading: document.body.innerText.includes('Loading library')
  }));

  if (counts.thumbs > 0 && firstRenderMs === null) {
    firstRenderMs = elapsed;
    console.log(`✓ Albums rendered at ${elapsed}ms (${counts.thumbs} albums, loading=${counts.loading})`);
  }
  if (counts.imgs > 0 && firstCoverMs === null) {
    firstCoverMs = elapsed;
    console.log(`✓ Cover thumbnails appeared at ${elapsed}ms (${counts.imgs} images)`);
    break;
  }
  if (elapsed > 20000) {
    console.log(`✗ Timeout after 20s — thumbs:${counts.thumbs} imgs:${counts.imgs}`);
    break;
  }
}

if (firstRenderMs === null) {
  const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('✗ Library never rendered');
  console.log('Body:', body);
}

await browser.close();
