# Project Research Summary

**Project:** BlackTape (Mercury v1.6 — The Playback Milestone)
**Domain:** Multi-source streaming integration (Spotify, YouTube, SoundCloud, Bandcamp) into existing Tauri 2.0 + Svelte 5 desktop app
**Researched:** 2026-02-26
**Confidence:** HIGH (platform constraints and policy facts), MEDIUM (implementation details in Tauri WebView2 context)

---

## CONFLICTS REQUIRING HUMAN RESOLUTION

Two direct contradictions exist across research files. These must be resolved before roadmap phases are finalized.

---

### CONFLICT 1: Bandcamp Embed — `url=` Parameter vs. Numeric ID Required

**Status: UNRESOLVED — implementation spike required.**

**FEATURES.md says (HIGH confidence):**
Bandcamp added a `url=` parameter to the EmbeddedPlayer that accepts a URL-encoded Bandcamp page URL directly. No numeric album ID needed. Format:
```
https://bandcamp.com/EmbeddedPlayer/url={ENCODED_URL}/size=large/bgcol=1d1d1d/linkcol=ffffff/minimal=true/transparent=true/
```
Source cited: Bluesky social-app PR #6761, which demonstrates this working. This would fully unblock Bandcamp embeds for v1.6 — any MusicBrainz-sourced Bandcamp URL could be embedded directly.

**ARCHITECTURE.md says (HIGH confidence based on official docs):**
Bandcamp embed URLs require a numeric album ID (`album=4178276839`) not present in MusicBrainz artist URLs. There is no Bandcamp oEmbed endpoint. No Bandcamp API maps artist URLs to album IDs. Recommendation: keep Bandcamp as external-link-only.

**Why this matters:**
If the `url=` parameter works, Bandcamp embed becomes a LOW-complexity P1 feature that unblocks album playback on release pages. If it does not work, Bandcamp stays external-link-only and the release page "Play Album" feature relies solely on SoundCloud/Spotify/YouTube fallbacks.

**Recommended resolution:**
Spike this in the first 30 minutes of Phase 3 implementation. Create a test HTML file with:
```html
<iframe src="https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/"></iframe>
```
If it renders and plays: FEATURES.md is correct. Update ARCHITECTURE.md and implement accordingly.
If it fails with an error or blank iframe: ARCHITECTURE.md is correct. Defer Bandcamp embed to v1.7.

Do not build the `bandcampEmbedUrl()` function or the EmbedPlayer Bandcamp iframe path until the spike confirms the approach.

---

### CONFLICT 2: Spotify Web Playback SDK in Tauri WebView2

**Status: RESOLVED — SDK not viable. Embed iframe only.**

**STACK.md says (MEDIUM confidence):**
WebView2 is Chromium-based and supports EME. Whether the Spotify Web Playback SDK works in Tauri WebView2 is unconfirmed. Recommends validating in an implementation spike.

**PITFALLS.md says (HIGH confidence):**
The Spotify Web Playback SDK definitively does not work in WebView2. WebView2 does not expose the Widevine CDM to third-party web content even though it is Edge-based. The SDK calls `navigator.requestMediaKeySystemAccess()` and the EME API exists, but the CDM cannot actually decrypt Spotify's protected audio. This failure is documented since 2018 in spotify/web-playback-sdk#41 and applies to all desktop WebView wrappers including Electron and Tauri WebView2.

