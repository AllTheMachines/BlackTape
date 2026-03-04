# Work Handoff - 2026-03-04

## Current Task
Migrating BlackTape from Cloudflare Worker + D1 (SQLite) to a self-hosted Hetzner VPS with PostgreSQL as the backend.

## Context
The app previously required users to download a ~3GB SQLite database file. The new architecture hosts the data on a Hetzner VPS (blacktape-db, IP: 46.225.239.209), so users only download the ~80MB app and queries go to the server. A MusicBrainz import is currently running on the server — 1.4M+ artists already loaded, still going.

## Progress

### Completed
- Hetzner VPS `blacktape-db` provisioned (CAX21, 4 vCPU, 8GB RAM, Nuremberg)
- PostgreSQL 16 installed and tuned for 8GB RAM
- `blacktape` DB + user created, `pg_trgm` extension enabled
- UFW firewall configured (ports 22, 3000 open)
- Node.js 22 + PM2 installed
- MusicBrainz dumps downloaded: `mbdump.tar.bz2` (6.6GB) + `mbdump-derived.tar.bz2` (461MB)
- All TSV files extracted to `/opt/mbdata/extracted/`: `artist` (395M), `area` (13M), `artist_type` (1.2K), `tag` (5.3M), `artist_tag` (30M)
- `pipeline/do-import-pg.mjs` written — creates schema with `mbid`/`slug`/`uniqueness_score` columns, imports all tables, builds trigram indexes
- `server/index.js` written — Hono API on port 3000 with:
  - `GET /health` ✓
  - `POST /query` — SQLite→PostgreSQL SQL translator (GROUP_CONCAT→STRING_AGG, FTS5→ILIKE, ended booleans, strftime, ?→$N)
  - `GET /api/artists/:id`
- API deployed to `/opt/blacktape-api/index.js`, running via PM2 (`pm2 status` shows `online`)
- `src/lib/config.ts` updated: `API_BASE_URL = 'http://46.225.239.209:3000'`
- `BUILD-LOG.md` updated with full migration entry

### In Progress
- **MusicBrainz import running on server** (PID 8034, `nohup node /opt/mbdata/do-import-pg.mjs > /opt/mbdata/import.log 2>&1`)
  - Last status: importing artists — at 1.4M/2.6M when context was saved
  - Estimated remaining: ~15 min for artists, then tags (~5 min), uniqueness_score (~10 min), indexes (~5 min)
  - Total estimate: ~30 more minutes from context save time (~21:37 UTC)

### Remaining
1. Wait for import to complete — check: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -20 /opt/mbdata/import.log"`
2. Test `/query` endpoint with a real search query against live data
3. Reload the app and verify search works end-to-end
4. Test edge cases: FTS5 translation (autocomplete), tag search, discovery page
5. Consider adding a domain + TLS (nginx + Let's Encrypt) to replace the raw IP:port URL
6. Commit all local changes (config.ts, server/index.js, pipeline/do-import-pg.mjs)

## Key Decisions
- **SQL passthrough with translation** — Rather than rewriting all 50+ query functions in `queries.ts`, added a SQLite→PostgreSQL translator in the server's `/query` endpoint. Queries use `?` placeholders and SQLite syntax; the server normalises to `$N` and PostgreSQL dialect.
- **`mbid` not `gid`** — PostgreSQL schema uses `mbid` (not MusicBrainz's native `gid` name) to match what all app queries expect.
- **Slug generated at import** — Same algorithm as `pipeline/add-slugs.js` (lowercase, diacritics stripped, non-alphanumeric → hyphen, collision appends 8 chars of MBID).
- **`uniqueness_score` computed in import** — Stored as a float column, computed as `AVG(1/artist_count) * 1000` per artist. Enables fast `ORDER BY uniqueness_score` for discovery page.
- **Trigram indexes (`gin_trgm_ops`)** — Replace FTS5 for ILIKE-based search. The SQL translator strips the FTS5 `MATCH` pattern and substitutes `ILIKE` on `name` and `sort_name`.

## Relevant Files
- `src/lib/config.ts` — `API_BASE_URL` changed to `http://46.225.239.209:3000` (uncommitted)
- `server/index.js` — New Hono API server with `/query` translator (uncommitted, also deployed to `/opt/blacktape-api/index.js`)
- `pipeline/do-import-pg.mjs` — PostgreSQL import script (uncommitted, also deployed to `/opt/mbdata/do-import-pg.mjs`)
- `src/lib/db/http-provider.ts` — Unchanged; sends `POST /query {sql, params}` to `API_BASE_URL`
- `src/lib/db/queries.ts` — Unchanged; all queries work via SqliteDialect which the server translates
- `BUILD-LOG.md` — Updated with migration entry (uncommitted, has status block)

## Server Details
- SSH: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209`
- Import log: `tail -f /opt/mbdata/import.log`
- API status: `pm2 status`
- API logs: `pm2 logs blacktape-api`
- Health check: `curl http://46.225.239.209:3000/health`
- DB password (dev): `bt_local_dev_2026`

## Git Status
Only `BUILD-LOG.md` has uncommitted changes (status block + new entry).
`src/lib/config.ts`, `server/index.js`, `pipeline/do-import-pg.mjs` are new/modified but not staged.

## Next Steps
1. Check import: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -20 /opt/mbdata/import.log"`
2. Once import shows "=== Import Complete ===", test search: `curl -s -X POST http://46.225.239.209:3000/query -H 'Content-Type: application/json' -d '{"sql":"SELECT id, mbid, name, slug FROM artists WHERE name ILIKE $1 LIMIT 5","params":["radiohead"]}' | jq .`
3. Launch the app locally (`node tools/launch-cdp.mjs`) and search for an artist
4. If search works, commit everything: `git add src/lib/config.ts server/index.js pipeline/do-import-pg.mjs BUILD-LOG.md`
5. Next: Add nginx + TLS to serve the API at `https://api.blacktape.org` (currently pointing at Cloudflare — needs DNS update)

## Resume Command
After running `/clear`, run `/resume` to continue.
