#!/usr/bin/env node
// Baseline (Phase 13, 2026-02-24): 63 passing (62 code + 1 build), 30 skipped — exits 0
// Phase 14 adds: method: 'tauri' block — connects to running Tauri app via CDP
/**
 * Mercury Test Suite
 *
 * Usage:
 *   node tools/test-suite/run.mjs            — run all tests
 *   node tools/test-suite/run.mjs --phase 6  — run only Phase 6 tests
 *   node tools/test-suite/run.mjs --code-only — skip browser tests
 *   node tools/test-suite/run.mjs --fast      — skip slow visual tests (style-map, etc.)
 *
 * Exit codes: 0 = all passed, 1 = failures, 2 = setup error
 */

import { spawn } from 'child_process';
import path from 'path';
import { ALL_TESTS } from './manifest.mjs';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const phaseFilter = args.includes('--phase') ? Number(args[args.indexOf('--phase') + 1]) : null;
const codeOnly = args.includes('--code-only');
const fast = args.includes('--fast');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PASS = '✓';
const FAIL = '✗';
const SKIP = '○';
const SEP = '─'.repeat(60);

function log(msg) { process.stdout.write(msg + '\n'); }

function header(title) {
  log('');
  log(SEP);
  log(` ${title}`);
  log(SEP);
}

async function runBuildCheck() {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'check'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    proc.on('close', (code) => resolve(code === 0));
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(' Mercury Test Suite');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Filter tests
  let tests = ALL_TESTS.filter(t => {
    if (phaseFilter && t.phase !== phaseFilter && t.phase !== 0) return false;
    if (codeOnly && t.method !== 'code') return false;
    if (fast && ['P6-05', 'P7-01', 'P7-02'].includes(t.id)) return false;
    return true;
  });

  const codeTests = tests.filter(t => t.method === 'code');
  const buildTests = tests.filter(t => t.method === 'build');
  const tauriTests = tests.filter(t => t.method === 'tauri');
  const skipTests = tests.filter(t => t.method === 'skip');

  log(` Tests: ${codeTests.length} code, ${tauriTests.length} tauri, ${skipTests.length} skipped`);
  if (phaseFilter) log(` Filter: Phase ${phaseFilter} only`);
  log('');

  const results = [];

  // ---------------------------------------------------------------------------
  // 1. Code checks (fast, run first)
  // ---------------------------------------------------------------------------

  if (codeTests.length > 0 && !webOnly) {
    header('Code Checks');
    for (const test of codeTests) {
      let passed = false;
      let error = null;
      try {
        passed = await test.fn();
      } catch (e) {
        error = e.message?.split('\n')[0];
        passed = false;
      }
      const icon = passed ? PASS : FAIL;
      log(` ${icon}  [${test.id}] ${test.desc}`);
      if (!passed && error) log(`       ${error}`);
      results.push({ ...test, passed, error });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Build check
  // ---------------------------------------------------------------------------

  if (buildTests.length > 0 && !webOnly) {
    header('Build Check');
    for (const test of buildTests) {
      process.stdout.write(` ◆  [${test.id}] ${test.desc} ... `);
      const passed = await runBuildCheck();
      log(passed ? PASS : FAIL);
      results.push({ ...test, passed, error: passed ? null : 'npm run check failed' });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Tauri E2E tests (Playwright CDP — requires debug binary)
  // ---------------------------------------------------------------------------

  if (tauriTests.length > 0 && !codeOnly) {
    header('Tauri E2E Tests (CDP)');

    let setup, teardown, runTauriTest;
    try {
      ({ setup, teardown, runTauriTest } = await import('./runners/tauri.mjs'));
    } catch (e) {
      log(` ⚠  Could not load Tauri runner: ${e.message}`);
      tauriTests.forEach(t => results.push({ ...t, passed: null, error: 'Runner unavailable' }));
    }

    if (setup) {
      let page = null;
      try {
        const rootDir = path.resolve(import.meta.dirname, '../..');
        page = await setup(rootDir);
        for (const test of tauriTests) {
          const result = await runTauriTest(test, page);
          const icon = result.passed ? PASS : FAIL;
          log(` ${icon}  [${test.id}] ${test.desc}`);
          if (!result.passed && result.error) log(`       ${result.error}`);
          results.push(result);
        }
      } catch (e) {
        log(` ⚠  Tauri runner failed: ${e.message}`);
        log('    Skipping all Tauri tests. Build the debug binary to run them.');
        tauriTests.forEach(t => {
          if (!results.find(r => r.id === t.id)) {
            results.push({ ...t, passed: null, error: e.message?.split('\n')[0] });
          }
        });
      } finally {
        if (teardown) await teardown().catch(() => {});
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Skipped tests
  // ---------------------------------------------------------------------------

  if (skipTests.length > 0) {
    header('Skipped (requires running desktop app)');
    for (const test of skipTests) {
      log(` ${SKIP}  [${test.id}] ${test.desc}`);
      log(`       Reason: ${test.reason}`);
      results.push({ ...test, passed: null });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Summary
  // ---------------------------------------------------------------------------

  const passed = results.filter(r => r.passed === true);
  const failed = results.filter(r => r.passed === false);
  const skipped = results.filter(r => r.passed === null);

  // Group failures by phase
  const failedByPhase = {};
  for (const r of failed) {
    const key = r.phase === 0 ? 'Build' : `Phase ${r.phase}`;
    if (!failedByPhase[key]) failedByPhase[key] = [];
    failedByPhase[key].push(r);
  }

  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(' Summary');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(` ${PASS}  Passed:  ${passed.length}`);
  log(` ${FAIL}  Failed:  ${failed.length}`);
  log(` ${SKIP}  Skipped: ${skipped.length} (desktop-only)`);
  log('');

  if (failed.length > 0) {
    log(' Failures:');
    for (const [phase, tests] of Object.entries(failedByPhase)) {
      log(`   ${phase}:`);
      for (const t of tests) {
        log(`     ${FAIL} [${t.id}] ${t.desc}`);
        if (t.error) log(`           ${t.error}`);
      }
    }
    log('');
    log(' → Run /gsd:debug to investigate failures');
    log('');
    process.exit(1);
  } else {
    log(' All tests passed ✓');
    log('');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(2);
});
