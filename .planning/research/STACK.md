# Stack Research

**Domain:** v1.6 The Playback Milestone — multi-source streaming integration into existing Tauri 2.0 desktop app
**Researched:** 2026-02-26
**Confidence:** HIGH (Tauri platform facts, Spotify security changes), MEDIUM (SDK integration specifics in Tauri context), LOW (Spotify Web Playback SDK origin requirements for tauri.localhost — unconfirmed in official docs)

---

## Context: What Already Exists (Do Not Re-Add)

This is a subsequent-milestone document. Everything below is already installed and working.

| Already Present | Version | Notes |
|-----------------|---------|-------|
| `tauri-plugin-oauth` (Rust) | `"2"` in Cargo.toml | **Already installed.** Spawns localhost server for OAuth callbacks. |
| `@fabianlars/tauri-plugin-oauth` (npm) | `^2.0.0` | **Already installed.** TypeScript bindings for the Rust plugin. |
| `rsa` (Rust) | `0.9` | Already installed for AP HTTP signatures. RSA keypair generation available. |
| `reqwest` (Rust) | `^0.12` | HTTP client. Already used for AI model downloads + AP delivery. |
| `serde` + `serde_json` (Rust) | `^1` | JSON serialization. Already used throughout. |
| `@tauri-apps/api` | `^2.10.1` | Tauri IPC. Already in use. |
| `@tauri-apps/plugin-sql` | `^2.3.2` | SQLite. Already used for taste.db and mercury.db. |
| `src/lib/embeds/spotify.ts` | — | Already converts Spotify URLs to embed iframe URLs. |
| `src/lib/embeds/youtube.ts` | — | Already converts YouTube URLs to nocookie embed URLs. |
| `src/lib/embeds/soundcloud.ts` | — | Already constructs SoundCloud oEmbed URLs. |
| `src/lib/embeds/bandcamp.ts` | — | Already handles Bandcamp URL detection. |
| `src/lib/player/` | — | Complete player module: `playback.svelte.ts`, `queue.svelte.ts`, `state.svelte.ts`, `audio.svelte.ts`. |

---

## Critical Platform Facts (Read Before Any Integration Work)

### Windows Uses `http://tauri.localhost` — This Matters Enormously

On Windows, Tauri 2.0 serves the app's WebView2 content at `http://tauri.localhost`. This is a real HTTP origin (not a custom protocol). This has two major consequences:

1. **YouTube IFrame API: Works on Windows, fails on macOS/Linux.** YouTube IFrame Error 153 (the "no valid HTTP Referer" failure) only affects macOS/Linux where Tauri uses `tauri://localhost`. On Windows, `http://tauri.localhost` satisfies YouTube's origin validation. Since BlackTape is Windows-only (NSIS installer, no other targets), YouTube IFrame is not blocked by the Tauri protocol — this is a non-issue for this project. Source: [Tauri GitHub issue #14422](https://github.com/tauri-apps/tauri/issues/14422), confirmed closed December 2025.

2. **Spotify Web Playback SDK origin:** Whether Spotify accepts `http://tauri.localhost` as an allowed origin in the developer dashboard is not confirmed in official docs. This must be validated during implementation. If Spotify rejects it, the embed iframe approach (already working via `spotifyEmbedUrl()`) is the fallback. Do not block the phase on this — test it in the first implementation spike.

3. **CSP is already null** in `tauri.conf.json`. No CSP changes are needed for loading third-party scripts.

### Spotify OAuth Security Changes (November 2025 — Enforced Now)

As of November 27, 2025, Spotify enforces stricter redirect URI rules. This affects all new and migrated apps:

- `http://localhost` — **BLOCKED.** Localhost hostname aliases are no longer accepted.
- `http://127.0.0.1:PORT` — **ALLOWED.** Loopback IP literals are explicitly exempt from the HTTPS requirement.
- `https://` redirect URIs — Allowed (but no server to redirect to in a desktop app).
- Custom URI schemes (e.g., `myapp://callback`) — **Status unclear.** Not explicitly documented as allowed or blocked for new apps; community reports are mixed.

