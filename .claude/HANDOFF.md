# Work Handoff - 2026-03-05

## Current Task
Rabbit Hole UX improvements — fix all identified issues one by one

## Context
The Rabbit Hole feature (click-through music discovery) was debugged and the core bug fixed: `rel.tracks?.length` crash that killed all button interactivity. Now the feature works but has ~12 identified improvement areas ranging from broken functionality to UX polish. Steve wants them fixed one at a time.

## Progress

### Completed
- **Bug fix:** `onMount` → `$effect` in `RabbitHoleArtistCard.svelte` so releases reload when navigating between artists
- **Bug fix:** `rel.tracks?.length` optional chaining — crash that froze all buttons after first navigation
- **Bug fix:** Normalize null tracks to `[]` on invoke result
- **Research:** Full audit of all gaps — data available but unused, broken features, UX issues

### In Progress
- Nothing currently in progress — bug fix is done, improvements not started

### Remaining (in priority order)
1. **Fix Play button** — `+page.ts` returns `links: []` always; need to fetch streaming links from MusicBrainz/DB the same way the full artist page does
2. **Sort tags by vote count** — `artist_tags.count` exists; use `getArtistTagDistribution()` instead of the raw tags concat in `getArtistBySlug`; sort so most-voted (most defining) tags show first
3. **Country + decade hint on similar artist chips** — each similar artist has `slug` to look up country + `begin_year`; show as tiny metadata so you can decide whether to click "Seance"
4. **Artist type + disbanded badge** — `Artist.type` and `Artist.ended` are in DB but not shown; add small badges on the card header
5. **Artist thumbnail from Wikipedia** — `getWikiThumbnail()` exists in the codebase; wire it up in `RabbitHoleArtistCard`
6. **Show similarity scores visually** — `SimilarArtistResult.score` (Jaccard 0–1) is fetched but hidden; show as visual weight on chips (opacity/border)
7. **Tag page: genre description** — `genres` table has `wikipedia_title`; fetch a one-paragraph Wikipedia summary for the tag page header
8. **Tag page: show primary tag on artist chips** — `tags` already fetched for tag-page artists; show first tag as a small label on each chip
9. **Uniqueness score on artist card** — `getArtistUniquenessScore()` exists; wire it up, show score badge like full artist page does
10. **"Continue" fallback signal** — 98.6% of artists have no precomputed similarity and silently use random fallback; signal this to user with different button text or subtle indicator
11. **Cross-links to other discovery tools** — From tag pages, add "See on Style Map", "Crate Dig this tag" links; routing already exists
12. **Keyboard navigation** — Arrow keys in search dropdown, logical Tab order through artist card

## Key Decisions
- Fixes should be done one at a time, committed after each
- `onMount` was replaced with `$effect` — do NOT revert this, it's the correct pattern for artist-change reactivity
- `links: []` in `+page.ts` was intentional at the time (artist_links table didn't exist in Postgres), but now we should fetch from MusicBrainz API like the full artist page does
- Tag blocklist (british, britpop, music video, interview, etc.) is in the pipeline script — do NOT add these to the front-end filter, they should already be excluded from the DB

## Relevant Files
- `src/lib/components/RabbitHoleArtistCard.svelte` — main card component, just fixed
- `src/routes/rabbit-hole/artist/[slug]/+page.ts` — loads artist data; `links: []` hardcoded here
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` — thin wrapper, passes props to card
- `src/routes/rabbit-hole/tag/[slug]/+page.svelte` — tag page UI
- `src/routes/rabbit-hole/tag/[slug]/+page.ts` — tag page loader
- `src/routes/rabbit-hole/+layout.svelte` — trail breadcrumb shell
- `src/lib/rabbit-hole/trail.svelte.ts` — trail state store
- `src/lib/db/queries.ts` — all DB queries; `getSimilarArtists`, `getArtistBySlug`, `getArtistTagDistribution`, `getArtistUniquenessScore`, `getWikiThumbnail` all relevant
- `src/routes/artist/[slug]/+page.ts` — REFERENCE: how the full artist page fetches streaming links (copy this pattern for Play button fix)
- `src/routes/artist/[slug]/+page.svelte` — REFERENCE: how uniqueness score and wiki thumbnail are shown
- `BUILD-LOG.md` — modified (needs session summary entry before final commit)

## Git Status
- `BUILD-LOG.md` modified (3 lines added, not staged) — needs session summary + commit at end

## API / Data Notes
- API at `http://46.225.239.209:3000` (Hetzner VPS, Postgres)
- `similar_artists` table: 286,386 rows, 39,268 artists covered (~1.4% of total)
- `getSimilarArtists(db, artistId, 10)` returns `{ id, mbid, name, slug, score }` — score is Jaccard 0–1
- `getArtistTagDistribution(db, artistId)` returns `{ tag, artist_count, count }` sorted by `count DESC` — use this instead of raw tags for sorted display
- `getWikiThumbnail(artistName)` — fetches Wikipedia thumbnail; already used on full artist page
- Streaming links: full artist page uses `getArtistLinks(db, artistId)` from queries.ts

## Next Steps
1. Read `src/routes/artist/[slug]/+page.ts` to understand how streaming links are fetched
2. Wire up `getArtistLinks(db, artist.id)` in `src/routes/rabbit-hole/artist/[slug]/+page.ts` — replace `links: []` with real data
3. Test Play button works, commit
4. Move to fix #2 (tag sorting)

## Resume Command
After running `/clear`, run `/resume` to continue.
