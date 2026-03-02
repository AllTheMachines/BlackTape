/**
 * Mercury Press Screenshot Automation — v3
 *
 * 50 screenshots for slideshow selection.
 * Output: press-screenshots/v3/
 *
 * Run: node tools/take-press-screenshots-v3.mjs
 *
 * Requirements:
 *   - Tauri debug binary at src-tauri/target/debug/blacktape.exe
 *   - Real mercury.db in %APPDATA%/com.mercury.app/mercury.db
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'press-screenshots', 'v3');
const BINARY = path.join(ROOT, 'src-tauri', 'target', 'debug', 'blacktape.exe');
const CDP_PORT = 9223;
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const http = createRequire(import.meta.url)('http');

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function pollCdp(timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const req = http.get(`${CDP_BASE}/json`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        schedule();
      });
      req.setTimeout(1000, () => { req.destroy(); schedule(); });
      req.on('error', schedule);
    }
    function schedule() {
      if (Date.now() >= deadline) return reject(new Error(`CDP not available after ${timeoutMs}ms`));
      setTimeout(attempt, 600);
    }
    attempt();
  });
}

async function goto(page, route, waitMs = 4000) {
  console.log(`  → ${route}`);
  await page.evaluate(r => { window.location.href = r; }, route);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function save(page, filename, { scrollY, extraWait = 0 } = {}) {
  if (scrollY !== undefined) {
    await page.evaluate(y => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(600);
  }
  if (extraWait > 0) await page.waitForTimeout(extraWait);
  const outPath = path.join(OUT, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ✓ SAVED: ${filename}`);
  return true;
}

async function tryClick(page, selector) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click();
      return true;
    }
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// Image wait helpers
// ---------------------------------------------------------------------------

/**
 * Wait for artist card images (.a-art img) in grid views.
 * Returns count of loaded images.
 */
async function waitForCardImages(page, timeoutMs = 12000, minImages = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.a-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    if (count >= minImages) {
      console.log(`  ↳ ${count} card image(s) loaded`);
      return count;
    }
    await page.waitForTimeout(700);
  }
  const final = await page.evaluate(() => {
    let loaded = 0;
    for (const img of document.querySelectorAll('.a-art img[src]')) {
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return loaded;
  });
  console.log(`  ↳ ${final} card image(s) loaded (timeout)`);
  return final;
}

/**
 * Wait for release cover art (.cover-art img) on an artist page discography.
 * Returns count of loaded covers.
 */
async function waitForDiscographyCovers(page, timeoutMs = 15000, minCovers = 4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(() => {
      let loaded = 0;
      for (const img of document.querySelectorAll('.cover-art img[src]')) {
        if (img.complete && img.naturalHeight > 0) loaded++;
      }
      return loaded;
    });
    if (count >= minCovers) {
      console.log(`  ↳ ${count} cover(s) loaded`);
      return count;
    }
    await page.waitForTimeout(800);
  }
  const final = await page.evaluate(() => {
    let loaded = 0;
    for (const img of document.querySelectorAll('.cover-art img[src]')) {
      if (img.complete && img.naturalHeight > 0) loaded++;
    }
    return loaded;
  });
  console.log(`  ↳ ${final} cover(s) loaded (timeout)`);
  return final;
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Search for artist by name, click first result, land on artist page.
 * Returns the href navigated to, or null if no results.
 */
async function navigateToArtist(page, artistName) {
  await goto(page, `/search?q=${encodeURIComponent(artistName)}&mode=artist`, 6000);
  const firstCard = page.locator('a.artist-card').first();
  const href = await firstCard.getAttribute('href', { timeout: 5000 }).catch(() => null);
  if (!href) {
    console.log(`  ✗ No search results for "${artistName}"`);
    return null;
  }
  await goto(page, href, 8000);
  return href;
}

