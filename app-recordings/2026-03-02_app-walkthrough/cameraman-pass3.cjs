/**
 * cameraman-pass3.cjs — Pass 3 recording with Win32 FULLSCREEN + PRIMARY MONITOR ONLY
 *
 * Key fixes from Pass 2:
 * - REMOVED MinimizeAll() — it minimized the app and triggered task-view overlay
 * - REMOVED __TAURI__ API — withGlobalTauri not enabled, so __TAURI__ unavailable via CDP
 * - Uses Win32 SetWindowPos(HWND_TOPMOST, 0, 0, 1920, 1080) to fill primary monitor
 * - Uses FFmpeg -offset_x 0 -offset_y 0 -video_size 1920x1080 to capture ONLY primary monitor
 *   (second monitor at Y=-768 was leaking into captures with bare -i desktop)
 * - Takes verify frame BEFORE dry run to catch issues early
 *
 * Usage: node app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs [--phase=dry|record|both]
 */

const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Config ──────────────────────────────────────────────────────────────────

const SESSION = path.resolve(__dirname);
const ROOT = path.resolve(__dirname, '../..');
const CDP_PORT = 9224;
const VIEWPORT = { width: 1920, height: 1080 };
const MANIFEST_PATH = path.join(SESSION, 'manifest.json');
const STORYBOARD_PATH = path.join(SESSION, 'storyboard.json');
const PASS_NUM = 3;
const TAKES_DIR = path.join(SESSION, 'takes', `pass-${PASS_NUM}`);
const SCREENSHOTS_DIR = path.join(TAKES_DIR, 'screenshots');
const PRESS_DIR = path.join(SESSION, 'press');

const args = process.argv.slice(2);
const phaseArg = args.find(a => a.startsWith('--phase='));
const PHASE = phaseArg ? phaseArg.split('=')[1] : 'both';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const wait = ms => new Promise(r => setTimeout(r, ms));

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function writeManifest(m) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

function readStoryboard() {
  return JSON.parse(fs.readFileSync(STORYBOARD_PATH, 'utf-8'));
}

function getPassEntry(m) {
  return m.passes.find(p => p.pass === PASS_NUM);
}

// ─── Navigation helper ──────────────────────────────────────────────────────

async function navigateTo(page, urlPath) {
  console.log(`    Navigate -> ${urlPath}`);
  await page.evaluate(url => { window.location.href = url; }, urlPath);
  await wait(2500);
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
  await wait(500);
}

// ─── Action Execution ────────────────────────────────────────────────────────

