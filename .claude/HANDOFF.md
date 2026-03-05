# Work Handoff - 2026-03-05

## Current Task
Discogs genre data import — improving Rabbit Hole / similar-artist coverage from 1.4% to higher

## Context
The similar-artists feature only covers 38K of 2.8M artists (1.4%) because MusicBrainz community tagging is sparse. We imported genre/style tags from the Discogs masters dump (1.4M masters, 1.7M new artist-tag pairs) to improve coverage. The final rebuild step is running now on Hetzner.

## Progress

### Completed
- Created `pipeline/build-discogs-tags-pg.mjs` — stream-parses gzipped Discogs XML, matches artists by normalized name, inserts tags via `ON CONFLICT DO NOTHING`
- Fixed two bugs: (1) wrong Discogs URL format — correct is `?download=data%2F2026%2F...` + `Mozilla/5.0` user-agent, (2) XML is one-line-per-master not multi-line — required regex not state-machine parser
- Deployed to Hetzner, ran successfully: 1,398,021 masters processed, 1,787,113 pairs inserted
- Created `pipeline/build-finalize-pg.mjs` — runs uniqueness_score + similar_artists rebuild
- Fixed API security hole: `server/index.js` now uses read-only Postgres user (`blacktape_ro`) + SELECT-only guard on `/query` endpoint. Deployed via PM2.
- Fixed `build-similar-artists-pg.mjs` Map overflow: switched `pairShared` from `new Map()` to `Object.create(null)` — V8 Maps have a hard 16.7M entry limit, plain objects don't. TAG_THRESHOLD back to 500.
- GitHub issues cleaned up: closed #79, #85, #87, #35, #88, #84, #69, #77

### In Progress
- **`build-finalize.mjs` running on Hetzner right now** — computing pair shared tag counts (100% CPU, 1GB RAM, 290K artist-tag pairs, 143K qualifying artists). Should finish within minutes.

### Remaining
- Check final similar_artists count (should be higher than old 38,150)
- Verify Rabbit Hole works better in the app
- Commit all local changes to git

## Key Decisions
- Discogs XML: one master per line → regex extraction per line, not a state machine
- `ON CONFLICT DO NOTHING` on artist_tags — MusicBrainz tags never overwritten
- API: `blacktape_ro` Postgres user, password in PM2 env var only (not in repo)
- Map overflow fix: `Object.create(null)` instead of `new Map()` — no hard entry limit
- TAG_THRESHOLD stays at 500

## Relevant Files
- `pipeline/build-discogs-tags-pg.mjs` — Discogs importer (new)
- `pipeline/build-finalize-pg.mjs` — uniqueness_score + similar_artists rebuild (new)
- `pipeline/build-similar-artists-pg.mjs` — modified: Map→Object, TAG_THRESHOLD=500
- `server/index.js` — modified: blacktape_ro user, SELECT guard on /query
- `BUILD-LOG.md` — modified: 3 new entries (uncommitted)

## Server State (Hetzner 46.225.239.209)
Check finalize progress:
```bash
ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "cat /opt/mbdata/finalize.log | tr '\r' '\n' | tail -15"
```
Geocoding still running (PID 30137) — unrelated, ~8hr job, no action needed.

## Git Status
- `BUILD-LOG.md` modified, not staged
- All pipeline/server file changes deployed to Hetzner but NOT yet committed

## Next Steps
1. Check finalize completed (command above)
2. Commit: `git add pipeline/build-discogs-tags-pg.mjs pipeline/build-finalize-pg.mjs pipeline/build-similar-artists-pg.mjs server/index.js BUILD-LOG.md && git commit -m "feat: Discogs genre import + API security hardening"`
3. Check new similar_artists count vs old 38,150
4. Test Rabbit Hole in app with a previously-unmatched artist

## Resume Command
After running `/clear`, run `/resume` to continue.