/**
 * Navigate to an artist page, scroll to show discography covers, wait for images.
 * Takes screenshot only if ≥ minCovers are loaded.
 * Returns true if screenshot taken.
 */
async function artistPageShot(page, artistName, filename, minCovers = 4) {
  console.log(`  Trying: ${artistName}`);
  const href = await navigateToArtist(page, artistName);
  if (!href) return false;

  // Check if discography section exists at all
  const hasDisc = await page.locator('.releases-grid, .discography').first()
    .isVisible({ timeout: 4000 }).catch(() => false);
  if (!hasDisc) {
    console.log(`  ✗ No discography for "${artistName}"`);
    return false;
  }

  // Find the releases grid top position and scroll to show it with header context
  const scrollTarget = await page.evaluate(() => {
    const grid = document.querySelector('.releases-grid');
    if (!grid) return 500;
    const top = grid.getBoundingClientRect().top + window.scrollY;
    // Show the grid with ~200px of context above (header/tags)
    return Math.max(0, top - 200);
  });
  await page.evaluate(y => window.scrollTo(0, y), scrollTarget);
  await page.waitForTimeout(500);

  const coverCount = await waitForDiscographyCovers(page, 15000, minCovers);

  if (coverCount >= minCovers) {
    await save(page, filename);
    return true;
  }

  console.log(`  ✗ Only ${coverCount} covers for "${artistName}" (need ${minCovers}) — skip`);
  return false;
}

/**
 * Discover list shot — tries combos in order, saves first with results.
 */
