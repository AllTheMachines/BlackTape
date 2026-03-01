/**
 * record-and-run.mjs — cover-art-first demo recording
 *
 * Usage: node tools/record-and-run.mjs
 * Output: press-screenshots/demo-recording.mp4
 *
 * Focus: artist pages (rich cover grids) + crate dig.
 * Skip: explore, kb, style-map, time-machine, settings — all show 0 images.
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

// ─── Connect ──────────────────────────────────────────────────────────────────

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(10000);
console.log('Connected. URL:', page.url());

if (page.url().includes('chrome-error') || page.url() === 'about:blank') {
  await new Promise(r => setTimeout(r, 4000));
}

// ─── Fullscreen ───────────────────────────────────────────────────────────────

await page.bringToFront();
await new Promise(r => setTimeout(r, 500));
console.log('Setting fullscreen...');
try {
  await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow
      ? window.__TAURI__.window.getCurrentWindow()
      : window.__TAURI__?.window?.appWindow;
    await win?.setFullscreen(true);
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.bringToFront();
  const isFS = await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow
      ? window.__TAURI__.window.getCurrentWindow()
      : window.__TAURI__?.window?.appWindow;
    return win?.isFullscreen?.();
  }).catch(() => null);
  console.log('Fullscreen:', isFS);
} catch (e) {
  console.warn('Fullscreen failed:', e.message, '— maximizing instead');
  try {
    await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
      await win?.maximize();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.bringToFront();
  } catch {}
}

// ─── Start ffmpeg ─────────────────────────────────────────────────────────────

console.log(`Starting capture → ${OUT_FILE}`);
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'gdigrab',
  '-framerate', '30',
  '-i', 'desktop',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  OUT_FILE
], { stdio: ['pipe', 'ignore', 'pipe'] });

ffmpeg.stderr.on('data', d => {
  const line = d.toString();
  if (line.includes('frame=')) process.stdout.write('\r' + line.trim().slice(0, 80));
});
ffmpeg.on('close', code => console.log(`\nffmpeg exited (${code}). Output: ${OUT_FILE}`));

await new Promise(r => setTimeout(r, 2000));
console.log('\nRecording started.\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COUNT_MS = 1200;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function nav(path2, settle = 3500) {
  console.log('  nav →', path2);
  await page.evaluate(url => { window.location.href = url; }, path2).catch(() => {});
  await wait(settle);
  await drift(640, 400, 20);
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

async function clickText(text, timeout = 4000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    await wait(500);
    return true;
  } catch { return false; }
}

async function typeInSearch(text) {
  try {
    const input = page.locator('input[type="search"]').first();
    await input.fill('');
    await wait(200);
    for (const ch of text) {
      await input.type(ch, { delay: 75 });
    }
    await input.press('Enter');
    await wait(2200);
  } catch (e) {
    console.warn('  typeInSearch:', e.message.slice(0, 50));
  }
}

// Show player bar (cassette wheels, VU bars, glowing title)
async function showPlayerBar(counts = 3) {
  await page.mouse.move(640, 760, { steps: 10 });
  await count(counts, 640, 760);
}

// ─── Artist roster — all verified ✓ GOOD covers ──────────────────────────────

const ARTISTS = [
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'My Bloody Valentine',         slug: 'my-bloody-valentine' },
  { name: 'Cocteau Twins',               slug: 'cocteau-twins' },
  { name: 'Joy Division',                slug: 'joy-division' },
  { name: 'Bauhaus',                     slug: 'bauhaus-0688add2' },
  { name: 'Siouxsie and the Banshees',   slug: 'siouxsie-and-the-banshees' },
  { name: 'Aphex Twin',                  slug: 'aphex-twin' },
  { name: 'Boards of Canada',            slug: 'boards-of-canada-69158f97' },
  { name: 'Massive Attack',              slug: 'massive-attack' },
  { name: 'Portishead',                  slug: 'portishead' },
  { name: 'Mogwai',                      slug: 'mogwai-d700b3f5' },
  { name: 'Explosions in the Sky',       slug: 'explosions-in-the-sky' },
  { name: 'Sigur Rós',                   slug: 'sigur-ros' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Swans',                       slug: 'swans-3285dc48' },
  { name: 'Radiohead',                   slug: 'radiohead' },
  { name: 'Pixies',                      slug: 'pixies' },
  { name: 'PJ Harvey',                   slug: 'pj-harvey' },
  { name: 'Talk Talk',                   slug: 'talk-talk' },
  { name: 'Ride',                        slug: 'ride-3f575ecd' },
  { name: 'Mazzy Star',                  slug: 'mazzy-star' },
  { name: 'Beach House',                 slug: 'beach-house' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'The Birthday Party',          slug: 'the-birthday-party' },
  { name: 'Gang of Four',                slug: 'gang-of-four' },
  { name: 'Brian Eno',                   slug: 'brian-eno' },
  { name: 'Burial',                      slug: 'burial-9ddce51c' },
  { name: 'Kraftwerk',                   slug: 'kraftwerk' },
  { name: 'Nick Drake',                  slug: 'nick-drake' },
  { name: 'Tom Waits',                   slug: 'tom-waits' },
  { name: 'Dead Can Dance',              slug: 'dead-can-dance' },
  { name: 'Kate Bush',                   slug: 'kate-bush' },
  { name: 'Björk',                       slug: 'bjork-87c5dedd' },
  { name: 'Grouper',                     slug: 'grouper' },
  { name: 'Sparklehorse',                slug: 'sparklehorse' },
  { name: 'Red House Painters',          slug: 'red-house-painters' },
  { name: 'Galaxie 500',                 slug: 'galaxie-500' },
];

// ── 1. SEARCH INTRO — quick genre sweep ──────────────────────────────────────
console.log('\n════ SEARCH INTRO ════');
await nav('/search', 1500);

const introGenres = ['shoegaze', 'krautrock', 'ambient', 'dream pop', 'noise rock'];
for (let i = 0; i < introGenres.length; i++) {
  const genre = introGenres[i];
  console.log(`  genre: ${genre}`);
  await typeInSearch(genre);
  await circles(640, 380, 50, 1);
  await scroll(600, 22);
  await wait(400);
  await scroll(-300, 12);

  // Every other genre, click into an artist from results
  if (i % 2 === 1) {
    const clicked = await click('a[href*="/artist/"]');
    if (clicked) {
      await wait(2500);
      await circles(640, 400, 50, 1);
      await count(4);
      await nav('/search', 1500);
    }
  }
  await wait(300);
}

// ── 2. ARTIST PAGES — the core of the recording ───────────────────────────────
console.log('\n════ ARTIST PAGES ════');
let playbackStarted = false;

for (let i = 0; i < ARTISTS.length; i++) {
  const artist = ARTISTS[i];
  console.log(`  [${i + 1}/${ARTISTS.length}] ${artist.name}`);

  await nav(`/artist/${artist.slug}`, 3500);

  // Wait for release covers to paint before doing anything
  await wait(1000);

  // Gentle orbit to show the page loaded with covers
  await circles(640, 400, 50, 1);
  await count(2);

  // Scroll through release grid slowly — this is the money shot
  await scroll(900, 32);
  await wait(400);

  // Click a release
  const clickedRelease = await click('a[href*="/release/"]');
  if (clickedRelease) {
    await wait(2000);
    await circles(640, 380, 40, 1);
    await count(3);
    await page.goBack().catch(() => nav(`/artist/${artist.slug}`, 2000));
    await wait(2000);
  }

  // Start playback on first artist — runs for the whole recording
  if (!playbackStarted) {
    console.log('  → starting playback (cassette wheels on for the whole run)');
    let played = await click('[data-testid="play-all-btn"]');
    if (!played) {
      played = await click('[data-testid="play-album-btn"]');
    }
    if (played) {
      playbackStarted = true;
      await wait(2500);
      await showPlayerBar(5);
    }
  }

  // Stats tab (not About — it's broken)
  const statsOk = await click('[data-testid="tab-stats"]');
  if (!statsOk) await clickText('Stats');
  await count(2);

  // Back to Overview
  const overOk = await click('[data-testid="tab-overview"]');
  if (!overOk) await clickText('Overview');
  await count(1);

  // Scroll back up ready for next artist
  await scroll(-600, 20);

  // Every 5 artists: hover player bar to show cassette wheels + effects
  if ((i + 1) % 5 === 0) {
    await showPlayerBar(3);
  }
}

// ── 3. CRATE DIG — random cover grid browsing ─────────────────────────────────
console.log('\n════ CRATE DIG ════');
await nav('/crate', 2500);
await circles(640, 400, 60, 1);
await wait(500);

const crateRounds = [
  { genre: 'shoegaze',   decade: '1990s', country: 'JP' },
  { genre: 'ambient',    decade: '1980s', country: 'DE' },
  { genre: 'noise rock', decade: '2000s', country: 'US' },
];

for (let cycle = 0; cycle < crateRounds.length; cycle++) {
  const { genre, decade, country } = crateRounds[cycle];
  console.log(`  crate cycle [${cycle + 1}/3]: ${genre} / ${decade} / ${country}`);

  try {
    await page.locator('.tag-chip').filter({ hasText: genre }).first().click({ timeout: 4000 });
  } catch { await click('.tag-chip'); }
  await wait(1500);
  await count(2);

  try {
    await page.getByText(decade, { exact: false }).first().click({ timeout: 4000 });
  } catch { await click('.decade-btn, .decade-chip'); }
  await wait(1500);
  await count(2);

  try {
    await page.locator('#country-input, [name="country"]').fill(country);
    await page.keyboard.press('Enter');
  } catch {}
  await wait(1500);
  await count(2);

  // Scroll the cover grid — this is visual gold
  await circles(640, 400, 60, 1);
  await scroll(800, 30);
  await count(6);
  await scroll(-300, 14);

  const crateArtist = await click('a[href*="/artist/"]');
  if (crateArtist) {
    await wait(2500);
    await circles(640, 400, 50, 1);
    await count(4);
    await page.goBack().catch(() => nav('/crate', 2000));
    await wait(2000);
  }

  // Clear filters for next cycle
  try {
    await page.locator('.filter-chip.active, .clear-filters, [data-testid="clear-filters"]').first().click({ timeout: 3000 });
    await wait(1000);
  } catch {}
}

// Full random mode — no filters
console.log('  crate: full random mode');
await circles(640, 400, 60, 1);
await scroll(1000, 35);
await count(8);
const randomArtist = await click('a[href*="/artist/"]');
if (randomArtist) {
  await wait(2500);
  await count(4);
  await page.goBack().catch(() => nav('/crate', 2000));
  await wait(2000);
}

// ── 4. DISCOVER — brief pass ──────────────────────────────────────────────────
console.log('\n════ DISCOVER ════');
await nav('/discover', 2500);
await circles(640, 400, 50, 1);

const discoverPairs = [
  { genre: 'shoegaze',  code: 'GB' },
  { genre: 'ambient',   code: 'JP' },
  { genre: 'post-punk', code: 'DE' },
];

for (const { genre, code } of discoverPairs) {
  console.log(`  discover: ${genre} / ${code}`);
  try {
    await page.locator('.tag-chip').filter({ hasText: genre }).first().click({ timeout: 4000 });
  } catch { await click('.tag-chip'); }
  await wait(1500);
  await count(2);

  try {
    await page.locator('#country-input').fill(code);
    await page.keyboard.press('Enter');
  } catch {}
  await wait(1500);
  await count(2);

  await scroll(600, 24);
  await count(5);
  await scroll(-200, 10);

  const discovered = await click('a[href*="/artist/"]');
  if (discovered) {
    await wait(2500);
    await circles(640, 400, 50, 1);
    await count(4);
    await page.goBack().catch(() => nav('/discover', 2000));
    await wait(2000);
  }

  try {
    await page.locator('.filter-chip.active').first().click({ timeout: 3000 });
    await wait(1000);
  } catch {}
}

// ── 5. PLAYER BAR FINALE — cassette wheels, retro effects close-up ───────────
console.log('\n════ PLAYER BAR FINALE ════');

// Navigate to a good-looking artist page as backdrop
await nav(`/artist/${ARTISTS[0].slug}`, 3000);
await wait(500);

// Slow sweeps across the player bar to show all retro FX
for (let pass = 0; pass < 3; pass++) {
  const startX = pass % 2 === 0 ? 150 : 1770;
  const endX   = pass % 2 === 0 ? 1770 : 150;
  for (let i = 0; i <= 40; i++) {
    const x = startX + ((endX - startX) * i) / 40;
    await page.mouse.move(x, 760 + Math.sin(i * 0.5) * 4, { steps: 2 });
    await wait(100);
  }
  await wait(600);
}
await count(3, 640, 760);

// ─── Stop recording ───────────────────────────────────────────────────────────

console.log('\n✓ Complete. Stopping...');

try {
  await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
    await win?.setFullscreen(false);
  });
} catch {}

ffmpeg.stdin.write('q');
ffmpeg.stdin.end();
await new Promise(r => setTimeout(r, 5000));

console.log(`\nDone! → ${OUT_FILE}`);
await browser.close();
