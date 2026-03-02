import http from 'http';

const targets = await new Promise((res, rej) => {
  http.get('http://127.0.0.1:9224/json/list', r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

const page = targets.find(t => t.type === 'page');
if (!page) { console.log('No page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();

ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

const rpc = (method, params = {}) => new Promise((res, rej) => {
  const mid = id++;
  pending.set(mid, msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result));
  ws.send(JSON.stringify({ id: mid, method, params }));
});

await new Promise(r => { ws.onopen = r; });
await rpc('Runtime.enable');

const result = await rpc('Runtime.evaluate', {
  expression: `(async () => {
    const mod = await import('/src/lib/update.svelte.ts');
    return JSON.stringify(mod.updateState);
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log('updateState:', result.result.value);
ws.close();
