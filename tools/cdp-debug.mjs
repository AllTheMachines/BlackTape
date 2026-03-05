/**
 * cdp-debug.mjs — inspect button states and overlays in the running app
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

await rpc('Runtime.enable');

const result = await rpc('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => {
      const r = b.getBoundingClientRect();
      const s = window.getComputedStyle(b);
      return {
        text: b.textContent.trim().slice(0, 40),
        disabled: b.disabled,
        pointer: s.pointerEvents,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        hasParent: b.offsetParent !== null,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      };
    });

    const coveringEls = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return r.width > 400 && r.height > 400 && s.pointerEvents !== 'none' &&
             (s.position === 'fixed' || s.position === 'absolute') &&
             parseInt(s.zIndex || '0') > 0;
    }).map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 60),
        pos: s.position,
        z: s.zIndex,
        pointer: s.pointerEvents,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      };
    });

    return { url: window.location.pathname, buttons, coveringEls };
  })()`
});

const info = result.result.value;
console.log('URL:', info.url);
console.log('\nBUTTONS:');
for (const b of info.buttons) console.log(' ', JSON.stringify(b));
console.log('\nCOVERING ELEMENTS (large+absolute/fixed, pointer not none, z>0):');
for (const el of info.coveringEls) console.log(' ', JSON.stringify(el));

ws.close();
