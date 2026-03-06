# Work Handoff - 2026-03-06

## Current Task
v0.4.0 release — version bumped and pushed, Windows build needed + signing + GitHub release

## Context
BlackTape is being released as v0.4.0 (up from v0.3.2 test builds). This is a major release covering the Rabbit Hole discovery mode, AI companion/summaries/corrections, live Postgres backend (MusicBrainz on Hetzner), similar artists engine, and library improvements. The version was bumped in all three files and pushed to main. Only macOS CI exists (build-macos.yml) — Windows is built locally.

## Progress

### Completed This Session
- **Library artist links** — fixed `autocompleteArtists` (wrong name) → `searchArtistsAutocomplete`, fixed race condition (Map reassignment clobbering), fixed Svelte `$effect` reactivity loop with `untrack()`, finally made `↗` always visible (search fallback) instead of conditional
- **Rabbit Hole Continue dead-end** — `handleContinue` now always navigates: similar artists → primary tag fallback → `getRandomArtist()` absolute fallback. No more silent no-ops.
- **Rabbit Hole null-artist dead end** — artist-not-found page now shows "← Go back" + "Exit to Discover" buttons
- **Version bumped to v0.4.0** — `tauri.conf.json`, `Cargo.toml`, `Cargo.lock` all updated
- **Pushed to main** — `git push origin main` done, all 196 tests passed

### In Progress
- macOS CI build triggered by push (build-macos.yml) — check status at https://github.com/AllTheMachines/BlackTape/actions

### Remaining
1. **Windows build** — run locally: `npm run tauri build` in D:/Projects/BlackTape
2. **Sign Windows installer** with rsign2 (see memory/release-signing.md for exact workflow)
3. **macOS build** — download artifact from GitHub Actions when complete
4. **Sign macOS** — `SIG=$(cat BlackTape.app.tar.gz.sig | tr -d '\n')` (already base64, don't double-encode)
5. **Create GitHub release** `v0.4.0` with both installers + update `latest.json` on Hetzner
6. **Update BUILD-LOG.md** with v0.4.0 release entry

## Key Decisions
- v0.4.0 (not 0.3.3) because: Rabbit Hole is a whole new discovery experience, AI integration, live Postgres backend replacing distributed SQLite — qualifies as minor version bump
- Only macOS has CI; Windows build is always done locally
- `↗` links in library Artists tab always show (search fallback) — no slug lookup needed for basic linking

## Relevant Files
- `src-tauri/tauri.conf.json` — version bumped to 0.4.0
- `src-tauri/Cargo.toml` — version bumped to 0.4.0
- `src-tauri/Cargo.lock` — version bumped to 0.4.0
- `src/lib/components/RabbitHoleArtistCard.svelte` — handleContinue fix + getRandomArtist fallback
- `src/routes/rabbit-hole/artist/[slug]/+page.svelte` — null-artist dead-end escape buttons
- `src/lib/components/LibraryBrowser.svelte` — artist ↗ links always visible
- `memory/release-signing.md` — full signing workflow (rsign2, Windows vs macOS differences)

## Git Status
Only BUILD-LOG.md has minor uncommitted changes (6 lines, auto-save).
All code changes committed and pushed.

## Release Signing Quick Reference (from memory)
**Windows (rsign2):**
```bash
rsign sign -s <(base64 -d ~/.tauri/blacktape.key) -W -x INSTALLER.exe.sig INSTALLER.exe
SIG=$(base64 -w0 INSTALLER.exe.sig)  # base64-encode raw minisign text
```
**macOS (from CI artifact):**
```bash
SIG=$(cat BlackTape.app.tar.gz.sig | tr -d '\n')  # already base64, just strip newlines
```

## Next Steps
1. Check macOS CI build: `gh run list --limit 5`
2. Build Windows: `npm run tauri build` (takes ~10 min)
3. Sign both installers per release-signing.md
4. Create GitHub release v0.4.0 with both binaries
5. Update latest.json on Hetzner with new version + sigs
6. Test updater from v0.3.0

## Resume Command
After running `/clear`, run `/resume` to continue.