async function executeAction(page, action, isDryRun) {
  const timeout = action.timeout || 5000;
  const desc = (action.description || '').toLowerCase();

  switch (action.type) {
    case 'wait': {
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
      await wait(800);

      if (desc.includes('search result') || desc.includes('results')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelectorAll('a[href*="/artist/"], [data-testid="autocomplete-item"], .result-card, .artist-card').length > 0;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no search results found, continuing');
        }
      } else if (desc.includes('player bar') || desc.includes('transport')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('.player-bar, .player, [data-testid="player"]') !== null;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no player bar found, continuing');
        }
      } else if (desc.includes('queue sidebar') || desc.includes('queue')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('.queue, .queue-panel, [data-testid="queue-panel"]') !== null;
          }, { timeout: 5000 });
        } catch {
          console.log('    Wait: no queue sidebar found, continuing');
        }
      } else if (desc.includes('artist page') || desc.includes('artist header')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('.artist-header, .artist-name, h1, h2') !== null;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no artist header found, continuing');
        }
      } else if (desc.includes('tag cloud') || desc.includes('discover')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelectorAll('.tag-chip, .cloud-tag, [data-tag], .tag-cloud').length > 0 ||
                   document.querySelectorAll('a[href*="/artist/"]').length > 0;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no discover content found, continuing');
        }
      } else if (desc.includes('style map') || desc.includes('graph visualization')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('svg, canvas, .style-map, [data-testid="style-map-panel"]') !== null;
          }, { timeout: 10000 });
        } catch {
          console.log('    Wait: no style map found, continuing');
        }
      } else if (desc.includes('knowledge base') || desc.includes('genre graph')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('svg, canvas, .kb-graph, .genre-graph') !== null;
          }, { timeout: 10000 });
        } catch {
          console.log('    Wait: no KB content found, continuing');
        }
      } else if (desc.includes('genre page') || desc.includes('genre description')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('h1, h2, .genre-header, .genre-title') !== null;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no genre page found, continuing');
        }
      } else if (desc.includes('time machine') || desc.includes('decade')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelectorAll('button').length > 3;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no time machine content found, continuing');
        }
      } else if (desc.includes('crate') || desc.includes('dig')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('button, .dig-btn, [data-testid]') !== null;
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no crate digging content found, continuing');
        }
      } else if (desc.includes('library') || desc.includes('album')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('[data-testid="album-list-pane"], .library, .album-grid') !== null ||
                   document.readyState === 'complete';
          }, { timeout: 8000 });
        } catch {
          console.log('    Wait: no library content found, continuing');
        }
      } else if (desc.includes('settings') || desc.includes('configuration')) {
        await wait(1000);
      } else if (desc.includes('layout') || desc.includes('panel')) {
        await wait(1000);
      } else if (desc.includes('main interface') || desc.includes('navigation')) {
        try {
          await page.waitForFunction(() => {
            return document.querySelector('.left-sidebar') !== null &&
                   document.querySelector('input[type="search"]') !== null;
          }, { timeout: 10000 });
        } catch {
          console.log('    Wait: main interface not fully detected, continuing');
        }
      }
      break;
    }

    case 'click': {
      if (desc.includes('search input') || desc.includes('search bar') || desc.includes('search field')) {
        const inputs = page.locator('input[type="search"]');
        const count = await inputs.count();
        if (count > 0) {
          const input = count > 1 ? inputs.nth(1) : inputs.first();
          console.log(`    Click -> search input`);
          await input.click({ timeout });
          return;
        }
      }

      if (desc.includes('first artist result') || desc.includes('first artist')) {
        const link = page.locator('a[href*="/artist/"]').first();
        if (await link.count() > 0) {
          console.log(`    Click -> first artist link`);
          await link.click({ timeout });
          return;
        }
      }

      if (desc.includes('tags toggle') || (desc.includes('tags') && desc.includes('switch'))) {
        const tagsBtn = page.locator('.mode-btn').filter({ hasText: 'Tags' });
        if (await tagsBtn.count() > 0) {
          console.log(`    Click -> Tags mode button`);
          await tagsBtn.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('genre tag') && (desc.includes('tag cloud') || desc.includes('electronic') || desc.includes('ambient'))) {
        const tags = page.locator('.tag-chip, .cloud-tag, [data-tag], .tag-btn, button.tag');
        const count = await tags.count();
        if (count > 0) {
          console.log(`    Click -> tag chip (${count} available)`);
          await tags.first().click({ timeout });
          return;
        }
        const genreText = page.getByText(/electronic|ambient|rock|pop|indie/i).first();
        if (await genreText.count() > 0) {
          console.log(`    Click -> genre text`);
          await genreText.click({ timeout });
          return;
        }
      }

      if (desc.includes('second genre tag') || desc.includes('narrow down')) {
        const tags = page.locator('.tag-chip, .cloud-tag, [data-tag], .tag-btn, button.tag');
        const count = await tags.count();
        if (count > 1) {
          console.log(`    Click -> second tag chip`);
          await tags.nth(Math.min(1, count - 1)).click({ timeout });
          return;
        } else if (count > 0) {
          await tags.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('genre node') && (desc.includes('knowledge base') || desc.includes('graph'))) {
        const gNodes = page.locator('g.node[role="button"]');
        const count = await gNodes.count();
        if (count > 0) {
          const idx = Math.min(2, count - 1);
          console.log(`    Click -> g.node[role="button"] (${count} available, clicking #${idx})`);
          await gNodes.nth(idx).click({ timeout: 8000 });
          return;
        }
        const rects = page.locator('svg rect');
        const rCount = await rects.count();
        if (rCount > 0) {
          console.log(`    Click -> SVG rect node (${rCount} available)`);
          await rects.nth(Math.min(2, rCount - 1)).click({ timeout: 8000 });
          return;
        }
        console.log('    Click -> fallback: navigating to /kb/genre/shoegaze');
        await navigateTo(page, '/kb/genre/shoegaze');
        return;
      }

      if (desc.includes('decade button') || desc.includes('decade')) {
        for (const decade of ['90s', '80s', '70s', '2000s', '60s']) {
          const btn = page.locator('button').filter({ hasText: decade });
          if (await btn.count() > 0) {
            console.log(`    Click -> decade button "${decade}"`);
            await btn.first().click({ timeout });
            return;
          }
        }
        const anyDecade = page.getByText(/\d{2}s/).first();
        if (await anyDecade.count() > 0) {
          console.log(`    Click -> decade text`);
          await anyDecade.click({ timeout });
          return;
        }
      }

      if (desc.includes('dig button')) {
        const digBtn = page.getByRole('button', { name: /dig/i });
        if (await digBtn.count() > 0) {
          console.log(`    Click -> Dig button`);
          await digBtn.first().click({ timeout });
          return;
        }
        const anyDig = page.locator('button').filter({ hasText: /dig/i }).first();
        if (await anyDig.count() > 0) {
          await anyDig.click({ timeout });
          return;
        }
      }

      if (desc.includes('track') && (desc.includes('library') || desc.includes('play'))) {
        const track = page.locator('[data-testid="library-track-row"], [data-testid="track-row"], .track-row').first();
        if (await track.count() > 0) {
          console.log(`    Click -> track row`);
          await track.click({ timeout });
          return;
        }
        const artistLink = page.locator('a[href*="/artist/"]').first();
        if (await artistLink.count() > 0) {
          console.log(`    Click -> artist link (fallback for play)`);
          await artistLink.click({ timeout });
          return;
        }
      }

      if (desc.includes('queue icon') || (desc.includes('queue') && desc.includes('button'))) {
        const queueBtn = page.locator('[data-testid="queue-toggle"]');
        if (await queueBtn.count() > 0) {
          console.log(`    Click -> queue-toggle`);
          await queueBtn.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('layout switcher') || desc.includes('layout dropdown')) {
        const select = page.locator('#layout-switcher');
        if (await select.count() > 0) {
          console.log(`    Click -> #layout-switcher`);
          await select.first().click({ timeout });
          return;
        }
      }

      if ((desc.includes('different layout') || desc.includes('focus') || desc.includes('minimal')) && (desc.includes('select') || desc.includes('layout') || desc.includes('dropdown'))) {
        const select = page.locator('#layout-switcher');
        if (await select.count() > 0) {
          console.log(`    Select -> layout "focus"`);
          await select.first().selectOption('focus');
          return;
        }
      }

      // Generic fallback
      const role = 'button';
      const keywords = desc.split(/\s+/).filter(w => w.length > 3 && !['click','the','into','from','with','that','this'].includes(w));
      for (const kw of keywords.sort((a, b) => b.length - a.length)) {
        try {
          const loc = page.getByRole(role, { name: new RegExp(kw, 'i') });
          if (await loc.count() > 0) {
            console.log(`    Click -> getByRole('${role}', {name: /${kw}/i})`);
            await loc.first().click({ timeout });
            return;
          }
        } catch {}
      }
      for (const kw of keywords.sort((a, b) => b.length - a.length)) {
        if (kw.length < 4) continue;
        try {
          const loc = page.getByText(kw, { exact: false });
          const count = await loc.count();
          if (count > 0 && count <= 5) {
            console.log(`    Click -> getByText('${kw}')`);
            await loc.first().click({ timeout });
            return;
          }
        } catch {}
      }

      console.log(`    Click: could not resolve "${action.description}" - skipping`);
      break;
    }

    case 'type': {
      if (desc.includes('search') || desc.includes('artist name') || desc.includes('genre tag')) {
        const searchInputs = page.locator('input[type="search"]');
        const count = await searchInputs.count();
        let input;
        if (count > 1) {
          const mainInput = page.locator('.search-bar input[type="search"]');
          if (await mainInput.count() > 0) {
            input = mainInput.first();
          } else {
            input = searchInputs.nth(1);
          }
        } else if (count > 0) {
          input = searchInputs.first();
        }

        if (input) {
          console.log(`    Type -> search input: "${action.text}"`);
          await input.fill('');
          await wait(100);
          for (const ch of action.text) {
            await input.type(ch, { delay: 60 });
          }
          await input.press('Enter');
          return;
        }
      }

      const anyInput = page.locator('input:visible').first();
      if (await anyInput.count() > 0) {
        await anyInput.fill(action.text);
      }
      break;
    }

    case 'scroll': {
      let deltaY = 300;
      if (desc.includes('up') || desc.includes('back to the top')) deltaY = -800;
      else if (desc.includes('down') || desc.includes('more') || desc.includes('reveal')) deltaY = 400;
      if (desc.includes('bit more')) deltaY = 300;
      if (desc.includes('slightly')) deltaY = 200;

      const steps = Math.abs(deltaY) / 25;
      const stepDelta = deltaY / steps;
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, stepDelta);
        await wait(50);
      }
      break;
    }

    case 'hover': {
      if (desc.includes('genre node') || desc.includes('style map') || desc.includes('graph')) {
        const svg = page.locator('svg, canvas').first();
        if (await svg.count() > 0) {
          const box = await svg.boundingBox();
          if (box) {
            const offsetX = desc.includes('different') || desc.includes('smaller') ? 0.6 : 0.4;
            const offsetY = desc.includes('different') || desc.includes('smaller') ? 0.3 : 0.4;
            const x = box.x + box.width * offsetX + Math.random() * box.width * 0.1;
            const y = box.y + box.height * offsetY + Math.random() * box.height * 0.1;
            console.log(`    Hover -> SVG area (${Math.round(x)}, ${Math.round(y)})`);
            await page.mouse.move(x, y, { steps: 15 });
            return;
          }
        }
      }

      console.log('    Hover -> center of viewport (fallback)');
      await page.mouse.move(960, 540, { steps: 10 });
      break;
    }

    case 'delay': {
      await wait(action.ms);
      break;
    }

    case 'navigate': {
      let navUrl = null;
      if (desc.includes('discover')) navUrl = '/discover';
      else if (desc.includes('style map')) navUrl = '/style-map';
      else if (desc.includes('knowledge base')) navUrl = '/kb';
      else if (desc.includes('time machine')) navUrl = '/time-machine';
      else if (desc.includes('crate') || desc.includes('dig')) navUrl = '/crate';
      else if (desc.includes('library')) navUrl = '/library';
      else if (desc.includes('settings')) navUrl = '/settings';
      else if (desc.includes('explore')) navUrl = '/explore';
      else if (desc.includes('profile')) navUrl = '/profile';
      else if (desc.includes('about')) navUrl = '/about';

      if (navUrl) {
        await navigateTo(page, navUrl);
      } else if (action.url) {
        await navigateTo(page, action.url);
      }
      break;
    }

    case 'screenshot': {
      if (isDryRun) return;
      break;
    }

    default:
      console.log(`    Unknown action type: ${action.type}`);
  }
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

