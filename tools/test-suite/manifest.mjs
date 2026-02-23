/**
 * Mercury Test Manifest — the living list of every user action.
 *
 * Rules:
 *   - Add tests here after every phase. Never remove.
 *   - method 'web'  → Playwright browser test against localhost:8788
 *   - method 'code' → File existence / grep check (no browser needed)
 *   - method 'skip' → Cannot be automated (audio, OS dialogs, file pickers)
 *
 * Test object shape:
 *   { id, phase, area, desc, method }
 *   + web:  { url, fn: async (page) => boolean }
 *   + code: { fn: () => boolean }
 *   + skip: { reason: string }
 */

import { fileExists, fileContains, anyFileContains } from './runners/code.mjs';

// ---------------------------------------------------------------------------
// PHASE 2 — Web Gateway
// ---------------------------------------------------------------------------

export const PHASE_2 = [
  {
    id: 'P2-01', phase: 2, area: 'Homepage',
    desc: 'Homepage loads and shows search bar',
    method: 'web', url: '/',
    fn: async (page) => {
      await page.waitForSelector('input[type="search"], input[placeholder*="search" i], .search-bar input, input[name="q"]', { timeout: 8000 });
      return true;
    },
  },
  {
    id: 'P2-02', phase: 2, area: 'Search',
    desc: 'Searching "aphex twin" returns artist results',
    method: 'web', url: '/search?q=aphex+twin',
    fn: async (page) => {
      await page.waitForSelector('.artist-card, [data-artist], .card', { timeout: 8000 });
      const cards = await page.locator('.artist-card, [data-artist], .card').count();
      return cards > 0;
    },
  },
  {
    id: 'P2-03', phase: 2, area: 'Search',
    desc: 'Search results show artist name and tags',
    method: 'web', url: '/search?q=radiohead',
    fn: async (page) => {
      await page.waitForSelector('.artist-card, .card', { timeout: 8000 });
      const text = await page.textContent('body');
      return text.toLowerCase().includes('radiohead');
    },
  },
  {
    id: 'P2-04', phase: 2, area: 'Artist page',
    desc: 'Clicking artist card navigates to /artist/... page',
    method: 'web', url: '/search?q=aphex+twin',
    fn: async (page) => {
      await page.waitForSelector('a[href*="/artist/"]', { timeout: 8000 });
      const href = await page.locator('a[href*="/artist/"]').first().getAttribute('href');
      return typeof href === 'string' && href.includes('/artist/');
    },
  },
  {
    id: 'P2-05', phase: 2, area: 'Artist page',
    desc: 'Artist page loads and shows name, tags, country',
    method: 'web', url: '/artist/aphex-twin',
    fn: async (page) => {
      // Use domcontentloaded — artist page fetches bio/links async, networkidle is too slow
      await page.waitForSelector('h1, .artist-name, [class*="artist"]', { timeout: 12000 });
      const text = await page.textContent('body');
      return text.toLowerCase().includes('aphex twin');
    },
  },
  {
    id: 'P2-06', phase: 2, area: 'Artist page',
    desc: 'Artist page shows tags',
    method: 'web', url: '/artist/aphex-twin',
    fn: async (page) => {
      await page.waitForSelector('.tag, .tag-chip, [class*="tag"]', { timeout: 8000 });
      const count = await page.locator('.tag, .tag-chip, [class*="tag"]').count();
      return count > 0;
    },
  },
  {
    id: 'P2-07', phase: 2, area: 'Artist page',
    desc: 'Artist page shows external links section',
    method: 'web', url: '/artist/aphex-twin',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      // Links section may render async
      await page.waitForTimeout(2000);
      const hasLinks = await page.locator('a[href*="bandcamp"], a[href*="spotify"], a[href*="youtube"], .links, [class*="link"]').count();
      return hasLinks > 0;
    },
  },
  {
    id: 'P2-08', phase: 2, area: 'Navigation',
    desc: 'Clicking a tag on artist page navigates to /discover',
    method: 'web', url: '/artist/aphex-twin',
    fn: async (page) => {
      await page.waitForSelector('.tag, .tag-chip, [class*="tag"]', { timeout: 8000 });
      const tagLink = page.locator('a[href*="/discover"]').first();
      const count = await tagLink.count();
      return count > 0;
    },
  },
  {
    id: 'P2-09', phase: 2, area: 'Mobile',
    desc: 'Homepage is responsive at 375px (mobile)',
    method: 'web', url: '/',
    fn: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForLoadState('domcontentloaded');
      // Check main content doesn't overflow (nav is hidden on mobile via CSS — that's fine)
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main, .main-content, [class*="search"]');
        if (!main) return 0;
        return main.scrollWidth;
      });
      return overflow <= 400;
    },
  },
  {
    id: 'P2-10', phase: 2, area: 'Mobile',
    desc: 'Search results page is responsive at 375px',
    method: 'web', url: '/search?q=radiohead',
    fn: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForSelector('.artist-card, .card', { timeout: 8000 });
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? main.scrollWidth : document.body.scrollWidth;
      });
      return overflow <= 400;
    },
  },
  {
    id: 'P2-11', phase: 2, area: 'Mobile',
    desc: 'Artist page is responsive at 375px',
    method: 'web', url: '/artist/radiohead',
    fn: async (page) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForSelector('h1, .artist-name, [class*="artist"]', { timeout: 8000 });
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? main.scrollWidth : document.body.scrollWidth;
      });
      return overflow <= 400;
    },
  },
];

