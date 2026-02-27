# Phase 32: Embedded Players - Research

**Researched:** 2026-02-27
**Domain:** Iframe embed lifecycle management, SoundCloud Widget API, YouTube IFrame API, Bandcamp url= embed, Svelte 5 component patterns, Tauri WebView2 constraints
**Confidence:** HIGH

## Summary

Phase 32 wires up the `EmbedPlayer.svelte` component that already exists but is not yet rendered on the artist page. The core infrastructure (streaming state module, activeSource coordination, postMessage handler, SoundCloud Widget API hooking, source order) is substantially built from Phases 29–30. The primary work is: (1) integrating EmbedPlayer into the artist page header so it auto-loads the highest-priority available service; (2) adding a source switcher UI that replaces the existing static streaming badges; (3) gracefully handling YouTube Error 153 with a "Watch on YouTube" fallback; (4) running the Bandcamp spike; and (5) wiring the release page "Play Album" button to activate a streaming embed.

The most nuanced challenge is the SoundCloud Widget API re-binding after Svelte navigation remount. When a user navigates away from an artist page and back, the component remounts — but the SC Widget API's `bind()` handlers are on the old widget instance and do not transfer. The fix is to call `hookSoundCloudWidget()` again from `onMount` (or `$effect`) every time the component mounts, not just once. This is already partially addressed in EmbedPlayer but the `data-testid`-hooked guard approach must be reset when the component unmounts.

Bandcamp's `url=` parameter is confirmed to work by the Bluesky social app implementation (merged as PR #9445). The spike test verifies it works specifically in Tauri WebView2 with the artist's Bandcamp URL. The 30-minute spike gate is the right call — if it renders, full implementation proceeds; if blank/error, Bandcamp stays as external-link-only.

