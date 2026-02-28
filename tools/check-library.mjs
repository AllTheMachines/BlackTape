import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];

// Navigate to library fresh and wait
await page.evaluate(() => { window.location.href = '/library'; });
await page.waitForTimeout(2500);

// Check isTauri env detection
const envResult = await page.evaluate(() => {
  return {
    tauriInternals: typeof window.__TAURI_INTERNALS__,
    location: window.location.href,
    bodyClasses: document.body.className
  };
});
console.log('Env:', JSON.stringify(envResult));

// Manually call loadLibrary equivalent
const loadResult = await page.evaluate(async () => {
  try {
    const invoke = window.__TAURI_INTERNALS__.invoke;
    const tracks = await invoke('get_library_tracks');
    const folders = await invoke('get_music_folders');
    return { trackCount: tracks.length, folderCount: folders.length };
  } catch(e) {
    return { error: e.toString() };
  }
});
console.log('DB state:', JSON.stringify(loadResult));

// Check what's visible on the page
const domState = await page.evaluate(() => {
  return {
    hasLibraryContent: !!document.querySelector('.library-content'),
    hasEmptyState: !!document.querySelector('.empty-state'),
    hasAlbumPane: !!document.querySelector('[data-testid="album-list-pane"]'),
    albumCount: document.querySelectorAll('[data-testid="album-list-item"]').length,
    trackCountText: document.querySelector('.track-count')?.textContent ?? null,
    libraryPageExists: !!document.querySelector('.library-page')
  };
});
console.log('DOM:', JSON.stringify(domState));

await browser.close();