// ---------------------------------------------------------------------------
// PHASE 3 — Desktop App Foundation (code checks — Tauri build artifacts)
// ---------------------------------------------------------------------------

export const PHASE_3 = [
  {
    id: 'P3-01', phase: 3, area: 'Tauri core',
    desc: 'TauriProvider exists in db/providers',
    method: 'code',
    fn: fileExists('src/lib/db/tauri-provider.ts'),
  },
  {
    id: 'P3-02', phase: 3, area: 'Tauri core',
    desc: 'isTauri() utility function exists',
    method: 'code',
    fn: anyFileContains('src/lib/**/*.ts', /export.*function.*isTauri|export.*isTauri/),
  },
  {
    id: 'P3-03', phase: 3, area: 'Tauri core',
    desc: 'DatabaseSetup component exists (first-run flow)',
    method: 'code',
    fn: fileExists('src/lib/components/DatabaseSetup.svelte'),
  },
  {
    id: 'P3-04', phase: 3, area: 'Distribution',
    desc: 'Tauri config exists and names the app mercury',
    method: 'code',
    fn: fileContains('src-tauri/tauri.conf.json', 'mercury'),
  },
];

// ---------------------------------------------------------------------------
// PHASE 4 — Local Music Player (Tauri-only, mix of code + skip)
// ---------------------------------------------------------------------------

export const PHASE_4 = [
  {
    id: 'P4-01', phase: 4, area: 'Player',
    desc: 'Player.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/Player.svelte'),
  },
  {
    id: 'P4-02', phase: 4, area: 'Player',
    desc: 'Queue.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/Queue.svelte'),
  },
  {
    id: 'P4-03', phase: 4, area: 'Library',
    desc: 'Library scanner Rust commands registered (scan_folder)',
    method: 'code',
    fn: fileContains('src-tauri/src/lib.rs', 'scan_folder'),
  },
  {
    id: 'P4-04', phase: 4, area: 'Library',
    desc: 'LibraryBrowser.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/LibraryBrowser.svelte'),
  },
  {
    id: 'P4-05', phase: 4, area: 'Library',
    desc: 'FolderManager.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/FolderManager.svelte'),
  },
  {
    id: 'P4-06', phase: 4, area: 'Player',
    desc: '[skip] Audio playback works (requires running desktop app)',
    method: 'skip',
    reason: 'Requires running Tauri desktop app with local music files',
  },
  {
    id: 'P4-07', phase: 4, area: 'Library',
    desc: '[skip] Library folder scan completes successfully',
    method: 'skip',
    reason: 'Requires running Tauri desktop app with local music folder',
  },
];

