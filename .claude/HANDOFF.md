# Work Handoff - 2026-02-25

## What Was Done This Session

### 1. Window Controls Fix (SHIPPED)
- **Root cause:** `core:window:default` in Tauri 2.0 only grants read-only window queries — it does NOT include minimize/maximize/close action permissions
- **Fix 1:** Separated `data-tauri-drag-region` into its own absolutely-positioned child div (z-index 0) so it no longer swallows clicks on buttons (z-index 1) in `src/lib/components/Titlebar.svelte`
- **Fix 2:** Added explicit permissions to `src-tauri/capabilities/default.json`:
  - `core:window:allow-minimize`
  - `core:window:allow-toggle-maximize`
  - `core:window:allow-close`
- **Verified:** Rebuilt and user confirmed buttons work
- **Committed:** `928eb58` — fix(titlebar): window controls now work in release build

### 2. Design System Dashboard (NEW FILE)
- Created `docs/design-system.html` — single-file HTML design system
- Sections: Brand Overview, Typography, Color Palette, Color Sandbox, Spacing & Radius, Buttons, Cards & Panels, Forms, Tags & Badges, Design Tokens Table
- Interactive color picker popover on every swatch — click any color to open picker, change color, get a ready-to-paste Claude prompt like: `In Mercury's design system (src/lib/styles/theme.css), change --acc from #c4a55a to #NEW.`
- Token copy buttons in the full tokens table
- Color sandbox for live-previewing token changes on an artist card

### 3. System Housekeeping (Not committed)
- Killed stale Node.js processes (Mercury dev/build/test leftovers)
- Disabled Phone Link, NVIDIA Overlay, Roland Cloud Manager from autostart
- These are system-level changes, not project changes

## Current State
- **All tests passing: 164 code checks, 0 failing**
- No uncommitted changes (BUILD-LOG.md only had auto-save noise)
- `mercury.exe` at `src-tauri/target/release/mercury.exe` is the current working build
- Window controls work in the release exe

## Pending / Next Up
- **UAT Review:** User invoked `/uat-review` but needs to provide video file path
  - Repo: `AllTheMachines/Mercury`
  - Skill: `C:/Users/User/.claude/skills/uat-review/`
  - User needs to provide: path to UAT recording video
  - Then: validate environment (ffmpeg, whisper, gh CLI), transcribe, find incidents, review and file GitHub issues one by one
- After UAT: review findings and plan next phase

## Key Files Changed This Session
| File | Change |
|------|--------|
| `src/lib/components/Titlebar.svelte` | Drag region separated from controls |
| `src-tauri/capabilities/default.json` | Added 3 window action permissions |
| `docs/design-system.html` | New — design system dashboard |
