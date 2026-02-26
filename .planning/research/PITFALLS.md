# Pitfalls Research

**Domain:** Multi-source streaming integration into an existing Tauri 2.0 / Svelte 5 desktop app (Spotify, YouTube, SoundCloud, Bandcamp)
**Researched:** 2026-02-26
**Confidence:** HIGH for Spotify/YouTube/Tauri-specific issues (multiple verified sources including official Spotify docs, live Tauri GitHub issues, and February 2026 Spotify policy changes). MEDIUM for SoundCloud/Bandcamp (official docs + community reports, no Tauri-specific issues found). MEDIUM for Spotify ToS implications (policy is actively changing as of this writing — verified against current official docs).

---

## Critical Pitfalls

### Pitfall 1: Spotify Web Playback SDK Requires Widevine CDM — Does Not Work in WebView2

**What goes wrong:**
The Spotify Web Playback SDK uses Encrypted Media Extensions (EME) to decrypt Widevine-protected audio. When the SDK calls `navigator.requestMediaKeySystemAccess()`, WebView2 supports the EME API call (it is Chromium-based), but the actual Widevine Content Decryption Module is not available in the same way it is in a full Chrome or Edge browser. The result is a "Failed to initialize player" error after the SDK appears to load correctly. This is the same failure mode documented for Electron since 2018 in spotify/web-playback-sdk#41, and it remains unresolved for any desktop WebView wrapper.

**Why it happens:**
Chrome and Edge ship with Widevine CDM as a proprietary binary that is activated for those specific browser products. WebView2 — even though it is Edge-based — does not expose Widevine for arbitrary third-party web content in the same way. Spotify's SDK does not just check whether `navigator.requestMediaKeySystemAccess` exists; it checks whether the CDM can actually decrypt content. Developers test the SDK in a real Chrome browser where it works, then discover the failure only after implementing the entire integration.

**How to avoid:**
Do not use the Spotify Web Playback SDK in BlackTape. Use the Spotify Embed Player instead: `https://open.spotify.com/embed/artist/{id}?theme=0`. The embed iframe runs in a sandboxed Spotify context, handles its own DRM negotiation internally, and does not expose this failure mode. The tradeoff is loss of programmatic control (no play/pause from parent JS), but this is the only approach that reliably works in a desktop WebView.

The existing `spotifyEmbedUrl()` function in `src/lib/embeds/spotify.ts` is already on the correct path. Do not add a second Spotify integration path using the SDK.

**Warning signs:**
- Any plan or code that imports or loads `https://sdk.scdn.co/spotify-player.js`
- `Spotify.Player` initialization returning `initialization_error` or `account_error`
- Console deprecation warning about `requestMediaKeySystemAccess` in cross-origin iframes
- DRM errors in DevTools → Media tab

**Phase to address:**
Before any Spotify work begins. Record this as an explicit architecture decision: embed iframe only, SDK not used.

---

### Pitfall 2: YouTube IFrame Error 153 in Tauri Production Builds

**What goes wrong:**
YouTube's IFrame Player API requires a valid HTTP `Referer` header to verify the embedding origin. In Tauri production builds on Windows, the app is served from `http://tauri.localhost`. This custom protocol origin does not generate a valid Referer that YouTube accepts. YouTube returns Error 153 ("Video player configuration error") and the player renders blank. In development (`npm run tauri dev`), Tauri proxies to Vite at `http://localhost:5173` — a real HTTP URL — so the embed works. The failure is invisible until a production build is tested.

This is a confirmed, live issue: Tauri GitHub #14422 (closed December 2025 with a workaround reference, not a Tauri-side fix).

**Why it happens:**
YouTube requires API clients to identify themselves through the `Referer` header. Custom URL schemes (`tauri://`, `http://tauri.localhost`) do not satisfy this requirement because they are not recognized HTTP origins. Using `youtube-nocookie.com` embed URLs (already in the codebase) does not resolve this — the issue is at the protocol level, not the domain level.

**How to avoid:**
Two viable approaches:

**Option A (recommended for BlackTape):** Implement the Error 153 fallback in the IFrame API `onError` handler. When YouTube fires error code 153, replace the player with a "Watch on YouTube" button linking to the video URL. This is low-effort, always works, and the user gets a clear action instead of a blank player. The embed works for users where it works; those where it fails get a direct link.