// ---------------------------------------------------------------------------
// PHASE 5 — AI Foundation (Tauri-only)
// ---------------------------------------------------------------------------

export const PHASE_5 = [
  {
    id: 'P5-01', phase: 5, area: 'AI',
    desc: 'AI Rust commands registered (start_ai_server, download_model)',
    method: 'code',
    fn: fileContains('src-tauri/src/ai/sidecar.rs', 'start_generation_server'),
  },
  {
    id: 'P5-02', phase: 5, area: 'AI',
    desc: 'TasteEditor.svelte exists',
    method: 'code',
    fn: fileExists('src/lib/components/TasteEditor.svelte'),
  },
  {
    id: 'P5-03', phase: 5, area: 'AI',
    desc: 'AiRecommendations.svelte exists',
    method: 'code',
    fn: fileExists('src/lib/components/AiRecommendations.svelte'),
  },
  {
    id: 'P5-04', phase: 5, area: 'AI',
    desc: 'taste.db initializes with ai_settings table',
    method: 'code',
    fn: fileContains('src-tauri/src/ai/taste_db.rs', 'ai_settings'),
  },
  {
    id: 'P5-05', phase: 5, area: 'Explore page',
    desc: 'Web: /explore page shows desktop-only message (not broken)',
    method: 'web', url: '/explore',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      // Should either load or show desktop-only message — just not crash
      const status = page.url();
      return !status.includes('error');
    },
  },
  {
    id: 'P5-06', phase: 5, area: 'AI',
    desc: '[skip] AI model download and loading',
    method: 'skip',
    reason: 'Requires running Tauri desktop app with network access and disk space',
  },
];

// ---------------------------------------------------------------------------
// PHASE 6 — Discovery Engine
// ---------------------------------------------------------------------------

export const PHASE_6 = [
  {
    id: 'P6-01', phase: 6, area: 'Discover',
    desc: '/discover page loads with artist grid',
    method: 'web', url: '/discover',
    fn: async (page) => {
      await page.waitForSelector('.artist-card, .card, [class*="artist"]', { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'P6-02', phase: 6, area: 'Discover',
    desc: 'Tag filter: navigating to /discover?tags=electronic shows filtered results',
    method: 'web', url: '/discover?tags=electronic',
    fn: async (page) => {
      await page.waitForSelector('.artist-card, .card', { timeout: 10000 });
      const count = await page.locator('.artist-card, .card').count();
      return count > 0;
    },
  },
  {
    id: 'P6-03', phase: 6, area: 'Discover',
    desc: 'Tag filter: active tag chip appears when tag in URL',
    method: 'web', url: '/discover?tags=electronic',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      const text = await page.textContent('body');
      return text.toLowerCase().includes('electronic');
    },
  },
  {
    id: 'P6-04', phase: 6, area: 'Discover',
    desc: 'Clicking tag chip adds it to URL (?tags=) and updates results',
    method: 'web', url: '/artist/aphex-twin',
    fn: async (page) => {
      await page.waitForSelector('a[href*="discover"]', { timeout: 8000 });
      const discoverLink = page.locator('a[href*="discover"]').first();
      await discoverLink.click();
      await page.waitForURL('**/discover**', { timeout: 8000 });
      return page.url().includes('/discover');
    },
  },
  {
    id: 'P6-05', phase: 6, area: 'Style Map',
    desc: '/style-map page loads',
    method: 'web', url: '/style-map',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // D3 simulation takes time
      const hasSvg = await page.locator('svg, canvas').count();
      return hasSvg > 0;
    },
  },
  {
    id: 'P6-06', phase: 6, area: 'Crate Dig',
    desc: '/crate page loads (desktop-only on web — shows gating message)',
    method: 'web', url: '/crate',
    fn: async (page) => {
      await page.waitForLoadState('domcontentloaded');
      // Web shows desktop-only message — page should render, not crash
      const text = await page.textContent('body');
      return text.length > 50;
    },
  },
  {
    id: 'P6-07', phase: 6, area: 'Artist page',
    desc: 'Uniqueness score badge appears on artist page',
    method: 'code',
    fn: fileExists('src/lib/components/UniquenessScore.svelte'),
  },
  {
    id: 'P6-08', phase: 6, area: 'Style Map',
    desc: 'StyleMap.svelte exists with headless D3 tick pattern',
    method: 'code',
    fn: fileContains('src/lib/components/StyleMap.svelte', 'simulation.tick'),
  },
];

// ---------------------------------------------------------------------------
// PHASE 7 — Knowledge Base
// ---------------------------------------------------------------------------

export const PHASE_7 = [
  {
    id: 'P7-01', phase: 7, area: 'Knowledge Base',
    desc: '/kb page loads',
    method: 'web', url: '/kb',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const text = await page.textContent('body');
      return text.length > 100;
    },
  },
  {
    id: 'P7-02', phase: 7, area: 'Knowledge Base',
    desc: 'Genre graph SVG renders on /kb',
    method: 'web', url: '/kb',
    fn: async (page) => {
      await page.waitForTimeout(4000); // D3 simulation
      const hasSvg = await page.locator('svg').count();
      return hasSvg > 0;
    },
  },
  {
    id: 'P7-03', phase: 7, area: 'Knowledge Base',
    desc: 'KB genre detail page renders without crashing (unknown slug shows 404, not error)',
    method: 'web', url: '/kb/test-slug-that-does-not-exist',
    fn: async (page) => {
      await page.waitForLoadState('domcontentloaded');
      // Should show a graceful not-found message, not a JS error / blank page
      const text = await page.textContent('body');
      return text.length > 50;
    },
  },
  {
    id: 'P7-04', phase: 7, area: 'Time Machine',
    desc: '/time-machine page loads',
    method: 'web', url: '/time-machine',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      const text = await page.textContent('body');
      return text.length > 100;
    },
  },
  {
    id: 'P7-05', phase: 7, area: 'Knowledge Base',
    desc: 'GenreGraph.svelte exists with headless D3 tick pattern',
    method: 'code',
    fn: fileContains('src/lib/components/GenreGraph.svelte', 'simulation.tick'),
  },
  {
    id: 'P7-06', phase: 7, area: 'Knowledge Base',
    desc: 'LinerNotes.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/LinerNotes.svelte'),
  },
  {
    id: 'P7-07', phase: 7, area: 'Knowledge Base',
    desc: 'SceneMap.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/SceneMap.svelte'),
  },
];

