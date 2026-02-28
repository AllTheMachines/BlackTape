import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Test get_album_covers directly
const result = await page.evaluate(async () => {
  try {
    const invoke = window.__TAURI_INTERNALS__.invoke;
    const covers = await invoke('get_album_covers');
    return { count: covers.length, firstCoverHasData: !!(covers[0]?.cover_art_base64), error: null };
  } catch(e) {
    return { error: e.toString() };
  }
});
console.log('get_album_covers result:', JSON.stringify(result));
await browser.close();
