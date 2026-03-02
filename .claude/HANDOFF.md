# Work Handoff - 2026-03-02 (afternoon)

## Current Task
Pre-release polish for v0.1.0-alpha friends & family preview.

## Completed This Session
### 4 GitHub issues fixed:
- **#80** — Player slides in/out with CSS transform instead of {#if} pop. `Player.svelte` wrapper div with `transform: translateY(100%)` ↔ `translateY(0)`, 0.3s ease.
- **#79** — Reload button added to `ControlBar.svelte` (global toolbar). Uses `invalidateAll()`. Spinning icon while loading.
- **#71** — CoverPlaceholder pixelation fix: `image-rendering: auto`, `will-change: transform` on backdrop, upgraded ArtistCard cover source from `front-250` to `front-500`.
- **#73** — Global `user-select: text` added to body in `theme.css`.

### Other changes:
- Removed film grain canvas from Player (Steve asked to remove the noise)
- Added retry logic to `fetchSafe()` in artist page loader (cold-start network failures)
- Deleted GitHub release v0.1.0-alpha (Steve's request)
- Built fresh Tauri release: `src-tauri/target/release/bundle/nsis/BlackTape_0.1.0_x64-setup.exe`

## In Progress
- **First-time user experience testing** — DB has been moved to `.bak` to simulate clean install. Steve is testing the Setup Wizard.
- **RESTORE DB AFTER TESTING:** `mv "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db.bak" "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db"` (also .shm, .wal, and taste.db files)

## Known Issues
- Artist page releases fail to load on cold first launch (MusicBrainz fetch fails before WebView network is ready). Retry in `fetchSafe` added but Steve says still not working. Needs deeper investigation.
- The release build (`mercury.exe`) needs `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9224"` env var for CDP.

## Key File Paths
- `src/lib/components/Player.svelte` — player bar with slide animation
- `src/lib/components/ControlBar.svelte` — global toolbar with reload button
- `src/lib/components/CoverPlaceholder.svelte` — generative cover art
- `src/lib/styles/theme.css` — global styles
- `src/routes/artist/[slug]/+page.ts` — artist page loader with fetchSafe retry
- `src/lib/components/SetupWizard.svelte` — first-run onboarding wizard
- App data: `C:/Users/User/AppData/Roaming/com.blacktape.app/`

## Git Status
- Multiple files modified (unstaged): Player.svelte, ControlBar.svelte, CoverPlaceholder.svelte, theme.css, +page.ts, ArtistCard.svelte, +layout.svelte, BUILD-LOG.md
- Not committed yet

## Next Steps
1. Restore mercury.db after Steve finishes testing first-time experience
2. Steve may want to improve the onboarding for friends
3. Investigate cold-start MusicBrainz fetch failure more deeply
4. Commit all changes
5. Build new release for friends