**Option B:** Use `tauri-plugin-localhost` to serve the app from real `http://127.0.0.1:PORT` in production. This fixes YouTube but breaks Tauri IPC unless you explicitly add a remote capability in `capabilities/` granting that URL IPC access. This is a more invasive change with security surface implications and is not worth it for YouTube alone.

Never rely solely on development testing for YouTube embeds. Every YouTube embed implementation must be smoke-tested in a production build (`npm run tauri build` → install → verify) before the phase is marked complete.

**Warning signs:**
- YouTube embeds work in `npm run tauri dev` but show a grey spinner or generic error in a production install
- `onError` fires with code `153`
- Console errors referencing `origin` or `referer` validation from YouTube

**Phase to address:**
YouTube embed implementation phase. The Error 153 fallback must be implemented as part of the initial work, not as a bug fix.

---

### Pitfall 3: Spotify OAuth — `localhost` as redirect_uri Is Now Rejected

**What goes wrong:**
Since November 27, 2025, Spotify's OAuth no longer accepts `http://localhost:*` as a valid redirect URI. Any OAuth flow that registers `http://localhost:PORT/callback` gets `INVALID_CLIENT: Insecure redirect URI`. This breaks the common Tauri desktop app pattern of spinning up a local HTTP server on localhost to catch the OAuth callback.

**Why it happens:**
Spotify's February 2025 security changes enforced RFC 8252's distinction between `localhost` (a DNS hostname, not safe) and `127.0.0.1` (a loopback IP literal, allowed over HTTP). The deadline for all apps was November 27, 2025. Developers who registered callback URIs before this date may have existing configs using `localhost`, which stopped working after enforcement.

**How to avoid:**
Two approaches, both valid:

**Option A:** Use `http://127.0.0.1/callback` as the redirect URI. Register this in the Spotify developer dashboard. Spotify allows dynamic ports on loopback IP literals — register without a port, supply the port at runtime. BlackTape spins up a temporary HTTP server on `127.0.0.1:PORT`, completes the OAuth flow, then shuts it down. The auth code arrives via that server.

**Option B (cleaner for desktop):** Use a custom deep-link protocol via `tauri-plugin-deep-link`. Register `blacktape://callback` as the redirect URI in the Spotify developer dashboard. Tauri handles the protocol, delivers the URL to the app, and no temporary HTTP server is needed. This is the pattern recommended by Tauri's own OAuth documentation and avoids any port conflict concerns.

Either way: never register `http://localhost` as a redirect URI in any new Spotify app configuration.

**Warning signs:**
- OAuth flow opens the Spotify login page but returns `INVALID_CLIENT: Insecure redirect URI`
- Any redirect URI in config containing the string `localhost` (not `127.0.0.1`)
- OAuth works in one network environment but fails in another

**Phase to address:**
Spotify OAuth phase, before any implementation. The redirect URI approach must be decided and registered in the Spotify developer dashboard before writing code.

---

### Pitfall 4: Spotify Quota Mode — A Bundled client_id Cannot Scale Beyond 5 Users

**What goes wrong:**
The plan to bundle a single Spotify `client_id` in the open-source app hits a hard wall: as of February 11, 2026, Spotify's Development Mode limits each Client ID to **5 authorized users**. User #6 attempting to authenticate with the same client_id gets an error. Extended quota mode (unlimited users) requires Spotify's formal approval and is now limited to legally registered businesses with 250,000+ monthly active users. BlackTape will not qualify.

This is a confirmed policy change: Spotify's February 2026 developer announcement, effective for new apps February 11, 2026 and existing apps from March 9, 2026.

**Why it happens:**
The intent of bundling a shared client_id is to make onboarding simpler — users do not need to create a Spotify developer account. But the 5-user dev mode cap makes this approach non-viable for any software distributed publicly.

**How to avoid:**
Require each user to provide their own Spotify client_id. The Spotify developer dashboard is free; creating an app takes approximately 2 minutes. BlackTape's onboarding should include step-by-step instructions with screenshots. Each user's client_id is entered once in Settings → Streaming and stored in Tauri's secure store.

Separate concern: PKCE flow with a public `client_id` (no `client_secret`) is cryptographically sound. The `client_id` is not sensitive and can appear in source code or docs. What cannot be in source code is a `client_secret`. Use PKCE, never Client Credentials flow.

