# Work Handoff - 2026-03-01

## Current Task
Cover placeholder feature shipped — session ended mid-demo-recording (user stopped it).

## Context
Session covered: LICENSE file added (PolyForm Noncommercial), parachord reference fully purged (folder, BUILD-LOG entry, both git commits — history rewritten + force pushed), cover art placeholder redesign implemented, demo recording started and manually stopped.

## Progress
### Completed
- Added `LICENSE` (PolyForm Noncommercial 1.0.0) + updated README license section
- Removed `parachord-reference` submodule from repo
- Removed Parachord entry from BUILD-LOG.md
- Rewrote git history to drop both parachord commits (`6c4c1a0` add + `9721b1c` remove)
- Force pushed clean history to `AllTheMachines/BlackTape` on GitHub
- Built debug binary (`cargo build` — `src-tauri/target/debug/mercury.exe` now exists)
- Updated `record-and-run.mjs` to cover all v2.0 brief sections:
  - Natural language search pass (Berlin, Warp Records) injected mid-search loop
  - Queue export dialog (M3U8, Traktor NML, copy-files toggle)
  - Crate Dig section (3 filter cycles)
  - Explore/AI section (3 queries)
- **Created `src/lib/components/CoverPlaceholder.svelte`** — new component with:
  - 20 deterministic background colors (hashed from name)
  - 14 Google Fonts mapped to genre families
  - Font size scaled by name length
  - Inner vignette shadow
- Wired CoverPlaceholder into all 3 fallback locations:
  - `ArtistCard.svelte` (replaces initials)
  - `ReleaseCard.svelte` (replaces single letter)
  - `release/[mbid]/+page.svelte` hero (replaces single letter)
- App reloaded successfully after cover placeholder changes
- Demo recording started (`record-and-run.mjs`) then stopped at user request (~3 min in, mid artist pages section)

### In Progress
- Nothing actively in progress

### Remaining
- Check cover placeholder visually in the app (user wanted to inspect before/after recording was stopped)
- Push the 5 unpushed commits to GitHub (LICENSE, README, record-and-run updates, CoverPlaceholder)
- Re-run the demo recording when ready (`node tools/launch-cdp.mjs` then `node tools/record-and-run.mjs`)
- BUILD-LOG.md has auto-appended commit entries (unstaged, normal state — hook handles it)

## Key Decisions
- PolyForm Noncommercial 1.0.0 chosen for license (fork/build freely, no commercial use)
- Parachord scrubbed entirely — not just the folder but both commits and the BUILD-LOG entry
- CoverPlaceholder uses deterministic color (same name = same color every time, not truly random per render)
- Google Fonts loaded via `<svelte:head>` in the component itself — no global CSS changes needed
- Font fallback chain: genre-matched font → sans-serif

## Relevant Files
- `src/lib/components/CoverPlaceholder.svelte` — new component, just created
- `src/lib/components/ArtistCard.svelte` — imports + uses CoverPlaceholder
- `src/lib/components/ReleaseCard.svelte` — imports + uses CoverPlaceholder
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — imports + uses CoverPlaceholder
- `tools/record-and-run.mjs` — updated with NL search, export dialog, Crate Dig, Explore sections
- `LICENSE` — new file, PolyForm Noncommercial 1.0.0
- `README.md` — license section updated
- `BUILD-LOG.md` — auto-appended by post-commit hook (unstaged, expected)

## Git Status
Branch is 5 commits ahead of origin/main (not yet pushed):
- LICENSE added
- README license section updated
- record-and-run.mjs updated for v2.0 brief
- CoverPlaceholder.svelte created + wired into 3 components
- BUILD-LOG cleanup commit

Only BUILD-LOG.md is dirty (auto-appended by hook, normal).

## Next Steps
1. Open the app and browse to Search or an artist page to verify cover placeholders look good
2. Push 5 commits: `git push`
3. Re-run demo recording when ready: `node tools/launch-cdp.mjs` then `node tools/record-and-run.mjs`

## Resume Command
After running `/clear`, run `/resume` to continue.
