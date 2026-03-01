# Work Handoff - 2026-03-01

## Current Task
Smart cover placeholder system — built and debugged across two sessions.

## Context
Building a fallback hierarchy for cover art placeholders:
1. No album cover → use artist Wikipedia thumbnail as blurred backdrop
2. No artist pic → use album covers from page pool as blurred mosaic
3. Nothing → plain color background (existing)

## Progress
### Completed
- Created `src/lib/cover-pool.svelte.ts` — page-level reactive pool using `$state({urls:[]})`
- Rewrote `CoverPlaceholder.svelte` — layered structure:
  - Blurred image backdrop (blur 20px, brightness 0.28, saturate 1.3)
  - Genre color tint overlay (38% opacity)
  - Name label at z-index 2 with text-shadow
  - "Not official artwork" hover indicator (slides up from bottom)
  - Hash-based `object-position` for "parts of it" crop effect on single images
- Updated `ReleaseCard.svelte` — fetches artist Wikipedia thumb eagerly (not gated on coverError), seeds pool on cover load
- Updated `ArtistCard.svelte` — seeds pool when Wikipedia thumbnail loads
- Updated artist page — passes `artistName` to ReleaseCard
- Updated release page — fetches artist Wikipedia thumb eagerly, seeds pool
- Fixed pool reactivity bug: changed from plain JS getter pattern to `$state({})` proxy pattern (matches `playerState` etc.)

### Status
- Just reloaded after the pool reactivity fix
- User hasn't confirmed if it works yet

### Known working
- "5 Album Set" on Radiohead page shows blurred backdrop from pool covers
- Hover indicator for "Not official artwork" implemented

### Possible remaining issues
- If Wikipedia thumbnail fetch returns null for some artists, fallback will be pool-only
- Pool fills as page renders — earliest placeholder cards may briefly show solid color before pool populates

## Relevant Files
- `src/lib/cover-pool.svelte.ts` — NEW: `$state` pool store + `registerCover()` function
- `src/lib/components/CoverPlaceholder.svelte` — full rewrite with layered backdrop system
- `src/lib/components/ReleaseCard.svelte` — `artistName?` prop, eager wiki fetch, pool seeding
- `src/lib/components/ArtistCard.svelte` — pool seeding on thumbnail load
- `src/routes/artist/[slug]/+page.svelte` — passes `artistName={data.artist.name}` to ReleaseCard
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — eager wiki fetch, pool seeding

## Git Status
Branch is ahead of origin — BUILD-LOG.md dirty (hook auto-appends, normal). Nothing committed yet from this session.

## Next Steps
1. Verify the backdrop is now showing on all placeholder cards (Radiohead page is a good test)
2. If Wikipedia returns null for artist, the pool fallback should still kick in from other loaded covers
3. If everything looks good: commit + push
4. Potential future tweak: brightness/opacity values if backdrop is too dark or too light

## Resume Command
After running `/clear`, run `/resume` to continue.
