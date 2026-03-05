# Work Handoff - 2026-03-05

## Current Task
Running the full data pipeline on Hetzner Postgres — geocoding, similar artists, and genre data still needed.

## Context
The app migrated from distributed SQLite (mercury.db) to a Hetzner Postgres backend. Phase 34-37 built Rabbit Hole, World Map, and Context Sidebar — all of which need precomputed data (geocoordinates, similar artists, genre graph) to be useful. The similar artists and geocoding pipelines are NOW RUNNING on the server. Genre data (KB graph) is not yet in Postgres at all.

## Progress
### Completed
- Similar artists pipeline (`build-similar-artists-pg.mjs`) uploaded and launched on server — computing Jaccard pairs (5-15 min job), was still in progress at handoff
- Geocoding pipeline (`build-geocoding-pg.mjs`) created and launched on server — 2000/1,394,241 processed at handoff, ~8-9 hours total, confirmed working
- Both pipelines are nohup'd on Hetzner server (`/opt/mbdata/`) — survive SSH disconnect
- Committed `pipeline/build-geocoding-pg.mjs` and BUILD-LOG entry
- 8 commits ahead of origin/main (not yet pushed)

### In Progress
- **Geocoding**: Running on server at `/opt/mbdata/build-geocoding-pg.mjs`, log at `/var/log/geocoding.log`
  - Last known: 2000/1,394,241 processed, 788 artists geocoded
- **Similar artists**: Running on server at `/opt/mbdata/build-similar-artists-pg.mjs`, log at `/var/log/similar-artists.log`
  - Last known: Still in Jaccard pair computation step (long SQL query)

### Remaining
- **Wait for pipelines to finish** — check logs before proceeding
- **Genre data missing from Postgres** — the `genres` and `genre_relationships` tables don't exist in Postgres at all. Local SQLite has them (built by `pipeline/build-genre-data.mjs`). The KB page will be broken without this.
  - Need to: create `pipeline/build-genre-data-pg.mjs` OR import genre data from local SQLite to Postgres
  - Check local genre table: `pipeline/data/mercury.db` has `genres` and `genre_relationships` tables
- **Genre API endpoints** — after genre data is in Postgres, backend `index.js` may need genre-specific endpoints (currently it's a SQL pass-through + `/api/artists/:id`)
- **Push commits** — 8 commits ahead of origin/main, need `git push origin main`
- **Windows v0.3.2 build** — Windows users still on v0.3.0, no update available for them
- **BUILD-LOG.md** has 3 lines of unstaged auto-save changes

## Key Decisions
- Geocoding runs on Hetzner server (not locally) — connects to localhost Postgres, avoids internet round-trip overhead for DB writes
- `build-geocoding-pg.mjs` uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (Postgres syntax, idempotent)
- `postgres` npm package is already installed at `/opt/mbdata/node_modules` — no install needed for future scripts
- Genre data: local SQLite (`pipeline/data/mercury.db`) has 10K-artist sample with genres/genre_relationships. For Postgres we need the full genre dataset — `build-genre-data.mjs` builds it from Wikidata/Wikipedia. Likely needs a Postgres port too.
- Similar artists script (`build-similar-artists-pg.mjs`) was already written and just needed to be run

## Relevant Files
- `pipeline/build-geocoding-pg.mjs` — NEW: Postgres geocoding script (just created this session)
- `pipeline/build-similar-artists-pg.mjs` — existing, now running on server
- `pipeline/build-genre-data.mjs` — SQLite genre pipeline, needs porting to Postgres
- `/opt/mbdata/` on Hetzner — where scripts run
- `/var/log/geocoding.log` on Hetzner — geocoding progress
- `/var/log/similar-artists.log` on Hetzner — similar artists progress
- `/opt/blacktape-api/index.js` on Hetzner — backend API (Hono, SQL pass-through + `/api/artists/:id`)
- `src/lib/db/queries.ts` — frontend query functions (getSimilarArtists, getGeocodedArtists — already written but data empty until pipelines finish)

## Hetzner Server
- IP: `46.225.239.209`
- SSH: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209`
- Pipeline dir: `/opt/mbdata/` (has node_modules with `postgres` package)
- API dir: `/opt/blacktape-api/`
- Postgres DB: `blacktape` user, password `bt_local_dev_2026`, database `blacktape`

## Postgres Tables (current state)
```
areas, artist_tags, artists (2.8M), similar_artists (running), tag_cooccurrence, tag_stats
+ city_lat/city_lng/city_precision columns on artists (being populated by geocoding)
MISSING: genres, genre_relationships
```

## Git Status
- Branch: main, 8 commits ahead of origin/main (not pushed)
- Unstaged: `BUILD-LOG.md` (3 lines auto-save)
- All substantive work committed

## Next Steps
1. Check pipeline progress: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -5 /var/log/geocoding.log && tail -5 /var/log/similar-artists.log"`
2. Push commits: `git push origin main`
3. Check local SQLite genre tables to understand schema: `node -e "const db=require('better-sqlite3')('pipeline/data/mercury.db'); console.log(db.prepare('SELECT COUNT(*) as n FROM genres').get()); console.log(db.prepare('PRAGMA table_info(genres)').all().map(c=>c.name).join(', '));"`
4. Decide on genre data approach: port `build-genre-data.mjs` to Postgres, OR export genre data from SQLite and import to Postgres
5. Create and run genre pipeline on server
6. Verify KB page works after genre data is in Postgres
7. Build Windows v0.3.2 (see `docs/release-process.md`)

## Resume Command
After running `/clear`, run `/resume` to continue.
