---
phase: 11-scene-building
plan: "03"
subsystem: scene-ui
tags: [typescript, svelte5, sveltekit, scenes, universal-load, anti-rich-get-richer, ai-description]

# Dependency graph
requires:
  - phase: 11-02
    provides: "src/lib/scenes/ module — DetectedScene, SceneArtist, PartitionedScenes, scenesState, loadScenes(), PROMPTS.sceneDescription"
provides:
  - "src/routes/scenes/+page.svelte — Scene directory with active/emerging tiers"
  - "src/routes/scenes/+page.server.ts — Web empty state server load"
  - "src/routes/scenes/+page.ts — Universal load: Tauri detection via scenesState, web passthrough"
  - "src/routes/scenes/[slug]/+page.svelte — Scene detail: artists + top tracks + listener count + tags + AI description"
  - "src/routes/scenes/[slug]/+page.server.ts — Web null state server load"
  - "src/routes/scenes/[slug]/+page.ts — Universal load for scene detail — fetches artists and top tracks"
  - "src/lib/components/SceneCard.svelte — Scene card component for directory listing"
affects: [11-04, 11-05, scene-suggestions, scene-community]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Universal +page.ts pattern: web SSR passthrough, Tauri dynamic import + loadScenes() (consistent with discover, genre pages)"
    - "effectiveBio pattern for AI description: null default, filled async in onMount (Tauri + aiState.enabled only)"
    - "svelte:head outside {#if} with ternary for nullable title — TypeScript enforcement"
    - "Two separate +page.server.ts files returning minimal server data — detection is Tauri-only, web gets graceful empty state"
    - "Top Tracks block omitted entirely when empty — {#if data.topTracks.length > 0} wraps h2 and list together"

key-files:
  created:
    - src/lib/components/SceneCard.svelte
    - src/routes/scenes/+page.svelte
    - src/routes/scenes/+page.server.ts
    - src/routes/scenes/+page.ts
    - src/routes/scenes/[slug]/+page.svelte
    - src/routes/scenes/[slug]/+page.server.ts
    - src/routes/scenes/[slug]/+page.ts
  modified:
    - BUILD-LOG.md

key-decisions:
  - "Top Tracks block wraps both h2 and list in {#if data.topTracks.length > 0} — no empty heading ever renders, satisfies locked decision CONTEXT.md line 18"
  - "svelte:head uses ternary (data.scene?.name ?? 'Scene') — required because {#if} blocks cannot contain svelte:head (Svelte compile-time restriction)"
  - "isDetecting binding in directory page uses onMount + dynamic import of scenesState — avoids importing .svelte.ts in static context, consistent with dynamic import isolation pattern"
  - "SceneCard.emerging uses border-color with CSS --accent var — same visual language as KB scene chips and emerging badges across the app"
  - "Web path +page.server.ts returns { scenes: [] } / { scene: null, artists: [], topTracks: [] } — clean empty state, never crashes, UI shows graceful messages"

# Metrics
duration: 4min
completed: 2026-02-23
---

# Phase 11 Plan 03: Scenes UI Routes Summary

**Two-tier anti-rich-get-richer scene directory + five-block scene detail page with universal load pattern and async AI description slot**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-23T11:17:58Z
- **Completed:** 2026-02-23T11:21:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created `src/lib/components/SceneCard.svelte` — reusable card with name, top 3 tags, listener badge, emerging badge in `--accent` color
- Created `/scenes` directory route (3 files):
  - `+page.server.ts` — web empty state (detection is Tauri-only)
  - `+page.ts` — universal load: web passthrough, Tauri calls `loadScenes()` + returns `scenesState.partitioned`
  - `+page.svelte` — two-tier grid (active/emerging), independent section visibility, empty state, feature-request CTA
- Created `/scenes/[slug]` detail route (3 files):
  - `+page.server.ts` — web null state
  - `+page.ts` — universal load: Tauri fetches artists + top tracks from mercury.db per scene MBIDs
  - `+page.svelte` — five blocks (header/tags/artists/top-tracks/AI), not-found state, `svelte:head` outside `{#if}`
- npm run check: 0 errors (7 pre-existing warnings unchanged)
- npm run build: success (Cloudflare adapter)

## Task Commits

1. **Task 1: Scene directory route (listing page)** - `8f90afe` (feat)
2. **Task 2: Scene detail route ([slug] page)** - `e4ae979` (feat)

## Files Created/Modified

- `src/lib/components/SceneCard.svelte` — scene card for directory listing
- `src/routes/scenes/+page.svelte` — directory with active/emerging tiers, empty state
- `src/routes/scenes/+page.server.ts` — web server load (returns empty scenes)
- `src/routes/scenes/+page.ts` — universal load with `isTauri()` branch
- `src/routes/scenes/[slug]/+page.svelte` — detail page with 5 blocks + AI slot
- `src/routes/scenes/[slug]/+page.server.ts` — web server load (returns null scene)
- `src/routes/scenes/[slug]/+page.ts` — universal load with MBID batch lookup + recordings query

## Decisions Made

- `svelte:head` ternary pattern: `{data.scene?.name ?? 'Scene'} — Mercury` outside all `{#if}` blocks — Svelte compile-time restriction enforced
- Top Tracks section gated with `{#if data.topTracks.length > 0}` that wraps both the `<h2>` and `<ol>` — satisfies "no empty heading" requirement from success criteria (locked decision)
- `isDetecting` reactive binding done via `onMount` dynamic import from `$lib/scenes` — avoids `.svelte.ts` in static import context, consistent with Tauri isolation pattern
- Feature-request CTA links to `/scenes?feature=collaborative-playlists` — Plan 04 will intercept this param to count feature votes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Web shows graceful empty states. Tauri shows scenes from `taste.db` cache when detection has run.

## Next Phase Readiness

- `/scenes` and `/scenes/[slug]` routes are live and rendering correctly
- SceneCard component ready for any future use (collections, profile page, etc.)
- Top tracks query gracefully degrades when `recordings` table not populated
- AI description slot ready — activates automatically when `aiState.enabled` and Tauri context

---
*Phase: 11-scene-building*
*Completed: 2026-02-23*

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/components/SceneCard.svelte
- FOUND: src/routes/scenes/+page.svelte
- FOUND: src/routes/scenes/+page.server.ts
- FOUND: src/routes/scenes/+page.ts
- FOUND: src/routes/scenes/[slug]/+page.svelte
- FOUND: src/routes/scenes/[slug]/+page.server.ts
- FOUND: src/routes/scenes/[slug]/+page.ts
- FOUND: .planning/phases/11-scene-building/11-03-SUMMARY.md

Commits verified:
- FOUND: 8f90afe — feat(11-03): scene directory route — listing page with two-tier display
- FOUND: e4ae979 — feat(11-03): scene detail route — artists, top tracks, listener count, AI description
