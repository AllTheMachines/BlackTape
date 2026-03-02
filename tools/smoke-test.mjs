/**
 * Pre-release smoke test — checks all pages load, no JS errors, key elements present.
 * Run with: node tools/smoke-test.mjs
 * Requires: app running with CDP on port 9224 (node tools/launch-cdp.mjs)
 */
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
const errors = [];
let passed = 0;
let failed = 0;

ws.onmessage = (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : e.data.toString());
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    const args = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    errors.push(args);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.text || 'unknown exception');
  }
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};

const rpc = (method, params = {}) => new Promise((res, rej) => {
  const mid = id++;
  pending.set(mid, msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result));
  ws.send(JSON.stringify({ id: mid, method, params }));
});

const ev = async (expr) => {
  const r = await rpc('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.value;
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Navigate using SvelteKit's goto() for proper client-side routing
const goto = async (path) => {
  await ev(`
    (async () => {
      try {
        const { goto } = await import('$app/navigation');
        await goto('${path}');
      } catch {
        // Fallback: use window.location
        window.location.href = '${path}';
      }
    })()
  `);
  await sleep(1500);
};

// Navigate using CDP's Page.navigate for full page load
const navigateFull = async (path) => {
  const url = 'http://localhost:5173' + path;
  await rpc('Page.navigate', { url });
  await sleep(2500);
};

function check(name, condition, detail) {
  if (condition) {
    console.log('  PASS:', name, detail ? `(${detail})` : '');
    passed++;
  } else {
    console.log('  FAIL:', name, detail ? `(${detail})` : '');
    failed++;
  }
}

await new Promise(r => { ws.onopen = r; });
await rpc('Runtime.enable');
await rpc('Log.enable');
await rpc('Page.enable');

// ---- HOME PAGE ----
console.log('\n--- Home Page ---');
await navigateFull('/');

const title = await ev('document.title');
check('Page has title', title && title.length > 0, title);

const hasSearch = await ev("!!document.querySelector('input[type=\"search\"]')");
check('Search input present', hasSearch);

const navCount = await ev("document.querySelectorAll('a[href]').length");
check('Navigation links exist', navCount > 5, `${navCount} links`);

const hasPlayer = await ev("!!document.querySelector('[class*=\"player\"], [class*=\"now-playing\"], [class*=\"np-\"]')");
check('Player visible', hasPlayer);

// ---- LIBRARY PAGE ----
console.log('\n--- Library Page ---');
await navigateFull('/library');

const libText = await ev("document.body.innerText");
check('Library page renders', libText.includes('Library'), 'has "Library" text');
check('Shows track count', /\d+\s*tracks/.test(libText), libText.match(/\d+\s*tracks/)?.[0]);

const hasAlbumCovers = await ev("document.querySelectorAll('img').length");
check('Album covers load', hasAlbumCovers > 3, `${hasAlbumCovers} images`);

const hasTabs = await ev(`
  (function() {
    const text = document.body.innerText;
    return text.includes('All') && text.includes('Artists') && text.includes('Albums');
  })()
`);
check('Library tabs present', hasTabs, 'All/Artists/Albums');

const hasGenreTags = await ev(`
  (function() {
    const text = document.body.innerText;
    return text.includes('electronic') || text.includes('disco') || text.includes('house');
  })()
`);
check('Genre tags displayed', hasGenreTags);

// ---- LIBRARY EXPANDED VIEW ----
console.log('\n--- Library Expanded View ---');
const expandResult = await ev(`
  (async () => {
    // Find clickable album cards
    const covers = document.querySelectorAll('img[src], img[data-src]');
    for (const img of covers) {
      // Walk up to find a clickable parent
      let el = img;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        if (el.onclick || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' ||
            el.style.cursor === 'pointer' || el.className.includes('card') || el.className.includes('album')) {
          el.click();
          await new Promise(r => setTimeout(r, 1200));
          const text = document.body.innerText;
          const hasTracklist = text.includes('TRACKLIST') || text.includes('tracklist');
          const hasBackBtn = !!document.querySelector('button[class*="back"], [class*="back-btn"]');
          if (hasTracklist || hasBackBtn) {
            return JSON.stringify({ expanded: true, hasTracklist, hasBackBtn });
          }
        }
      }
    }
    return JSON.stringify({ expanded: false, note: 'could not find clickable album' });
  })()
`);
const expandData = JSON.parse(expandResult);
check('Album expands on click', expandData.expanded,
  expandData.hasTracklist ? 'has tracklist' : expandData.note || 'partial');

// ---- SETTINGS PAGE ----
console.log('\n--- Settings Page ---');
await navigateFull('/settings');

const settingsText = await ev("document.body.innerText");
check('Settings page renders', settingsText.includes('Settings'));
check('Appearance section', settingsText.includes('Appearance') || settingsText.includes('Theme'));
check('Streaming section', settingsText.includes('Streaming') || settingsText.includes('Bandcamp'));
check('Version displayed', settingsText.includes('0.3.0'), 'v0.3.0');

// ---- NAVIGATE HOME ----
await navigateFull('/');

// ---- ERROR SUMMARY ----
console.log('\n--- Console Errors ---');
if (errors.length === 0) {
  console.log('  No JS errors detected');
} else {
  console.log(`  ${errors.length} error(s):`);
  errors.forEach(e => console.log('    -', e.substring(0, 200)));
}

// ---- FINAL REPORT ----
console.log('\n========================================');
console.log(`  ${passed} passed, ${failed} failed, ${errors.length} console errors`);
if (failed === 0 && errors.length === 0) {
  console.log('  READY FOR RELEASE');
} else if (failed <= 1 && errors.length === 0) {
  console.log('  NEARLY READY (minor issues only)');
} else {
  console.log('  ISSUES FOUND — review above');
}
console.log('========================================\n');

ws.close();
process.exit(failed > 1 ? 1 : 0);