**Implication:** `tauri-plugin-oauth` spawns a temporary localhost server for OAuth. The redirect URI must be registered as `http://127.0.0.1:<PORT>` (not `http://localhost:<PORT>`) in the Spotify developer dashboard. The plugin supports dynamic port assignment, but the registered URI must use the exact IP literal. Source: [Spotify redirect URI docs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri), [community confirmation](https://github.com/charlie86/spotifyr/issues/224).

---

## New Stack Additions for v1.6

### 1. Spotify Web Playback SDK

**Verdict: Load via CDN script tag. No npm package for the SDK itself.**

Spotify does not publish the Web Playback SDK to npm. It is loaded as a CDN script injected into the page:

```
https://sdk.scdn.co/spotify-player.js
```

The SDK calls `window.onSpotifyWebPlaybackSDKReady()` when loaded. Initialize inside that callback.

| Addition | Version | Purpose | Why |
|----------|---------|---------|-----|
| `@types/spotify-web-playback-sdk` (npm, dev) | `^0.1.19` | TypeScript types for the SDK global | SDK is not on npm but types are; needed for `window.Spotify.Player` type safety |

**Initialization pattern for Svelte 5:**

```typescript
// In a Svelte component's $effect or onMount
function loadSpotifySDK(accessToken: string) {
  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new window.Spotify.Player({
      name: 'BlackTape',
      getOAuthToken: (cb) => { cb(accessToken); },
      volume: 0.5
    });
    player.addListener('ready', ({ device_id }) => { /* store device_id */ });
    player.addListener('player_state_changed', (state) => { /* update UI */ });
    player.connect();
  };
  const script = document.createElement('script');
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  document.body.appendChild(script);
}
```

**Requirement:** Spotify Premium account required. The SDK emits `account_error` for non-premium users. Plan for a graceful degradation: if account error fires, fall back to the existing Spotify embed iframe (spotifyEmbedUrl()) which works for non-premium browsing.

**Unknown: origin whitelisting.** Whether `http://tauri.localhost` must be added to the Spotify app's allowed origins list in the developer dashboard is not confirmed in official docs. Validate in implementation spike. If blocked, the embed iframe is the fallback path.

---

### 2. Spotify PKCE OAuth — Using Already-Installed tauri-plugin-oauth

**Both Rust and npm packages are already in the project.** No new installs needed for the OAuth flow mechanism.

The PKCE flow using `tauri-plugin-oauth`:

1. App generates PKCE `code_verifier` and `code_challenge` in TypeScript (using Web Crypto API — no library needed).
2. `tauri-plugin-oauth` starts a temporary server via `start()` → returns a random port.
3. Open the Spotify authorization URL in the system browser using `tauri-plugin-shell`'s `open()`.
   - Auth URL: `https://accounts.spotify.com/authorize?response_type=code&client_id=<ID>&redirect_uri=http%3A%2F%2F127.0.0.1%3A<PORT>&code_challenge_method=S256&code_challenge=<CHALLENGE>&scope=streaming%20user-read-email%20user-read-private`
4. Spotify redirects to `http://127.0.0.1:<PORT>/?code=<CODE>`. The plugin catches this.
5. App exchanges code for tokens via `reqwest` (Rust) or `fetch` (TypeScript).
6. Store tokens (see Token Storage below).

**Redirect URI registration rule (enforced since Nov 2025):** Register `http://127.0.0.1` without port in the Spotify dashboard. Spotify allows dynamic port appending for loopback addresses — you register `http://127.0.0.1` and can pass any port at runtime. Source: [Spotify redirect URI docs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

**Bundled client_id:** Since BlackTape ships a client_id in the binary, the PKCE flow (no client_secret required) is the correct approach. PKCE was designed for public clients that cannot safely store a secret. The client_id being visible is acceptable — PKCE ensures the token exchange is secure even without a secret.

**Scope needed for Web Playback SDK:** `streaming user-read-email user-read-private`. The `streaming` scope is mandatory for SDK playback. Source: [Spotify Web Playback SDK docs](https://developer.spotify.com/documentation/web-playback-sdk).

---

### 3. YouTube IFrame Player API

**Verdict: Load via CDN. No npm package. Works on Windows without modifications.**

The YouTube IFrame Player API loads from:
```
https://www.youtube.com/iframe_api
```

This is the standard YouTube-provided script (free, no API key for basic embedding). The `youtube-nocookie.com` embed domain (already used in `youtube.ts`) is preferable for privacy.

**On Windows Tauri: works without any workaround.** The `http://tauri.localhost` origin is HTTP-compatible and satisfies YouTube's origin check. The Error 153 issue is macOS/Linux-only. No changes needed. Source: [Tauri issue #14422](https://github.com/tauri-apps/tauri/issues/14422).

**No new npm packages needed.** The existing `youtubeEmbedUrl()` function already produces valid embed URLs. The IFrame Player API is only needed if programmatic control (play/pause/seek) is required. For basic embedding, iframes alone are sufficient.

| If programmatic YouTube control needed | Addition | Why |
|----------------------------------------|----------|-----|
| IFrame Player API (CDN only) | `https://www.youtube.com/iframe_api` | Load via script injection, same pattern as Spotify SDK |

**Fallback strategy for channel pages (not embeddable):** Already implemented — `isYoutubeChannel()` in `youtube.ts` detects channels. For those, open in browser via `tauri-plugin-shell` `open()`. The shell plugin is already installed.

---

### 4. SoundCloud Widget API

**Verdict: CDN-only. No npm package exists from SoundCloud.**

SoundCloud Widget API script:
```
https://w.soundcloud.com/player/api.js
```

This is the official SoundCloud-provided script. It is not published to npm. Load via dynamic script injection (same pattern as Spotify SDK).

**Key methods after loading:**

```typescript
// After script loads, get widget reference from an iframe
const widget = SC.Widget(iframeElement);
widget.play();
widget.pause();
widget.getDuration((duration) => { /* ... */ });
widget.getCurrentSound((sound) => { /* title, id, ... */ });
widget.bind(SC.Widget.Events.PLAY, () => { /* ... */ });
```

**Integration approach for Svelte 5:** The existing `soundcloud.ts` already constructs oEmbed API URLs. The embed iframe comes from the oEmbed response HTML. To add Widget API control, inject the CDN script after the iframe is rendered, then wrap it with `SC.Widget(iframe)`.

**No new npm packages needed.** The CDN script provides the `SC` global.

---

### 5. Bandcamp Embed Player

**Verdict: Pure iframe. No JavaScript API. No npm package. No restrictions detected.**

Bandcamp embedding uses a direct iframe URL format:
```
https://bandcamp.com/EmbeddedPlayer/album=<ID>/size=large/bgcol=000000/linkcol=ffffff/tracklist=true/transparent=true/
```

Or for tracks:
```
https://bandcamp.com/EmbeddedPlayer/track=<ID>/size=large/transparent=true/
```

Bandcamp does not provide a programmatic JavaScript API for their embed player. The iframe is the complete integration surface. There is no `play()`, `pause()`, or `seek()` control available from outside the iframe — Bandcamp does not expose postMessage events.

**Implication for service resolution:** Bandcamp can be detected and embedded, but cannot be programmatically controlled. The "service badge" can show "Playing from Bandcamp" but synchronized playback (e.g., listening rooms) cannot control Bandcamp timing. This is an acceptable limitation given Bandcamp's indie-first audience alignment.

**No new packages needed.** Extend existing `bandcamp.ts` to produce `bandcamp.com/EmbeddedPlayer/` URLs from detected Bandcamp release or track URLs.

---

### 6. Token Storage for OAuth Credentials

**Recommendation: tauri-plugin-store for now, with a plan to migrate to keyring.**

The options:

| Option | Security | Complexity | Platform Support | Status |
|--------|----------|------------|-----------------|--------|
| `tauri-plugin-store` (already known) | None — plaintext JSON in AppData | Zero | All | Stable |
| `tauri-plugin-stronghold` | Encrypted vault | High — requires password setup UI | All except Android | **Deprecated; removed in Tauri v3** |
| `tauri-plugin-keyring` | OS credential manager | Medium — community plugin | Windows (Credential Manager), macOS (Keychain), Linux (keyring) | Community; not official |

**Decision: Use `tauri-plugin-store` for v1.6, store tokens with a session-scoped lifetime.**

Rationale:

1. Stronghold is deprecated and will be removed in Tauri v3. Do not add a dependency on a dead plugin.
2. `tauri-plugin-keyring` is a community plugin with uncertain Windows reliability (developer notes say "something's sus on Windows").
3. The Spotify access token expires in 1 hour. The refresh token is the sensitive long-lived credential. Storing in `tauri-plugin-store` (plaintext AppData file) is the same security posture as every major desktop music app (Spotify desktop app, etc.) — acceptable for a music discovery tool.
4. `tauri-plugin-store` is already understood and can be added cleanly.

**Future migration path:** If security requirements increase, swap storage backend to `tauri-plugin-keyring` without changing the OAuth flow logic. The interface is the same — read/write a key.

| Addition | Version | Purpose | Why |
|----------|---------|---------|-----|
| `@tauri-apps/plugin-store` (npm) | `^2.x` | Persistent key-value store for OAuth tokens + service preferences | Already in ecosystem; simple; known to work; stronghold deprecated |
| `tauri-plugin-store` (Rust) | `"2"` | Rust-side companion to the npm plugin | Needed to enable store from Tauri backend if needed |

---

## New Stack Additions Summary

| Addition | Layer | Install | Already Present? |
|----------|-------|---------|-----------------|
| `@types/spotify-web-playback-sdk` | npm (devDep) | `npm install -D @types/spotify-web-playback-sdk` | No |
| `@tauri-apps/plugin-store` | npm | `npm install @tauri-apps/plugin-store` | No |
| `tauri-plugin-store` | Rust (Cargo.toml) | `tauri-plugin-store = "2"` | No |
| Spotify Web Playback SDK | CDN (runtime load) | `https://sdk.scdn.co/spotify-player.js` | No |
| YouTube IFrame API | CDN (optional) | `https://www.youtube.com/iframe_api` | No |
| SoundCloud Widget API | CDN (runtime load) | `https://w.soundcloud.com/player/api.js` | No |
| `tauri-plugin-oauth` (Rust) | Rust | Already in Cargo.toml | **Yes** |
| `@fabianlars/tauri-plugin-oauth` | npm | Already in package.json | **Yes** |

**Net new npm production dependencies: 1** (`@tauri-apps/plugin-store`)
**Net new npm dev dependencies: 1** (`@types/spotify-web-playback-sdk`)
**Net new Rust dependencies: 1** (`tauri-plugin-store`)
**CDN scripts loaded at runtime: 3** (Spotify SDK, SoundCloud Widget API, YouTube IFrame API if programmatic control added)

---

## Installation

```bash
# npm additions
npm install @tauri-apps/plugin-store
npm install -D @types/spotify-web-playback-sdk

# Cargo.toml addition (src-tauri/Cargo.toml [dependencies] section)
# tauri-plugin-store = "2"

# No other packages needed. CDN scripts are loaded dynamically at runtime.
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| CDN script load (Spotify SDK) | npm wrapper like `use-spotify-web-playback-sdk` | React-specific wrappers; Svelte 5 doesn't benefit. The SDK itself is not on npm — all wrappers ultimately load the CDN script. |
| `tauri-plugin-store` (token storage) | `tauri-plugin-stronghold` | **Deprecated; removed in Tauri v3.** Do not add a dependency on a dead plugin. |
| `tauri-plugin-store` (token storage) | `tauri-plugin-keyring` | Community plugin; Windows reliability uncertain; adds dependency on unvetted crate for v1.6 scope. |
| Existing `tauri-plugin-oauth` (already installed) | Custom deep-link handler | `tauri-plugin-oauth` is already in the project. Custom schemes for OAuth redirects have unclear status with Spotify's new 2025 rules. |
| `http://127.0.0.1:<PORT>` redirect URI | `http://localhost:<PORT>` | `localhost` as hostname is explicitly blocked by Spotify since November 2025. Only IPv4/IPv6 loopback literals work. |
| Pure iframe embed (Bandcamp) | JavaScript API control | Bandcamp provides no external JS API for their embed player. Iframe is the only integration surface. |
| `youtube-nocookie.com` (already used) | `youtube.com` | Privacy-friendly; already implemented in `youtube.ts`. No reason to change. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tauri-plugin-stronghold` | Deprecated; will be removed in Tauri v3. Adding it now creates a forced migration later. | `tauri-plugin-store` |
| `tauri-plugin-localhost` | Serves the app's SPA assets on localhost — not what we need. Adding it complicates Tauri IPC. Only relevant for macOS/Linux YouTube fix; this is Windows-only. | Not needed |
| React Spotify wrappers (`react-spotify-web-playback`, etc.) | React-specific; incompatible with Svelte | Load SDK directly via CDN script injection |
| `spotify-web-sdk` (npm) | This is a Spotify Web API wrapper, not the Web Playback SDK. Different product. | `@spotify/web-api-ts-sdk` if Web API needed in future |
| SoundCloud oEmbed in the frontend | `soundcloud.ts` already constructs oEmbed URLs; oEmbed fetches must be server-side (CORS restriction). The existing server-side load function handles this. | Existing `soundcloudOembedUrl()` pattern |

---

## Stack Patterns by Integration

**Spotify Web Playback SDK initialization (Svelte 5 component):**
- Load script on component mount via `$effect` or `onMount`
- Register `window.onSpotifyWebPlaybackSDKReady` before appending script
- Access token comes from tauri-plugin-store (refreshed before expiry)
- Device ID from `ready` event → store in player state for Spotify Web API playback control
- On `account_error` event → fall back to Spotify embed iframe

**Spotify PKCE OAuth flow:**
- Generate `code_verifier` (43-128 char random string) + `code_challenge` (SHA-256 of verifier, base64url-encoded) in TypeScript using `crypto.subtle`
- `start()` from `@fabianlars/tauri-plugin-oauth` → get dynamic port
- Build auth URL with `redirect_uri=http%3A%2F%2F127.0.0.1%3A<PORT>`
- Open URL with `open()` from `@tauri-apps/plugin-shell`
- `onUrl()` callback catches the redirect, extract `code` from URL query params
- Exchange code + verifier for tokens via `fetch` to Spotify token endpoint
- Store `access_token` + `refresh_token` + `expires_at` in plugin-store

**SoundCloud Widget API (Svelte 5 component):**
- Render iframe with src from existing oEmbed HTML response
- Inject `https://w.soundcloud.com/player/api.js` via script tag
- On script load: `const widget = SC.Widget(iframeRef)`
- Bind events: `widget.bind(SC.Widget.Events.PLAY, handler)`
- Expose `play()`, `pause()` through the player state module

**YouTube IFrame (Windows, already works):**
- Existing `youtubeEmbedUrl()` produces `youtube-nocookie.com/embed/<id>` URLs
- Drop into `<iframe>` — works without modification on Windows
- For programmatic control (optional): inject `iframe_api` script, use `YT.Player` constructor
- For channel URLs: `isYoutubeChannel()` → `open()` in system browser

**Bandcamp (iframe only):**
- Extend `bandcamp.ts` to extract album/track IDs from Bandcamp URLs
- Produce `https://bandcamp.com/EmbeddedPlayer/album=<ID>/...` URLs
- Render as iframe — no JS integration possible
- Playback state cannot be tracked (no postMessage API)

**Service resolution per-artist:**
- Existing `categorize.ts` already groups links by platform (streaming, social, etc.)
- Service resolution reads available platform links for each artist
- Priority order stored in plugin-store as a JSON array: `["spotify", "youtube", "soundcloud", "bandcamp"]`
- Drag-to-reorder in Settings → write updated order to store

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@types/spotify-web-playback-sdk@0.1.19` | TypeScript 5.x | Last updated Nov 2023; types are stable; SDK API has not changed significantly |
| `@tauri-apps/plugin-store@2.x` | Tauri 2.0, `@tauri-apps/api@^2.10.1` | Tauri official plugin; version-locked to Tauri 2.x |
| `tauri-plugin-store@2` (Rust) | Tauri 2.0 | Matches npm companion version |
| `@fabianlars/tauri-plugin-oauth@2.0.0` (already installed) | Tauri 2.0 | Already verified working in project |
| Spotify Web Playback SDK (CDN) | WebView2 (Chromium-based) | WebView2 supports EME (required for DRM audio); confirmed working in Chromium-based environments |
| SoundCloud Widget API (CDN) | Any modern WebView | No special requirements |
| YouTube IFrame API (CDN) | `http://tauri.localhost` on Windows | Works on Windows; Error 153 only affects macOS/Linux (not applicable here) |

---

## Open Questions (Validate in Implementation Spike)

1. **Spotify Web Playback SDK and `http://tauri.localhost` origin:** Does Spotify require this origin to be registered in the developer dashboard? Test by initializing the SDK — if it fails with an `initialization_error`, add the origin to the app's allowed domains in the Spotify developer dashboard. The origin to register would be `http://tauri.localhost`.

2. **Spotify developer dashboard app status:** BlackTape ships with a bundled `client_id`. The app will need Spotify's "extended quota mode" approval if it grows beyond 25 active users in development mode. The April 2025 changes made extended access harder to get — verify that the use case (discovery tool embedding the official SDK) qualifies. Source: [Spotify extended access update](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access).

3. **Spotify token refresh timing:** Access tokens expire in 1 hour. Implement proactive refresh (check `expires_at` before SDK `getOAuthToken` callback fires). The SDK's `getOAuthToken` callback is called each time the SDK needs a fresh token — implement the refresh there.

---

## Sources

- [Spotify Web Playback SDK docs](https://developer.spotify.com/documentation/web-playback-sdk) — Script URL, initialization pattern, Premium requirement. MEDIUM confidence (docs current but Tauri-specific behavior unconfirmed).
- [Spotify getting started tutorial](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started) — `https://sdk.scdn.co/spotify-player.js` script URL, initialization callback pattern. HIGH confidence.
- [Spotify redirect URI docs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) — Loopback IP (`127.0.0.1`) allowed; `localhost` hostname blocked. HIGH confidence (official docs).
- [Spotify security requirements blog (Feb 2025)](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify) — Timeline of changes; loopback exemption for desktop apps. HIGH confidence (official Spotify announcement).
- [Spotify extended access update (Apr 2025)](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access) — Extended quota mode tightened; Web Playback SDK not directly affected. HIGH confidence.
- [GitHub: spotifyr issue #224 — localhost blocked](https://github.com/charlie86/spotifyr/issues/224) — Community confirmation that `localhost` fails, `127.0.0.1` works after April 2025. MEDIUM confidence (community, single issue).
- [Tauri GitHub issue #14422 — YouTube IFrame Error 153](https://github.com/tauri-apps/tauri/issues/14422) — Windows uses `http://tauri.localhost` (HTTP origin); Error 153 only affects macOS/Linux. HIGH confidence (Tauri team confirmed, closed December 2025).
- [FabianLars/tauri-plugin-oauth GitHub](https://github.com/FabianLars/tauri-plugin-oauth) — Plugin API (`start()`, `onUrl()`, `cancel()`); v2.0.0 for Tauri v2; npm package `@fabianlars/tauri-plugin-oauth`. HIGH confidence (official repo).
- [Tauri community discussion #7846 — secure storage](https://github.com/orgs/tauri-apps/discussions/7846) — Stronghold deprecated, to be removed in Tauri v3; keyring plugin recommended as alternative. HIGH confidence (Tauri maintainer stated deprecation).
- [SoundCloud Widget API docs](https://developers.soundcloud.com/docs/api/html5-widget) — CDN URL `https://w.soundcloud.com/player/api.js`; no npm package; key methods. HIGH confidence (official SoundCloud docs).
- [Bandcamp EmbeddedPlayer URL format](https://get.bandcamp.help/hc/en-us/articles/23020711574423-How-do-I-create-a-Bandcamp-embedded-player) — iframe URL structure; no external JS API available. HIGH confidence (official Bandcamp help).
- [Tauri plugin stronghold docs](https://v2.tauri.app/plugin/stronghold/) — Still documented for v2 but deprecated in v3 per maintainer comment. MEDIUM confidence (docs exist but deprecation from discussion).
- Existing codebase inspection — `Cargo.toml`, `package.json`, `tauri.conf.json`, `src/lib/embeds/`, `src/lib/player/`. HIGH confidence (direct code read).

---

*Stack research for: BlackTape (Mercury) v1.6 — The Playback Milestone (Spotify, YouTube, SoundCloud, Bandcamp streaming integration)*
*Researched: 2026-02-26*
