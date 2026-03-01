/**
 * cameraman-dryrun.mjs — Dry run all storyboard scenes against the live app.
 * Connects via CDP, executes each action (skipping screenshots), reports pass/fail.
 *
 * This script uses direct selectors tuned to the BlackTape/Mercury Tauri app.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const CDP_PORT = 9224;
const SESSION = 'D:/Projects/BlackTape/app-recordings/2026-03-02_app-walkthrough';
const VIEWPORT = { width: 1920, height: 1080 };

const storyboard = JSON.parse(readFileSync(`${SESSION}/storyboard.json`, 'utf-8'));

/**
 * Navigate to a route inside the app.
 * In Tauri mode the header is hidden, so we use page.goto() directly.
 */
async function navigateTo(page, routePath) {
  const base = new URL(page.url()).origin;
  const fullUrl = `${base}${routePath}`;
  console.log(`    navigate -> ${fullUrl}`);
  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);
}

/**
 * Infer the route from a navigate action's description.
 */
function inferRoute(description) {
  const desc = description.toLowerCase();
  if (desc.includes('discover'))     return '/discover';
  if (desc.includes('style map'))    return '/style-map';
  if (desc.includes('knowledge base')) return '/kb';
  if (desc.includes('time machine')) return '/time-machine';
  if (desc.includes('crate') || desc.includes('dig')) return '/crate';
  if (desc.includes('library'))      return '/library';
  if (desc.includes('settings'))     return '/settings';
  if (desc.includes('explore'))      return '/explore';
  if (desc.includes('profile'))      return '/profile';
  if (desc.includes('about'))        return '/about';
  if (desc.includes('home') || desc.includes('main')) return '/';
  return null;
}

/**
 * Execute a single storyboard action.
 */
