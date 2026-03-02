# Work Handoff - 2026-03-02 (afternoon)

## PRIORITY NEXT TASK
**Auto-download database in Setup Wizard.** Steve says the current "download manually, decompress, place at path" flow is unacceptable. It must be: click "Download" → see progress bar → done. No manual steps.

Implementation needed:
- Rust command in `src-tauri/src/lib.rs` that downloads `mercury.db.gz` from a URL, streams it to disk with progress events, then decompresses it to `mercury.db` in the app data dir
- Update `SetupWizard.svelte` Step 2: replace manual instructions with a "Download Database" button + progress bar (like the AI models step already does)
- The download URL needs to be hosted somewhere (GitHub release asset, or a direct URL Steve provides)
- Progress should show bytes downloaded / total size
- After download completes, auto-advance to next step

Reference: The AI models download in Step 3 already has this pattern — `downloadModel()` with progress callback. Mirror that for the database.

## RESTORE DB FIRST
Steve's real database has been moved to test first-time experience:
```bash
mv "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db.bak" "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db"
mv "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db-shm.bak" "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db-shm" 2>/dev/null
mv "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db-wal.bak" "C:/Users/User/AppData/Roaming/com.blacktape.app/mercury.db-wal" 2>/dev/null
# taste.db files too:
find "C:/Users/User/AppData/Roaming/com.blacktape.app" -name "*.bak" -exec sh -c 'mv "$1" "${1%.bak}"' _ {} \;
```
Kill mercury.exe first if still running: `taskkill //F //IM mercury.exe`

## Completed This Session
### 4 GitHub issues fixed:
- **#80** — Player slides in/out with CSS transform (`Player.svelte` wrapper div)
- **#79** — Reload button in `ControlBar.svelte` using `invalidateAll()`
- **#71** — CoverPlaceholder pixelation: `image-rendering: auto`, GPU compositing, `front-500` sources
- **#73** — Global `user-select: text` in `theme.css`
- Removed film grain canvas from Player
- Added retry to `fetchSafe()` in artist page loader
- Deleted GitHub release v0.1.0-alpha
- Built Tauri release: `src-tauri/target/release/bundle/nsis/BlackTape_0.1.0_x64-setup.exe`

## Git Status
- Multiple files modified (unstaged), not committed yet
- Changes: Player.svelte, ControlBar.svelte, CoverPlaceholder.svelte, theme.css, +page.ts, ArtistCard.svelte, +layout.svelte, BUILD-LOG.md

## Known Issues
- Artist page releases fail on cold first launch (MusicBrainz fetch). Retry added but still intermittent.
- App data path: `C:/Users/User/AppData/Roaming/com.blacktape.app/`
