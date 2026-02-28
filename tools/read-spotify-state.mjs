import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

// Use the already-loaded Tauri IPC (window.__TAURI_INTERNALS__)
const result = await page.evaluate(async () => {
  const ipc = window.__TAURI_INTERNALS__;
  if (!ipc) return { error: 'No Tauri IPC' };

  try {
    const settings = await ipc.invoke('get_all_ai_settings', {});
    const spotify = {};
    for (const [k, v] of Object.entries(settings)) {
      if (k.startsWith('spotify')) spotify[k] = v ? v.substring(0, 8) + '...' : '(empty)';
    }
    return spotify;
  } catch (e) {
    return { error: String(e) };
  }
});

console.log('Spotify DB state:', JSON.stringify(result, null, 2));
await browser.close();
