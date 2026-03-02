import http from 'http';
import { WebSocket } from 'ws';

const res = await new Promise(r => http.get('http://localhost:9224/json', r));
let data = '';
for await (const chunk of res) data += chunk;
const ws = new WebSocket(JSON.parse(data)[0].webSocketDebuggerUrl);

await new Promise(r => ws.on('open', r));

const expr = `
  (() => {
    const el = document.querySelector('.album-cover');
    if (!el) return 'no .album-cover found';
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return JSON.stringify({
      rect: { width: rect.width, height: rect.height },
      computed: { width: cs.width, height: cs.height, paddingBottom: cs.paddingBottom, aspectRatio: cs.aspectRatio, position: cs.position, overflow: cs.overflow }
    }, null, 2);
  })()
`;

ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr } }));

const msg = await new Promise(r => ws.on('message', r));
const result = JSON.parse(msg.toString());
console.log(result.result?.result?.value ?? JSON.stringify(result.result));
ws.close();