async function discoverListShot(page, combos) {
  for (const { tags, country, filename } of combos) {
    const tagParam = Array.isArray(tags) ? tags.join(',') : tags;
    await goto(page, `/discover?tags=${encodeURIComponent(tagParam)}`, 5000);

    if (country) {
      const countryInput = page.locator('#country-input').first();
      if (await countryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await countryInput.fill(country);
        await page.waitForTimeout(1500); // debounce + SvelteKit goto + DB query
      }
    }

    const count = await page.evaluate(() =>
      document.querySelectorAll('.artist-card').length
    );

    if (count > 0) {
      console.log(`  ✓ ${tagParam} + "${country || 'any'}" → ${count} results`);
      await save(page, filename);
      return true;
    }
    console.log(`  ✗ ${tagParam} + "${country || 'any'}" → 0 results`);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  if (!fs.existsSync(BINARY)) {
    console.error('Binary not found:', BINARY);
    console.error('Build with: cd src-tauri && cargo build');
    process.exit(1);
  }

  console.log('Launching Tauri app (CDP port 9223)...');
  const proc = spawn(BINARY, [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    },
    stdio: 'ignore',
    detached: false,
  });
  proc.on('error', err => console.error('Process error:', err.message));

  console.log('Waiting for CDP...');
  await pollCdp(35000);
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.connectOverCDP(CDP_BASE);
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()?.[0];
  if (!page) throw new Error('No page found via CDP');

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(3000);

  console.log('Connected. App URL:', page.url());
  console.log(`Output dir: ${OUT}\n`);

  const counts = { artists: 0, search: 0, crate: 0, discover: 0, timemachine: 0, other: 0 };
  let total = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 1 — Artist pages with loaded discography covers (target: 20)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ PRIORITY 1: Artist pages with loaded covers (target: 20) ═══\n');

  const ARTIST_LIST = [
    // Electronic / IDM
    { name: 'Aphex Twin',                    file: 'artist-aphex-twin-discography.png' },
    { name: 'Boards of Canada',              file: 'artist-boards-of-canada-discography.png' },
    { name: 'Autechre',                      file: 'artist-autechre-discography.png' },
    { name: 'Four Tet',                      file: 'artist-four-tet-discography.png' },
    { name: 'Burial',                        file: 'artist-burial-discography.png' },
    { name: 'Actress',                       file: 'artist-actress-discography.png' },
    // Trip-hop
    { name: 'Massive Attack',                file: 'artist-massive-attack-discography.png' },
    { name: 'Portishead',                    file: 'artist-portishead-discography.png' },
    // Post-punk / Gothic / Industrial
    { name: 'The Cure',                      file: 'artist-the-cure-discography.png' },
    { name: 'Bauhaus',                       file: 'artist-bauhaus-discography.png' },
    { name: 'Siouxsie and the Banshees',     file: 'artist-siouxsie-discography.png' },
    { name: 'Wire',                          file: 'artist-wire-discography.png' },
    { name: 'Gang of Four',                  file: 'artist-gang-of-four-discography.png' },
    { name: 'Nick Cave and the Bad Seeds',   file: 'artist-nick-cave-discography.png' },
    { name: 'The Birthday Party',            file: 'artist-birthday-party-discography.png' },
    { name: 'Public Image Ltd',              file: 'artist-public-image-ltd-discography.png' },
    { name: 'Einsturzende Neubauten',        file: 'artist-einsturzende-neubauten-discography.png' },
    { name: 'Throbbing Gristle',             file: 'artist-throbbing-gristle-discography.png' },
    // Krautrock / Kosmische
    { name: 'Can',                           file: 'artist-can-discography.png' },
    { name: 'Tangerine Dream',               file: 'artist-tangerine-dream-discography.png' },
    { name: 'Neu!',                          file: 'artist-neu-discography.png' },
    { name: 'Klaus Schulze',                 file: 'artist-klaus-schulze-discography.png' },
    { name: 'Cluster',                       file: 'artist-cluster-discography.png' },
    // Shoegaze / Dream Pop
    { name: 'My Bloody Valentine',           file: 'artist-my-bloody-valentine-discography.png' },
    { name: 'Slowdive',                      file: 'artist-slowdive-discography.png' },
    { name: 'Cocteau Twins',                 file: 'artist-cocteau-twins-discography.png' },
    { name: 'Beach House',                   file: 'artist-beach-house-discography.png' },
    { name: 'Mazzy Star',                    file: 'artist-mazzy-star-discography.png' },
    { name: 'Ride',                          file: 'artist-ride-discography.png' },
    // Jazz / Avant-garde
    { name: 'Miles Davis',                   file: 'artist-miles-davis-discography.png' },
    { name: 'John Coltrane',                 file: 'artist-john-coltrane-discography.png' },
    { name: 'Charles Mingus',                file: 'artist-charles-mingus-discography.png' },
    { name: 'Sun Ra',                        file: 'artist-sun-ra-discography.png' },
    { name: 'Ornette Coleman',               file: 'artist-ornette-coleman-discography.png' },
    { name: 'Albert Ayler',                  file: 'artist-albert-ayler-discography.png' },
    // Other
    { name: 'Dead Can Dance',                file: 'artist-dead-can-dance-discography.png' },
    { name: 'Scott Walker',                  file: 'artist-scott-walker-discography.png' },
    { name: 'Talk Talk',                     file: 'artist-talk-talk-discography.png' },
    { name: 'Nick Drake',                    file: 'artist-nick-drake-discography.png' },
    { name: 'This Mortal Coil',              file: 'artist-this-mortal-coil-discography.png' },
    { name: 'Lisa Gerrard',                  file: 'artist-lisa-gerrard-discography.png' },
    { name: 'The Orb',                       file: 'artist-the-orb-discography.png' },
    { name: 'Arca',                          file: 'artist-arca-discography.png' },
  ];

  for (const { name, file } of ARTIST_LIST) {
    if (counts.artists >= 20) break;
    const ok = await artistPageShot(page, name, file);
    if (ok) { counts.artists++; total++; }
  }

  console.log(`\nPriority 1 complete: ${counts.artists}/20 artist shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 2 — Search grid with artist images (target: 8)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ PRIORITY 2: Search grids with images (target: 8) ═══\n');

  const SEARCH_TERMS = [
    { q: 'krautrock',        file: 'search-krautrock-grid.png' },
    { q: 'post-punk',        file: 'search-post-punk-grid.png' },
    { q: 'ambient',          file: 'search-ambient-grid.png' },
    { q: 'jazz',             file: 'search-jazz-grid.png' },
    { q: 'dream pop',        file: 'search-dream-pop-grid.png' },
    { q: 'noise rock',       file: 'search-noise-rock-grid.png' },
    { q: 'psychedelic rock', file: 'search-psychedelic-rock-grid.png' },
    { q: 'electronic',       file: 'search-electronic-grid.png' },
    { q: 'black metal',      file: 'search-black-metal-grid.png' },
    { q: 'shoegaze',         file: 'search-shoegaze-grid.png' },
  ];

  for (const { q, file } of SEARCH_TERMS) {
    if (counts.search >= 8) break;
    console.log(`  Search: "${q}"`);
    await goto(page, `/search?q=${encodeURIComponent(q)}&mode=tag`, 6000);

    const imgCount = await waitForCardImages(page, 12000, 6);
    if (imgCount >= 6) {
      await save(page, file);
      counts.search++;
      total++;
    } else {
      console.log(`  ✗ Only ${imgCount} images for "${q}" (need 6) — skip`);
    }
  }

  console.log(`\nPriority 2 complete: ${counts.search}/8 search grid shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 3 — Crate Dig with images (target: 5)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ PRIORITY 3: Crate Dig with images (target: 5) ═══\n');

  // Decade indices: 0=Any, 1=50s, 2=60s, 3=70s, 4=80s, 5=90s, 6=00s, 7=10s, 8=20s
  const CRATE_COMBOS = [
    { tag: 'shoegaze',    decadeIdx: 5, file: 'crate-shoegaze-90s.png' },
    { tag: 'krautrock',   decadeIdx: 3, file: 'crate-krautrock-70s.png' },
    { tag: 'ambient',     decadeIdx: 4, file: 'crate-ambient-80s.png' },
    { tag: 'jazz',        decadeIdx: 2, file: 'crate-jazz-60s.png' },
    { tag: 'electronic',  decadeIdx: 5, file: 'crate-electronic-90s.png' },
    { tag: 'post-punk',   decadeIdx: 4, file: 'crate-post-punk-80s.png' },
    { tag: 'dream pop',   decadeIdx: 5, file: 'crate-dream-pop-90s.png' },
    { tag: 'jazz',        decadeIdx: 0, file: 'crate-jazz-any.png' },
    { tag: 'ambient',     decadeIdx: 0, file: 'crate-ambient-any.png' },
  ];

  for (const { tag, decadeIdx, file } of CRATE_COMBOS) {
    if (counts.crate >= 5) break;
    console.log(`  Crate: "${tag}" + decade[${decadeIdx}]`);
    await goto(page, '/crate', 4000);

    const tagInput = page.locator('.filter-input').first();
    if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagInput.fill(tag);
    }
    const decSel = page.locator('select.filter-select').first();
    if (await decSel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await decSel.selectOption({ index: decadeIdx });
    }
    await tryClick(page, '.dig-btn');
    await page.waitForTimeout(3000);

    const imgCount = await waitForCardImages(page, 12000, 3);
    if (imgCount >= 3) {
      await save(page, file);
      counts.crate++;
      total++;
    } else {
      console.log(`  ✗ Only ${imgCount} images for crate "${tag}" — skip`);
    }
  }

  console.log(`\nPriority 3 complete: ${counts.crate}/5 crate dig shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 4 — Discover list variations (target: 8)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ PRIORITY 4: Discover list variations (target: 8) ═══\n');

  const DISCOVER_SHOTS = [
    [
      { tags: 'ambient',     country: 'Iceland',        filename: 'discover-ambient-iceland.png' },
      { tags: 'ambient',     country: '',               filename: 'discover-ambient-any.png' },
    ],
    [
      { tags: 'jazz',        country: 'United States',  filename: 'discover-jazz-united-states.png' },
      { tags: 'jazz',        country: '',               filename: 'discover-jazz-any.png' },
    ],
    [
      { tags: 'hip hop',     country: 'United States',  filename: 'discover-hip-hop-united-states.png' },
      { tags: 'hip-hop',     country: 'United States',  filename: 'discover-hip-hop-united-states.png' },
      { tags: 'hip hop',     country: '',               filename: 'discover-hip-hop-any.png' },
    ],
    [
      { tags: 'electronic',  country: 'Germany',        filename: 'discover-electronic-germany.png' },
      { tags: 'electronic',  country: '',               filename: 'discover-electronic-any.png' },
    ],
    [
      { tags: 'indie rock',  country: 'Australia',      filename: 'discover-indie-rock-australia.png' },
      { tags: 'indie rock',  country: '',               filename: 'discover-indie-rock-any.png' },
    ],
    [
      { tags: 'metal',       country: 'Finland',        filename: 'discover-metal-finland.png' },
      { tags: 'heavy metal', country: 'Finland',        filename: 'discover-metal-finland.png' },
      { tags: 'metal',       country: '',               filename: 'discover-metal-any.png' },
    ],
    [
      { tags: 'folk',        country: 'Ireland',        filename: 'discover-folk-ireland.png' },
      { tags: 'folk',        country: '',               filename: 'discover-folk-any.png' },
    ],
    [
      { tags: 'noise rock',  country: 'Japan',          filename: 'discover-noise-rock-japan.png' },
      { tags: 'noise rock',  country: '',               filename: 'discover-noise-rock-any.png' },
    ],
    [
      { tags: 'bossa nova',  country: 'Brazil',         filename: 'discover-bossa-nova-brazil.png' },
      { tags: 'bossa nova',  country: '',               filename: 'discover-bossa-nova-any.png' },
    ],
    [
      { tags: 'reggae',      country: 'Jamaica',        filename: 'discover-reggae-jamaica.png' },
      { tags: 'reggae',      country: '',               filename: 'discover-reggae-any.png' },
    ],
  ];

  for (const combos of DISCOVER_SHOTS) {
    if (counts.discover >= 8) break;
    const ok = await discoverListShot(page, combos);
    if (ok) { counts.discover++; total++; }
  }

  console.log(`\nPriority 4 complete: ${counts.discover}/8 discover shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 5 — Time Machine with data + images (target: 4)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ PRIORITY 5: Time Machine with data + images (target: 4) ═══\n');

  const TM_YEARS = [1991, 1983, 1994, 1979, 1986, 1988, 1997, 1978, 1982, 1985];

  for (const year of TM_YEARS) {
    if (counts.timemachine >= 4) break;
    console.log(`  Year: ${year}`);
    await goto(page, `/time-machine?year=${year}`, 5000);

    const hasResults = await page.evaluate(() =>
      document.querySelectorAll('.artist-card').length > 0
    );
    if (!hasResults) {
      console.log(`  ✗ No artists for ${year}`);
      continue;
    }

    const imgCount = await waitForCardImages(page, 10000, 3);
    if (imgCount >= 3) {
      await save(page, `time-machine-${year}.png`);
      counts.timemachine++;
      total++;
    } else {
      console.log(`  ✗ Year ${year}: results but only ${imgCount} images — skip`);
    }
  }

  console.log(`\nPriority 5 complete: ${counts.timemachine}/4 time machine shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — Other views (target: 5)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══ PRIORITY 6: Other views (target: 5) ═══\n');

  // 6a: Settings page (reliable — always available)
  console.log('  6a: Settings page');
  await goto(page, '/settings', 3000);
  await save(page, 'other-settings.png');
  counts.other++;
  total++;

  // 6b-6c: Artist Stats tabs (2 shots — different artists, different scores)
  const STATS_CANDIDATES = [
    'Aphex Twin', 'The Cure', 'Can', 'Massive Attack', 'Miles Davis',
    'My Bloody Valentine', 'Boards of Canada', 'Dead Can Dance',
  ];
  for (const name of STATS_CANDIDATES) {
    if (counts.other >= 3) break; // 1 settings + 2 stats = 3
    console.log(`  Stats tab: ${name}`);
    const href = await navigateToArtist(page, name);
    if (!href) continue;

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const clicked = await tryClick(page, '[data-testid="tab-stats"]') ||
                    await tryClick(page, 'button:has-text("Stats")');
    if (clicked) {
      await page.waitForTimeout(2000);
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await save(page, `other-stats-${safeName}.png`);
      counts.other++;
      total++;
    } else {
      console.log(`  ✗ Stats tab not found for ${name}`);
    }
  }

  // 6d: Artist About tab with bio content
  const ABOUT_CANDIDATES = [
    'Miles Davis', 'John Coltrane', 'The Cure', 'Can',
    'Nick Drake', 'Talk Talk', 'Scott Walker', 'Aphex Twin',
    'Dead Can Dance', 'My Bloody Valentine',
  ];
  for (const name of ABOUT_CANDIDATES) {
    if (counts.other >= 4) break; // stop after 1 about tab
    console.log(`  About tab: ${name}`);
    const href = await navigateToArtist(page, name);
    if (!href) continue;

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const clicked = await tryClick(page, '[data-testid="tab-about"]') ||
                    await tryClick(page, 'button:has-text("About")');
    if (!clicked) { console.log(`  ✗ About tab not found for ${name}`); continue; }
    await page.waitForTimeout(2000);

    const hasContent = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="tab-content-about"]');
      if (!container) return false;
      const text = container.innerText?.trim() ?? '';
      return text.length > 80; // real bio, not just empty tab
    });

    if (hasContent) {
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await save(page, `other-about-${safeName}.png`);
      counts.other++;
      total++;
    } else {
      console.log(`  ✗ About tab empty/short for ${name}`);
    }
  }

  // 6e: Library view (if populated)
  if (counts.other < 5) {
    console.log('  6e: Library view');
    await goto(page, '/library', 4000);
    const hasLibraryContent = await page.evaluate(() =>
      document.querySelectorAll('.artist-card, .library-item, .library-artist').length > 0
    );
    if (hasLibraryContent) {
      await save(page, 'other-library.png');
      counts.other++;
      total++;
    } else {
      console.log('  ✗ Library is empty — skip');
      // Fallback: new-rising page
      console.log('  6e fallback: New Rising Stars page');
      await goto(page, '/new-rising', 4000);
      const hasRising = await page.evaluate(() =>
        document.querySelectorAll('.artist-card').length > 0
      );
      if (hasRising) {
        const imgCount = await waitForCardImages(page, 8000, 3);
        if (imgCount >= 3) {
          await save(page, 'other-new-rising.png');
          counts.other++;
          total++;
        }
      }
    }
  }

  console.log(`\nPriority 6 complete: ${counts.other}/5 other shots\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`TOTAL SHOTS: ${total}`);
  console.log(`  P1 Artist pages:   ${counts.artists}/20`);
  console.log(`  P2 Search grids:   ${counts.search}/8`);
  console.log(`  P3 Crate Dig:      ${counts.crate}/5`);
  console.log(`  P4 Discover lists: ${counts.discover}/8`);
  console.log(`  P5 Time Machine:   ${counts.timemachine}/4`);
  console.log(`  P6 Other views:    ${counts.other}/5`);
  console.log(`\nOutput: ${OUT}`);
  console.log('\nFiles:');
  fs.readdirSync(OUT).sort().forEach(f => console.log(`  ${f}`));

  try { await browser.close(); } catch (_) {}
  proc.kill();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
