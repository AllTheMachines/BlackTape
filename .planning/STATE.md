# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 29 — Streaming Foundation

## Current Position

Phase: 29 of 32 (Streaming Foundation)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-02-27 — v1.6 roadmap created (Phases 29–32, 15 requirements mapped)

Progress: [████████████░░░░░░░░] 0% of v1.6 (Phases 29–32 not started)

## Performance Metrics

**v1.5 (Phase 28) reference:**
- 7 plans completed, ~183 tests passing
- Average: ~5 min/plan

**v1.6 (not yet started):**

| Phase | Plans | Status |
|-------|-------|--------|
| 29. Streaming Foundation | TBD | Not started |
| 30. Spotify Integration | TBD | Not started |
| 31. Embedded Players | TBD | Not started |
| 32. Album Playback + Polish | TBD | Not started |

## Accumulated Context

### Decisions

- [v1.6 Research]: Spotify Web Playback SDK NOT used — Widevine CDM unavailable in WebView2 (confirmed unresolved since 2018, GitHub spotify/web-playback-sdk#41)
- [v1.6 Research]: No bundled Spotify client_id — February 2026 policy caps dev mode at 5 users; each user provides their own
- [v1.6 Research]: Spotify OAuth redirect URI must be http://127.0.0.1 (not localhost — blocked since November 2025)
- [v1.6 Research]: Spotify integration = Spotify Connect API only — controls user's running Spotify Desktop app; no in-app audio
- [v1.6 Research]: activeSource coordination state must be built in Phase 29 before any service — cannot be retrofitted afterward
- [v1.6 Research]: Token refresh must use single-flight mutex — PKCE rotate immediately invalidates old refresh token; concurrent refresh = 400 error
- [v1.6 Research]: Do NOT use @tauri-apps/plugin-stronghold — deprecated, removed in Tauri v3; use ai_settings table in taste.db instead

### Blockers/Concerns

- [Phase 31 gate]: Bandcamp spike required at Phase 31 start (30 min) — test `url=` param with iframe src `https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/`. Renders = implement embed. Blank/error = external-link-only for v1.6.
- [Phase 31 gate]: YouTube Error 153 fallback must be tested in a production .msi build — dev mode passes; production can fail. This is a hard completion gate for Phase 31.
- [Phase 30 pre-check]: Verify existing Spotify taste-import OAuth registration uses http://127.0.0.1 not localhost before writing any Phase 30 OAuth code.
- [Phase 31 note]: SoundCloud Widget API re-binding after Svelte navigation remount is untested — verify in Phase 31 before marking SC-01 complete.

### Pending Todos

None.

## Session Continuity

Last session: 2026-02-27
Stopped at: Roadmap created for v1.6 (Phases 29–32). Ready to plan Phase 29.
Resume file: None
