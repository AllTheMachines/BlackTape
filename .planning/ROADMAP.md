# Roadmap: Mercury (BlackTape)

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** — Phases 11–12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** — Phases 13–15 (shipped 2026-02-24)
- ✅ **v1.3 The Open Network** — Phases 16–22 (shipped 2026-02-24)
- ✅ **v1.4 The Interface** — Phases 23–27 (shipped 2026-02-25)
- ✅ **v1.5 UX Cleanup** — Phase 28 (shipped 2026-02-26)
- 🚧 **v1.6 The Playback Milestone** — Phases 29–32 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–10) — SHIPPED 2026-02-23</summary>

See `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Scene Building + Curator Tools (Phases 11–12) — SHIPPED 2026-02-23</summary>

See `.planning/milestones/v1.1-*` (archived in .planning/)

</details>

<details>
<summary>✅ v1.2 Zero-Click Confidence (Phases 13–15) — SHIPPED 2026-02-24</summary>

See `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 The Open Network (Phases 16–22) — SHIPPED 2026-02-24</summary>

See `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 The Interface (Phases 23–27) — SHIPPED 2026-02-25</summary>

- [x] Phase 23: Design System Foundation — CSS tokens, custom titlebar, app chrome (completed 2026-02-24)
- [x] Phase 24: Artist Page — Redesign + MusicBrainz relationships + credits + discography filters (completed 2026-02-25)
- [x] Phase 25: Queue System + Library — Full queue management + library two-pane redesign (completed 2026-02-25)
- [x] Phase 26: Discover + Cross-Linking + Crate Fix — Filter grid + tool cross-links + country dropdown (completed 2026-02-25)
- [x] Phase 27: Search + Knowledge Base — Autocomplete + intent search + KB genre redesign (completed 2026-02-25)

See `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 UX Cleanup (Phase 28) — SHIPPED 2026-02-26</summary>

- [x] Phase 28: UX Cleanup + Scope Reduction (completed 2026-02-26)

See `.planning/milestones/v1.5-ROADMAP.md`

</details>

### 🚧 v1.6 — The Playback Milestone (In Progress)

**Milestone Goal:** Wire up multi-source streaming so users can play full tracks from any artist page — Spotify, YouTube, SoundCloud, Bandcamp — with service priority set once and playback automatic.

- [x] **Phase 29: Streaming Foundation** — activeSource coordination state, service priority drag-to-reorder in Settings, player bar service badge (completed 2026-02-27)
- [ ] **Phase 30: Spotify Integration** — PKCE OAuth flow, Spotify Connect API top-track playback, disconnect/reconnect
- [ ] **Phase 31: Embedded Players** — SoundCloud Widget, YouTube IFrame + Error 153 fallback, Bandcamp embed (spike-gated), source switcher UI
- [ ] **Phase 32: Album Playback + Polish** — Release page "Play Album", Bandcamp album-specific embed, UX guidance pass

---

## Phase Details

