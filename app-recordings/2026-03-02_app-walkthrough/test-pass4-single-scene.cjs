/**
 * Quick integration test: run the pass 4 capture engine on a single scene.
 * Proves the full pipeline works before the 25-minute run.
 */
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SESSION = path.resolve(__dirname);
const OUT_DIR = path.join(SESSION, 'takes', 'test-pass4');
const TARGET_FPS = 15;
const FRAME_MS = Math.floor(1000 / TARGET_FPS);

const wait = ms => new Promise(r => setTimeout(r, ms));

let page, cdp;

// Same capture engine as cameraman-pass4
function startCapture(sceneName) {
  const clipPath = path.join(OUT_DIR, `${sceneName}.mp4`);
  console.log(`  REC ${path.basename(clipPath)}`);

  const proc = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-framerate', String(TARGET_FPS),
    '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let frameCount = 0;
  proc.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write(`\r  ${line.trim().slice(0, 80)}`);
  });

  const running = { value: true };
  const captureLoop = (async () => {
    while (running.value) {
      const t0 = Date.now();
      try {
        const result = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg', quality: 60, optimizeForSpeed: true
        });
        if (running.value && !proc.stdin.destroyed) {
          proc.stdin.write(Buffer.from(result.data, 'base64'));
          frameCount++;
        }
      } catch {}
      const elapsed = Date.now() - t0;
      await wait(Math.max(1, FRAME_MS - elapsed));
    }
  })();

  return { proc, clipPath, running, captureLoop, getFrames: () => frameCount };
}

async function stopCapture(handle) {
  handle.running.value = false;
  await handle.captureLoop;
  return new Promise(resolve => {
    handle.proc.on('close', () => { console.log(`  ${handle.getFrames()} frames`); resolve(); });
    handle.proc.stdin.end();
    setTimeout(() => { try { handle.proc.kill('SIGKILL'); } catch {} resolve(); }, 5000);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Connecting...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224');
  page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page');
  cdp = await page.context().newCDPSession(page);
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  page.setDefaultTimeout(10000);
  console.log('Ready.');

  // Scene 1: Navigate to Slowdive, browse for 15 seconds
  console.log('\n=== Scene: artist-slowdive (15s test) ===');
  const capture = startCapture('artist-slowdive');
  await wait(500);

  const startTime = Date.now();

  // Navigate
  await page.evaluate(() => { window.location.href = '/artist/slowdive'; });
  await wait(3000);

  // Scroll and move around
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(960 + Math.sin(i) * 100, 450 + Math.cos(i) * 50, { steps: 4 });
    await wait(200);
  }

  await page.mouse.wheel(0, 400);
  await wait(2000);

  for (let i = 0; i < 5; i++) {
    await page.mouse.move(960 + Math.cos(i) * 80, 400 + Math.sin(i) * 40, { steps: 4 });
    await wait(300);
  }

  await page.mouse.wheel(0, -200);
  await wait(2000);

  // Keep going until 15s
  while (Date.now() - startTime < 15000) {
    await page.mouse.move(
      960 + Math.sin(Date.now() / 500) * 100,
      500 + Math.cos(Date.now() / 700) * 60,
      { steps: 2 }
    );
    await wait(100);
  }

  await stopCapture(capture);

  const actualDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Duration: ${actualDuration}s`);

  // Verify output
  if (fs.existsSync(capture.clipPath)) {
    const sz = fs.statSync(capture.clipPath).size;
    console.log(`  Output: ${(sz / 1024).toFixed(0)} KB`);

    // Extract middle frame
    const verifyPath = path.join(OUT_DIR, 'verify.png');
    try {
      execSync(`ffmpeg -ss 7 -i "${capture.clipPath}" -frames:v 1 -update 1 -y "${verifyPath}"`,
        { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] });
      console.log(`  Verify frame: ${verifyPath}`);
    } catch {}

    // Get video info
    try {
      const info = execSync(`ffprobe -v quiet -print_format json -show_streams "${capture.clipPath}"`,
        { timeout: 10000, encoding: 'utf-8' });
      const streams = JSON.parse(info).streams;
      const vid = streams.find(s => s.codec_type === 'video');
      if (vid) {
        console.log(`  Resolution: ${vid.width}x${vid.height}`);
        console.log(`  Codec: ${vid.codec_name}, FPS: ${vid.r_frame_rate}`);
        console.log(`  Duration: ${vid.duration || 'N/A'}s, Frames: ${vid.nb_frames || 'N/A'}`);
      }
    } catch {}
  }

  await cdp.detach();
  await browser.close();
  console.log('\nTest complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
