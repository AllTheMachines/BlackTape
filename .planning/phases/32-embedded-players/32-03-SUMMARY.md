---
phase: 32-embedded-players
plan: 03
subsystem: ui
tags: [svelte, typescript, iframe, bandcamp, streaming, release-page]

# Dependency graph
requires:
  - phase: 32-01
    provides: bandcampEmbedUrl() — spike confirmed PASSES in WebView2
  - phase: 32-02
    provides: EmbedPlayer patterns for context
provides:
  - streamingLinks field in release page load() return value
  - Play Album button gated on tauriMode && data.streamingLinks?.bandcamp
  - Inline Bandcamp iframe on Play Album click (bandcampEmbedUrl())
  - release-embed-wrap CSS for iframe container
affects:
  - Release page playback UX (users can now play Bandcamp releases inline)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "streamingLinks pattern: expose platform URLs from load() as { bandcamp: string | null } for conditional UI"
    - "Play Album inline embed: showInlineEmbed $state, gated iframe using bandcampEmbedUrl()"
    - "Outer-scope variable pattern: declare let bandcampUrl before try block, assign inside, use after"

key-files:
  created: []
  modified:
    - src/routes/artist/[slug]/release/[mbid]/+page.ts
    - src/routes/artist/[slug]/release/[mbid]/+page.svelte

key-decisions:
  - "Spike path taken: Bandcamp spike PASSES (from 32-01) — inline iframe embed implemented, not external-link fallback"
  - "Play Album button absent from DOM when no Bandcamp URL — not disabled, not grayed out"
  - "bandcampUrl moved to outer scope (before try block) to make it accessible at the return statement"
  - "streamingLinks: { bandcamp: string | null } exposes the value without extending ReleaseDetail interface"

patterns-established:
  - "streamingLinks pattern reusable: any future platform URL can be added to the streamingLinks object without touching ReleaseDetail"

requirements-completed: [BC-02, PLAYER-03]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 32 Plan 03: Release Page Play Album Wired to Bandcamp Embed Summary

**Release page Play Album button wired to inline Bandcamp iframe embed using bandcampEmbedUrl() — button hidden from DOM when no Bandcamp URL in MusicBrainz data, inline player shown on click when available**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T09:47:17Z
- **Completed:** 2026-02-27T09:50:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `+page.ts`: Moved `bandcampUrl` declaration to outer scope (before try block) so it's accessible at the return statement. Added `const streamingLinks = { bandcamp: bandcampUrl }` and included it in the return object.
- `+page.svelte`: Imported `bandcampEmbedUrl` from `$lib/embeds/bandcamp`. Replaced `handlePlayAlbum` stub with `showInlineEmbed = true`. Added `showInlineEmbed $state(false)`. Gated Play Album button inside `{#if data.streamingLinks?.bandcamp}` (inside existing `{#if tauriMode}` block). Added inline iframe block using `bandcampEmbedUrl(data.streamingLinks.bandcamp)` when `showInlineEmbed && data.streamingLinks?.bandcamp`. Added `.release-embed-wrap` CSS.

## Task Commits

1. **Task 1: Add streamingLinks to release page load; wire Play Album to inline Bandcamp embed** - `8c36100` (feat)

## Files Created/Modified

- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — bandcampUrl outer scope, streamingLinks in return
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — bandcampEmbedUrl import, showInlineEmbed state, Play Album gated, inline iframe, CSS

## Path Taken: Bandcamp Spike PASSED

The Bandcamp spike in 32-01 **confirmed PASSES** in Tauri WebView2 145.0.3800.70. The inline iframe path was implemented:
- Play Album button is visible only when `tauriMode && data.streamingLinks?.bandcamp`
- Clicking sets `showInlineEmbed = true`
- Inline `<iframe>` renders using `bandcampEmbedUrl(data.streamingLinks.bandcamp)`

If the spike had failed, the button would have been hidden entirely (with a comment), since BuyOnBar already provides the "Buy on Bandcamp" external link.

## TypeScript Notes

No TypeScript issues. The load function's return type is inferred automatically by SvelteKit — `data.streamingLinks` gets the correct type `{ bandcamp: string | null }` without any manual type annotations needed. The `data.streamingLinks.bandcamp` access inside the iframe `src` is safe because it's inside `{#if showInlineEmbed && data.streamingLinks?.bandcamp}` which TypeScript narrows correctly.

## Deviations from Plan

None — plan executed exactly as written. Bandcamp spike PASSES path taken as specified.

## Final npm run check Result

```
0 ERRORS 8 WARNINGS 5 FILES_WITH_PROBLEMS
```

8 warnings are all pre-existing (same 8 from before this plan). Zero new issues introduced.

## Self-Check: PASSED

- [x] `src/routes/artist/[slug]/release/[mbid]/+page.ts` — modified, streamingLinks in return
- [x] `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — modified, Play Album wired
- [x] Commit `8c36100` exists
- [x] `npm run check` passes with 0 errors
- [x] `grep streamingLinks +page.ts` shows it in return object
- [x] `grep streamingLinks +page.svelte` shows it used in template
- [x] Play Album button gated on `data.streamingLinks?.bandcamp`
