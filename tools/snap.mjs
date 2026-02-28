/**
 * snap.mjs — take one screenshot of the running app via CDP
 * Usage: node tools/snap.mjs <filename>
 * Example: node tools/snap.mjs artist-slowdive-discography.png
 *
 * Requires: app running with CDP on port 9224
 * Launch app: node tools/launch-cdp.mjs
 *
 * Uses raw CDP WebSocket (no Playwright) to avoid SharedWorker conflicts.
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'press-screenshots', 'v5');
const filename = process.argv[2];
const CDP_PORT = 9224;

if (!filename) {
  console.error('Usage: node tools/snap.mjs <filename.png>');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const outPath = path.join(OUT, filename);

// Get list of targets from CDP endpoint — filter to page targets only
const targets = await new Promise((resolve, reject) => {
  const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  });
  req.on('error', reject);
});

const page = targets.find(t => t.type === 'page');
if (!page) {
  console.error('No page target found at CDP port', CDP_PORT, '— is the app running?');
  process.exit(1);
}

// Connect directly to the page via WebSocket (bypasses SharedWorker targets)
const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 1;
const pending = new Map();

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const resolve = pending.get(msg.id);
  if (resolve) {
    pending.delete(msg.id);
    resolve(msg);
  }
};

const rpc = (method, params = {}) => new Promise((resolve, reject) => {
  const id = msgId++;
  pending.set(id, (msg) => {
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  });
  ws.send(JSON.stringify({ id, method, params }));
});

await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

// Capture screenshot
const { data } = await rpc('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
console.log('✓ Saved:', outPath);
ws.close();
