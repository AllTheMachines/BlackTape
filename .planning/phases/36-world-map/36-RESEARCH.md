# Phase 36: World Map - Research

**Researched:** 2026-03-04
**Domain:** Leaflet interactive maps, marker clustering, SvelteKit layout bypass, geographic artist discovery
**Confidence:** HIGH

## Summary

Phase 36 adds a full-viewport Leaflet world map at `/world-map` showing geocoded artists as clustered pins. The data layer is already complete (Phase 34 pipeline, `getGeocodedArtists()` query, `GeocodedArtist` type). The stack is already partially installed — `leaflet` and `@types/leaflet` are already in `package.json`. The missing piece is `leaflet.markercluster` (the clustering plugin) and `@types/leaflet.markercluster`.

The project has a working reference implementation: `SceneMap.svelte` demonstrates the exact dynamic import pattern needed for Leaflet in this SvelteKit/Tauri adapter-static setup. The Rabbit Hole layout bypass (`isRabbitHole` in `+layout.svelte`) is the direct model for the World Map's full-viewport escape from the standard cockpit shell.

The Rabbit Hole artist card (`src/routes/rabbit-hole/artist/[slug]/+page.svelte`) cannot be trivially extracted as a standalone component today — it is a full page route, not a component. The bottom panel will need to inline the card UI or receive a refactored component extracted from that page.

**Primary recommendation:** Add `leaflet.markercluster` + `@types/leaflet.markercluster`, add `isWorldMap` bypass to root layout (mirroring `isRabbitHole`), build a new `/world-map` route with the full Leaflet initialization in `onMount`. Extract the Rabbit Hole artist card markup into a reusable `RabbitHoleArtistCard.svelte` component that both the artist route and the map panel consume.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Nav / entry point**
- World Map gets its own nav item — accessible at any time alongside Rabbit Hole, Discover, etc.
- Full-page immersive layout — no left sidebar, no discovery panels; map fills the viewport. App titlebar stays (consistent with Rabbit Hole layout pattern).
- "See on map" button on Rabbit Hole artist cards — links to `/world-map?artist=[slug]`, centers map on that artist's pin. Bidirectional cross-linking.
- "See on map" button on Rabbit Hole genre/tag pages — links to `/world-map?tag=[slug]`, opens map pre-filtered to that genre.

**Pin interaction**
- Clicking a pin opens a slide-up panel from the bottom — artist card animates up, map stays visible behind. Dismiss by clicking the map again.
- Panel contains the full Rabbit Hole artist card — name, country, tags, similar artists row, play button, "Open in Rabbit Hole" button. Reuses the existing Rabbit Hole card component.
- Clicking a cluster zooms in to reveal individual pins (standard Leaflet.markercluster behavior). No panel for clusters — just zoom.

**Tag / genre filtering**
- Floating tag filter chip on the map — type/pick a tag and pins update to show only artists with that tag. Shows count of pinned artists for that tag.
- URL updates when filter is active: `/world-map?tag=ambient`. Supports browser back/forward and linking from Rabbit Hole tag pages.
- Rabbit Hole genre pages have a "See on map" button that links to `/world-map?tag=[slug]` — pre-filtered on arrival.

**Density handling**
- Leaflet.markercluster — nearby pins merge into numbered cluster bubbles. Click to zoom and reveal individual pins.
- Precision-based pin opacity: city-precision pins are fully opaque/bright; region-precision pins are slightly muted; country-centroid pins are more transparent/faded.
- Initial view: world zoom level showing all artists as clusters. No geolocation or saved position.

**Visual design**
- Tile layer: CartoDB Dark Matter — dark charcoal land, minimal labels, no API key required.
- Pins and cluster markers: amber — app accent color `#c4a55a`. Clusters show count badge in amber.
- Panel and filter UI: dark glass / blur overlay — semi-transparent dark background with `backdrop-filter: blur`.

