# Work Handoff - 2026-03-05

## Current Task
Rabbit Hole similar-artists quality — buttons not working investigation

## Context
The Discogs genre import + similar-artists rebuild is complete. The Rabbit Hole feature was broken ("Artist not found") due to `artist_links` table missing in Postgres. That's fixed. After fixing and reloading, the Exit/Continue buttons stopped responding. Likely a stale HMR state — a reload was just issued.

## Progress

### Completed
- Discogs genre import: 1.4M masters, 1.79M artist-tag pairs inserted
- `build-similar-artists-pg.mjs` algorithm fix: nested int-key objects instead of string keys — 20M pairs in 30s vs 1h37min
- Blocklist of junk tags added: meta/format tags (music video, interview, promotional), geographic (british, britpop, britrock, post-britpop), garbage filters (HTML entities, non-ASCII, -artiest suffix)
- Rabbit Hole `+page.ts` fix: removed `artist_links` query (table doesn't exist in Postgres)
- Final similar_artists result: **35,013 artists, 251,246 rows**
- All committed, tests passing

### In Progress
- Rabbit Hole buttons (Exit / Continue) reported as not working
- Just issued a reload — user needs to test

### Remaining
- Confirm buttons work after reload
- Update BUILD-LOG.md with final session summary and commit
- (Optional) Investigate why Radiohead's similar artists still include some questionable matches (Gotye, SOOKArag matching on art pop/chamber pop/indietronica)

## Key Decisions
- Tag blocklist: blocked release-type tags (music video, interview), cultural-geographic (britpop, britrock, post-britpop), garbage filters
- Did NOT block "art pop", "chamber pop", "indietronica" — these are legitimate genre tags even if some matches feel off
- `links: []` passed to RabbitHoleArtistCard — Play button won't work (no streaming links from DB), but Continue/Exit should work fine
- Similar artists: 35K artists (slightly fewer than old 38K MusicBrainz baseline, but better quality matches)

## Relevant Files
- `pipeline/build-similar-artists-pg.mjs` — BLOCKLIST + nested int-key algorithm (deployed to Hetzner)
- `src/routes/rabbit-hole/artist/[slug]/+page.ts` — removed artist_links query, returns links: []
- `BUILD-LOG.md` — modified, needs final commit

## Server State (Hetzner 46.225.239.209)
- API running: `pm2 list` → blacktape-api online
- similar_artists table: 251,246 rows, 35,013 artists
- Geocoding still running (days to complete, no action needed)
- `build-similar-artists-pg.mjs` at `/opt/mbdata/` — already redeployed with blocklist

## Git Status
- `BUILD-LOG.md` modified (not staged) — needs final entry + commit

## Radiohead Similar Artists (after blocklist)
Based on: ambient pop, electronic rock, indietronica, art pop, chamber pop
- The Sympathy Of All Things, Gotye, SOOKArag, alt-J, Ideini, Kate Bush, Perfume Genius, The 1975, Sufjan Stevens

## Next Steps
1. Check if buttons work after reload (user tests)
2. If still broken, check browser console for JS errors — likely a Svelte/HMR issue, full app restart may be needed (`node tools/launch-cdp.mjs`)
3. Update BUILD-LOG.md with session summary
4. Commit BUILD-LOG.md

## Resume Command
After running `/clear`, run `/resume` to continue.
