import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

const timings = await page.evaluate(async () => {
  const invoke = window.__TAURI_INTERNALS__.invoke;

  const t0 = Date.now();
  const tracks = await invoke('get_library_tracks');
  const t1 = Date.now();

  const folders = await invoke('get_music_folders');
  const t2 = Date.now();

  const covers = await invoke('get_album_covers');
  const t3 = Date.now();

  return {
    trackCount: tracks.length,
    folderCount: folders.length,
    coverCount: covers.length,
    firstCoverSize: covers[0]?.cover_art_base64?.length ?? 0,
    totalCoverDataBytes: covers.reduce((s, c) => s + (c.cover_art_base64?.length ?? 0), 0),
    getTracks_ms: t1 - t0,
    getFolders_ms: t2 - t1,
    getCovers_ms: t3 - t2,
  };
});

console.log('Library operation timings:', JSON.stringify(timings, null, 2));

const avgCoverBytes = timings.totalCoverDataBytes / (timings.coverCount || 1);
console.log(`Avg cover size: ${Math.round(avgCoverBytes / 1024)} KB base64 (~${Math.round(avgCoverBytes * 0.75 / 1024)} KB raw)`);
console.log(`Total cover data: ${Math.round(timings.totalCoverDataBytes / 1024 / 1024)} MB base64`);

await browser.close();
