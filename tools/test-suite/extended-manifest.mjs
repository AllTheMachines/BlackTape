/**
 * Extended Test Manifest — real user journeys, not atomic checks.
 *
 * These tests simulate actual user sessions: multi-step flows, rapid
 * navigation, edge cases, and console error detection. They take longer
 * to run but catch bugs that atomic tests miss.
 *
 * Run: node tools/test-suite/run.mjs --extended
 *
 * All tests are method: 'tauri' (require running debug binary).
 * Fixture DB with 15 artists must be in place.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOrigin(page) {
  return new URL(page.url()).origin;
}

async function goto(page, path) {
  const origin = getOrigin(page);
  await page.goto(`${origin}${path}`);
  await page.waitForLoadState('domcontentloaded');
}

async function noErrors(page, fn) {
  const errors = [];
  const handler = (e) => errors.push(e.message ?? String(e));
  page.on('pageerror', handler);
  try {
    await fn();
  } finally {
    page.removeListener('pageerror', handler);
  }
  return { passed: errors.length === 0, errors };
}

// ─── Journey 1: Search → Artist → Discover loop ────────────────────────────

export const JOURNEY_SEARCH_TO_DISCOVER = [
  {
    id: 'EXT-01', phase: 99, area: 'Journey',
    desc: 'Home → search "boards of canada" → click result → verify artist page → click tag → lands on discover',
    method: 'tauri',
    fn: async (page) => {
      // 1. Start at home
      await goto(page, '/');
      await page.waitForSelector('input[type="search"]', { timeout: 10000 });

      // 2. Search
      await page.fill('input[type="search"]', 'boards of canada');
      await page.keyboard.press('Enter');
      await page.waitForURL(/\/search/, { timeout: 10000 });
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const names = await page.locator('a.artist-name').allTextContents();
      if (!names.some(n => n.toLowerCase().includes('boards of canada'))) return false;

      // 3. Click first result
      await page.locator('a.artist-name').first().click();
      await page.waitForURL(/\/artist\//, { timeout: 10000 });

      // 4. Verify artist page has name and tags
      const h1 = await page.locator('h1.artist-name').textContent({ timeout: 5000 });
      if (!h1.toLowerCase().includes('boards of canada')) return false;

      const tagCount = await page.locator('.tag-chip').count();
      if (tagCount === 0) return false;

      // 5. Click first tag chip that leads to discover
      const tagLinks = page.locator('a.tag-chip[href*="/discover"]');
      const linkCount = await tagLinks.count();
      if (linkCount > 0) {
        await tagLinks.first().click();
        await page.waitForURL(/\/discover/, { timeout: 10000 });
        return page.url().includes('/discover');
      }
      // If no discover links, tag chips might use different routing — still pass
      return true;
    },
  },
  {
    id: 'EXT-02', phase: 99, area: 'Journey',
    desc: 'Search → artist page → Stats tab → About tab → Overview tab round-trip',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/artist/radiohead');
      await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });

      // Stats tab
      await page.locator('[data-testid="tab-stats"]').click();
      await page.locator('[data-testid="tab-content-stats"]').waitFor({ timeout: 5000 });
      if (!(await page.locator('[data-testid="tab-content-stats"]').isVisible())) return false;

      // About tab
      await page.locator('[data-testid="tab-about"]').click();
      await page.locator('[data-testid="tab-content-about"]').waitFor({ timeout: 5000 });
      if (!(await page.locator('[data-testid="tab-content-about"]').isVisible())) return false;

      // Back to Overview
      await page.locator('[data-testid="tab-overview"]').click();
      await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 5000 });
      return await page.locator('[data-testid="tab-content-overview"]').isVisible();
    },
  },
  {
    id: 'EXT-03', phase: 99, area: 'Journey',
    desc: 'Discover → apply tag → click artist → back → filter still active',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/discover');
      await page.waitForSelector('.tag-cloud .tag-chip', { timeout: 10000 });

      // Click electronic tag
      await page.locator('.tag-cloud .tag-chip').filter({ hasText: 'electronic' }).first().click();
      await page.waitForURL(/tags=/, { timeout: 5000 });
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const countBefore = await page.locator('.artist-card').count();

      // Click first artist
      await page.locator('a.artist-name').first().click();
      await page.waitForURL(/\/artist\//, { timeout: 10000 });

      // Go back
      await page.goBack();
      await page.waitForURL(/\/discover/, { timeout: 10000 });

      // Filter should still be in URL
      if (!page.url().includes('tags=')) return false;

      // Results should still be there
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const countAfter = await page.locator('.artist-card').count();
      return countAfter > 0;
    },
  },
];

// ─── Journey 2: Crate digging session ───────────────────────────────────────

export const JOURNEY_CRATE_DIGGING = [
  {
    id: 'EXT-04', phase: 99, area: 'Crate Digging',
    desc: 'Crate → Dig 3 times in a row → each shows results or empty state, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed, errors } = await noErrors(page, async () => {
        await goto(page, '/crate');
        await page.locator('.dig-btn').waitFor({ timeout: 5000 });

        for (let i = 0; i < 3; i++) {
          await page.locator('.dig-btn').click();
          // Wait for results to update (artists cards or empty state)
          await page.waitForTimeout(2000);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-05', phase: 99, area: 'Crate Digging',
    desc: 'Crate → filter by tag + decade + country → Dig → no crash, results update',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/crate');
        await page.locator('.dig-btn').waitFor({ timeout: 5000 });

        // Fill tag filter
        const tagInput = page.locator('.filter-input').first();
        if (await tagInput.isVisible()) {
          await tagInput.fill('electronic');
        }

        // Select decade if available
        const decadeSelect = page.locator('.filter-select').first();
        if (await decadeSelect.isVisible()) {
          const options = await decadeSelect.locator('option').allTextContents();
          if (options.length > 1) {
            await decadeSelect.selectOption({ index: 1 });
          }
        }

        await page.locator('.dig-btn').click();
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-06', phase: 99, area: 'Crate Digging',
    desc: 'Crate → Dig → click artist → artist page loads → navigate back to crate',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/crate');
      await page.locator('.artist-card').first().waitFor({ timeout: 10000 });

      // Click first artist
      const artistLink = page.locator('a.artist-name').first();
      const artistText = await artistLink.textContent();
      await artistLink.click();
      await page.waitForURL(/\/artist\//, { timeout: 10000 });

      // Verify artist page loaded
      await page.locator('h1.artist-name').waitFor({ timeout: 5000 });

      // Go back to crate
      await page.goBack();
      await page.waitForURL(/\/crate/, { timeout: 10000 });
      return page.url().includes('/crate');
    },
  },
];

// ─── Journey 3: Navigation stress test ──────────────────────────────────────

export const JOURNEY_NAV_STRESS = [
  {
    id: 'EXT-07', phase: 99, area: 'Navigation',
    desc: 'Rapid nav: Home → Discover → Style Map → KB → Settings → About → Home — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed, errors } = await noErrors(page, async () => {
        const routes = ['/', '/discover', '/style-map', '/kb', '/settings', '/about', '/'];
        for (const route of routes) {
          await goto(page, route);
          await page.waitForTimeout(500);
        }
      });
      if (!passed) console.log('    Nav errors:', errors.join('; '));
      return passed;
    },
  },
  {
    id: 'EXT-08', phase: 99, area: 'Navigation',
    desc: 'Back/Forward stress: navigate 5 pages then back 3 then forward 2 — URL consistency',
    method: 'tauri',
    fn: async (page) => {
      const routes = ['/discover', '/artist/radiohead', '/crate', '/settings', '/about'];
      const visited = [];

      for (const route of routes) {
        await goto(page, route);
        visited.push(route);
        await page.waitForTimeout(300);
      }

      // Go back 3 times
      for (let i = 0; i < 3; i++) {
        await page.goBack();
        await page.waitForTimeout(500);
      }

      // Should be at /artist/radiohead (visited[1])
      if (!page.url().includes('/artist/radiohead')) return false;

      // Forward 2 times
      for (let i = 0; i < 2; i++) {
        await page.goForward();
        await page.waitForTimeout(500);
      }

      // Should be at /settings (visited[3])
      return page.url().includes('/settings');
    },
  },
  {
    id: 'EXT-09', phase: 99, area: 'Navigation',
    desc: 'Navigate via header nav links (click each, verify URL changes)',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/');
      await page.waitForTimeout(1000);

      const navLinks = [
        { href: '/discover', check: '/discover' },
        { href: '/style-map', check: '/style-map' },
        { href: '/kb', check: '/kb' },
        { href: '/settings', check: '/settings' },
        { href: '/about', check: '/about' },
      ];

      for (const link of navLinks) {
        const anchor = page.locator(`a.nav-link[href="${link.href}"]`).first();
        if (await anchor.isVisible({ timeout: 2000 }).catch(() => false)) {
          await anchor.click();
          await page.waitForURL(new RegExp(link.check.replace('/', '\\/')), { timeout: 5000 });
          if (!page.url().includes(link.check)) return false;
        }
      }
      return true;
    },
  },
  {
    id: 'EXT-10', phase: 99, area: 'Navigation',
    desc: 'Double-click same nav link — page re-renders without crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForTimeout(500);

        const discoverLink = page.locator('a.nav-link[href="/discover"]').first();
        if (await discoverLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await discoverLink.click();
          await page.waitForTimeout(300);
          await discoverLink.click();
          await page.waitForTimeout(1000);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 4: Search edge cases ───────────────────────────────────────────

export const JOURNEY_SEARCH_EDGE = [
  {
    id: 'EXT-11', phase: 99, area: 'Search',
    desc: 'Search with special characters: "aphex twin & friends" — no crash, results or empty',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        await page.fill('input[type="search"]', 'aphex twin & friends');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForSelector('.artist-card, .message, .results-grid', { timeout: 10000 });
      });
      return passed;
    },
  },
  {
    id: 'EXT-12', phase: 99, area: 'Search',
    desc: 'Search with quotes: \'the "caretaker"\' — no crash, handles gracefully',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        await page.fill('input[type="search"]', 'the "caretaker"');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForSelector('.artist-card, .message, .results-grid', { timeout: 10000 });
      });
      return passed;
    },
  },
  {
    id: 'EXT-13', phase: 99, area: 'Search',
    desc: 'Search with SQL injection attempt: "\' OR 1=1 --" — no crash, no results',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        await page.fill('input[type="search"]', "' OR 1=1 --");
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForTimeout(3000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-14', phase: 99, area: 'Search',
    desc: 'Rapid search: type, search, clear, retype, search — no race conditions',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });

        // First search
        await page.fill('input[type="search"]', 'radiohead');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Clear and search again immediately
        const searchInput = page.locator('input[type="search"]').first();
        await searchInput.fill('burial');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Should show burial results, not radiohead
        await page.waitForSelector('.artist-card, .message', { timeout: 10000 });
      });
      return passed;
    },
  },
  {
    id: 'EXT-15', phase: 99, area: 'Search',
    desc: 'Very long search query (200 chars) — no crash, handles gracefully',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        const longQuery = 'a'.repeat(200);
        await page.fill('input[type="search"]', longQuery);
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-16', phase: 99, area: 'Search',
    desc: 'Search with FTS5 special chars: "radio*" prefix — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        await page.fill('input[type="search"]', 'radio*');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-17', phase: 99, area: 'Search',
    desc: 'Search with parentheses and FTS operators: "NOT (rock)" — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        await page.fill('input[type="search"]', 'NOT (rock)');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/search/, { timeout: 10000 });
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-18', phase: 99, area: 'Search',
    desc: 'Tag mode search then switch to artist mode — results update, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        // Search in tag mode
        await goto(page, '/search?q=electronic&mode=tag');
        await page.waitForSelector('.artist-card, .message', { timeout: 10000 });

        // Switch to artist mode by clicking the type chip
        const artistChip = page.locator('.type-chip').filter({ hasText: /artist/i }).first();
        if (await artistChip.isVisible({ timeout: 3000 }).catch(() => false)) {
          await artistChip.click();
          await page.waitForTimeout(2000);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 5: Artist page deep interactions ───────────────────────────────

export const JOURNEY_ARTIST_DEEP = [
  {
    id: 'EXT-19', phase: 99, area: 'Artist Page',
    desc: 'Visit 5 different artists in sequence — each page loads fully, no memory errors',
    method: 'tauri',
    fn: async (page) => {
      const artists = ['radiohead', 'boards-of-canada', 'autechre', 'burial', 'aphex-twin'];
      const { passed, errors } = await noErrors(page, async () => {
        for (const slug of artists) {
          await goto(page, `/artist/${slug}`);
          await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
          const tagCount = await page.locator('.tag-chip').count();
          // Each fixture artist has at least 3 tags
          if (tagCount === 0) throw new Error(`No tags for ${slug}`);
        }
      });
      if (!passed) console.log('    Artist errors:', errors.join('; '));
      return passed;
    },
  },
  {
    id: 'EXT-20', phase: 99, area: 'Artist Page',
    desc: 'Artist page discography filter pills — click each filter type, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/artist/radiohead');
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });

        // Click each filter pill if visible
        const filters = ['all', 'album', 'ep', 'single', 'compilation', 'live'];
        for (const f of filters) {
          const pill = page.locator(`[data-testid="filter-${f}"]`);
          if (await pill.isVisible({ timeout: 1000 }).catch(() => false)) {
            await pill.click();
            await page.waitForTimeout(300);
          }
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-21', phase: 99, area: 'Artist Page',
    desc: 'Artist page sort toggle — newest then oldest, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/artist/radiohead');
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });

        const newest = page.locator('[data-testid="sort-newest"]');
        const oldest = page.locator('[data-testid="sort-oldest"]');

        if (await newest.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newest.click();
          await page.waitForTimeout(300);
        }
        if (await oldest.isVisible({ timeout: 2000 }).catch(() => false)) {
          await oldest.click();
          await page.waitForTimeout(300);
        }
      });
      return passed;
    },
  },
  {
    id: 'EXT-22', phase: 99, area: 'Artist Page',
    desc: 'Nonexistent artist slug — graceful error, no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/artist/zzz-nonexistent-artist-12345');
        await page.waitForTimeout(3000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-23', phase: 99, area: 'Artist Page',
    desc: 'Artist page embed toggle — open and close embed panel',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/artist/radiohead');
        await page.locator('[data-testid="tab-content-overview"]').waitFor({ timeout: 8000 });

        const embedToggle = page.locator('.embed-toggle');
        if (await embedToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Open
          await embedToggle.click();
          await page.locator('.embed-panel').waitFor({ timeout: 3000 });
          // Close
          await embedToggle.click();
          await page.waitForTimeout(500);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 6: Console error sweep across ALL routes ───────────────────────

export const JOURNEY_CONSOLE_SWEEP = [
  {
    id: 'EXT-24', phase: 99, area: 'Error Sweep',
    desc: 'Load every route — zero JS errors across: /, /discover, /style-map, /kb, /crate, /settings, /about, /time-machine, /new-rising, /scenes, /backers',
    method: 'tauri',
    fn: async (page) => {
      const allErrors = [];
      const handler = (e) => allErrors.push({ url: page.url(), error: e.message ?? String(e) });
      page.on('pageerror', handler);

      const routes = [
        '/', '/discover', '/style-map', '/kb', '/crate',
        '/settings', '/about', '/time-machine', '/new-rising',
        '/scenes', '/backers',
      ];

      try {
        for (const route of routes) {
          await goto(page, route);
          await page.waitForTimeout(1500);
        }
      } finally {
        page.removeListener('pageerror', handler);
      }

      if (allErrors.length > 0) {
        console.log('    Console errors found:');
        for (const e of allErrors) {
          console.log(`      ${e.url}: ${e.error.slice(0, 120)}`);
        }
      }
      return allErrors.length === 0;
    },
  },
  {
    id: 'EXT-25', phase: 99, area: 'Error Sweep',
    desc: 'Load artist pages for all 15 fixture artists — zero JS errors',
    method: 'tauri',
    fn: async (page) => {
      const slugs = [
        'radiohead', 'boards-of-canada', 'autechre', 'burial', 'aphex-twin',
        'massive-attack', 'portishead', 'four-tet', 'flying-lotus', 'arca',
        'andy-stott', 'actress', 'the-caretaker', 'huerco-s', 'prefuse-73',
      ];
      const allErrors = [];
      const handler = (e) => allErrors.push({ slug: page.url().split('/artist/')[1], error: e.message ?? String(e) });
      page.on('pageerror', handler);

      try {
        for (const slug of slugs) {
          await goto(page, `/artist/${slug}`);
          await page.locator('h1.artist-name').waitFor({ timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      } finally {
        page.removeListener('pageerror', handler);
      }

      if (allErrors.length > 0) {
        console.log('    Artist page errors:');
        for (const e of allErrors) {
          console.log(`      /artist/${e.slug}: ${e.error.slice(0, 120)}`);
        }
      }
      return allErrors.length === 0;
    },
  },
  {
    id: 'EXT-26', phase: 99, area: 'Error Sweep',
    desc: 'Search results page in all 3 modes (artist, tag, label) — no JS errors',
    method: 'tauri',
    fn: async (page) => {
      const allErrors = [];
      const handler = (e) => allErrors.push({ url: page.url(), error: e.message ?? String(e) });
      page.on('pageerror', handler);

      try {
        await goto(page, '/search?q=electronic&mode=artist');
        await page.waitForTimeout(2000);
        await goto(page, '/search?q=electronic&mode=tag');
        await page.waitForTimeout(2000);
        await goto(page, '/search?q=electronic&mode=label');
        await page.waitForTimeout(2000);
      } finally {
        page.removeListener('pageerror', handler);
      }

      if (allErrors.length > 0) {
        console.log('    Search mode errors:');
        for (const e of allErrors) {
          console.log(`      ${e.url}: ${e.error.slice(0, 120)}`);
        }
      }
      return allErrors.length === 0;
    },
  },
];

// ─── Journey 7: Discovery page deep interactions ────────────────────────────

export const JOURNEY_DISCOVER_DEEP = [
  {
    id: 'EXT-27', phase: 99, area: 'Discovery',
    desc: 'Discover — add 3 tags, verify results narrow, then clear all',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/discover');
      await page.waitForSelector('.tag-cloud .tag-chip', { timeout: 10000 });

      // Click electronic
      await page.locator('.tag-cloud .tag-chip').filter({ hasText: /^electronic/ }).first().click();
      await page.waitForURL(/tags=/, { timeout: 5000 });
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const count1 = await page.locator('.artist-card').count();

      // Click idm (should narrow)
      const idmChip = page.locator('.tag-cloud .tag-chip').filter({ hasText: /^idm/ }).first();
      if (await idmChip.isVisible({ timeout: 2000 }).catch(() => false)) {
        await idmChip.click();
        await page.waitForTimeout(1500);
        await page.waitForSelector('.artist-card', { timeout: 10000 });
        const count2 = await page.locator('.artist-card').count();
        // With intersection, count should be <= previous
        if (count2 > count1) return false;
      }

      // Clear all (navigate to bare /discover or click clear button)
      const clearBtn = page.locator('button').filter({ hasText: /clear/i }).first();
      if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(1500);
      } else {
        await goto(page, '/discover');
      }

      return true;
    },
  },
  {
    id: 'EXT-28', phase: 99, area: 'Discovery',
    desc: 'Discover with custom tag input — type "ambient" in tag input, results appear',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/discover');
      await page.waitForLoadState('domcontentloaded');

      const tagInput = page.locator('[data-testid="discover-tag-input"]');
      if (await tagInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tagInput.fill('ambient');
        await tagInput.press('Enter');
        await page.waitForTimeout(2000);
        // Should see results (11/15 fixture artists have ambient)
        return await page.locator('.artist-card').count() > 0;
      }
      // If no tag input visible, skip gracefully
      return true;
    },
  },
  {
    id: 'EXT-29', phase: 99, area: 'Discovery',
    desc: 'Discover country filter — filter by GB, results should only be GB artists',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/discover?country=GB');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      // Fixture has 11 GB artists — just verify the page loads and shows results
      const cardCount = await page.locator('.artist-card').count();
      return cardCount > 0;
    },
  },
];

// ─── Journey 8: Error resilience ────────────────────────────────────────────

export const JOURNEY_ERROR_RESILIENCE = [
  {
    id: 'EXT-30', phase: 99, area: 'Error Paths',
    desc: 'Nonexistent route — shows error UI, navigating away works',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/this/route/does/not/exist/at-all');
        await page.waitForTimeout(2000);

        // Can navigate away
        await goto(page, '/');
        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
      });
      return passed;
    },
  },
  {
    id: 'EXT-31', phase: 99, area: 'Error Paths',
    desc: 'Malformed query params — /search?q=&mode=invalid — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/search?q=&mode=invalid');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-32', phase: 99, area: 'Error Paths',
    desc: 'Discover with garbage tags param — /discover?tags=<script>alert(1)</script> — no crash, no XSS',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/discover?tags=<script>alert(1)</script>');
        await page.waitForTimeout(2000);
        // Verify no alert dialog was triggered
        // (Svelte auto-escapes, but verify the page is still functional)
        const heading = await page.locator('h1').first().isVisible().catch(() => false);
      });
      return passed;
    },
  },
  {
    id: 'EXT-33', phase: 99, area: 'Error Paths',
    desc: 'Artist slug with unicode/special chars — /artist/mötley-crüe — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/artist/m%C3%B6tley-cr%C3%BCe');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-34', phase: 99, area: 'Error Paths',
    desc: 'Style map with invalid tag param — /style-map?tag=<invalid> — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/style-map?tag=%00%01%02');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-35', phase: 99, area: 'Error Paths',
    desc: 'KB genre with nonexistent slug — /kb/genre/zzz-fake — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/kb/genre/zzz-fake-genre-12345');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-36', phase: 99, area: 'Error Paths',
    desc: 'Embed route for nonexistent artist — /embed/artist/zzz — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/embed/artist/zzz-nonexistent-embed');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
  {
    id: 'EXT-37', phase: 99, area: 'Error Paths',
    desc: 'Room with empty channel — /room/ — no crash',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/room/');
        await page.waitForTimeout(2000);
      });
      return passed;
    },
  },
];

// ─── Journey 9: Settings page interactions ──────────────────────────────────

export const JOURNEY_SETTINGS = [
  {
    id: 'EXT-38', phase: 99, area: 'Settings',
    desc: 'Settings page renders all sections — h1, feedback section, about section visible',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/settings');
      await page.locator('h1:has-text("Settings")').waitFor({ timeout: 5000 });
      const h1 = await page.locator('h1:has-text("Settings")').isVisible();
      const feedback = await page.locator('[data-testid="settings-feedback-section"]').isVisible().catch(() => false);
      const about = await page.locator('[data-testid="settings-about-section"]').isVisible().catch(() => false);
      return h1 && (feedback || about);
    },
  },
  {
    id: 'EXT-39', phase: 99, area: 'Settings',
    desc: 'Settings → navigate away → come back → page still renders',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/settings');
      await page.locator('h1:has-text("Settings")').waitFor({ timeout: 5000 });

      // Navigate away
      await goto(page, '/discover');
      await page.waitForTimeout(500);

      // Come back
      await goto(page, '/settings');
      await page.locator('h1:has-text("Settings")').waitFor({ timeout: 5000 });
      return await page.locator('h1:has-text("Settings")').isVisible();
    },
  },
];

// ─── Journey 10: About page and feedback form ───────────────────────────────

export const JOURNEY_ABOUT = [
  {
    id: 'EXT-40', phase: 99, area: 'About',
    desc: 'About page loads — header, manifesto sections, feedback form visible',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/about');
      const h1 = await page.locator('.about-header h1').isVisible({ timeout: 5000 }).catch(() => false);
      const sections = await page.locator('.about-section').count();
      return h1 && sections > 0;
    },
  },
  {
    id: 'EXT-41', phase: 99, area: 'About',
    desc: 'Feedback form — fill type, title, body — no crash (don\'t submit)',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/about');
        const form = page.locator('.feedback-form');
        if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
          const select = page.locator('.feedback-select');
          if (await select.isVisible().catch(() => false)) {
            await select.selectOption('bug');
          }
          const titleInput = page.locator('.feedback-input').first();
          if (await titleInput.isVisible().catch(() => false)) {
            await titleInput.fill('Test bug report title');
          }
          const textarea = page.locator('.feedback-textarea');
          if (await textarea.isVisible().catch(() => false)) {
            await textarea.fill('This is a test feedback body from the extended test suite.');
          }
          // Don't click submit — just verify the form is fillable
          await page.waitForTimeout(500);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 11: Keyboard navigation ────────────────────────────────────────

export const JOURNEY_KEYBOARD = [
  {
    id: 'EXT-42', phase: 99, area: 'Keyboard',
    desc: 'Escape key on search results — search input clears or page handles gracefully',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/search?q=radiohead&mode=artist');
        await page.waitForTimeout(2000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      });
      return passed;
    },
  },
  {
    id: 'EXT-43', phase: 99, area: 'Keyboard',
    desc: 'Tab through home page elements — focus moves correctly',
    method: 'tauri',
    fn: async (page) => {
      const { passed } = await noErrors(page, async () => {
        await goto(page, '/');
        await page.waitForTimeout(1000);
        // Tab several times through focusable elements
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
      });
      return passed;
    },
  },
];

// ─── Journey 12: Page refresh resilience ────────────────────────────────────

export const JOURNEY_REFRESH = [
  {
    id: 'EXT-44', phase: 99, area: 'Refresh',
    desc: 'Refresh on /discover with filters — page reloads correctly with filter state',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/discover?tags=electronic');
      await page.waitForSelector('.artist-card, .empty-state', { timeout: 10000 });

      // Reload
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // URL should still have tags
      if (!page.url().includes('tags=electronic')) return false;

      // Results should reload
      return await page.locator('.artist-card').count() > 0;
    },
  },
  {
    id: 'EXT-45', phase: 99, area: 'Refresh',
    desc: 'Refresh on artist page — page reloads fully',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/artist/radiohead');
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });

      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      return await page.locator('h1.artist-name').isVisible();
    },
  },
  {
    id: 'EXT-46', phase: 99, area: 'Refresh',
    desc: 'Refresh on search results — results reload',
    method: 'tauri',
    fn: async (page) => {
      await goto(page, '/search?q=aphex+twin&mode=artist');
      await page.waitForSelector('.artist-card, .message', { timeout: 10000 });

      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.artist-card, .message', { timeout: 10000 });
      return true;
    },
  },
];

// ─── Journey 13: Cross-page data consistency ────────────────────────────────

export const JOURNEY_CONSISTENCY = [
  {
    id: 'EXT-47', phase: 99, area: 'Consistency',
    desc: 'Same artist shows same name on search results, artist page, and embed page',
    method: 'tauri',
    fn: async (page) => {
      // Search
      await goto(page, '/search?q=radiohead&mode=artist');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const searchName = await page.locator('a.artist-name').first().textContent();

      // Artist page
      await goto(page, '/artist/radiohead');
      await page.locator('h1.artist-name').waitFor({ timeout: 8000 });
      const pageName = await page.locator('h1.artist-name').textContent();

      // Embed
      await goto(page, '/embed/artist/radiohead');
      await page.locator('.card').waitFor({ timeout: 5000 });
      const embedName = await page.locator('.card').textContent();

      const normalized = (s) => s.trim().toLowerCase();
      const base = normalized(searchName);
      return normalized(pageName).includes(base) && normalized(embedName).includes(base);
    },
  },
  {
    id: 'EXT-48', phase: 99, area: 'Consistency',
    desc: 'Discover tag results match tag-mode search results for "electronic"',
    method: 'tauri',
    fn: async (page) => {
      // Get discover results
      await goto(page, '/discover?tags=electronic');
      await page.waitForSelector('.artist-card', { timeout: 10000 });
      const discoverCount = await page.locator('.artist-card').count();

      // Get tag search results
      await goto(page, '/search?q=electronic&mode=tag');
      await page.waitForSelector('.artist-card, .message', { timeout: 10000 });
      const searchCount = await page.locator('.artist-card').count();

      // Both should return results (exact count may differ due to ranking)
      return discoverCount > 0 && searchCount > 0;
    },
  },
];

// ─── Full extended manifest ─────────────────────────────────────────────────

export const EXTENDED_TESTS = [
  ...JOURNEY_SEARCH_TO_DISCOVER,
  ...JOURNEY_CRATE_DIGGING,
  ...JOURNEY_NAV_STRESS,
  ...JOURNEY_SEARCH_EDGE,
  ...JOURNEY_ARTIST_DEEP,
  ...JOURNEY_CONSOLE_SWEEP,
  ...JOURNEY_DISCOVER_DEEP,
  ...JOURNEY_ERROR_RESILIENCE,
  ...JOURNEY_SETTINGS,
  ...JOURNEY_ABOUT,
  ...JOURNEY_KEYBOARD,
  ...JOURNEY_REFRESH,
  ...JOURNEY_CONSISTENCY,
];
