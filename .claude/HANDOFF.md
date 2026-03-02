# Work Handoff - 2026-03-02 01:30

## Current Task
Automated app video recording — Pass 2 ALSO FAILED. Need Pass 3 with a different window preparation strategy.

## Context
Steve invoked `/record-app` to record a full walkthrough of the BlackTape desktop app. Pass 1 failed because the app wasn't fullscreen (showed full desktop). Pass 2 added `MinimizeAll()` + re-maximize but the verify frame shows Windows task-view overlay with ALL open windows visible — `MinimizeAll()` also minimized the app, and the re-maximize via PowerShell triggered the task switcher view instead of cleanly restoring just the app.

## Progress
### Completed
- `recording.config.json` updated with new fields: `ffmpeg_input: "desktop"`, `fullscreen_strategy: "both"`, `maximize_selector: "button[aria-label=\"Maximize\"]"`
- Cameraman skill updated with Section 2.5 (Window Preparation), video verification in Section 7, `ffmpeg_input` support
- `/record-app` command updated to support new config fields and generic app types (tauri/electron/web)
- Global lessons updated with FFmpeg desktop capture and Playwright≠FFmpeg screenshot lessons
- Storyboard (19 scenes) confirmed working — dry run passes on both Pass 1 and Pass 2
- Pass 2 cameraman script written and executed — **19/19 scenes complete** but video is UNUSABLE (shows desktop/task-view)
- Press screenshots from Pass 2 saved (Playwright captures are fine — they show the WebView content correctly)

### Remaining
- **Fix window preparation for Pass 3** — the `MinimizeAll()` approach doesn't work
- Director review of Pass 3
- Cutter post-production on Pass 3
- Final delivery

## Key Decisions / Lessons
- **`Shell.Application.MinimizeAll()` DOES NOT WORK** — it minimizes the target app too, and re-maximizing via PowerShell Win32 API triggers the Windows task switcher overlay
- **Playwright screenshots are fine** — they only capture WebView2 content, so press screenshots are usable even when FFmpeg video is bad
- **Don't modify app source code** for recording — Steve was explicit
- **Click UI buttons for window control** — `button[aria-label="Maximize"]` works via Playwright
- **CDP port is 9224** (not 9222)
- **Restore app state after recording** — switch layout back to Cockpit

## Critical Fix for Pass 3 — NEW STRATEGY NEEDED

The `MinimizeAll()` approach failed. Better strategies to try:

### Strategy A: Minimize windows ONE BY ONE (exclude the app)
```powershell
# Get all windows EXCEPT mercury.exe, minimize each individually
$appProc = Get-Process -Name mercury -ErrorAction SilentlyContinue | Select-Object -First 1
Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and $_.Id -ne $appProc.Id } | ForEach-Object {
  [WinAPI]::ShowWindow($_.MainWindowHandle, 6)  # SW_MINIMIZE = 6
}
```

### Strategy B: Use `-i title="BlackTape"` instead of `-i desktop`
The cameraman skill supports `ffmpeg_input: "title"` which captures just the app window by title. This avoids needing fullscreen entirely. BUT the HYPERSPEED-RECORDING-BRIEF says to use `-i desktop` because the app title might match VS Code's title bar. Test if `title=BlackTape` actually works — it might capture just the right window.

### Strategy C: Use `SetForegroundWindow` + `SetWindowPos(HWND_TOPMOST)`
Make the app topmost, then use `-i desktop`. Other windows don't need to be minimized — the app just needs to be on top and maximized.

```powershell
Add-Type -TypeDefinition '...'
$proc = Get-Process -Name mercury | Select-Object -First 1
[WinAPI]::SetForegroundWindow($proc.MainWindowHandle)
[WinAPI]::SetWindowPos($proc.MainWindowHandle, -1, 0, 0, 0, 0, 0x0003)  # HWND_TOPMOST + SWP_NOMOVE|SWP_NOSIZE
```

### Strategy D: Fullscreen (not just maximize) via Tauri window API
The `record-and-run.mjs` reference script uses `win.setFullscreen(true)` via `__TAURI__` API and it worked there. Try evaluating fullscreen instead of maximize — fullscreen covers the taskbar and everything. The handoff from Pass 1 said `__TAURI__` was not available, but `record-and-run.mjs` proves it IS available (it uses `window.__TAURI__.window.getCurrentWindow()`).

**Recommended order to try: D (fullscreen via Tauri API) → C (topmost) → B (title capture) → A (selective minimize)**

## Relevant Files
- `app-recordings/2026-03-02_app-walkthrough/` — session folder
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — 19-scene storyboard (REUSE)
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — has pass 1 and pass 2 entries
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass1.cjs` — Pass 1 script (reference)
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass2.cjs` — Pass 2 script (reference, has MinimizeAll fix that DIDN'T work)
- `app-recordings/2026-03-02_app-walkthrough/takes/pass-2/verify-frame.png` — PROOF that Pass 2 failed (shows desktop task view)
- `recording.config.json` — recording config with new fields
- `tools/record-and-run.mjs` — WORKING reference script (uses __TAURI__ fullscreen, NOT MinimizeAll)
- `C:/Users/User/.claude/skills/cameraman/skill.md` — updated Cameraman skill with Section 2.5
- `C:/Users/User/.claude/commands/record-app.md` — updated record-app command
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — recording brief (says use `-i desktop`)

## Git Status
- `BUILD-LOG.md` modified (status block added)
- `manifest.json` modified (pass 2 entry added)
- Press screenshots modified (pass 2 re-captured them)
- `cameraman-pass2.cjs` new (untracked)
- recording.config.json changes already committed in earlier auto-saves

## Next Steps
1. Write cameraman-pass3.cjs with Strategy D (fullscreen via `__TAURI__` API as in record-and-run.mjs) — look at lines 41-67 of `tools/record-and-run.mjs` for the exact pattern
2. If `__TAURI__` fullscreen works, also bring window to front with `page.bringToFront()` and wait 2s
3. Skip `MinimizeAll()` entirely — fullscreen covers the taskbar and fills the screen
4. Take a verify frame BEFORE the dry run to confirm fullscreen worked
5. If fullscreen fails, fall back to Strategy C (HWND_TOPMOST)
6. Run the script, verify the frame, then proceed to Director review and Cutter

## Resume Command
After running `/clear`, run `/resume` to continue.
