# Phase 30: Spotify Integration - Research

**Researched:** 2026-02-27
**Domain:** Spotify Web API, PKCE OAuth, Spotify Connect, Tauri plugin-oauth
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OAuth Setup Flow**
- Step-by-step wizard with 3 explicit steps, not a single form
- Step 1: Inline guide with screenshot showing exactly where to find Client ID on developer.spotify.com. Numbered steps, clickable link to dashboard.
- Step 2: Client ID input field + Authorize button. When clicked, system browser opens. Wizard shows waiting state with spinner: "Waiting for Spotify authorization..." and a cancel option.
- Step 3 (success): "Connected to Spotify" with the user's Spotify display name/username + Done button. No auto-close — user sees and confirms success explicitly.
- Redirect URI must use `http://127.0.0.1` (never `localhost`)

**Connection Status**
- Status shown in Settings only — no persistent badge in player bar or global UI
- Connected state in Settings: "Connected as [Spotify username]" + Disconnect button
- Disconnect: immediate, no confirmation dialog — settings section reverts to wizard inline. No app restart needed.
- Token expiry/revocation: detected on next play attempt only (no background polling). Show inline error: "Spotify session expired — reconnect in Settings."

**Playback Trigger Surface**
- Artist page only for this phase
- Play button: Spotify-green, labeled "Play on Spotify", placed near the artist header
- Plays artist's Spotify top tracks via Get Artist Top Tracks endpoint (market-aware, up to 10 tracks)
- Button is hidden when Spotify is not connected — no grayed-out or disabled state

**Error & Degraded States**
- No active Spotify device: Inline message below the play button — "Open Spotify Desktop and start playing anything, then try again." Persists until user navigates away or clicks Play again. No auto-dismiss. No automatic fallback to embeds.
- API failure / artist not on Spotify: Inline message below play button — "Couldn't load tracks for this artist on Spotify." No retry button (not appropriate for artist-not-found cases).
- Expired token (detected on play): Inline — "Spotify session expired — reconnect in Settings."
- No silent failures. Every failure state has a visible, plain-language message.

### Claude's Discretion
- Exact wizard layout and component structure
- How the 127.0.0.1 redirect URI callback is handled in Tauri (local HTTP server or deep link)
- Token storage mechanism (secure store vs settings file)
- How to distinguish "no device" vs "API error" from the Connect API response

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPOT-01 | User can connect Spotify via guided step-by-step flow in Settings (enter own Client ID, PKCE OAuth, "Spotify Desktop required" clearly communicated throughout) | tauri-plugin-oauth handles localhost server; 3-step wizard in Settings page; ai_settings stores tokens |
| SPOT-02 | App plays artist's top tracks in the user's running Spotify Desktop app via Spotify Connect API | GET /artists/{id}/top-tracks for URIs; PUT /me/player/play with uris array |
| SPOT-03 | App shows clear feedback when Spotify Desktop is not detected (not running or no active device) | GET /me/player/devices to check; PUT /me/player/play returns 404 NO_ACTIVE_DEVICE |
| SPOT-04 | User can disconnect and reconnect Spotify from Settings | Delete ai_settings keys; reactive spotifyState drives wizard vs connected view |
</phase_requirements>

---

## Summary

Phase 30 implements Spotify integration as a user-owned OAuth flow: the user provides their own Spotify Client ID, authorizes via PKCE in the system browser, and the app stores the resulting tokens to trigger playback in Spotify Desktop via the Connect API. There is no audio playback within BlackTape — this is purely remote control of an already-running Spotify Desktop application.

The critical infrastructure is already present. `tauri-plugin-oauth` is already in `Cargo.toml` and registered in `lib.rs`. The existing `src/lib/taste/import/spotify.ts` demonstrates the full PKCE flow pattern, though it uses `http://localhost` (now blocked by Spotify) rather than `http://127.0.0.1`. The `ai_settings` table in `taste.db` already stores arbitrary key-value settings — it is the correct storage mechanism for tokens. The artist page already loads Spotify URLs from MusicBrainz (`data.links.spotify[]`), making the Spotify artist ID extractable from the URL.

