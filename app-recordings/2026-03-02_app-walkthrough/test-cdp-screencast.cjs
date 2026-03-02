/**
 * Test CDP Page.startScreencast — push-based frame capture.
 * Should be faster than page.screenshot() pull-based approach.
 */
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SESSION = path.resolve(__dirname);
const OUT_DIR = path.join(SESSION, 'takes', 'test-screencast');
const DURATION_SEC = 5;

const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Connecting to CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page found');
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  console.log('Page ready:', page.url());

  // Create CDP session for raw protocol access
  const cdp = await page.context().newCDPSession(page);

  // Test screencast
  const clipPath = path.join(OUT_DIR, 'test-screencast.mp4');
  console.log(`\nRecording ${DURATION_SEC}s via Page.startScreencast -> ${clipPath}`);

  // We'll collect frames with timestamps to analyze timing
  let frameCount = 0;
  const frameTimes = [];
  let ffmpegReady = false;

  // Start FFmpeg — we'll set framerate based on actual delivery
  // Use 20fps as target, FFmpeg will interpolate if needed
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe', '-framerate', '20',
    '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  ffmpeg.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write(`\r  ${line.trim().slice(0, 80)}`);
  });
  ffmpegReady = true;

  const startTime = Date.now();

  // Listen for screencast frames
  cdp.on('Page.screencastFrame', async (params) => {
    const now = Date.now();
    frameTimes.push(now - startTime);
    frameCount++;

    // Decode base64 and pipe to FFmpeg
    const buf = Buffer.from(params.data, 'base64');
    if (ffmpegReady && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.write(buf);
    }

    // Must ack each frame to receive the next
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
    } catch {}
  });

  // Start screencast
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    everyNthFrame: 1
  });

  console.log('Screencast started, recording...');

  // Do some UI activity to trigger repaints
  await page.evaluate(() => { window.location.href = '/'; });
  await wait(1500);

  const loopStart = Date.now();
  while (Date.now() - startTime < DURATION_SEC * 1000) {
    const t = (Date.now() - startTime) / 1000;
    await page.mouse.move(
      960 + Math.sin(t * 2) * 200,
      500 + Math.cos(t * 1.5) * 100,
      { steps: 2 }
    ).catch(() => {});
    await wait(30);
  }

  // Stop screencast
  await cdp.send('Page.stopScreencast');
  const actualDuration = (Date.now() - startTime) / 1000;

  // Close FFmpeg
  ffmpegReady = false;
  await new Promise(resolve => {
    ffmpeg.on('close', resolve);
    ffmpeg.stdin.end();
    setTimeout(() => { try { ffmpeg.kill('SIGKILL'); } catch {} resolve(); }, 5000);
  });

  // Analyze timing
  const actualFps = (frameCount / actualDuration).toFixed(1);
  let avgInterval = 0;
  if (frameTimes.length > 1) {
    const intervals = [];
    for (let i = 1; i < frameTimes.length; i++) {
      intervals.push(frameTimes[i] - frameTimes[i - 1]);
    }
    avgInterval = Math.round(intervals.reduce((a, b) => a + b) / intervals.length);
  }

  console.log(`\n\nResults (screencast):`);
  console.log(`  Frames captured: ${frameCount}`);
  console.log(`  Duration: ${actualDuration.toFixed(1)}s`);
  console.log(`  Actual FPS: ${actualFps}`);
  console.log(`  Avg frame interval: ${avgInterval}ms`);

  if (fs.existsSync(clipPath)) {
    const sz = fs.statSync(clipPath).size;
    console.log(`  Output: ${clipPath} (${(sz / 1024).toFixed(0)} KB)`);

    // Extract verify frame
    const verifyPath = path.join(OUT_DIR, 'verify-frame.png');
    try {
      execSync(`ffmpeg -ss 2 -i "${clipPath}" -frames:v 1 -update 1 -y "${verifyPath}"`,
        { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] });
      console.log(`  Verify frame: ${verifyPath}`);
    } catch {}
  }

  await cdp.detach();
  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
