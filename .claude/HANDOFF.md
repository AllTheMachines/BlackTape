# Work Handoff - 2026-03-01

## Current Task
Session complete — issue backlog cleared, strategic conversation about open source / donations.

## Context
This session worked through all actionable open GitHub issues. Also had a conversation with Steve about open source fears (fork risk) and donation buttons. All committed and clean.

## Progress
### Completed
- Closed #66 — Tauri updater (already implemented last session, just needed closing)
- Closed #65 — LLM prompt injection hardening: INJECTION_GUARD + externalContent() in prompts.ts, all complete() call sites updated, genreSummary returns {system,user}, documented in ARCHITECTURE.md
- Closed #67 — Playlist export: export.rs (M3U8, Traktor NML, copy to folder), ExportDialog.svelte, Export button in Queue.svelte
- Closed #40 — Donation button research: answered "not yet, wait for organic signal"
- Removed donation buttons from about page (Ko-fi, GitHub Sponsors, Open Collective — were placeholder URLs anyway)
- Verified artist support links ARE real (from MusicBrainz relationship data — actual artist Ko-fi/Patreon URLs)

### In Progress
- Nothing. All work committed.

### Remaining
- Remaining open issues are all research/meta/strategy (non-code):
  - #39 — Testing video (Steve records)
  - #38 — Scan audiologs/roadmap for missed features (research task)
  - #37 — Marketing approach (strategic)
  - #36 — Modular audit: can community features be cleanly disabled?
  - #35 — v1 feature scope decision
  - #15 — MusicBrainz live update strategy

## Key Decisions
- Open source fear: Steve worried about forks. Answered: creator advantage is real, forks usually die. License choice (GPL/AGPL) matters more than open vs closed. Not urgent until public launch.
- Donation buttons: removed for now. Signal to watch = someone asking "how can I support this?" unprompted. Platforms when ready: GitHub Sponsors + Ko-fi.
- Artist Ko-fi links on artist page are REAL MusicBrainz relationship URLs — not fake. No issue.

## Relevant Files
- `src/lib/ai/prompts.ts` — INJECTION_GUARD + externalContent() + all prompts updated
- `src-tauri/src/export.rs` — NEW: M3U8, Traktor NML, copy-to-folder commands
- `src/lib/components/ExportDialog.svelte` — NEW: export modal UI
- `src/lib/components/Queue.svelte` — Export button added
- `src/routes/about/+page.svelte` — Donation section removed
- `tools/test-suite/manifest.mjs` — 14 new P67 tests added

## Git Status
Clean. Only BUILD-LOG.md (auto-appended by post-commit hook) and parachord-reference submodule (pre-existing, unrelated) are modified. Safe to ignore or commit BUILD-LOG.md if desired.

## Next Steps
1. Tackle remaining issues — best candidates to actually build:
   - #36 (modular audit) — can community features be disabled cleanly for v1?
   - #35 (v1 scope) — what ships vs what's deferred
   - #38 (missed features scan) — scan PROJECT.md + BUILD-LOG.md + audiologs
2. Or start a new milestone focused on v1 launch readiness

## Resume Command
After running /clear, run /resume to continue.