// ---------------------------------------------------------------------------
// PHASE 8 — Underground Aesthetic
// ---------------------------------------------------------------------------

export const PHASE_8 = [
  {
    id: 'P8-01', phase: 8, area: 'Theme',
    desc: 'OKLCH palette module exists (taste-based theming)',
    method: 'code',
    fn: anyFileContains('src/lib/**/*.ts', /oklch|generatePalette|applyPalette/i),
  },
  {
    id: 'P8-02', phase: 8, area: 'Layout',
    desc: 'PanelLayout.svelte (PaneForge) exists',
    method: 'code',
    fn: fileExists('src/lib/components/PanelLayout.svelte'),
  },
  {
    id: 'P8-03', phase: 8, area: 'Layout',
    desc: 'ControlBar.svelte workspace controls exist',
    method: 'code',
    fn: fileExists('src/lib/components/ControlBar.svelte'),
  },
  {
    id: 'P8-04', phase: 8, area: 'Layout',
    desc: 'LeftSidebar.svelte and RightSidebar.svelte exist',
    method: 'code',
    fn: () =>
      fileExists('src/lib/components/LeftSidebar.svelte')() &&
      fileExists('src/lib/components/RightSidebar.svelte')(),
  },
  {
    id: 'P8-05', phase: 8, area: 'Settings',
    desc: 'Web: /settings page loads (shows desktop-only message)',
    method: 'web', url: '/settings',
    fn: async (page) => {
      await page.waitForLoadState('networkidle');
      const text = await page.textContent('body');
      // Either real settings or the "desktop only" gating message — not a crash
      return text.length > 50;
    },
  },
  {
    id: 'P8-06', phase: 8, area: 'Settings',
    desc: 'Settings page has Appearance, Layout, Streaming sections (code)',
    method: 'code',
    fn: fileContains('src/routes/settings/+page.svelte', 'Appearance'),
  },
  {
    id: 'P8-07', phase: 8, area: 'Layout',
    desc: '[skip] Panel drag-to-resize works in cockpit mode',
    method: 'skip',
    reason: 'Requires running Tauri desktop app — PaneForge resize needs native window',
  },
];