### Phase 29: Streaming Foundation
**Goal**: Users can set streaming service priority once and the app coordinates all audio sources so only one plays at a time
**Depends on**: Phase 28 (v1.5 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, PLAYER-01
**Success Criteria** (what must be TRUE):
  1. User can drag-to-reorder streaming services in Settings → Streaming; order persists across app restarts
  2. Artist page shows service availability badges (which of Spotify/YouTube/SoundCloud/Bandcamp have content for this artist) derived from existing MusicBrainz link data — no new API calls
  3. When a streaming embed becomes active, any local audio playback stops; only one audio source plays at a time
  4. Player bar shows a service badge ("via SoundCloud", "via Spotify", etc.) that updates when the active source changes; shows nothing when no streaming source is active
**Plans**: TBD

### Phase 30: Spotify Integration
**Goal**: Users can connect their own Spotify account and play artist top tracks in their running Spotify Desktop app from within BlackTape
**Depends on**: Phase 29
**Requirements**: SPOT-01, SPOT-02, SPOT-03, SPOT-04
**Success Criteria** (what must be TRUE):
  1. User can complete a guided Settings → Spotify flow (enter own Client ID, authorize via PKCE OAuth in system browser, return to app connected) — redirect URI uses http://127.0.0.1, never localhost
  2. When Spotify is the active service and Spotify Desktop is running with an active device, clicking play on an artist triggers top-track playback in Spotify Desktop via Connect API
  3. When Spotify Desktop is not running or has no active device, the app displays a clear inline message ("Open Spotify Desktop and start playing anything, then try again") — no silent failure
  4. User can disconnect Spotify from Settings (clears token) and reconnect without restarting the app
**Plans**: TBD

### Phase 31: Embedded Players
**Goal**: Users can play music through SoundCloud, YouTube, and Bandcamp embeds directly in the app, with a source switcher to change services without leaving the artist page
**Depends on**: Phase 29
**Requirements**: SC-01, SC-02, YT-01, YT-02, BC-01, PLAYER-02
**Success Criteria** (what must be TRUE):
  1. Artist page auto-loads the highest-priority available service embed without requiring a click-to-reveal; SoundCloud Widget API play/pause control works including after Svelte navigation remount
  2. YouTube embed renders for video URLs; when a YouTube embed fails with Error 153, the player area is replaced with a "Watch on YouTube" button — fallback tested in production .msi build, not just dev mode
  3. Bandcamp: spike runs first (30 min) — if `url=` parameter works, Bandcamp embed renders with 5-second load timeout and "Visit on Bandcamp" fallback; if spike fails, Bandcamp remains external-link-only for v1.6 and the phase documents this decision
  4. Source switcher shows one button per available service on the artist page; clicking a button switches the active embed without page navigation and updates the player bar badge
  5. When a different embed becomes active, the previously active embed is unmounted (not just paused) to prevent simultaneous audio
**Plans**: TBD

### Phase 32: Album Playback + Polish
**Goal**: Users can play a full album from a release page using the best available streaming source, with Bandcamp album-specific embeds where available
**Depends on**: Phase 31
**Requirements**: BC-02, PLAYER-03
**Success Criteria** (what must be TRUE):
  1. Release page "Play Album" button activates a streaming embed for that specific release: Bandcamp album URL first (if Phase 31 spike succeeded), then SoundCloud oEmbed, then Spotify artist embed, then YouTube — button is hidden entirely when no streaming URLs exist for the release
  2. When Bandcamp's Phase 31 spike succeeded, release page "Play Album" uses the release's own Bandcamp URL (from release.links), not the artist-level Bandcamp URL
  3. Spotify artist page shows inline guidance ("For full tracks, log in to Spotify in BlackTape") when Spotify is the active service; YouTube shows clear "Watch on YouTube" CTA when only a channel URL exists
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–10. MVP Foundation | v1.0 | 71/71 | Complete | 2026-02-23 |
| 11–12. Scene + Curator | v1.1 | 8/8 | Complete | 2026-02-23 |
| 13–15. Test Automation | v1.2 | ~3/3 | Complete | 2026-02-24 |
| 16–22. Open Network | v1.3 | 17/17 | Complete | 2026-02-24 |
| 23. Design System Foundation | v1.4 | 3/3 | Complete | 2026-02-24 |
| 24. Artist Page | v1.4 | 3/3 | Complete | 2026-02-25 |
| 25. Queue System + Library | v1.4 | 4/4 | Complete | 2026-02-25 |
| 26. Discover + Cross-Linking + Crate Fix | v1.4 | 4/4 | Complete | 2026-02-25 |
| 27. Search + Knowledge Base | v1.4 | 5/5 | Complete | 2026-02-25 |
| 28. UX Cleanup + Scope Reduction | v1.5 | 7/7 | Complete | 2026-02-26 |
| 29. Streaming Foundation | 4/4 | Complete   | 2026-02-27 | - |
| 30. Spotify Integration | v1.6 | 0/? | Not started | - |
| 31. Embedded Players | v1.6 | 0/? | Not started | - |
| 32. Album Playback + Polish | v1.6 | 0/? | Not started | - |
