/**
 * launch-cdp.mjs — start Vite dev server + launch mercury.exe with CDP on port 9224
 * Usage: node tools/launch-cdp.mjs
 */
import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..');
const BINARY   = path.join(ROOT, 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9224;
const VITE_PORT = 5173;

async function waitForPort(port, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ok = await new Promise(resolve => {
      const req = http.get(`http://localhost:${port}/`, res => resolve(true));
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

// ─── Start Vite if not already running ───────────────────────────────────────

const viteAlready = await waitForPort(VITE_PORT, 1000);
if (viteAlready) {
  console.log('✓ Vite already running on port', VITE_PORT);
} else {
  console.log('Starting Vite dev server...');
  const viteJs = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const vite = spawn(process.execPath, [viteJs, 'dev'], {
    cwd: ROOT,
    env: { ...process.env, VITE_TAURI: '1' },
    stdio: 'ignore',
    detached: true,
  });
  vite.unref();
  console.log('Waiting for Vite on port', VITE_PORT, '...');
  const viteOk = await waitForPort(VITE_PORT, 30000);
  if (!viteOk) { console.error('✗ Vite did not start within 30s'); process.exit(1); }
  console.log('✓ Vite ready on port', VITE_PORT);
}

// ─── Kill any existing mercury.exe ───────────────────────────────────────────

try {
  execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
  console.log('Killed existing mercury.exe');
  await new Promise(r => setTimeout(r, 1500));
} catch {}

// ─── Launch mercury.exe with CDP ─────────────────────────────────────────────

console.log('Launching mercury.exe with CDP on port', CDP_PORT, '...');
const proc = spawn(BINARY, [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT} --disable-shared-workers` },
  stdio: 'ignore',
  detached: true,
});
proc.unref();
console.log('PID:', proc.pid);

// Poll for CDP
console.log('Waiting for CDP...');
const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
  const ok = await new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/version`, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
  if (ok) { console.log('✓ CDP ready on port', CDP_PORT); process.exit(0); }
  await new Promise(r => setTimeout(r, 500));
}
console.error('✗ CDP not available after 30s');
process.exit(1);
