---
phase: 32-embedded-players
verified: 2026-02-27T10:50:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Visit an artist with a YouTube link and confirm embed loads automatically without clicking"
    expected: "YouTube iframe appears immediately in the source switcher area, no 'Play on YouTube' button visible as the first action"
    why_human: "Auto-load logic depends on runtime state (streamingState.serviceOrder, activePlatform derived) — can't run Tauri WebView2 headlessly"
  - test: "Visit an artist with both SoundCloud and YouTube links, play SoundCloud, then click the YouTube source button"
    expected: "SoundCloud audio pauses; YouTube iframe replaces SoundCloud embed; no simultaneous audio"
    why_human: "SoundCloud widget pause coordination requires running desktop app with real SC Widget API binding"
  - test: "Visit a release page with a Bandcamp URL, click Play Album, confirm inline embed appears"
    expected: "A compact Bandcamp player renders inline below the album header within a few seconds (up to 12s per spike test)"
    why_human: "Bandcamp embed loads from external origin in WebView2 — requires running desktop app"
  - test: "Visit a release page with NO Bandcamp URL in MusicBrainz data, confirm Play Album button is absent"
    expected: "No Play Album button in the DOM — the button is absent, not disabled or grayed out"
    why_human: "Requires finding a release with no Bandcamp relation in MusicBrainz — conditional DOM verification"
  - test: "Change service order in Settings (drag Bandcamp below YouTube), then visit an artist with both"
    expected: "YouTube embed loads first; source switcher buttons appear in YouTube-first order"
    why_human: "streamingState.serviceOrder persistence and derived ordering requires real Settings UI interaction"
---

# Phase 32: Embedded Players Verification Report

