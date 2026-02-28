# Work Handoff - 2026-02-28

## Current Task
Working through open GitHub issues. Last completed: #49 (STREAM ON section on release page).

## Context
Steve's rule: work through open GitHub issues before starting new feature work. This session fixed the release page Svelte 5 async state bug and two related issues (#49 STREAM ON). The issue backlog is the focus — verified actual open issues vs stale memory list.

## Progress

### Completed This Session
- **Release page Svelte 5 async state bug** — `$state` in async `onMount` doesn't flush after SPA navigation. Fixed by moving MB fetch to `+page.ts` load function. Component uses `$derived(data.release)`.
- **`each_key_duplicate` crash** — multi-disc releases (KID A MNESIA) have duplicate `position` values per disc. Fixed with unique `id: number` field (global track index) on `Track` interface.
- **#49 STREAM ON section** — Always shows Spotify + YouTube on release page. Direct MB URLs when available, search fallbacks (? badge) otherwise. Bandcamp/SoundCloud appear when MB has direct links. Issue closed.
- **Verified issue list** — #63, #57, #54, #53, #50 are all already closed. Updated MEMORY.md with real open issue list.
- **BUILD-LOG.md** — Has uncommitted status block. Needs final session entry written and committed.

### Remaining
- BUILD-LOG.md needs session summary + commit (3 lines added by auto-save hooks, not a full entry yet)

## Key Decisions
- `+page.ts` now owns MB fetch for release page — returns `release`, `platformLinks`, `hasAnyStream`, `rawCredits`, `streamSearchLinks`
- STREAM ON section is outside `{#if tauriMode}` gate (streaming links useful everywhere); EmbedPlayer stays Tauri-only
- Search fallback URLs: `https://open.spotify.com/search/...` and `https://www.youtube.com/results?search_query=...`

## Relevant Files
- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — MB fetch + full processing here; exports `Track` (with `id` field), `ReleaseDetail`, `CreditEntry`
- `src/routes/artist/[slug]/release/[mbid]/+page.svelte` — uses `$derived(data.release)`; STREAM ON section added after BuyOnBar
- `BUILD-LOG.md` — uncommitted, needs session entry

## Git Status
- `BUILD-LOG.md` — 3 lines added by auto-save, not a full session entry (needs writing)
- `parachord-reference` submodule — modified content (ignore, not our concern)
- All code changes are committed (3 commits this session: release page fix, build log entry for release fix, fix #49)

## Open Issues (verified current as of 2026-02-28)
- **Bug:** #23 scene page doesn't reflect local library
- **Enhancements (priority order):** #56 Play Album button, #55 library search/filter, #52 style map non-interactive, #51 discover tag input buried, #43 no loading indicator, #33 help/about overhaul, #32 share button per-platform, #31 discovery page headers, #30 about page feedback form, #29 AI provider UX, #27 validate external links, #26 artist website first in links, #25 time machine pagination, #24 style map zoom, #64 geographic scene map, #15 MB live update strategy

## Next Steps
1. Write final BUILD-LOG.md session entry (summarize: release page fix + #49 STREAM ON) and commit
2. Pick next issue — suggest **#56** (Play Album button) or **#55** (library search/filter)

## Resume Command
After `/clear`, run `/resume` to continue.
