import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Fresh navigation and timing
const t0 = Date.now();
await page.evaluate(() => { window.location.href = '/'; });
await page.waitForTimeout(1000);

const t1 = Date.now();
console.log(`Home page ready at ${t1 - t0}ms`);

await page.evaluate(() => { window.location.href = '/library'; });

// Time the operations directly
const timings = await page.evaluate(async () => {
  const invoke = window.__TAURI_INTERNALS__.invoke;
  const t0 = Date.now();
  const tracks = await invoke('get_library_tracks');
  const t1 = Date.now();
  const folders = await invoke('get_music_folders');
  const t2 = Date.now();
  return {
    trackCount: tracks.length,
    folderCount: folders.length,
    getTracks_ms: t1 - t0,
    getFolders_ms: t2 - t1
  };
});
const t3 = Date.now();
console.log(`Invocations done at ${t3 - t0}ms total`);
console.log('Timings:', JSON.stringify(timings, null, 2));

// Wait for DOM render
await page.waitForTimeout(2000);
const dom = await page.evaluate(() => ({
  albums: document.querySelectorAll('.album-thumb').length,
  isLoading: document.body.innerText.includes('Loading library')
}));
const t4 = Date.now();
console.log(`DOM at ${t4 - t0}ms:`, JSON.stringify(dom));

await browser.close();