The main work of this phase is: (1) a new `SpotifyService` module that handles OAuth, token storage, refresh, and API calls; (2) a new settings wizard component that provides the 3-step guided connection flow; and (3) a "Play on Spotify" button on the artist page that calls the Connect API.

**Primary recommendation:** Implement a `src/lib/spotify/` module with `auth.ts` (OAuth + token management), `api.ts` (Connect API + top tracks), and `state.svelte.ts` (reactive connection state). Store tokens in `ai_settings` using keys `spotify_access_token`, `spotify_refresh_token`, `spotify_token_expiry`, `spotify_client_id`, and `spotify_display_name`. The Settings wizard and artist-page button import from this module.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@fabianlars/tauri-plugin-oauth` | `^2.0.0` | Spins up temporary 127.0.0.1 HTTP server for PKCE redirect callback | Already in package.json + Cargo.toml; already working for taste import |
| `@tauri-apps/plugin-shell` | `^2.3.5` | Opens system browser for Spotify auth URL | Already installed, already used in taste import |
| `@tauri-apps/api/core` (invoke) | `^2.10.1` | Calls Tauri commands for ai_settings storage | Already installed, already used everywhere |
| `crypto.subtle` (Web Crypto API) | native | PKCE code verifier + challenge generation | Already used in existing spotify.ts taste import |

### No New Dependencies
All required libraries are already installed. Phase 30 requires zero new npm packages or Cargo crates.

### Scopes Required
Spotify OAuth scopes for Phase 30:
- `user-read-private` — read display name for connection confirmation
- `user-read-playback-state` — check active devices
- `user-modify-playback-state` — trigger playback via Connect API

The existing taste-import uses `user-top-read` only. Phase 30 needs a new OAuth flow with the above scopes.

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/spotify/
├── auth.ts          # PKCE OAuth flow, token storage, refresh
├── api.ts           # Spotify Connect API calls (top tracks, playback, devices)
└── state.svelte.ts  # Reactive connection state ($state module-level)
```

The Settings wizard component lives in:
```
src/lib/components/SpotifySettings.svelte
```

The artist page "Play on Spotify" button is inline in:
```
src/routes/artist/[slug]/+page.svelte
```

### Pattern 1: PKCE OAuth with tauri-plugin-oauth

**What:** Start a temporary 127.0.0.1 HTTP server, open the Spotify auth URL in the system browser, wait for the callback URL, exchange the code for tokens.

**When to use:** Initial connection and reconnection flow.

**Critical: Use 127.0.0.1, never localhost.** Spotify blocked `localhost` redirect URIs as of November 2025. The developer must register `http://127.0.0.1` (without a port) in their Spotify app settings — Spotify permits dynamic port addition to loopback URIs.

**Example:**
```typescript
// Source: adapted from src/lib/taste/import/spotify.ts + Spotify docs
import { start, onUrl, cancel } from '@fabianlars/tauri-plugin-oauth';
import { open } from '@tauri-apps/plugin-shell';

export async function startSpotifyAuth(clientId: string): Promise<string> {
  const { verifier, challenge } = await generatePKCE();

  const port = await start();
  // CRITICAL: 127.0.0.1 not localhost — Spotify policy since Nov 2025
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-private user-read-playback-state user-modify-playback-state',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: generateRandomString(16) // CSRF protection
  });

  await open(`https://accounts.spotify.com/authorize?${params}`);

  const redirectUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cancel(port);
      reject(new Error('Authorization timed out'));
    }, 120_000); // 2 minute timeout

    onUrl((url: string) => {
      clearTimeout(timeout);
      resolve(url);
    });
  });

  // Exchange code
  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) throw new Error('No authorization code in callback');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier
    })
  });

  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
  const tokens = await tokenRes.json();
  return tokens; // { access_token, refresh_token, expires_in }
}
```

### Pattern 2: Token Storage in ai_settings

**What:** Store Spotify credentials using the existing `set_ai_setting` / `get_all_ai_settings` Tauri commands. No new Rust code needed.

**Keys:**
- `spotify_client_id` — user's Client ID (needed for token refresh)
- `spotify_access_token` — current access token
- `spotify_refresh_token` — refresh token for re-authorization
- `spotify_token_expiry` — Unix timestamp (ms) when access token expires
- `spotify_display_name` — cached display name for Settings UI

**Example:**
```typescript
// Source: pattern from src/lib/theme/preferences.svelte.ts
import { invoke } from '@tauri-apps/api/core';

