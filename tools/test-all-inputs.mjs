import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

await page.evaluate(() => { window.location.href = '/settings'; });
await page.waitForTimeout(1500);

const inputs = page.locator('input[type="text"], input[type="search"], input:not([type])');
const count = await inputs.count();
console.log('Total inputs found:', count);

for (let i = 0; i < count; i++) {
  const input = inputs.nth(i);
  const placeholder = await input.getAttribute('placeholder');
  const disabled = await input.isDisabled();

  if (disabled) {
    console.log(`[${i}] "${placeholder}" — DISABLED, skipping`);
    continue;
  }

  await input.scrollIntoViewIfNeeded();
  await input.click();
  await page.waitForTimeout(200);

  const focused = await page.evaluate(() => document.activeElement?.getAttribute('placeholder') ?? 'unknown');

  await page.keyboard.type('TEST');
  await page.waitForTimeout(200);

  const val = await input.inputValue();
  const worked = val.includes('TEST');
  console.log(`[${i}] "${placeholder}" focused="${focused}" value="${val}" → ${worked ? '✓ WORKS' : '✗ BROKEN'}`);

  await input.fill('');
}

await browser.close();
