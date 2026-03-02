/**
 * Quick test: capture 5 seconds of video via CDP renderer screenshots piped to FFmpeg.
 * Proves the capture method works before running the full 41-scene pass.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SESSION = path.resolve(__dirname);
const OUT_DIR = path.join(SESSION, 'takes', 'test-cdp');
const TARGET_FPS = 20;
const FRAME_MS = Math.floor(1000 / TARGET_FPS);
const DURATION_SEC = 5;

const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Connect
  console.log('Connecting to CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page found');
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  console.log('Page ready:', page.url());

  // Get viewport size
  const vp = page.viewportSize();
  console.log('Viewport:', vp);

  // 1) Single screenshot test
  const ssPath = path.join(OUT_DIR, 'single-frame.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  const ssSize = fs.statSync(ssPath).size;
  console.log(`Single screenshot: ${ssSize} bytes -> ${ssPath}`);

  // 2) Measure screenshot speed
  console.log(`\nBenchmarking screenshot speed (10 frames)...`);
  const times = [];
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    await page.screenshot({ type: 'jpeg', quality: 85 });
    times.push(Date.now() - t0);
  }
  const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  const maxFps = Math.floor(1000 / avg);
  console.log(`  Avg: ${avg}ms/frame, Max achievable: ~${maxFps}fps`);
  console.log(`  Per-frame: ${times.join(', ')}ms`);

  // 3) Record 5 seconds to MP4
  const clipPath = path.join(OUT_DIR, 'test-5sec.mp4');
  console.log(`\nRecording ${DURATION_SEC}s at ${TARGET_FPS}fps -> ${clipPath}`);

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe', '-framerate', String(TARGET_FPS),
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

  // Navigate to a page and do some movement while recording
  await page.evaluate(() => { window.location.href = '/'; });
  await wait(1000);

  while (Date.now() - startTime < DURATION_SEC * 1000) {
    const t0 = Date.now();
    try {
      const buf = await page.screenshot({ type: 'jpeg', quality: 85 });
      if (!ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.write(buf);
        frameCount++;
      }
    } catch {}
    const elapsed = Date.now() - t0;
    await wait(Math.max(1, FRAME_MS - elapsed));

    // Move mouse around for visual activity
    const t = (Date.now() - startTime) / 1000;
    await page.mouse.move(
      960 + Math.sin(t * 2) * 200,
      500 + Math.cos(t * 1.5) * 100,
      { steps: 2 }
    ).catch(() => {});
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  const actualFps = (frameCount / actualDuration).toFixed(1);

  // Close FFmpeg
  await new Promise(resolve => {
    ffmpeg.on('close', resolve);
    ffmpeg.stdin.end();
    setTimeout(() => { try { ffmpeg.kill('SIGKILL'); } catch {} resolve(); }, 5000);
  });

  console.log(`\n\nResults:`);
  console.log(`  Frames captured: ${frameCount}`);
  console.log(`  Duration: ${actualDuration.toFixed(1)}s`);
  console.log(`  Actual FPS: ${actualFps}`);

  // Check output
  if (fs.existsSync(clipPath)) {
    const sz = fs.statSync(clipPath).size;
    console.log(`  Output: ${clipPath} (${(sz / 1024).toFixed(0)} KB)`);

    // Extract a frame to verify content
    const verifyPath = path.join(OUT_DIR, 'verify-frame.png');
    try {
      require('child_process').execSync(
        `ffmpeg -ss 2 -i "${clipPath}" -frames:v 1 -update 1 -y "${verifyPath}"`,
        { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] }
      );
      const vSz = fs.statSync(verifyPath).size;
      console.log(`  Verify frame: ${verifyPath} (${(vSz / 1024).toFixed(0)} KB)`);
    } catch {}
  } else {
    console.log('  ERROR: No output file created');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