YouTube Error 153 on Windows: Tauri 2 on Windows uses `http://tauri.localhost` (HTTP origin) which YouTube accepts. However, Error 153 can still occur for individual videos that have embedding disabled by the uploader (which is the uploader's restriction, not a protocol issue). The success criteria correctly mandates testing in a production `.msi` build since dev mode always uses the Vite dev server at `http://localhost:5173`.

**Primary recommendation:** Wire EmbedPlayer into the artist page, add source switcher that replaces existing static streaming badges, handle all edge cases at the component level, run Bandcamp spike first, test YouTube fallback in production build.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SC-01 | Artist page shows SoundCloud embed player when SoundCloud link available | EmbedPlayer.svelte already handles SC via oEmbed HTML injection + Widget API hook. Needs: auto-load (remove click-to-reveal gate for primary embed), re-bind fix on remount |
| SC-02 | SoundCloud embed pauses when a different streaming source becomes active | Requires reactive `$effect` watching `streamingState.activeSource` — SC Widget API has `sc.Widget.load(url)` but pausing via widget requires keeping widget reference. Must call `widget.pause()` when activeSource changes away from soundcloud |
| YT-01 | Artist page shows YouTube embed when YouTube link available | EmbedPlayer already has YouTube iframe. Needs: auto-load (remove click-to-reveal for primary embed), integrate with source switcher |
| YT-02 | YouTube embed falls back to "Watch on YouTube" button when Error 153 occurs | YouTube IFrame API fires `onError` event with code 100/101/150/153. Must add `enablejsapi=1` param and listen for `onError` postMessage to detect error and swap to ExternalLink. Must test in production .msi build. |
| BC-01 | Artist page shows Bandcamp embed when Bandcamp link available (spike-gated) | Spike: `https://bandcamp.com/EmbeddedPlayer/url={encoded_url}/size=large/transparent=true/` — confirmed working by Bluesky social app PR #6761+#9445. 5-second load timeout needed; fallback to "Visit on Bandcamp" |
| BC-02 | Release page Play Album activates Bandcamp embed for that specific release URL | Release page load function already fetches `bandcampUrl` from MB relations (see +page.ts). Need to expose `streamingLinks` from release page load and wire Play Album button to activate embed |
| PLAYER-02 | Artist page source switcher — one button per available service | Replace existing static `.streaming-badges` `<span>` elements with interactive buttons. Clicking a service button sets it as active embed — unmounts previous, mounts new. Must respect `streamingState.serviceOrder` |
| PLAYER-03 | Release page Play Album button activates best available streaming source | Currently a stub with `handlePlayAlbum()` doing nothing. Must: resolve which streaming URLs exist for the release, pick best per serviceOrder, activate streaming embed or navigate to external source |
</phase_requirements>

---

## Current State (Critical for Planning)

The following infrastructure already exists — do NOT rebuild these:

### Already Built

| Component/Module | Location | What It Does |
|-----------------|----------|-------------|
| `EmbedPlayer.svelte` | `src/lib/components/EmbedPlayer.svelte` | Full embed player: YouTube (click-to-reveal), SoundCloud (oEmbed HTML injection + Widget API), Spotify (click-to-reveal), Bandcamp (external link). Has `EMBED_ORIGINS`, `detectPlayEvent`, `handleEmbedMessage`, `hookSoundCloudWidget`, `onDestroy` cleanup |
| `streamingState` | `src/lib/player/streaming.svelte.ts` | `activeSource: StreamingSource`, `serviceOrder: string[]`, `setActiveSource()`, `clearActiveSource()` |
| SoundCloud oEmbed proxy | `src/routes/api/soundcloud-oembed/+server.ts` | Proxies SC oEmbed API (CORS workaround). Returns `{ html: string \| null }` |
| YouTube embed URL builder | `src/lib/embeds/youtube.ts` | `youtubeEmbedUrl(url)` → nocookie embed URL or null; `isYoutubeChannel(url)` |
| Bandcamp URL utility | `src/lib/embeds/bandcamp.ts` | `bandcampExternalUrl(url)`, `isBandcampUrl(url)` — currently external-link-only |
| Streaming badges (static) | `src/routes/artist/[slug]/+page.svelte` L394–410 | Shows `<span>` badges for available services — must be converted to interactive switcher buttons |
| `data.links` structure | `src/routes/artist/[slug]/+page.ts` | `PlatformLinks` with `bandcamp[]`, `spotify[]`, `soundcloud[]`, `youtube[]` already populated from MB |
| Release page bandcampUrl | `src/routes/artist/[slug]/release/[mbid]/+page.ts` | Already fetches `bandcampUrl` from MB relations but does NOT return it in `load()` — must add to return object |
| `inlinePlayerHtml` pattern | Artist page L111–114 | Current raw HTML injection for release card play-inline — will be replaced by proper EmbedPlayer approach |

### What EmbedPlayer Currently DOES NOT Do

- It is NOT currently imported or rendered on the artist page (confirmed by grep)
- It does NOT auto-load the highest-priority service (all iframes are click-to-reveal)
- It does NOT unmount the active iframe when the user switches services (only the `onDestroy` hook clears the source)
- It does NOT expose a way for the parent to programmatically switch the active service
- It does NOT handle YouTube Error 153 (no `onError` listener)
- It does NOT support Bandcamp embed (only external link)
- The SC Widget `data-hooked` guard is never reset on remount — if the component is destroyed and recreated, the new iframe won't get hooked because the old `data.hooked` attribute is gone (it was on the old DOM element) but the `loadedEmbeds` state resets, so actually this should re-hook correctly. Verify in implementation.

---

## Standard Stack

No new npm packages required. All embed capabilities use browser-native `<iframe>` and postMessage. The SoundCloud Widget API is loaded dynamically via a `<script>` tag (already implemented in EmbedPlayer).

### Core (All Already Installed)

| Technology | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| SoundCloud Widget API | Runtime CDN | PLAY/PLAY_PROGRESS events from SC iframe | Loaded from `https://w.soundcloud.com/player/api.js` — already in EmbedPlayer |
| YouTube IFrame API | N/A (postMessage) | Detect play/error events | YouTube sends postMessage JSON with `{event, info}` — already in EmbedPlayer |
| Bandcamp EmbeddedPlayer | N/A (iframe URL) | `url=` param embed | Spike needed; format: `https://bandcamp.com/EmbeddedPlayer/url={encoded}/size=large/transparent=true/` |
| Svelte 5 `$effect` | Runtime | Reactive remount, unmount coordination | Already used in EmbedPlayer |
| Svelte `onDestroy` | Runtime | Clean up postMessage listener | Already used in EmbedPlayer |

### Supporting

| Technology | Purpose | Notes |
|-----------|---------|-------|
| `tauri://localhost` → `http://tauri.localhost` (Windows) | YouTube embed origin | Windows Tauri 2 uses HTTP-like origin; YouTube accepts this. Not an issue on this Windows-only app unless individual videos block embedding |
| `referrerpolicy="no-referrer-when-downgrade"` on iframe | Prevent YouTube Error 153 | Add to YT iframe as precaution — same-origin default may suppress referer |

**Installation:** No new packages. All capabilities are browser-native or already loaded.

---

## Architecture Patterns

### Recommended Component Structure

```
src/lib/components/
├── EmbedPlayer.svelte          # Existing — extend, not replace
│   ├── Props: links, soundcloudEmbedHtml, artistName, activeService? (new)
│   └── Emits: nothing (uses streamingState directly)
└── ExternalLink.svelte         # Existing — already used by EmbedPlayer
```

```
src/routes/artist/[slug]/
├── +page.svelte                # Wire EmbedPlayer; replace static badges with switcher
└── +page.ts                    # No changes needed (data.links already populated)

src/routes/artist/[slug]/release/[mbid]/
├── +page.svelte                # Wire Play Album to streaming embed
└── +page.ts                    # Add streamingLinks to return object
```

### Pattern 1: Auto-Load Primary Embed (SC-01, YT-01, BC-01 prerequisite)

**What:** On artist page mount, auto-load the highest-priority service that has a URL. No click-to-reveal for the primary service.

**How:** EmbedPlayer receives `autoLoad: boolean = true` prop (new). When `autoLoad` is true, the primary service's iframe renders immediately without waiting for a button click. Lower-priority services remain click-to-reveal or hidden until source switcher activates them.

**Implementation:** In EmbedPlayer, replace the `loadedEmbeds[key]` gate for the first/active service with immediate render when `autoLoad` is true.

```typescript
// In EmbedPlayer.svelte
let {
    links,
    soundcloudEmbedHtml,
    artistName,
    autoLoad = false,           // NEW: auto-render primary service
    activeService = null        // NEW: parent can override active service
}: { ... } = $props();

// Determine which service is active (auto-load the first available per serviceOrder)
let activePlatform = $derived(
    activeService
        ?? streamingState.serviceOrder.find(svc => links[svc as PlatformType]?.length > 0) as PlatformType | undefined
        ?? null
);
```

### Pattern 2: Source Switcher (PLAYER-02)

**What:** Replace static `<span class="streaming-badge">` elements in artist page with `<button>` elements. Clicking a button sets `activePlatform` — unmounting the old iframe and mounting the new one.

**How:** Artist page manages `let activeEmbedService = $state<PlatformType | null>(null)`. Switcher buttons call `setActiveEmbedService(key)` which also calls `setActiveSource()`. EmbedPlayer receives `activeService` prop.

**Unmount pattern:** Use Svelte `{#key activePlatform}` to fully unmount/remount EmbedPlayer or the iframe section when the service changes. This guarantees the old iframe is destroyed (stopping audio) and the new one mounts fresh.

```svelte
<!-- Artist page source switcher — replaces existing streaming-badges div -->
<div class="source-switcher">
    {#each availableServices as svc (svc.key)}
        <button
            class="source-btn"
            class:active={activeEmbedService === svc.key}
            onclick={() => { activeEmbedService = svc.key; setActiveSource(svc.key); }}
        >{svc.label}</button>
    {/each}
</div>

<!-- Active embed area — {#key} ensures unmount on service change -->
{#key activeEmbedService}
    <EmbedPlayer
        {links}
        soundcloudEmbedHtml={soundcloudEmbedHtmlStore}
        {artistName}
        autoLoad={true}
        activeService={activeEmbedService}
    />
{/key}
```

### Pattern 3: SoundCloud Widget Re-bind on Svelte Remount (SC-01)

**What:** When user navigates artist → other page → artist, the artist page remounts. EmbedPlayer remounts. `hookSoundCloudWidget()` must fire again on the new iframe.

**Root cause:** The `data-hooked` attribute on old DOM elements is gone (old elements destroyed). But the `loadedEmbeds` state also resets to `{}` on remount (it's a `$state` local to the component). So the `$effect` that checks `key.startsWith('sc-')` will NOT fire because no SC embed has been "loaded" yet in the new instance.

**Fix:** When `autoLoad = true` and SoundCloud is the active platform, the iframe renders immediately WITHOUT going through `loadedEmbeds`. Therefore `hookSoundCloudWidget` must be called from a `$effect` that tracks `soundcloudEmbedHtml` or the `autoLoad && activePlatform === 'soundcloud'` condition.

**Existing code (already in EmbedPlayer):**
```typescript
// Hook SC widget on mount if soundcloudEmbedHtml is already set (non-click-to-load path)
$effect(() => {
    if (soundcloudEmbedHtml) {
        setTimeout(() => {
            const containers = document.querySelectorAll('.sc-embed-container');
            containers.forEach((el) => {
                if (!(el as HTMLElement).dataset.hooked) {
                    (el as HTMLElement).dataset.hooked = 'true';
                    hookSoundCloudWidget(el as HTMLElement).catch(() => {});
                }
            });
        }, 500);
    }
});
```
This effect already handles the non-click-to-load path. Since `soundcloudEmbedHtml` is fetched fresh on each page load (from oEmbed proxy), this will fire after each navigation. The 500ms setTimeout ensures the iframe is in the DOM. This is the correct approach — verify it works.

### Pattern 4: SoundCloud Pause When Source Changes (SC-02)

**What:** When a different service becomes active (activeSource changes away from soundcloud), the SC embed must pause.

**Challenge:** SC Widget API is async and the widget reference lives in the hook function's closure — there's no outer handle to call `.pause()` on.

**Solution:** Store the widget reference in a module-level or component-level `$state` variable during hookSoundCloudWidget. Then in a `$effect` that watches `streamingState.activeSource`, call `widget.pause()` if active changes away from soundcloud.

```typescript
// In EmbedPlayer.svelte
let scWidget = $state<SCWidget | null>(null);

// In hookSoundCloudWidget, after binding:
scWidget = widget;

// Reactive pause when source changes
$effect(() => {
    if (streamingState.activeSource !== 'soundcloud' && scWidget) {
        scWidget.pause();  // SC Widget API method
    }
});
```

**Note:** SC Widget API's `widget.pause()` is documented. Verify it exists in the CDN version. Alternative: call `widget.load(url, { auto_play: false })` to reinit as paused — but `pause()` is simpler.

### Pattern 5: YouTube Error 153 Fallback (YT-02)

**What:** When YouTube fires Error 153 (video not embeddable), replace iframe with "Watch on YouTube" external link button.

**How:** YouTube IFrame API sends postMessage events. For errors, the message is JSON: `{event: "onError", info: <code>}`. Error codes 100, 101, 150, 153 all mean the video can't be played.

**Detection (already in EmbedPlayer's `detectPlayEvent`):** Extend to detect errors:

```typescript
function detectYouTubeError(data: unknown): boolean {
    if (typeof data === 'string') {
        try {
            const d = JSON.parse(data) as Record<string, unknown>;
            // Error 100=not found, 101/150=not embeddable, 153=config error
            return d['event'] === 'onError' && [100, 101, 150, 153].includes(Number(d['info']));
        } catch { return false; }
    }
    return false;
}
```

**State:** Add `let youtubeError = $state(false)` in EmbedPlayer. When error detected, set to true. Render `<ExternalLink>` instead of iframe.

**Important:** The iframe must have `enablejsapi=1` in the URL for YouTube to send postMessage events. Without this parameter, YouTube won't send any events.

```typescript
// In youtubeEmbedUrl() or inline:
const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`;
```

**Production .msi requirement:** Implement the fallback correctly in code — the E2E test can verify the fallback renders when given a known-unembeddable video URL. The production build verification is a separate manual smoke test gate.

### Pattern 6: Bandcamp Spike Protocol

**What:** 30-minute spike to test `url=` parameter in WebView2.

**Spike test:**
```
iframe src = https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/
```
Load in Tauri dev app. Observe: renders player = proceed. Blank or error = external-link-only.

**If spike succeeds:** Update `bandcamp.ts` to add `bandcampEmbedUrl(url)`:
```typescript
export function bandcampEmbedUrl(url: string): string {
    return `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(url)}/size=large/transparent=true/`;
}
```

Add 5-second timeout with fallback:
```typescript
// In EmbedPlayer, for Bandcamp iframe:
let bandcampLoaded = $state(false);
let bandcampTimeout = $state(false);

$effect(() => {
    if (activePlatform === 'bandcamp' && bandcampEmbedHtml) {
        const timer = setTimeout(() => {
            if (!bandcampLoaded) bandcampTimeout = true;
        }, 5000);
        return () => clearTimeout(timer);
    }
});
// iframe onload = () => bandcampLoaded = true
// if bandcampTimeout && !bandcampLoaded → show ExternalLink fallback
```

**If spike fails:** Update `bandcamp.ts` docstring to record the decision. Change BC-01 status to "spike failed — external-link-only for v1.6."

### Pattern 7: Release Page Play Album (BC-02, PLAYER-03)

**What:** The release page "Play Album" button currently has a stub `handlePlayAlbum()` that does nothing. Must activate a streaming embed for the release.

**Data gap:** The release page's `+page.ts` load function already fetches `bandcampUrl` from MB relations but does NOT expose `streamingLinks` in the return object. It also has no YouTube or SoundCloud links for the release.

**Recommended approach:**
1. Update `+page.ts` to return `streamingLinks: { bandcamp: string | null }` (only Bandcamp is available from MB release relations; YouTube and SoundCloud don't appear on release-level MB rels)
2. In `+page.svelte`, `handlePlayAlbum()` checks if `bandcampUrl` exists:
   - Yes: Set `setActiveSource('bandcamp')`, show inline Bandcamp embed (using BC url= param if spike succeeds)
   - No: Hide the Play Album button (requirement: "button hidden when no streaming URLs exist")

**Implementation:**
```typescript
// In release +page.ts, add to return object:
return { release, slug, mbid, credits, streamingLinks: { bandcamp: bandcampUrl } };
```

```svelte
<!-- In release +page.svelte, replace stub: -->
{#if tauriMode && release.streamingLinks?.bandcamp}
    <button class="btn-play-album" onclick={handlePlayAlbum} data-testid="play-album-btn">
        Play Album
    </button>
{/if}

<!-- Show inline Bandcamp embed after activation -->
{#if showInlineEmbed}
    <div class="release-embed-wrap">
        <iframe src={bandcampEmbedUrl(streamingLinks.bandcamp)} ...></iframe>
    </div>
{/if}
```

### Anti-Patterns to Avoid

- **Do NOT keep the `inlinePlayerHtml` / `{@html}` injection approach for new embeds:** This is an anti-pattern used by the release card for inline play. Phase 32 should use proper Svelte components with lifecycle management, not raw HTML strings.
- **Do NOT use a single `loadedEmbeds` dict to gate all services:** When auto-loading, the primary service must render immediately. Using `loadedEmbeds` as the only gate makes auto-load impossible without awkward initialization hacks.
- **Do NOT add a window-level postMessage listener for each embed instance:** EmbedPlayer already adds one listener and routes by origin. Don't duplicate this in the artist page parent.
- **Do NOT call `clearActiveSource()` on source switch:** Only call it in `onDestroy`. Switching services should call `setActiveSource(newService)`, not clear first (avoids a flash where no source is active).
- **Do NOT use `{#if}` for service switching if you need unmount semantics:** Use `{#key activeService}` to ensure the old iframe is destroyed. `{#if}` hides the element but may not destroy it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting SC play events | Custom postMessage parser | SC Widget API's `widget.bind(SC.Widget.Events.PLAY, ...)` | SC's postMessage format is undocumented; Widget API abstracts it |
| Detecting YouTube play/error | Custom parser | Extend existing `detectPlayEvent` / add `detectYouTubeError` | Pattern already exists in EmbedPlayer |
| SC CORS workaround | Client-side fetch with custom headers | Existing `/api/soundcloud-oembed` proxy endpoint | CORS is a browser constraint; server-side proxy is the only solution |
| Bandcamp embed URL construction | Parse album URLs | Simple string interpolation: `https://bandcamp.com/EmbeddedPlayer/url=...` | No parsing needed — pass the full URL as-is |
| Service priority ordering | Custom sort | `streamingState.serviceOrder` already populated from user settings | Already built in Phase 29 |
| Platform link data | API calls | `data.links` from artist page load (PlatformLinks already populated) | Already fetched from MB in +page.ts |

**Key insight:** The EmbedPlayer component is 70% built. This phase is mostly wiring, not building.

---

## Common Pitfalls

### Pitfall 1: SoundCloud Widget Hooks on Old DOM Nodes
**What goes wrong:** After Svelte navigation, the artist page remounts. The `$effect` tracking `soundcloudEmbedHtml` fires, but the `data-hooked` guard (`dataset.hooked`) is on the new iframe — which starts as unhoooked (the old DOM is gone). This should be fine. But if `soundcloudEmbedHtml` is the same value as before, Svelte's reactive system may not re-run the effect since the value didn't change.
**Prevention:** Use `{#key $page.url.pathname}` around the SoundCloud embed section (or the whole EmbedPlayer) to force a full remount on navigation, clearing all state. Alternatively, fetch `soundcloudEmbedHtml` fresh in `onMount` every time.
**Warning signs:** SoundCloud player renders but play button does nothing; Widget events fire but `setActiveSource` is never called.

### Pitfall 2: YouTube Error 153 — Some Videos vs All Videos
**What goes wrong:** Testing with a specific video that happens to have embedding enabled passes, but users encounter Error 153 on videos that don't. This is per-video, not per-platform.
**Why it happens:** Any YouTube video uploader can disable embedding. Error 153 specifically means "this video's owner has disabled embedding." Error 100/101/150 mean similar things.
**Prevention:** Test Error 153 with a known-unembeddable video (e.g., `https://www.youtube.com/watch?v=BaW_jenozKc` — the classic YouTube test video that disables embedding). Confirm the fallback renders.

### Pitfall 3: Bandcamp iframe Blank Without Error
**What goes wrong:** Bandcamp `url=` embed renders a blank white iframe — no error, no content. This is the spike failure case.
**Why it happens:** Bandcamp may not support `url=` parameter in all contexts, or may check the referer. In Tauri WebView2, the origin is `http://tauri.localhost` — Bandcamp may reject this.
**Prevention:** The 30-minute spike is the correct gate. Use a known-good Bandcamp release (Burial's "Untrue" is widely used as a test case). Set a 5-second timeout with fallback.
**Warning signs:** iframe has no visible content after 5+ seconds. Check browser devtools Network tab for requests to `bandcamp.com/EmbeddedPlayer`.

### Pitfall 4: EmbedPlayer onDestroy Clears Source When Switching
**What goes wrong:** When switching services via source switcher, if `{#key}` destroys the old EmbedPlayer and creates a new one, the old one's `onDestroy` calls `clearActiveSource()` — which then clears the source AFTER the new EmbedPlayer has already called `setActiveSource()`.
**Prevention:** Call `setActiveSource(newService)` BEFORE triggering the key change. Or move `clearActiveSource()` out of EmbedPlayer's `onDestroy` — the parent can manage this. Alternatively, check that `activeSource === 'soundcloud'` before clearing (only clear if this component's service was active).
**Warning signs:** Player bar badge disappears briefly or permanently after switching services.

### Pitfall 5: Release Page Play Album — MB Relations Don't Include YT/SC Links
**What goes wrong:** Trying to fetch YouTube or SoundCloud links from MB release-level relations will always return null — MB only stores Bandcamp (and sometimes Spotify) release-group URL relations.
**Prevention:** The release page Play Album button should only activate Bandcamp embed (if spike succeeds). The button should be hidden if no Bandcamp URL exists. Do NOT attempt to find YouTube/SC links from MB release data — they don't exist there.

### Pitfall 6: YouTube `enablejsapi=1` Missing
**What goes wrong:** YouTube postMessage events (including error events) are never sent. The Error 153 fallback never triggers. YouTube just shows a frozen error screen.
**Prevention:** Always add `?enablejsapi=1` to YouTube embed URLs. The existing `youtubeEmbedUrl()` function does NOT include this parameter — update it.
**Warning signs:** `handleEmbedMessage` never fires for YouTube origin.

---

## Code Examples

### SoundCloud Widget API — Key Events

```typescript
// Source: https://developers.soundcloud.com/docs/api/html5-widget
// SC Widget API events used in EmbedPlayer (already implemented)
widget.bind(SC.Widget.Events.PLAY, () => {
    // fires when track starts playing
});
widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
    // e.relativePosition: 0.0 to 1.0
    // e.currentPosition: milliseconds
});
// SC Widget API pause method (need to add for SC-02)
widget.pause(); // pauses the currently playing track
```

### YouTube Error Detection via postMessage

```typescript
// Source: https://developers.google.com/youtube/iframe_api_reference#Events
// YouTube postMessage format (string of JSON):
// Play: {"event":"onStateChange","info":1}
// Error: {"event":"onError","info":153}
// Error codes: 2=invalid param, 5=HTML5 error, 100=not found, 101/150=embedding disabled, 153=config error

function detectYouTubeError(data: unknown): number | null {
    if (typeof data === 'string') {
        try {
            const d = JSON.parse(data) as Record<string, unknown>;
            if (d['event'] === 'onError') return Number(d['info']);
        } catch { return null; }
    }
    return null;
}
```

### YouTube Embed URL with `enablejsapi=1`

```typescript
// Updated youtubeEmbedUrl — must include enablejsapi=1 for postMessage events
export function youtubeEmbedUrl(url: string): string | null {
    for (const pattern of VIDEO_PATTERNS) {
        const match = url.match(pattern);
        if (match) {
            // enablejsapi=1 required for postMessage error events (Error 153 detection)
            return `https://www.youtube-nocookie.com/embed/${match[1]}?enablejsapi=1`;
        }
    }
    return null;
}
```

### Bandcamp Embed URL (if spike succeeds)

```typescript
// Source: confirmed working in Bluesky social app PR #9445 (2024)
// Format: https://bandcamp.com/EmbeddedPlayer/url={encoded_url}/size=large/transparent=true/
export function bandcampEmbedUrl(url: string): string {
    return `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(url)}/size=large/transparent=true/`;
}

// Spike test URL:
// https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fburial.bandcamp.com%2Falbum%2Funtrue/size=large/transparent=true/
```

### Source Switcher — Svelte 5 Pattern

```svelte
<!-- Source switcher: replaces static .streaming-badges in artist page -->
{#if availableServices.length > 0}
    <div class="source-switcher" data-testid="source-switcher">
        {#each availableServices as svc (svc.key)}
            <button
                class="source-btn"
                class:active={activeEmbedService === svc.key}
                onclick={() => activateService(svc.key)}
                data-testid="source-btn-{svc.key}"
            >{svc.label}</button>
        {/each}
    </div>

    <!-- {#key} guarantees unmount/remount on service switch (stops audio) -->
    {#key activeEmbedService}
        <EmbedPlayer
            {links}
            soundcloudEmbedHtml={soundcloudEmbedHtmlStore}
            {artistName}
            autoLoad={true}
            activeService={activeEmbedService}
        />
    {/key}
{/if}
```

### Tauri CSP — No Changes Needed

```json
// Current tauri.conf.json — csp: null means no CSP restrictions
// iframes from soundcloud.com, youtube.com, bandcamp.com are allowed
// No changes to tauri.conf.json required
"security": {
    "csp": null
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `inlinePlayerHtml` = raw HTML string via `{@html}` | Proper iframe component with lifecycle | Old approach used by release card play-inline; Phase 32 uses component-managed iframes |
| Click-to-reveal all embeds | Auto-load primary service | SC-01, YT-01, BC-01 require immediate render without user click |
| Static `<span>` streaming badges | Interactive `<button>` source switcher | PLAYER-02 |
| `handlePlayAlbum()` stub (does nothing) | Activates Bandcamp embed for specific release | PLAYER-03 |
| `youtubeEmbedUrl()` without `enablejsapi=1` | Must add `?enablejsapi=1` | Required for Error 153 detection |

**Deprecated/outdated:**
- `inlinePlayerHtml` pattern: Still used by release card "play inline" for individual tracks (separate from Play Album). Phase 32 does not need to remove this — it's a different feature.

---

## Open Questions

1. **SC Widget `widget.pause()` availability**
   - What we know: SC Widget API documents `pause()` as a method since 2013.
   - What's unclear: Whether the CDN version at `https://w.soundcloud.com/player/api.js` (the only URL used in EmbedPlayer) still exports this method as of 2026.
   - Recommendation: Test in Tauri dev during spike. If `widget.pause()` is not available, use `widget.seekTo(0)` + `widget.unbind(SC.Widget.Events.PLAY)` as a fallback.

2. **YouTube Error 153 on Windows Tauri `http://tauri.localhost`**
   - What we know: Windows uses `http://tauri.localhost` (HTTP origin). The Tauri GitHub issue (#14422) says "For Windows it's working fine" — the HTTP origin satisfies YouTube's referer requirement.
   - What's unclear: Whether Error 153 still occurs on Windows for videos with embedding disabled by the uploader (uploader restriction vs protocol restriction).
   - Recommendation: The production .msi test in the success criteria is the right gate. Error 153 from uploader restrictions is different from the protocol issue. Both should show the fallback.

3. **SoundCloud oEmbed returns `null` for some artist URLs**
   - What we know: The oEmbed proxy returns `{ html: null }` if SC's oEmbed API can't find content for the URL.
   - What's unclear: How common is this for artist-level SoundCloud pages vs track/playlist URLs?
   - Recommendation: When `soundcloudEmbedHtml` is null, fall back to the existing `<ExternalLink>` for soundcloud. Don't show an empty player.

4. **Bandcamp spike: does `url=` work for artist pages (not just album pages)?**
   - What we know: The Bluesky implementation targets album and track URLs. Artist-level URLs (`artist.bandcamp.com`) may not work.
   - What's unclear: MusicBrainz Bandcamp links for artists typically point to the artist homepage, not a specific album. The spike should test both.
   - Recommendation: If artist-level `url=` doesn't work but album-level does, the release page Play Album (BC-02) can use the album URL, while BC-01 (artist page) falls back to ExternalLink.

5. **Release page streaming data: only Bandcamp in MB relations**
   - What we know: The release page `+page.ts` already fetches `bandcampUrl` from MB release group URL relations. YouTube and SoundCloud don't appear in MB release-level relations.
   - What's unclear: Whether to also check artist-level YouTube/SoundCloud links for the Play Album button (not specific to the release, but at least allows activation of the service).
   - Recommendation: Keep it simple — Play Album only activates Bandcamp (specific to the release). If no Bandcamp URL, the button is hidden.

---

## File-by-File Plan Support

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/lib/embeds/youtube.ts` | Add `?enablejsapi=1` to embed URL |
| `src/lib/embeds/bandcamp.ts` | Add `bandcampEmbedUrl(url)` function (if spike succeeds) |
| `src/lib/components/EmbedPlayer.svelte` | Add: auto-load prop, activeService prop, YouTube error detection, Bandcamp iframe, SC pause on source change, scWidget ref stored for external pause |
| `src/routes/artist/[slug]/+page.svelte` | Replace static streaming badges with source switcher buttons; import and render EmbedPlayer; fetch soundcloudEmbedHtml via oEmbed proxy on mount |
| `src/routes/artist/[slug]/release/[mbid]/+page.ts` | Add `streamingLinks: { bandcamp: string \| null }` to return object |
| `src/routes/artist/[slug]/release/[mbid]/+page.svelte` | Wire Play Album button to activate Bandcamp embed; hide button when no streaming URLs |

### Files to Create

| File | What It Does |
|------|-------------|
| None | All new code goes into existing files |

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `src/lib/components/EmbedPlayer.svelte` — full component with SC Widget API, postMessage handler, YouTube iframe, onDestroy cleanup (all lines read 2026-02-27)
- Direct file reads: `src/lib/player/streaming.svelte.ts` — `streamingState`, `setActiveSource`, `clearActiveSource`
- Direct file reads: `src/lib/embeds/youtube.ts`, `soundcloud.ts`, `bandcamp.ts`, `types.ts`
- Direct file reads: `src/routes/artist/[slug]/+page.svelte` — L394–410 (streaming badges), L111–114 (inlinePlayerHtml), L237 (setActiveSource call pattern)
- Direct file reads: `src/routes/artist/[slug]/release/[mbid]/+page.ts` — release load function with bandcampUrl fetch
- Direct file reads: `src-tauri/tauri.conf.json` — `csp: null` (no iframe restrictions)

### Secondary (MEDIUM confidence)
- [Tauri GitHub Issue #14422](https://github.com/tauri-apps/tauri/issues/14422) — YouTube Error 153 in Tauri production. Closed Dec 2025. Key finding: Windows uses `http://tauri.localhost` (HTTP) and works; macOS/Linux use `tauri://localhost` and fail. This app is Windows-only.
- [Bluesky social-app PR #6761](https://github.com/bluesky-social/social-app/pull/6761) — Bandcamp `url=` parameter confirmed working. Follow-up PR #9445 merged to production.
- [YouTube IFrame API Reference](https://developers.google.com/youtube/iframe_api_reference#Events) — `onError` event with error codes 100/101/150/153 sent via postMessage JSON.

### Tertiary (LOW confidence — validate during implementation)
- SoundCloud Widget API `widget.pause()` — documented but not verified in current CDN version. Verify during spike.
- Bandcamp `url=` parameter working in Tauri WebView2 specifically — not directly tested; requires the 30-minute spike.
- YouTube `referrerpolicy="no-referrer-when-downgrade"` as a fix — multiple sources claim it helps but conflicting reports; `enablejsapi=1` is the reliable fix for event detection.

---

## Metadata

**Confidence breakdown:**
- Existing code state: HIGH — all files read directly
- SoundCloud Widget API approach: HIGH — already implemented in EmbedPlayer, verified working in Phase 29 (EMBED_ORIGINS, Widget hook)
- YouTube Error 153 behavior on Windows Tauri: MEDIUM — GitHub issue confirms Windows HTTP origin works, but uploader-level restrictions still apply
- Bandcamp `url=` parameter: MEDIUM — confirmed in Bluesky app but not verified in Tauri WebView2 specifically (spike required)
- SC pause on source change: MEDIUM — `widget.pause()` is documented; implementation needs verification

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable APIs; SC Widget API and YouTube postMessage format are long-stable)
