/**
 * Tauri CDP Runner — Phase 14 E2E Tests
 *
 * Launches the Mercury Tauri debug binary, connects Playwright via CDP,
 * and returns a Playwright page for E2E tests to drive.
 *
 * Exports:
 *   setup(rootDir)            → copies fixture DB, launches binary, waits for CDP, returns page
 *   runTauriTest(test, page)  → executes test.fn(page), returns result object
 *   teardown()                → closes browser, kills process, restores mercury.db
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const http = require('http');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _proc = null;
let _browser = null;
let _dbPath = null;
let _dbBackupPath = null;

const CDP_PORT = 9222;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const LAUNCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAppDataDir() {
  const appdata = process.env.APPDATA;
  if (!appdata) throw new Error('APPDATA env var not set — cannot locate mercury.db');
  return path.join(appdata, 'com.mercury.app');
}

function pollCdp(timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(`${CDP_BASE}/json`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        schedule();
      });
      req.setTimeout(1000, () => { req.destroy(); schedule(); });
      req.on('error', schedule);
    }
    function schedule() {
      if (Date.now() >= deadline) {
        return reject(new Error(`CDP not available after ${timeoutMs}ms — app may not have launched`));
      }
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

export async function setup(rootDir) {
  const binaryPath = path.join(rootDir, 'src-tauri', 'target', 'debug', 'blacktape.exe');
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Tauri binary not found: ${binaryPath}\n` +
      `Build it with: cargo build --manifest-path src-tauri/Cargo.toml`
    );
  }

  // Back up existing mercury.db and replace with fixture DB
  const appDataDir = getAppDataDir();
  fs.mkdirSync(appDataDir, { recursive: true });
  _dbPath = path.join(appDataDir, 'mercury.db');
  _dbBackupPath = _dbPath + '.e2e-backup';

  if (fs.existsSync(_dbPath)) {
    fs.copyFileSync(_dbPath, _dbBackupPath);
  }

  const fixtureDb = path.join(rootDir, 'tools', 'test-suite', 'fixtures', 'mercury-test.db');
  if (!fs.existsSync(fixtureDb)) {
    // Auto-seed fixture DB if missing
    const { default: seedDb } = await import('../fixtures/seed-test-db.mjs');
    await seedDb();
  }
  fs.copyFileSync(fixtureDb, _dbPath);

  // Launch binary with WebView2 CDP enabled
  _proc = spawn(binaryPath, [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    },
    stdio: 'ignore',
    detached: false,
  });

  _proc.on('error', (err) => {
    console.error(`[tauri-runner] Process error: ${err.message}`);
  });

  // Wait for CDP endpoint to become available
  await pollCdp(LAUNCH_TIMEOUT_MS);

  // Give WebView2 a moment to initialize the page
  await new Promise(r => setTimeout(r, 1000));

  // Connect via CDP
  _browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = _browser.contexts();
  if (contexts.length === 0) throw new Error('No browser contexts found via CDP');
  const pages = contexts[0].pages();
  if (pages.length === 0) throw new Error('No pages found in browser context');

  const page = pages[0];
  await page.waitForLoadState('domcontentloaded');

  return page;
}

// ---------------------------------------------------------------------------
// runTauriTest
// ---------------------------------------------------------------------------

export async function runTauriTest(test, page) {
  let passed = false;
  let error = null;
  try {
    const result = await test.fn(page);
    passed = typeof result === 'boolean' ? result : Boolean(result);
  } catch (e) {
    error = e.message?.split('\n')[0] ?? String(e);
    passed = false;
  }
  return { ...test, passed, error };
}

// ---------------------------------------------------------------------------
// teardown
// ---------------------------------------------------------------------------

export async function teardown() {
  // Close Playwright CDP connection
  if (_browser) {
    try { await _browser.close(); } catch (_) {}
    _browser = null;
  }

  // Kill Tauri process
  if (_proc) {
    try { _proc.kill(); } catch (_) {}
    _proc = null;
  }

  // Give process time to release file handles before restoring DB
  await new Promise(r => setTimeout(r, 500));

  // Restore original mercury.db (or remove fixture copy if no backup existed)
  if (_dbPath) {
    if (_dbBackupPath && fs.existsSync(_dbBackupPath)) {
      try {
        fs.copyFileSync(_dbBackupPath, _dbPath);
        fs.unlinkSync(_dbBackupPath);
      } catch (e) {
        console.warn(`[tauri-runner] Warning: could not restore mercury.db: ${e.message}`);
      }
    } else if (!_dbBackupPath) {
      try { fs.unlinkSync(_dbPath); } catch (_) {}
    }
  }
  _dbPath = null;
  _dbBackupPath = null;
}