export async function saveSpotifyTokens(data: {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  displayName: string;
}): Promise<void> {
  const expiry = Date.now() + data.expiresIn * 1000;
  await invoke('set_ai_setting', { key: 'spotify_client_id', value: data.clientId });
  await invoke('set_ai_setting', { key: 'spotify_access_token', value: data.accessToken });
  await invoke('set_ai_setting', { key: 'spotify_refresh_token', value: data.refreshToken });
  await invoke('set_ai_setting', { key: 'spotify_token_expiry', value: String(expiry) });
  await invoke('set_ai_setting', { key: 'spotify_display_name', value: data.displayName });
}

export async function clearSpotifyTokens(): Promise<void> {
  const keys = ['spotify_client_id', 'spotify_access_token', 'spotify_refresh_token',
                 'spotify_token_expiry', 'spotify_display_name'];
  for (const key of keys) {
    await invoke('set_ai_setting', { key, value: '' });
  }
}

export async function loadSpotifyState(): Promise<SpotifyStoredState | null> {
  const settings = await invoke<Record<string, string>>('get_all_ai_settings');
  const token = settings['spotify_access_token'];
  if (!token) return null;
  return {
    accessToken: token,
    refreshToken: settings['spotify_refresh_token'] ?? '',
    tokenExpiry: parseInt(settings['spotify_token_expiry'] ?? '0'),
    clientId: settings['spotify_client_id'] ?? '',
    displayName: settings['spotify_display_name'] ?? ''
  };
}
```

### Pattern 3: Token Refresh (PKCE)

**What:** PKCE refresh does not require `client_secret` — only `client_id`, `refresh_token`, and `grant_type: refresh_token`.

**When to use:** Before any API call when `Date.now() > tokenExpiry - 60_000` (refresh 1 min early).

**Important:** Spotify's PKCE refresh MAY or MAY NOT return a new refresh token. If a new refresh token is not returned, continue using the existing one. Do NOT assume single-flight mutex is needed for this phase — the STATE.md note about concurrent refresh causing 400 errors applies to production at scale; for single-user desktop this is not a problem.

```typescript
// Source: Spotify docs https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
export async function refreshSpotifyToken(
  clientId: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    })
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // keep old if not returned
    expiresIn: data.expires_in ?? 3600
  };
}
```

### Pattern 4: Reactive Connection State

**What:** Module-level `$state` object, same pattern as `streamingState` in `src/lib/player/streaming.svelte.ts`. Loaded from `ai_settings` on app boot (in `+layout.svelte` onMount), updated by the Settings wizard.

```typescript
// src/lib/spotify/state.svelte.ts
export const spotifyState = $state({
  connected: false,
  displayName: '' as string,
  accessToken: '' as string,
  refreshToken: '' as string,
  tokenExpiry: 0 as number,
  clientId: '' as string
});

export function setSpotifyConnected(data: {
  displayName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  clientId: string;
}): void {
  spotifyState.connected = true;
  spotifyState.displayName = data.displayName;
  spotifyState.accessToken = data.accessToken;
  spotifyState.refreshToken = data.refreshToken;
  spotifyState.tokenExpiry = data.tokenExpiry;
  spotifyState.clientId = data.clientId;
}

