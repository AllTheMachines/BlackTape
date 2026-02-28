# Work Handoff - 2026-02-28

## Current Task
Bug-bashing open v1.4 issues — working through the issue list one by one.

## Key Discovery This Session: HMR Not Working
**CRITICAL:** Vite HMR does NOT push updates to the running Tauri app when launched via `launch-cdp.mjs`. After every code change, run `node tools/reload.mjs` to force a hard reload. Without this, Steve sees stale UI. This is now in MEMORY.md.

## Completed This Session
- **#48** — Removed Top Tracks section from artist page (placeholder stub, dead code)
- **#60 Bug 1** — Spotify section header doubled: removed redundant inner "Spotify" label from SpotifySettings.svelte setup/waiting steps
- **#60 Bug 2** — Layout tab description text bleeding: added `overflow: hidden` to `.template-card`, only show desc on active card
- **tools/reload.mjs** — New tool: hard-reloads running app via CDP (`node tools/reload.mjs`)
- **tools/snap.mjs** — Rewrote to use raw CDP WebSocket instead of Playwright (avoids SharedWorker assertion)
- **tools/launch-cdp.mjs** — Removed `--disable-shared-workers` flag (was breaking Svelte event delegation — tabs still broken though, different root cause)

## Open Issues (Priority Order)
From `gh issue list`:
- #62 — Import from Spotify fails: oauth.start not allowed (missing capability) — bug
- #61 — Streaming preference settings don't apply — bug
- #59 — About page: fix feedback email + in-app bug report
- #58 — About page: hide 'View backers' when no backers exist
- #57 — AI model download stuck on 'Pending'
- #56 — Release page: add Play Album button
- #55 — Library: no search/filter, hangs on load
- #54 — Library/Crate Dig missing covers, no release type grouping
- #53 — Knowledge Base: no cities, truncated names, genre map broken
- #52 — Style Map non-interactive
- #51 — Discover filter: custom tag buried
- #50 — Discover page slow
- #49 — Release page missing streaming links + play button on tracks
- #44 — Settings: two Spotify Client ID fields, no way to clear credentials
- #43 — No loading indicator

## Still Open: Tab Switching Bug
Artist page tabs (Overview/Stats/About) still broken — clicking does nothing. Root cause unknown. Removing `--disable-shared-workers` didn't fix it. Likely a Svelte 5 event delegation issue but unconfirmed. Leave open, investigate separately.

## App State
- App running: PID from last launch, CDP on port 9224
- Vite running on port 5173
- To reload after changes: `node tools/reload.mjs`
- To relaunch: `node tools/launch-cdp.mjs`

## Git Status
- BUILD-LOG.md modified (needs session-end update)
- All code changes committed

## Next Steps
1. Pick next issue — Steve will say "next issue"
2. Run `node tools/reload.mjs` after every code change
3. Update BUILD-LOG.md at session end

## Resume Command
Run `/resume` after `/clear`
