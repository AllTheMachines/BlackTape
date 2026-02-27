/**
 * launch-cdp.mjs — launch mercury.exe with CDP on port 9224
 * Usage: node tools/launch-cdp.mjs
 */
import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BINARY = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'mercury.exe');
const CDP_PORT = 9224;

// Kill existing
try {
  execSync('taskkill /f /im mercury.exe', { stdio: 'ignore' });
  console.log('Killed existing mercury.exe');
  await new Promise(r => setTimeout(r, 1500));
} catch {}

console.log('Launching mercury.exe with CDP on port', CDP_PORT, '...');
const proc = spawn(BINARY, [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
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
