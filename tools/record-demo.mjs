/**
 * record-demo.mjs — BlackTape hyperspeed demo automation
 *
 * Connects to the running app via CDP and performs the full demo brief.
 * Run this while Steve records his screen. The recording will be sped up
 * 4-8x in post, so each "count" should feel natural at 1x.
 *
 * Usage: node tools/record-demo.mjs
 * Requires: app running with CDP on port 9224 (node tools/launch-cdp.mjs)
 */

import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9224';
const COUNT_MS = 1200; // ms per "count" — natural pace, will compress well at 6x

// Known artist slugs confirmed in live DB
const ARTISTS = [
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'My Bloody Valentine',         slug: 'my-bloody-valentine' },
  { name: 'Grouper',                     slug: 'grouper' },
];

const GENRES = ['jazz', 'shoegaze', 'krautrock', 'ambient', 'death metal', 'hyperpop', 'noise rock', 'dream pop'];

// ─── Connect ────────────────────────────────────────────────────────────────

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(10000);

console.log('Connected. URL:', page.url());

// ─── Helpers ────────────────────────────────────────────────────────────────

const wait = ms => new Promise(r => setTimeout(r, ms));

/** Run JS in page with timeout — never hangs */
async function safe(fn, timeout = 5000) {
  return Promise.race([
    page.evaluate(fn),
    new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), timeout)),
  ]).catch(e => { console.warn('  safe() caught:', e.message); return null; });
}

/** Navigate via SPA href — keeps Tauri bridge alive */
async function nav(path, settle = 2500) {
  console.log('  nav →', path);
  await safe(p => { window.location.href = p; }, 3000);
  await wait(settle);
  // Extra drift during settle
  await drift(640, 400, settle > 2000 ? 30 : 10);
}

/** Slow mouse circles (looks like "hovering" during load) */
async function circles(cx = 640, cy = 420, r = 55, loops = 2) {
  const steps = loops * 28;
  for (let i = 0; i <= steps; i++) {
    const a = (i / 28) * 2 * Math.PI;
    await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    await wait(35);
  }
}

/** Gentle slow drift (used during waits) */
async function drift(cx = 640, cy = 400, px = 20) {
  for (let i = 0; i <= 8; i++) {
    const x = cx + Math.sin(i * 0.8) * px;
    const y = cy + Math.cos(i * 0.5) * (px * 0.5);
    await page.mouse.move(x, y, { steps: 4 });
    await wait(80);
  }
}

/** Hold for N counts with gentle mouse drift */
async function count(n, cx = 640, cy = 400) {
  for (let i = 0; i < n; i++) {
    await drift(cx + Math.sin(i) * 40, cy, 15);
    await wait(COUNT_MS - 80 * 8); // drift takes ~640ms, pad the rest
  }
}

/** Slow scroll — px total, steps controls smoothness */
async function scroll(px, steps = 24) {
  const dy = px / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy);
    await wait(75);
  }
  await wait(300);
}

/** Click selector (first match), warn on failure */
async function click(sel, timeout = 6000) {
  try {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    await wait(600);
    return true;
  } catch (e) {
    console.warn('  click failed:', sel, '—', e.message.slice(0, 60));
    return false;
  }
}

/** Click by text content */
async function clickText(text, timeout = 5000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    await wait(500);
    return true;
  } catch (e) {
    console.warn('  clickText failed:', text);
    return false;
  }
}

/** Navigate to artist page directly by slug */
async function goToArtist(artist) {
  console.log('  → artist:', artist.name);
  await nav(`/artist/${artist.slug}`, 3000);
}

/** Type into the search bar (input[type="search"]) */
async function typeInSearch(text) {
  try {
    const input = page.locator('input[type="search"]').first();
    await input.fill('');
    await wait(200);
    for (const ch of text) {
      await input.type(ch, { delay: 75 });
    }
    await wait(2200);
  } catch (e) {
    console.warn('  typeInSearch failed:', e.message.slice(0, 60));
  }
}

// ─── Section 1: SEARCH SEQUENCES ────────────────────────────────────────────