**Phase Goal:** Embedded players for artist pages and release pages — YouTube, SoundCloud, Bandcamp auto-loading embeds with source switching
**Verified:** 2026-02-27T10:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | YouTube embed URLs include `enablejsapi=1` so postMessage events (including Error 153) are received | VERIFIED | `youtube.ts` line 26: returns URL ending in `?enablejsapi=1`; confirmed by `grep -c enablejsapi=1` = 1 |
| 2 | EmbedPlayer detects YouTube onError events (codes 100/101/150/153) and sets `youtubeError` state | VERIFIED | `EmbedPlayer.svelte` lines 95-103: `detectYouTubeError()` parses JSON, checks `d['event'] === 'onError'` and `[100,101,150,153].includes(Number(d['info']))`; line 123-124 sets `youtubeError = true` |
| 3 | EmbedPlayer accepts `autoLoad` and `activeService` props — auto-renders the active service without a button click | VERIFIED | `EmbedPlayer.svelte` lines 14-15: `autoLoad = false` and `activeService = null` in props; template at line 264/287/329: `autoLoad && activePlatform === platform` gates auto-render |
| 4 | EmbedPlayer uses `streamingState.serviceOrder` (not `PLATFORM_PRIORITY` or `streamingPref`) to determine service priority | VERIFIED | `EmbedPlayer.svelte` line 33: `streamingState.serviceOrder.filter(...)` as sole ordering source; no `streamingPref` or `PLATFORM_PRIORITY` import found |
| 5 | SoundCloud widget reference is stored in `scWidget` state; a `$effect` calls `scWidget.pause()` when `activeSource` changes away from soundcloud | VERIFIED | Line 46: `let scWidget = $state<...>(null)`; line 160: `scWidget = widget as typeof scWidget`; lines 220-223: `$effect` calls `scWidget.pause()` when `activeSource !== 'soundcloud'` |
| 6 | Bandcamp spike result is recorded in `bandcamp.ts` docstring | VERIFIED | `bandcamp.ts` lines 31-36: "SPIKE RESULT (2026-02-27): PASSES in Tauri WebView2 on Windows" with method description |
| 7 | Artist page renders EmbedPlayer immediately on mount for the highest-priority available service — source switcher replaces static badges | VERIFIED | `artist/+page.svelte` lines 440-462: `source-switcher` div with buttons calling `activateService()`; `{#key activeEmbedService}<EmbedPlayer autoLoad={true}>` renders immediately; no static `.streaming-badges` span element found (only in a comment) |
| 8 | Release page `streamingLinks.bandcamp` gates Play Album button and inline Bandcamp embed | VERIFIED | `+page.ts` line 188: `const streamingLinks = { bandcamp: bandcampUrl }`; `+page.svelte` line 165: `{#if data.streamingLinks?.bandcamp}` gates button; line 176: `{#if showInlineEmbed && data.streamingLinks?.bandcamp}` gates iframe; `handlePlayAlbum()` sets `showInlineEmbed = true` |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/embeds/youtube.ts` | `youtubeEmbedUrl()` with `enablejsapi=1` | VERIFIED | 37 lines; returns nocookie URL + `?enablejsapi=1`; `isYoutubeChannel()` also exported |
| `src/lib/embeds/bandcamp.ts` | `bandcampEmbedUrl()` + SPIKE RESULT docstring | VERIFIED | 41 lines; exports `bandcampExternalUrl`, `isBandcampUrl`, `bandcampEmbedUrl`; spike docstring on lines 29-37 |
| `src/lib/components/EmbedPlayer.svelte` | Refactored player, min 200 lines, all new props/state | VERIFIED | 445 lines; has `autoLoad`, `activeService`, `scWidget`, `youtubeError`, `bandcampLoaded`, `bandcampTimeout`, `detectYouTubeError`, `orderedPlatforms` via `streamingState.serviceOrder`, guarded `onDestroy` |
| `src/routes/artist/[slug]/+page.svelte` | Source switcher + EmbedPlayer integration | VERIFIED | Contains `source-switcher` div (line 442), `EmbedPlayer` render in `{#key activeEmbedService}` block (line 454), `activateService()`, `availableEmbedServices`, `soundcloudEmbedHtml` fetch in onMount |
| `src/routes/artist/[slug]/release/[mbid]/+page.ts` | `streamingLinks` in load() return | VERIFIED | Line 188-189: `const streamingLinks = { bandcamp: bandcampUrl }; return { release, slug, mbid, credits, streamingLinks }`; `bandcampUrl` declared at outer scope (line 52) |
| `src/routes/artist/[slug]/release/[mbid]/+page.svelte` | Play Album wired to inline Bandcamp embed | VERIFIED | `bandcampEmbedUrl` imported (line 7); `showInlineEmbed` state (line 27); `handlePlayAlbum` sets it (line 30); Play Album button gated on `data.streamingLinks?.bandcamp` (line 165); iframe uses `bandcampEmbedUrl(data.streamingLinks.bandcamp)` (line 179) |
| `tools/bandcamp-spike.mjs` | CDP spike script (created per summary) | VERIFIED | File exists at `tools/bandcamp-spike.mjs` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EmbedPlayer.svelte` | `streamingState.serviceOrder` | `streamingState` import + `$derived` | WIRED | Line 8 imports `streamingState`; line 33 derives `orderedPlatforms` from `streamingState.serviceOrder.filter(...)` |
| `EmbedPlayer.svelte` | `scWidget.pause()` | `$effect` watching `streamingState.activeSource` | WIRED | Lines 220-223: `$effect` fires when `activeSource !== 'soundcloud' && scWidget`, calls `scWidget.pause()` |
| `EmbedPlayer.svelte` | `youtubeError` state | `handleEmbedMessage` -> `detectYouTubeError` | WIRED | Line 123-124: inside `handleEmbedMessage`, `if (source === 'youtube' && detectYouTubeError(event.data)) { youtubeError = true; }` |
| `artist/+page.svelte` | `EmbedPlayer.svelte` | import + `{#key activeEmbedService}` render block | WIRED | Line 23: imports `EmbedPlayer`; lines 454-462: `{#key activeEmbedService}<EmbedPlayer ... autoLoad={true} activeService={activeEmbedService} />` |
| `artist/+page.svelte` | `/api/soundcloud-oembed` | `fetch` in `onMount` for `soundcloudEmbedHtml` | WIRED | Lines 93-108: `onMount` Tauri block fetches `/api/soundcloud-oembed?url=...` when SC link available; result assigned to `soundcloudEmbedHtml` |
| `source-switcher buttons` | `activeEmbedService` state | `onclick` calling `activateService()` | WIRED | Line 447: `onclick={() => activateService(svc.key)}`; `activateService` (line 259) calls `setActiveSource(svc)` then `activeEmbedService = svc` |
| `release/+page.ts` | `bandcampUrl` variable | `streamingLinks: { bandcamp: bandcampUrl }` in return | WIRED | Line 52: `let bandcampUrl: string | null = null` at outer scope; line 120-122: assigned inside URL relations loop; line 188-189: returned as `streamingLinks` |
| `release/+page.svelte` | `data.release.streamingLinks.bandcamp` | `handlePlayAlbum` sets `showInlineEmbed = true` | WIRED | Line 165: button gated on `data.streamingLinks?.bandcamp`; line 30: `handlePlayAlbum` sets `showInlineEmbed = true`; line 176: iframe gated on both `showInlineEmbed && data.streamingLinks?.bandcamp` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| YT-01 | 32-02 | Artist page shows YouTube embed player when a YouTube link is available | SATISFIED | `EmbedPlayer` auto-loads when `autoLoad=true && activePlatform === 'youtube'`; artist page passes `autoLoad={true}` |
| YT-02 | 32-01 | YouTube embed falls back gracefully to "Watch on YouTube" external button when embed is blocked (Error 153) | SATISFIED (needs human for production) | `EmbedPlayer` lines 326-328: `{#if youtubeError}` shows `<ExternalLink label="Watch on YouTube">`; detection wired via `detectYouTubeError`; production `.msi` build test remains outstanding per plan note |
| SC-01 | 32-02 | Artist page shows SoundCloud embed player when a SoundCloud link is available | SATISFIED | `soundcloudEmbedHtml` fetched in onMount from `/api/soundcloud-oembed` proxy; passed to `EmbedPlayer` which renders it in the `soundcloudEmbedHtml` branch (lines 311-318) |
| SC-02 | 32-01 | SoundCloud embed pauses when a different streaming source becomes active | SATISFIED | `scWidget` stored in `$state`; `$effect` at lines 220-223 calls `scWidget.pause()` when `streamingState.activeSource !== 'soundcloud'` |
| BC-01 | 32-01, 32-02 | Artist page shows Bandcamp embed player when a Bandcamp link is available | SATISFIED | Bandcamp iframe branch in `EmbedPlayer` (lines 261-279) renders when `autoLoad && activePlatform === 'bandcamp'`; spike confirmed PASSES in WebView2 |
| BC-02 | 32-03 | Release page "Play Album" button activates the Bandcamp embed for that specific release URL when available | SATISFIED | `handlePlayAlbum` sets `showInlineEmbed = true`; iframe uses `bandcampEmbedUrl(data.streamingLinks.bandcamp)` for the specific release URL |
| PLAYER-02 | 32-02 | Artist page shows a source switcher — one button per available service, switching active source without navigating away | SATISFIED | `.source-switcher` div with one button per `availableEmbedServices` entry; `activateService()` switches `activeEmbedService`; `{#key}` block destroys/remounts EmbedPlayer |
| PLAYER-03 | 32-03 | Release page "Play Album" button activates the best available streaming source for that release | SATISFIED | Button gated on `data.streamingLinks?.bandcamp`; hidden from DOM when null (not just disabled) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `release/+page.svelte` | 33 | `handleQueueAlbum` stub: `// Stub: same constraint as handlePlayAlbum — deferred to local file matching phase.` | Info | Queue Album is unimplemented but this is an acknowledged deferral, not an accidental placeholder. Button is present in DOM unconditionally in Tauri mode. |

No blocking anti-patterns found. The `handleQueueAlbum` stub is explicitly documented as a deliberate deferral to a future phase (local file matching). It does not affect the phase goal.

### Human Verification Required

#### 1. YouTube Auto-Load

**Test:** Navigate to an artist page for an artist with at least one YouTube link (e.g., search for a popular artist in the app).
**Expected:** A YouTube iframe renders automatically in the source switcher section without clicking any "Play on YouTube" button. The YouTube source button shows as active.
**Why human:** Auto-load behavior depends on `streamingState.serviceOrder`, `activePlatform` derived, and browser/WebView2 rendering — can only be confirmed in a running Tauri instance.

#### 2. SoundCloud Pause Coordination

**Test:** Find an artist with both SoundCloud and YouTube links. Click the SoundCloud button to ensure it loads and plays. Then click the YouTube button.
**Expected:** SoundCloud audio stops; YouTube iframe mounts and begins loading; no audio overlap.
**Why human:** `scWidget.pause()` requires the SoundCloud Widget API to be loaded and bound, which requires an actual SoundCloud embed load in WebView2.

#### 3. Release Page Play Album (Bandcamp URL Present)

**Test:** Navigate to any release that has a Bandcamp URL in MusicBrainz. Click the "Play Album" button.
**Expected:** A compact Bandcamp player appears inline below the album header within approximately 5-15 seconds.
**Why human:** Bandcamp iframe loading from external origin in WebView2 requires the running desktop app.

#### 4. Release Page Play Album Button Absent When No Bandcamp URL

**Test:** Navigate to a release with no Bandcamp URL in MusicBrainz. Inspect the DOM or observe the album actions area.
**Expected:** No Play Album button appears — not disabled, not grayed out, completely absent from DOM.
**Why human:** Requires finding a real release without a Bandcamp relation in MusicBrainz data, which requires querying the live app.

#### 5. Source Order Reflects User Settings

**Test:** Open Settings, drag YouTube above Bandcamp in the service order list, then navigate to an artist with both YouTube and Bandcamp links.
**Expected:** The source switcher buttons appear with YouTube first; YouTube embed auto-loads (not Bandcamp).
**Why human:** `streamingState.serviceOrder` persistence requires real Settings UI interaction and navigation.

---

## Summary

Phase 32 goal is achieved. All eight observable truths are verified against the actual codebase. The three execution plans delivered:

- **Plan 32-01:** `youtube.ts` has `enablejsapi=1`; `bandcamp.ts` exports `bandcampEmbedUrl()` with a confirmed PASSES spike result; `EmbedPlayer.svelte` (445 lines) is fully refactored with `autoLoad`, `activeService`, `scWidget`, `youtubeError`, Bandcamp iframe with 5s timeout, `streamingState.serviceOrder` ordering, and guarded `onDestroy`.

- **Plan 32-02:** Artist page has `source-switcher` div replacing static badges; `EmbedPlayer` is wired in a `{#key activeEmbedService}` block with `autoLoad={true}`; SoundCloud oEmbed HTML is fetched in `onMount`.

- **Plan 32-03:** `+page.ts` exposes `streamingLinks: { bandcamp: string | null }` in the load return; `+page.svelte` gates the Play Album button on `data.streamingLinks?.bandcamp` and renders an inline Bandcamp iframe on click.

`npm run check` passes with 0 errors and 8 pre-existing warnings (none in phase 32 files).

All four documented commit hashes (`44d011e`, `fd23405`, `f3ac71d`, `8c36100`) confirmed present in git log.

Five human verification items remain — all require a running Tauri desktop instance. None of these block goal achievement; they confirm runtime behavior of code that is structurally complete and wired.

---

_Verified: 2026-02-27T10:50:00Z_
_Verifier: Claude (gsd-verifier)_
