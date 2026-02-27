# Work Handoff - 2026-02-27

## Current Task
UI polish: squared corners everywhere + Style Map rectangle nodes

## Context
Steve is doing visual polish on the BlackTape desktop app after completing and archiving v1.6 (The Playback Milestone). He doesn't like rounded buttons — wants everything squared. Also changed Style Map from circles to auto-sized rectangles.

## Progress

### Completed
- **v1.6 milestone archived** — all 5 phases (29–33), 13 plans, 193 tests passing, git tagged `v1.6` and pushed to remote
- **Style Map: circles → rectangles** — `src/lib/components/StyleMap.svelte` rewritten to use `<rect>` nodes auto-sized to label text (6.5px/char + 10px padding each side, 22px height), always shows label, collision force updated
- **Global border-radius zeroed** — `--r: 0px` in `src/lib/styles/theme.css` (was 2px)
- **Hardcoded pill buttons fixed**:
  - `border-radius: 999px` → `0` in `src/routes/artist/[slug]/+page.svelte` (big streaming buttons)
  - `border-radius: var(--r, 6px)` → `0` in same file
  - `border-radius: var(--card-radius)` → `0` in `src/lib/components/EmbedPlayer.svelte`

### In Progress
- Dev app is running — Steve opened it to review the changes visually

### Remaining
- Review result in running app, check if anything still looks too rounded
- Commit the style changes
- Possibly more hardcoded radii in other components to zero out

## Key Decisions
- `--r: 0px` globally (single source of truth, not per-component)
- Avatar circles (`border-radius: 50%`) intentionally NOT touched — round avatars are fine
- Style Map text-width estimation: 6.5px/char (can't use getBBox() at layout time)

## Relevant Files
- `src/lib/styles/theme.css` — `--r` token → `0px`
- `src/lib/components/StyleMap.svelte` — circles → auto-width rectangles
- `src/routes/artist/[slug]/+page.svelte` — 999px pill removed from streaming buttons
- `src/lib/components/EmbedPlayer.svelte` — var(--card-radius) zeroed

## Git Status
Style changes NOT yet committed. BUILD-LOG.md has 3 uncommitted lines (post-commit hook wip — normal).

## Next Steps
1. Steve reviews visually in running app
2. If more rounding spotted: `grep -rn "border-radius" src/ | grep -v "var(--r)\|50%\|0px\|0;" | grep -v ".svelte:[0-9]*:.*border-radius: 0"`
3. Commit: `git add src/lib/styles/theme.css src/lib/components/StyleMap.svelte "src/routes/artist/[slug]/+page.svelte" src/lib/components/EmbedPlayer.svelte && git commit -m "style: square all borders, style map circles to auto-width rectangles"`
4. Update BUILD-LOG.md

## Resume Command
After running `/clear`, run `/resume` to continue.