async function doSearch() {
  console.log('\n════ SEARCH SEQUENCES ════');
  await nav('/search', 1500);

  for (let i = 0; i < GENRES.length; i++) {
    const genre = GENRES[i];
    console.log(`  genre [${i + 1}/${GENRES.length}]: ${genre}`);

    await typeInSearch(genre);
    await circles(640, 380, 50, 1); // mouse circles while results load
    await scroll(550, 22);           // scroll through grid — count of 10
    await wait(400);
    await scroll(-200, 10);          // scroll back up partially

    // Every 3 genres, click into an artist
    if ((i + 1) % 3 === 0) {
      console.log('  clicking into artist from results...');
      const clicked = await click('a[href*="/artist/"]');
      if (clicked) {
        await wait(2000);
        await circles(640, 400, 60, 1);
        await count(5);
        await nav('/search', 1500);
        await wait(500);
      }
    }

    await wait(300);
  }
}

// ─── Section 2: ARTIST PAGES ─────────────────────────────────────────────────

async function doArtistPages() {
  console.log('\n════ ARTIST PAGES ════');

  for (let i = 0; i < Math.min(6, ARTISTS.length); i++) {
    const artist = ARTISTS[i];
    console.log(`  artist [${i + 1}/6]: ${artist.name}`);

    await goToArtist(artist);

    // Overview tab is default — count of 3
    await circles(640, 400, 50, 1);
    await count(3);

    // Scroll down through discography — count of 8
    await scroll(800, 30);
    await wait(300);

    // Click a release
    const clickedRelease = await click('a[href*="/release/"]');
    if (clickedRelease) {
      await wait(2000);
      await circles(640, 380, 40, 1);
      await count(4);
      // Back to artist
      await page.goBack().catch(() => nav(`/artist/${artist.slug}`));
      await wait(2000);
    }

    // Stats tab
    const statsOk = await click('[data-testid="tab-stats"]');
    if (!statsOk) await clickText('Stats');
    await count(3);

    // About tab (only appears if there are relationships)
    const aboutOk = await click('[data-testid="tab-about"]');
    if (!aboutOk) await clickText('About');
    await count(3);

    // Back to Overview
    const overviewOk = await click('[data-testid="tab-overview"]');
    if (!overviewOk) await clickText('Overview');
    await count(2);

    await wait(500);
  }
}

// ─── Section 3: PLAYBACK ─────────────────────────────────────────────────────

async function doPlayback() {
  console.log('\n════ PLAYBACK ════');

  const playbackArtists = [ARTISTS[0], ARTISTS[2], ARTISTS[3]]; // Slowdive, Nick Cave, GYBE

  for (let i = 0; i < playbackArtists.length; i++) {
    const artist = playbackArtists[i];
    console.log(`  playback artist [${i + 1}/3]: ${artist.name}`);

    await goToArtist(artist);

    // Click Play All (or play-album-btn on first release)
    const playedAll = await click('[data-testid="play-all-btn"]');
    if (!playedAll) {
      // Try play-album-btn on a release link
      const release = await click('a[href*="/release/"]');
      if (release) {
        await wait(2000);
        await click('[data-testid="play-album-btn"]');
        await page.goBack().catch(() => {});
        await wait(2000);
      }
    }

    await wait(2000);
    // Show player bar with source badge — count of 5
    await page.mouse.move(640, 760, { steps: 10 }); // hover near player bar
    await count(5, 640, 760);

    // Add a track to queue from artist page
    const queueAdded = await click('[data-testid="queue-btn"]');
    if (queueAdded) {
      console.log('  track added to queue');
    }
    await wait(600);

    // Navigate to Search — player should persist
    await nav('/search', 1500);
    await page.mouse.move(640, 760, { steps: 10 });
    await count(5, 640, 760);
  }
}

// ─── Section 4: QUEUE ────────────────────────────────────────────────────────

async function doQueue() {
  console.log('\n════ QUEUE ════');

  // Build queue from different artists (3 more tracks)
  for (let i = 0; i < 3; i++) {
    const artist = ARTISTS[(i + 1) % ARTISTS.length];
    await goToArtist(artist);
    await click('[data-testid="queue-btn"]');
    await wait(400);
    await click('[data-testid="queue-btn"]');
    await wait(400);
  }

  // Open queue panel
  const opened = await click('[data-testid="queue-toggle"]');
  if (!opened) await clickText('Queue');
  await wait(1200);

  // Scroll through queue — count of 8
  await scroll(400, 18);
  await count(8, 1000, 400);
  await scroll(-200, 10);

  // Drag to reorder — count of 3
  console.log('  drag to reorder...');
  try {
    await page.dragAndDrop('.queue-item:nth-child(1)', '.queue-item:nth-child(2)', { timeout: 5000 });
    await wait(600);
  } catch (e) {
    console.warn('  drag failed:', e.message.slice(0, 60));
  }
  await count(3);

  // Remove a track — count of 3
  // Hover a queue item first to reveal the remove button
  try {
    const firstItem = page.locator('.queue-item').first();
    const box = await firstItem.boundingBox();
    if (box) await page.mouse.move(box.x + 20, box.y + box.height / 2);
  } catch {}
  await click('.queue-remove');
  await count(3);

  // Close queue
  await click('[data-testid="queue-toggle"]');
  await wait(800);
}

