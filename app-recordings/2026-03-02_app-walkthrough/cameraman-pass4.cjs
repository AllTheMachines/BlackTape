/**
 * cameraman-pass4.cjs — Per-scene recording via CDP renderer capture
 *
 * PASS 4 — CDP renderer capture:
 *   - Captures frames via raw CDP Page.captureScreenshot (optimizeForSpeed)
 *   - Window does NOT need to be in foreground — captures behind other windows
 *   - No gdigrab, no screen capture, no z-order issues
 *   - ~12-15fps JPEG frames piped to FFmpeg via image2pipe
 *
 * Scenes:
 *   1x  app-launch (start playback on Slowdive)
 *   30x artist pages (full roster from HYPERSPEED-RECORDING-BRIEF)
 *   3x  style-map rounds (pan, zoom, click node)
 *   4x  knowledge-base genres (shoegaze, post-punk, ambient, jazz)
 *   1x  discover-tags (tag cloud intersection filtering)
 *   1x  crate-dig (random grid browsing)
 *   1x  player-bar-finale (slow sweep across retro FX)
 *
 * Usage: node cameraman-pass4.cjs [--dry]
 */

const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- Config ------------------------------------------------------------------

const SESSION   = path.resolve(__dirname);
const ROOT      = path.resolve(__dirname, '../..');
const CDP_PORT  = 9224;
const PASS_NUM  = 4;
const TAKES_DIR = path.join(SESSION, 'takes', `pass-${PASS_NUM}`);
const SS_DIR    = path.join(TAKES_DIR, 'screenshots');
const PRESS_DIR = path.join(SESSION, 'press');
const MANIFEST  = path.join(SESSION, 'manifest.json');
const FS_PS1    = path.join(SESSION, 'window-fullscreen.ps1');
const DRY_RUN   = process.argv.includes('--dry');
const TARGET_FPS = 15;
const FRAME_MS   = Math.floor(1000 / TARGET_FPS); // ~66ms per frame

// --- Artist roster (from HYPERSPEED-RECORDING-BRIEF v4.0) --------------------

const ARTISTS = [
  { name: 'Slowdive',                    slug: 'slowdive' },
  { name: 'My Bloody Valentine',         slug: 'my-bloody-valentine' },
  { name: 'Cocteau Twins',               slug: 'cocteau-twins' },
  { name: 'Ride',                        slug: 'ride-3f575ecd' },
  { name: 'Mazzy Star',                  slug: 'mazzy-star' },
  { name: 'Beach House',                 slug: 'beach-house' },
  { name: 'Joy Division',                slug: 'joy-division' },
  { name: 'Bauhaus',                     slug: 'bauhaus-0688add2' },
  { name: 'Siouxsie and the Banshees',   slug: 'siouxsie-and-the-banshees' },
  { name: 'The Cure',                    slug: 'the-cure' },
  { name: 'The Birthday Party',          slug: 'the-birthday-party' },
  { name: 'Gang of Four',               slug: 'gang-of-four' },
  { name: 'The Fall',                    slug: 'the-fall-d5da1841' },
  { name: 'Aphex Twin',                  slug: 'aphex-twin' },
  { name: 'Boards of Canada',            slug: 'boards-of-canada-69158f97' },
  { name: 'Massive Attack',              slug: 'massive-attack' },
  { name: 'Portishead',                  slug: 'portishead' },
  { name: 'Brian Eno',                   slug: 'brian-eno' },
  { name: 'Burial',                      slug: 'burial-9ddce51c' },
  { name: 'Kraftwerk',                   slug: 'kraftwerk' },
  { name: 'Mogwai',                      slug: 'mogwai-d700b3f5' },
  { name: 'Explosions in the Sky',       slug: 'explosions-in-the-sky' },
  { name: 'Sigur Ros',                   slug: 'sigur-ros' },
  { name: 'Godspeed You! Black Emperor', slug: 'godspeed-you-black-emperor' },
  { name: 'Nick Cave & the Bad Seeds',   slug: 'nick-cave-the-bad-seeds' },
  { name: 'Swans',                       slug: 'swans-3285dc48' },
  { name: 'Radiohead',                   slug: 'radiohead' },
  { name: 'Pixies',                      slug: 'pixies' },
  { name: 'PJ Harvey',                   slug: 'pj-harvey' },
  { name: 'Talk Talk',                   slug: 'talk-talk' },
];

// --- Helpers -----------------------------------------------------------------

