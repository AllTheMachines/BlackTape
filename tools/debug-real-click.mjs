// Simulate real user: navigate to Radiohead page, then click KID A MNESIA link
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

// Navigate to Radiohead page (full reload)
await page.evaluate(() => { window.location.href = '/artist/radiohead'; });
await page.waitForTimeout(5000);

// Wait for KID A MNESIA link
const kidAHref = '/artist/radiohead/release/6f25f9fb-e9e3-4c0d-8904-ecb8b46cd8aa';
const link = page.locator(`a[href="${kidAHref}"]`).first();
const exists = await link.isVisible().catch(() => false);
console.log('KID A MNESIA link visible:', exists);

if (!exists) {
  console.log('Link not found, checking all release hrefs...');
  const all = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="/release/"]')).map(a => a.getAttribute('href'))
  );
  console.log('All release links:', all.slice(0, 10));
  await browser.close();
  process.exit(1);
}

// Click the link (SvelteKit SPA navigation)
console.log('Clicking KID A MNESIA link...');
await link.click();

// Wait for navigation and component mount
await page.waitForTimeout(12000);

const state = await page.evaluate(() => ({
  loadingText: document.querySelector('.release-loading p')?.textContent,
  hasRelease: !!document.querySelector('.release-hero'),
  url: window.location.pathname,
  releaseTitle: document.querySelector('.release-title')?.textContent
}));

console.log('\n--- Final state ---', state);
console.log('\n--- All logs ---');
logs.forEach(l => console.log(l));

await browser.close();
