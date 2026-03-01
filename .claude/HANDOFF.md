# Work Handoff - 2026-03-01

## Current Task
Smart cover placeholder system — pool-based blurred backdrop.

## ACTIVE BUG (just reported, not yet fixed)
A real cover art image on the Radiohead page is now showing the generated placeholder instead of the actual cover. This means `coverError` is incorrectly being set to `true` for an image that should load fine, OR the pool mechanism is somehow replacing a real cover.

**Likely cause:** The `onload` handler on the release card img registers the cover URL in the pool — that's fine. But maybe a timing/rendering issue is causing `coverError = true` for a card that has real cover art. Check `ReleaseCard.svelte` — specifically whether `coverError` state is being reset correctly on prop changes (if `release` prop changes but `coverError` stays `true` from a previous render).

**To investigate:** Look at whether Svelte 5 resets `$state` variables when a component re-renders with new props (it doesn't — `$state` persists across re-renders of the same component instance). If release cards are reused/keyed incorrectly, a previous `coverError = true` could bleed into a new card.

**The `{#each}` in artist page uses `(release.mbid)` as key** — so each release gets its own component instance. That should be fine. But double-check.

**Alternative cause:** The `$effect` for pool sources in CoverPlaceholder — the `{#if effectiveSources.length > 0}` branch might be rendering over a real image if the component is reused.

## What Was Built
- `src/lib/cover-pool.svelte.ts` — `$state({urls:[]})` pool + `registerCover()` function
- `CoverPlaceholder.svelte` — layered blurred backdrop:
  - `filter: blur(18px) brightness(0.45) saturate(1.4)` on backdrop
  - Color tint overlay at `opacity: 0.28`
  - `poolSources` via `$effect(() => { poolSources = coverPool.urls.slice(0,4) })`
  - "Not official artwork" hover indicator
- `ReleaseCard.svelte` — `artistName?` prop (now unused for wiki), seeds pool on cover load
- `ArtistCard.svelte` — seeds pool on thumbnail load
- Artist page — passes `artistName={data.artist.name}` to ReleaseCard
- About page — added MusicBrainz/Cover Art Archive contribution paragraph

## Files Changed This Session
- `src/lib/cover-pool.svelte.ts` (new)
- `src/lib/components/CoverPlaceholder.svelte` (rewrite)
- `src/lib/components/ReleaseCard.svelte`
- `src/lib/components/ArtistCard.svelte`
- `src/routes/artist/[slug]/+page.svelte`
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte`
- `src/routes/about/+page.svelte`

## Next Steps
1. **Fix the bug first** — a real cover is showing placeholder. Investigate ReleaseCard coverError state and component keying.
2. Verify pool backdrops look good on all placeholder cards
3. Commit everything once bug is fixed

## Resume Command
After `/clear`, run `/resume` to continue.
