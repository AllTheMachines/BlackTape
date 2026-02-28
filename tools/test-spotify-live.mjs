/**
 * Live Spotify Connect test — clicks the button, captures everything.
 */
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

// Navigate to Radiohead
await page.evaluate(() => { window.location.href = '/artist/radiohead'; });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

// Snapshot before click
const before = await page.evaluate(() => ({
	spotifyPill: document.querySelector('[data-testid="platform-pill-spotify"]')?.textContent?.trim(),
	playerBar: !!document.querySelector('.player-bar'),
	streamingBar: !!document.querySelector('.streaming-bar'),
	streamingDot: !!document.querySelector('.streaming-dot'),
	streamingLabel: document.querySelector('.streaming-label')?.textContent?.trim(),
	activePillText: document.querySelector('.platform-pill--spotify.active')?.textContent?.trim(),
	tauriMode: document.documentElement.dataset.tauri ?? 'unknown',
	spotifyConnected: null, // can't easily read $state from outside
}));
console.log('BEFORE:', JSON.stringify(before, null, 2));

// Click the Spotify pill
const pill = await page.$('[data-testid="platform-pill-spotify"]');
if (!pill) { console.log('ERROR: Spotify pill not found'); process.exit(1); }

const pillText = await pill.textContent();
console.log(`Clicking pill: "${pillText?.trim()}"`);
await pill.click();  // use real Playwright click (not evaluate)

// Wait for async API calls
await page.waitForTimeout(5000);

// Snapshot after click
const after = await page.evaluate(() => ({
	spotifyPill: document.querySelector('[data-testid="platform-pill-spotify"]')?.textContent?.trim(),
	playerBar: !!document.querySelector('.player-bar'),
	streamingBar: !!document.querySelector('.streaming-bar'),
	streamingDot: !!document.querySelector('.streaming-dot'),
	streamingLabel: document.querySelector('.streaming-label')?.textContent?.trim(),
	activePillText: document.querySelector('.platform-pill--spotify.active')?.textContent?.trim(),
	spotifyError: document.querySelector('.spotify-play-error')?.textContent?.trim(),
}));
console.log('AFTER:', JSON.stringify(after, null, 2));

console.log('\nConsole logs:');
logs.forEach(l => console.log(l));

await browser.close().catch(() => {});
