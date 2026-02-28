# Work Handoff - 2026-02-28

## Current Task
Working through open GitHub issues (bugs first, then enhancements).

## Completed This Session
- **#59** — About page feedback form → Cloudflare Worker (c70ffbd)
- **#58** — Hid "View backers" link on About page
- **Spotify scope fix** — Added `user-top-read` to OAuth scopes
- **#63** — Partial: added 10s AbortController timeout to MusicBrainz fetch on release page (f96b75d)
- **#53** — KB genre types now computed from lat/lng (genres grey, geocoded scenes orange). origin_city shows without inception_year. Genre Map section renders inline GenreGraph subgraph. (f96b75d)
- **#57** — Cannot reproduce (download works fine). Closed.

## Next Issues To Tackle
**Bugs:**
- #63 App freezes on album cover click (STILL REPRODUCIBLE — Steve confirmed on Radiohead, specifically multi-release cards like "5 Album Set". Timeout fix not enough. Next: check if it's the coverartarchive.org redirect hanging WebView2, or MB returning huge payload for box-set release groups)
- #54 Library/Crate Dig missing covers + no release type grouping
- #50 Discover page too slow (investigated: fast-path JOIN query on 2.6M artists is the bottleneck)
- #23 Scene page — local library not reflected

**Enhancements (high priority):**
- #56 Release page: Play Album button
- #55 Library: no search/filter + hangs on load
- #52 Style Map non-interactive
- #51 Discover: custom tag input buried
- #49 Release page: missing streaming links + per-track play

## #50 Discover Performance — Investigation Notes
- `getDiscoveryArtists` fast path joins artists (2.6M) × artist_tags × tag_stats, GROUP BY a.id, ORDER BY computed expression
- Indexes exist on `artist_tags(artist_id)` and `artist_tags(tag)` but ORDER BY is a non-indexable computed expression
- Best fix: pre-compute `uniqueness_score` in `build-tag-stats.mjs` pipeline, store in `artists.uniqueness_score` column, then query becomes `SELECT ... ORDER BY uniqueness_score DESC LIMIT 50`
- This requires schema migration + pipeline re-run + runtime migration via `ALTER TABLE artists ADD COLUMN uniqueness_score REAL DEFAULT 0`

## Key Files
- `src/routes/about/+page.svelte` — feedback form (fixed)
- `src/lib/spotify/auth.ts` — `SCOPES` includes `user-top-read`
- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — MB fetch with 10s timeout
- `src/lib/db/queries.ts` — genre queries with dynamic type from lat/lng
- `src/routes/kb/genre/[slug]/+page.svelte` — inline GenreGraph on genre page

## Resume Command
After running `/clear`, run `/resume` to continue.
