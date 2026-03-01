/**
 * cameraman-pass1.cjs — Cameraman recording script for Pass 1
 *
 * Phase 1: Dry run (verify all scenes)
 * Phase 2: Restart app, record with FFmpeg per scene
 *
 * Usage: node app-recordings/2026-03-02_app-walkthrough/cameraman-pass1.cjs [--phase=dry|record|both]
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
const LAUNCH_CMD = 'node tools/launch-cdp.mjs';
const MANIFEST_PATH = path.join(SESSION, 'manifest.json');
const STORYBOARD_PATH = path.join(SESSION, 'storyboard.json');
const TAKES_DIR = path.join(SESSION, 'takes', 'pass-1');
const SCREENSHOTS_DIR = path.join(TAKES_DIR, 'screenshots');
const PRESS_DIR = path.join(SESSION, 'press');

// Parse phase argument
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

// ─── Action Resolution (Section 4A Bridge) ───────────────────────────────────

const FILLER = new Set(['the','a','an','in','on','at','to','for','with','of','and','or','then','that','this','into','from','by','its','my','some','any']);

function extractKeywords(description) {
  // Also remove action-type words
  const actionWords = new Set(['click','type','wait','scroll','hover','navigate','delay']);
  return description.split(/\s+/)
    .filter(w => !FILLER.has(w.toLowerCase()) && !actionWords.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length); // longer = more specific
}

function inferRole(actionType, description) {
  const desc = description.toLowerCase();
  if (actionType === 'type') {
    if (desc.includes('dropdown') || desc.includes('select')) return 'combobox';
    return 'textbox';
  }
  if (actionType === 'wait' || actionType === 'scroll') return null;
  // click or hover
  if (desc.includes('tab')) return 'tab';
  if (desc.includes('link')) return 'link';
  if (desc.includes('checkbox')) return 'checkbox';
  if (desc.includes('menu item')) return 'menuitem';
  if (desc.includes('radio')) return 'radio';
  if (desc.includes('button') || desc.includes('btn')) return 'button';
  if (actionType === 'click') return 'button'; // default for click
  return null;
}

async function resolveLocator(page, actionType, description) {
  const keywords = extractKeywords(description);
  if (keywords.length === 0) return null;

  // Strategy 1: data-testid
  for (const kw of keywords) {
    const loc = page.getByTestId(kw);
    if (await loc.count() > 0) {
      console.log(`    Resolved '${description}' -> data-testid: getByTestId('${kw}')`);
      return loc.first();
    }
  }
  // Try kebab-case compound
  const kebab = keywords.join('-').toLowerCase();
  const locKebab = page.getByTestId(kebab);
  if (await locKebab.count() > 0) {
    console.log(`    Resolved '${description}' -> data-testid: getByTestId('${kebab}')`);
    return locKebab.first();
  }

  // Strategy 2: getByRole
  const role = inferRole(actionType, description);
  if (role) {
    for (const kw of keywords) {
      try {
        const loc = page.getByRole(role, { name: new RegExp(kw, 'i') });
        if (await loc.count() > 0) {
          console.log(`    Resolved '${description}' -> getByRole('${role}', {name: /${kw}/i})`);
          return loc.first();
        }
      } catch {}
    }
  }

  // Strategy 3: getByText
  for (const kw of keywords) {
    if (kw.length < 3) continue; // skip very short words
    try {
      const loc = page.getByText(kw, { exact: false });
      const count = await loc.count();
      if (count > 0 && count <= 10) {
        console.log(`    Resolved '${description}' -> getByText('${kw}') [${count} matches]`);
        return loc.first();
      }
    } catch {}
  }

  // Strategy 4: CSS fallback
  for (const kw of keywords) {
    if (kw.length < 3) continue;
    try {
      const loc = page.locator(
        `button:has-text("${kw}"), [aria-label*="${kw}" i], [title*="${kw}" i], a:has-text("${kw}")`
      );
      if (await loc.count() > 0) {
        console.log(`    Resolved '${description}' -> css-fallback("${kw}")`);
        return loc.first();
      }
    } catch {}
  }

  return null;
}

// ─── Action Execution (Section 4C) ───────────────────────────────────────────

async function executeAction(page, action, isDryRun) {
  const timeout = action.timeout || 5000;

  switch (action.type) {
    case 'wait': {
      const loc = await resolveLocator(page, 'wait', action.description);
      if (!loc) {
        // For wait actions, if we can't find a specific element, wait for page stability
        console.log(`    Wait: no specific element found for '${action.description}', waiting for page stability`);
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
        await wait(1000);
        return;
      }
      await loc.waitFor({ state: 'visible', timeout });
      break;
    }

    case 'click': {
      // Special handling for specific known patterns
      const desc = action.description.toLowerCase();

      if (desc.includes('search input') || desc.includes('search bar')) {
        // Click the search input
        const input = page.locator('input[type="search"]').first();
        if (await input.count() > 0) {
          console.log(`    Resolved -> input[type="search"]`);
          await input.click({ timeout });
          return;
        }
      }

      if (desc.includes('first artist result') || desc.includes('first artist')) {
        const link = page.locator('a[href*="/artist/"]').first();
        if (await link.count() > 0) {
          console.log(`    Resolved -> first a[href*="/artist/"]`);
          await link.click({ timeout });
          return;
        }
      }

      if (desc.includes('tags toggle') || desc.includes('tags') && desc.includes('switch')) {
        // Click the Tags mode button
        const tagsBtn = page.locator('.mode-btn').filter({ hasText: 'Tags' });
        if (await tagsBtn.count() > 0) {
          console.log(`    Resolved -> .mode-btn:has-text("Tags")`);
          await tagsBtn.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('genre tag') && desc.includes('tag cloud')) {
        // Click a tag in the tag cloud on discover page
        const tagChip = page.locator('.tag-chip, .cloud-tag, [data-tag]').first();
        if (await tagChip.count() > 0) {
          console.log(`    Resolved -> tag chip in tag cloud`);
          await tagChip.click({ timeout });
          return;
        }
      }

      if (desc.includes('second genre tag') || desc.includes('narrow down further')) {
        const tagChips = page.locator('.tag-chip, .cloud-tag, [data-tag]');
        const count = await tagChips.count();
        if (count > 1) {
          console.log(`    Resolved -> second tag chip`);
          await tagChips.nth(1).click({ timeout });
          return;
        } else if (count > 0) {
          await tagChips.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('genre node') && desc.includes('knowledge base')) {
        // Click a node in the KB graph
        const node = page.locator('circle, .node, .genre-node, svg g').first();
        if (await node.count() > 0) {
          console.log(`    Resolved -> graph node`);
          await node.click({ timeout });
          return;
        }
      }

      if (desc.includes('decade button') || desc.includes('decade')) {
        // Click a decade button on time-machine page
        const decadeBtn = page.locator('button').filter({ hasText: /\d{2}s/ }).first();
        if (await decadeBtn.count() > 0) {
          console.log(`    Resolved -> decade button`);
          await decadeBtn.click({ timeout });
          return;
        }
        // Fallback: try "90s", "80s" etc
        const anyDecade = page.getByText(/\d{2}s/, { exact: false }).first();
        if (await anyDecade.count() > 0) {
          console.log(`    Resolved -> decade text`);
          await anyDecade.click({ timeout });
          return;
        }
      }

      if (desc.includes('dig button')) {
        // Crate digging Dig button
        const digBtn = page.getByRole('button', { name: /dig/i });
        if (await digBtn.count() > 0) {
          console.log(`    Resolved -> Dig button`);
          await digBtn.first().click({ timeout });
          return;
        }
        // Fallback
        const anyDig = page.locator('button').filter({ hasText: /dig/i }).first();
        if (await anyDig.count() > 0) {
          await anyDig.click({ timeout });
          return;
        }
      }

      if (desc.includes('track') && (desc.includes('library') || desc.includes('play'))) {
        // Click a track to play
        const track = page.locator('[data-testid="track-row"], [data-testid="library-track-row"], .track-row, a[href*="/artist/"]').first();
        if (await track.count() > 0) {
          console.log(`    Resolved -> track/artist link`);
          await track.click({ timeout });
          return;
        }
      }

      if (desc.includes('queue icon') || desc.includes('queue') && desc.includes('button')) {
        const queueBtn = page.locator('[data-testid="queue-toggle"]');
        if (await queueBtn.count() > 0) {
          console.log(`    Resolved -> queue-toggle`);
          await queueBtn.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('layout switcher') || desc.includes('layout dropdown')) {
        const select = page.locator('#layout-switcher, .layout-select');
        if (await select.count() > 0) {
          console.log(`    Resolved -> layout-select`);
          await select.first().click({ timeout });
          return;
        }
      }

      if (desc.includes('layout template') || (desc.includes('focus') || desc.includes('minimal')) && desc.includes('layout')) {
        const select = page.locator('#layout-switcher, .layout-select');
        if (await select.count() > 0) {
          console.log(`    Resolved -> layout-select, selecting Focus`);
          await select.first().selectOption('focus');
          return;
        }
      }

      // General resolution via bridge
      const loc = await resolveLocator(page, 'click', action.description);
      if (!loc) {
        throw new Error(`Could not resolve click target: '${action.description}'`);
      }
      await loc.click({ timeout });
      break;
    }

    case 'type': {
      const desc = action.description.toLowerCase();
      // For search bar typing
      if (desc.includes('search') || desc.includes('artist name') || desc.includes('genre tag')) {
        const input = page.locator('input[type="search"]').first();
        if (await input.count() > 0) {
          console.log(`    Resolved type -> input[type="search"]`);
          await input.fill('');
          await wait(100);
          for (const ch of action.text) {
            await input.type(ch, { delay: 60 });
          }
          await input.press('Enter');
          return;
        }
      }

      const loc = await resolveLocator(page, 'type', action.description);
      if (!loc) {
        throw new Error(`Could not resolve type target: '${action.description}'`);
      }
      await loc.fill(action.text);
      break;
    }

    case 'scroll': {
      const desc = action.description.toLowerCase();
      let deltaY = 300;
      if (desc.includes('up') || desc.includes('back to the top')) deltaY = -600;
      if (desc.includes('down') || desc.includes('more')) deltaY = 400;
      if (desc.includes('bit more')) deltaY = 300;
      if (desc.includes('slightly')) deltaY = 200;

      // Smooth scroll
      const steps = Math.abs(deltaY) / 25;
      const stepDelta = deltaY / steps;
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, stepDelta);
        await wait(50);
      }
      break;
    }

    case 'hover': {
      const desc = action.description.toLowerCase();
      if (desc.includes('genre node') || desc.includes('style map')) {
        // Hover over SVG nodes in the style map
        const svgArea = page.locator('svg, .style-map-container, canvas').first();
        if (await svgArea.count() > 0) {
          const box = await svgArea.boundingBox();
          if (box) {
            // Hover toward center area (large nodes tend to be there)
            const x = box.x + box.width * 0.4 + Math.random() * box.width * 0.2;
            const y = box.y + box.height * 0.4 + Math.random() * box.height * 0.2;
            console.log(`    Hover at (${Math.round(x)}, ${Math.round(y)}) in SVG area`);
            await page.mouse.move(x, y, { steps: 10 });
            return;
          }
        }
      }

      if (desc.includes('different') || desc.includes('smaller')) {
        // Move to a different position
        const svgArea = page.locator('svg, .style-map-container, canvas').first();
        if (await svgArea.count() > 0) {
          const box = await svgArea.boundingBox();
          if (box) {
            const x = box.x + box.width * 0.6 + Math.random() * box.width * 0.15;
            const y = box.y + box.height * 0.3 + Math.random() * box.height * 0.15;
            console.log(`    Hover at (${Math.round(x)}, ${Math.round(y)}) in SVG area`);
            await page.mouse.move(x, y, { steps: 10 });
            return;
          }
        }
      }

      const loc = await resolveLocator(page, 'hover', action.description);
      if (loc) {
        await loc.hover();
      } else {
        // Fallback: move mouse to center of page
        await page.mouse.move(960, 540, { steps: 10 });
      }
      break;
    }

    case 'delay': {
      await wait(action.ms);
      break;
    }

    case 'navigate': {
      const desc = action.description.toLowerCase();
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
        console.log(`    Navigate -> ${navUrl}`);
        // Use sidebar link click if possible for natural navigation
        const sidebarLink = page.locator(`.nav-item[href="${navUrl}"], a[href="${navUrl}"]`).first();
        if (await sidebarLink.count() > 0) {
          await sidebarLink.click({ timeout: 5000 });
        } else {
          await page.evaluate(url => { window.location.href = url; }, navUrl);
        }
        await wait(2000);
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
      } else if (action.url) {
        await page.goto(action.url);
        await page.waitForLoadState('networkidle');
      }
      break;
    }

    case 'screenshot': {
      if (isDryRun) return; // Skip during dry run
      // Handled separately in recording loop
      break;
    }

    default:
      console.log(`    Unknown action type: ${action.type}`);
  }
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

async function launchApp() {
  console.log('Launching app via: ' + LAUNCH_CMD);

  const proc = spawn('node', ['tools/launch-cdp.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  // Capture output for debugging
  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); process.stdout.write(d); });
  proc.stderr.on('data', d => { output += d.toString(); process.stderr.write(d); });

  // Wait for the process to finish (it exits after CDP is ready)
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
      console.log(`CDP attempt ${i}/${maxAttempts} failed: ${err.message}`);
      if (i < maxAttempts) await wait(1500);
    }
  }
  throw new Error(`Could not connect to CDP after ${maxAttempts} attempts`);
}

async function getPage(browser) {
  const contexts = browser.contexts();
  let page = contexts[0]?.pages()?.[0];
  if (!page) {
    throw new Error('No page found in browser context');
  }

  // Wait for page to be ready
  const url = page.url();
  if (url.includes('chrome-error') || url === 'about:blank') {
    console.log('Page not ready yet, waiting...');
    await wait(4000);
  }

  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
  console.log('Page ready. URL:', page.url());
  return page;
}

async function setFullscreen(page) {
  console.log('Setting fullscreen...');
  await page.bringToFront();
  await wait(500);
  try {
    await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow
        ? window.__TAURI__.window.getCurrentWindow()
        : window.__TAURI__?.window?.appWindow;
      await win?.setFullscreen(true);
    });
    await wait(2000);
    await page.bringToFront();
    const isFS = await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow
        ? window.__TAURI__.window.getCurrentWindow()
        : window.__TAURI__?.window?.appWindow;
      return win?.isFullscreen?.();
    }).catch(() => null);
    console.log('Fullscreen:', isFS);
  } catch (e) {
    console.warn('Fullscreen failed:', e.message);
    try {
      await page.evaluate(async () => {
        const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
        await win?.maximize();
      });
      await wait(1500);
    } catch {}
  }
}

async function exitFullscreen(page) {
  try {
    await page.evaluate(async () => {
      const win = window.__TAURI__?.window?.getCurrentWindow?.() ?? window.__TAURI__?.window?.appWindow;
      await win?.setFullscreen(false);
    });
  } catch {}
}

async function killApp() {
  console.log('Killing mercury.exe...');
  try {
    execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
    await wait(2000);
    console.log('App killed');
  } catch {
    console.log('No mercury.exe process found');
  }
}

// ─── FFmpeg per-scene ────────────────────────────────────────────────────────

function startFFmpeg(sceneName) {
  const clipPath = path.join(TAKES_DIR, `${sceneName}.mp4`);
  console.log(`  Starting FFmpeg -> ${clipPath}`);

  const ffmpegProc = spawn('ffmpeg', [
    '-y',
    '-f', 'gdigrab',
    '-framerate', '30',
    '-i', 'desktop',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    clipPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  ffmpegProc.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write('\r  ' + line.trim().slice(0, 80));
  });

  return { proc: ffmpegProc, clipPath };
}

function stopFFmpeg(ffmpegObj) {
  return new Promise((resolve) => {
    if (!ffmpegObj || !ffmpegObj.proc) { resolve(); return; }
    ffmpegObj.proc.on('close', () => {
      console.log('\n  FFmpeg stopped');
      resolve();
    });
    ffmpegObj.proc.stdin.write('q');
    ffmpegObj.proc.stdin.end();
    // Force kill after 5s
    setTimeout(() => {
      try { ffmpegObj.proc.kill('SIGKILL'); } catch {}
      resolve();
    }, 5000);
  });
}

// ─── Press Screenshot ────────────────────────────────────────────────────────

let pressScreenshotIndex = 1;

async function takePressScreenshot(page, label) {
  const idx = String(pressScreenshotIndex).padStart(2, '0');
  const filename = `${idx}-${label}.png`;
  const pressPath = path.join(PRESS_DIR, filename);

  console.log(`  Press screenshot: press/${filename}`);
  await page.screenshot({ path: pressPath, fullPage: false });

  // Update manifest
  const m = readManifest();
  m.press_screenshots.push(pressPath);
  writeManifest(m);

  pressScreenshotIndex++;
  return pressPath;
}

// ─── Checkpoint Screenshot ───────────────────────────────────────────────────

async function takeCheckpointScreenshot(page, sceneName, sceneIndex) {
  const filename = `${sceneName}-checkpoint.png`;
  const ssPath = path.join(SCREENSHOTS_DIR, filename);

  console.log(`  Screenshot: ${filename}`);
  await page.screenshot({ path: ssPath, fullPage: false });

  // Update manifest
  const m = readManifest();
  const pass = m.passes[0];
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
      if (action.type === 'screenshot') continue; // Skip screenshots in dry run

      try {
        await executeAction(page, action, true);
      } catch (err) {
        failures.push({
          sceneName: scene.name,
          actionType: action.type,
          description: action.description,
          error: err.message
        });
        console.log(`  [FAIL] ${scene.name}: ${action.type} failed -- ${err.message}`);
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
  console.log(`\nStarting recording -- ${scenes.length} scenes...`);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Check if already complete
    const m0 = readManifest();
    if (m0.passes[0].scenes[i].status === 'complete') {
      console.log(`  Skipping scene ${i + 1}/${scenes.length}: ${scene.name} (already complete)`);
      continue;
    }

    // Update manifest: recording
    const m1 = readManifest();
    m1.passes[0].scenes[i].status = 'recording';
    writeManifest(m1);

    console.log(`\nRecording scene ${i + 1}/${scenes.length}: ${scene.name}...`);

    // Start FFmpeg for this scene
    const ffmpeg = startFFmpeg(scene.name);
    await wait(1500); // Let FFmpeg initialize

    let sceneFailed = false;
    let failureReason = '';

    // Execute actions
    for (const action of scene.actions) {
      if (action.type === 'screenshot') {
        // Press screenshot during recording
        try {
          await takePressScreenshot(page, action.label);
        } catch (err) {
          console.log(`  Warning: Press screenshot failed: ${err.message}`);
        }
        continue;
      }

      try {
        await executeAction(page, action, false);
      } catch (err) {
        console.log(`  [FAIL] Scene ${i + 1} failed: ${scene.name} -- ${action.type} failed: ${err.message}. Stopping scene.`);
        failureReason = `${action.type} action failed -- ${err.message}`;
        sceneFailed = true;
        break;
      }
    }

    // Stop FFmpeg
    await stopFFmpeg(ffmpeg);

    if (sceneFailed) {
      // Mark failed
      const mf = readManifest();
      mf.passes[0].scenes[i].status = 'failed';
      mf.passes[0].scenes[i].failure_reason = failureReason;
      writeManifest(mf);
      console.log(`  [FAIL] Scene ${scene.name} failed`);
      // Continue to next scene
    } else {
      // Take checkpoint screenshot
      await takeCheckpointScreenshot(page, scene.name, i);

      // Mark complete
      const mc = readManifest();
      mc.passes[0].scenes[i].status = 'complete';
      mc.passes[0].scenes[i].clip_path = ffmpeg.clipPath;
      writeManifest(mc);
      console.log(`  [OK] Scene ${i + 1} complete: ${scene.name}`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const storyboard = readStoryboard();
  console.log(`Cameraman Pass 1 -- ${storyboard.scenes.length} scenes, mode: ffmpeg`);
  console.log(`Phase: ${PHASE}`);

  let browser, page;

  try {
    // ── Phase 1: Launch + Dry Run ──
    if (PHASE === 'dry' || PHASE === 'both') {
      // Launch app
      await launchApp();
      await wait(3000);
      browser = await connectCDP();
      page = await getPage(browser);
      await setFullscreen(page);
      await wait(2000);

      // Navigate to home
      await page.evaluate(() => { window.location.href = '/'; });
      await wait(3000);

      // Dry run
      const failures = await dryRun(page, storyboard);

      if (failures.length > 0) {
        console.log(`\nDry run FAILED. Cannot proceed with recording.\n`);
        console.log('Failed scenes:');
        for (const f of failures) {
          console.log(`  - ${f.sceneName}: ${f.actionType} failed -- ${f.error}`);
        }

        // Update manifest
        const m = readManifest();
        m.passes[0].cameraman_status = 'dry-run-failed';
        m.passes[0].completed_at = new Date().toISOString();
        writeManifest(m);

        await exitFullscreen(page);
        await browser.close();
        await killApp();
        process.exit(1);
      }

      console.log(`\nDry run complete -- all ${storyboard.scenes.length} scenes passed. Starting recording...`);

      // Restart app for clean recording
      await exitFullscreen(page);
      await browser.close();
      await killApp();
      await wait(2000);
    }

    // ── Phase 2: Record ──
    if (PHASE === 'record' || PHASE === 'both') {
      // Launch fresh app
      await launchApp();
      await wait(3000);
      browser = await connectCDP();
      page = await getPage(browser);
      await setFullscreen(page);
      await wait(2000);

      // Navigate to home
      await page.evaluate(() => { window.location.href = '/'; });
      await wait(3000);
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });

      // Record all scenes
      await recordScenes(page, storyboard);

      // ── Completion ──
      const m = readManifest();
      const pass = m.passes[0];
      const completeCount = pass.scenes.filter(s => s.status === 'complete').length;
      const failedCount = pass.scenes.filter(s => s.status === 'failed').length;
      const total = pass.scenes.length;

      if (completeCount === total) {
        pass.cameraman_status = 'complete';
      } else if (completeCount > 0) {
        pass.cameraman_status = 'partial';
      } else {
        pass.cameraman_status = 'failed';
      }
      pass.completed_at = new Date().toISOString();
      writeManifest(m);

      // Exit fullscreen, kill app
      await exitFullscreen(page);
      await browser.close();
      await killApp();

      // Print summary
      console.log(`\nPass 1 complete.\n`);
      console.log('Scene Results:');
      console.log('| Scene                  | Status   | Clip                                      |');
      console.log('|------------------------|----------|-------------------------------------------|');
      for (const s of pass.scenes) {
        const clip = s.clip_path ? path.basename(s.clip_path) : '-- (scene action failed)';
        console.log(`| ${s.scene_name.padEnd(22)} | ${s.status.padEnd(8)} | ${clip.padEnd(41)} |`);
      }
      console.log(`\n${completeCount}/${total} scenes recorded successfully.`);
      console.log('\nCAMERAMAN COMPLETE');
    }
  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);

    // Try to clean up
    try { if (page) await exitFullscreen(page); } catch {}
    try { if (browser) await browser.close(); } catch {}
    await killApp();

    // Update manifest
    try {
      const m = readManifest();
      m.passes[0].cameraman_status = 'failed';
      m.passes[0].completed_at = new Date().toISOString();
      writeManifest(m);
    } catch {}

    process.exit(1);
  }
}

main();
