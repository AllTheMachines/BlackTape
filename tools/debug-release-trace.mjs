// Debug: inject console.log tracing into the running page to find where loadRelease() hangs
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

// Capture console logs
page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));

// Navigate to Radiohead artist page
await page.evaluate(() => { window.location.href = '/artist/radiohead'; });
await page.waitForTimeout(3000);

// Get Radiohead's first release group MBID from the page
const releaseInfo = await page.evaluate(() => {
  const cards = document.querySelectorAll('a[href*="/release/"]');
  const links = Array.from(cards).map(a => a.getAttribute('href')).filter(Boolean);
  return links.slice(0, 5);
});
console.log('Release links found:', releaseInfo);

// Find KID A MNESIA or just use first release
const kidALink = releaseInfo.find(l => l.toLowerCase().includes('kid')) ?? releaseInfo[0];
if (!kidALink) {
  console.log('No release links found — MB releases may not have loaded yet');
  await browser.close();
  process.exit(1);
}

console.log('Navigating to:', kidALink);

// Inject tracing BEFORE navigating to the release page
// by overriding fetch to log requests/responses
await page.evaluate(() => {
  const origFetch = window.fetch;
  window.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes('musicbrainz')) {
      console.log('[TRACE] fetch START:', urlStr.slice(0, 80));
      const t = Date.now();
      try {
        const resp = await origFetch(url, opts);
        console.log('[TRACE] fetch HEADERS received:', resp.status, 'after', Date.now() - t, 'ms');
        return resp;
      } catch (e) {
        console.log('[TRACE] fetch ERROR after', Date.now() - t, 'ms:', String(e));
        throw e;
      }
    }
    return origFetch(url, opts);
  };
  console.log('[TRACE] fetch interceptor installed');
});

// Navigate to the release page
await page.evaluate((href) => { window.location.href = href; }, kidALink);

// Wait up to 15 seconds and collect logs
console.log('\nWaiting 15s for loadRelease() to complete or timeout...\n');
await page.waitForTimeout(15000);

// Check final state
const state = await page.evaluate(() => {
  const loading = document.querySelector('.release-loading p');
  return {
    text: loading?.textContent ?? 'not found',
    hasRelease: !!document.querySelector('.release-hero'),
    url: window.location.href
  };
});
console.log('\nFinal state:', state);

await browser.close();