**Resolution:**
PITFALLS.md is correct. The STACK.md finding was hedged at MEDIUM confidence and explicitly deferred to a spike. PITFALLS.md has three verified GitHub issue sources (spotify/web-playback-sdk #2, #7, #41) confirming this failure persists across Electron and WebView2 environments with no resolution since 2018.

**Additionally:** FEATURES.md confirms a compounding Spotify policy constraint: as of February 2026, Development Mode is limited to 5 authorized users per Client ID, and extended access requires a legally registered organization with 250K+ MAU. A bundled Client ID distributed in an open-source app would hit the 5-user cap immediately.

**Action recorded:** Spotify Web Playback SDK is not used in BlackTape. The existing `spotifyEmbedUrl()` function in `src/lib/embeds/spotify.ts` is the correct and only Spotify integration path. No OAuth for playback is needed. Spotify embeds deliver full tracks for Premium users already logged into Spotify in WebView2, and 30-second previews for free or logged-out users — with no app-side auth required.

---

## Executive Summary

BlackTape v1.6 adds multi-source streaming playback to an existing discovery engine. The app already has embed infrastructure for all four target platforms (Spotify, YouTube, SoundCloud, Bandcamp) plus a complete player, queue, and link categorization system built on MusicBrainz data. V1.6 is not building streaming from scratch — it is wiring the existing infrastructure into a cohesive playback experience with service priority, source switching, and album playback from release pages.

The research reveals that the realistic scope of v1.6 is significantly simpler than originally planned, and in a good way. Spotify's February 2026 policy changes and the confirmed Widevine CDM failure in WebView2 (Conflict 2, resolved) eliminate the Spotify Web Playback SDK entirely. Spotify integration is the embed iframe that already exists. SoundCloud is already the most complete integration in the codebase (oEmbed + Widget API hooks already wired). YouTube works via existing embed but requires an Error 153 fallback for production builds. Bandcamp is the open question (Conflict 1, pending a 30-minute spike). The bulk of v1.6 engineering is: service priority UI (replace single dropdown with ordered list), source switcher on artist pages, player bar service badge, and activating the Bandcamp embed path.

The critical pre-implementation action is establishing an `activeSource` coordination state before touching any streaming service. Without it, multiple audio sources play simultaneously and the problem cannot be cleanly retrofitted. This is the architectural foundation for the entire milestone. Once that is in place, each service can be added incrementally with low risk using the existing `src/lib/embeds/` infrastructure as the building blocks.

---

## Key Findings

### Recommended Stack

The stack for v1.6 requires minimal new dependencies. Everything critical is already installed. Net-new additions are: `@tauri-apps/plugin-store` (npm) and `tauri-plugin-store` (Rust) for preference and token storage, and `@types/spotify-web-playback-sdk` (dev devDep) for TypeScript types on the embed helper functions. The SoundCloud Widget API and YouTube IFrame API are CDN scripts loaded at runtime if programmatic control is needed; neither requires an npm package. The PKCE OAuth infrastructure (`tauri-plugin-oauth`, `@fabianlars/tauri-plugin-oauth`) is already installed and proven in the existing Spotify taste-import flow.

**Core technologies (existing, no changes needed):**
- Tauri 2.0 + WebView2 (Windows): desktop shell
- `tauri-plugin-oauth` + `@fabianlars/tauri-plugin-oauth`: OAuth redirect server — already installed, reuse the pattern from the taste-import flow
- `src/lib/embeds/spotify.ts`, `youtube.ts`, `soundcloud.ts`, `bandcamp.ts`: embed URL generators — extend, do not replace
- `src/lib/player/`: complete player module — add `activeSource` field only
- `tauri-plugin-shell`: already installed, used for opening external URLs

**New additions:**
- `@tauri-apps/plugin-store` + `tauri-plugin-store` (Rust): token and preference storage (do not use Stronghold — deprecated and removed in Tauri v3)
- `@types/spotify-web-playback-sdk` (devDep): TypeScript type definitions
- SoundCloud Widget API (CDN, runtime): programmatic pause/play control of SC embed
- YouTube IFrame API (CDN, optional): programmatic control if needed

**Critical platform fact:** On Windows, Tauri serves the app from `http://tauri.localhost`. This is a real HTTP origin that satisfies YouTube's embed validation. YouTube IFrame Error 153 only affects macOS/Linux (not applicable here — BlackTape is Windows-only). However, Error 153 does manifest in production `.msi` installs in some environments (see Pitfalls). Always test YouTube in a production build, not just `npm run tauri dev`.

**Spotify redirect URI:** Must use `http://127.0.0.1` (loopback IP literal), never `http://localhost`. `localhost` as hostname has been rejected by Spotify since November 27, 2025. The `tauri-plugin-oauth` dynamic port pattern is compatible — register `http://127.0.0.1` without a port, supply port at runtime.

See `.planning/research/STACK.md` for the complete version table, alternatives considered (including why Stronghold is ruled out), and installation commands.

### Expected Features

**Must have (v1.6 core — P1):**
- Bandcamp embed plays in-app (pending Conflict 1 spike — P1 if `url=` works, deferred to v1.7 if not)
- Auto-load preferred service embed without requiring a click-to-reveal
- Service priority as an ordered list, not a single dropdown — persisted across sessions
- Source switcher on artist page ("Also on: [SC] [YT]") after initial embed loads
- Player bar service badge ("via Bandcamp" / "via SoundCloud") derived from `activeSource`
- "Play Album" on release pages reveals the best available streaming embed for that release
- SoundCloud Widget API play/pause control verified working for queue integration

**Should have (v1.6.x — P2, after P1 stable):**
- Spotify UX guidance: inline callout "For full tracks, log in to Spotify in BlackTape" when Spotify is active service
- YouTube "Watch on YouTube" CTA clarity when only a channel URL exists (not a video URL)
- Bandcamp embed dark-theme parameters matching current app theme CSS variables

**Defer to v1.7+:**
- Queue-level track resolution (populate queue with individual tracks resolved to service URLs via APIs — requires API quotas and rate limit handling)
- Spotify extended access + Web Playback SDK (requires organization status + 250K MAU — not feasible at current scale)
- SoundCloud track-level embed (embed specific tracks; currently only artist page oEmbed)
- YouTube Data API search (100 units per query, 10,000 units/day default — exhausted at 100 artist visits/day)

**Hard anti-features (never for v1.6):**
- Spotify Web Playback SDK (Widevine CDM not available in WebView2 — Conflict 2 resolved)
- Bundled shared Spotify `client_id` (5-user Development Mode cap as of February 2026)
- Cross-platform artist search to find content not in MusicBrainz (requires API keys, unreliable name matching, wrong-region results)
- YouTube Data API calls at page load (quota exhaustion; 100 units per search)
- Bandcamp scraping for numeric IDs (fragile, against ToS — superseded by `url=` spike if Conflict 1 resolves favorably)

See `.planning/research/FEATURES.md` for the complete prioritization matrix, feature dependency graph, and competitor comparison table against Parachord.

### Architecture Approach

The architecture centers on a new `src/lib/streaming/` module that sits between the existing artist page and the existing player. Service availability is detected from `PlatformLinks` (already populated from MusicBrainz data — zero new API calls at page load). Resolution fires lazily when the user clicks play for a specific service. A `resolver.ts` dispatches to the correct embed path based on user service priority. A global `activeSource` state coordinates pause/play across local and streaming audio to prevent simultaneous playback. Token and priority data is stored in the existing `ai_settings` table in `taste.db` using the `set_ai_setting`/`get_ai_setting` Tauri command pattern already used throughout the app for preferences. No new Rust commands are required.

**Major new components:**
1. `src/lib/streaming/state.svelte.ts` (NEW) — reactive: active source, service connection status
2. `src/lib/streaming/resolver.ts` (NEW) — given artist links + priority order, dispatches to correct embed path
3. `src/lib/streaming/service-priority.svelte.ts` (NEW) — ordered service list, persisted to `taste.db`
4. `StreamingPanel.svelte` (NEW) — artist page UI: available service badges, play button, source switcher
5. `ServiceBadge.svelte` (NEW) — player bar: "via {Service}" label derived from `activeSource`

**Modified existing files:**
6. `player/state.svelte.ts` — add `activeSource: 'local' | 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | null`
7. `theme/preferences.svelte.ts` — migrate `streamingPref.platform` (string) to `streamingPref.priorityOrder` (ordered array); migration guard required for existing saved preferences
8. `settings/+page.svelte` — replace platform dropdown with drag-to-reorder streaming section

**Key patterns:**
- Lazy resolution: availability shown from existing link data; API calls fire only on user-initiated play
- One active iframe at a time: show only the selected service embed; unmount others to prevent simultaneous audio and SoundCloud postMessage conflicts
- `activeSource` as architectural foundation: must be built before any individual service implementation
- OAuth token stored as module-scoped variable in `spotify-auth.ts`, not in Svelte `$state` (keeps token out of DevTools and serialized component state)

See `.planning/research/ARCHITECTURE.md` for the complete component map, data flow diagrams, anti-patterns, and the recommended 6-phase build order with risk assessment per phase.

### Critical Pitfalls

1. **Spotify Web Playback SDK fails in WebView2 (Widevine CDM unavailable)** — Do not use the SDK. Embed iframe only. This is a confirmed architecture decision, not a test question. See Conflict 2 resolution. (PITFALLS.md Pitfall 1)

2. **Multiple audio sources play simultaneously without an `activeSource` coordination layer** — Build `activeSource` state first, before any service integration. It cannot be cleanly retrofitted after multiple services are implemented. SoundCloud supports programmatic pause via Widget API; YouTube via IFrame API `pauseVideo()`; Spotify and Bandcamp iframes have no external control API and must be unmounted to stop them. (PITFALLS.md Pitfall 5)

3. **YouTube IFrame Error 153 in production builds** — YouTube embeds work in `npm run tauri dev` but can fail in production builds with Error 153. Always test YouTube in a production build (`.msi` install). Implement the Error 153 fallback (`onError` handler replacing the player with a "Watch on YouTube" button) as part of initial implementation, not as a post-ship bug fix. (PITFALLS.md Pitfall 2)

4. **Spotify OAuth: `localhost` redirect URI rejected since November 2025** — Register and use `http://127.0.0.1` (loopback IP literal), not `http://localhost`. The `tauri-plugin-oauth` dynamic port pattern is compatible with the loopback IP approach. Any OAuth phase must have this constraint in the spec before code is written. (PITFALLS.md Pitfall 3)

5. **Spotify client_id 5-user Development Mode cap (February 2026)** — Do not bundle a shared `client_id`. Each user provides their own from the Spotify developer dashboard (free, takes ~2 minutes). Follow the same per-user client_id model as the existing taste-import flow. (PITFALLS.md Pitfall 4)

6. **Spotify token refresh race condition** — PKCE refresh token rotation immediately invalidates the old refresh token. Two concurrent near-expiry API calls can both attempt refresh; the second receives a 400 on an already-invalidated token. Implement a single-flight mutex: if a refresh is in progress, subsequent callers wait for the in-progress Promise rather than starting a new one. (PITFALLS.md Pitfall 6)

7. **Bandcamp embeds not universally available** — Artists can disable streaming per-release; Bandcamp Pro allows domain-restricted embeds; free accounts have per-track streaming limits. Implement "try and fallback": if no playable audio state is detected within 5 seconds of iframe load, collapse the embed and show "Visit on Bandcamp" with a direct link. (PITFALLS.md Pitfall 7)

See `.planning/research/PITFALLS.md` for the complete 11-pitfall breakdown including moderate pitfalls, integration gotchas, performance traps, security mistakes, UX pitfalls, and the "looks done but isn't" verification checklist.

---

## Implications for Roadmap

Based on combined research, a six-phase structure is recommended. The ordering is driven by hard dependencies: `activeSource` state must exist before any service; Settings UI can be built standalone to validate the priority persistence migration; services proceed in order of integration completeness and risk; release page album playback comes last because it depends on the full streaming foundation being stable and on the Bandcamp spike outcome.

---

### Phase 1: Streaming Foundation — activeSource State + Settings Priority UI

**Rationale:** The `activeSource` coordination state is the architectural prerequisite for every subsequent phase. PITFALLS.md is unambiguous: this cannot be retrofitted after multiple services are implemented. The Settings drag-to-reorder UI is built at the same time because it has no external dependencies — it is pure UI plus `taste.db` persistence and validates the `streamingPref.priorityOrder` array migration before any service depends on it.

**Delivers:**
- `src/lib/streaming/state.svelte.ts` with `activeSource` typed state
- `src/lib/streaming/service-priority.svelte.ts` with ordered array persistence to `taste.db`
- Migration guard for existing `streamingPref.platform` (string) to `streamingPref.priorityOrder` (array)
- Settings > Streaming: replace single dropdown with drag-to-reorder ordered list plus per-service enable/disable
- `ServiceBadge.svelte` stub in player bar (renders "via {Service}", initially null)

**Avoids:** Simultaneous audio (Pitfall 5), the un-retrofittable `activeSource` problem

**Research flag:** Standard patterns. No additional research needed. All patterns exist in the codebase.

---

### Phase 2: SoundCloud First-Class

**Rationale:** SoundCloud is the most complete integration in the codebase. oEmbed fetch already runs at page load. Widget API is already partially wired in `EmbedPlayer.svelte`. This phase has the lowest risk and delivers real playback quickly, validating the `StreamingPanel` component that all subsequent services will reuse.

**Delivers:**
- `StreamingPanel.svelte` initial version — SoundCloud path only
- `resolver.ts` initial version — SoundCloud dispatch path
- SoundCloud auto-load when it is the top-priority service (remove click gate for preferred service)
- Source switcher UI placeholder for other services (extended in Phases 3-4)
- `activeSource` set to `'soundcloud'` on play; local audio paused via coordination layer
- SoundCloud Widget API play/pause/seek verified working
- Player bar ServiceBadge shows "via SoundCloud"

**Avoids:** SoundCloud postMessage conflict (Pitfall 8) by ensuring only one iframe is active at a time; ghost audio on navigation

**Research flag:** Standard patterns. Widget API is well-documented. No additional research needed.

---

### Phase 3: Bandcamp Embed (conditional on Conflict 1 spike)

**Rationale:** Bandcamp represents the core BlackTape audience — independent and underground artists. If the `url=` parameter resolves Conflict 1 in favor of FEATURES.md, this is high-value and low-complexity. If the spike shows the numeric ID requirement stands (ARCHITECTURE.md correct), this phase collapses to "Bandcamp stays external-link-only for v1.6" and Phase 5 adjusts accordingly.

**Spike gate (30 minutes, must run before any Phase 3 code):**
Test the `url=` parameter with a known Bandcamp URL in a local HTML file. If it renders and plays audio: proceed with Bandcamp embed. If it fails: skip embed implementation, update FEATURES.md, close out this phase as a no-op for Bandcamp.

**If `url=` parameter works:**
- Add `bandcampEmbedUrl(url: string): string` to `src/lib/embeds/bandcamp.ts`
- Update `EmbedPlayer` to render iframe for Bandcamp instead of ExternalLink
- Add Bandcamp to `resolver.ts` dispatch
- Implement 5-second load timeout with "Visit on Bandcamp" fallback (Pitfall 7)
- Match embed `bgcol`/`linkcol` to current theme CSS variables
- Player bar ServiceBadge shows "via Bandcamp"

**If `url=` parameter fails:**
- Bandcamp remains external-link-only for v1.6
- Update FEATURES.md, record decision in ARCHITECTURE.md and BUILD-LOG.md
- Phase 5 album playback uses SoundCloud/YouTube/Spotify fallback chain only
- Defer Bandcamp embed to v1.7

**Avoids:** Pitfall 7 (Bandcamp unavailability fallback), Pitfall 5 (activeSource coordination for unmount-to-stop)

**Research flag:** SPIKE REQUIRED FIRST. 30-minute implementation test before writing any production code. See Conflict 1 above for exact test procedure.

---

### Phase 4: YouTube Embed

**Rationale:** YouTube has the most gotcha-dense integration (Error 153 production build risk) so it goes after the pattern is established with SoundCloud and Bandcamp. The core logic is simple — `youtubeEmbedUrl()` already exists — but the production build testing requirement makes this a careful phase that needs its own completion gate.

**Delivers:**
- YouTube added to `resolver.ts` dispatch
- Video URLs (`/watch?v=`, `youtu.be/`) embedded in `StreamingPanel` via existing `youtubeEmbedUrl()`
- Channel URLs (`/@handle`, `/c/`, `/user/`) render "Watch on YouTube" button via `tauri-plugin-shell` `open()`
- Error 153 fallback: `onError` handler replaces player area with "Watch on YouTube" button
- YouTube auto-load when it is the top-priority service
- Mandatory production build smoke test before phase is marked complete

**Avoids:** YouTube Error 153 shipping without fallback (Pitfall 2); never test YouTube embed only in `npm run tauri dev`

**Research flag:** No additional research needed. The Error 153 fallback pattern is clear. The mandatory production build test is the risk gate.

---

### Phase 5: Release Page Album Playback

**Rationale:** This feature depends on both the `StreamingPanel` foundation (Phases 1-2) and the Bandcamp spike result (Phase 3). The "Play Album" button on release pages resolves the best available embed for that specific release using `release.links` data. Phase 3's outcome determines whether Bandcamp appears in the fallback chain.

**Delivers:**
- Release page "Play Album" button (currently a stub with `handlePlayAlbum()` that does nothing — the stub comment states "requires local file matching" which is outdated; v1.6 uses streaming embeds)
- Service resolution for the release: Bandcamp `url=` embed first (if Phase 3 succeeded), SoundCloud oEmbed second, Spotify artist embed third, YouTube fourth
- "Play Album" button hidden entirely when `release.links` has no streaming URLs for any service
- Bandcamp album-specific embed uses the release's Bandcamp URL from `release.links` (not the artist-level URL)

**Avoids:** The outdated local file matching assumption in the existing stub

**Research flag:** No additional research needed. Logic follows directly from existing `release.links` data structure.

---

### Phase 6: Spotify UX Guidance + P2 Polish

**Rationale:** After core playback is working across SoundCloud, Bandcamp (or not), and YouTube, the Spotify experience and rough edges need a cleanup pass. Spotify embed already works today — this phase is about user-facing clarity and polishing interactions found to be rough during earlier phase testing.

**Delivers:**
- Inline guidance on artist pages when Spotify is the active service: "For full tracks, log in to Spotify in BlackTape"
- YouTube "Watch on YouTube" CTA clarity when only a channel URL exists
- Bandcamp dynamic theme parameters: read current CSS variables in JS, pass `bgcol`/`linkcol` to embed URL (if Phase 3 succeeded)
- Source switcher completed for all available services across all phases
- Full regression pass with all services active

**Avoids:** UX pitfalls: no indication Spotify Premium is required (PITFALLS.md UX section), YouTube blank player with no explanation

**Research flag:** No research needed. This is polish, UX copy, and CSS parameter adjustments.

---

### Phase Ordering Rationale

- `activeSource` state first because it is the only piece that cannot be added after the fact without touching every service implementation
- SoundCloud second because it has the lowest risk and validates the `StreamingPanel` component that all services share
- Bandcamp before YouTube because Bandcamp audience alignment is higher for BlackTape; the spike gates the phase so no wasted effort occurs if it fails
- YouTube fourth because its Error 153 complexity is self-contained and handled cleanly as a standalone phase
- Release page album playback fifth because it requires embed infrastructure from Phases 2-4 to be stable and depends on the Bandcamp spike outcome
- Polish last with no dependencies

---

### Research Flags

**Needs implementation spike (not a full research-phase):**
- Phase 3 (Bandcamp embed): 30-minute spike to resolve Conflict 1 before writing any production code. Spike result determines Phase 3 and Phase 5 scope.

**Standard patterns — no research-phase needed:**
- Phase 1 (Streaming foundation): Svelte 5 state patterns and `ai_settings` persistence are established in the existing codebase
- Phase 2 (SoundCloud): Widget API is well-documented; oEmbed pattern already works in production
- Phase 4 (YouTube): Pattern is clear; the production build smoke test is the risk gate, not missing knowledge
- Phase 5 (Album playback): Logic follows directly from existing `release.links` data structure
- Phase 6 (Polish): UX copy and CSS parameter adjustments — no unknowns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All platform facts verified against official docs and live GitHub issues. Spotify policy changes confirmed via official Spotify developer blog and TechCrunch. Tauri WebView2 YouTube behavior confirmed via Tauri maintainer-closed issue #14422 (December 2025). Stronghold deprecation confirmed via Tauri maintainer comment. |
| Features | HIGH | Table stakes and anti-features are well-defined. Spotify February 2026 policy is the highest-confidence finding in the entire research set (official blog + TechCrunch corroboration). The Bandcamp `url=` parameter (Conflict 1) is the single uncertain feature finding. |
| Architecture | HIGH (with one exception) | Overall approach — lazy resolution, `activeSource` coordination, `ai_settings` storage — is well-grounded in the existing codebase. Exception: ARCHITECTURE.md's Bandcamp section directly contradicts FEATURES.md. All other architectural recommendations are consistent and well-sourced. |
| Pitfalls | HIGH | Spotify SDK / Widevine failure is confirmed across three GitHub issues dating to 2018 with no resolution. YouTube Error 153 is confirmed by Tauri maintainer. All Spotify policy changes confirmed via official sources. SoundCloud postMessage conflict confirmed via SoundCloud's own GitHub issue tracker. |

**Overall confidence:** HIGH for all decisions this research enables, with one pending spike (Bandcamp `url=` parameter) that has no downstream blocking effect on Phases 1, 2, 4, or 6.

### Gaps to Address

- **Bandcamp `url=` parameter (Conflict 1):** Spike in the first 30 minutes of Phase 3. The answer determines whether Bandcamp is a P1 v1.6 feature or deferred to v1.7. This does not block any other phase.

- **YouTube Error 153 in production builds:** Confirmed to affect production builds in some environments. Mitigation (Error 153 fallback button) is documented and straightforward. The gap is that no production build has been tested yet with the current embed implementation. Phase 4 must include a mandatory production build smoke test as a blocking completion gate.

- **SoundCloud Widget API binding after Svelte component remount:** The Widget API binds to a specific iframe element reference. Svelte's component lifecycle unmounts and remounts iframes on navigation. Verify during Phase 2 that the Widget API binding is correctly re-established after navigation — this has not been tested and could cause ghost audio (audio continuing from an unmounted component). Address in Phase 2 before declaring it complete.

- **Spotify developer dashboard app registration:** If Spotify OAuth is added for any future feature, the redirect URI must be `http://127.0.0.1` (no port) registered in the Spotify dashboard. If the existing taste-import app registration uses `localhost`, it will need to be updated. Check the existing registration before writing any new OAuth code.

---

## Sources

### Primary (HIGH confidence)
- [Spotify developer blog — Update on developer access (Feb 2026)](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security) — 5-user cap, Premium requirement, organization-only extended access
- [Spotify developer blog — Security requirements (Feb 2025)](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify) — localhost redirect URI rejection
- [Spotify developer blog — OAuth Migration reminder (Oct 2025)](https://developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025) — November 2025 enforcement date
- [Spotify docs — Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) — 127.0.0.1 allowed, localhost blocked
- [Spotify docs — Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) — 5-user dev limit, 250K MAU for extended access
- [Spotify docs — Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) — Premium required, EME/Widevine dependency
- [Spotify Web Playback SDK GitHub #41](https://github.com/spotify/web-playback-sdk/issues/41) — "Failed to initialize player" in Electron/WebView (2018 to present, unresolved)
- [Spotify Web Playback SDK GitHub #7](https://github.com/spotify/web-playback-sdk/issues/7) — Electron/desktop Widevine CDM discussion
- [Spotify Web Playback SDK GitHub #2](https://github.com/spotify/web-playback-sdk/issues/2) — requestMediaKeySystemAccess in cross-origin contexts
- [Tauri GitHub #14422](https://github.com/tauri-apps/tauri/issues/14422) — YouTube IFrame Error 153 on Windows (tauri.localhost), closed December 2025
- [FabianLars/tauri-plugin-oauth GitHub](https://github.com/FabianLars/tauri-plugin-oauth) — Plugin API, v2.0.0 for Tauri v2
- [SoundCloud Widget API docs](https://developers.soundcloud.com/docs/api/html5-widget) — SC.Widget(), event binding, CDN URL
- [Bandcamp help — Creating an embedded player](https://get.bandcamp.help/hc/en-us/articles/23020711574423) — Official embed format using numeric IDs
- [TechCrunch — Spotify API changes Feb 2026](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/) — Confirms 5-user limit and Premium requirement
- [Tauri community discussion #7846](https://github.com/orgs/tauri-apps/discussions/7846) — Stronghold deprecated, removed in Tauri v3
- Direct codebase inspection — `src/lib/embeds/`, `src/lib/player/`, `src/lib/taste/import/spotify.ts`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src/lib/theme/preferences.svelte.ts`

### Secondary (MEDIUM confidence)
- [Bluesky social-app PR #6761](https://github.com/bluesky-social/social-app/pull/6761) — Evidence for Bandcamp `url=` parameter (Conflict 1 — needs spike to confirm)
- [SoundCloud JavaScript GitHub #15](https://github.com/soundcloud/soundcloud-javascript/issues/15) — postMessage conflict with multiple iframes
- [GitHub: spotifyr issue #224](https://github.com/charlie86/spotifyr/issues/224) — Community confirmation localhost fails, 127.0.0.1 works after November 2025
- [Spotify extended access criteria update (Apr 2025)](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access) — 250K MAU + registered organization for extended access

### Tertiary (LOW confidence — validate in implementation)
- SoundCloud Widget API re-binding behavior after Svelte component remount on navigation — not yet smoke-tested; validate in Phase 2
- Bandcamp `url=` parameter working in practice — single PR source (Bluesky social-app); validate via 30-minute spike in Phase 3

---

*Research completed: 2026-02-26*
*Ready for roadmap: YES (with Conflict 1 spike as Phase 3 gate)*
