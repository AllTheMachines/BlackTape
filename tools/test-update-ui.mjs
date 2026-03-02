/**
 * test-update-ui.mjs — screenshot both update UI paths via CDP
 * Usage: node tools/test-update-ui.mjs
 * Requires: app running with CDP on port 9224
 */
import http from 'http';
import fs from 'fs';

const CDP_PORT = 9224;

async function getPageTarget() {
  const targets = await new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
  });
  return targets.find(t => t.type === 'page');
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 1;
  const rpc = (method, params = {}) => new Promise((res, rej) => {
    const mid = id++;
    pending.set(mid, msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => { ws.onopen = r; });
  return { ws, rpc };
}

async function screenshot(rpc, filename) {
  const { data } = await rpc('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(filename, Buffer.from(data, 'base64'));
  console.log(`  Screenshot saved: ${filename}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const page = await getPageTarget();
  if (!page) { console.error('No page target found — is the app running with CDP?'); process.exit(1); }

  const { ws, rpc } = await connect(page.webSocketDebuggerUrl);

  // ─── Test 1: Normal update banner ────────────────────────────────────────
  console.log('\n1. Testing NORMAL update banner...');

  // The app's mock returns critical: false after the 3s delay.
  // Wait a moment to be sure the update check has fired.
  await sleep(2000);
  await screenshot(rpc, 'test-normal-update.png');

  // ─── Test 2: Critical update modal ───────────────────────────────────────
  console.log('\n2. Testing CRITICAL update modal...');

  // Inject critical state via the Svelte module's exported reactive object
  await rpc('Runtime.evaluate', {
    expression: `
      (async () => {
        const mod = await import('/src/lib/update.svelte.ts');
        mod.updateState.critical = true;
        mod.updateState.dismissed = false;
        mod.updateState.notes = 'Security fix: patched vulnerability in database loader.';
      })()
    `,
    awaitPromise: true,
  });

  await sleep(500);
  await screenshot(rpc, 'test-critical-update.png');

  // ─── Reset state ─────────────────────────────────────────────────────────
  console.log('\n3. Resetting update state...');
  await rpc('Runtime.evaluate', {
    expression: `
      (async () => {
        const mod = await import('/src/lib/update.svelte.ts');
        mod.updateState.critical = false;
        mod.updateState.available = false;
        mod.updateState.dismissed = false;
      })()
    `,
    awaitPromise: true,
  });

  console.log('\nDone. Check test-normal-update.png and test-critical-update.png\n');
  ws.close();
}

run().catch(e => { console.error(e); process.exit(1); });