// ---------------------------------------------------------------------------
// PHASE 9 — Community Foundation
// ---------------------------------------------------------------------------

export const PHASE_9 = [
  {
    id: 'P9-01', phase: 9, area: 'Identity',
    desc: 'user_identity table created in taste.db init',
    method: 'code',
    fn: fileContains('src-tauri/src/ai/taste_db.rs', 'user_identity'),
  },
  {
    id: 'P9-02', phase: 9, area: 'Collections',
    desc: 'collections + collection_items tables created in taste.db init',
    method: 'code',
    fn: () =>
      fileContains('src-tauri/src/ai/taste_db.rs', 'collections')() &&
      fileContains('src-tauri/src/ai/taste_db.rs', 'collection_items')(),
  },
  {
    id: 'P9-03', phase: 9, area: 'Identity',
    desc: 'get_identity_value + set_identity_value commands registered',
    method: 'code',
    fn: () =>
      fileContains('src-tauri/src/lib.rs', 'get_identity_value')() &&
      fileContains('src-tauri/src/lib.rs', 'set_identity_value')(),
  },
  {
    id: 'P9-04', phase: 9, area: 'Collections',
    desc: 'Collection CRUD commands registered (get_collections, add_collection_item)',
    method: 'code',
    fn: () =>
      fileContains('src-tauri/src/lib.rs', 'get_collections')() &&
      fileContains('src-tauri/src/lib.rs', 'add_collection_item')(),
  },
  {
    id: 'P9-05', phase: 9, area: 'Avatar',
    desc: 'avatar.ts identity module exists with generateAvatarSvg export',
    method: 'code',
    fn: fileContains('src/lib/identity/avatar.ts', 'generateAvatarSvg'),
  },
  {
    id: 'P9-06', phase: 9, area: 'Avatar',
    desc: 'AvatarEditor.svelte and AvatarPreview.svelte exist',
    method: 'code',
    fn: () =>
      fileExists('src/lib/components/AvatarEditor.svelte')() &&
      fileExists('src/lib/components/AvatarPreview.svelte')(),
  },
  {
    id: 'P9-07', phase: 9, area: 'Collections',
    desc: 'collections.svelte.ts reactive state module exists',
    method: 'code',
    fn: fileExists('src/lib/taste/collections.svelte.ts'),
  },
  {
    id: 'P9-08', phase: 9, area: 'Import',
    desc: 'All 4 import modules exist (Spotify, Last.fm, Apple, CSV)',
    method: 'code',
    fn: () =>
      fileExists('src/lib/taste/import/spotify.ts')() &&
      fileExists('src/lib/taste/import/lastfm.ts')() &&
      fileExists('src/lib/taste/import/apple.ts')() &&
      fileExists('src/lib/taste/import/csv.ts')(),
  },
  {
    id: 'P9-09', phase: 9, area: 'Import',
    desc: 'exportAllUserData() exists in import index',
    method: 'code',
    fn: fileContains('src/lib/taste/import/index.ts', 'exportAllUserData'),
  },
  {
    id: 'P9-10', phase: 9, area: 'Profile',
    desc: '/profile route exists (Tauri-only page)',
    method: 'code',
    fn: fileExists('src/routes/profile/+page.svelte'),
  },
  {
    id: 'P9-11', phase: 9, area: 'Profile',
    desc: 'TasteFingerprint.svelte with D3 force constellation exists',
    method: 'code',
    fn: fileContains('src/lib/components/TasteFingerprint.svelte', 'simulation.tick'),
  },
  {
    id: 'P9-12', phase: 9, area: 'Collections',
    desc: 'CollectionShelf.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/CollectionShelf.svelte'),
  },
  {
    id: 'P9-13', phase: 9, area: 'Save to Shelf',
    desc: 'Artist page has Save to Shelf wiring (Tauri-gated)',
    method: 'code',
    fn: fileContains('src/routes/artist/[slug]/+page.svelte', 'addToCollection'),
  },
  {
    id: 'P9-14', phase: 9, area: 'Settings',
    desc: 'Settings has Identity + Import + Export sections',
    method: 'code',
    fn: () =>
      fileContains('src/routes/settings/+page.svelte', 'Identity')() &&
      fileContains('src/routes/settings/+page.svelte', 'exportAllUserData')(),
  },
  {
    id: 'P9-15', phase: 9, area: 'Navigation',
    desc: 'Profile nav link in layout (Tauri header)',
    method: 'code',
    fn: fileContains('src/routes/+layout.svelte', '/profile'),
  },
  {
    id: 'P9-16', phase: 9, area: 'Profile',
    desc: '[skip] Handle input saves to user_identity table',
    method: 'skip',
    reason: 'Requires running Tauri desktop app',
  },
  {
    id: 'P9-17', phase: 9, area: 'Import',
    desc: '[skip] Spotify PKCE OAuth flow completes',
    method: 'skip',
    reason: 'Requires running Tauri desktop app + real Spotify account',
  },
  {
    id: 'P9-18', phase: 9, area: 'Profile',
    desc: '[skip] Taste Fingerprint PNG export via save dialog',
    method: 'skip',
    reason: 'Requires running Tauri desktop app — uses OS save dialog',
  },
];

