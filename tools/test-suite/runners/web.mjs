/**
 * Playwright web runner.
 * Each web test gets a fresh page. Tests return true (pass) or throw/return false (fail).
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:8788';

export async function runWebTests(tests, { verbose = false } = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mercury-TestSuite/1.0',
  });

  const results = [];

  for (const test of tests) {
    const page = await context.newPage();
    // Suppress console noise
    page.on('console', () => {});
    page.on('pageerror', () => {});

    let passed = false;
    let error = null;

    try {
      const url = test.url.startsWith('http') ? test.url : BASE + test.url;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      passed = await test.fn(page);
      if (passed == null) passed = true; // fn returning undefined = pass
    } catch (e) {
      error = e.message?.split('\n')[0] ?? String(e);
      passed = false;
    } finally {
      await page.close().catch(() => {});
    }

    results.push({ ...test, passed, error });
    if (verbose) {
      process.stdout.write(passed ? '.' : 'F');
    }
  }

  await browser.close();
  return results;
}

/** Helper used inside test fns */
export async function waitForSelector(page, selector, timeout = 8000) {
  await page.waitForSelector(selector, { timeout });
  return true;
}
