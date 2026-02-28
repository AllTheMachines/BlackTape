// Debug: find KID A MNESIA on the Radiohead page and test its MB fetch
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

// Navigate to Radiohead artist page and wait for releases to load
await page.evaluate(() => { window.location.href = '/artist/radiohead'; });
await page.waitForTimeout(5000);

// Get ALL release links and their text
const releases = await page.evaluate(() => {
  const cards = document.querySelectorAll('a[href*="/release/"]');
  return Array.from(cards).map(a => ({
    href: a.getAttribute('href'),
    text: a.textContent?.trim().slice(0, 50)
  }));
});

console.log('All releases on page:');
releases.forEach(r => console.log(' ', r.href?.split('/').pop(), '|', r.text));

// Find KID A MNESIA
const kidA = releases.find(r => r.text?.toUpperCase().includes('KID A MNESIA'));
if (!kidA) {
  console.log('\nKID A MNESIA not found on page - may be filtered out by MB type filter');
  // Test the MB API directly for Radiohead releases to see if KID A MNESIA appears
  const mbResult = await page.evaluate(async () => {
    const resp = await fetch('https://musicbrainz.org/ws/2/release-group?artist=a74b1b7f-71a5-4011-9441-d0b5e4122711&inc=url-rels&type=album|single|ep&fmt=json&limit=50', {
      headers: { 'User-Agent': 'Mercury/0.1.0' }
    });
    const data = await resp.json();
    return data['release-groups']?.map(rg => ({ id: rg.id, title: rg.title, type: rg['primary-type'] }));
  });
  console.log('\nMB release groups (album|single|ep):');
  mbResult?.forEach(rg => console.log(' ', rg.type, '|', rg.title, '|', rg.id));
  await browser.close();
  process.exit(0);
}

console.log('\nFound KID A MNESIA:', kidA.href);
const mbid = kidA.href.split('/').pop();
console.log('Release group MBID:', mbid);

// Test the exact URL that loadRelease() uses
const result = await page.evaluate(async (mbid) => {
  const url = `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=recordings+artist-credits+media+artist-rels+url-rels&limit=1&fmt=json`;
  console.log('[DEBUG] Testing URL:', url);
  const t = Date.now();
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mercury/0.1.0' }, signal: controller.signal });
    const elapsed = Date.now() - t;
    const data = await resp.json();
    return {
      status: resp.status,
      elapsed,
      releasesCount: data.releases?.length ?? 0,
      firstReleaseTitle: data.releases?.[0]?.title,
      error: data.error
    };
  } catch (e) {
    return { error: String(e), elapsed: Date.now() - t };
  }
}, mbid);

console.log('\nMB fetch result for KID A MNESIA:');
console.log(JSON.stringify(result, null, 2));

await browser.close();