let page; // set after connect
let cdp;  // raw CDP session for fast screenshots
const wait = ms => new Promise(r => setTimeout(r, ms));

async function nav(urlPath, settle = 3000) {
  console.log(`    nav -> ${urlPath}`);
  await page.evaluate(url => { window.location.href = url; }, urlPath).catch(() => {});
  await wait(settle);
  await drift(960, 540, 20);
}

async function circles(cx = 960, cy = 500, r = 55, loops = 2) {
  const steps = loops * 28;
  for (let i = 0; i <= steps; i++) {
    const a = (i / 28) * 2 * Math.PI;
    await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    await wait(35);
  }
}

async function drift(cx = 960, cy = 500, px = 20) {
  for (let i = 0; i <= 8; i++) {
    const x = cx + Math.sin(i * 0.8) * px;
    const y = cy + Math.cos(i * 0.5) * (px * 0.5);
    await page.mouse.move(x, y, { steps: 4 });
    await wait(80);
  }
}

async function count(n, cx = 960, cy = 500) {
  for (let i = 0; i < n; i++) {
    await drift(cx + Math.sin(i) * 40, cy, 15);
    await wait(560);
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

async function click(sel, timeout = 5000) {
  try {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    await wait(600);
    return true;
  } catch (e) {
    console.warn(`    click fail: ${sel.slice(0, 40)} -- ${e.message.slice(0, 40)}`);
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

async function showPlayerBar(counts = 3) {
  await page.mouse.move(960, 780, { steps: 10 });
  await count(counts, 960, 780);
}

async function pressScreenshot(label) {
  const files = fs.readdirSync(PRESS_DIR).filter(f => f.endsWith('.png'));
  const idx = String(files.length + 1).padStart(2, '0');
  const p = path.join(PRESS_DIR, `${idx}-${label}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`    press/${idx}-${label}.png`);
}

// --- CDP renderer capture (replaces gdigrab) ---------------------------------
//
// Captures frames via raw CDP Page.captureScreenshot at ~12-15fps.
// Uses optimizeForSpeed for fastest capture. Pipes JPEG to FFmpeg via image2pipe.
// Works behind other windows — captures directly from the Chromium renderer.

function startCapture(sceneName) {
  if (DRY_RUN) return null;

  const clipPath = path.join(TAKES_DIR, `${sceneName}.mp4`);
  console.log(`  REC ${path.basename(clipPath)}`);

  const proc = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe', '-framerate', String(TARGET_FPS),
    '-i', 'pipe:0',
    '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let frameCount = 0;
  proc.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write(`\r  ${line.trim().slice(0, 80)}`);
    else if (line.includes('Error') || line.includes('error') || line.includes('Invalid'))
      console.warn(`  FFmpeg: ${line.trim().slice(0, 120)}`);
  });
  proc.stdin.on('error', () => {}); // Suppress EPIPE if ffmpeg exits early
  proc.on('close', code => {
    if (code !== 0 && code !== null) console.warn(`  FFmpeg exited with code ${code}`);
  });

  // Capture loop: raw CDP screenshots piped to FFmpeg
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
      } catch (e) {
        // Page might be navigating — skip frame
      }
      const elapsed = Date.now() - t0;
      const sleepMs = Math.max(1, FRAME_MS - elapsed);
      await wait(sleepMs);
    }
  })();

  return { proc, clipPath, running, captureLoop, getFrames: () => frameCount };
}

async function stopCapture(handle) {
  if (!handle) return;

  // Stop the capture loop
  handle.running.value = false;
  await handle.captureLoop;

  // Close FFmpeg stdin and wait for it to finish
  return new Promise(resolve => {
    const onClose = () => { console.log(`  ${handle.getFrames()} frames`); resolve(); };
    handle.proc.on('close', onClose);
    try {
      handle.proc.stdin.end();
    } catch {}
    // Safety timeout
    setTimeout(() => {
      try { handle.proc.kill('SIGKILL'); } catch {}
      resolve();
    }, 8000);
  });
}

// --- Scene runner -------------------------------------------------------------

async function scene(name, fn) {
  console.log(`\n=== Scene: ${name} ===`);
  const capture = startCapture(name);
  if (capture) await wait(500); // brief settle for FFmpeg init
  try {
    await fn();
  } catch (e) {
    console.error(`  Scene "${name}" error: ${e.message.split('\n')[0]}`);
  }
  await stopCapture(capture);
  console.log(`  OK ${name} done`);
}

// --- Window management -------------------------------------------------------

function applyFullscreen() {
  console.log('Setting window 1920x1080 at (0,0)...');
  try {
    const out = execSync(`powershell -ExecutionPolicy Bypass -File "${FS_PS1}"`,
      { timeout: 15000, encoding: 'utf-8' });
    console.log(out.trim().split('\n').map(l => '  ' + l).join('\n'));
  } catch (e) {
    console.warn('PS1 failed, trying inline:', e.message);
    execSync(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\\\"user32.dll\\\")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f); }'; $p = Get-Process -Name mercury -EA SilentlyContinue | Select -First 1; if($p){ [W]::ShowWindow($p.MainWindowHandle, 9); Start-Sleep -MS 500; [W]::SetForegroundWindow($p.MainWindowHandle); [W]::SetWindowPos($p.MainWindowHandle, [IntPtr]::Zero, 0, 0, 1920, 1080, 0x0004) }"`, { stdio: 'ignore' });
  }
}

function restoreWindow() {
  try {
    execSync(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W2 { [DllImport(\\\"user32.dll\\\")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f); }'; $p = Get-Process -Name mercury -EA SilentlyContinue | Select -First 1; if($p){ [W2]::SetWindowPos($p.MainWindowHandle, [IntPtr]::new(-2), 100, 100, 1200, 800, 0) }"`, { stdio: 'ignore' });
  } catch {}
}

function killApp() {
  try { execSync('powershell -Command "Stop-Process -Name mercury -Force -EA SilentlyContinue"', { stdio: 'ignore' }); } catch {}
}

async function verifyCapture() {
  const p = path.join(TAKES_DIR, 'verify-pre.png');
  await page.screenshot({ path: p, fullPage: false });
  const sz = fs.statSync(p).size;
  console.log(`  Verify capture: ${sz} bytes -> ${p}`);
}

// --- Main --------------------------------------------------------------------

async function main() {
  fs.mkdirSync(TAKES_DIR, { recursive: true });
  fs.mkdirSync(SS_DIR, { recursive: true });
  fs.mkdirSync(PRESS_DIR, { recursive: true });

  const totalScenes = 1 + ARTISTS.length + 3 + 4 + 1 + 1 + 1;
  console.log(`\n+===================================================+`);
  console.log(`|  Cameraman Pass ${PASS_NUM} -- ${totalScenes} scenes${DRY_RUN ? ' (DRY RUN)' : ''}             |`);
  console.log(`|  ${ARTISTS.length} artists + style-map + KB + extras       |`);
  console.log(`|  Raw CDP capture ~${TARGET_FPS}fps (no foreground needed)   |`);
  console.log(`+===================================================+\n`);

  // Launch app
  console.log('Launching app...');
  const launch = spawn('node', ['tools/launch-cdp.mjs'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
  });
  let launchOut = '';
  launch.stdout.on('data', d => { launchOut += d.toString(); process.stdout.write(d); });
  launch.stderr.on('data', d => { launchOut += d.toString(); process.stderr.write(d); });
  await new Promise((res, rej) => {
    launch.on('close', c => c === 0 ? res() : rej(new Error(`launch exit ${c}`)));
    launch.on('error', rej);
  });
  await wait(3000);

  // Connect CDP
  let browser;
  for (let i = 1; i <= 10; i++) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
      console.log(`Connected to CDP (attempt ${i})`);
      break;
    } catch (e) {
      console.log(`CDP attempt ${i}: ${e.message}`);
      if (i === 10) throw e;
      await wait(1500);
    }
  }
  page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page');
  page.setDefaultTimeout(10000);
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
  console.log('Page ready:', page.url());

  // Create raw CDP session for fast screenshots
  cdp = await page.context().newCDPSession(page);
  console.log('CDP session ready');

  // Set window size (affects viewport dimensions for consistent capture)
  applyFullscreen();
  await wait(2000);
  await verifyCapture();

  try {
    // =======================================================================
    // SCENE: App launch + start playback
    // =======================================================================
    let playbackStarted = false;

    await scene('00-app-launch', async () => {
      await nav('/', 2000);
      await wait(1500);
      await circles(960, 500, 50, 1);
      await pressScreenshot('app-launch');
    });

    // =======================================================================
    // SCENES: All 30 artists
    // =======================================================================
    for (let i = 0; i < ARTISTS.length; i++) {
      const a = ARTISTS[i];
      const idx = String(i + 1).padStart(2, '0');

      await scene(`${idx}-artist-${a.slug}`, async () => {
        console.log(`  [${i + 1}/${ARTISTS.length}] ${a.name}`);
        await nav(`/artist/${a.slug}`, 3500);
        await wait(1000);

        // Drift across release grid
        await circles(960, 450, 50, 1);
        await count(3);

        // Scroll through discography
        await scroll(900, 32);
        await wait(400);

        // Click a release
        const clickedRelease = await click('a[href*="/release/"]');
        if (clickedRelease) {
          await wait(2000);
          await circles(960, 400, 40, 1);
          await count(3);
          await page.goBack().catch(() => nav(`/artist/${a.slug}`, 2000));
          await wait(1500);
        }

        // Start playback on first artist
        if (!playbackStarted && i < 3) {
          console.log('  -> Trying to start playback');
          let played = await click('[data-testid="platform-pill-spotify"]', 3000);
          if (!played) played = await click('.spotify-track-play', 3000);
          if (!played) played = await click('.play-btn', 2000);
          if (!played) played = await click('[data-testid="play-album-btn"]', 2000);
          if (played) {
            playbackStarted = true;
            await wait(2500);
            await showPlayerBar(4);
          }
        }

        // Stats tab
        const statsOk = await click('[data-testid="tab-stats"]');
        if (!statsOk) await clickText('Stats');
        await count(3);

        // Back to Overview
        const overOk = await click('[data-testid="tab-overview"]');
        if (!overOk) await clickText('Overview');
        await count(2);

        // Scroll back up
        await scroll(-600, 20);

        // Press screenshot for select artists
        if ([0, 2, 6, 13, 16, 20, 26, 29].includes(i)) {
          await pressScreenshot(`artist-${a.slug}`);
        }

        // Show player bar every 5 artists
        if ((i + 1) % 5 === 0 && playbackStarted) {
          await showPlayerBar(3);
        }
      });
    }

    // =======================================================================
    // SCENES: Style Map (3 rounds)
    // =======================================================================
    for (let round = 0; round < 3; round++) {
      await scene(`style-map-${round + 1}`, async () => {
        if (round === 0) await nav('/style-map', 4000);
        else await wait(1000);

        try {
          await page.waitForFunction(() =>
            document.querySelector('svg, canvas, .style-map, [data-testid="style-map-panel"]') !== null,
            { timeout: 10000 });
        } catch {}
        await wait(1500);

        // Pan in one direction
        const dir = round % 2 === 0 ? 1 : -1;
        for (let i = 0; i < 20; i++) {
          await page.mouse.move(960 + dir * i * 15, 500 + Math.sin(i * 0.5) * 30, { steps: 3 });
          await wait(100);
        }
        await count(5);

        // Zoom in
        await scroll(-300, 16);
        await count(3);

        // Pan other direction
        for (let i = 0; i < 20; i++) {
          await page.mouse.move(960 - dir * i * 15, 500 - Math.sin(i * 0.5) * 30, { steps: 3 });
          await wait(100);
        }
        await count(5);

        // Zoom out
        await scroll(300, 16);
        await count(3);

        // Click a node
        const nodes = page.locator('g.node[role="button"]');
        const nodeCount = await nodes.count();
        if (nodeCount > 0) {
          const idx = Math.min(round * 3 + 2, nodeCount - 1);
          await nodes.nth(idx).click({ timeout: 5000 }).catch(() => {});
          await wait(2000);
          await count(3);
          await page.goBack().catch(() => nav('/style-map', 2000));
          await wait(1500);
        }

        if (round === 0) await pressScreenshot('style-map');
      });
    }

    // =======================================================================
    // SCENES: Knowledge Base (4 genres)
    // =======================================================================
    const KB_GENRES = ['shoegaze', 'post-punk', 'ambient', 'jazz'];
    for (let g = 0; g < KB_GENRES.length; g++) {
      const genre = KB_GENRES[g];

      await scene(`kb-${genre}`, async () => {
        if (g === 0) {
          await nav('/kb', 3000);
          await pressScreenshot('knowledge-base');
        }

        const gNodes = page.locator('g.node[role="button"]');
        const gCount = await gNodes.count();
        if (gCount > 0) {
          let clicked = false;
          for (let n = 0; n < Math.min(gCount, 50); n++) {
            const text = await gNodes.nth(n).textContent().catch(() => '');
            if (text.toLowerCase().includes(genre)) {
              await gNodes.nth(n).click({ timeout: 5000 });
              clicked = true;
              break;
            }
          }
          if (!clicked) {
            await nav(`/kb/genre/${genre}`, 2500);
          }
        } else {
          await nav(`/kb/genre/${genre}`, 2500);
        }

        await wait(2000);
        await circles(960, 450, 50, 1);
        await count(4);
        await scroll(600, 24);
        await count(4);

        const relatedLink = page.locator('a[href*="/kb/genre/"]').first();
        if (await relatedLink.count() > 0) {
          await relatedLink.click({ timeout: 4000 }).catch(() => {});
          await wait(2000);
          await count(3);
        }

        await nav('/kb', 2000);
        await wait(1000);
      });
    }

    // =======================================================================
    // SCENE: Discover -- tag cloud filtering
    // =======================================================================
    await scene('discover-tags', async () => {
      await nav('/discover', 3000);
      await wait(1500);
      await circles(960, 400, 60, 1);
      await pressScreenshot('discover');

      const tags = page.locator('.tag-chip, .cloud-tag, [data-tag]');
      const tagCount = await tags.count();
      if (tagCount > 0) {
        await tags.first().click({ timeout: 4000 }).catch(() => {});
        await wait(1500);
        await count(3);
      }
      if (tagCount > 1) {
        await tags.nth(Math.min(3, tagCount - 1)).click({ timeout: 4000 }).catch(() => {});
        await wait(1500);
        await count(3);
      }

      await scroll(600, 24);
      await count(5);
      await scroll(-300, 14);
    });

    // =======================================================================
    // SCENE: Crate Dig -- random grid
    // =======================================================================
    await scene('crate-dig', async () => {
      await nav('/crate', 2500);
      await wait(1000);

      const digBtn = page.getByRole('button', { name: /dig/i });
      if (await digBtn.count() > 0) {
        await digBtn.first().click({ timeout: 5000 });
        await wait(2000);
      }

      await circles(960, 400, 60, 1);
      await count(4);
      await scroll(800, 30);
      await count(6);
      await pressScreenshot('crate-dig');

      const artistLink = await click('a[href*="/artist/"]');
      if (artistLink) {
        await wait(2500);
        await circles(960, 400, 50, 1);
        await count(3);
        await page.goBack().catch(() => nav('/crate', 2000));
        await wait(1500);
      }
    });

    // =======================================================================
    // SCENE: Player bar finale -- slow sweep across retro FX
    // =======================================================================
    await scene('player-bar-finale', async () => {
      await nav(`/artist/${ARTISTS[0].slug}`, 3000);
      await wait(500);

      for (let pass = 0; pass < 3; pass++) {
        const startX = pass % 2 === 0 ? 150 : 1770;
        const endX   = pass % 2 === 0 ? 1770 : 150;
        for (let i = 0; i <= 40; i++) {
          const x = startX + ((endX - startX) * i) / 40;
          await page.mouse.move(x, 780 + Math.sin(i * 0.5) * 4, { steps: 2 });
          await wait(100);
        }
        await wait(600);
      }
      await count(3, 960, 780);
      await pressScreenshot('player-bar');
    });

    // =======================================================================
    // Done
    // =======================================================================
    console.log('\n\nALL SCENES COMPLETE');

    // Extract a verify frame from the first clip
    const firstClip = path.join(TAKES_DIR, '00-app-launch.mp4');
    if (fs.existsSync(firstClip)) {
      try {
        execSync(`ffmpeg -ss 1 -i "${firstClip}" -frames:v 1 -update 1 -y "${path.join(TAKES_DIR, 'verify-frame.png')}"`,
          { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] });
        console.log('Verification frame extracted from first clip.');
      } catch {}
    }

    try {
      const layoutSel = page.locator('#layout-switcher');
      if (await layoutSel.count() > 0) {
        await layoutSel.first().selectOption('cockpit');
        await wait(1000);
      }
    } catch {}

  } catch (err) {
    console.error('\nFATAL:', err.message);
    console.error(err.stack);
  } finally {
    restoreWindow();
    try { await cdp.detach(); } catch {}
    try { await browser.close(); } catch {}
    await wait(1000);
    killApp();
  }

  // Summary
  const clips = fs.readdirSync(TAKES_DIR).filter(f => f.endsWith('.mp4'));
  console.log(`\nPass ${PASS_NUM}: ${clips.length} clips recorded.`);
  for (const c of clips.sort()) console.log(`  ${c}`);
  console.log('\nCAMERAMAN COMPLETE');
}

main();
