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

// --- Special block preprocessor ---
// Runs on raw markdown BEFORE marked.parse()
// Converts HTML comment markers into styled divs that marked passes through
function preprocessSpecialBlocks(markdown) {
  // Chat blocks: parse speaker lines into bubbles
  markdown = markdown.replace(
    /<!--\s*chat\s*-->([\s\S]*?)<!--\s*\/chat\s*-->/g,
    (_, content) => {
      const lines = content.trim().split('\n').filter(l => l.trim());
      const bubbles = lines.map(line => {
        const steveMatch = line.match(/^\*\*Steve:\*\*\s*(.*)/);
        const claudeMatch = line.match(/^\*\*Claude:\*\*\s*(.*)/);
        if (steveMatch) {
          return `<div class="chat-bubble chat-steve"><span class="chat-name">Steve</span>${steveMatch[1]}</div>`;
        } else if (claudeMatch) {
          return `<div class="chat-bubble chat-claude"><span class="chat-name">Claude</span>${claudeMatch[1]}</div>`;
        }
        return `<div class="chat-bubble chat-steve">${line}</div>`;
      }).join('\n');
      return `<div class="block-chat">\n${bubbles}\n</div>`;
    }
  );

  // Decision blocks: title from comment, content is body
  markdown = markdown.replace(
    /<!--\s*decision:\s*(.*?)\s*-->([\s\S]*?)<!--\s*\/decision\s*-->/g,
    (_, title, content) => {
      // Parse rejected line if present
      const lines = content.trim().split('\n');
      let body = '';
      let rejected = '';
      for (const line of lines) {
        const rejMatch = line.match(/^\*\*Rejected:\*\*\s*(.*)/);
        if (rejMatch) {
          rejected = `<div class="decision-rejected">Rejected: ${rejMatch[1]}</div>`;
        } else {
          body += line + '\n';
        }
      }
      return `<div class="block-decision"><div class="decision-title">${title}</div><div class="decision-body">${body.trim()}</div>${rejected}</div>`;
    }
  );

  // Dead-end blocks
  markdown = markdown.replace(
    /<!--\s*dead-end\s*-->([\s\S]*?)<!--\s*\/dead-end\s*-->/g,
    (_, content) => {
      return `<div class="block-dead-end"><span class="block-label">DEAD END</span>${content.trim()}</div>`;
    }
  );

  // Breakthrough blocks
  markdown = markdown.replace(
    /<!--\s*breakthrough\s*-->([\s\S]*?)<!--\s*\/breakthrough\s*-->/g,
    (_, content) => {
      return `<div class="block-breakthrough"><span class="block-label">BREAKTHROUGH</span>${content.trim()}</div>`;
    }
  );

  // Status blocks: live activity indicator (rendered prominently)
  markdown = markdown.replace(
    /<!--\s*status\s*-->([\s\S]*?)<!--\s*\/status\s*-->/g,
    (_, content) => {
      const lines = content.trim().split('\n').filter(l => l.trim());
      const items = lines.map(line => `<div class="status-line">${line.trim()}</div>`).join('\n');
      return `<div class="block-status"><span class="block-label">LIVE</span>\n${items}\n</div>`;
    }
  );

  return markdown;
}

// --- Stats extraction ---
function extractStats(markdown) {
  const stats = {
    commits: 0,
    filesChanged: 0,
    entries: 0,
    currentPhase: '—',
    latestCommit: null,
  };

  // Count entries (## Entry ...)
  const entryMatches = markdown.match(/^## Entry \d+/gm);
  stats.entries = entryMatches ? entryMatches.length : 0;

  // Count commits and sum files changed
  const commitPattern = /> \*\*Commit ([a-f0-9]+)\*\* \(([^)]+)\) — (.+)\r?\n> Files changed: (\d+)/g;
  let match;
  let lastCommit = null;
  while ((match = commitPattern.exec(markdown)) !== null) {
    stats.commits++;
    stats.filesChanged += parseInt(match[4], 10);
    lastCommit = {
      hash: match[1].slice(0, 7),
      date: match[2],
      message: match[3],
      files: parseInt(match[4], 10),
    };
  }

  if (lastCommit) {
    stats.latestCommit = lastCommit;
  }

  // Extract live status text if present
  const statusMatch = markdown.match(/<!--\s*status\s*-->([\s\S]*?)<!--\s*\/status\s*-->/);
  stats.liveStatus = statusMatch ? statusMatch[1].trim().split('\n')[0].trim() : null;

  // Detect current phase from latest commit messages
  const phasePattern = /\((\d{2})-/g;
  let phaseMatch;
  let latestPhase = null;
  while ((phaseMatch = phasePattern.exec(markdown)) !== null) {
    latestPhase = phaseMatch[1];
  }
  if (latestPhase) {
    const phaseNum = parseInt(latestPhase, 10);
    const phaseNames = {
      0: 'Patronage',
      1: 'Data Pipeline',
      2: 'Search & Embeds',
      3: 'Desktop App',
      4: 'Tag Discovery',
      5: 'Social Layer',
      6: 'Blog Tools',
    };
    stats.currentPhase = `Phase ${phaseNum}: ${phaseNames[phaseNum] || 'Unknown'}`;
  }

  return stats;
}

// --- Markdown parser ---
const marked = new Marked();

async function loadContent() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const filtered = filterSensitive(raw);
    const preprocessed = preprocessSpecialBlocks(filtered);
    const html = await marked.parse(preprocessed);
    const stats = extractStats(filtered);
    return { html, stats };
  } catch (err) {
    return {
      html: `<p style="color:#f85149">Could not read ${FILE_PATH}: ${err.message}</p>`,
      stats: { commits: 0, filesChanged: 0, entries: 0, currentPhase: '—', latestCommit: null },
    };
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
