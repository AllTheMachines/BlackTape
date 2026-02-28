import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

const clientId = await page.evaluate(async () => {
  try {
    const { invoke } = await import('/node_modules/@tauri-apps/api/core.js');
    const settings = await invoke('get_all_ai_settings');
    return settings['spotify_client_id'] || '(empty)';
  } catch (e) {
    // Try via window.__TAURI__
    if (window.__TAURI__) {
      const settings = await window.__TAURI__.core.invoke('get_all_ai_settings');
      return settings['spotify_client_id'] || '(empty)';
    }
    return 'error: ' + e.message;
  }
});

console.log('Stored client ID:', clientId);

// Also check spotifyState via the DOM
const state = await page.evaluate(() => {
  // Try to access the Svelte state via the global app state
  return {
    spotifyConnected: document.querySelector('[data-testid="spotify-settings"]')?.textContent?.includes('Connected') ?? false
  };
});
console.log('Connected state visible:', state);

await browser.close();
