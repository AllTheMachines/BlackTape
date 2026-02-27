---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — The Playback Milestone
status: unknown
last_updated: "2026-02-27T07:52:58.031Z"
progress:
  total_phases: 13
  completed_phases: 10
  total_plans: 39
  completed_plans: 38
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — The Playback Milestone
status: unknown
last_updated: "2026-02-27T00:42:04.307Z"
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 36
  completed_plans: 36
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Uniqueness is rewarded — the more niche you are, the more discoverable you become.
**Current focus:** Phase 30 — Spotify Integration

## Current Position

Phase: 30 of 32 (Spotify Integration)
Plan: 2 of TBD in current phase
Status: Phase 30 in progress — 30-02 (Settings wizard) complete. Next: 30-03 (Artist page Play on Spotify button)
Last activity: 2026-02-27 — 30-02 executed (SpotifySettings wizard + settings page + boot hydration)

Progress: [████████████████████] 18% of v1.6 (6 plans done across Phase 29+30)

## Performance Metrics

**v1.5 (Phase 28) reference:**
- 7 plans completed, ~183 tests passing
- Average: ~5 min/plan

**v1.6 (in progress):**

| Phase | Plans | Status |
|-------|-------|--------|
| 29. Streaming Foundation | 4 | Complete — 4/4 plans done |
| 30. Spotify Integration | TBD | In progress — 2/TBD plans done |
| 31. Embedded Players | TBD | Not started |
| 32. Album Playback + Polish | TBD | Not started |

**v1.6 metrics so far:**
- 29-01: 2 min, 3 tasks, 3 files, 0 deviations
- 29-02: 2 min, 1 task, 1 file, 0 deviations
- 29-03: 2 min, 1 task, 1 file, 1 auto-fix (Svelte 5 {@const} placement constraint)
- 29-04: 2 min, 2 tasks, 2 files, 0 deviations
- 30-01: 3 min, 3 tasks, 4 files, 0 deviations
- 30-02: 2 min, 2 tasks, 3 files, 0 deviations

## Accumulated Context

### Decisions

- [29-01]: streamingState module uses module-level $state (no class, no store) — same pattern as playerState in state.svelte.ts
- [29-01]: Default service order is bandcamp-first to align with discovery-first, artist-friendly philosophy
- [29-01]: Service order validation requires exactly 4 entries — partial/corrupted saves fall back to DEFAULT silently
- [29-02]: CSS tokens var(--bg-3), var(--b-1), var(--r) used (not var(--bg-elevated)/var(--card-radius) from plan template — those don't exist in this codebase)
- [29-02]: Streaming section placed after Streaming Preference section for logical grouping; SERVICE_LABELS is a const (static lookup, no reactivity needed)
- [29-03]: Svelte 5 requires {@const} inside a block tag — used outer {#if OR-condition} wrapper so {@const streamingBadges} is a legal child; functionally identical to plan intent
- [v1.6 Research]: Spotify Web Playback SDK NOT used — Widevine CDM unavailable in WebView2 (confirmed unresolved since 2018, GitHub spotify/web-playback-sdk#41)
- [v1.6 Research]: No bundled Spotify client_id — February 2026 policy caps dev mode at 5 users; each user provides their own
- [v1.6 Research]: Spotify OAuth redirect URI must be http://127.0.0.1 (not localhost — blocked since November 2025)
- [v1.6 Research]: Spotify integration = Spotify Connect API only — controls user's running Spotify Desktop app; no in-app audio
- [v1.6 Research]: activeSource coordination state must be built in Phase 29 before any service — cannot be retrofitted afterward
- [v1.6 Research]: Token refresh must use single-flight mutex — PKCE rotate immediately invalidates old refresh token; concurrent refresh = 400 error
- [v1.6 Research]: Do NOT use @tauri-apps/plugin-stronghold — deprecated, removed in Tauri v3; use ai_settings table in taste.db instead
- [29-04]: Dynamic imports used for audio.svelte inside SC Widget PLAY handler (async function) to avoid circular import issues
- [29-04]: EMBED_ORIGINS map uses exact hostname match + hostname.includes('youtube.com') fallback for YouTube nocookie variants
- [29-04]: Spotify play detection via data.type field (object); YouTube via JSON.parse + event/info===1 (string); SC via existing Widget PLAY event
- [30-01]: spotifyState module uses module-level $state (no class, no store) — same pattern as streamingState
- [30-01]: redirectUri uses 127.0.0.1 (Spotify blocked localhost redirects November 2025) — also fixed pre-existing bug in taste-import/spotify.ts
- [30-01]: PlayResult discriminated union for Connect API — playTracksOnSpotify never throws, always returns ok/no_device/premium_required/token_expired
- [30-01]: Proactive refresh at tokenExpiry - 60s to prevent mid-playback failures; keeps existing refreshToken if not rotated in response
- [30-01]: All 5 Spotify tokens stored in ai_settings table — no new DB tables or Rust commands needed
- [Phase 30]: SpotifySettings wizard: self-contained, no props, drives from spotifyState.connected derived
- [Phase 30]: HTML/CSS mockup for Spotify dashboard in settings wizard — no binary assets, won't go stale

### Blockers/Concerns

- [Phase 31 gate]: Bandcamp spike required at Phase 31 start (30 min) — test `url=` param with iframe src `https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/`. Renders = implement embed. Blank/error = external-link-only for v1.6.
- [Phase 31 gate]: YouTube Error 153 fallback must be tested in a production .msi build — dev mode passes; production can fail. This is a hard completion gate for Phase 31.
- [Phase 30 pre-check]: RESOLVED — taste-import localhost bug fixed in 30-01 (bff2d8e). All Spotify OAuth flows now use 127.0.0.1.
- [Phase 31 note]: SoundCloud Widget API re-binding after Svelte navigation remount is untested — verify in Phase 31 before marking SC-01 complete.

### Pending Todos

None.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 30-spotify-integration/30-02-PLAN.md (Spotify Settings wizard)
Resume file: None
