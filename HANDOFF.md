# Mercury Handoff — Phase 2 Execution In Progress

**Date:** 2026-02-15
**Stopped at:** Phase 2, Wave 4 (plan 02-05: end-to-end visual verification)
**Status:** 4/5 plans complete, verification checkpoint pending

## What Was Accomplished This Session

Executed Phase 2 (Search + Artist Pages + Embeds) plans 01-04 using wave-based parallel execution via `/gsd:execute-phase 2`.

### Plans Completed

| Plan | Wave | What it builds | Commits |
|------|------|----------------|---------|
| 02-01 | 1 | Cloudflare D1 adapter, query layer, slug system | `413268c`, `43f8071`, `7e6ef13` |
| 02-02 | 1 | Dark theme, landing page, SearchBar + TagChip | `8f3977f`, `31b34b7`, `06608b5` |
| 02-03 | 2 | Search API endpoint, search results page, ArtistCard grid | `a54f18e`, `8567c9b`, `f064972` |
| 02-04 | 3 | MusicBrainz API proxy, embed players, artist pages, bio | `8b9967f`, `21fffe8`, `2c91595` |

### Key Files Created

```
src/lib/styles/theme.css          — CSS custom properties (dark theme)
src/lib/db/queries.ts             — searchArtists, searchByTag, getArtistBySlug
src/lib/utils/slug.ts             — generateSlug with NFD normalization
src/lib/bio.ts                    — Wikipedia bio snippet fetcher
src/lib/embeds/types.ts           — PlatformLinks, PlatformType, PLATFORM_PRIORITY
src/lib/embeds/spotify.ts         — Spotify embed URL transformer
src/lib/embeds/youtube.ts         — YouTube embed URL transformer (nocookie)
src/lib/embeds/soundcloud.ts      — SoundCloud oEmbed URL builder
src/lib/embeds/bandcamp.ts        — Bandcamp external link (no embed)
src/lib/components/SearchBar.svelte    — Search input with artist/tag mode toggle
src/lib/components/TagChip.svelte      — Clickable tag pill
src/lib/components/ArtistCard.svelte   — Search result card
src/lib/components/EmbedPlayer.svelte  — Click-to-load embed wrapper
src/lib/components/ExternalLink.svelte — Platform-colored link button
src/routes/+layout.svelte         — Global layout with sticky header
src/routes/+page.svelte           — Search-first landing page
src/routes/search/+page.server.ts — Search server load (D1 queries)
src/routes/search/+page.svelte    — Search results with card grid
src/routes/artist/[slug]/+page.server.ts  — Artist page load (DB + MusicBrainz + bio)
src/routes/artist/[slug]/+page.svelte     — Two-column artist page (5fr/4fr)
src/routes/api/search/+server.ts          — JSON search API
src/routes/api/artist/[mbid]/links/+server.ts — MusicBrainz proxy with rate limiting
wrangler.jsonc                    — Cloudflare Pages + D1 config
pipeline/add-slugs.js             — Slug generation script (ran, 2.8M slugs created)
```

## CRITICAL BUG: FTS5 Search Query Broken

**Found during Wave 4 verification. Must fix before 02-05 checkpoint.**

### The Problem

In `src/lib/db/queries.ts`, the `searchArtists` function joins FTS5 results to artists on `a.name = f.name`:

```sql
FROM artists_fts f
JOIN artists a ON a.name = f.name
WHERE artists_fts MATCH ?
```

This is wrong because:
1. `artists_fts` is a standalone FTS5 table (not content-linked to `artists`)
2. FTS5 matches "radiohead" in the **tags** column too (not just name), so `f.name` could be "Sébastien Schuller" (who has "radiohead" as a tag)
3. The join `a.name = f.name` then returns artists with that name, which is a different artist than the FTS match
4. Real Radiohead (FTS rowid=66) doesn't appear because the name-based join skips it

### Evidence

```
FTS MATCH 'radiohead' rowid=66 → name="Radiohead" (CORRECT)
But JOIN gives: "radiohead 3", "DJ Radiohead", "Radiohead Cover Brasil" (WRONG)
```

### The Fix

The FTS5 rowid may not correspond to `artists.id`. Need to verify the mapping:
- Check: `SELECT rowid FROM artists_fts WHERE name = 'Radiohead'` — what's the rowid?
- Check: `SELECT id FROM artists WHERE name = 'Radiohead'` — does it match?

If rowids match `artists.id`: fix join to `a.id = f.rowid`
If not: need to add a content table reference or rebuild FTS5 with explicit rowid mapping.

### Where to Fix

`src/lib/db/queries.ts` line ~93-104 (the `searchArtists` function's FTS5 query)

## What Remains

### Immediate: Fix the search bug above

### Then: Complete Plan 02-05 (End-to-End Visual Verification)

This is a checkpoint plan (`autonomous: false`) with a `checkpoint:human-verify` task.

Steps:
1. Fix the FTS5 query bug
2. Verify with wrangler: `npx wrangler pages dev .svelte-kit/cloudflare --d1 DB=pipeline/data/mercury.db --port 5173`
3. Run `npm run check` and `npm run build` (both pass currently: 0 errors)
4. Present the human verification checkpoint
5. After user approves: create 02-05-SUMMARY.md, update STATE.md, run verifier

### After 02-05: Phase verification

The execute-phase workflow calls for a gsd-verifier agent after all plans complete.

## Dev Server Commands

```bash
# Plain SvelteKit (no D1 — search shows "unavailable")
npm run dev

# Wrangler with D1 (full experience with local database)
npm run build && npx wrangler pages dev .svelte-kit/cloudflare --d1 DB=pipeline/data/mercury.db --port 5173
```

## State Files

- `.planning/STATE.md` — Current position: Phase 2, plan 4/5
- `.planning/ROADMAP.md` — Plans 02-01 through 02-04 marked complete
- `.planning/phases/02-search-and-embeds/02-0{1,2,3,4}-SUMMARY.md` — All four summaries exist

## Resume Command

```
/gsd:execute-phase 2
```

This will detect plans 01-04 already have SUMMARYs, skip to 02-05, and resume execution.