export function clearSpotifyState(): void {
  spotifyState.connected = false;
  spotifyState.displayName = '';
  spotifyState.accessToken = '';
  spotifyState.refreshToken = '';
  spotifyState.tokenExpiry = 0;
  spotifyState.clientId = '';
}
```

### Pattern 5: Get Artist Top Tracks + Trigger Playback

**What:** Extract Spotify artist ID from the MusicBrainz URL (`data.links.spotify[0]`), fetch top tracks, then PUT to `/me/player/play` with the track URIs.

**Artist ID extraction:** `data.links.spotify[0]` is a URL like `https://open.spotify.com/artist/4Z8W4fohXX484ULPew5ay1`. The existing `spotifyEmbedUrl()` function in `src/lib/embeds/spotify.ts` already has the regex pattern `/open\.spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/` — reuse this to extract the ID.

**Market parameter:** When a user access token is provided, the user's account country automatically applies to top tracks. Pass `market=from_token` to make this explicit.

```typescript
// Source: Spotify Web API reference docs
export async function getArtistTopTracks(
  spotifyArtistId: string,
  accessToken: string
): Promise<string[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyArtistId}/top-tracks?market=from_token`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status === 401) throw new SpotifyAuthError('Token expired');
  if (res.status === 404) throw new SpotifyNotFoundError('Artist not found on Spotify');
  if (!res.ok) throw new Error(`Top tracks fetch failed: ${res.status}`);

  const data = await res.json();
  return data.tracks.map((t: { uri: string }) => t.uri); // spotify:track:xxx
}

