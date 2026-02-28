/**
 * record-and-run.mjs — fullscreen + record + demo, all in one
 *
 * Usage: node tools/record-and-run.mjs
 * Output: press-screenshots/demo-recording.mp4
 *
 * Requires:
 *   - App running with CDP on port 9224 (node tools/launch-cdp.mjs)
 *   - ffmpeg on PATH
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, '..', 'press-screenshots');
const OUT_FILE  = path.join(OUT_DIR, 'demo-recording.mp4');
const CDP       = 'http://127.0.0.1:9224';

fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Connect to app ──────────────────────────────────────────────────────────

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(10000);
console.log('Connected. URL:', page.url());

// Wait for SvelteKit app to load (in case WebView2 is still initializing)
if (page.url().includes('chrome-error') || page.url() === 'about:blank') {
  console.log('Waiting for app to load...');
  await new Promise(r => setTimeout(r, 4000));
  console.log('URL now:', page.url());
}

// ─── Fullscreen via Tauri API ────────────────────────────────────────────────

console.log('Setting fullscreen...');
try {
  await page.evaluate(async () => {
    if (window.__TAURI__?.window) {
      const win = window.__TAURI__.window.getCurrentWindow
        ? window.__TAURI__.window.getCurrentWindow()
        : window.__TAURI__.window.appWindow;
      await win.setFullscreen(true);
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.bringToFront();
  console.log('Fullscreen set.');
} catch (e) {
  console.warn('Fullscreen via Tauri failed:', e.message, '— trying maximize');
  try {
    await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
      await win?.maximize();
    });
    await new Promise(r => setTimeout(r, 1000));
  } catch {}
}

// ─── Start ffmpeg screen recording ───────────────────────────────────────────

console.log(`Starting screen capture → ${OUT_FILE}`);

// Find the display dimensions
let width = 1920, height = 1080;
try {
  const sizeResult = await page.evaluate(() => ({ w: screen.width, h: screen.height }));
  width  = sizeResult.w || 1920;
  height = sizeResult.h || 1080;
} catch {}
console.log(`Screen: ${width}x${height}`);

const ffmpeg = spawn('ffmpeg', [
  '-y',                         // overwrite output
  '-f', 'gdigrab',              // Windows GDI screen capture
  '-framerate', '30',
  '-i', 'title=BlackTape',      // capture only the BlackTape window
  '-c:v', 'libx264',
  '-preset', 'ultrafast',       // low CPU, good for live capture
  '-crf', '18',                 // high quality
  '-pix_fmt', 'yuv420p',
  OUT_FILE
], { stdio: ['pipe', 'ignore', 'pipe'] });

ffmpeg.stderr.on('data', d => {
  const line = d.toString();
  // Only log frame/fps lines
  if (line.includes('frame=')) process.stdout.write('\r' + line.trim().slice(0, 80));
});

ffmpeg.on('close', code => {
  console.log(`\nffmpeg exited (${code}). Output: ${OUT_FILE}`);
});

// Give ffmpeg 2s to start capturing
await new Promise(r => setTimeout(r, 2000));
console.log('\nRecording started. Running demo sequence...\n');

// ─── Import and run the demo sequence ────────────────────────────────────────

// Re-export the helpers for use here — we just inline the demo sequence
// by importing the demo module's exported run function.
// Since record-demo.mjs is not a module with exports, we run it as a subprocess
// BUT we need the same page object. So we inline the full sequence here.

// Pull in all helpers from record-demo.mjs approach — inline the same logic:
const COUNT_MS = 1200;

const ARTISTS = [
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'Boris',                       slug: 'boris' },
  { name: 'Grouper',                     slug: 'grouper' },
];
const GENRES = ['jazz', 'shoegaze', 'krautrock', 'ambient', 'death metal', 'hyperpop', 'noise rock', 'dream pop'];

const wait = ms => new Promise(r => setTimeout(r, ms));

async function safe(fn, timeout = 5000) {
  return Promise.race([
    page.evaluate(fn),
    new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), timeout)),
  ]).catch(e => { console.warn('  safe():', e.message.slice(0, 50)); return null; });
}

async function nav(path2, settle = 3500) {
  console.log('  nav →', path2);
  await safe(p => { window.location.href = p; }, 3000);
  await wait(settle);
  await drift(640, 400, settle > 2000 ? 30 : 10);
}

async function circles(cx = 640, cy = 420, r = 55, loops = 2) {
  const steps = loops * 28;
  for (let i = 0; i <= steps; i++) {
    const a = (i / 28) * 2 * Math.PI;
    await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    await wait(35);
  }
}

async function drift(cx = 640, cy = 400, px = 20) {
  for (let i = 0; i <= 8; i++) {
    const x = cx + Math.sin(i * 0.8) * px;
    const y = cy + Math.cos(i * 0.5) * (px * 0.5);
    await page.mouse.move(x, y, { steps: 4 });
    await wait(80);
  }
}

async function count(n, cx = 640, cy = 400) {
  for (let i = 0; i < n; i++) {
    await drift(cx + Math.sin(i) * 40, cy, 15);
    await wait(COUNT_MS - 80 * 8);
  }
}

async function scroll(px, steps = 24) {
  const dy = px / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy);
    await wait(75);
  }
  await wait(300);
}

async function click(sel, timeout = 6000) {
  try {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    await wait(600);
    return true;
  } catch (e) {
    console.warn('  click:', sel.slice(0, 40), '—', e.message.slice(0, 40));
    return false;
  }
}

async function clickText(text, timeout = 5000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    await wait(500);
    return true;
  } catch { return false; }
}

async function goToArtist(artist) {
  console.log('  → artist:', artist.name);
  await nav(`/artist/${artist.slug}`, 3000);
}

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
    console.warn('  typeInSearch:', e.message.slice(0, 50));
  }
}

// ── Search sequences ──────────────────────────────────────────────────────────
console.log('\n════ SEARCH SEQUENCES ════');
await nav('/search', 1500);

for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  console.log(`  genre [${i + 1}/${GENRES.length}]: ${genre}`);
  await typeInSearch(genre);
  await circles(640, 380, 50, 1);
  await scroll(550, 22);
  await wait(400);
  await scroll(-200, 10);

  if ((i + 1) % 3 === 0) {
    const clicked = await click('a[href*="/artist/"]');
    if (clicked) {
      await wait(2000);
      await circles(640, 400, 60, 1);
      await count(5);
      await nav('/search', 1500);
    }
  }
  await wait(300);
}

// ── Artist pages ──────────────────────────────────────────────────────────────
console.log('\n════ ARTIST PAGES ════');
for (let i = 0; i < ARTISTS.length; i++) {
  const artist = ARTISTS[i];
  console.log(`  artist [${i + 1}/6]: ${artist.name}`);
  await goToArtist(artist);
  await circles(640, 400, 50, 1);
  await count(3);
  await scroll(800, 30);
  await wait(300);

  const clickedRelease = await click('a[href*="/release/"]');
  if (clickedRelease) {
    await wait(2000);
    await circles(640, 380, 40, 1);
    await count(4);
    await page.goBack().catch(() => nav(`/artist/${artist.slug}`));
    await wait(2000);
  }

  const statsOk = await click('[data-testid="tab-stats"]');
  if (!statsOk) await clickText('Stats');
  await count(3);

  const aboutOk = await click('[data-testid="tab-about"]');
  if (!aboutOk) await clickText('About');
  await count(3);

  const overviewOk = await click('[data-testid="tab-overview"]');
  if (!overviewOk) await clickText('Overview');
  await count(2);
}

// ── Playback ──────────────────────────────────────────────────────────────────
console.log('\n════ PLAYBACK ════');
const playbackArtists = [ARTISTS[0], ARTISTS[2], ARTISTS[3]];
for (let i = 0; i < playbackArtists.length; i++) {
  const artist = playbackArtists[i];
  console.log(`  playback artist [${i + 1}/3]: ${artist.name}`);
  await goToArtist(artist);

  const playedAll = await click('[data-testid="play-all-btn"]');
  if (!playedAll) {
    if (await click('a[href*="/release/"]')) {
      await wait(2000);
      await click('[data-testid="play-album-btn"]');
      await page.goBack().catch(() => {});
      await wait(2000);
    }
  }
  await wait(2000);
  await page.mouse.move(640, 760, { steps: 10 });
  await count(5, 640, 760);

  await click('[data-testid="queue-btn"]');
  await wait(600);
  await nav('/search', 1500);
  await page.mouse.move(640, 760, { steps: 10 });
  await count(5, 640, 760);
}

// ── Queue ─────────────────────────────────────────────────────────────────────
console.log('\n════ QUEUE ════');
for (let i = 0; i < 3; i++) {
  const artist = ARTISTS[(i + 1) % ARTISTS.length];
  await goToArtist(artist);
  await click('[data-testid="queue-btn"]');
  await wait(400);
  await click('[data-testid="queue-btn"]');
  await wait(400);
}

await click('[data-testid="queue-toggle"]');
await wait(1200);
await scroll(400, 18);
await count(8, 1000, 400);
await scroll(-200, 10);

try {
  await page.dragAndDrop('.queue-item:nth-child(1)', '.queue-item:nth-child(2)', { timeout: 5000 });
  await wait(600);
} catch (e) { console.warn('  queue drag failed:', e.message.slice(0, 50)); }
await count(3);

try {
  const firstItem = page.locator('.queue-item').first();
  const box = await firstItem.boundingBox();
  if (box) await page.mouse.move(box.x + 20, box.y + box.height / 2);
} catch {}
await click('.queue-remove');
await count(3);

await click('[data-testid="queue-toggle"]');
await wait(800);

// ── Library ───────────────────────────────────────────────────────────────────
console.log('\n════ LIBRARY ════');
await nav('/library', 2000);
await circles(640, 400, 60, 1);
await count(5);

await click('[data-testid="album-list-pane"] li, [data-testid="album-list-pane"] a');
await wait(1500);
await scroll(400, 18);
await count(6, 1000, 400);
await scroll(-200, 10);
await count(3, 400, 400);

// ── Discover ──────────────────────────────────────────────────────────────────
console.log('\n════ DISCOVER ════');
await nav('/discover', 2000);

const discoverGenres = ['ambient', 'noise rock', 'jazz', 'shoegaze', 'krautrock'];
const countryCodes   = ['JP', 'FI', 'IS', 'US', 'DE'];

for (let i = 0; i < 5; i++) {
  const genre = discoverGenres[i % discoverGenres.length];
  const code  = countryCodes[i % countryCodes.length];
  console.log(`  discover cycle [${i + 1}/5]: ${genre} / ${code}`);

  try {
    await page.locator('.tag-chip').filter({ hasText: genre }).first().click({ timeout: 4000 });
  } catch { await click('.tag-chip'); }
  await wait(1500);
  await count(3);

  try {
    await page.locator('#country-input').fill(code);
    await page.keyboard.press('Enter');
  } catch {}
  await wait(1500);
  await count(3);

  await circles(900, 400, 50, 1);
  await scroll(700, 28);
  await count(8);
  await scroll(-300, 12);

  const nextCode = countryCodes[(i + 1) % countryCodes.length];
  try {
    await page.locator('#country-input').fill(nextCode);
    await page.keyboard.press('Enter');
  } catch {}
  await wait(1500);
  await count(3);

  await scroll(400, 18);
  await count(5);
  await scroll(-200, 10);

  try {
    await page.locator('.filter-chip.active').first().click({ timeout: 3000 });
    await wait(1000);
  } catch {}
}

// ── Time Machine ──────────────────────────────────────────────────────────────
console.log('\n════ TIME MACHINE ════');
await nav('/time-machine', 2000);
await circles(640, 400, 60, 1);

try {
  const slider = page.locator('#year-slider');
  await slider.waitFor({ state: 'visible', timeout: 5000 });
  await slider.click();
  for (let yr = 0; yr < 15; yr++) {
    console.log(`  year: ${1975 + yr}`);
    await slider.press('ArrowRight');
    await wait(400);
    await circles(900, 400, 40, 1);
    await count(2);
  }
} catch (e) {
  console.warn('  year slider failed:', e.message.slice(0, 50));
  await count(30);
}

const tmClicked = await click('a[href*="/artist/"]');
if (tmClicked) {
  await wait(2000);
  await count(4);
  await page.goBack().catch(() => nav('/time-machine'));
  await wait(2000);
}

// ── Style Map ─────────────────────────────────────────────────────────────────
console.log('\n════ STYLE MAP ════');
await nav('/style-map', 3000);
await circles(640, 400, 80, 2);

for (let round = 0; round < 3; round++) {
  console.log(`  style map round ${round + 1}/3`);
  const cx = 640, cy = 400;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    await page.mouse.move(cx + t * 200 * (round % 2 === 0 ? 1 : -1), cy + t * 80, { steps: 2 });
    await wait(COUNT_MS / 2);
  }
  await page.mouse.up();
  await wait(300);

  for (let z = 0; z < 5; z++) {
    await page.mouse.wheel(0, -80);
    await wait(COUNT_MS * 0.4);
  }

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    await page.mouse.move(cx - t * 150 * (round % 2 === 0 ? 1 : -1), cy - t * 100, { steps: 2 });
    await wait(COUNT_MS / 2);
  }
  await page.mouse.up();
  await wait(300);

  for (let z = 0; z < 5; z++) {
    await page.mouse.wheel(0, 80);
    await wait(COUNT_MS * 0.4);
  }

  const clicked = await click('circle, .node, [data-node], text', 3000);
  if (clicked) {
    await count(3);
    await page.goBack().catch(() => {});
    await nav('/style-map', 2500);
    await wait(1000);
  } else {
    await count(3);
  }
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
console.log('\n════ KNOWLEDGE BASE ════');
const kbGenres = ['shoegaze', 'post-punk', 'ambient', 'jazz'];
await nav('/kb', 2000);
await circles(640, 400, 60, 1);

for (let i = 0; i < 4; i++) {
  const genre = kbGenres[i];
  console.log(`  KB genre [${i + 1}/4]: ${genre}`);
  await nav(`/kb/genre/${genre}`, 2500);
  await circles(640, 400, 50, 1);
  await scroll(500, 20);
  await count(6);
  await scroll(-200, 10);

  const clicked = await click('a[href*="/kb/genre/"]');
  if (clicked) {
    await wait(2000);
    await count(4);
  }
  await nav('/kb', 1500);
  await wait(500);
}

// ── Service priority ──────────────────────────────────────────────────────────
console.log('\n════ SERVICE PRIORITY ════');
await nav('/settings', 2000);
const streamingTab = await click('[data-testid*="streaming" i]') || await clickText('Streaming');
await wait(1500);
await circles(640, 400, 50, 1);
await count(5);

try {
  await page.locator('.service-row').first().waitFor({ state: 'visible', timeout: 5000 });
  await wait(1000);
  await page.dragAndDrop('.service-row:nth-child(1)', '.service-row:nth-child(2)', { timeout: 5000 });
  await wait(600);
} catch (e) { console.warn('  drag service failed:', e.message.slice(0, 50)); }
await count(5);

// ─── Done — stop recording ───────────────────────────────────────────────────

console.log('\n✓ Demo sequence complete. Stopping recording...');

// Exit fullscreen
try {
  await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
    await win?.setFullscreen(false);
  });
} catch {}

// Send 'q' to ffmpeg stdin to gracefully stop
ffmpeg.stdin.write('q');
ffmpeg.stdin.end();

// Give ffmpeg 5s to finalize
await new Promise(r => setTimeout(r, 5000));

console.log(`\nDone! Video saved to: ${OUT_FILE}`);
await browser.close();