async function launchApp() {
  console.log('Launching app via: node tools/launch-cdp.mjs');
  const proc = spawn('node', ['tools/launch-cdp.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); process.stdout.write(d); });
  proc.stderr.on('data', d => { output += d.toString(); process.stderr.write(d); });

  await new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`launch-cdp exited with code ${code}: ${output}`));
    });
    proc.on('error', reject);
  });
  console.log('App launched successfully');
}

async function connectCDP(maxAttempts = 10) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
      console.log(`Connected to CDP (attempt ${i})`);
      return browser;
    } catch (err) {
      console.log(`CDP attempt ${i}/${maxAttempts}: ${err.message}`);
      if (i < maxAttempts) await wait(1500);
    }
  }
  throw new Error(`Could not connect to CDP after ${maxAttempts} attempts`);
}

async function getPage(browser) {
  const page = browser.contexts()[0]?.pages()?.[0];
  if (!page) throw new Error('No page found');

  const url = page.url();
  if (url.includes('chrome-error') || url === 'about:blank') {
    console.log('Page not ready, waiting...');
    await wait(5000);
  }

  page.setDefaultTimeout(10000);
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
  console.log('Page ready. URL:', page.url());
  return page;
}

// ─── PASS 3 FIX: Win32 SetWindowPos + primary monitor FFmpeg ─────────────────

