// Debug: test loadRelease() MB fetch for a Radiohead release via CDP
import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const [context] = browser.contexts();
const [page] = context.pages();

const result = await page.evaluate(async () => {
  // Get Radiohead slug from DB
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  const artists = await invoke('query_mercury_db', {
    sql: "SELECT slug, mbid FROM artists WHERE name = 'Radiohead' LIMIT 1", params: []
  });
  if (!artists.length) return { error: 'Radiohead not found in DB' };
  const { slug, mbid } = artists[0];

  // Test the MB release-group fetch
  const url = `https://musicbrainz.org/ws/2/release-group?artist=${mbid}&inc=url-rels&type=album|single|ep&fmt=json&limit=5`;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mercury/0.1.0' }, signal: controller.signal });
    const data = await resp.json();
    const firstRg = data['release-groups']?.[0];
    if (!firstRg) return { error: 'No release groups', status: resp.status };

    // Test the actual release fetch that loadRelease() uses
    const releaseUrl = `https://musicbrainz.org/ws/2/release?release-group=${firstRg.id}&inc=recordings+artist-credits+media+artist-rels+url-rels&limit=1&fmt=json`;
    const controller2 = new AbortController();
    const t = Date.now();
    setTimeout(() => controller2.abort(), 5000);
    const resp2 = await fetch(releaseUrl, { headers: { 'User-Agent': 'Mercury/0.1.0' }, signal: controller2.signal });
    const data2 = await resp2.json();
    return {
      slug, mbid, firstRelease: firstRg.title, firstRgMbid: firstRg.id,
      releaseStatus: resp2.status, elapsed: Date.now() - t,
      releases: data2.releases?.length, error: data2.error
    };
  } catch (e) {
    return { error: e.toString() };
  }
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
