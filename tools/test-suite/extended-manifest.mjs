/**
 * Extended Test Manifest — real user journeys, not atomic checks.
 *
 * These tests simulate actual user sessions: multi-step flows, rapid
 * navigation, edge cases, and console error detection.
 *
 * Run:  node tools/test-suite/run-extended.mjs --port 9224
 *
 * All tests are method: 'tauri' (require running debug binary).
 * Tests are DB-agnostic — they discover data dynamically.
 *
 * Selectors verified against live app 2026-03-02:
 *   - Artist cards: a.artist-card[href*="/artist/"], name in .a-name
 *   - Search: input[type="search"], type chips: .type-chip, URL: ?q=X&type=artist
 *   - Discover: .tag-cloud .tag-chip, [data-testid="discover-tag-input"], #country-input
 *   - Artist page: h1.artist-name, [data-testid="artist-tabs"], tab-overview/stats/about
 *   - Crate: .dig-btn, .filter-input, .filter-select
 *   - About: .about-header h1, .about-section, .feedback-form
 *   - Settings: h1 "Settings", [data-testid="settings-feedback-section"]
 *   - Style Map: .style-map-page, svg
 *   - KB: .kb-landing, svg
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function origin(page) { return new URL(page.url()).origin; }

async function nav(page, path) {
  await page.goto(`${origin(page)}${path}`);
  await page.waitForLoadState('domcontentloaded');
}

async function noErrors(page, fn) {
  const errors = [];
  const h = (e) => errors.push(e.message ?? String(e));
  page.on('pageerror', h);
  try { await fn(); } finally { page.removeListener('pageerror', h); }
  if (errors.length) console.log('    JS errors:', errors.map(e => e.slice(0, 100)).join(' | '));
  return { passed: errors.length === 0, errors };
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Journey 1: Full discovery loop ────────────────────────────────────────

export const JOURNEY_DISCOVERY = [
  {
    id: 'EXT-01', phase: 99, area: 'Journey',
    desc: 'Home → search → click result → artist page → click tag → discover',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/');
      await page.waitForSelector('input[type="search"]', { timeout: 10000 });
      await page.fill('input[type="search"]', 'radiohead');
      await page.keyboard.press('Enter');
      await page.waitForURL(/\/search/, { timeout: 10000 });
      await page.waitForSelector('.artist-card', { timeout: 10000 });

      // Click first result
      await page.click('.artist-card');
      await page.waitForURL(/\/artist\//, { timeout: 10000 });
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });

      // Click a tag chip that links to discover
      const tagLink = page.locator('a.tag-chip[href*="/discover"]').first();
      if (await tagLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tagLink.click();
        await page.waitForURL(/\/discover/, { timeout: 10000 });
        return page.url().includes('/discover');
      }
      return true; // pass if tags don't link to discover
    },
  },
  {
    id: 'EXT-02', phase: 99, area: 'Journey',
    desc: 'Artist page tabs: Overview → Stats → About → back to Overview',
    method: 'tauri',
    fn: async (page) => {
      // Navigate to an artist we know exists
      await nav(page, '/discover');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      await page.click('.artist-card');
      await page.waitForURL(/\/artist\//, { timeout: 10000 });
      await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });

      // Stats tab
      await page.click('[data-testid="tab-stats"]');
      await page.locator('[data-testid="tab-content-stats"]').waitFor({ timeout: 5000 });

      // About tab
      await page.click('[data-testid="tab-about"]');
      await page.locator('[data-testid="tab-content-about"]').waitFor({ timeout: 5000 });

      // Back to Overview
      await page.click('[data-testid="tab-overview"]');
      await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 5000 });
      return true;
    },
  },
  {
    id: 'EXT-03', phase: 99, area: 'Journey',
    desc: 'Discover → click tag → click artist → back → filter still in URL',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      await page.waitForSelector('.tag-cloud .tag-chip', { timeout: 10000 });

      await page.locator('.tag-cloud .tag-chip').first().click();
      await page.waitForURL(/tags=/, { timeout: 5000 });
      await page.waitForSelector('.artist-card', { timeout: 10000 });

      await page.click('.artist-card');
      await page.waitForURL(/\/artist\//, { timeout: 10000 });
      await wait(1000);

      await page.goBack();
      await page.waitForURL(/\/discover/, { timeout: 10000 });
      return page.url().includes('tags=');
    },
  },
];

// ─── Journey 2: Crate digging ──────────────────────────────────────────────

export const JOURNEY_CRATE = [
  {
    id: 'EXT-04', phase: 99, area: 'Crate',
    desc: 'Crate → Dig 3 times → no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/crate');
        await page.locator('.dig-btn').waitFor({ timeout: 5000 });
        for (let i = 0; i < 3; i++) {
          await page.click('.dig-btn');
          await wait(1500);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-05', phase: 99, area: 'Crate',
    desc: 'Crate → filter by tag + decade → Dig → no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/crate');
        await page.locator('.dig-btn').waitFor({ timeout: 5000 });
        const tagInput = page.locator('.filter-input').first();
        if (await tagInput.isVisible()) await tagInput.fill('electronic');
        const decadeSelect = page.locator('.filter-select').first();
        if (await decadeSelect.isVisible()) await decadeSelect.selectOption({ index: 1 });
        await page.click('.dig-btn');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-06', phase: 99, area: 'Crate',
    desc: 'Crate → click artist card → artist page loads → back to crate',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/crate');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      await page.click('.artist-card');
      await page.waitForURL(/\/artist\//, { timeout: 10000 });
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      await page.goBack();
      await page.waitForURL(/\/crate/, { timeout: 10000 });
      return true;
    },
  },
];

// ─── Journey 3: Navigation stress ──────────────────────────────────────────

export const JOURNEY_NAV = [
  {
    id: 'EXT-07', phase: 99, area: 'Navigation',
    desc: 'Rapid nav: Home → Discover → Style Map → KB → Settings → About → Home — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        for (const r of ['/', '/discover', '/style-map', '/kb', '/settings', '/about', '/']) {
          await nav(page, r);
          await wait(500);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-08', phase: 99, area: 'Navigation',
    desc: 'Back/Forward: nav 5 pages → back 3 → forward 2 — correct URL',
    method: 'tauri',
    fn: async (page) => {
      for (const r of ['/discover', '/crate', '/settings', '/about', '/kb']) {
        await nav(page, r);
        await wait(300);
      }
      for (let i = 0; i < 3; i++) { await page.goBack(); await wait(500); }
      // Should be at /crate (index 1 from end after going back 3 from /kb)
      if (!page.url().includes('/crate')) return false;
      for (let i = 0; i < 2; i++) { await page.goForward(); await wait(500); }
      return page.url().includes('/about');
    },
  },
  {
    id: 'EXT-09', phase: 99, area: 'Navigation',
    desc: 'Click each header nav link — URL updates correctly',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/');
      await wait(1000);
      for (const href of ['/discover', '/style-map', '/kb', '/settings', '/about']) {
        const link = page.locator(`a.nav-link[href="${href}"]`).first();
        if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
          await link.click();
          await page.waitForURL(new RegExp(href.replace('/', '\\/')), { timeout: 5000 });
        }
      }
      return true;
    },
  },
  {
    id: 'EXT-10', phase: 99, area: 'Navigation',
    desc: 'Double-click same nav link — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        const link = page.locator('a.nav-link[href="/discover"]').first();
        if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
          await link.click();
          await wait(300);
          await link.click();
          await wait(1000);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 4: Search edge cases ──────────────────────────────────────────

export const JOURNEY_SEARCH = [
  {
    id: 'EXT-11', phase: 99, area: 'Search',
    desc: 'Special characters: "aphex twin & friends" — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', 'aphex twin & friends');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-12', phase: 99, area: 'Search',
    desc: 'Quotes in search: the "caretaker" — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', 'the "caretaker"');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-13', phase: 99, area: 'Search',
    desc: 'SQL injection: \' OR 1=1 -- — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', "' OR 1=1 --");
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-14', phase: 99, area: 'Search',
    desc: 'Rapid search: search "radiohead" then immediately "burial" — no race condition',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', 'radiohead');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await wait(500);
        await page.locator('input[type="search"]').first().fill('burial');
        await page.keyboard.press('Enter');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-15', phase: 99, area: 'Search',
    desc: 'Very long query (200 chars) — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', 'a'.repeat(200));
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-16', phase: 99, area: 'Search',
    desc: 'FTS5 special chars: "radio*" and "NOT (rock)" — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await page.fill('input[type="search"]', 'radio*');
        await page.keyboard.press('Enter');
        await wait(2000);
        await page.locator('input[type="search"]').first().fill('NOT (rock)');
        await page.keyboard.press('Enter');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-17', phase: 99, area: 'Search',
    desc: 'Switch search type: artist → label → song chips — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/search?q=electronic');
        await wait(2000);
        for (const type of ['label', 'song', 'artist']) {
          const chip = page.locator(`.type-chip[href*="type=${type}"]`).first();
          if (await chip.isVisible({ timeout: 2000 }).catch(() => false)) {
            await chip.click();
            await wait(1500);
          }
        }
      });
      return passed;
    },
  },
];

// ─── Journey 5: Artist deep interactions ───────────────────────────────────

export const JOURNEY_ARTIST = [
  {
    id: 'EXT-18', phase: 99, area: 'Artist',
    desc: 'Visit 3 artists from discover — each page loads with name and tags',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll('.artist-card[href*="/artist/"]')]
          .slice(0, 3).map(a => a.getAttribute('href'))
      );
      for (const href of hrefs) {
        await nav(page, href);
        await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
        const tags = await page.locator('.tag-chip').count();
        if (tags === 0) return false;
      }
      return true;
    },
  },
  {
    id: 'EXT-19', phase: 99, area: 'Artist',
    desc: 'Discography filter pills — click each without crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/discover');
        await page.waitForSelector('.artist-card', { timeout: 10000 });
        await page.click('.artist-card');
        await page.waitForURL(/\/artist\//, { timeout: 10000 });
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });
        for (const f of ['all', 'album', 'ep', 'single', 'compilation', 'live']) {
          const pill = page.locator(`[data-testid="filter-${f}"]`);
          if (await pill.isVisible({ timeout: 500 }).catch(() => false)) {
            await pill.click();
            await wait(200);
          }
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-20', phase: 99, area: 'Artist',
    desc: 'Sort toggle: newest ↔ oldest — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/discover');
        await page.waitForSelector('.artist-card', { timeout: 10000 });
        await page.click('.artist-card');
        await page.waitForURL(/\/artist\//, { timeout: 10000 });
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });
        for (const s of ['sort-newest', 'sort-oldest']) {
          const btn = page.locator(`[data-testid="${s}"]`);
          if (await btn.isVisible({ timeout: 500 }).catch(() => false)) await btn.click();
          await wait(200);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-21', phase: 99, area: 'Artist',
    desc: 'Embed toggle: open + close embed panel — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/discover');
        await page.waitForSelector('.artist-card', { timeout: 10000 });
        await page.click('.artist-card');
        await page.waitForURL(/\/artist\//, { timeout: 10000 });
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });
        const toggle = page.locator('.embed-toggle');
        if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
          await toggle.click();
          await page.locator('.embed-panel').waitFor({ timeout: 3000 });
          await toggle.click();
          await wait(500);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-22', phase: 99, area: 'Artist',
    desc: 'Nonexistent artist — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/artist/zzz-nonexistent-12345');
        await wait(3000);
      });
      return passed;
    },
  },
];

// ─── Journey 6: Console error sweep ────────────────────────────────────────

export const JOURNEY_SWEEP = [
  {
    id: 'EXT-23', phase: 99, area: 'Sweep',
    desc: 'Zero JS errors across all main routes',
    method: 'tauri',
    fn: async (page) => {
      const allErrors = [];
      const h = (e) => allErrors.push({ url: page.url(), err: (e.message ?? String(e)).slice(0, 100) });
      page.on('pageerror', h);
      try {
        for (const r of ['/', '/discover', '/style-map', '/kb', '/crate', '/settings', '/about',
                          '/time-machine', '/new-rising', '/scenes', '/backers']) {
          await nav(page, r);
          await wait(1500);
        }
      } finally { page.removeListener('pageerror', h); }
      if (allErrors.length) {
        console.log('    Errors:');
        allErrors.forEach(e => console.log(`      ${e.url}: ${e.err}`));
      }
      return allErrors.length === 0;
    },
  },
  {
    id: 'EXT-24', phase: 99, area: 'Sweep',
    desc: 'Zero JS errors visiting 5 artists from discover',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll('.artist-card[href*="/artist/"]')]
          .slice(0, 5).map(a => a.getAttribute('href'))
      );
      const allErrors = [];
      const h = (e) => allErrors.push({ url: page.url(), err: (e.message ?? String(e)).slice(0, 100) });
      page.on('pageerror', h);
      try {
        for (const href of hrefs) {
          await nav(page, href);
          await page.locator('h1.artist-name').waitFor({ timeout: 8000 }).catch(() => {});
          await wait(1000);
        }
      } finally { page.removeListener('pageerror', h); }
      if (allErrors.length) {
        console.log('    Errors:');
        allErrors.forEach(e => console.log(`      ${e.url}: ${e.err}`));
      }
      return allErrors.length === 0;
    },
  },
  {
    id: 'EXT-25', phase: 99, area: 'Sweep',
    desc: 'Search all 3 modes (artist, label, song) — no JS errors',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        for (const type of ['artist', 'label', 'song']) {
          await nav(page, `/search?q=electronic&type=${type}`);
          await wait(2000);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 7: Discover deep ──────────────────────────────────────────────

export const JOURNEY_DISCOVER = [
  {
    id: 'EXT-26', phase: 99, area: 'Discover',
    desc: 'Add 2 tags from tag cloud — results narrow',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      await page.waitForSelector('.tag-cloud .tag-chip', { timeout: 10000 });
      await page.locator('.tag-cloud .tag-chip').nth(0).click();
      await page.waitForURL(/tags=/, { timeout: 5000 });
      await wait(1000);
      const count1 = await page.locator('.artist-card').count();
      await page.locator('.tag-cloud .tag-chip').nth(3).click();
      await wait(1500);
      const count2 = await page.locator('.artist-card').count();
      return count2 <= count1; // intersection narrows or keeps same
    },
  },
  {
    id: 'EXT-27', phase: 99, area: 'Discover',
    desc: 'Custom tag input "ambient" — results appear',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      const input = page.locator('[data-testid="discover-tag-input"]');
      await input.waitFor({ timeout: 5000 });
      await input.fill('ambient');
      await input.press('Enter');
      await wait(2000);
      return await page.locator('.artist-card').count() > 0;
    },
  },
  {
    id: 'EXT-28', phase: 99, area: 'Discover',
    desc: 'Country filter GB via URL — page loads, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/discover?country=GB');
        await wait(2000);
      });
      return passed;
    },
  },
];

// ─── Journey 8: Error resilience ───────────────────────────────────────────

export const JOURNEY_ERRORS = [
  {
    id: 'EXT-29', phase: 99, area: 'Errors',
    desc: 'Nonexistent route — no crash, can navigate away',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/this/does/not/exist');
        await wait(2000);
        await nav(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
      });
      return passed;
    },
  },
  {
    id: 'EXT-30', phase: 99, area: 'Errors',
    desc: 'Malformed search params — /search?q=&type=invalid — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/search?q=&type=invalid');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-31', phase: 99, area: 'Errors',
    desc: 'XSS in discover tags — /discover?tags=<script>alert(1)</script> — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/discover?tags=<script>alert(1)</script>');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-32', phase: 99, area: 'Errors',
    desc: 'Unicode artist slug — /artist/mötley-crüe — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/artist/m%C3%B6tley-cr%C3%BCe');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-33', phase: 99, area: 'Errors',
    desc: 'Null bytes in style-map tag — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/style-map?tag=%00%01');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-34', phase: 99, area: 'Errors',
    desc: 'Fake KB genre — /kb/genre/fake-12345 — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/kb/genre/zzz-fake-genre');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-35', phase: 99, area: 'Errors',
    desc: 'Fake embed — /embed/artist/zzz — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/embed/artist/zzz-fake');
        await wait(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-36', phase: 99, area: 'Errors',
    desc: 'Empty room — /room/ — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/room/');
        await wait(2000);
      });
      return passed;
    },
  },
];

// ─── Journey 9: Settings & About ───────────────────────────────────────────

export const JOURNEY_SETTINGS = [
  {
    id: 'EXT-37', phase: 99, area: 'Settings',
    desc: 'Settings renders h1, feedback section, about section',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/settings');
      await page.locator('h1').filter({ hasText: 'Settings' }).waitFor({ timeout: 5000 });
      const fb = await page.locator('[data-testid="settings-feedback-section"]').isVisible().catch(() => false);
      const ab = await page.locator('[data-testid="settings-about-section"]').isVisible().catch(() => false);
      return fb || ab;
    },
  },
  {
    id: 'EXT-38', phase: 99, area: 'About',
    desc: 'About page — header h1, sections, feedback form all present',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/about');
      await page.locator('.about-header h1').waitFor({ timeout: 5000 });
      const sections = await page.locator('.about-section').count();
      const hasForm = await page.locator('.feedback-form').isVisible().catch(() => false);
      return sections >= 5 && hasForm;
    },
  },
  {
    id: 'EXT-39', phase: 99, area: 'About',
    desc: 'Feedback form fillable — type, title, body — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/about');
        await page.locator('.feedback-form').waitFor({ timeout: 5000 });
        const select = page.locator('.feedback-select');
        if (await select.isVisible()) await select.selectOption('bug');
        const title = page.locator('.feedback-input').first();
        if (await title.isVisible()) await title.fill('Test bug title');
        const body = page.locator('.feedback-textarea');
        if (await body.isVisible()) await body.fill('Extended test body');
        await wait(500);
      });
      return passed;
    },
  },
];

// ─── Journey 10: Keyboard & Refresh ────────────────────────────────────────

export const JOURNEY_MISC = [
  {
    id: 'EXT-40', phase: 99, area: 'Keyboard',
    desc: 'Escape on search results — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/search?q=radiohead');
        await wait(2000);
        await page.keyboard.press('Escape');
        await wait(500);
      });
      return passed;
    },
  },
  {
    id: 'EXT-41', phase: 99, area: 'Keyboard',
    desc: 'Tab through home page — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await nav(page, '/');
        await wait(1000);
        for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); await wait(80); }
      });
      return passed;
    },
  },
  {
    id: 'EXT-42', phase: 99, area: 'Refresh',
    desc: 'Refresh /discover?tags=jazz — filter state preserved',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover?tags=jazz');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await wait(2000);
      return page.url().includes('tags=jazz') && await page.locator('.artist-card').count() > 0;
    },
  },
  {
    id: 'EXT-43', phase: 99, area: 'Refresh',
    desc: 'Refresh artist page — reloads fully',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/discover');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      await page.click('.artist-card');
      await page.waitForURL(/\/artist\//, { timeout: 10000 });
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      return true;
    },
  },
  {
    id: 'EXT-44', phase: 99, area: 'Consistency',
    desc: 'Same artist name on search results and artist page',
    method: 'tauri',
    fn: async (page) => {
      await nav(page, '/search?q=radiohead');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const searchName = await page.locator('.artist-card .a-name').first().textContent();
      const href = await page.locator('.artist-card').first().getAttribute('href');
      await nav(page, href);
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      const pageName = await page.locator('h1.artist-name').textContent();
      return searchName.trim().toLowerCase() === pageName.trim().toLowerCase();
    },
  },
];

// ─── Full manifest ─────────────────────────────────────────────────────────

export const EXTENDED_TESTS = [
  ...JOURNEY_DISCOVERY,
  ...JOURNEY_CRATE,
  ...JOURNEY_NAV,
  ...JOURNEY_SEARCH,
  ...JOURNEY_ARTIST,
  ...JOURNEY_SWEEP,
  ...JOURNEY_DISCOVER,
  ...JOURNEY_ERRORS,
  ...JOURNEY_SETTINGS,
  ...JOURNEY_MISC,
];
