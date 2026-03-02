import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

// Navigate to Radiohead
await page.goto('http://localhost:5173/artist/radiohead');
await page.waitForTimeout(4000);

console.log('URL:', page.url());

const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
console.log('H1:', h1);

const releaseCount = await page.evaluate(() => document.querySelectorAll('.releases-grid > *').length);
console.log('Release cards:', releaseCount);

const empty = await page.evaluate(() => {
  const el = document.querySelector('.discography-empty-state, .no-releases-msg');
  return el ? el.textContent?.trim() : 'none';
});
console.log('Empty state:', empty);

const hasDiscography = await page.evaluate(() => {
  return document.querySelector('.releases-grid') ? 'yes' : 'no';
});
console.log('Has releases grid:', hasDiscography);

// Check for any error text
const errorText = await page.evaluate(() => {
  const all = document.body.innerText;
  if (all.includes('error') || all.includes('Error')) return 'Found error text';
  return 'No error text';
});
console.log(errorText);

// Get the sections visible
const headings = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.trim());
});
console.log('Headings:', headings);

await browser.close();
