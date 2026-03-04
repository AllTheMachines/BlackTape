---
phase: 36
slug: world-map
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — TypeScript/Svelte type checking only |
| **Config file** | none — type checking via `npm run check` |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 0 | Install deps | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 0 | world-map route files | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-02-01 | 02 | 1 | isWorldMap layout bypass | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-02-02 | 02 | 1 | Nav item added | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-03-01 | 03 | 1 | Map renders, tiles load | manual-only | Visual in Tauri | N/A | ⬜ pending |
| 36-03-02 | 03 | 1 | Marker clustering functional | manual-only | Visual in Tauri | N/A | ⬜ pending |
| 36-03-03 | 03 | 1 | Precision-tier opacity visible | manual-only | Visual in Tauri | N/A | ⬜ pending |
| 36-04-01 | 04 | 2 | Tag filter updates pins | manual-only | Visual in Tauri | N/A | ⬜ pending |
| 36-04-02 | 04 | 2 | URL updated with replaceState | manual-only | Browser back nav | N/A | ⬜ pending |
| 36-05-01 | 05 | 2 | Bottom panel slide-up on pin click | manual-only | Visual in Tauri | N/A | ⬜ pending |
| 36-05-02 | 05 | 2 | RabbitHoleArtistCard in panel | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-06-01 | 06 | 3 | "See on map" button on artist pages | automated | `npm run check` | ❌ W0 | ⬜ pending |
| 36-06-02 | 06 | 3 | ?artist= param centers map | manual-only | Navigate in-app | N/A | ⬜ pending |
| 36-06-03 | 06 | 3 | ?tag= param pre-filters map | manual-only | Navigate in-app | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install leaflet.markercluster @types/leaflet.markercluster` — clustering plugin
- [ ] `src/routes/world-map/+layout.ts` — prerender: false, ssr: false
- [ ] `src/routes/world-map/+page.ts` — data load (artists, artistSlug, tagFilter)
- [ ] `src/routes/world-map/+page.svelte` — stub component (empty map container)
- [ ] `src/lib/components/RabbitHoleArtistCard.svelte` — stub extracted from artist page

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map renders, tiles load | Phase 36 goal | Leaflet is visual; tiles load from CDN | Navigate to /world-map, verify dark CartoDB tiles visible |
| Marker clustering functional | Phase 36 goal | DOM-based visual; requires live data | At world zoom, verify cluster bubbles with counts; click to zoom |
| Precision-tier opacity | CONTEXT.md locked | CSS opacity; visual only | City pins fully opaque, country pins faded |
| Bottom panel animation | CONTEXT.md locked | CSS transition; visual only | Click pin → panel slides up from bottom |
| "See on map" deep-link | CONTEXT.md locked | Cross-route navigation | From Rabbit Hole artist, click "See on map" → map centers on pin |
| Tag pre-filter from Rabbit Hole | CONTEXT.md locked | Cross-route navigation | From genre page, click "See on map" → map pre-filtered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
