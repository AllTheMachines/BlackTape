// Simulate real user navigation: artist page → click KID A MNESIA → check release page
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

const logs = [];
const start = Date.now();
const ts = () => `+${Date.now() - start}ms`;

page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[LR]') || text.includes('[MOUNT]') || text.includes('[loadRelease]')) {
    logs.push(`${ts()} ${text}`);
    console.log(`${ts()} ${text}`);
  }
});

// Start on the home page, navigate to Radiohead artist page via SPA navigation
await page.evaluate(() => { window.location.href = '/'; });
await page.waitForTimeout(3000);

// Now use SvelteKit goto for client-side navigation to Radiohead
await page.evaluate(() => {
  window.location.href = '/artist/radiohead';
});
await page.waitForTimeout(5000);

// Check what release links are visible
const releaseLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a[href*="/release/"]'))
    .map(a => ({ href: a.getAttribute('href'), text: a.textContent?.trim().slice(0, 40) }))
    .filter(r => r.text && r.text.length > 0);
});
console.log('Release links:', releaseLinks.slice(0, 6).map(r => `${r.text} → ${r.href}`));

// Find KID A MNESIA link
const kidAMbid = '6f25f9fb-e9e3-4c0d-8904-ecb8b46cd8aa';
const kidAHref = `/artist/radiohead/release/${kidAMbid}`;

// Use goto() to navigate (SPA navigation, like a user click)
console.log('\nUsing goto() for SPA navigation to release page...');
await page.evaluate((href) => {
  // Use SvelteKit's client-side navigation
  const { goto } = window.__sveltekit_internal ?? {};
  if (goto) {
    goto(href);
  } else {
    // Fallback: use history.pushState and dispatch popstate (SPA-like)
    history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }
}, kidAHref);

await page.waitForTimeout(12000);

const state = await page.evaluate(() => ({
  loadingText: document.querySelector('.release-loading p')?.textContent,
  hasRelease: !!document.querySelector('.release-hero'),
  url: window.location.pathname
}));

console.log('\n--- Final state ---', state);
console.log('\n--- All logs ---');
logs.forEach(l => console.log(l));

await browser.close();
