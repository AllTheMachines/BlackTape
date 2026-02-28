import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(10000);

const info = await page.evaluate(() => {
  const thumbImgs = document.querySelectorAll('.album-thumb-img');
  const thumbDivs = document.querySelectorAll('.album-thumb');
  const allImgs = document.querySelectorAll('img');
  const libraryEl = document.querySelector('.library-browser') || document.querySelector('.library-page');
  const body = document.body.innerText.slice(0, 500);
  return {
    thumbImgs: thumbImgs.length,
    thumbDivs: thumbDivs.length,
    allImgs: allImgs.length,
    hasLibraryEl: !!libraryEl,
    bodyText: body
  };
});

console.log('DOM info:', JSON.stringify(info, null, 2));
await browser.close();
