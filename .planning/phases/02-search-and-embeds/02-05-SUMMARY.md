# Plan 02-05 Summary: End-to-End Visual Verification

## Result: APPROVED

**Date:** 2026-02-15
**Duration:** Across two sessions (verification + fixes + sign-off)
**Approved by:** Steve (manual review)

## What Was Verified

Full discovery loop tested and approved:
1. **Landing page** — Dark theme, centered search, mode toggle
2. **Artist search** ("Radiohead") — Results grid with tags, country, match reason
3. **Tag search** ("dark ambient") — Correct results by genre
4. **Artist page** — Two-column layout, tags as clickable chips, embedded players
5. **Mobile** — Single column, cards stack, search usable
6. **Playback** — YouTube embed plays, SoundCloud embed plays, Spotify embed loads with fallback link

## Issues Found and Fixed During Verification

### Search ranking (fixed)
- **Bug:** "Radiohead" search didn't show the actual Radiohead — only tribute acts and tag matches
- **Cause:** FTS5 JOIN used `a.name = f.name` instead of `a.id = f.rowid`; no priority for exact name matches
- **Fix:** Corrected JOIN, added CASE priority ordering (exact > prefix > tag match), fixed tag display from correlated subquery

### Loading indicator (added)
- **Bug:** No visual feedback when search submitted
- **Fix:** Added animated loading bar to layout using SvelteKit `navigating` store

### Spotify embed fallback (added)
- **Issue:** Spotify embed doesn't play for logged-in users (Spotify's cross-origin restriction)
- **Fix:** Added "Open in Spotify" direct link alongside embed button

## Known Limitations (not blocking)

1. **Bandcamp** — Link only, no embed. Bandcamp has no oEmbed API.
2. **YouTube** — MusicBrainz stores channel URLs, not video URLs. Channels shown as links.
3. **Dead links** — MusicBrainz data can be stale.
4. **Search ranking** — FTS5 searches both name and tags. "radiohead" still returns tag-matched artists, just below the real band now.

## Files Changed
- `src/lib/db/queries.ts` — Fixed JOIN, ranking, tag display
- `src/routes/+layout.svelte` — Loading bar
- `src/lib/components/EmbedPlayer.svelte` — Spotify fallback link
