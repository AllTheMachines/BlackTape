import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

// Test MB API from within WebView
const result = await page.evaluate(async () => {
  try {
    const resp = await fetch('https://musicbrainz.org/ws/2/release-group?artist=a74b1b7f-71a5-4011-9441-d0b5e4122711&inc=url-rels&type=album|single|ep&fmt=json&limit=50', {
      headers: { 'User-Agent': 'BlackTape/1.0', 'Accept': 'application/json' }
    });
    return `Status: ${resp.status}, OK: ${resp.ok}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
});
console.log('MB API from WebView:', result);

// Now try reload
await page.goto('http://localhost:5173/artist/radiohead');
await page.waitForTimeout(5000);
const releases = await page.evaluate(() => document.querySelectorAll('.releases-grid > *').length);
console.log('Releases after fresh load:', releases);

await browser.close();