### Claude's Discretion
- Exact pin icon shape (dot, teardrop, circle with outline)
- Cluster bubble sizing and typography
- Bottom panel height and animation easing
- How the tag filter autocomplete is implemented (FTS5 vs. in-memory tag list)
- Exact opacity values for city/region/country precision tiers
- Whether the "See on map" link on artist cards only appears if the artist has geocoordinates

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `leaflet` | 1.9.4 (already installed) | Map rendering, tiles, markers, zoom/pan | Already in package.json; used by SceneMap.svelte |
| `@types/leaflet` | 1.9.21 (already installed) | TypeScript types | Already in devDependencies |
| `leaflet.markercluster` | 1.5.3 | Cluster nearby pins into numbered bubbles | Industry standard Leaflet clustering plugin; official Leaflet org repo |
| `@types/leaflet.markercluster` | 1.5.6 | TypeScript types for markercluster | Published by DefinitelyTyped, actively maintained |

### Supporting (no install needed)
| Asset | Source | Purpose |
|-------|--------|---------|
| CartoDB Dark Matter tiles | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` | No-API-key dark tile layer |
| Leaflet CSS | Injected via dynamic `<link>` in `onMount` (pattern from SceneMap.svelte) | Map rendering styles |
| MarkerCluster CSS | `leaflet.markercluster/dist/MarkerCluster.css` + `MarkerCluster.Default.css` | Cluster bubble styles |

**Installation:**
```bash
npm install leaflet.markercluster
npm install --save-dev @types/leaflet.markercluster
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/routes/world-map/
├── +layout.ts           # prerender: false, ssr: false (same as rabbit-hole)
├── +page.ts             # load: reads URL params (artist/tag), fetches geocoded artists + tag filter count
└── +page.svelte         # Full-viewport map component — all Leaflet init in onMount

