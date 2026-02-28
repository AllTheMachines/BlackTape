import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
const page = browser.contexts()[0].pages()[0];

const info = await page.evaluate(() => {
  const input = document.querySelector('input.text-input');
  if (!input) return { found: false };

  const scrollContainers = [];
  let el = input.parentElement;
  while (el && el !== document.body) {
    const cs = window.getComputedStyle(el);
    const ov = cs.overflow + ' ' + cs.overflowY + ' ' + cs.overflowX;
    if (ov.includes('auto') || ov.includes('scroll')) {
      scrollContainers.push({
        tag: el.tagName,
        cls: el.className.substring(0, 60),
        overflow: ov.trim(),
        tabindex: el.getAttribute('tabindex')
      });
    }
    el = el.parentElement;
  }

  // Also check focused element
  const focused = document.activeElement;

  return {
    found: true,
    scrollContainers,
    focusedTag: focused ? focused.tagName : 'none',
    focusedClass: focused ? focused.className.substring(0, 60) : ''
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