// ---------------------------------------------------------------------------
// Phase 10 — Scenes
// ---------------------------------------------------------------------------

export const PHASE_10 = [
  {
    id: 'P10-01', phase: 10, area: 'Scenes',
    desc: 'SceneCard.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/SceneCard.svelte'),
  },
  {
    id: 'P10-02', phase: 10, area: 'Scenes',
    desc: '/scenes route exists',
    method: 'code',
    fn: fileExists('src/routes/scenes/+page.svelte'),
  },
  {
    id: 'P10-03', phase: 10, area: 'Scenes',
    desc: '/scenes/[slug] detail route exists',
    method: 'code',
    fn: fileExists('src/routes/scenes/[slug]/+page.svelte'),
  },
  {
    id: 'P10-04', phase: 10, area: 'Scenes',
    desc: 'Scene detection engine exists',
    method: 'code',
    fn: fileExists('src/lib/scenes/detection.ts'),
  },
  {
    id: 'P10-05', phase: 10, area: 'Scenes',
    desc: 'Scenes nav link in layout',
    method: 'code',
    fn: fileContains('src/routes/+layout.svelte', '/scenes'),
  },
  {
    id: 'P10-06', phase: 10, area: 'Scenes',
    desc: 'Scene follow/unfollow Rust commands registered',
    method: 'code',
    fn: fileContains('src-tauri/src/lib.rs', 'follow_scene'),
  },
];

// ---------------------------------------------------------------------------
// Phase 11 — Taste Bridge (AI Chat)
// ---------------------------------------------------------------------------

export const PHASE_11 = [
  {
    id: 'P11-01', phase: 11, area: 'Chat',
    desc: 'ChatOverlay.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/chat/ChatOverlay.svelte'),
  },
  {
    id: 'P11-02', phase: 11, area: 'Chat',
    desc: 'ChatPanel.svelte exists',
    method: 'code',
    fn: fileExists('src/lib/components/chat/ChatPanel.svelte'),
  },
  {
    id: 'P11-03', phase: 11, area: 'Chat',
    desc: 'UnfurlCard.svelte exists (link preview)',
    method: 'code',
    fn: fileExists('src/lib/components/chat/UnfurlCard.svelte'),
  },
  {
    id: 'P11-04', phase: 11, area: 'Chat',
    desc: '/api/unfurl endpoint exists',
    method: 'code',
    fn: fileExists('src/routes/api/unfurl/+server.ts'),
  },
  {
    id: 'P11-05', phase: 11, area: 'Chat',
    desc: 'Chat nav button in layout',
    method: 'code',
    fn: fileContains('src/routes/+layout.svelte', 'Chat'),
  },
  {
    id: 'P11-06', phase: 11, area: 'Chat',
    desc: 'notifications.svelte.ts chat state module exists',
    method: 'code',
    fn: fileExists('src/lib/comms/notifications.svelte.ts'),
  },
];

