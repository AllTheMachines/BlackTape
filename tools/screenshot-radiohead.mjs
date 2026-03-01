import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

await page.waitForTimeout(500);
await page.screenshot({ path: 'tools/radiohead-page.png', fullPage: false });
console.log('done');
await browser.close();