const FULLSCREEN_PS1 = path.join(SESSION, 'window-fullscreen.ps1');

async function prepareWindow(page) {
  console.log('\n═══ WINDOW PREPARATION (Pass 3 — Win32 SetWindowPos) ═══');

  // Step 1: Run PowerShell to restore, resize, and make topmost
  console.log('Step 1: Setting window to 1920x1080 at (0,0) with HWND_TOPMOST...');
  try {
    const output = execSync(
      `powershell -ExecutionPolicy Bypass -File "${FULLSCREEN_PS1}"`,
      { timeout: 15000, encoding: 'utf-8' }
    );
    console.log(output.trim().split('\n').map(l => '  ' + l).join('\n'));
  } catch (e) {
    console.error('  PowerShell fullscreen failed:', e.message);
    // Inline fallback
    try {
      execSync(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WA { [DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\\\"user32.dll\\\")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f); }'; $p = Get-Process -Name mercury -EA SilentlyContinue | Select -First 1; if($p){ [WA]::ShowWindow($p.MainWindowHandle, 9); Start-Sleep -MS 500; [WA]::SetForegroundWindow($p.MainWindowHandle); [WA]::SetWindowPos($p.MainWindowHandle, [IntPtr]::new(-1), 0, 0, 1920, 1080, 0) }"`, { stdio: 'ignore' });
      console.log('  Inline fallback applied');
    } catch (e2) {
      console.warn('  Inline fallback also failed:', e2.message);
    }
  }

  // Step 2: Also bring to front via Playwright CDP
  await page.bringToFront();
  await wait(1500);

  // Verify window dimensions from Playwright side
  const dims = await page.evaluate(() => ({
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    screenW: screen.width,
    screenH: screen.height,
  }));
  console.log(`  WebView size: ${dims.innerW}x${dims.innerH} (screen: ${dims.screenW}x${dims.screenH})`);

  // Step 3: Take a verify frame BEFORE proceeding (primary monitor only)
  console.log('Step 3: Taking verify frame (primary monitor only)...');
  const verifyPath = path.join(TAKES_DIR, 'verify-frame-pre.png');
  try {
    execSync(
      `ffmpeg -f gdigrab -framerate 1 -offset_x 0 -offset_y 0 -video_size 1920x1080 -i desktop -frames:v 1 -update 1 -y "${verifyPath}"`,
      { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] }
    );
    if (fs.existsSync(verifyPath)) {
      const stat = fs.statSync(verifyPath);
      console.log(`  Verify frame saved: ${stat.size} bytes`);
      console.log(`  VERIFY: ${verifyPath}`);
    }
  } catch (e) {
    console.warn('  Verify frame capture failed:', e.message);
  }

  console.log('═══ Window preparation complete ═══\n');
}

async function restoreWindow(page) {
  console.log('\nRestoring window state...');
  try {
    // Remove HWND_TOPMOST and restore to default size
    execSync(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WR { [DllImport(\\\"user32.dll\\\")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f); }'; $p = Get-Process -Name mercury -EA SilentlyContinue | Select -First 1; if($p){ [WR]::SetWindowPos($p.MainWindowHandle, [IntPtr]::new(-2), 100, 100, 1200, 800, 0) }"`, { stdio: 'ignore' });
    console.log('  Window restored to 1200x800, TOPMOST removed');
  } catch {
    console.log('  Window restore failed (non-critical)');
  }
}

// ─── FFmpeg per-scene ────────────────────────────────────────────────────────

function startFFmpeg(sceneName) {
  const clipPath = path.join(TAKES_DIR, `${sceneName}.mp4`);
  console.log(`  FFmpeg -> ${path.basename(clipPath)}`);

  const proc = spawn('ffmpeg', [
    '-y',
    '-f', 'gdigrab',
    '-framerate', '30',
    '-offset_x', '0',
    '-offset_y', '0',
    '-video_size', '1920x1080',
    '-i', 'desktop',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  proc.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write('\r  ' + line.trim().slice(0, 80));
  });

  return { proc, clipPath };
}

function stopFFmpeg(ffmpegObj) {
  return new Promise((resolve) => {
    if (!ffmpegObj?.proc) { resolve(); return; }
    ffmpegObj.proc.on('close', () => {
      console.log('\n  FFmpeg stopped');
      resolve();
    });
    try { ffmpegObj.proc.stdin.write('q'); ffmpegObj.proc.stdin.end(); } catch {}
    setTimeout(() => {
      try { ffmpegObj.proc.kill('SIGKILL'); } catch {}
      resolve();
    }, 5000);
  });
}

// ─── Screenshots ─────────────────────────────────────────────────────────────

let pressScreenshotIndex = 1;

async function takePressScreenshot(page, label) {
  const idx = String(pressScreenshotIndex).padStart(2, '0');
  const filename = `${idx}-${label}.png`;
  const pressPath = path.join(PRESS_DIR, filename);

  console.log(`  Press screenshot: press/${filename}`);
  await page.screenshot({ path: pressPath, fullPage: false });

  const m = readManifest();
  if (!m.press_screenshots) m.press_screenshots = [];
  m.press_screenshots.push(pressPath);
  writeManifest(m);

  pressScreenshotIndex++;
  return pressPath;
}

async function takeCheckpointScreenshot(page, sceneName, sceneIndex) {
  const filename = `${sceneName}-checkpoint.png`;
  const ssPath = path.join(SCREENSHOTS_DIR, filename);

  console.log(`  Screenshot: ${filename}`);
  await page.screenshot({ path: ssPath, fullPage: false });

  const m = readManifest();
  const pass = getPassEntry(m);
  pass.scenes[sceneIndex].checkpoint_screenshot_path = ssPath;
  pass.checkpoint_screenshots.push(ssPath);
  writeManifest(m);
  return ssPath;
}

// ─── Dry Run ─────────────────────────────────────────────────────────────────

async function dryRun(page, storyboard) {
  const scenes = storyboard.scenes;
  console.log(`\nStarting dry run -- verifying ${scenes.length} scenes...`);

  const failures = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`  Dry run scene ${i + 1}/${scenes.length}: ${scene.name}...`);

    let sceneFailed = false;
    for (const action of scene.actions) {
      if (action.type === 'screenshot') continue;

      try {
        await executeAction(page, action, true);
      } catch (err) {
        failures.push({
          sceneName: scene.name,
          actionType: action.type,
          description: action.description,
          error: err.message.split('\n')[0]
        });
        console.log(`  [FAIL] ${scene.name}: ${action.type} failed -- ${err.message.split('\n')[0]}`);
        sceneFailed = true;
        break;
      }
    }

    if (!sceneFailed) {
      console.log(`  [PASS] ${scene.name}`);
    }
  }

  return failures;
}

// ─── Recording ───────────────────────────────────────────────────────────────

async function recordScenes(page, storyboard) {
  const scenes = storyboard.scenes;
  console.log(`\nRecording -- ${scenes.length} scenes...\n`);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    const m0 = readManifest();
    const p0 = getPassEntry(m0);
    if (p0.scenes[i].status === 'complete') {
      console.log(`  Skip scene ${i + 1}: ${scene.name} (already complete)`);
      continue;
    }

    // Mark recording
    const m1 = readManifest();
    getPassEntry(m1).scenes[i].status = 'recording';
    writeManifest(m1);

    console.log(`Recording scene ${i + 1}/${scenes.length}: ${scene.name}...`);

    // Start FFmpeg
    const ffmpeg = startFFmpeg(scene.name);
    await wait(1500);

    let sceneFailed = false;
    let failureReason = '';

    for (const action of scene.actions) {
      if (action.type === 'screenshot') {
        try {
          await takePressScreenshot(page, action.label);
        } catch (err) {
          console.log(`  Warning: Press screenshot failed: ${err.message.split('\n')[0]}`);
        }
        continue;
      }

      try {
        await executeAction(page, action, false);
      } catch (err) {
        const msg = err.message.split('\n')[0];
        console.log(`  [FAIL] Scene ${scene.name}: ${action.type} -- ${msg}`);
        failureReason = `${action.type} action failed -- ${msg}`;
        sceneFailed = true;
        break;
      }
    }

    // Stop FFmpeg
    await stopFFmpeg(ffmpeg);

    if (sceneFailed) {
      const mf = readManifest();
      const pf = getPassEntry(mf);
      pf.scenes[i].status = 'failed';
      pf.scenes[i].failure_reason = failureReason;
      writeManifest(mf);
      console.log(`  [FAIL] ${scene.name}\n`);
    } else {
      await takeCheckpointScreenshot(page, scene.name, i);

      const mc = readManifest();
      const pc = getPassEntry(mc);
      pc.scenes[i].status = 'complete';
      pc.scenes[i].clip_path = ffmpeg.clipPath;
      writeManifest(mc);
      console.log(`  [OK] Scene ${i + 1} complete: ${scene.name}\n`);
    }
  }
}