// ─── Section 5: LIBRARY ──────────────────────────────────────────────────────

async function doLibrary() {
  console.log('\n════ LIBRARY ════');

  await nav('/library', 2000);

  // Show two-pane layout — count of 5
  await circles(640, 400, 60, 1);
  await count(5);

  // Click into an album in the left pane
  const clicked = await click('[data-testid="album-list-pane"] a, [data-testid="album-list-pane"] li');
  if (!clicked) {
    await click('li, .album-item, .library-item');
  }
  await wait(1500);

  // Scroll their releases — count of 6
  await scroll(400, 18);
  await count(6, 1000, 400);
  await scroll(-200, 10);

  // Switch panes — count of 3
  await count(3, 400, 400);
  await wait(400);

  // Hover over something in current artist page to add to library
  // (most library "add" is done from artist pages, not within library)
  await goToArtist(ARTISTS[0]);
  const savedShelf = await click('[data-testid="save-to-shelf-btn"], button[aria-label*="save" i], .save-btn');
  await count(3);
}

// ─── Section 6: DISCOVER ─────────────────────────────────────────────────────

async function doDiscover() {
  console.log('\n════ DISCOVER ════');

  await nav('/discover', 2000);

  // Genre tag buttons (.tag-chip) and ISO country codes
  const discoverGenres = ['ambient', 'noise rock', 'jazz', 'shoegaze', 'krautrock'];
  const countryCodes  = ['JP', 'FI', 'IS', 'US', 'DE'];

  for (let i = 0; i < 5; i++) {
    const genre = discoverGenres[i % discoverGenres.length];
    const code  = countryCodes[i % countryCodes.length];
    console.log(`  discover cycle [${i + 1}/5]: ${genre} / ${code}`);

    // Click genre tag chip
    try {
      await page.locator('.tag-chip').filter({ hasText: genre }).first().click({ timeout: 4000 });
    } catch {
      // fallback: any tag-chip
      await click('.tag-chip');
    }
    await wait(1500);
    await count(3);

    // Type ISO country code
    try {
      await page.locator('#country-input').fill(code);
      await page.keyboard.press('Enter');
    } catch {}
    await wait(1500);
    await count(3);

    // Scroll results — count of 8
    await circles(900, 400, 50, 1);
    await scroll(700, 28);
    await count(8);
    await scroll(-300, 12);

    // Change country
    const nextCode = countryCodes[(i + 1) % countryCodes.length];
    try {
      await page.locator('#country-input').fill(nextCode);
      await page.keyboard.press('Enter');
    } catch {}
    await wait(1500);
    await count(3);

    // Scroll again — count of 5
    await scroll(400, 18);
    await count(5);
    await scroll(-200, 10);

    // Clear active tag for next cycle
    try {
      await page.locator('.filter-chip.active').first().click({ timeout: 3000 });
      await wait(1000);
    } catch {}
  }
}

// ─── Section 7: TIME MACHINE ─────────────────────────────────────────────────

async function doTimeMachine() {
  console.log('\n════ TIME MACHINE ════');

  await nav('/time-machine', 2000);
  await circles(640, 400, 60, 1);

  // Move through 15 years via the year-slider range input
  try {
    const slider = page.locator('#year-slider');
    await slider.waitFor({ state: 'visible', timeout: 5000 });
    await slider.click();
    for (let yr = 0; yr < 15; yr++) {
      const yearVal = 1975 + yr;
      console.log(`  year: ${yearVal}`);
      await slider.press('ArrowRight');
      await wait(400); // let results load
      await circles(900, 400, 40, 1);
      await count(2);
    }
  } catch (e) {
    console.warn('  year slider failed:', e.message.slice(0, 60));
    await count(15 * 2);
  }

  // Click into an artist from Time Machine results — count of 4
  const clicked = await click('a[href*="/artist/"]');
  if (clicked) {
    await wait(2000);
    await count(4);
    await page.goBack().catch(() => nav('/time-machine'));
    await wait(2000);
  }
}

