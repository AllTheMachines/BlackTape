---
phase: 18-ai-auto-news
plan: 03
subsystem: ui
tags: [svelte, typescript, ai, component, cache, state-machine]
dependency_graph:
  requires:
    - 18-01 (get_artist_summary / save_artist_summary Tauri commands)
    - 18-02 (aiState.autoGenerateOnVisit, artistSummaryFromReleases, getAiProvider)
  provides:
    - ArtistSummary.svelte component (all states: hidden/generating/cached/stale-refresh/silent-fail)
  affects:
    - artist page (+page.svelte will import this component)
    - 18-04 (Settings UI — provider selector and auto-generate toggle interact with this component's behavior)
tech_stack:
  added: []
  patterns:
    - "onMount IIFE with inner async IIFE (same pattern as ArtistStats.svelte)"
    - "Lazy invoke import inside onMount and generateSummary (project convention — never at module level)"
    - "Fire-and-forget background refresh (intentionally not awaited for stale cache path)"
    - "Silent-fail catch blocks — no error UI ever surfaces per spec"
    - "Svelte 5 $state with $props() interface pattern"
key_files:
  created:
    - src/lib/components/ArtistSummary.svelte
  modified:
    - BUILD-LOG.md
decisions:
  - "Section hidden via {#if summaryText || isGenerating} — zero DOM footprint until content exists"
  - "Background refresh is fire-and-forget per spec — showing old text immediately is better UX than blocking"
  - "Silent fail means catch blocks are empty — no console.error even, per spec requirement"
  - "formatRelativeTime uses day buckets (today/yesterday/N days ago) — simple, readable, no locale complexity"
metrics:
  duration: 153s
  completed: 2026-02-24
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 18 Plan 03: ArtistSummary Component Summary

Self-contained ArtistSummary.svelte component with full state machine — hidden/generating/cached/stale-refresh/silent-fail — all states wired to the Tauri cache commands and AI engine built in Plans 01 and 02.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ArtistSummary.svelte with all states and cache logic | f848cb6 | src/lib/components/ArtistSummary.svelte (new) |

## What Was Built

### src/lib/components/ArtistSummary.svelte (new, 238 lines)

Complete AI summary display component with:

**Props:** `artistMbid`, `artistName`, `artistTags`, `releases` (array with title/year/type)

**State machine (Svelte 5 $state):**
- `summaryText: string | null` — null keeps section hidden
- `generatedAt: number | null` — Unix seconds from DB row
- `isGenerating: boolean` — true while AI call is in flight

**Lifecycle (onMount IIFE):**
1. Reads `get_artist_summary` cache for the artist MBID
2. If cached: populates text + timestamp; checks staleness (30-day TTL)
3. If stale and `autoGenerateOnVisit`: fires background refresh (not awaited)
4. If no cache and `autoGenerateOnVisit` and provider ready: auto-generates
5. If neither: section stays hidden (zero DOM footprint)

**generateSummary() async:**
- Guards on `getAiProvider()` returning non-null
- Sets `isGenerating = true`, calls `provider.complete()` with `artistSummaryFromReleases` prompt
- On success: saves via `save_artist_summary`, updates local state
- catch block: empty (silent fail per spec)
- finally: clears `isGenerating`

**Template states:**
- Outer `{#if summaryText || isGenerating}` — section invisible until triggered
- `<section data-testid="ai-summary">` with `<span class="ai-badge">AI</span>`
- Generating: spinner with CSS keyframe animation + "Generating..." text
- Cached: summary text + footer row (timestamp + regenerate button + attribution)
- Attribution label "AI summary based on MusicBrainz data" always in footer

**Helpers:**
- `isSummaryStale(ts)` — compares Unix seconds against 30-day TTL
- `formatRelativeTime(ts)` — returns "Generated today" / "Generated yesterday" / "Generated N days ago"

## Verification

- `npm run check` — 0 errors, 8 pre-existing warnings (same baseline as Plan 02)
- 92/92 test suite passing
- `data-testid="ai-summary"` found in template
- `AI summary based on MusicBrainz data` found in template
- `get_artist_summary` found in onMount
- `save_artist_summary` found in generateSummary
- `artistSummaryFromReleases` imported and called (NOT PROMPTS.artistSummary)
- `aiState.autoGenerateOnVisit` referenced in two places (stale refresh + auto-generate paths)
- 238 lines (well above 80-line minimum artifact requirement)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/lib/components/ArtistSummary.svelte` exists (238 lines)
- Commit f848cb6 present in git log
- All must_have truths verified against implementation:
  - Section hidden when no cache and auto-generate off: YES (`{#if summaryText || isGenerating}`)
  - Spinner + "Generating..." while in flight: YES
  - Cached text with [AI] badge and timestamp: YES
  - Regenerate button triggers fresh generation: YES
  - Silent fail on API failure: YES (empty catch blocks)
  - Stale cache: shows old text, background refresh: YES (not awaited)
  - Attribution label always visible when shown: YES

## Next Phase Readiness

- Plan 04 (Settings UI) already partially implemented (AiSettings.svelte has provider selector and auto-generate toggle pre-committed as wip)
- Artist page (+page.svelte) still needs to import and mount `<ArtistSummary>` with correct props