// ─── Video Verification ──────────────────────────────────────────────────────

function verifyVideo() {
  console.log('\n═══ VIDEO VERIFICATION ═══');
  const m = readManifest();
  const pass = getPassEntry(m);
  const firstComplete = pass.scenes.find(s => s.status === 'complete' && s.clip_path);

  if (!firstComplete) {
    console.log('  No completed clips to verify');
    return false;
  }

  const verifyPath = path.join(TAKES_DIR, 'verify-frame.png');
  try {
    execSync(`ffmpeg -ss 2 -i "${firstComplete.clip_path}" -frames:v 1 -update 1 -y "${verifyPath}"`, { timeout: 10000, stdio: ['ignore', 'ignore', 'ignore'] });
    if (fs.existsSync(verifyPath)) {
      const stat = fs.statSync(verifyPath);
      console.log(`  Verification frame: ${stat.size} bytes from ${path.basename(firstComplete.clip_path)}`);
      console.log(`  VERIFY: ${verifyPath}`);
      console.log('  Check this frame manually to confirm it shows only the app.');
      return true;
    }
  } catch (e) {
    console.warn('  Verification frame extraction failed:', e.message);
  }
  return false;
}

// ─── Manifest Init ───────────────────────────────────────────────────────────

function initPass(storyboard) {
  // Create directories
  fs.mkdirSync(TAKES_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(PRESS_DIR, { recursive: true });

  const m = readManifest();

  // Remove any existing pass 3 entry (from previous failed runs)
  m.passes = m.passes.filter(p => p.pass !== PASS_NUM);

  // Create pass 3 entry
  const passEntry = {
    pass: PASS_NUM,
    started_at: new Date().toISOString(),
    completed_at: null,
    cameraman_status: 'running',
    scenes: storyboard.scenes.map(s => ({
      scene_name: s.name,
      status: 'pending',
      clip_path: null,
      checkpoint_screenshot_path: null,
      retry_count: 0,
      failure_reason: null
    })),
    checkpoint_screenshots: [],
    director_verdict: 'pending',
    revision_notes: null,
    cut_spec_path: null,
    ffmpeg_output_path: null
  };

  m.passes.push(passEntry);
  m.current_pass = PASS_NUM;
  m.director_approved = false;
  writeManifest(m);

  console.log(`Pass ${PASS_NUM} initialized. ${storyboard.scenes.length} scenes to record.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const storyboard = readStoryboard();
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Cameraman Pass ${PASS_NUM} — ${storyboard.scenes.length} scenes, mode: ffmpeg                    ║`);
  console.log(`║  FIX: Win32 SetWindowPos + primary monitor FFmpeg capture   ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

  // Init pass in manifest
  initPass(storyboard);

  // Clear old press screenshots for pass 3
  const m0 = readManifest();
  m0.press_screenshots = [];
  writeManifest(m0);

  let browser, page;

  try {
    // ── Dry Run ──
    if (PHASE === 'dry' || PHASE === 'both') {
      await launchApp();
      await wait(3000);
      browser = await connectCDP();
      page = await getPage(browser);

      // PASS 3 FIX: Tauri fullscreen BEFORE dry run
      await prepareWindow(page);

      await navigateTo(page, '/');
      await wait(2000);

      const failures = await dryRun(page, storyboard);

      if (failures.length > 0) {
        console.log(`\nDry run FAILED.\n\nFailed scenes:`);
        for (const f of failures) {
          console.log(`  - ${f.sceneName}: ${f.actionType} failed -- ${f.error}`);
        }

        const m = readManifest();
        const pass = getPassEntry(m);
        pass.cameraman_status = 'dry-run-failed';
        pass.completed_at = new Date().toISOString();
        writeManifest(m);

        await restoreWindow(page);
        await browser.close();
        await killApp();
        process.exit(1);
      }

      console.log(`\nDry run complete -- all ${storyboard.scenes.length} scenes passed. Restarting for recording...\n`);

      await restoreWindow(page);
      await browser.close();
      await killApp();
      await wait(2000);
    }

    // ── Record ──
    if (PHASE === 'record' || PHASE === 'both') {
      const mr = readManifest();
      const pr = getPassEntry(mr);
      pr.cameraman_status = 'running';
      pr.completed_at = null;
      pr.started_at = new Date().toISOString();
      writeManifest(mr);

      await launchApp();
      await wait(3000);
      browser = await connectCDP();
      page = await getPage(browser);

      // PASS 3 FIX: Tauri fullscreen BEFORE recording
      await prepareWindow(page);

      await navigateTo(page, '/');
      await wait(2000);

      await recordScenes(page, storyboard);

      // ── Completion ──
      const m = readManifest();
      const pass = getPassEntry(m);
      const completeCount = pass.scenes.filter(s => s.status === 'complete').length;
      const failedCount = pass.scenes.filter(s => s.status === 'failed').length;
      const total = pass.scenes.length;

      pass.cameraman_status = completeCount === total ? 'complete' : completeCount > 0 ? 'partial' : 'failed';
      pass.completed_at = new Date().toISOString();
      writeManifest(m);

      // Restore window before layout change
      await restoreWindow(page);

      // Restore layout to cockpit before closing
      console.log('\nRestoring app layout to cockpit...');
      try {
        const layoutSel = page.locator('#layout-switcher');
        if (await layoutSel.count() > 0) {
          await layoutSel.first().selectOption('cockpit');
          await wait(1000);
          console.log('  Layout restored to cockpit');
        }
      } catch {
        console.log('  Layout restore skipped');
      }

      await browser.close();
      await killApp();

      // Video verification
      const verified = verifyVideo();

      // Summary
      console.log(`\nPass ${PASS_NUM} complete.\n`);
      console.log('Scene Results:');
      console.log('| Scene                  | Status   | Clip                                      |');
      console.log('|------------------------|----------|-------------------------------------------|');
      for (const s of pass.scenes) {
        const clip = s.clip_path ? path.basename(s.clip_path) : '-- (failed)';
        console.log(`| ${s.scene_name.padEnd(22)} | ${s.status.padEnd(8)} | ${clip.padEnd(41)} |`);
      }
      console.log(`\n${completeCount}/${total} scenes recorded successfully.`);
      console.log(`Video verification: ${verified ? 'FRAME EXTRACTED (check manually)' : 'SKIPPED'}`);
      console.log('\nCAMERAMAN COMPLETE');
    }
  } catch (err) {
    console.error('\nFATAL:', err.message);
    console.error(err.stack);
    try { if (page) await restoreWindow(page); } catch {}
    try { if (browser) await browser.close(); } catch {}
    await killApp();
    try {
      const m = readManifest();
      const pass = getPassEntry(m);
      if (pass) {
        pass.cameraman_status = 'failed';
        pass.completed_at = new Date().toISOString();
      }
      writeManifest(m);
    } catch {}
    process.exit(1);
  }
}

async function killApp() {
  console.log('Killing mercury.exe...');
  try {
    execSync('powershell -Command "Stop-Process -Name mercury -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
    await wait(2000);
    console.log('App killed');
  } catch {
    console.log('No mercury.exe process found');
  }
}

main();
