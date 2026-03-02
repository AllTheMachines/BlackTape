#!/usr/bin/env node
/**
 * Extended Test Runner — connects to an already-running Tauri app via CDP.
 *
 * Unlike run.mjs (which launches its own binary + fixture DB), this connects
 * to the existing app on CDP port 9222 or 9224 — testing against whatever
 * database is currently loaded.
 *
 * Usage:
 *   node tools/test-suite/run-extended.mjs            — run all extended tests
 *   node tools/test-suite/run-extended.mjs --port 9224 — specify CDP port
 */

import { chromium } from 'playwright';
import { EXTENDED_TESTS } from './extended-manifest.mjs';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const CDP_PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 9222;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const SEP = '─'.repeat(65);

function log(msg) { process.stdout.write(msg + '\n'); }

async function main() {
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(' Mercury Extended Test Suite');
  log(`   CDP: ${CDP_BASE}   |   Tests: ${EXTENDED_TESTS.length}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  // Connect to running app
  let browser, page;
  try {
    browser = await chromium.connectOverCDP(CDP_BASE);
    const contexts = browser.contexts();
    if (contexts.length === 0) throw new Error('No browser contexts found');
    const pages = contexts[0].pages();
    if (pages.length === 0) throw new Error('No pages found');
    page = pages[0];
    await page.waitForLoadState('domcontentloaded');
    log(` Connected to ${page.url()}`);
    log('');
  } catch (e) {
    log(` ⚠  Cannot connect to CDP at ${CDP_BASE}: ${e.message}`);
    log('    Make sure the app is running (node tools/launch-cdp.mjs)');
    process.exit(2);
  }

  const results = [];
  const bugs = [];
  let currentArea = '';

  for (const test of EXTENDED_TESTS) {
    if (test.area !== currentArea) {
      currentArea = test.area;
      log('');
      log(SEP);
      log(` ${currentArea}`);
      log(SEP);
    }

    const startMs = Date.now();
    let passed = false;
    let error = null;

    try {
      const result = await Promise.race([
        test.fn(page),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout (30s)')), 30000)),
      ]);
      passed = typeof result === 'boolean' ? result : Boolean(result);
    } catch (e) {
      error = e.message?.split('\n')[0] ?? String(e);
      passed = false;
    }

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    const icon = passed ? PASS : FAIL;
    log(` ${icon}  [${test.id}] ${test.desc} (${elapsed}s)`);
    if (!passed && error) log(`       ${error}`);

    results.push({ ...test, passed, error });
    if (!passed) {
      bugs.push({ id: test.id, area: test.area, desc: test.desc, error });
    }
  }

  // Summary
  const passedTests = results.filter(r => r.passed === true);
  const failedTests = results.filter(r => r.passed === false);

  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(' Summary');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(` ${PASS}  Passed:  ${passedTests.length}`);
  log(` ${FAIL}  Failed:  ${failedTests.length}`);
  log(` Total:  ${results.length}`);
  log('');

  if (bugs.length > 0) {
    log(' Bugs Found:');
    log(' ' + '─'.repeat(63));
    const byArea = {};
    for (const b of bugs) {
      if (!byArea[b.area]) byArea[b.area] = [];
      byArea[b.area].push(b);
    }
    for (const [area, areaBugs] of Object.entries(byArea)) {
      log(`   ${area}:`);
      for (const b of areaBugs) {
        log(`     ${FAIL} [${b.id}] ${b.desc}`);
        if (b.error) log(`           ${b.error}`);
      }
    }
    log('');
    process.exit(1);
  } else {
    log(' All extended tests passed ✓');
    log('');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Extended test runner error:', e.message);
  process.exit(2);
});