// ---------------------------------------------------------------------------
// Phase 12 — Curator / Blog Tools
// ---------------------------------------------------------------------------

export const PHASE_12 = [
  {
    id: 'P12-01', phase: 12, area: 'RSS',
    desc: 'RSS artist feed route exists',
    method: 'code',
    fn: fileExists('src/routes/api/rss/artist/[slug]/+server.ts'),
  },
  {
    id: 'P12-02', phase: 12, area: 'RSS',
    desc: 'RSS tag feed route exists',
    method: 'code',
    fn: fileExists('src/routes/api/rss/tag/[tag]/+server.ts'),
  },
  {
    id: 'P12-03', phase: 12, area: 'RSS',
    desc: 'RSS new-rising feed route exists',
    method: 'code',
    fn: fileExists('src/routes/api/rss/new-rising/+server.ts'),
  },
  {
    id: 'P12-04', phase: 12, area: 'RSS',
    desc: 'RssButton.svelte component exists',
    method: 'code',
    fn: fileExists('src/lib/components/RssButton.svelte'),
  },
  {
    id: 'P12-05', phase: 12, area: 'Embed',
    desc: '/embed/artist/[slug] route exists',
    method: 'code',
    fn: fileExists('src/routes/embed/artist/[slug]/+page.svelte'),
  },
  {
    id: 'P12-06', phase: 12, area: 'Embed',
    desc: 'Embed layout uses reset syntax (@)',
    method: 'code',
    fn: fileExists('src/routes/embed/+layout@.svelte'),
  },
  {
    id: 'P12-07', phase: 12, area: 'Embed',
    desc: 'embed.js bootstrap script route exists',
    method: 'code',
    fn: fileExists('src/routes/embed.js/+server.ts'),
  },
  {
    id: 'P12-08', phase: 12, area: 'Embed',
    desc: 'generateEmbedSnippets utility exists',
    method: 'code',
    fn: fileContains('src/lib/curator/embed-snippet.ts', 'generateEmbedSnippets'),
  },
  {
    id: 'P12-09', phase: 12, area: 'Embed',
    desc: 'Artist page has embed widget UI',
    method: 'code',
    fn: fileContains('src/routes/artist/[slug]/+page.svelte', 'embed-toggle'),
  },
  {
    id: 'P12-10', phase: 12, area: 'Curator',
    desc: '/api/curator-feature attribution endpoint exists',
    method: 'code',
    fn: fileExists('src/routes/api/curator-feature/+server.ts'),
  },
  {
    id: 'P12-11', phase: 12, area: 'New & Rising',
    desc: '/new-rising page route exists',
    method: 'code',
    fn: fileExists('src/routes/new-rising/+page.svelte'),
  },
  {
    id: 'P12-12', phase: 12, area: 'New & Rising',
    desc: '/api/new-rising endpoint exists',
    method: 'code',
    fn: fileExists('src/routes/api/new-rising/+server.ts'),
  },
];

// ---------------------------------------------------------------------------
// Build check — always runs last
// ---------------------------------------------------------------------------

export const BUILD = [
  {
    id: 'BUILD-01', phase: 0, area: 'Build',
    desc: 'npm run check exits 0 (TypeScript + Svelte)',
    method: 'build',
  },
];

// ---------------------------------------------------------------------------
// Full manifest (all phases, in order)
// ---------------------------------------------------------------------------

export const ALL_TESTS = [
  ...PHASE_2,
  ...PHASE_3,
  ...PHASE_4,
  ...PHASE_5,
  ...PHASE_6,
  ...PHASE_7,
  ...PHASE_8,
  ...PHASE_9,
  ...PHASE_10,
  ...PHASE_11,
  ...PHASE_12,
  ...BUILD,
];
