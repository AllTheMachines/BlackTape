import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(4000);

// Check if cover images are loading
const coverState = await page.evaluate(() => {
  const imgs = document.querySelectorAll('.album-thumb-img');
  const initials = document.querySelectorAll('.album-thumb:not(.album-thumb-img)');
  const firstImgSrc = imgs[0]?.src?.slice(0, 30) ?? null;
  return { imgCount: imgs.length, initialsCount: initials.length, firstImgSrc };
});
console.log('Covers:', JSON.stringify(coverState));
await browser.close();
