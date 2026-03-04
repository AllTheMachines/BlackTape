# Work Handoff - 2026-03-04

## Current Task
macOS build pipeline set up — GitHub Actions workflow pushed, awaiting first build run.

## Context
Migrated backend to Hetzner Postgres (complete). Fixed two bugs from GitHub issues (#91 DLLs, #90 export dialog). Set up macOS build via GitHub Actions so NTS Radio (Will Dickson, will@ntslive.co.uk) can test — he's waiting on a Mac build for press coverage.

## Progress

### Completed
- Hetzner Postgres backend fully live (2.8M artists, all queries working)
- Fixed `ORDER BY at1.count` → `MAX(at1.count)` PostgreSQL compatibility in queries.ts
- Bug #91 fixed: llama-server DLLs now bundled in NSIS installer (`tauri.windows.conf.json`)
- Bug #90 fixed: export dialog max-height added, scrollable
- macOS build pipeline committed and pushed:
  - `.github/workflows/build-macos.yml` — builds DMG on macos-latest, downloads llama-server in CI
  - `src-tauri/tauri.macos.conf.json` — DMG target, macOS 11+ minimum
  - `src-tauri/tauri.windows.conf.json` — NSIS target + DLL resources (moved from base config)

### In Progress
- **Similar artists pipeline running on server** (PID 8688, node process still alive)
  - Stuck at Jaccard similarity computation step — this is the slow step (5-15 min)
  - Log: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -20 /opt/blacktape-api/similar-artists.log"`
  - When done: Rabbit Hole will show similar artist suggestions

### Remaining
1. Trigger the macOS GitHub Actions build (go to Actions tab → "Build macOS" → Run workflow)
2. Download the DMG artifact and test / send to NTS Radio with right-click > Open instructions
3. Add Apple signing secrets to GitHub (optional — for signed build without Gatekeeper prompt)
4. BUILD-LOG.md needs updating with today's session summary (uncommitted)

## Key Decisions
- **Unsigned macOS build for now** — no Apple cert secrets configured yet, workflow handles both signed/unsigned gracefully
- **llama-server downloaded in CI** — not stored in git repo (too large)
- **Platform-specific Tauri configs** — `tauri.windows.conf.json` and `tauri.macos.conf.json` override the base, clean separation

## Relevant Files
- `.github/workflows/build-macos.yml` — macOS CI workflow
- `src-tauri/tauri.macos.conf.json` — macOS bundle config
- `src-tauri/tauri.windows.conf.json` — Windows bundle config (NSIS + DLLs)
- `src-tauri/tauri.conf.json` — base config (no platform-specific targets now)
- `pipeline/build-similar-artists-pg.mjs` — similar artists pipeline (running on server)
- `server/index.js` — Hetzner API with SQLite→PostgreSQL translator
- `src/lib/db/queries.ts` — two GROUP BY fixes applied

## Server Details
- SSH: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209`
- Similar artists log: `tail -f /opt/blacktape-api/similar-artists.log`
- API health: `curl http://46.225.239.209:3000/health`
- PM2 status: `pm2 status` (run on server)

## Git Status
Only `BUILD-LOG.md` has uncommitted changes (needs session summary added).

## Next Steps
1. Check similar artists pipeline: `ssh -i ~/.ssh/controlcenter_vps root@46.225.239.209 "tail -5 /opt/blacktape-api/similar-artists.log"` — look for `=== Done ===`
2. Trigger macOS build: go to https://github.com/AllTheMachines/BlackTape/actions → "Build macOS" → Run workflow
3. Update BUILD-LOG.md with session summary and commit
4. When macOS DMG is ready, email Will Dickson at will@ntslive.co.uk with download link + right-click instructions
5. Optional next: add Apple signing secrets (APPLE_CERTIFICATE, APPLE_CERTIFICATE_PASSWORD, APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID, KEYCHAIN_PASSWORD) to GitHub repo secrets for a properly signed build

## Resume Command
After running `/clear`, run `/resume` to continue.