// ─── Section 8: STYLE MAP ────────────────────────────────────────────────────

async function doStyleMap() {
  console.log('\n════ STYLE MAP ════');

  await nav('/style-map', 3000);
  await circles(640, 400, 80, 2); // circles while D3 renders

  // 3 rounds of pan/zoom
  for (let round = 0; round < 3; round++) {
    console.log(`  style map round ${round + 1}/3`);
    const cx = 640, cy = 400;

    // Pan in one direction — count of 10
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      await page.mouse.move(cx + t * 200 * (round % 2 === 0 ? 1 : -1), cy + t * 80, { steps: 2 });
      await wait(COUNT_MS / 2);
    }
    await page.mouse.up();
    await wait(300);

    // Zoom in — count of 5
    for (let z = 0; z < 5; z++) {
      await page.mouse.wheel(0, -80);
      await wait(COUNT_MS * 0.4);
    }

    // Pan in another direction — count of 10
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      await page.mouse.move(cx - t * 150 * (round % 2 === 0 ? 1 : -1), cy - t * 100, { steps: 2 });
      await wait(COUNT_MS / 2);
    }
    await page.mouse.up();
    await wait(300);

    // Zoom out — count of 5
    for (let z = 0; z < 5; z++) {
      await page.mouse.wheel(0, 80);
      await wait(COUNT_MS * 0.4);
    }

    // Click a node — count of 3
    const clicked = await click('circle, .node, [data-node], text');
    if (clicked) {
      await count(3);
      await page.goBack().catch(() => {});
      await nav('/style-map', 2500);
      await wait(1000);
    } else {
      await count(3);
    }
  }
}

// ─── Section 9: KNOWLEDGE BASE ───────────────────────────────────────────────

async function doKnowledgeBase() {
  console.log('\n════ KNOWLEDGE BASE ════');

  const kbGenres = ['shoegaze', 'post-punk', 'ambient', 'jazz'];

  await nav('/kb', 2000);
  await circles(640, 400, 60, 1);

  for (let i = 0; i < 4; i++) {
    const genre = kbGenres[i];
    console.log(`  KB genre [${i + 1}/4]: ${genre}`);

    // Navigate to the genre
    await nav(`/kb/genre/${genre}`, 2500);
    await circles(640, 400, 50, 1);

    // Scroll — count of 6
    await scroll(500, 20);
    await count(6);
    await scroll(-200, 10);

    // Click a related genre link — count of 4
    const clicked = await click('a[href*="/kb/genre/"]');
    if (clicked) {
      await wait(2000);
      await count(4);
    }

    // Go back to KB home
    await nav('/kb', 1500);
    await wait(500);
  }
}

// ─── Section 10: SERVICE PRIORITY ───────────────────────────────────────────

async function doServicePriority() {
  console.log('\n════ SERVICE PRIORITY ════');

  // Open settings — Streaming tab
  await nav('/settings', 2000);

  // Click Streaming tab
  const streamingTab =
    await click('[data-testid*="streaming" i]') ||
    await clickText('Streaming');

  await wait(1500);
  await circles(640, 400, 50, 1);

  // Show drag-to-reorder panel — count of 5
  await count(5);

  // Try to drag a service up/down
  try {
    await page.locator('.service-row').first().waitFor({ state: 'visible', timeout: 5000 });
    await wait(1000);
    await page.dragAndDrop('.service-row:nth-child(1)', '.service-row:nth-child(2)', { timeout: 5000 });
    await wait(600);
  } catch (e) {
    console.warn('  drag service failed:', e.message.slice(0, 60));
  }
  await count(5);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║   BlackTape Demo Recording — Starting now   ║');
console.log('╚══════════════════════════════════════════════╝\n');

try {
  await doSearch();
  await doArtistPages();
  await doPlayback();
  await doQueue();
  await doLibrary();
  await doDiscover();
  await doTimeMachine();
  await doStyleMap();
  await doKnowledgeBase();
  await doServicePriority();
} catch (e) {
  console.error('Fatal error:', e.message);
}

console.log('\n✓ Demo recording sequence complete.');
await browser.close();
