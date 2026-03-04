# Phase 36: World Map - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive Leaflet map at `/world-map` — geographic discovery of artists pinned to their city/region/country. Cross-links with Rabbit Hole (artist cards in a bottom panel, "See on map" from Rabbit Hole artist/tag pages). Filtering by tag/genre. Data from Phase 34 geocoding pipeline (`city_lat`, `city_lng`, `city_precision` columns on artists table).

Context Sidebar, AI Companion, and Decade Filtering are Phase 37.

</domain>

<decisions>
## Implementation Decisions

### Nav / entry point
- World Map gets its **own nav item** — accessible at any time alongside Rabbit Hole, Discover, etc.
- **Full-page immersive layout** — no left sidebar, no discovery panels; map fills the viewport. App titlebar stays (consistent with Rabbit Hole layout pattern).
- **"See on map" button on Rabbit Hole artist cards** — links to `/world-map?artist=[slug]`, centers map on that artist's pin. Bidirectional cross-linking.
- **"See on map" button on Rabbit Hole genre/tag pages** — links to `/world-map?tag=[slug]`, opens map pre-filtered to that genre.

### Pin interaction
- Clicking a pin opens a **slide-up panel from the bottom** — artist card animates up, map stays visible behind. Dismiss by clicking the map again.
- Panel contains the **full Rabbit Hole artist card** — name, country, tags, similar artists row, play button, "Open in Rabbit Hole" button. Reuses the existing Rabbit Hole card component.
- Clicking a cluster **zooms in** to reveal individual pins (standard Leaflet.markercluster behavior). No panel for clusters — just zoom.

### Tag / genre filtering
- Floating **tag filter chip** on the map — type/pick a tag and pins update to show only artists with that tag. Shows count of pinned artists for that tag.
- **URL updates** when filter is active: `/world-map?tag=ambient`. Supports browser back/forward and linking from Rabbit Hole tag pages.
- Rabbit Hole genre pages have a **"See on map" button** that links to `/world-map?tag=[slug]` — pre-filtered on arrival.

### Density handling
- **Leaflet.markercluster** — nearby pins merge into numbered cluster bubbles. Click to zoom and reveal individual pins. Industry-standard approach.
- **Precision-based pin opacity:** city-precision pins are fully opaque/bright; region-precision pins are slightly muted; country-centroid pins are more transparent/faded. Signals trustworthiness to users.
- **Initial view:** world zoom level showing all artists as clusters. Immediately shows global scope. No geolocation or saved position.

### Visual design
- **Tile layer: CartoDB Dark Matter** — dark charcoal land, minimal labels, no API key. Matches app's dark aesthetic perfectly.
- **Pins and cluster markers: amber** — app accent color. Clusters show count badge in amber. Ties to existing design system.
- **Panel and filter UI: dark glass / blur overlay** — semi-transparent dark background with `backdrop-filter: blur`. Feels native to a map UI. Map context visible through the overlay.

### Claude's Discretion
- Exact pin icon shape (dot, teardrop, circle with outline)
- Cluster bubble sizing and typography
- Bottom panel height and animation easing
- How the tag filter autocomplete is implemented (FTS5 vs. in-memory tag list)
- Exact opacity values for city/region/country precision tiers
- Whether the "See on map" link on artist cards only appears if the artist has geocoordinates

</decisions>

<specifics>
## Specific Ideas

- The "where is black metal from?" use case should work beautifully — tag filter + map = geographic genre distribution at a glance
- Precision differentiation is important: country-centroid pins clustering around capital cities could be misleading; fading them communicates "this is approximate"
- The bottom panel / artist card should feel like a natural extension of the Rabbit Hole, not a different UI — same card, different surface

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getGeocodedArtists(db, limit)` in `src/lib/db/queries.ts` — returns `GeocodedArtist[]` with `id, mbid, name, slug, country, tags, city_lat, city_lng, city_precision`. Gracefully returns `[]` before pipeline. Limit defaults to 50000.
- `GeocodedArtist` type already defined with `city_precision: 'city' | 'region' | 'country'`
- Rabbit Hole artist card (`src/routes/rabbit-hole/artist/[slug]/+page.svelte`) — the same card component should render in the bottom panel
- `leaflet` and `@types/leaflet` already in `package.json` — no install needed
- `StyleMap.svelte` — reference for D3 zoom/pan patterns (not reused — World Map uses Leaflet, not D3)

### Established Patterns
- Full-page immersive layout: Phase 35 Rabbit Hole uses `isRabbitHole` bypass in root layout — World Map needs the same treatment (`isWorldMap` or similar)
- URL params with `goto()`: SvelteKit URL param pattern already used in Discover and Rabbit Hole for state preservation
- `backdrop-filter: blur` not yet used in the app — this would be a new pattern, suitable for map overlay UI
- localStorage pattern: used for queue and Rabbit Hole trail persistence — tag filter state could persist the same way

### Integration Points
- `src/routes/+layout.svelte` — add "World Map" nav item (after Rabbit Hole in nav order)
- `src/routes/world-map/` — new route directory needed (`+page.svelte`, `+page.ts`)
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` — add "See on map" button (conditional: only if artist has geocoordinates)
- `src/routes/rabbit-hole/tag/[slug]/+page.svelte` — add "See on map" button linking to `/world-map?tag=[slug]`
- Leaflet must be imported dynamically (`import('leaflet')`) — SSR incompatible, adapter-static SPA still needs `browser` guard or dynamic import in `onMount`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-world-map*
*Context gathered: 2026-03-04*
