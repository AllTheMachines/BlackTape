import express from 'express';
import { watch } from 'chokidar';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const FILE_PATH = resolve(getArg('--file', 'BUILD-LOG.md'));
const PORT = parseInt(getArg('--port', '18800'), 10);

// --- Sensitive content filter ---
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /\btoken\b/i,
  /api[_-]?key/i,
  /credential/i,
  /\.env\b/i,
  /private[_-]?key/i,
];

const KV_PATTERN = /^[\s]*[A-Z_]{2,}\s*[:=]\s*\S+/;

function filterSensitive(content) {
  return content
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase();
      for (const pat of SENSITIVE_PATTERNS) {
        if (pat.test(line)) return false;
      }
      if (KV_PATTERN.test(line) && /key|secret|token|pass|cred/i.test(line)) {
        return false;
      }
      return true;
    })
    .join('\n');
}

// --- Markdown parser ---
const marked = new Marked();

async function loadContent() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const filtered = filterSensitive(raw);
    const html = await marked.parse(filtered);
    return { raw: filtered, html };
  } catch (err) {
    return { raw: '', html: `<p style="color:#f85149">Could not read ${FILE_PATH}: ${err.message}</p>` };
  }
}

// --- SSE ---
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// --- Express ---
const app = express();
app.use(express.static(resolve(__dirname, 'public')));

app.get('/api/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial content
  const content = await loadContent();
  res.write(`event: init\ndata: ${JSON.stringify(content)}\n\n`);

  clients.add(res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clients.delete(res);
    clearInterval(heartbeat);
  });
});

// --- File watcher ---
const watcher = watch(FILE_PATH, {
  persistent: true,
  usePolling: process.platform === 'win32',
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
});

watcher.on('change', async () => {
  const content = await loadContent();
  broadcast('update', content);
});

watcher.on('error', (err) => {
  console.error('Watcher error:', err.message);
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`\n  Build Log Viewer`);
  console.log(`  Watching: ${FILE_PATH}`);
  console.log(`  Server:   http://localhost:${PORT}\n`);
});
