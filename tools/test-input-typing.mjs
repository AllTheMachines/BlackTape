/**
 * Tests whether the Spotify Client ID input field can receive keyboard input.
 * Navigates to settings, types a test value, and verifies the value changed.
 */
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

// Navigate to settings
await page.evaluate(() => { window.location.href = '/settings'; });
await page.waitForTimeout(1500);

const input = page.locator('input.text-input').first();
await input.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

// Click to focus
await input.click();
await page.waitForTimeout(300);

// Check what has focus
const focused = await page.evaluate(() => document.activeElement?.className ?? 'none');
console.log('Focused element:', focused);

// Check if scroll container now has tabindex=-1
const mainPaneTabindex = await page.evaluate(() => {
  const pane = document.querySelector('.main-pane');
  return pane ? pane.getAttribute('tabindex') : 'not found';
});
console.log('main-pane tabindex:', mainPaneTabindex);

// Type via keyboard simulation
await page.keyboard.type('test-client-id-123');
await page.waitForTimeout(300);

const value = await input.inputValue();
console.log('Input value after keyboard.type():', value);

// Test passed if value changed
if (value === 'test-client-id-123') {
  console.log('✓ PASS: Input accepts keyboard input');
} else {
  console.log('✗ FAIL: Input did not accept keyboard input, value:', value);
}

// Clean up
await input.fill('');
await browser.close();
