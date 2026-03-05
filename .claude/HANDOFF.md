# Work Handoff - 2026-03-05

## Current Task
Adding AI-generated page art to key pages using Gemini 3.1 Flash Image (Nano Banana 2).

## Context
We've been giving the app's discovery pages visual identities using AI-generated illustrations. The Oracle and Rabbit Hole pages are done and look great. The Library shelf strip was just completed. All three use the same generation pattern via tools/ scripts.

## Progress

### Completed
- **Oracle page** — full-width landscape banner (380px tall, 50% opacity). CRT monitor figure with organic cables as hair, B&W ink style. `src/lib/assets/oracle-banner.png`
- **Rabbit Hole page** — circular spiral galaxy top-down illustration. User made a transparent version in Photoshop. `src/lib/assets/rabbit-hole-spira_transaprent.png` (note typo in filename — that's the actual filename). 260×260, centered above search.
- **Library page** — 100px strip at top. Top-down view of record shelves, comic B&W style, some records sticking up. `src/lib/assets/library-shelf.png`
- All generation scripts in `tools/`: `generate-oracle.mjs`, `generate-rabbit-hole.mjs`, `generate-library-shelf.mjs`
- All committed

### In Progress
- Nothing actively in progress — Library shelf was just approved and committed

### Remaining
- Possible: similar art for other pages (Discover, Time Machine, etc.) — not discussed yet
- **Pipelines still running on Hetzner:**
  - Geocoding: very slow (~0.3% done), 1.4M artists, Wikidata rate-limited
  - Similar artists: should be done or near-done — check log
- **Windows v0.3.2 build** — still pending
- Oracle SVG file still exists (`oracle-figure.svg`) but is no longer used — could be cleaned up

## Key Decisions
- Using Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview`) — codename "Nano Banana 2"
- API key from retromachinenews project: `AIzaSyAzenfN2o-f0qPuPKmFbPOUF8neIbTWAC4`
- Oracle: landscape full-width banner with `object-fit: cover`, negative margins to bleed to edges
- Rabbit Hole: radial mask replaced by transparent PNG the user made himself
- Library: fixed-height strip with `min/max-height: 100px`, `flex-shrink: 0` to prevent expansion

## Relevant Files
- `src/routes/explore/+page.svelte` — Oracle page, imports `oracle-banner.png`
- `src/routes/rabbit-hole/+page.svelte` — Rabbit Hole page, imports `rabbit-hole-spira_transaprent.png`
- `src/routes/library/+page.svelte` — Library page, imports `library-shelf.png`
- `src/lib/assets/oracle-banner.png` — Oracle hero image
- `src/lib/assets/rabbit-hole-spira_transaprent.png` — Rabbit Hole spiral (transparent, user-made)
- `src/lib/assets/rabbit-hole-spiral.png` — Original non-transparent version (kept as backup)
- `src/lib/assets/library-shelf.png` — Library shelf strip
- `tools/generate-oracle.mjs` — Regenerate oracle banner
- `tools/generate-rabbit-hole.mjs` — Regenerate rabbit hole spiral
- `tools/generate-library-shelf.mjs` — Regenerate library shelf

## Git Status
Only BUILD-LOG.md has 3 uncommitted lines (auto-appended by hook). Everything else committed.

## Hetzner Pipeline Check Commands
```bash
# Quick status
ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -5 /var/log/similar-artists.log && PGPASSWORD=bt_local_dev_2026 psql -U blacktape -h localhost -d blacktape -c \"SELECT 'geocoded', COUNT(*) FROM artists WHERE city_precision IN ('city','region','country') UNION ALL SELECT 'similar_artists', COUNT(*) FROM similar_artists;\""
```

## Next Steps
1. Check Hetzner pipeline status (similar artists may be done — test Rabbit Hole feature)
2. Continue adding art to other pages if desired (Discover, Time Machine, Crate Dig?)
3. Windows v0.3.2 build when ready
4. Optional: clean up unused `oracle-figure.svg`

## Resume Command
After `/clear`, run `/resume` to continue.
