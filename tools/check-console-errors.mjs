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
  if (m.method === 'Runtime.consoleAPICalled') {
    const args = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    console.log(`[${m.params.type}]`, args);
  }
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

const rpc = (method, params = {}) => new Promise((res, rej) => {
  const mid = id++;
  pending.set(mid, msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result));
  ws.send(JSON.stringify({ id: mid, method, params }));
});

await new Promise(r => { ws.onopen = r; });
await rpc('Runtime.enable');

// Get existing console output by evaluating
const result = await rpc('Runtime.evaluate', {
  expression: `(async () => {
    // Try to install again and capture the error
    try {
      const { invoke } = await import('/node_modules/.vite/deps/@tauri-apps_api_core.js?v=ffe36ad3');
      const r = await invoke('install_update');
      return 'install_update returned: ' + JSON.stringify(r);
    } catch(e) {
      return 'install_update ERROR: ' + e;
    }
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log(result.result.value);
ws.close();