async function executeAction(page, action, isDryRun = true) {
  const type = action.type;
  const desc = (action.description || '').toLowerCase();

  // --- screenshot: skip in dry run ---
  if (type === 'screenshot') {
    if (isDryRun) {
      console.log(`    [SKIP] screenshot (dry run)`);
      return { success: true };
    }
    // Recording mode handled externally
    return { success: true };
  }

  // --- delay ---
  if (type === 'delay') {
    // In dry run, use shorter delays to save time
    const ms = isDryRun ? Math.min(action.ms, 500) : action.ms;
    console.log(`    delay ${ms}ms`);
    await page.waitForTimeout(ms);
    return { success: true };
  }

  // --- navigate ---
  if (type === 'navigate') {
    const route = action.url || inferRoute(action.description);
    if (!route) {
      return { success: false, error: `Could not infer route from: '${action.description}'` };
    }
    try {
      await navigateTo(page, route);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Navigate failed: ${e.message}` };
    }
  }

  // --- wait ---
  if (type === 'wait') {
    try {
      // For wait actions, we check the page has meaningful content loaded.
      // We use page-specific selectors based on description keywords.
      if (desc.includes('search result')) {
        // Wait for search results (artist cards or search results)
        await page.locator('.artist-card, .search-result, [data-testid="autocomplete-item"]').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('artist page') || desc.includes('artist header')) {
        // Wait for artist page content
        await page.locator('.artist-header, .artist-page, h1, h2').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('discover page') || desc.includes('tag cloud')) {
        // Wait for discover page content - tag chips or artist cards
        await page.locator('.tag-cloud, .tag-chip, .discover-page, .artist-card').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('filter') && desc.includes('result')) {
        // Wait for filtered results
        await page.locator('.artist-card, .discover-results').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('style map') || desc.includes('graph visualization')) {
        // Wait for SVG graph to render
        await page.locator('svg circle, svg .node, canvas, .style-map').first().waitFor({ state: 'visible', timeout: 15000 });
      } else if (desc.includes('knowledge base') || desc.includes('genre graph')) {
        await page.locator('.kb-page, .genre-graph, svg, canvas, h2').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('genre page') || desc.includes('genre description')) {
        await page.locator('.genre-page, .genre-header, h1, h2').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('time machine') || desc.includes('decade')) {
        await page.locator('.decade-btn, .time-machine, .decade-buttons').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('crate') || desc.includes('dig button')) {
        await page.locator('.dig-btn, .crate-page').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('library') || desc.includes('album grid') || desc.includes('folder')) {
        await page.locator('.library-page, .album-grid, .library-browser, .folder-manager, h2').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('player bar') || desc.includes('transport')) {
        await page.locator('.player-bar, .player, [data-testid="queue-toggle"]').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('queue')) {
        await page.locator('.queue-panel, .queue-list, .queue-empty').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('settings')) {
        await page.locator('.settings-page, .settings, h2').first().waitFor({ state: 'visible', timeout: 10000 });
      } else if (desc.includes('blacktape') || desc.includes('main interface') || desc.includes('navigation')) {
        // Wait for main interface - sidebar nav or search bar
        await page.locator('.left-sidebar, .control-bar, .search-input, #control-bar-search').first().waitFor({ state: 'visible', timeout: 15000 });
      } else if (desc.includes('random artist') || desc.includes('random')) {
        await page.locator('.artist-card, .crate-result').first().waitFor({ state: 'visible', timeout: 10000 });
      } else {
        // Generic wait: just wait for the body to have content
        await page.waitForFunction(() => document.body.innerText.length > 100, { timeout: 10000 });
      }
      console.log(`    wait: OK`);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Wait timed out: ${e.message}` };
    }
  }

  // --- click ---
  if (type === 'click') {
    try {
      let locator;

      if (desc.includes('search input') || desc.includes('search bar')) {
        // Click the ControlBar search input
        locator = page.locator('#control-bar-search');
      } else if (desc.includes('tags toggle') || desc.includes('tags') && desc.includes('switch')) {
        // Tags mode toggle button
        locator = page.locator('.mode-btn:has-text("Tags")');
      } else if (desc.includes('first artist') || desc.includes('artist result')) {
        // Click first artist result - could be autocomplete or search results
        const autocomplete = page.locator('[data-testid="autocomplete-item"]').first();
        const artistCard = page.locator('.artist-card a, .artist-card').first();
        if (await autocomplete.count() > 0 && await autocomplete.isVisible()) {
          locator = autocomplete;
        } else {
          locator = artistCard;
        }
      } else if (desc.includes('genre tag') && desc.includes('tag cloud')) {
        // Click a genre tag in the discover tag cloud
        locator = page.locator('.tag-chip').first();
      } else if (desc.includes('second genre tag') || desc.includes('second tag')) {
        // Click a second tag for intersection
        locator = page.locator('.tag-chip:not(.active)').first();
      } else if (desc.includes('genre node') || desc.includes('genre') && desc.includes('graph')) {
        // Click a node in the genre graph/KB
        locator = page.locator('svg circle, .node').first();
      } else if (desc.includes('decade') || desc.includes('80s') || desc.includes('90s')) {
        // Click a decade button
        const target = desc.includes('80s') ? '80s' : desc.includes('90s') ? '90s' : '80s';
        locator = page.locator(`.decade-btn:has-text("${target}")`);
        if (await locator.count() === 0) {
          locator = page.locator('.decade-btn').nth(3); // fallback: 4th button (90s)
        }
      } else if (desc.includes('dig button') || desc.includes('dig')) {
        locator = page.locator('.dig-btn');
      } else if (desc.includes('queue') && (desc.includes('icon') || desc.includes('button'))) {
        locator = page.locator('[data-testid="queue-toggle"]');
      } else if (desc.includes('track') || desc.includes('play something') || desc.includes('play')) {
        // Try to click a track in the library or a play button
        locator = page.locator('.track-row, .play-btn, [data-testid="play-btn"], button:has-text("Play")').first();
      } else if (desc.includes('layout') && (desc.includes('switcher') || desc.includes('dropdown'))) {
        locator = page.locator('#layout-switcher');
      } else if (desc.includes('focus') || desc.includes('minimal')) {
        // Select a layout option
        // This should be handled as a select change, not a click
        const select = page.locator('#layout-switcher');
        const targetValue = desc.includes('focus') ? 'focus' : 'minimal';
        await select.selectOption(targetValue);
        console.log(`    click (select): layout -> ${targetValue}`);
        return { success: true };
      } else if (desc.includes('electronic') || desc.includes('ambient') || desc.includes('experimental')) {
        // Click a specific tag name
        const tagName = desc.includes('electronic') ? 'electronic' : desc.includes('ambient') ? 'ambient' : 'experimental';
        locator = page.locator(`.tag-chip:has-text("${tagName}")`);
        if (await locator.count() === 0) {
          // Fallback: click any non-active tag chip
          locator = page.locator('.tag-chip:not(.active)').first();
        }
      } else {
        // Generic click: try to find by text
        const keywords = extractKeywords(action.description);
        for (const kw of keywords) {
          locator = page.locator(`button:has-text("${kw}"), a:has-text("${kw}"), [role="button"]:has-text("${kw}")`).first();
          if (await locator.count() > 0) break;
        }
      }

      if (!locator || await locator.count() === 0) {
        return { success: false, error: `Could not resolve click target. Description: '${action.description}'` };
      }

      await locator.click({ timeout: 5000 });
      console.log(`    click: done`);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Click failed: ${e.message}` };
    }
  }

  // --- type ---
  if (type === 'type') {
    try {
      let locator;
      if (desc.includes('search') || desc.includes('artist name')) {
        locator = page.locator('#control-bar-search');
      } else if (desc.includes('tag') || desc.includes('genre')) {
        locator = page.locator('[data-testid="discover-tag-input"], #sidebar-tag-input, .tag-input, .custom-tag-input').first();
      } else {
        locator = page.locator('input:visible').first();
      }

      if (!locator || await locator.count() === 0) {
        return { success: false, error: `Could not resolve type target. Description: '${action.description}'` };
      }

      await locator.fill(action.text || '');
      // For the ControlBar search, we need to submit the form
      if (desc.includes('search') || desc.includes('artist name')) {
        await locator.press('Enter');
      }
      console.log(`    type: '${action.text}'`);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Type failed: ${e.message}` };
    }
  }

  // --- scroll ---
  if (type === 'scroll') {
    try {
      let deltaY = 400;
      if (desc.includes('up') || desc.includes('top') || desc.includes('back')) deltaY = -800;
      else if (desc.includes('more') || desc.includes('down')) deltaY = 400;

      // Scroll the .main-pane (Tauri panel layout's main scrollable container)
      const mainPane = page.locator('.main-pane').first();
      if (await mainPane.count() > 0) {
        await mainPane.evaluate((el, dy) => el.scrollBy(0, dy), deltaY);
        console.log(`    scroll: .main-pane ${deltaY > 0 ? 'down' : 'up'} ${Math.abs(deltaY)}px`);
      } else {
        await page.evaluate((dy) => window.scrollBy(0, dy), deltaY);
        console.log(`    scroll: window ${deltaY > 0 ? 'down' : 'up'} ${Math.abs(deltaY)}px`);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: `Scroll failed: ${e.message}` };
    }
  }

  // --- hover ---
  if (type === 'hover') {
    try {
      if (desc.includes('node') || desc.includes('genre') || desc.includes('graph')) {
        // Hover over SVG elements in graph visualizations
        const circles = page.locator('svg circle');
        const count = await circles.count();
        if (count === 0) {
          return { success: false, error: 'No SVG circle nodes found for hover' };
        }
        // Pick a larger node (likely near center) vs a smaller one
        const idx = desc.includes('different') || desc.includes('smaller') || desc.includes('second') ? Math.min(5, count - 1) : Math.min(2, count - 1);
        await circles.nth(idx).hover({ timeout: 5000 });
        console.log(`    hover: SVG circle node ${idx}`);
      } else {
        // Generic hover
        const keywords = extractKeywords(action.description);
        let hovered = false;
        for (const kw of keywords) {
          const loc = page.locator(`button:has-text("${kw}"), a:has-text("${kw}"), [title*="${kw}" i]`).first();
          if (await loc.count() > 0) {
            await loc.hover({ timeout: 5000 });
            console.log(`    hover: '${kw}'`);
            hovered = true;
            break;
          }
        }
        if (!hovered) {
          return { success: false, error: `Could not resolve hover target. Description: '${action.description}'` };
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: `Hover failed: ${e.message}` };
    }
  }

  return { success: false, error: `Unknown action type: ${type}` };
}

