# Mercury — Handoff

## Current State

Project just initialized. All vision docs, roadmap, and build protocol are in place. No code beyond the SvelteKit scaffold and a placeholder landing page.

## What's Done

- PROJECT.md — full vision, architecture, revenue model, data sources
- ROADMAP.md — 7-phase plan from data pipeline to blog tools
- BUILD-LOG.md — documentary record of every decision since the idea started
- CLAUDE.md — build protocol (mandatory session start/during/end logging)
- SvelteKit scaffold — builds clean, landing page with disabled search bar
- Git post-commit hook — auto-appends commit info to BUILD-LOG.md
- `src/lib/config.ts` — project name as single variable (codename "Mercury")

## What's Next

**Phase 1: Data Pipeline.** This is the immediate next thing to build.

1. Research MusicBrainz dump format and download URLs
2. Download a MusicBrainz data dump
3. Write a Node.js script to parse and process into SQLite + FTS5
4. Verify: can we search 2.6M artists instantly?

**Parallel: Phase 0** — set up GitHub Sponsors, research NLnet grant application.

## Important Context

- Read SOUL.md and STEVE.md (in ControlCenter root) for identity context
- The build log is a DOCUMENTARY — log every decision, include Steve's exact words
- No paid tiers, no premium features, no businesses on top. Pure public good.
- The name "Mercury" is a codename. Will change.
- Two-layer architecture: web gateway + local desktop app with distributed database