export async function playTracksOnSpotify(
  trackUris: string[],
  accessToken: string
): Promise<'ok' | 'no_device' | 'premium_required' | 'token_expired'> {
  const res = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: trackUris.slice(0, 10) })
  });

  if (res.status === 204) return 'ok';
  if (res.status === 401) return 'token_expired';
  if (res.status === 403) return 'premium_required';
  if (res.status === 404) {
    // Body: { error: { status: 404, message: "Player command failed: No active device found",
    //                  reason: "NO_ACTIVE_DEVICE" } }
    return 'no_device';
  }
  return 'no_device'; // fallback for other errors
}
```

### Pattern 6: Spotify ID from MusicBrainz URL

The artist page has `data.links.spotify: string[]` populated in `+page.ts`. The first entry (if any) is the MusicBrainz Spotify artist URL. Extract the Spotify artist ID:

```typescript
function extractSpotifyArtistId(spotifyUrl: string): string | null {
  const match = spotifyUrl.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
```

### Pattern 7: Settings Wizard Component Structure

The Settings page already has `import-card` CSS pattern with header/desc/fields/actions substructure. The SpotifySettings component should use this same visual language. The wizard step is controlled by a local `$state` variable:

```typescript
// In SpotifySettings.svelte
type WizardStep = 'setup' | 'waiting' | 'success';
let step = $state<WizardStep>('setup');
let clientIdInput = $state('');
let cancelPort = $state<number | null>(null);
```

The wizard replaces the entire settings section content when connected — driven by `spotifyState.connected`.

### Anti-Patterns to Avoid

- **Using `localhost` in redirect URI:** Blocked by Spotify since November 2025. Always `http://127.0.0.1:${port}/callback`.
- **Storing tokens in component-local state only:** Tokens must persist to `ai_settings` so they survive page navigation and app restarts.
- **Background token polling:** The decision is "detect expiry on next play attempt only." No setInterval, no background checks.
- **Using `tauri-plugin-stronghold`:** Deprecated, removed in Tauri v3. Already documented in STATE.md. Use `ai_settings` table.
- **Spotify Web Playback SDK:** Blocked by Widevine CDM unavailability in WebView2. Not applicable to this phase anyway (phase uses Connect API, not in-app audio).
- **Bundled client_id:** Spotify Feb 2026 policy caps dev mode at 5 users. Users must provide their own.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local HTTP redirect callback | Custom Rust TCP server | `tauri-plugin-oauth` | Already installed, already working, handles port allocation and URL parsing |
| Opening system browser | `std::process::Command` or WebView | `@tauri-apps/plugin-shell` open() | Already installed, cross-platform |
| PKCE crypto | Custom SHA-256 | `crypto.subtle.digest('SHA-256', ...)` | Already working in existing spotify.ts; Web Crypto API is available in Tauri WebView |
| Token persistence | File system or localStorage | `ai_settings` via `set_ai_setting` invoke | Existing pattern used by all other preferences in this codebase |

---

## Common Pitfalls

### Pitfall 1: localhost Redirect URI
**What goes wrong:** OAuth callback fails with `INVALID_CLIENT: Insecure redirect URI` error after authorization.
**Why it happens:** Spotify blocked `localhost` redirect URIs as of November 27, 2025. Only loopback IP literals (`http://127.0.0.1:PORT`) are accepted.
**How to avoid:** Always construct `redirectUri = \`http://127.0.0.1:${port}/callback\`` — never use `localhost`.
**Warning signs:** The existing `src/lib/taste/import/spotify.ts` uses `http://localhost:${port}/callback` and must NOT be copied as-is.
**Pre-check note (from STATE.md):** Verify the existing Spotify taste-import OAuth registration also uses `http://127.0.0.1` — and update it as part of this phase if it doesn't.

### Pitfall 2: 404 NO_ACTIVE_DEVICE on Playback
**What goes wrong:** `PUT /me/player/play` returns 404 with `reason: "NO_ACTIVE_DEVICE"` even though Spotify Desktop is installed.
**Why it happens:** Spotify Desktop must be running AND must have been used to play at least one track (to register as an active device). Simply launching Spotify is not enough — it must have played something.
**How to avoid:** Show the user-friendly inline message: "Open Spotify Desktop and start playing anything, then try again." This is the exact wording specified in CONTEXT.md.
**Warning signs:** 404 response body includes `"reason": "NO_ACTIVE_DEVICE"` in the error object.

### Pitfall 3: 403 PREMIUM_REQUIRED
**What goes wrong:** `PUT /me/player/play` returns 403 even with correct scopes.
**Why it happens:** Spotify Connect API requires a Premium subscription. Free accounts cannot use playback control endpoints.
**How to avoid:** Surface a user-friendly message: "Spotify Premium is required to play tracks from BlackTape." Add this as a distinct error state in `playTracksOnSpotify()`.
**Warning signs:** 403 response with `"reason": "PREMIUM_REQUIRED"`.

### Pitfall 4: Token Expiry During Long Sessions
**What goes wrong:** Access token expires (1 hour), next play attempt gets 401.
**Why it happens:** Access tokens have a 1-hour (3600 second) TTL.
**How to avoid:** In `getValidToken()` helper, check `Date.now() > spotifyState.tokenExpiry - 60_000` before any API call and refresh proactively. Surface "Spotify session expired — reconnect in Settings." for hard refresh failures.

### Pitfall 5: Spotify URL Not Found for Artist
**What goes wrong:** `data.links.spotify` is empty for many artists (not all artists are on Spotify or have their Spotify link in MusicBrainz).
**How to avoid:** The "Play on Spotify" button must be hidden (not disabled) when `data.links.spotify.length === 0`. This is already specified in CONTEXT.md — no grayed-out state. Guard: `{#if tauriMode && spotifyState.connected && data.links.spotify.length > 0}`.

### Pitfall 6: Wizard Cancel Leaves Server Running
**What goes wrong:** User opens browser, then clicks Cancel in wizard — the `tauri-plugin-oauth` server keeps running, consuming a port.
**Why it happens:** `start()` begins the server; if the redirect never comes, the server stays up.
**How to avoid:** Store the port in `cancelPort` state variable. On wizard cancel: call `cancel(cancelPort)` from `@fabianlars/tauri-plugin-oauth`, then reset wizard state.

### Pitfall 7: setActiveSource Not Called for Spotify
**What goes wrong:** Spotify playback starts but `streamingState.activeSource` remains `null` — the player bar doesn't show the Spotify badge.
**How to avoid:** Call `setActiveSource('spotify')` from `src/lib/player/streaming.svelte.ts` immediately after a successful `PUT /me/player/play`. Call `clearActiveSource()` on disconnect or on 404/401 errors.

---

## Code Examples

### Complete play flow on artist page

```typescript
// In artist page +page.svelte, "Play on Spotify" button handler
async function handlePlayOnSpotify() {
  spotifyPlayState = 'loading';
  spotifyPlayMessage = null;

  try {
    const { getValidAccessToken } = await import('$lib/spotify/auth');
    const { getArtistTopTracks, playTracksOnSpotify } = await import('$lib/spotify/api');
    const { setActiveSource } = await import('$lib/player/streaming.svelte');

    let token: string;
    try {
      token = await getValidAccessToken();
    } catch {
      spotifyPlayState = 'error';
      spotifyPlayMessage = 'Spotify session expired — reconnect in Settings.';
      return;
    }

    const spotifyArtistId = extractSpotifyArtistId(data.links.spotify[0]);
    if (!spotifyArtistId) {
      spotifyPlayState = 'error';
      spotifyPlayMessage = "Couldn't load tracks for this artist on Spotify.";
      return;
    }

    let trackUris: string[];
    try {
      trackUris = await getArtistTopTracks(spotifyArtistId, token);
    } catch (e) {
      spotifyPlayState = 'error';
      if (e instanceof SpotifyAuthError) {
        spotifyPlayMessage = 'Spotify session expired — reconnect in Settings.';
      } else {
        spotifyPlayMessage = "Couldn't load tracks for this artist on Spotify.";
      }
      return;
    }

    const result = await playTracksOnSpotify(trackUris, token);

    if (result === 'ok') {
      setActiveSource('spotify');
      spotifyPlayState = 'idle';
    } else if (result === 'no_device') {
      spotifyPlayState = 'error';
      spotifyPlayMessage = 'Open Spotify Desktop and start playing anything, then try again.';
    } else if (result === 'premium_required') {
      spotifyPlayState = 'error';
      spotifyPlayMessage = 'Spotify Premium is required to play tracks from BlackTape.';
    } else if (result === 'token_expired') {
      spotifyPlayState = 'error';
      spotifyPlayMessage = 'Spotify session expired — reconnect in Settings.';
    }
  } catch {
    spotifyPlayState = 'error';
    spotifyPlayMessage = "Couldn't connect to Spotify. Try again.";
  }
}
```

### Spotify API scopes for this phase

```typescript
// Required OAuth scopes for Phase 30
const SPOTIFY_SCOPES = [
  'user-read-private',           // get display name for connection confirmation
  'user-read-playback-state',    // check active devices (GET /me/player/devices)
  'user-modify-playback-state'   // trigger playback (PUT /me/player/play)
].join(' ');
```

### Settings wizard state machine

```typescript
// Three states: setup (show form), waiting (show spinner + cancel), success (show confirmation)
type WizardStep = 'setup' | 'waiting' | 'success';
let step = $state<WizardStep>(spotifyState.connected ? 'success' : 'setup');
let clientIdInput = $state('');
let cancelPort = $state<number | null>(null);
let errorMessage = $state<string | null>(null);

async function handleAuthorize() {
  if (!clientIdInput.trim()) return;
  step = 'waiting';
  errorMessage = null;

  try {
    const { startSpotifyAuth } = await import('$lib/spotify/auth');
    const result = await startSpotifyAuth(clientIdInput.trim());
    // result has tokens + display name

    await saveSpotifyTokens({ clientId: clientIdInput.trim(), ...result });
    setSpotifyConnected({ clientId: clientIdInput.trim(), ...result });
    step = 'success';
  } catch (e) {
    step = 'setup';
    errorMessage = e instanceof Error ? e.message : 'Authorization failed.';
  }
}

async function handleCancel() {
  if (cancelPort !== null) {
    const { cancel } = await import('@fabianlars/tauri-plugin-oauth');
    await cancel(cancelPort);
    cancelPort = null;
  }
  step = 'setup';
}

async function handleDisconnect() {
  const { clearSpotifyTokens } = await import('$lib/spotify/auth');
  await clearSpotifyTokens();
  clearSpotifyState();
  step = 'setup';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localhost` redirect URI | `127.0.0.1` redirect URI | November 27, 2025 | Breaking change — existing taste-import uses old pattern and must be updated |
| Implicit grant flow | PKCE only | November 27, 2025 | No `client_secret` needed; already implemented in existing spotify.ts |
| `tauri-plugin-stronghold` for secret storage | `ai_settings` table in taste.db | Tauri v3 removed stronghold | Already documented in STATE.md |

**Pre-check required:** The existing `src/lib/taste/import/spotify.ts` line 45 uses `http://localhost:${port}/callback`. This must be updated to `http://127.0.0.1:${port}/callback` as part of Phase 30 work.

---

## Open Questions

1. **Wizard screenshot for Step 1**
   - What we know: CONTEXT.md says "Screenshot in step 1 should show the Spotify dashboard with Client ID field highlighted"
   - What's unclear: Should this be a real screenshot embedded in the app, or a simplified diagram drawn in HTML/CSS?
   - Recommendation: Use a simplified HTML/CSS representation of the Spotify dashboard — avoids binary asset management, scales with any window size, and won't go stale if Spotify changes their UI. A simple bordered box with labeled fields is sufficient.

2. **market=from_token vs explicit market code**
   - What we know: Spotify docs say user account country takes priority when a user token is present. `market=from_token` is accepted.
   - What's unclear: Whether `from_token` is documented for the top tracks endpoint vs just search.
   - Recommendation: Use `market=from_token` — this is the documented pattern for user-authenticated requests. If it fails, fall back to omitting the market param entirely (tokens already supply country context).

3. **Taste-import spotify.ts localhost → 127.0.0.1 migration**
   - What we know: Existing code uses `localhost` which is now blocked by Spotify.
   - What's unclear: Whether this break has already been noticed by users (likely yes, if any Phase 29 taste-import users tested).
   - Recommendation: Fix `src/lib/taste/import/spotify.ts` line 45 as part of this phase (trivial one-line change). Include in Wave 1 or as a prerequisite task.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skip this section.

---

## Sources

### Primary (HIGH confidence)
- Spotify official docs: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow — PKCE flow steps
- Spotify official docs: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens — refresh token behavior
- Spotify official docs: https://developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks — top tracks endpoint
- Spotify official docs: https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback — Connect API playback
- Spotify official docs: https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices — devices endpoint
- Spotify official docs: https://developer.spotify.com/documentation/web-api/concepts/redirect_uri — redirect URI policy
- GitHub FabianLars/tauri-plugin-oauth README — plugin API (start, onUrl, cancel)
- Project codebase: `src/lib/taste/import/spotify.ts` — existing working PKCE implementation
- Project codebase: `src/lib/theme/preferences.svelte.ts` — ai_settings storage pattern
- Project codebase: `src/lib/player/streaming.svelte.ts` — module-level $state pattern
- Project codebase: `src-tauri/Cargo.toml` — confirmed tauri-plugin-oauth already installed
- Project codebase: `src-tauri/src/lib.rs` line 189 — confirmed `.plugin(tauri_plugin_oauth::init())` already registered
- Project codebase: `src/routes/artist/[slug]/+page.ts` — confirmed `data.links.spotify[]` populated from MusicBrainz

### Secondary (MEDIUM confidence)
- Spotify blog: https://developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025 — November 2025 localhost deprecation
- Spotify blog: https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify — February 2025 policy announcement
- GitHub spotify/web-api issues: 404 NO_ACTIVE_DEVICE behavior confirmed as long-standing pattern

### Tertiary (LOW confidence)
- None — all critical findings verified with official docs or codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json + Cargo.toml; existing working code in codebase
- Architecture: HIGH — all patterns derived from existing codebase conventions and official Spotify docs
- Pitfalls: HIGH — redirect URI change verified with official Spotify docs; NO_ACTIVE_DEVICE behavior verified with GitHub issues + docs

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (Spotify API is stable; plugin APIs unlikely to change in 30 days)
