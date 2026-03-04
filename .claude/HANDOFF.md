# Work Handoff - 2026-03-04

## Current Task
Fix all UAT gaps from phases 35 (Rabbit Hole) and 36 (World Map), plus artist bio empty state — then kick off geocoding pipeline.

## Context
UAT was run on phases 35 and 36 before completing milestone v1.7. Multiple issues were found and fully diagnosed with parallel debug agents. All root causes are known. No code has been written yet — we're at the "ready to execute fixes" stage. Artist bio emptiness was also discovered and diagnosed in the same session.

## Progress

### Completed
- UAT for Phase 35 (Rabbit Hole): 4 passed, 4 issues, 2 skipped
- UAT for Phase 36 (World Map): 1 passed, 1 issue, 5 skipped
- Parallel debug agents diagnosed all root causes
- UAT files updated with diagnoses and committed:
  - `.planning/phases/35-rabbit-hole/35-UAT.md` (status: diagnosed)
  - `.planning/phases/36-world-map/36-UAT.md` (status: diagnosed)

### In Progress
- Nothing — diagnosis complete, fixes not yet started

### Remaining
All code fixes listed in the issues table below, then geocoding pipeline.

## Issues Table — All Gaps With Root Causes

| # | Area | Severity | Issue | Root Cause | Fix |
|---|------|----------|-------|------------|-----|
| 1 | P35 | major | Artist card shows "artist not found" | `artists.slug` is NULL — `add-slugs.js` not in pipeline script, never runs after DB rebuild | Run `node pipeline/add-slugs.js` now; add to `pipeline/package.json` pipeline script |
| 2 | P35 | major | Random button shows "artist not found" | Same as #1 | Same fix as #1 |
| 3 | P35 | major | Tag page: no Related Genres & Tags section | Niche tags have no rows in `tag_cooccurrence` (threshold: 5+ shared artists). `{#if relatedTags.length > 0}` silently hides entire section | Add empty-state message in `src/routes/rabbit-hole/tag/[slug]/+page.svelte` ~line 79 |
| 4 | P35 | cosmetic | Landing page search box too low | Vertical centering in `src/routes/rabbit-hole/+page.svelte` | Move search container to upper ~33% of viewport |
| 5 | P36 | major | World Map shows 0 artists | `build-geocoding.mjs` never run — `city_lat/city_lng/city_precision` columns don't exist on artists table (added by ALTER TABLE in that script) | Run `node pipeline/build-geocoding.mjs` overnight (resumable, ~16hrs for 2.6M artists) |
| 6 | P36 | major | `getGeocodedArtists` selects `a.tags` | `artists` table has no `tags` column — tags live in `artist_tags` | Fix query in `src/lib/db/queries.ts` to use `(SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags` subquery |
| 7 | P36 | cosmetic | Tag filter white background on dark map | WebView2 native input widget painter overrides CSS background | Add `-webkit-appearance: none; appearance: none` to `.wm-filter-input` in `src/routes/world-map/+page.svelte` |
| 8 | artist | major | Artist bio empty for most artists | MB URL relations only have Wikipedia link for minority of artists; Wikidata QID links (`wikidata.org`) are parsed from MB rels but silently ignored | Add Wikidata fallback in `src/routes/artist/[slug]/+page.ts`: extract wikidata QID from MB URL rels → fetch `sitelinks.enwiki.title` → Wikipedia summary API |
| 9 | artist | UX | Artist About tab empty / "no relationship data" | About tab only renders `<ArtistRelationships>`; bio lives in header only | Show `effectiveBio` inside About tab block in `src/routes/artist/[slug]/+page.svelte` ~line 919 |

## Key Decisions
- World Map 0 artists is a DATA gap (pipeline not run), NOT a code bug — except query bug #6 which is a real code fix
- Artist bio fix uses Wikidata as fallback for artists without a Wikipedia link in MusicBrainz
- The geocoding pipeline takes ~16 hours to run fully (2.6M artists, 50/batch, 1.1s sleep) — run overnight, it's resumable if interrupted
- `add-slugs.js` MUST be added to `pipeline/package.json` permanently to prevent slug regression after every DB rebuild

## Relevant Files
- `pipeline/package.json` — add `add-slugs.js` to pipeline script
- `pipeline/add-slugs.js` — run this immediately to fix artist slug lookup
- `pipeline/build-geocoding.mjs` — run overnight to populate world map data
- `src/routes/rabbit-hole/+page.svelte` — move search box to upper third
- `src/routes/rabbit-hole/tag/[slug]/+page.svelte` — add empty state for related tags (~line 79)
- `src/routes/world-map/+page.svelte` — fix `.wm-filter-input` appearance
- `src/lib/db/queries.ts` — fix `getGeocodedArtists` to use `artist_tags` subquery for tags
- `src/routes/artist/[slug]/+page.ts` — add Wikidata fallback for bio
- `src/routes/artist/[slug]/+page.svelte` — show bio inside About tab (~line 919)

## Git Status
Only BUILD-LOG.md has uncommitted changes (3 lines, auto-status block). All UAT files committed.

## Next Steps
1. Run `cd D:/Projects/BlackTape/pipeline && node add-slugs.js` — fixes artist slug lookup immediately
2. Add `add-slugs.js` to `pipeline/package.json` pipeline script permanently
3. Fix `getGeocodedArtists` in `src/lib/db/queries.ts` — replace `a.tags` with `artist_tags` subquery
4. Fix `.wm-filter-input` in `src/routes/world-map/+page.svelte` — add `appearance: none`
5. Add empty-state to tag page in `src/routes/rabbit-hole/tag/[slug]/+page.svelte`
6. Move landing search box up in `src/routes/rabbit-hole/+page.svelte`
7. Add Wikidata fallback bio in `src/routes/artist/[slug]/+page.ts`
8. Show bio in About tab in `src/routes/artist/[slug]/+page.svelte`
9. Start `node pipeline/build-geocoding.mjs` in background (run overnight)
10. After fixes: re-run UAT on phases 35 + 36 to confirm

## Resume Command
After running `/clear`, run `/resume` to continue.