**Warning signs:**
- Any config file, `.env`, or bundled constant containing a Spotify `client_id` that is not per-user
- Any plan to commit `client_secret` to source (PKCE requires no secret — if you have a secret in scope, you are on the wrong flow)
- Spotify auth works for the developer but fails for a test user

**Phase to address:**
Spotify OAuth architecture phase. The per-user client_id requirement shapes the entire onboarding UX design.

---

### Pitfall 5: Existing Local Player and Streaming Embeds Will Compete — Audio Plays Simultaneously

**What goes wrong:**
BlackTape already has a local file player: `audio.svelte.ts`, `playerState`, `queueState`. Adding streaming embed players (Spotify iframe, YouTube IFrame, SoundCloud widget, Bandcamp iframe) creates multiple audio sources that can play at the same time. The existing `playerState.isPlaying` only tracks the local file player. Scenario: a local track is playing, the user navigates to an artist page, clicks the SoundCloud embed — both play simultaneously.

Streaming embeds run in their own sandboxed iframe context. They are not `<audio>` elements that the parent page controls directly.

**Why it happens:**
The local player was designed as a single-source audio system. Streaming embeds are independent autonomous contexts. No coordination layer exists between them. This gap is easy to miss because in testing you usually test one source at a time.

**How to avoid:**
Implement a global `activeSource` state before any streaming source is added:

```typescript
type AudioSource = 'local' | 'spotify' | 'youtube' | 'soundcloud' | 'bandcamp' | null;
export const activeSource = $state({ current: null as AudioSource });
```

Rules:
- When a streaming embed starts playing, set `activeSource.current` and pause the local audio element (`audio.pause()`).
- When the local player resumes, set `activeSource.current = 'local'` and send pause signals to any open embeds.
- Each embed container watches `activeSource` and calls its pause API when another source becomes active.

Pause APIs available:
- SoundCloud Widget API: `widget.pause()` via `SC.Widget(iframe)` — full programmatic control
- YouTube IFrame API: `player.pauseVideo()` — available when `enablejsapi=1` is in the embed URL
- Spotify embed iframe: no external control API — destroying and recreating the iframe is the only way to stop it
- Bandcamp embed iframe: no external control API — same as Spotify

For Spotify and Bandcamp, the practical approach is to unmount the iframe when another source becomes active and remount when selected again.

**Warning signs:**
- Playing a local file then clicking a SoundCloud embed results in both playing simultaneously
- Navigating away from a page with an embed results in audio continuing from the unmounted component (ghost audio)
- `playerState.isPlaying` is true while a streaming embed is also active

**Phase to address:**
The `activeSource` coordination state must be implemented first, before any individual streaming service integration. It cannot be retrofitted without touching every service implementation.

---

## Moderate Pitfalls

### Pitfall 6: Spotify Token Refresh Race Condition — PKCE Rotation Invalidates Old Tokens Immediately

**What goes wrong:**
Spotify's PKCE flow uses refresh token rotation: each refresh issues a new access token AND a new refresh token, and the old refresh token is immediately invalidated. If two API calls fire concurrently when a token is near expiry (both detect `expires_at` has passed, both attempt a refresh), the second refresh uses an already-invalidated refresh token and receives a 400 error. The user appears to be logged out mid-session.

**How to avoid:**
Implement a single-flight token refresh: use a module-level Promise that, if already in progress, is returned to subsequent callers rather than starting a new refresh. Only one refresh can be in flight at a time.

Store the refresh token in Tauri's secure store (not `localStorage` and not Svelte `$state`). `localStorage` is accessible to any injected JavaScript. Svelte reactive state gets serialized by dev tools and may appear in logs. The access token can be in memory (it expires in 1 hour). The refresh token must be in secure persistent storage.

---

### Pitfall 7: Bandcamp Embeds Are Not Universal — Artist Controls Streaming Per-Release

**What goes wrong:**
Not all Bandcamp releases are embeddable. Artists can disable streaming for individual tracks or entire releases. Some artists restrict embeds to specific allowlisted domains via Bandcamp Pro "exclusive embeds." When streaming is disabled, the embed iframe loads but shows no playable audio. MusicBrainz provides a Bandcamp URL at the artist level, not the release level — you cannot know in advance whether any given release has embeds enabled.

