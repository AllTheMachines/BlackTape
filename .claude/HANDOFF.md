# Work Handoff - 2026-03-01

## Current Task
Rename project folder from `D:\Projects\Mercury` to `D:\Projects\BlackTape`

## Context
The project's real name is BlackTape (Mercury was always a codename). GitHub repo was renamed to `AllTheMachines/BlackTape` this session. The local folder still needs renaming, but Claude Code's own process locks the folder so it can't be done from within the session.

## Progress
### Completed
- GitHub repo renamed: `AllTheMachines/Mercury` → `AllTheMachines/BlackTape`
- Local git remote updated to: `https://github.com/AllTheMachines/BlackTape.git`
- Windows Startup shortcut updated: `Mercury Build Log Viewer.lnk` now points to `D:\Projects\BlackTape\tools\build-log-viewer\`
- Build-log-viewer process killed (PID 22732) to attempt rename — still locked by Claude Code process itself

### In Progress
- Folder rename: blocked — needs Claude Code session to be closed first

### Remaining
- Steve manually renames `D:\Projects\Mercury` → `D:\Projects\BlackTape` in Windows Explorer
- Restart Claude Code from new folder path
- Restart build-log-viewer: `node tools/build-log-viewer/server.js --file ../../BUILD-LOG.md` from `D:\Projects\BlackTape\tools\build-log-viewer\`
- Optionally rename the Startup shortcut itself from "Mercury Build Log Viewer" to "BlackTape Build Log Viewer"

## Key Decisions
- Keep GitHub org as `AllTheMachines` (that's Steve's identity, not the project name)
- No sensitive data found in repo — safe to be public
- No donations in app from day one — wait for organic "how can I support this?" signal
- GSD creator (Lex Christopherson / @official_taches) launched the $GSD coin himself (it's in the official README). Down 80% from ATH.

## Relevant Files
- `.claude/HANDOFF.md` — this file
- Startup shortcut: `C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Mercury Build Log Viewer.lnk` — already updated to BlackTape path

## Git Status
Only BUILD-LOG.md (auto-appended by post-commit hook) and parachord-reference submodule modified. Safe to ignore.

## Next Steps
1. Close Claude Code
2. Rename `D:\Projects\Mercury` → `D:\Projects\BlackTape` in Windows Explorer
3. Reopen Claude Code from `D:\Projects\BlackTape`
4. Run `/resume` — I'll restart the build-log-viewer

## Resume Command
After running `/clear`, run `/resume` to continue.
