/**
 * test-update-server.mjs — serve a fake latest.json for updater testing
 * Usage: node tools/test-update-server.mjs [--critical]
 */
import http from 'http';

const critical = process.argv.includes('--critical');

const notes = critical
  ? '[CRITICAL] Security fix: patched vulnerability in database loader.'
  : 'Bug fixes and performance improvements.';

const body = JSON.stringify({
  version: '0.2.0',
  notes,
  pub_date: '2026-03-02T00:00:00Z',
  platforms: {
    'windows-x86_64': {
      signature: 'dW50cnVzdGVkIGNvbW1lbnQ6IHRlc3Qgc2lnbmF0dXJl',
      url: 'https://example.com/dummy.zip'
    }
  }
}, null, 2);

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} — ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(body);
});

server.listen(8484, () => {
  console.log(`\nServing ${critical ? 'CRITICAL' : 'NORMAL'} update at http://localhost:8484/latest.json\n`);
  console.log(body);
  console.log('\nWaiting for requests...\n');
});
