# Mercury — Claude Context

## What This Is

A music search engine with taste. Indexes all music from open databases (MusicBrainz, Discogs), embeds players from wherever music already lives (Bandcamp, Spotify, SoundCloud, YouTube), and lets people discover through atomic tags. Uniqueness is rewarded — the more niche you are, the more discoverable you become.

Not a platform. Not a streaming service. A discovery engine that becomes an ecosystem.

Read `PROJECT.md` for the full vision, architecture, and research context.

## Tech Stack

- **Frontend:** SvelteKit (Svelte 5, TypeScript) — Tauri desktop only, adapter-static SPA
- **Search index:** SQLite + FTS5 (local, via tauri-plugin-sql)
- **Desktop:** Tauri 2.0 (Rust shell, WebView2 on Windows)
- **Data pipeline:** Node.js scripts that process MusicBrainz/Discogs dumps
- **Distribution:** Database file distributed via torrent/download

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Project name + tagline. THE single variable for renaming. |
| `PROJECT.md` | Vision, architecture, research references |
| `BUILD-LOG.md` | Documentary record of every decision and milestone |
| `ARCHITECTURE.md` | Technical architecture — how all subsystems connect |
| `docs/user-manual.md` | End-user manual and help reference |

## Naming

"Mercury" is a codename. The real name hasn't been found yet. The project name lives in exactly one place: `src/lib/config.ts`. All UI references import from there. When the real name is found, change it once.

## Build Protocol (MANDATORY)

This project is documented like a documentary. Every decision, dead end, and breakthrough is recorded. **Steve streams the build process live on YouTube** — the build log viewer at `localhost:18800` is always running (Windows Startup).

### Session Start
1. Read `BUILD-LOG.md` to understand where things stand
2. Read the last few git commits for recent changes
3. State what you're about to work on

### During Work — Live Updates (IMPORTANT)
- **Update BUILD-LOG.md after every task**, not just at session end
- Use the `<!-- status -->` block at the bottom for real-time progress:
  ```
  <!-- status -->
  Working on feature X — 3/7 tasks done. Just finished the API endpoint.
  <!-- /status -->
  ```
- The status block renders as a pulsing live indicator in the build-log-viewer
- YouTube viewers see activity between commits — keep it interesting
- **Log every significant decision** as a new entry with date and context
- Include Steve's exact words when he articulates something important (use blockquotes)
- Record rejected alternatives and WHY they were rejected
- Capture the reasoning, not just the outcome
- Remove the `<!-- status -->` block when writing the final session entry

### Session End
- Update BUILD-LOG.md with a summary of what was accomplished
- Note any open questions or next steps
- Update HANDOFF.md if the session is ending mid-task
- Remove any `<!-- status -->` block (session is over, nothing is live)

### Automated
- Git post-commit hook auto-appends commit info to BUILD-LOG.md
- Hook is at `.githooks/post-commit`, configured via `core.hooksPath`
- Build log viewer auto-starts on Windows login (Startup shortcut → `tools/build-log-viewer/start-hidden.vbs`)

## Central Configs
This project references canonical configs from ControlCenter.
See D:/Projects/_ControlCenter/configs/hooks/hooks.md for notification hook setup.
See D:/Projects/_ControlCenter/configs/statusline/statusline.md for statusline config.
See D:/Projects/_ControlCenter/configs/gsd/gsd-defaults.md for GSD default settings.

## Research Archive
Pre-project research saved in ControlCenter:
- `D:/Projects/_ControlCenter/.planning/music-platform/research/` — 4 deep research reports
- `D:/Projects/_ControlCenter/.planning/music-platform/SESSION-2026-02-14.md` — full origin story

## Data Sources

- **MusicBrainz:** 2.6M artists, 4.7M releases, 35M recordings. CC0 (public domain).
- **Discogs:** 18M+ releases, monthly XML dumps.
- **ListenBrainz:** Open source scrobbling + recommendations (future).

## Development

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run check   # TypeScript + Svelte checks
```

## What To Be Careful About

- **No audio hosting.** Ever. Audio lives on the artist's infrastructure.
- **No tracking, no ads, no algorithmic manipulation.** This is a discovery tool, not a retention tool.
- **Open source always.** No decisions that would lock this into a proprietary ecosystem.
- **The name will change.** Don't hardcode "Mercury" anywhere — always import from config.ts.
- **Update the build log.** If you made a decision, it goes in BUILD-LOG.md. No exceptions.
- **Update the docs.** When adding features, changing architecture, or modifying user-facing behavior, update `ARCHITECTURE.md` and `docs/user-manual.md` to match. These docs must stay current — they're the map that connects all parts of the system.