src/lib/components/
└── RabbitHoleArtistCard.svelte  # Extracted from artist/[slug]/+page.svelte — reused in map panel
```

### Pattern 1: Full-Viewport Layout Bypass (mirrors isRabbitHole)
**What:** World Map needs to escape the standard PanelLayout/LeftSidebar/ControlBar cockpit shell, keeping only Titlebar and Player.
**When to use:** Any full-page immersive experience that needs map/canvas to fill 100% of the viewport.

The existing `isRabbitHole` check in `+layout.svelte` (line 38) is the exact model:
```typescript
// src/routes/+layout.svelte — add after isRabbitHole
let isWorldMap = $derived($page.url.pathname.startsWith('/world-map'));
```

Then in the template:
```svelte
{#if isEmbed}
  {@render children()}
{:else if isRabbitHole}
  <!-- Titlebar + Player, no cockpit shell -->
  ...
{:else if isWorldMap}
  <!-- SAME TREATMENT: Titlebar + Player, no cockpit shell -->
  {#if tauriMode}
    <Titlebar />
  {/if}
  {@render children()}
  {#if isTauri()}
    <Player />
  {/if}
{:else}
  <!-- Standard cockpit layout -->
  ...
{/if}
```

### Pattern 2: Leaflet Dynamic Import in onMount (established by SceneMap.svelte)
**What:** Leaflet accesses `window` at import time — must be dynamically imported inside `onMount`. This is the project's established pattern.
**When to use:** All Leaflet and leaflet plugin imports.

```typescript
// Source: src/lib/components/SceneMap.svelte (existing, verified working)
onMount(async () => {
  const L = (await import('leaflet')).default;
  // Must import leaflet BEFORE markercluster (plugin attaches to L)
  await import('leaflet.markercluster');

  // Inject Leaflet CSS (existing SceneMap pattern)
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }

  // Inject MarkerCluster CSS (same pattern)
  if (!document.querySelector('link[data-leaflet-mc]')) {
    const mcBase = document.createElement('link');
    mcBase.rel = 'stylesheet';
    mcBase.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    mcBase.setAttribute('data-leaflet-mc', '1');
    document.head.appendChild(mcBase);
    const mcDefault = document.createElement('link');
    mcDefault.rel = 'stylesheet';
    mcDefault.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    mcDefault.setAttribute('data-leaflet-mc-default', '1');
    document.head.appendChild(mcDefault);
  }

  map = L.map(mapEl, { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ...
});
```

**CRITICAL ORDER:** Leaflet must be imported before leaflet.markercluster. The plugin attaches itself to the `L` global — importing markercluster before Leaflet has initialized will fail silently or throw.

### Pattern 3: MarkerClusterGroup with Custom Icons
**What:** Build the cluster group with amber-colored markers and precision-based opacity.

```typescript
// After L is imported and markercluster side-effect imported
const clusterGroup = (L as any).markerClusterGroup({
  maxClusterRadius: 60,
  iconCreateFunction: (cluster: any) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="wm-cluster">${count}</div>`,
      className: '',
      iconSize: L.point(36, 36)
    });
  }
});

const opacityMap = { city: 1.0, region: 0.65, country: 0.35 };

for (const artist of artists) {
  const opacity = opacityMap[artist.city_precision];
  const marker = L.circleMarker([artist.city_lat, artist.city_lng], {
    radius: 6,
    fillColor: '#c4a55a',
    color: '#c4a55a',
    weight: 1,
    opacity,
    fillOpacity: opacity
  });
  marker.on('click', () => openArtistPanel(artist));
  clusterGroup.addLayer(marker);
}

map.addLayer(clusterGroup);
```

**Note on TypeScript:** `L.markerClusterGroup` is accessed via `(L as any).markerClusterGroup` because the type augmentation from `@types/leaflet.markercluster` augments the `L` namespace but TypeScript may not pick it up automatically with dynamic imports. Alternatively use `const { MarkerClusterGroup } = await import('leaflet.markercluster')` and construct directly.

### Pattern 4: URL Params for Artist/Tag Deep-Links
**What:** Read `?artist=[slug]` and `?tag=[slug]` on mount to center/filter the map. Uses SvelteKit's `$page.url.searchParams` — same pattern as Discover and Rabbit Hole.

```typescript
// +page.ts
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ url, parent }) => {
  const artistSlug = url.searchParams.get('artist');
  const tagFilter = url.searchParams.get('tag');

  const { getProvider } = await import('$lib/db/provider');
  const { getGeocodedArtists } = await import('$lib/db/queries');
  const db = await getProvider();

  const artists = await getGeocodedArtists(db, 50000);
  return { artists, artistSlug, tagFilter };
};
```

### Pattern 5: Bottom Slide-Up Panel
**What:** An absolute-positioned panel that animates up from the bottom when a pin is clicked. Dismisses on map click.

```svelte
<!-- Inside +page.svelte template -->
{#if selectedArtist}
  <div class="wm-panel" class:open={!!selectedArtist}>
    <button class="wm-panel-dismiss" onclick={() => selectedArtist = null}>✕</button>
    <!-- RabbitHoleArtistCard component here -->
  </div>
{/if}
```

```css
.wm-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  background: rgba(15, 15, 15, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--b-2);
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  z-index: 1000;
}
.wm-panel.open {
  transform: translateY(0);
}
```

**Map click dismiss:**
```typescript
map.on('click', () => { selectedArtist = null; });
```

### Anti-Patterns to Avoid
- **Top-level Leaflet import:** `import L from 'leaflet'` at the top of a Svelte file — Leaflet accesses `window` at import time and will crash SSR or even the static adapter's build step.
- **Importing markercluster before leaflet:** The plugin patches `L` — order matters.
- **`L.markerClusterGroup` without CSS:** The cluster bubbles render as invisible without both MarkerCluster.css and MarkerCluster.Default.css.
- **Not calling `map.remove()` in onDestroy:** Leaflet stores DOM references; navigating away without cleanup causes memory leaks and errors on return.
- **`goto()` without `replaceState`:** Filter changes should use `replaceState: true` to avoid polluting browser history on every tag filter keystroke.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pin clustering | Custom density-based grouping with DOM math | `leaflet.markercluster` | Handles 50K+ pins, zoom-in reveal, animated cluster split, click-to-zoom — weeks of work to replicate |
| Dark tile layer | Hosting/proxying tile images | CartoDB Dark Matter via CDN | Free, no API key, global CDN, designed for dark UIs |
| Tag autocomplete for filter | FTS5 query with debounce | In-memory filter on `tag_stats` list | Tag list is small (4,086 entries), already loaded for the map — filtering in memory is instant vs. async DB round-trips |
| Custom circle markers | Canvas rendering | Leaflet `circleMarker` with `fillOpacity` | Already handles precision-tier opacity; renders thousands of markers efficiently |

**Key insight:** Leaflet + markercluster is the established industry standard for this exact use case (50K geographic points with clustering). Any custom solution would sacrifice months of battle-tested edge case handling.

---

## Common Pitfalls

### Pitfall 1: Leaflet Map Height = 0 on Mount
**What goes wrong:** Map renders but shows nothing — all tiles and markers are invisible. The map container has `height: 0` because the parent flex container hasn't resolved its dimensions yet.
**Why it happens:** Leaflet computes tile coordinates based on container dimensions at `L.map()` call time. If the container hasn't rendered at full height yet, the initial calculation is wrong.
**How to avoid:** Set the map container to explicit `height: 100%` with the parent chain using `height: 100vh` or `flex: 1`. Call `map.invalidateSize()` after `onMount` resolves if the container size was uncertain.
**Warning signs:** Tiles visible only in top-left corner, or no tiles at all with console showing 0px height.

### Pitfall 2: `map.remove()` Not Called on Component Destroy
**What goes wrong:** Navigating away and back to the World Map throws Leaflet errors: "Map container is already initialized."
**Why it happens:** Leaflet marks the DOM container as initialized. If the old map instance isn't destroyed before the new `onMount` runs, the second `L.map()` call on the same element throws.
**How to avoid:** Always call `map?.remove(); map = null;` inside `onDestroy`.
**Warning signs:** Console error "Map container is already initialized" on second visit to the route.

### Pitfall 3: MarkerCluster CSS Not Loaded
**What goes wrong:** Clusters show no bubble, or the count number floats with no circle background.
**Why it happens:** Two CSS files are required — `MarkerCluster.css` (structural) and `MarkerCluster.Default.css` (visual theming). The Default CSS provides the colored circles.
**How to avoid:** Inject both CSS files in `onMount` (same `data-*` attribute guard pattern as SceneMap.svelte uses for Leaflet CSS).
**Warning signs:** Clusters are invisible or show plain numbers with no container.

### Pitfall 4: 50K Markers Without Clustering = Browser Freeze
**What goes wrong:** Adding all geocoded artists as individual markers (without markercluster) at world zoom level causes the browser to freeze for several seconds.
**Why it happens:** Leaflet renders each marker as a DOM element or Canvas path. 50K DOM elements is catastrophic for layout/paint.
**How to avoid:** Always add markers to a `markerClusterGroup`, never directly to the map. Only the visible clusters (usually <100 at world zoom) are rendered.
**Warning signs:** Page freezes on map load; DevTools shows 50K+ SVG or div elements in the map pane.

### Pitfall 5: Tag Filter with URL Updates on Every Keystroke
**What goes wrong:** Each character typed in the tag filter creates a new browser history entry. Pressing Back 10 times traverses through 10 letters of typing.
**Why it happens:** `goto()` by default pushes a new history entry.
**How to avoid:** Use `goto(url, { replaceState: true })` when updating the URL for filter state so the filter doesn't pollute history.
**Warning signs:** Browser Back button doesn't leave the map page — it steps through filter input history.

### Pitfall 6: "See on Map" Button Always Visible
**What goes wrong:** Artist cards in Rabbit Hole show a "See on Map" link for artists with no geocoordinates (precision = 'none'). Clicking navigates to the map but no artist pin exists, centering fails silently.
**Why it happens:** The geocoordinates check is missing.
**How to avoid:** Only show the "See on Map" button when the artist has a non-null `city_lat` (this requires a DB lookup or passing the geocoded flag to the artist card). Simplest approach: the Rabbit Hole artist page already has the `artist` record; add a `getArtistGeoStatus` query or just check if the artist appears in `getGeocodedArtists` — or keep it simple by always showing the button but making the map handle missing pins gracefully (show "This artist has no location data" if the artist isn't on the map).
**Warning signs:** Map receives `?artist=slug` param but has no pin to center on.

---

## Code Examples

### Complete Leaflet + MarkerCluster Initialization (verified pattern)

```typescript
// Source: SceneMap.svelte (existing project pattern) + markercluster API
import { onMount, onDestroy } from 'svelte';

let mapEl: HTMLDivElement;
let map: any = null;
let clusterGroup: any = null;

onMount(async () => {
  const L = (await import('leaflet')).default;
  await import('leaflet.markercluster'); // Side-effect: patches L

  // Inject Leaflet CSS
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }

  // Inject MarkerCluster CSS (both files required)
  if (!document.querySelector('link[data-leaflet-mc]')) {
    ['MarkerCluster.css', 'MarkerCluster.Default.css'].forEach((file, i) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/leaflet.markercluster@1.5.3/dist/${file}`;
      link.setAttribute(i === 0 ? 'data-leaflet-mc' : 'data-leaflet-mc-d', '1');
      document.head.appendChild(link);
    });
  }

  // Initialize map
  map = L.map(mapEl, { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Cluster group with custom amber icon
  clusterGroup = (L as any).markerClusterGroup({
    maxClusterRadius: 60,
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="wm-cluster">${count}</div>`,
        className: '',
        iconSize: L.point(36, 36)
      });
    }
  });

  map.addLayer(clusterGroup);
  map.on('click', () => { selectedArtist = null; });

  // Populate markers
  buildMarkers(L, artists);
});

onDestroy(() => {
  map?.remove();
  map = null;
});
```

### Precision-Tier Opacity
```typescript
// Source: CONTEXT.md design decisions
const PRECISION_OPACITY: Record<string, number> = {
  city: 1.0,
  region: 0.6,
  country: 0.3
};
```

### Tag Filter — In-Memory Approach (recommended for Claude's Discretion)
```typescript
// Filter artists client-side (no DB round-trip needed)
// The full artists array is already loaded from the page load
function filterByTag(tag: string, artists: GeocodedArtist[]): GeocodedArtist[] {
  if (!tag) return artists;
  const lower = tag.toLowerCase();
  return artists.filter(a =>
    a.tags?.split(',').some(t => t.trim().toLowerCase() === lower)
  );
}
```

### CartoDB Dark Matter Tile URL (verified)
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
subdomains: 'abcd'
attribution: '© OpenStreetMap contributors, © CARTO'
maxZoom: 19
```
No API key required. Source: CartoDB basemap-styles GitHub repo.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Import Leaflet at top of file | Dynamic `import('leaflet')` inside `onMount` | Leaflet 1.x + SSR era | Prevents "window is not defined" crash in adapter-static build |
| Custom cluster grid algorithms | `leaflet.markercluster` plugin | 2013+ standard | 50K+ markers without browser freeze |
| OpenStreetMap tile layer | CartoDB Dark/Light (choice based on UI theme) | ~2015 | No API key; purpose-designed dark aesthetic |
| OSM default tiles (light) | CartoDB Dark Matter | Decision in CONTEXT.md | Matches app dark theme without custom styling |

**Deprecated/outdated in this context:**
- OpenStreetMap tile layer for this UI: Technically functional but the light-grey aesthetic will clash with the app's `#0f0f0f` background.
- `@react-three/fiber` or D3 for a geographic map: Overkill and wrong paradigm; Leaflet is purpose-built for geographic tile maps.

---

## Open Questions

1. **CSS injection approach: CDN vs. local node_modules**
   - What we know: SceneMap.svelte injects Leaflet CSS from `unpkg.com` CDN. Works for Tauri (WebView2 has internet access when online). The app is desktop-only so CDN is always available for the dev case.
   - What's unclear: Should markercluster CSS also come from CDN, or should it be imported from `node_modules/leaflet.markercluster/dist/` directly? Local imports work better for offline use and don't depend on CDN availability.
   - Recommendation: Follow the existing SceneMap.svelte CDN pattern for consistency. If offline support becomes a requirement later, switch to local imports.

2. **Rabbit Hole artist card — extract or inline?**
   - What we know: The artist card is currently a full page route (`src/routes/rabbit-hole/artist/[slug]/+page.svelte`), not a standalone component. It has routing logic (`pushTrailItem`, `goto`) baked in.
   - What's unclear: Can the card be extracted without breaking Rabbit Hole? The routing-specific parts (`pushTrailItem`, `Continue` button) won't make sense in a map panel context.
   - Recommendation: Extract the visual structure into `RabbitHoleArtistCard.svelte` as a "display only" component with callback props for actions (onTagClick, onSimilarArtistClick, onOpenInRabbitHole). The Rabbit Hole route and the map panel both use this component but provide different callback implementations.

3. **Tag filter — FTS5 query vs. in-memory filter**
   - What we know: The full `getGeocodedArtists()` result (up to 50K records) is loaded at page load. Each `GeocodedArtist` has a `tags` string field (comma-separated). Tag autocomplete could filter the loaded array, or hit FTS5 for artist name suggestions.
   - What's unclear: How expensive is iterating 50K records on every filter keystroke?
   - Recommendation: Filter in memory with debounce. 50K records with a simple `includes()` check takes ~2ms in modern JS. The autocomplete suggestions (the tag list shown while typing) should come from `searchTagsAutocomplete()` (existing query) against `tag_stats` — this is fast (indexed LIKE prefix match) and returns ranked results.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently configured for this project |
| Config file | N/A |
| Quick run command | `npm run check` (TypeScript + Svelte type checking) |
| Full suite command | `npm run check` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| — | World Map route renders without crash | manual-only | `npm run check` (type safety) | N/A |
| — | `isWorldMap` layout bypass active | manual-only | Visual inspection in Tauri | N/A |
| — | Leaflet map initializes, tiles load | manual-only | Visual inspection | N/A |
| — | Marker clustering functional at world zoom | manual-only | Visual inspection | N/A |
| — | Tag filter updates pins | manual-only | Visual inspection | N/A |
| — | "See on map" links from Rabbit Hole work | manual-only | Navigate in-app | N/A |
| — | Bottom panel slide-up on pin click | manual-only | Visual interaction | N/A |

**Justification for manual-only:** This phase is entirely UI/interaction-based with no business logic that can be meaningfully unit tested. The key correctness guarantees come from TypeScript type checking (`npm run check`), the existing `getGeocodedArtists()` query (already tested in Phase 34), and manual visual verification in the running Tauri app.

### Wave 0 Gaps
- [ ] `src/routes/world-map/+layout.ts` — prerender: false, ssr: false (mirroring rabbit-hole)
- [ ] `src/routes/world-map/+page.ts` — data load function
- [ ] `src/routes/world-map/+page.svelte` — main map component
- [ ] `npm install leaflet.markercluster @types/leaflet.markercluster` — plugin install

---

## Sources

### Primary (HIGH confidence)
- `src/lib/components/SceneMap.svelte` — Existing working Leaflet + dynamic import pattern in this exact project
- `src/routes/+layout.svelte` — Existing `isRabbitHole` bypass pattern; direct model for `isWorldMap`
- `src/lib/db/queries.ts` — `getGeocodedArtists()` already implemented and typed
- `package.json` — Confirms `leaflet@1.9.4` and `@types/leaflet@1.9.21` already installed
- `src/routes/rabbit-hole/+layout.ts` — Confirms `prerender: false, ssr: false` pattern for immersive routes

### Secondary (MEDIUM confidence)
- [CartoDB basemap-styles GitHub](https://github.com/CartoDB/basemap-styles) — CartoDB Dark Matter tile URL `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` confirmed, no API key required
- [Svelte + Leaflet + Markercluster Playground](https://svelte.dev/playground/761fc7956ca3499888545613f54a9146) — Verified working markercluster + Svelte integration
- [leaflet.markercluster npm](https://www.npmjs.com/package/leaflet.markercluster) — Current version 1.5.3, active maintenance
- [@types/leaflet.markercluster npm](https://www.npmjs.com/package/@types/leaflet.markercluster) — Current version 1.5.6

### Tertiary (LOW confidence)
- Community search results on SSR + Leaflet patterns — confirmed by project's existing SceneMap.svelte (which is the authoritative local source anyway)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — leaflet already in project, markercluster is the only addition; both verified on npm
- Architecture: HIGH — isRabbitHole bypass and SceneMap.svelte provide direct, working models from the same codebase
- Pitfalls: HIGH — derived from existing project code (SceneMap.svelte pattern), Leaflet documentation, and confirmed community experience
- Visual design: HIGH — all design decisions locked in CONTEXT.md by the user

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (Leaflet 1.x is stable; markercluster 1.5.x is stable; CartoDB tiles are long-lived infrastructure)
