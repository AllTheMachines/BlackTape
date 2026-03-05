# Work Handoff - 2026-03-05

## Current Task
Waiting for background pipelines to finish on Hetzner, then test Rabbit Hole and World Map with real data.

## What Was Done This Session
- **Genre data** — imported to Postgres (4086 genres, 2775 relationships). KB page works.
- **Cover pool bug fixed** — `afterNavigate` clears the pool so covers don't bleed across pages.
- **Explore → Oracle** — renamed in sidebar, page title, heading. SVG figure added above content (`src/lib/assets/oracle-figure.svg`). SVG has red bg, blue figure, cyan glowing CRT screen.
- **Explore moved to Discover group** in sidebar (was wrongly under Library).
- **World Map** made non-clickable with "Coming soon" tooltip.
- **Similar artists pipeline fixed** — crashed with disk full because generic tags ("jazz" 17K artists, "rock" 16K) created ~160M pairs each. Fix: JOIN tag_stats and exclude tags with artist_count > 2000. Restarted on server.
- All commits pushed to origin/main.

## Pipeline Status (as of session end)
- **Geocoding**: Running (`node build-geocoding-pg.mjs`, PID ~30137). ~8000/1,394,241 processed, ~3100 geocoded. Log at `/var/log/geocoding.log`. Still running — ~17+ hours remaining (Wikidata SPARQL is slow, ~52s/batch).
- **Similar artists**: Restarted with fix (`node build-similar-artists-pg.mjs`). New PID ~32401. Log at `/var/log/similar-artists.log`. Should complete within 15-30 min now that generic tags are filtered. Check log for completion.

## Check Commands
```bash
# Quick status check
ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "ps aux | grep -E 'geocoding|similar' | grep -v grep && PGPASSWORD=bt_local_dev_2026 psql -U blacktape -h localhost -d blacktape -c \"SELECT 'geocoded' as m, COUNT(*) FROM artists WHERE city_precision IN ('city','region','country') UNION ALL SELECT 'similar_artists', COUNT(*) FROM similar_artists;\""

# Similar artists log
ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -20 /var/log/similar-artists.log"
```

## Remaining Work
1. **Wait for similar artists to finish** — then Rabbit Hole feature has real data to test
2. **Test Rabbit Hole** — once similar_artists table has rows, navigate to /rabbit-hole and test
3. **Geocoding** is slow (Wikidata rate limiting). May need to accept partial data for World Map or find a faster geocoding source. Currently ~0.6% done.
4. **Oracle SVG** — user wasn't fully happy with the SVG (said "no colors"). It was redone with red bg, blue figure, cyan screen. Get feedback on current version.
5. **Windows v0.3.2 build** — still pending. Windows users on v0.3.0, skipped v0.3.1.

## Hetzner Server
- IP: `46.225.239.209`
- SSH: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209`
- Pipeline dir: `/opt/mbdata/`
- API dir: `/opt/blacktape-api/` (pm2: blacktape-api, port 3000)
- Postgres: user `blacktape`, pass `bt_local_dev_2026`, db `blacktape`

## Git Status
- Branch: main, up to date with origin/main
- Unstaged: none

## Resume Command
After `/clear`, run `/resume` to continue.
