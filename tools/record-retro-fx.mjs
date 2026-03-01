/**
 * record-retro-fx.mjs — short retro FX showcase recording (~90s)
 *
 * Usage: node tools/record-retro-fx.mjs
 * Output: press-screenshots/retro-fx-showcase.mp4
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
const OUT_FILE  = path.join(OUT_DIR, 'retro-fx-showcase.mp4');
const CDP       = 'http://127.0.0.1:9224';

fs.mkdirSync(OUT_DIR, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));

// ─── Connect to app ───────────────────────────────────────────────────────────

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts()[0]?.pages()?.[0];
if (!page) { console.error('No page found via CDP'); process.exit(1); }
page.setDefaultTimeout(10000);
console.log('Connected. URL:', page.url());

if (page.url().includes('chrome-error') || page.url() === 'about:blank') {
  console.log('Waiting for app to load...');
  await wait(4000);
}

// ─── Fullscreen via Tauri API ─────────────────────────────────────────────────

console.log('Setting fullscreen...');
try {
  await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow
      ? window.__TAURI__.window.getCurrentWindow()
      : window.__TAURI__?.window?.appWindow;
    await win?.setFullscreen(true);
  });
  await wait(1500);
  await page.bringToFront();
  console.log('Fullscreen set.');
} catch (e) {
  console.warn('Fullscreen failed:', e.message, '— trying maximize');
  try {
    await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
      await win?.maximize();
    });
    await wait(1000);
  } catch {}
}

// ─── Start ffmpeg recording ───────────────────────────────────────────────────

console.log(`Starting capture → ${OUT_FILE}`);

const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'gdigrab',
  '-framerate', '30',
  '-i', 'title=BlackTape',
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

ffmpeg.on('close', code => {
  console.log(`\nffmpeg exited (${code}). Output: ${OUT_FILE}`);
});

// Give ffmpeg 2s to start
await wait(2000);
console.log('\nRecording started.\n');

// ─── Navigate to Slowdive artist page ────────────────────────────────────────

console.log('Navigating to Slowdive...');
await page.evaluate(() => { window.location.href = '/artist/slowdive'; }).catch(() => {});
await wait(3500);

// Gentle orbit around the page content to show the artist view
console.log('Showing artist page...');
for (let i = 0; i <= 20; i++) {
  const a = (i / 20) * 2 * Math.PI;
  await page.mouse.move(640 + Math.cos(a) * 60, 380 + Math.sin(a) * 30);
  await wait(60);
}
await wait(1000);

// ─── Play a track ─────────────────────────────────────────────────────────────

console.log('Clicking Play All...');
let played = false;
try {
  const playAll = page.locator('[data-testid="play-all-btn"]').first();
  await playAll.waitFor({ state: 'visible', timeout: 5000 });
  await playAll.click();
  played = true;
} catch {}

if (!played) {
  // Try clicking the first release link then play album
  try {
    await page.locator('a[href*="/release/"]').first().click({ timeout: 4000 });
    await wait(2000);
    await page.locator('[data-testid="play-album-btn"]').first().click({ timeout: 4000 });
  } catch (e) {
    console.warn('  play fallback failed:', e.message.slice(0, 50));
  }
}
await wait(2000);

// ─── Hover near player bar — show PLAYING state effects ──────────────────────
// Player bar is fixed at the bottom, roughly y=760 on 1080p fullscreen

console.log('Showing PLAYING state effects (VU bars, LED, tape counter, glow)...');
const PY = 760; // player bar Y

// Slowly sweep across the player bar left → right → left
for (let pass = 0; pass < 2; pass++) {
  const startX = pass === 0 ? 200 : 1720;
  const endX   = pass === 0 ? 1720 : 200;
  const steps  = 40;
  for (let i = 0; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    await page.mouse.move(x, PY, { steps: 2 });
    await wait(120);
  }
  await wait(500);
}

// Linger on track title area (CRT phosphor glow + tape badge)
console.log('  → lingering on track title / tape badge...');
for (let i = 0; i < 20; i++) {
  await page.mouse.move(640 + Math.sin(i * 0.7) * 30, PY + Math.cos(i * 0.5) * 5);
  await wait(150);
}

// Linger on controls-right (blinking LED + pixel corners)
console.log('  → lingering on controls-right (LED, VU, corners)...');
for (let i = 0; i < 20; i++) {
  await page.mouse.move(1500 + Math.sin(i * 0.9) * 20, PY + Math.cos(i * 0.4) * 4);
  await wait(150);
}

await wait(1000);

// ─── PAUSE — show idle waveform + LED off ─────────────────────────────────────

console.log('Pausing to show IDLE state (waveform breathing, LED off)...');
try {
  // Click the play/pause button (center controls area)
  await page.locator('[data-testid="play-pause-btn"], button[aria-label*="pause" i]').first().click({ timeout: 4000 });
} catch {
  // fallback: click in the center controls region
  await page.mouse.click(640, PY);
}
await wait(1500);

// Pan slowly across the player bar while paused
for (let i = 0; i <= 30; i++) {
  const x = 200 + (i / 30) * 1520;
  await page.mouse.move(x, PY, { steps: 2 });
  await wait(130);
}
// Let idle waveform breathe for a few seconds
await wait(3000);

// ─── RESUME — playing state again ────────────────────────────────────────────

console.log('Resuming playback...');
try {
  await page.locator('[data-testid="play-pause-btn"], button[aria-label*="play" i]').first().click({ timeout: 4000 });
} catch {
  await page.mouse.click(640, PY);
}
await wait(1500);

// Final sweep showing all playing effects together
console.log('Final sweep — all effects together...');
for (let i = 0; i <= 40; i++) {
  const x = 100 + (i / 40) * 1720;
  await page.mouse.move(x, PY + Math.sin(i * 0.4) * 3);
  await wait(110);
}
await wait(2000);

// ─── Stop recording ───────────────────────────────────────────────────────────

console.log('\nSequence complete. Stopping recording...');

try {
  await page.evaluate(async () => {
    const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
    await win?.setFullscreen(false);
  });
} catch {}

ffmpeg.stdin.write('q');
ffmpeg.stdin.end();

await wait(5000);

console.log(`\nDone! Video: ${OUT_FILE}`);
await browser.close();
