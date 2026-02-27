# Roadmap: Mercury (BlackTape)

## Milestones

- ✅ **v1.0 MVP** — Phases 1–10 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** — Phases 11–12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** — Phases 13–15 (shipped 2026-02-24)
- ✅ **v1.3 The Open Network** — Phases 16–22 (shipped 2026-02-24)
- ✅ **v1.4 The Interface** — Phases 23–27 (shipped 2026-02-25)
- ✅ **v1.5 UX Cleanup** — Phase 28 (shipped 2026-02-26)
- 🚧 **v1.6 The Playback Milestone** — Phases 29–33 (in progress) — completes v1 public release

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

**Milestone Goal:** Ship v1 — multi-source streaming (Spotify Connect, YouTube, SoundCloud, Bandcamp embeds), clean UI with community features hidden, artist claim form.

- [x] **Phase 29: Streaming Foundation** — activeSource coordination state, service priority drag-to-reorder in Settings, player bar service badge (completed 2026-02-27)
- [x] **Phase 30: Spotify Integration** — PKCE OAuth flow, Spotify Connect API top-track playback, disconnect/reconnect (completed 2026-02-27)
- [ ] **Phase 31: v1 Prep** — Community feature UI removal (Scenes, Rooms, Chat, Fediverse hidden from nav), localhost text fix
- [ ] **Phase 32: Embedded Players** — YouTube IFrame, SoundCloud Widget, Bandcamp embed (spike-gated), source switcher UI, release page Play Album
- [ ] **Phase 33: Artist Claim Form** — /claim route, artist page claim link, local storage

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
**Plans**: 4 plans
Plans:
- [x] 29-01-PLAN.md — Streaming state module + service order persistence
- [x] 29-02-PLAN.md — Settings streaming UI drag-to-reorder
- [x] 29-03-PLAN.md — Artist page service availability badges
- [x] 29-04-PLAN.md — Audio coordination + player bar via-badge

### Phase 30: Spotify Integration
**Goal**: Users can connect their own Spotify account and play artist top tracks in their running Spotify Desktop app from within BlackTape
**Depends on**: Phase 29
**Requirements**: SPOT-01, SPOT-02, SPOT-03, SPOT-04
**Success Criteria** (what must be TRUE):
  1. User can complete a guided Settings → Spotify flow (enter own Client ID, authorize via PKCE OAuth in system browser, return to app connected) — redirect URI uses http://127.0.0.1, never localhost
  2. When Spotify is the active service and Spotify Desktop is running with an active device, clicking play on an artist triggers top-track playback in Spotify Desktop via Connect API
  3. When Spotify Desktop is not running or has no active device, the app displays a clear inline message ("Open Spotify Desktop and start playing anything, then try again") — no silent failure
  4. User can disconnect Spotify from Settings (clears token) and reconnect without restarting the app
**Plans**: 3 plans
Plans:
- [x] 30-01-PLAN.md — Spotify module: state, auth (PKCE OAuth), and Connect API
- [x] 30-02-PLAN.md — Settings wizard (3-step connection flow) + boot hydration
- [x] 30-03-PLAN.md — Artist page Play on Spotify button + error handling

### Phase 31: v1 Prep
**Goal**: Community features (Scenes, Rooms, Chat/DMs, Fediverse) removed from all navigation and UI surfaces — code preserved, not visible to users; localhost text fix in Settings
**Depends on**: Phase 30
**Requirements**: PREP-01
**Success Criteria** (what must be TRUE):
  1. Scenes, Rooms, Chat, and Fediverse links are absent from all navigation surfaces (both Tauri header and web nav)
  2. ChatOverlay is not rendered anywhere in the app
  3. Nostr initialization (initNostr, subscribeToIncomingDMs) is not called on app mount
  4. Artist page has no "Scene rooms for {tag}" or "Explore {tag} scene" buttons
  5. Settings page shows no FediverseSettings component
  6. Settings page Spotify redirect URI instructional text says "http://127.0.0.1" not "http://localhost"
**Plans**: TBD

### Phase 32: Embedded Players
**Goal**: Users can play music through SoundCloud, YouTube, and Bandcamp embeds directly in the app, with a source switcher to change services without leaving the artist page; release page Play Album activates the best available source
**Depends on**: Phase 31
**Requirements**: SC-01, SC-02, YT-01, YT-02, BC-01, BC-02, PLAYER-02, PLAYER-03
**Success Criteria** (what must be TRUE):
  1. Artist page auto-loads the highest-priority available service embed without requiring a click-to-reveal; SoundCloud Widget API play/pause control works including after Svelte navigation remount
  2. YouTube embed renders for video URLs; when a YouTube embed fails with Error 153, the player area is replaced with a "Watch on YouTube" button — fallback tested in production .msi build, not just dev mode
  3. Bandcamp: spike runs first (30 min) — if `url=` parameter works, Bandcamp embed renders with 5-second load timeout and "Visit on Bandcamp" fallback; if spike fails, Bandcamp remains external-link-only for v1.6 and the phase documents this decision
  4. Source switcher shows one button per available service on the artist page; clicking a button switches the active embed without page navigation and updates the player bar badge
  5. When a different embed becomes active, the previously active embed is unmounted (not just paused) to prevent simultaneous audio
  6. Release page "Play Album" button activates a streaming embed for that specific release — button hidden when no streaming URLs exist for the release
**Plans**: TBD

### Phase 33: Artist Claim Form
**Goal**: Artists can submit a claim request for their artist page via a /claim route, linked from every artist page
**Depends on**: Phase 32
**Requirements**: CLAIM-01
**Success Criteria** (what must be TRUE):
  1. Every artist page shows an "Is this you? Claim this page" link that navigates to /claim with the artist name pre-filled
  2. /claim route renders a form with fields: artist name, email, message
  3. Form submission stores the claim request in localStorage and shows a confirmation
  4. No backend required — v1 is local storage only
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
| 29. Streaming Foundation | v1.6 | 4/4 | Complete | 2026-02-27 |
| 30. Spotify Integration | v1.6 | 3/3 | Complete | 2026-02-27 |
| 31. v1 Prep | v1.6 | 0/? | Not started | - |
| 32. Embedded Players | v1.6 | 0/? | Not started | - |
| 33. Artist Claim Form | v1.6 | 0/? | Not started | - |
