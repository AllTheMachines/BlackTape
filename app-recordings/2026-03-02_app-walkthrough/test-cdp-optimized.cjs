/**
 * Test optimizations for CDP screenshot capture.
 * Compare: page.screenshot() vs raw CDP, different quality levels.
 */
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SESSION = path.resolve(__dirname);
const OUT_DIR = path.join(SESSION, 'takes', 'test-optimized');

const wait = ms => new Promise(r => setTimeout(r, ms));

async function benchmark(label, captureFn, count = 20) {
  const times = [];
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const t0 = Date.now();
    const buf = await captureFn();
    times.push(Date.now() - t0);
    sizes.push(buf.length);
  }
  const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  const avgSize = Math.round(sizes.reduce((a, b) => a + b) / sizes.length / 1024);
  const maxFps = Math.floor(1000 / avg);
  console.log(`  ${label}: ${avg}ms avg, ~${maxFps}fps, ${avgSize}KB/frame`);
  return { avg, maxFps, avgSize };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Connecting to CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page found');
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });

  // Navigate to an artist page for realistic content
  await page.evaluate(() => { window.location.href = '/artist/slowdive'; });
  await wait(3000);

  const cdp = await page.context().newCDPSession(page);

  console.log('\nBenchmarking capture methods (20 frames each):\n');

  // 1) Playwright page.screenshot JPEG q85
  await benchmark('Playwright JPEG q85', async () => {
    return await page.screenshot({ type: 'jpeg', quality: 85 });
  });

  // 2) Playwright page.screenshot JPEG q60
  await benchmark('Playwright JPEG q60', async () => {
    return await page.screenshot({ type: 'jpeg', quality: 60 });
  });

  // 3) Playwright page.screenshot JPEG q40
  await benchmark('Playwright JPEG q40', async () => {
    return await page.screenshot({ type: 'jpeg', quality: 40 });
  });

  // 4) Raw CDP Page.captureScreenshot JPEG q85
  await benchmark('Raw CDP JPEG q85', async () => {
    const result = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 85, optimizeForSpeed: true
    });
    return Buffer.from(result.data, 'base64');
  });

  // 5) Raw CDP Page.captureScreenshot JPEG q60
  await benchmark('Raw CDP JPEG q60', async () => {
    const result = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 60, optimizeForSpeed: true
    });
    return Buffer.from(result.data, 'base64');
  });

  // 6) Raw CDP with clip to specific viewport region
  await benchmark('Raw CDP JPEG q60 clip', async () => {
    const result = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 60, optimizeForSpeed: true,
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }
    });
    return Buffer.from(result.data, 'base64');
  });

  // Now record 5 seconds with the best method to produce a real clip
  console.log('\nRecording 5s with best method...');
  const clipPath = path.join(OUT_DIR, 'test-optimized.mp4');
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe', '-framerate', '15',
    '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  ffmpeg.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write(`\r  ${line.trim().slice(0, 80)}`);
  });

  let frameCount = 0;
  const startTime = Date.now();
  const targetInterval = 66; // ~15fps target

  // Scroll through the page while recording
  while (Date.now() - startTime < 5000) {
    const t0 = Date.now();
    try {
      const result = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg', quality: 60, optimizeForSpeed: true
      });
      const buf = Buffer.from(result.data, 'base64');
      if (!ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.write(buf);
        frameCount++;
      }
    } catch {}

    const elapsed = Date.now() - t0;
    const sleepMs = Math.max(1, targetInterval - elapsed);

    // Do some scrolling for visual activity
    const t = (Date.now() - startTime) / 1000;
    await page.mouse.wheel(0, Math.sin(t * 3) * 5).catch(() => {});
    await wait(sleepMs);
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  const actualFps = (frameCount / actualDuration).toFixed(1);

  await new Promise(resolve => {
    ffmpeg.on('close', resolve);
    ffmpeg.stdin.end();
    setTimeout(() => { try { ffmpeg.kill('SIGKILL'); } catch {} resolve(); }, 5000);
  });

  console.log(`\n\n  Frames: ${frameCount}, Duration: ${actualDuration.toFixed(1)}s, FPS: ${actualFps}`);
  if (fs.existsSync(clipPath)) {
    const sz = fs.statSync(clipPath).size;
    console.log(`  Output: ${(sz / 1024).toFixed(0)} KB`);

    const verifyPath = path.join(OUT_DIR, 'verify.png');
    try {
      execSync(`ffmpeg -ss 2 -i "${clipPath}" -frames:v 1 -update 1 -y "${verifyPath}"`,
        { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] });
      console.log(`  Verify: ${verifyPath}`);
    } catch {}
  }

  await cdp.detach();
  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