// Helper: extract keywords (strip filler words)
const FILLER = new Set(['the','a','an','in','on','at','to','for','with','of','and','or','then','that','this','into','from','by','its','my','some','any']);
function extractKeywords(description) {
  const words = description.split(/\s+/);
  const actionVerbs = ['click','type','wait','scroll','hover','navigate','delay'];
  return words.filter(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !FILLER.has(lower) && !actionVerbs.includes(lower) && lower.length > 0;
  }).sort((a, b) => b.length - a.length);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to CDP...');
  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    console.log('Connected to CDP');
  } catch (e) {
    console.error(`FATAL: Could not connect to CDP: ${e.message}`);
    process.exit(1);
  }

  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0];
  if (!page) {
    console.error('FATAL: No page found');
    process.exit(1);
  }

  // Wait for app ready
  try {
    await page.waitForFunction(() => {
      return document.readyState === 'complete' &&
        !document.querySelector('.loading, .spinner, [data-loading="true"]');
    }, { timeout: 15000 });
    console.log('App ready');
  } catch {
    console.error('FATAL: App not ready within 15s');
    process.exit(1);
  }

  await page.setViewportSize(VIEWPORT);

  // Ensure we start from the home page
  await navigateTo(page, '/');
  await page.waitForTimeout(1000);

  const scenes = storyboard.scenes;
  const results = [];
  let allPassed = true;

  console.log(`\nStarting dry run -- verifying ${scenes.length} scenes...\n`);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`  Dry run scene ${i + 1}/${scenes.length}: ${scene.name}...`);

    let scenePassed = true;
    let failInfo = null;

    for (const action of scene.actions) {
      if (action.type === 'screenshot') continue; // skip during dry run

      const result = await executeAction(page, action, true);
      if (!result.success) {
        scenePassed = false;
        failInfo = { actionType: action.type, error: result.error };
        break;
      }
    }

    if (scenePassed) {
      console.log(`  [PASS] ${scene.name}`);
      results.push({ scene: scene.name, passed: true });
    } else {
      console.log(`  [FAIL] ${scene.name}: ${failInfo.actionType} failed -- ${failInfo.error}`);
      results.push({ scene: scene.name, passed: false, ...failInfo });
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log(`Dry run complete -- all ${scenes.length} scenes passed.`);
    console.log('DRY_RUN_PASSED');
  } else {
    const failed = results.filter(r => !r.passed);
    console.log(`Dry run FAILED. ${failed.length} scene(s) failed:\n`);
    for (const f of failed) {
      console.log(`  - ${f.scene}: ${f.actionType} failed -- ${f.error}`);
    }
    console.log('\nDRY_RUN_FAILED');
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
