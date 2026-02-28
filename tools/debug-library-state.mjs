import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// First check current state without navigating
const beforeNav = await page.evaluate(() => ({
  url: window.location.href,
  bodyText: document.body.innerText.slice(0, 200)
}));
console.log('Before nav:', JSON.stringify(beforeNav, null, 2));

// Navigate to library
await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(2000);

// Check loading state via console instrumentation
const state = await page.evaluate(async () => {
  // Try to invoke get_tracks directly to see if it works
  try {
    const tracks = await window.__TAURI_INTERNALS__.invoke('get_tracks');
    const folders = await window.__TAURI_INTERNALS__.invoke('get_folders');
    return {
      trackCount: tracks.length,
      folderCount: folders.length,
      firstTrack: tracks[0] ? { title: tracks[0].title, artist: tracks[0].artist, album: tracks[0].album } : null,
      firstFolder: folders[0] ?? null
    };
  } catch (e) {
    return { error: e.toString() };
  }
});

console.log('Library state:', JSON.stringify(state, null, 2));

// Check the DOM after data is available
await page.waitForTimeout(3000);
const dom = await page.evaluate(() => ({
  albumThumbs: document.querySelectorAll('.album-thumb').length,
  thumbImgs: document.querySelectorAll('.album-thumb-img').length,
  bodyText: document.body.innerText.slice(0, 300)
}));
console.log('DOM after 5s:', JSON.stringify(dom, null, 2));

await browser.close();