Additionally, Bandcamp imposes per-track streaming limits for free accounts. Tracks may stop streaming after N plays from a given IP, showing a "buy to unlock" state.

**How to avoid:**
Treat Bandcamp embeds as "try and fallback." Load the embed iframe with a reasonable timeout. If no playable audio state is detected within ~5 seconds, collapse the embed section and show "Visit on Bandcamp" with a direct link. Do not use any Bandcamp API to pre-check embeddability — the Bandcamp API is deprecated and not publicly accessible.

For the source URL: use the artist's Bandcamp page URL (artist-level) and let Bandcamp's own player surface whatever is streamable. Do not attempt release-specific embed URLs.

---

### Pitfall 8: SoundCloud Widget postMessage Can Fail When Multiple Iframes Are Present

**What goes wrong:**
The SoundCloud HTML5 Widget API uses `window.postMessage` between the parent page and the widget iframe. This is standard and generally works correctly. However, a known issue (soundcloud/soundcloud-javascript#15) causes "Failed to execute 'postMessage' on 'DOMWindow'" errors when another iframe is also present on the same page. If an artist page shows a Spotify embed iframe AND a SoundCloud widget simultaneously, the postMessage routing can conflict.

**How to avoid:**
Show only one streaming embed at a time on the artist page (the selected service, based on user priority). Do not render all four service iframes simultaneously. Use the user's service priority order to determine which embed to show; let the user switch sources explicitly via source buttons. This avoids the multi-iframe postMessage conflict and also solves the simultaneous audio problem from Pitfall 5.

When using the SoundCloud Widget JS API for pause/play control, bind `SC.Widget(iframe)` explicitly to the specific iframe element, not to a string selector that might match multiple iframes.

---

### Pitfall 9: Tauri CSP Is Currently Null — Adding It Later Will Break All Embeds

**What goes wrong:**
`tauri.conf.json` currently has `"csp": null`, meaning Tauri injects no Content Security Policy. All embed iframes work freely. If CSP is ever added (for security hardening), the default Tauri CSP blocks all `frame-src` from third-party origins. Every embed iframe — Spotify, YouTube, SoundCloud, Bandcamp — breaks instantly. The Spotify Web Playback SDK (if ever revisited) also requires `script-src` for `sdk.scdn.co`.

**How to avoid:**
Do not add CSP without also adding the required `frame-src` and `script-src` entries. If CSP is introduced, the minimum required additions are:

```
frame-src https://open.spotify.com https://www.youtube-nocookie.com https://w.soundcloud.com https://*.bandcamp.com;
```

Keep `"csp": null` for now — embeds are central to the product, and null CSP is appropriate while no server-side secrets are handled in the WebView. Document the required additions so if CSP is added in future it does not silently break everything.

---

### Pitfall 10: MusicBrainz Artist URLs Are Artist-Level — Track Resolution Is Not Possible Without Spotify API Access

**What goes wrong:**
MusicBrainz provides URLs like `https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb`. These are artist-level pages, not track or album pages. Mapping a specific MusicBrainz release to a Spotify album ID requires the Spotify Search API (`GET /search?type=album&q=...`), which is a Web API endpoint. As of the February 2026 changes, Spotify Web API access in development mode is restricted — and in any case requires valid OAuth tokens for the current user's account.

**How to avoid:**
Design streaming at the artist level, not the track level. "Play from Spotify" opens the Spotify artist embed, which shows the artist's popular tracks. For track-specific playback, the user interacts with the Spotify embed's own UI. This matches what the existing `spotifyEmbedUrl()` function already does correctly.

Do not plan a "find this specific track on Spotify by MusicBrainz release ID" resolution flow — it requires Spotify API calls that depend on auth, quota mode, and rate limits. Accept the artist-level UX.

---

### Pitfall 11: Spotify Developer Policy — Open Source Distribution Creates Real Risks

**What goes wrong:**
Spotify's Developer Terms (v10, effective May 2025) state that Security Codes (client_id, client_secret) "must be embedded in your SDA in a secure manner not accessible by third parties" and that you cannot "sell, transfer, sublicense or otherwise disclose your account or Security Codes to any other party." Publishing a public Git repository with a bundled Spotify client_id and secret is arguably a violation of the "not accessible by third parties" requirement.

The PKCE flow requires no `client_secret` — so for PKCE-only implementations, the client_id alone is in the code. The client_id is a public identifier (analogous to an OAuth app ID) and is generally considered safe to expose. This is community consensus and is how all public PKCE-based Spotify integrations work. The risk is low for client_id alone in PKCE flow.

The real risk: if a `client_secret` accidentally ends up in source code (from a developer testing Client Credentials flow and committing the result), the app could be terminated and the developer account flagged.

Additionally, if the bundled client_id is used by many users and somehow attracts Spotify's attention, Spotify can terminate the client_id at any time without notice, breaking Spotify integration for all users instantly. With the per-user client_id model (Pitfall 4), this risk is distributed.

**How to avoid:**
- Use PKCE only — no `client_secret` anywhere
- Per-user client_id (each user creates their own Spotify app) — distributes termination risk
- If a single developer client_id is ever used for development/testing, ensure it is in `.env.local` (gitignored), never committed
- Add a pre-commit hook check for Spotify client credential patterns in source files

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Bundled shared Spotify client_id | Simpler user onboarding | Breaks at user #6; ToS grey area; single point of failure | Never for public release |
| No active-source coordination (just implement one service at a time) | Faster first implementation | Ghost audio; simultaneous playback; impossible to retrofit cleanly | Never — build coordination layer first |
| Only test YouTube in dev (not production builds) | Faster iteration | Error 153 ships to all users silently | Never — always smoke test production build |
| Spotify access token in localStorage | Zero-friction implementation | Token readable by any injected JS | Never — use Tauri secure store |
| `csp: null` stays as-is | All embeds work freely | Any XSS has no CSP mitigation | Acceptable for now; document what to add if CSP ever enabled |
| Load all 4 service iframes simultaneously on artist page | All options visible immediately | Performance hit; postMessage conflicts; simultaneous audio | Never — lazy-load, one active iframe at a time |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Spotify OAuth | `http://localhost:PORT` as redirect_uri | `http://127.0.0.1/callback` or `blacktape://callback` via deep-link plugin |
| Spotify OAuth | Committing `client_secret` to source | PKCE flow — no client_secret needed or used |
| Spotify OAuth | Single bundled client_id for all users | Per-user client_id, entered in Settings onboarding |
| Spotify Web Playback SDK | Implementing full SDK integration | Widevine CDM not available in WebView2 — use embed iframe only |
| YouTube iframe | Only testing in `npm run tauri dev` | Always test in production build; Error 153 only manifests in production |
| YouTube iframe | Assuming `youtube-nocookie.com` avoids Error 153 | It does not; the issue is at the Referer/protocol level, not the domain |
| SoundCloud widget | Multiple SC iframes on same page | One active iframe at a time; destroy others when switching sources |
| Bandcamp embed | Assuming all Bandcamp artists allow embedding | "Try and fallback" — detect no-audio state and show direct link |
| Token refresh | Two concurrent API calls both attempt refresh | Single-flight mutex on refresh — second caller waits for in-progress refresh |
| Audio coordination | Adding pause calls as an afterthought | activeSource state must be the architectural foundation, not a patch |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all 4 service iframes on artist page load | Slow page; 4 network requests; postMessage conflicts | Lazy-load: only load the iframe for the user's top-priority service; load others on demand | Immediately on any artist page |
| Polling for SoundCloud play state | CPU and battery drain | Use SoundCloud Widget API event callbacks (`SC.Widget.Events.PLAY`) | Immediately |
| Checking Spotify token expiry on every function call | Redundant comparisons; missed race condition | Check locally against stored `expires_at`; refresh only within 60 seconds of expiry | At scale |
| Attempting to detect Bandcamp embed failure via timing | Race conditions; false positives on slow connections | Use iframe `load` event + DOM content inspection; not a fixed timeout | Varies by network |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Spotify access token in localStorage | Readable by any injected JS; survives browser sessions | Store in memory only (1-hour lifespan anyway); use Tauri secure store for refresh token |
| Spotify refresh token in Svelte `$state` | Reactive state serializes to dev tools; may appear in logs | Never put tokens in reactive state; keep refresh token in Tauri secure store (`tauri-plugin-store`) |
| Spotify `client_secret` in source code | Account termination if repo is public | PKCE flow — no secret required. If accidentally committed, rotate the Spotify app immediately |
| Loading iframe content from user-supplied URLs | SSRF / open redirect in iframe context | Only load iframes from Spotify/YouTube/SoundCloud/Bandcamp domains; validate URL origin before constructing embed URL |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Spotify onboarding asks for "Client ID" with no explanation | User abandons setup | Guided onboarding: step-by-step with screenshots of Spotify developer dashboard; explain what the client_id is and that it is free |
| YouTube player blank with no explanation when Error 153 occurs | User thinks the app is broken | Catch Error 153 in IFrame API `onError`, replace player area with "Watch on YouTube" button |
| Bandcamp embed loads but no audio available | User thinks embed is broken | 5-second load timeout: if no playable content, show "Not available via embed — visit Bandcamp" with direct link |
| Two audio sources playing simultaneously | Confusing, jarring | Active-source coordination: new source automatically pauses previous source |
| Service badge on player bar shows wrong service | "Playing from Spotify" while SoundCloud is audible | Player badge must be derived from the same `activeSource` state that controls pause/play |
| No indication Spotify Premium is required | Non-premium user authenticates successfully but gets no audio from embed | Detect account type after auth; show "Spotify Premium required for full playback" message before showing the embed for playback |
| Incremental source appearance (sources appear one by one as resolution runs) | Confusing — user sees state flickering | Resolve all available sources before rendering; show a loading state, then all sources at once |

---

## "Looks Done But Isn't" Checklist

- [ ] **Spotify OAuth:** Works in a production build (not just `npm run tauri dev`)? Redirect callback intercepted correctly?
- [ ] **Spotify redirect_uri:** Registered URI uses `127.0.0.1` or custom protocol — never `localhost`?
- [ ] **Spotify client_id:** Per-user (not bundled)? No `client_secret` anywhere in source or build artifacts?
- [ ] **YouTube embeds:** Tested in a production `.msi` install? Error 153 fallback renders a "Watch on YouTube" button?
- [ ] **Audio conflict:** Played a local file, then clicked a streaming embed — only one plays?
- [ ] **Ghost audio:** Navigated away from an artist page while an embed was playing — audio stopped?
- [ ] **Spotify token storage:** Refresh token in Tauri secure store (not localStorage or Svelte state)?
- [ ] **Bandcamp streaming disabled:** Tested with an artist whose Bandcamp has streaming disabled — fallback renders correctly?
- [ ] **PKCE only:** `npm run build` artifact contains no `client_secret` string?
- [ ] **CSP documented:** If `csp: null` is ever changed, required `frame-src` entries are documented in a comment in `tauri.conf.json`?

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Spotify SDK (Widevine fails) discovered after implementation | HIGH — full rearchitecture | Replace SDK with `open.spotify.com/embed/*` iframe; remove SDK loading code and state management; re-implement around embed |
| YouTube Error 153 ships without fallback | LOW — add fallback only | Add `onError` handler with code 153 detection; render "Watch on YouTube" button; ship as patch |
| `localhost` redirect_uri rejected after deployment | MEDIUM — Spotify dashboard update + app config change | Update registered URI in Spotify dashboard to `127.0.0.1` or custom protocol; update app config; ship patch |
| Bundled client_id hits 5-user limit | HIGH — UX rethink required | Implement per-user client_id entry flow; communicate to existing users; ship update |
| Simultaneous audio discovered after multiple services ship | MEDIUM — architectural retrofit | Add `activeSource` state; wire pause calls into each service component; regression-test all services |
| Spotify client_id terminated by Spotify | MEDIUM (per-user model) or HIGH (shared model) | Per-user: only that user needs a new client_id. Shared: all users broken simultaneously — ship app update with onboarding for per-user setup |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Spotify SDK Widevine failure (P1) | Spotify architecture decision — first action | Architecture decision recorded: embed iframe only, no SDK |
| YouTube Error 153 (P2) | YouTube embed implementation | Production build tested; Error 153 fallback renders correctly |
| Spotify OAuth localhost rejection (P3) | Spotify OAuth implementation | Auth flow completes in production build; redirect URI is `127.0.0.1` or deep-link |
| Spotify client_id quota (P4) | Spotify onboarding UX design | Onboarding UI prompts user for their own client_id; no bundled ID in source |
| Audio conflict (P5) | Streaming coordination foundation — before any service | Local track + SoundCloud embed tested; only one plays |
| Token refresh race condition (P6) | Spotify token management | Two concurrent API calls during expiry simulated; only one refresh fires |
| Bandcamp unavailability (P7) | Bandcamp embed implementation | Artist with streaming disabled tested; fallback link renders |
| SoundCloud postMessage conflict (P8) | SoundCloud embed implementation | Only one iframe active at a time; widget API binds to correct element |
| CSP breaking embeds (P9) | Only if CSP is ever added | Smoke test all embeds after any CSP change |
| Artist-level URL limitation (P10) | Spotify embed implementation | Embed shows artist page; no Spotify Search API calls in codebase |
| ToS / client_secret risk (P11) | Spotify OAuth architecture | Pre-commit check for credential patterns; PKCE confirmed as sole auth method |

---

## Sources

- [Spotify Web Playback SDK GitHub #41 — "Failed to initialize player" in Electron](https://github.com/spotify/web-playback-sdk/issues/41)
- [Spotify Web Playback SDK GitHub #7 — Electron/desktop support discussion](https://github.com/spotify/web-playback-sdk/issues/7)
- [Spotify Web Playback SDK GitHub #2 — Platform does not support requestMediaKeySystemAccess](https://github.com/spotify/web-playback-sdk/issues/2)
- [Spotify developer blog — Increasing security requirements (Feb 2025)](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify)
- [Spotify developer blog — OAuth Migration reminder (Oct 2025)](https://developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025)
- [Spotify developer blog — Update on developer access (Feb 2026)](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
- [Spotify docs — Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Spotify docs — Quota modes (5-user dev limit, 250k MAU for extended access)](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Spotify docs — Web API Changelog February 2026 (restricted endpoints)](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [Spotify docs — Web Playback SDK (supported browsers, EME, HTTPS requirements)](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Developer Terms v10 (Security Code requirements, distribution)](https://developer.spotify.com/terms)
- [TechCrunch — Spotify changes dev mode API Feb 2026 (5-user cap, Premium requirement)](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)
- [Tauri GitHub #14422 — YouTube IFrame Error 153 in production (tauri:// protocol)](https://github.com/tauri-apps/tauri/issues/14422)
- [Simon Willison's TIL — YouTube Error 153 cause (Referer policy)](https://simonwillison.net/2025/Dec/1/youtube-embed-153-error/)
- [CORS Proxy blog — YouTube Error 153 in WebView environments](https://corsproxy.io/blog/fix-youtube-error-150-153-webview/)
- [Tauri docs — CSP](https://v2.tauri.app/security/csp/)
- [Tauri docs — Deep Linking plugin (custom protocol OAuth)](https://v2.tauri.app/plugin/deep-linking/)
- [SoundCloud Widget API docs](https://developers.soundcloud.com/docs/api/html5-widget)
- [SoundCloud JavaScript GitHub #15 — postMessage conflict with multiple iframes](https://github.com/soundcloud/soundcloud-javascript/issues/15)
- [Bandcamp help — Streaming limits](https://get.bandcamp.help/hc/en-us/articles/23020694060183-What-are-streaming-limits-on-Bandcamp)
- [Bandcamp help — Creating an embedded player](https://get.bandcamp.help/hc/en-us/articles/23020711574423-How-do-I-create-a-Bandcamp-embedded-player)
- [Spotify community — DRM requires secure context (HTTPS)](https://community.spotify.com/t5/Spotify-for-Developers/DRM-might-not-be-available-from-unsecure-contexts/td-p/5972536)
- [Spotify community — INVALID_CLIENT with custom URI schemes](https://community.spotify.com/t5/Spotify-for-Developers/INVALID-CLIENT-Insecure-redirect-URI-using-custom-URI/td-p/6919036)
- Direct codebase review: `src/lib/embeds/spotify.ts`, `src/lib/embeds/youtube.ts`, `src/lib/player/state.svelte.ts`, `src/lib/player/queue.svelte.ts`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`

---
*Pitfalls research for: Multi-source streaming integration (Spotify, YouTube, SoundCloud, Bandcamp) added to existing Tauri 2.0 + Svelte 5 desktop app (BlackTape / Mercury v1.6)*
*Researched: 2026-02-26*
