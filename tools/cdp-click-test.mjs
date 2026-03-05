/**
 * cdp-click-test.mjs — navigate to radiohead page, then simulate clicking a similar artist button
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
const events = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else events.push(m);
};
await new Promise(r => { ws.onopen = r; ws.onerror = r; });

await rpc('Runtime.enable');
await rpc('Page.enable');
await rpc('Console.enable');

const consoleLogs = [];
const origOnMessage = ws.onmessage;
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Console.messageAdded') {
    consoleLogs.push(`[${m.params.message.level}] ${m.params.message.text}`);
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    const args = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    consoleLogs.push(`[console.${m.params.type}] ${args}`);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    consoleLogs.push(`[EXCEPTION] ${m.params.exceptionDetails?.text}: ${m.params.exceptionDetails?.exception?.description}`);
  }
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

// Step 1: navigate to radiohead
console.log('Navigating to Radiohead...');
await rpc('Runtime.evaluate', {
  expression: `window.__sveltekit_base = window.__sveltekit_base; import('/node_modules/.vite/deps/chunk-KJ7TBZ4F.js').catch(()=>null); window.location.href = 'http://localhost:5173/rabbit-hole/artist/radiohead';`,
  awaitPromise: false
});

// Wait for navigation
await new Promise(r => setTimeout(r, 3000));

// Check current URL and get buttons
const step1 = await rpc('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const buttons = Array.from(document.querySelectorAll('button.rh-similar-chip, button.rh-tag-chip, button.rh-continue-btn, button.rh-exit')).map(b => ({
      text: b.textContent.trim().slice(0, 40),
      cls: b.className,
      rect: { x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y) }
    }));
    return { url: window.location.pathname, buttonCount: buttons.length, buttons: buttons.slice(0, 5) };
  })()`
});

console.log('After navigation:', JSON.stringify(step1.result.value, null, 2));

// Find a similar chip to click
const clickResult = await rpc('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const btn = document.querySelector('button.rh-similar-chip');
    if (!btn) return { error: 'no similar chip button found' };
    const text = btn.textContent.trim();
    btn.click();
    return { clicked: text, urlAfter: window.location.pathname };
  })()`
});

console.log('Click result:', JSON.stringify(clickResult.result.value));

// Wait and check if navigation happened
await new Promise(r => setTimeout(r, 3000));

const step2 = await rpc('Runtime.evaluate', {
  returnByValue: true,
  expression: `({ url: window.location.pathname, title: document.title })`
});
console.log('URL after click (3s later):', JSON.stringify(step2.result.value));

if (consoleLogs.length > 0) {
  console.log('\nConsole logs:');
  for (const l of consoleLogs) console.log(' ', l);
}

ws.close();
