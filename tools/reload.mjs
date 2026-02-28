/**
 * reload.mjs — trigger a full page reload in the running Tauri app via CDP
 * Usage: node tools/reload.mjs
 * Requires: app running with CDP on port 9224 (node tools/launch-cdp.mjs)
 */
import http from 'http';

const CDP_PORT = 9224;

const targets = await new Promise((resolve, reject) => {
  const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
  });
  req.on('error', reject);
});

const page = targets.find(t => t.type === 'page');
if (!page) { console.error('No page target found'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map(); let id = 1;
const rpc = (method, params = {}) => new Promise((res, rej) => {
  const mid = id++;
  pending.set(mid, msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result));
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.onmessage = e => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); };
await new Promise(r => { ws.onopen = r; ws.onerror = r; });

await rpc('Page.reload', { ignoreCache: true });
console.log('✓ Page reloaded');
ws.close();
