# Roadmap: Mercury (BlackTape)

## Milestones

- ✅ **v1.0 MVP** — Phases 1--10 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** — Phases 11--12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** — Phases 13--15 (shipped 2026-02-24)
- ✅ **v1.3 The Open Network** — Phases 16--22 (shipped 2026-02-24)
- ✅ **v1.4 The Interface** — Phases 23--27 (shipped 2026-02-25)
- ✅ **v1.5 UX Cleanup** — Phase 28 (shipped 2026-02-26)
- ✅ **v1.6 The Playback Milestone** — Phases 29--33 (shipped 2026-02-27)
- 🚧 **v1.7 The Rabbit Hole** — Phases 34--37 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1--10) — SHIPPED 2026-02-23</summary>

See `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Scene Building + Curator Tools (Phases 11--12) — SHIPPED 2026-02-23</summary>

See `.planning/milestones/v1.1-*` (archived in .planning/)

</details>

<details>
<summary>✅ v1.2 Zero-Click Confidence (Phases 13--15) — SHIPPED 2026-02-24</summary>

See `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 The Open Network (Phases 16--22) — SHIPPED 2026-02-24</summary>

See `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 The Interface (Phases 23--27) — SHIPPED 2026-02-25</summary>

- [x] Phase 23: Design System Foundation — CSS tokens, custom titlebar, app chrome (completed 2026-02-24)
- [x] Phase 24: Artist Page — Redesign + MusicBrainz relationships + credits + discography filters (completed 2026-02-25)
- [x] Phase 25: Queue System + Library — Full queue management + library two-pane redesign (completed 2026-02-25)
- [x] Phase 26: Discover + Cross-Linking + Crate Fix — Filter grid + tool cross-links + country dropdown (completed 2026-02-25)
- [x] Phase 27: Search + Knowledge Base — Autocomplete + intent search + KB genre redesign (completed 2026-02-25)

See `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 UX Cleanup (Phase 28) — SHIPPED 2026-02-26</summary>

- [x] Phase 28: UX Cleanup + Scope Reduction (completed 2026-02-26)

See `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 The Playback Milestone (Phases 29--33) — SHIPPED 2026-02-27</summary>

- [x] Phase 29: Streaming Foundation — activeSource coordination, service priority drag-to-reorder, player bar badge (completed 2026-02-27)
- [x] Phase 30: Spotify Integration — PKCE OAuth, Spotify Connect API, disconnect/reconnect (completed 2026-02-27)
- [x] Phase 31: v1 Prep — Community features hidden from UI nav, localhost text fix (completed 2026-02-27)
- [x] Phase 32: Embedded Players — YouTube, SoundCloud, Bandcamp embeds + source switcher + release page Play Album (completed 2026-02-27)
- [x] Phase 33: Artist Claim Form — /claim route + Cloudflare Worker backend (completed 2026-02-27)

See `.planning/milestones/v1.6-ROADMAP.md`

</details>

---

## v1.7 — The Rabbit Hole (Phases 34--37)

- [x] Phase 34: Pipeline Foundation — Precompute similar artists (tag overlap), artist city geocoding (Wikidata SPARQL), track/release caching layer (completed 2026-03-04)
  **Plans:** 4 plans
  Plans:
  - [x] 34-01-PLAN.md — Similar artists pipeline (build-similar-artists.mjs + similar_artists table)
  - [x] 34-02-PLAN.md — City geocoding pipeline (build-geocoding.mjs + city_lat/city_lng/city_precision columns)
  - [x] 34-03-PLAN.md — Track/release cache (track_cache.rs Tauri command + taste.db schema)
  - [x] 34-04-PLAN.md — Query functions (getSimilarArtists, getGeocodedArtists in queries.ts)

### Phase 35: Rabbit Hole

**Goal:** New `/rabbit-hole` route, artist + genre exploration pages, similar artists navigation, releases/tracks, history trail

**Plans:** 5/5 plans complete
Plans:
- [x] 35-01-PLAN.md — DB queries + trail store (5 new query functions + localStorage-persisted trail)
- [x] 35-02-PLAN.md — Layout shell (root layout isRabbitHole bypass, nav restructure, sub-layout with exit + trail)
- [x] 35-03-PLAN.md — Landing page (unified search + Random button)
- [x] 35-04-PLAN.md — Artist card page (card with similar artists, releases, play + continue)
- [x] 35-05-PLAN.md — Genre/tag page (random 20 artists, related tags, reshuffle)

### Phase 36: World Map

**Goal:** Leaflet geographic discovery — full-viewport map at /world-map with CartoDB Dark Matter tiles, amber markerClusterGroup, precision-tier opacity, floating tag filter, slide-up artist panel, bidirectional cross-links with Rabbit Hole

**Plans:** 6/6 plans complete
Plans:
- [x] 36-01-PLAN.md — Route scaffold (install leaflet.markercluster, create +layout.ts, +page.ts, +page.svelte stub)
- [x] 36-02-PLAN.md — Layout bypass + nav (isWorldMap in root layout, World Map nav item)
- [x] 36-03-PLAN.md — Map core (Leaflet init, CartoDB tiles, markerClusterGroup, precision-tier opacity)
- [x] 36-04-PLAN.md — Tag filter (floating chip, in-memory filter, URL sync with replaceState, autocomplete)
- [x] 36-05-PLAN.md — Artist panel (extract RabbitHoleArtistCard.svelte, slide-up panel, marker click wiring)
- [x] 36-06-PLAN.md — Cross-links ("See on map" on Rabbit Hole artist + tag pages) + human verify checkpoint

### Phase 37: Context Sidebar + Decade Filtering

**Goal:** Context panel in nav-content gap, decade row replacing year input, AI companion (if AI connected)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1--10. MVP Foundation | v1.0 | 71/71 | Complete | 2026-02-23 |
| 11--12. Scene + Curator | v1.1 | 8/8 | Complete | 2026-02-23 |
| 13--15. Test Automation | v1.2 | ~3/3 | Complete | 2026-02-24 |
| 16--22. Open Network | v1.3 | 17/17 | Complete | 2026-02-24 |
| 23. Design System Foundation | v1.4 | 3/3 | Complete | 2026-02-24 |
| 24. Artist Page | v1.4 | 3/3 | Complete | 2026-02-25 |
| 25. Queue System + Library | v1.4 | 4/4 | Complete | 2026-02-25 |
| 26. Discover + Cross-Linking + Crate Fix | v1.4 | 4/4 | Complete | 2026-02-25 |
| 27. Search + Knowledge Base | v1.4 | 5/5 | Complete | 2026-02-25 |
| 28. UX Cleanup + Scope Reduction | v1.5 | 7/7 | Complete | 2026-02-26 |
| 29. Streaming Foundation | v1.6 | 4/4 | Complete | 2026-02-27 |
| 30. Spotify Integration | v1.6 | 3/3 | Complete | 2026-02-27 |
| 31. v1 Prep | v1.6 | 1/1 | Complete | 2026-02-27 |
| 32. Embedded Players | v1.6 | 3/3 | Complete | 2026-02-27 |
| 33. Artist Claim Form | v1.6 | 2/2 | Complete | 2026-02-27 |
| 34. Pipeline Foundation | v1.7 | 4/4 | Complete | 2026-03-04 |
| 35. Rabbit Hole | v1.7 | 5/5 | Complete | 2026-03-04 |
| 36. World Map | 6/6 | Complete   | 2026-03-04 | 2026-03-04 |
