# Work Handoff - 2026-02-28

## Current Task
Bug-bashing open v1.4 Spotify issues — working through the dependency chain.

## Completed This Session
- **#62** — oauth:allow-start + oauth:allow-cancel added to capabilities, binary rebuilt. CLOSED.
- **#63** — App freezes when clicking album cover. Filed (new issue, not yet fixed).
- **Spotify full-track regression** — Restored `handlePlayOnSpotify` on artist page. When Spotify connected, "▶ Spotify" pill uses Connect API (plays in Spotify Desktop). When not connected, falls back to embed.
- **#44** — Removed duplicate Spotify Client ID field from Import section. Import now reuses existing OAuth token via `fetchTopArtistsWithToken()`. CLOSED.

## Spotify Issue Dependency Chain (DO THIS ORDER)
1. ✅ **#44** — duplicate Client ID / no clear — CLOSED
2. **Test #62** — Steve needs to go through OAuth in Settings > Spotify > Authorize. This is the next manual test step. Needs Spotify Desktop running.
3. **#61** — Streaming preference settings don't apply (Preferred Platform dropdown + drag order disconnected from actual embed ordering)
4. **#49** — Release page: no streaming links, no play buttons on tracks

## App State
- App NOT running (was not relaunched after #44 changes — needs reload)
- To launch: `node tools/launch-cdp.mjs`
- To reload after changes: `node tools/reload.mjs`
- All code changes committed, 191/191 tests passing

## Next Steps
1. `node tools/launch-cdp.mjs` — relaunch app
2. Steve tests Spotify OAuth: Settings > Spotify > Authorize
3. If OAuth works → verify "▶ Spotify" button appears on artist page
4. Then fix #61 (streaming preference wiring)
5. Then fix #49 (release page streaming links)

## Key Files Changed This Session
- `src-tauri/capabilities/default.json` — oauth:allow-start + oauth:allow-cancel
- `src/routes/artist/[slug]/+page.svelte` — handlePlayOnSpotify restored
- `src/lib/taste/import/spotify.ts` — fetchTopArtistsWithToken() added
- `src/routes/settings/+page.svelte` — import card reuses OAuth token
- `src/lib/spotify/state.svelte` — imported into settings page

## Resume Command
Run `/resume` after `/clear`
