# Work Handoff - 2026-03-02 09:20

## Current Task
App video recording — Pass 4 needed. Fix verified, script not yet created. Need to create cameraman-pass4.cjs, run it, then Director review + Cutter.

## Context
Steve invoked `/record-app` for a full BlackTape walkthrough. Passes 1-3 all failed due to FFmpeg capture issues:
- **Pass 1:** Used `-i desktop` WITHOUT offset/size constraints → captured both monitors (1920x1848), showed desktop mess with movie + VS Code + BlackTape mixed
- **Pass 2:** Same issue as pass 1
- **Pass 3:** Used `-i title=BlackTape` → VS Code was covering the app window, captured VS Code content

## The Fix (VERIFIED WORKING)
1. Use `-i desktop` WITH `-offset_x 0 -offset_y 0 -video_size 1920x1080` to constrain capture to primary monitor only
2. Bring BlackTape to foreground with `bring-front.ps1` immediately before capture
3. Test frame captured successfully showing clean BlackTape at 1920x1080

**Test proof:** `app-recordings/2026-03-02_app-walkthrough/test-fix2.png` shows clean BlackTape UI

**Only issue:** Windows taskbar visible at bottom (32px). Options: auto-hide taskbar, or crop in post, or ignore.

## What Needs to Happen Next

### 1. Create cameraman-pass4.cjs
Based on `cameraman-pass3.cjs` with these changes:
- `PASS_NUM = 4`
- `TAKES_DIR` → `pass-4`
- In `startFFmpeg()`: Change from `-i title=BlackTape` to:
  ```
  '-offset_x', '0', '-offset_y', '0', '-video_size', '1920x1080',
  '-i', 'desktop',
  ```
  Remove the `-vf crop=trunc(iw/2)*2:trunc(ih/2)*2` filter (no longer needed — 1920x1080 is already even)
- In `verifyFrame()`: Same FFmpeg args change
- Add `bringToFront()` function that runs `bring-front.ps1` — call it before EACH scene's FFmpeg starts (not just at setup)
- In `applyFullscreen()`: Also run `bring-front.ps1` after SetWindowPos

### 2. Update manifest for pass 4
- Restore original 19-scene storyboard from git: `git checkout HEAD -- app-recordings/2026-03-02_app-walkthrough/storyboard.json`
  OR keep the 41-scene storyboard (pass 3's version) — Steve wanted the full walkthrough with 30 artists
- Add pass 4 entry to manifest

### 3. Run pass 4
- `node app-recordings/2026-03-02_app-walkthrough/cameraman-pass4.cjs`
- ~25 minutes for 41 scenes

### 4. Director review (Step 7e)
- Extract checkpoint screenshots from pass 4 clips (middle frame of each)
- Update manifest with actual clip paths
- Spawn Director agent for review

### 5. Cutter post-production (Step 8)
- Director writes cut-spec.json
- Spawn Cutter agent to assemble final video

### 6. Delivery (Step 9)

## Key Files
- `app-recordings/2026-03-02_app-walkthrough/cameraman-pass3.cjs` — BASE for pass 4 (just fix FFmpeg args)
- `app-recordings/2026-03-02_app-walkthrough/bring-front.ps1` — brings BlackTape to foreground (VERIFIED WORKING)
- `app-recordings/2026-03-02_app-walkthrough/window-fullscreen.ps1` — sets window to 1920x1080 at 0,0
- `app-recordings/2026-03-02_app-walkthrough/manifest.json` — current state (pass 3 has 41 scenes, all marked complete but clips show VS Code)
- `app-recordings/2026-03-02_app-walkthrough/storyboard.json` — currently the 41-scene version (Director revised to v3)
- `app-recordings/2026-03-02_app-walkthrough/test-fix2.png` — proof the fix works
- `app-recordings/2026-03-02_app-walkthrough/update-pass3.cjs` — helper script (can delete)
- `D:/Projects/blacktapesite/HYPERSPEED-RECORDING-BRIEF.md` — the recording brief
- `C:/Users/User/.claude/skills/director/skill.md` — Director agent skill
- `C:/Users/User/.claude/skills/cutter/skill.md` — Cutter agent skill
- `recording.config.json` — project recording config

## Skill Workflow Position
We're in Step 7 (Feedback Loop):
- pass_number = 4 (after pass 3 Director revision)
- max_passes = 4
- Director requested revision on pass 3 (VS Code overlap — systemic issue, not storyboard)
- Pass 4 will use fixed FFmpeg capture
- After pass 4: Director review → if approved, Cutter → Delivery

## Lessons Learned This Session
1. FFmpeg gdigrab `-i desktop` captures the ENTIRE virtual desktop on multi-monitor setups — MUST add `-offset_x 0 -offset_y 0 -video_size WIDTHxHEIGHT`
2. FFmpeg gdigrab `-i title=WindowTitle` captures screen content at window position, not window buffer — other windows ON TOP will appear
3. SetForegroundWindow must be called IMMEDIATELY before FFmpeg capture starts, not just during setup
4. The working capture recipe: `bring-front.ps1` + `-i desktop -offset_x 0 -offset_y 0 -video_size 1920x1080`
5. Windows taskbar (32px) will show at bottom unless auto-hidden

## Git Status
- BUILD-LOG.md modified
- Several new files in app-recordings (not tracked: takes are gitignored)
- storyboard.json and manifest.json modified (not committed)

## Resume Command
After running `/clear`, run `/resume` to continue.
