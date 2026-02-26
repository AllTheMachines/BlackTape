# Architecture Research

**Domain:** v1.6 streaming integration — multi-source playback in existing Tauri 2.0 + Svelte 5 app
**Researched:** 2026-02-26
**Confidence:** HIGH for Spotify PKCE + Web API patterns (verified against official docs), HIGH for SoundCloud oEmbed (confirmed docs), HIGH for YouTube Data API (confirmed docs), MEDIUM for Spotify Web Playback SDK in WebView2 (works in Chromium-based browsers, CSP known solvable in this codebase), LOW for Bandcamp embed from artist URL (no oEmbed, album ID required — see PITFALLS)

---

## Answering the Six Architecture Questions

### Q1: Where does the Spotify token live?

**Answer: `ai_settings` table in `taste.db` via existing `set_ai_setting` / `get_ai_setting` Tauri commands. No new Rust commands needed for storage.**

The existing `ai_settings` key-value store (already used for theme preferences, layout preferences, streaming preference, private listening mode) is the right home for the Spotify token. Pattern is already established: `set_ai_setting({ key: 'spotify_access_token', value: token })`.

**Token lifecycle design:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Token Storage: taste.db ai_settings table                       │
│                                                                   │
│  Keys:                                                            │
│  - spotify_access_token  — Bearer token (expires ~1hr)            │
│  - spotify_refresh_token — Refresh token (long-lived)             │
│  - spotify_token_expires — Unix timestamp of expiration           │
│  - spotify_client_id     — Bundled client ID (or user-provided)   │
└─────────────────────────────────────────────────────────────────┘
```

**NOT stored in Svelte $state directly** — the token is sensitive and should not be reactive state that leaks into DevTools. Load it into a module-scoped variable in `src/lib/streaming/spotify-auth.ts` on demand. Expose only connection status (`connected: boolean`, `isPremium: boolean`) to reactive Svelte state.

**Data flow:**

```
App cold start
  → onMount: streaming/spotify-auth.ts checks taste.db for token
  → if token exists and not expired: mark status = connected
  → if token expired: call refresh endpoint silently
  → if refresh fails: mark status = disconnected

User navigates to artist page
  → resolver checks streamingState.spotify.connected
  → if connected: use token from module-scoped var
  → if disconnected: show "Connect Spotify" button
```

**Why not tauri-plugin-secure-storage or Stronghold?**
Those plugins add Cargo complexity and require additional permission configuration. The `ai_settings` table is already used for similarly sensitive settings (private mode, identity keys). For an open-source desktop app with bundled client ID, OS keyring is not meaningfully more secure. MEDIUM confidence this is acceptable — if Spotify's TOS review requires secure storage, it is a localized change.

### Q2: Spotify URL to playable content — resolving artist ID and top tracks

**Answer: Parse the artist ID directly from the MusicBrainz-provided Spotify URL. No search API call needed.**

MusicBrainz stores Spotify artist page URLs in the format `https://open.spotify.com/artist/{ARTIST_ID}`. The artist ID is in the URL path.

```typescript
// Already possible with existing spotify.ts pattern
function extractSpotifyArtistId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}
```

Once the artist ID is known, the resolution chain is:

```
Step 1: GET /v1/artists/{artistId}/top-tracks?market=US
  → Returns array of track objects, each with:
    - uri: "spotify:track:{trackId}"
    - name: track title
    - preview_url: 30-second clip URL (may be null)
    - duration_ms, explicit, album (with images)

Step 2 (playback): PUT /v1/me/player/play?device_id={sdkDeviceId}
  Body: { "uris": ["spotify:track:{id}", ...] }
  Scope required: user-modify-playback-state
  Note: Premium only. 204 on success.

Step 3 (fallback, no Premium): Use preview_url for 30s clip via <audio>
  OR render Spotify embed iframe (no Premium required for embed)
```

**For album playback from release pages:** MusicBrainz release-group data already includes Spotify album URLs (format: `open.spotify.com/album/{albumId}`). Extract the album ID, call `GET /v1/albums/{albumId}/tracks` to get the full tracklist with URIs, then `PUT /v1/me/player/play` with `context_uri: "spotify:album:{albumId}"`.

**Scope requirements for the full flow:**
- `user-read-private` — check Premium status
- `user-modify-playback-state` — start/pause/skip via Web API
- `streaming` — required for Web Playback SDK device registration

### Q3: SoundCloud and Bandcamp embed URL construction from artist URLs

**SoundCloud: oEmbed works directly with artist profile URLs. Confirmed.**

SoundCloud's oEmbed endpoint accepts "any URL pointing to a user, set or track." A MusicBrainz-provided artist URL like `https://soundcloud.com/artistname` is a valid user URL. Passing it to the existing `soundcloudOembedUrl()` function in `src/lib/embeds/soundcloud.ts` is already correct.

```
Existing code (soundcloud.ts):
  soundcloudOembedUrl(url) → "https://soundcloud.com/oembed?url={encoded}&format=json&maxheight=166"

Result when called with artist profile URL:
  → SoundCloud returns HTML for a widget player showing the artist's recent tracks
  → Widget auto-plays from their latest public track
  → No additional URL manipulation needed
```

The existing `soundcloudOembedUrl()` function already handles this correctly. The artist page load function already fetches this oEmbed HTML server-side. No changes needed for SoundCloud artist-level embedding — this already works.

**Bandcamp: No oEmbed. No programmatic embed from artist URL. Embed requires album-specific numeric IDs.**

Bandcamp embed URLs require a numeric album or track ID, e.g.:
```
https://bandcamp.com/EmbeddedPlayer/album=4178276839/size=large/...
```

This numeric ID is not the artist name, not the album slug, not anything available from a MusicBrainz artist URL. There is no Bandcamp oEmbed endpoint. There is no Bandcamp public API that maps artist URLs to album IDs.

**Viable approaches ranked:**

1. **Scrape the og:video meta tag from the Bandcamp album page** — Bandcamp's album pages include `<meta property="og:video:secure_url" content="https://bandcamp.com/EmbeddedPlayer.swf?...">`. Parse the numeric ID from that. This is fragile (depends on Bandcamp page structure) and is fetch-dependent.

2. **Use MusicBrainz release-group streaming links** — The artist page already fetches release-group data including URL relationships. If a release has a Bandcamp URL like `https://artist.bandcamp.com/album/album-slug`, that is an album page URL. Fetching that page to extract the embed ID is the cleanest available path.

3. **External link only (current behavior, acceptable default)** — Show "Listen on Bandcamp" as an external link. The artist already has this via `categorizedLinks.streaming`. For the streaming integration, Bandcamp remains "click to open" unless the embed ID is resolved.

**Recommendation: Keep Bandcamp as external-link-only in the service resolver for v1.6. The complexity of Bandcamp ID scraping is high, the reliability is low, and the Spotify/SoundCloud/YouTube integrations already cover playable audio.**

### Q4: YouTube — finding a playable video from a channel URL

**Answer: Two-step process. Step 1: Extract or resolve channel ID. Step 2: Search channel videos by artist name + track name.**

MusicBrainz YouTube URLs come in several formats:
- `https://www.youtube.com/channel/UCxxxxx` — has channel ID directly in URL
- `https://www.youtube.com/@handle` — handle format (post-2022)
- `https://www.youtube.com/c/customname` — legacy custom URL
- `https://www.youtube.com/user/username` — legacy user URL

**Step 1: Get channel ID**

For `/channel/UCxxxxx` URLs: extract the ID directly with regex.

For `/@handle` URLs: use `GET /youtube/v3/channels?part=id&forHandle=@handle&key={apiKey}` (forHandle parameter added January 2024, confirmed current).

For legacy `/c/` and `/user/` URLs: use `GET /youtube/v3/channels?part=id&forUsername={name}&key={apiKey}`.

**Step 2: Search for a specific video**

```
GET /youtube/v3/search?part=snippet
  &channelId={channelId}
  &q={artistName}+{trackTitle}
  &type=video
  &maxResults=5
  &key={apiKey}
```

Returns video IDs. Use the first result. Embed with:
```
https://www.youtube-nocookie.com/embed/{videoId}
```

**The quota cost problem:** Each YouTube Data API search costs 100 quota units. The daily default quota is 10,000 units. 100 searches per day before hitting limits. This means YouTube search should be on-demand (user clicks "Find on YouTube"), not eager (resolved at page load for every artist).

**Fallback: no YouTube Data API key.** Build an alternative approach using the YouTube channel URL directly:
- Open the channel URL in a browser tab (Tauri `open()`) when user clicks
- OR construct a YouTube search URL: `https://www.youtube.com/results?search_query={artistName}+{trackTitle}` — opens in browser, no API key needed

**Recommendation: YouTube integration in v1.6 should be embed-only for artists whose MusicBrainz YouTube URL is already a video URL (has `/watch?v=` or `youtu.be/`), with a "Search on YouTube" external link for channel-only URLs. The Data API search path is a v1.7+ feature due to quota complexity.**

### Q5: Resolution strategy — eager vs on-demand

**Answer: Lazy/on-demand resolution, not eager. Resolve the preferred service when the user clicks play.**

**Why not eager (resolve all services at page load):**
- Artist pages already make 4 MusicBrainz API calls at load time (links, releases, relationships, bio). Adding 1-3 more external API calls at load (Spotify top-tracks, SoundCloud oEmbed) degrades perceived load time.
- YouTube search (100 units/query) at page load would exhaust daily quota quickly.
- Most users will not click play on every artist they visit — resolution is wasted for browse-only sessions.
- Spotify token may not be present for all users — silent failure at load creates confusing states.

**Correct pattern — lazy resolver:**

```
User arrives at artist page
  → page loads, links resolved (existing behavior, unchanged)
  → StreamingPanel component shows available services
    (based only on which platform URLs exist in links data — no API calls yet)

User clicks service badge or "Play" button
  → resolver fires for that service only
  → Spotify: call /artists/{id}/top-tracks, start Web Playback SDK
  → SoundCloud: oEmbed already fetched at page load (existing behavior, keep)
  → YouTube: open external search link (or embed if video URL known)
  → show loading state while resolving
```

**Exception: SoundCloud oEmbed can stay eager.** The existing page load function already fetches SoundCloud oEmbed HTML. This is a single small HTTP call and it's already wired. Keep it.

**Service availability detection (zero API calls):**
```typescript
// Determine which services have content — from existing links data
const available = {
  spotify: links.spotify.length > 0,     // has Spotify artist URL
  soundcloud: links.soundcloud.length > 0, // has SoundCloud URL
  youtube: links.youtube.length > 0,      // has YouTube URL
  bandcamp: links.bandcamp.length > 0,    // has Bandcamp URL
};
```

This drives the StreamingPanel UI without any new API calls.

### Q6: New Svelte stores/modules needed vs existing stores to modify

**New stores/modules:**

| File | Purpose | New or Modified |
|------|---------|-----------------|
| `src/lib/streaming/spotify-auth.ts` | PKCE OAuth flow, token management, refresh | NEW |
| `src/lib/streaming/spotify-player.ts` | Web Playback SDK wrapper, device ID management | NEW |
| `src/lib/streaming/resolver.ts` | Per-artist service resolution dispatch | NEW |
| `src/lib/streaming/state.svelte.ts` | Reactive: connection status, active source, device ID | NEW |
| `src/lib/streaming/service-priority.svelte.ts` | Ordered service list, persistence to taste.db | NEW |

**Existing stores/modules to modify:**

| File | What Changes |
|------|-------------|
| `src/lib/player/state.svelte.ts` | Add `activeSource` field: `'local' \| 'spotify' \| 'soundcloud' \| 'youtube' \| 'bandcamp' \| null` |
| `src/lib/theme/preferences.svelte.ts` | `streamingPref.platform` (single string) → `streamingPref.priorityOrder` (ordered array). Breaking change, migration needed. |
| `src/routes/settings/+page.svelte` | Replace single-select dropdown with drag-to-reorder list for service priority |
| `src/routes/artist/[slug]/+page.ts` | No changes needed — links data is already correct |
| `src/routes/artist/[slug]/+page.svelte` | Add `<StreamingPanel>` component, source switcher buttons |

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Artist Page (+page.svelte)                                            │
│                                                                        │
│  ┌────────────────────────────────┐  ┌───────────────────────────┐    │
│  │ StreamingPanel.svelte           │  │ Existing artist page       │    │
│  │ - available service badges      │  │ content (links, releases,  │    │
│  │ - active source indicator       │  │ bio, relationships, tags)  │    │
│  │ - "Play" button per service     │  └───────────────────────────┘    │
│  │ - source switcher               │                                    │
│  └──────────────┬─────────────────┘                                    │
│                 │ on play click                                          │
│  ┌──────────────▼─────────────────────────────────────────────────┐   │
│  │ resolver.ts — dispatches by service + priority                   │   │
│  └──┬──────────────┬──────────────────────┬───────────────────┬───┘   │
│     │              │                       │                   │        │
│  Spotify        SoundCloud              YouTube             Bandcamp    │
│  ┌──▼──┐        ┌──▼──┐              ┌──▼──┐             ┌──▼──┐      │
│  │ SDK  │        │oEmbed│              │ open │             │ open │     │
│  │player│        │iframe│              │extern│             │extern│     │
│  └──┬──┘        └──┬──┘              └─────┘             └─────┘      │
│     │              │                                                     │
│  ┌──▼──────────────▼──────────────────────────────────────────────┐   │
│  │ Player Bar (existing) — Player.svelte                            │   │
│  │ + service badge (NEW)                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ streaming/state.svelte.ts (NEW)                                    │  │
│  │ - spotify: { connected, isPremium, deviceId }                      │  │
│  │ - activeSource: 'local' | 'spotify' | 'soundcloud' | ...           │  │
│  │ - servicePriority: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

External APIs called at resolution time (not page load):
  - Spotify: /v1/artists/{id}/top-tracks (with Bearer token)
  - Spotify: /v1/me/player/play (with device_id, Premium only)
  - YouTube Data API: optional, on-demand only, quota-gated
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `StreamingPanel.svelte` | Shows available service badges, play buttons, active source, source switcher | NEW |
| `SpotifyPlayer.svelte` | Hosts the Web Playback SDK `<script>` tag, initializes player, exposes deviceId | NEW |
| `ServiceBadge.svelte` | Small badge in Player bar showing active service (Spotify/SC/YT) | NEW |
| `streaming/spotify-auth.ts` | PKCE flow, token exchange, refresh, status check | NEW |
| `streaming/spotify-player.ts` | SDK initialization, `window.Spotify.Player` lifecycle, device readiness | NEW |
| `streaming/resolver.ts` | Given artist links + priority order → dispatch to correct service path | NEW |
| `streaming/state.svelte.ts` | Global reactive streaming state (connection, activeSource, deviceId) | NEW |
| `streaming/service-priority.svelte.ts` | Ordered service list, load/save to taste.db | NEW |
| `player/state.svelte.ts` | Add `activeSource` field to existing `playerState` | MODIFIED |
| `theme/preferences.svelte.ts` | Migrate `streamingPref.platform` (string) to `streamingPref.priorityOrder` (array) | MODIFIED |
| `settings/+page.svelte` | Replace platform dropdown with drag-to-reorder Streaming section | MODIFIED |
| `settings/+page.svelte` | Add Spotify connect/disconnect card with OAuth trigger | MODIFIED |
| `artist/[slug]/+page.svelte` | Add `<StreamingPanel>` in artist page layout | MODIFIED |
| `artist/[slug]/release/[mbid]/+page.svelte` | Add "Play Album" button that triggers Spotify album playback | MODIFIED |

---

## Recommended Project Structure (New Additions)

```
src/
├── lib/
│   └── streaming/               # NEW module — all streaming integration
│       ├── state.svelte.ts      # Reactive: connection status, active source
│       ├── spotify-auth.ts      # PKCE OAuth flow, token lifecycle
│       ├── spotify-player.ts    # Web Playback SDK wrapper
│       ├── resolver.ts          # Service dispatch (given links + priority → action)
│       ├── service-priority.svelte.ts  # Ordered service list, persisted
│       └── index.ts             # Barrel export
├── components/
│   ├── StreamingPanel.svelte    # NEW — artist page service selector
│   ├── SpotifyPlayer.svelte     # NEW — SDK host component (loads script tag)
│   └── ServiceBadge.svelte      # NEW — player bar active source badge
```

---

## Architectural Patterns

### Pattern 1: Lazy Resolution — No API Calls at Page Load

**What:** Service availability is detected from existing `links` data (which platforms have URLs). API calls to resolve actual playable content only fire when the user clicks play for a specific service.

**When to use:** Always, for streaming resolution. Page load is already network-heavy (4 MusicBrainz API calls). Do not add to it.

**Trade-offs:** User sees a brief loading state when clicking play. Acceptable — this is the same pattern streaming services use themselves. The alternative (eager resolution at load) wastes network/quota on browse-only sessions.

**Example — StreamingPanel click handler:**
```typescript
// resolver.ts
async function resolveAndPlay(service: PlatformType, links: PlatformLinks): Promise<void> {
  switch (service) {
    case 'spotify': {
      const artistId = extractSpotifyArtistId(links.spotify[0]);
      if (!artistId) return;
      const token = await getSpotifyToken(); // from taste.db module var
      const tracks = await fetchTopTracks(artistId, token);
      const uris = tracks.map(t => t.uri);
      await startPlayback(uris, streamingState.spotify.deviceId, token);
      streamingState.activeSource = 'spotify';
      break;
    }
    case 'soundcloud': {
      // oEmbed already fetched at page load — embed HTML in page data
      // Just signal to render the SoundCloud iframe
      streamingState.activeSource = 'soundcloud';
      break;
    }
    case 'youtube': {
      // If URL is a video URL (youtubeEmbedUrl returns non-null): embed it
      // If URL is channel: open external link
      const embedUrl = youtubeEmbedUrl(links.youtube[0]);
      if (embedUrl) {
        streamingState.youtubeEmbedUrl = embedUrl;
        streamingState.activeSource = 'youtube';
      } else {
        await open(links.youtube[0]); // Tauri shell open
      }
      break;
    }
    case 'bandcamp': {
      await open(links.bandcamp[0]); // External only — no embed construction
      break;
    }
  }
}
```

### Pattern 2: Spotify Web Playback SDK via Script Tag in SpotifyPlayer.svelte

**What:** The Web Playback SDK requires a `<script src="https://sdk.scdn.co/spotify-player.js">` tag. This is loaded once, as a component, in the root layout. The SDK sets `window.Spotify` and calls `window.onSpotifyWebPlaybackSDKReady`.

**When to use:** Inject the SDK script when the user has a Spotify token (connected). Do not load it for non-connected users.

**Trade-offs:** The SDK script cannot be bundled with the app — it must load from Spotify's CDN. The current Tauri config has `"csp": null` (CSP disabled), so there is no blocking issue. If CSP is ever enabled, add `https://sdk.scdn.co` to `script-src`.

**Required scopes for full SDK use:**
- `streaming` — required for SDK player registration (without this, SDK device won't register)
- `user-read-private` — required to verify Premium status
- `user-modify-playback-state` — required for `PUT /v1/me/player/play` API call

**Example — SpotifyPlayer.svelte:**
```typescript
// In onMount — load SDK script when Spotify is connected
onMount(() => {
  if (!streamingState.spotify.connected) return;

  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new window.Spotify.Player({
      name: 'BlackTape Player',
      getOAuthToken: cb => {
        getSpotifyToken().then(token => cb(token));
      },
      volume: 0.8
    });

    player.addListener('ready', ({ device_id }) => {
      streamingState.spotify.deviceId = device_id;
    });

    player.connect();
  };

  const script = document.createElement('script');
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  document.body.appendChild(script);
});
```

### Pattern 3: Token Storage via Existing ai_settings Pattern

**What:** Spotify access token, refresh token, and expiry stored as key-value rows in `taste.db` using the existing `set_ai_setting` / `get_ai_setting` Tauri commands. Module-scoped variables in `spotify-auth.ts` cache the token in memory for the session.

**When to use:** For any session-persistent credential that does not need reactive UI display. The token itself should never appear in $state.

**Trade-offs:** `ai_settings` is not designed for security — it's a plaintext SQLite table. Acceptable for an open-source desktop app where the user owns their machine. The Spotify PKCE flow does not use client secrets, so token exposure risk is limited.

**Example — spotify-auth.ts module pattern:**
```typescript
// Module-scoped — not reactive $state
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getSpotifyToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  // Load from taste.db
  const { invoke } = await import('@tauri-apps/api/core');
  cachedToken = await invoke('get_ai_setting', { key: 'spotify_access_token' });
  const expiryStr = await invoke<string | null>('get_ai_setting', { key: 'spotify_token_expires' });
  tokenExpiry = expiryStr ? parseInt(expiryStr) : 0;

  if (Date.now() >= tokenExpiry) {
    // Token expired — attempt refresh
    cachedToken = await refreshSpotifyToken();
  }
  return cachedToken;
}
```

### Pattern 4: Service Priority as Ordered Array

**What:** The existing `streamingPref.platform` (single string) is insufficient for v1.6. Service priority needs to be an ordered array — the first service in the list is tried first when the user clicks play. This matches the Parachord drag-to-reorder pattern but simpler.

**When to use:** Replace the existing `preferred_platform` ai_settings key with a `service_priority_order` key holding a JSON array.

**Trade-offs:** Breaking change from v1.5 preference. Handle gracefully: if `service_priority_order` is not set, derive default order from `preferred_platform` (if set) with others appended, then fall back to `['bandcamp', 'spotify', 'soundcloud', 'youtube']`.

**Persistence pattern (matches existing):**
```typescript
// service-priority.svelte.ts
export const servicePriorityState = $state({
  order: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] as PlatformType[]
});

export async function saveServicePriority(order: PlatformType[]): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_ai_setting', { key: 'service_priority_order', value: JSON.stringify(order) });
  servicePriorityState.order = order;
}
```

---

## Data Flow

### Spotify OAuth (PKCE) Flow

The existing `tauri-plugin-oauth` (already in `Cargo.toml`) and `@fabianlars/tauri-plugin-oauth` (already in `src/lib/taste/import/spotify.ts`) handle the localhost redirect server. The new Spotify auth for playback reuses this exact pattern.

```
User clicks "Connect Spotify" in Settings
  → spotify-auth.ts: generatePKCE() → verifier + challenge
  → tauri-plugin-oauth: start() → get ephemeral port
  → open() Spotify auth URL with:
      scope: "streaming user-read-private user-modify-playback-state"
      redirect_uri: "http://localhost:{port}/callback"
  → Browser opens Spotify login
  → Spotify redirects to localhost callback
  → tauri-plugin-oauth: onUrl() catches redirect URL
  → Extract code from URL
  → POST to /api/token with code + verifier
  → Receive access_token + refresh_token + expires_in
  → Store all three in taste.db via set_ai_setting
  → Verify Premium: GET /v1/me → check product === 'premium'
  → Update streamingState.spotify: { connected: true, isPremium: true/false }
  → SpotifyPlayer.svelte detects connected=true, loads SDK script
  → SDK fires onSpotifyWebPlaybackSDKReady
  → Player initializes, 'ready' event → store device_id in streamingState
```

**Bundled client ID decision:** The Spotify Client ID is registered once for BlackTape and bundled into the app. Users do not need to create their own Spotify developer app. This removes the biggest UX friction from the existing import flow. The redirect URI `http://localhost:{dynamic_port}/callback` must be registered in the Spotify dashboard with multiple port variations, OR use a wildcard if Spotify allows it (they do allow `http://localhost` as a wildcard redirect for PKCE).

### Artist Page Streaming Resolution Flow

```
User visits /artist/{slug}
  → page load: existing MB API calls (links, releases, bio, relationships)
  → links.spotify = ["https://open.spotify.com/artist/4Z8W..."] (or [])
  → links.soundcloud = ["https://soundcloud.com/artistname"] (or [])
  → links.youtube = ["https://www.youtube.com/@channel"] (or [])
  → links.bandcamp = ["https://artist.bandcamp.com"] (or [])
  → SoundCloud oEmbed fetch (existing, keep): soundcloudOembedHtml in page data
  → Page renders with StreamingPanel showing available service badges

User clicks "Play" (top-priority service, auto-selected based on servicePriorityState.order)
  → resolver.ts: find first service in priority order with an available URL
  → Dispatch to service handler (see Pattern 1 above)
  → Show loading state on StreamingPanel

User clicks different service badge (source switcher)
  → Same resolver dispatch with explicit service override
  → streamingState.activeSource updates
  → Player bar ServiceBadge updates reactively

Spotify playback starts:
  → SDK player ready, device registered
  → PUT /v1/me/player/play → Spotify streams to SDK player
  → SDK's 'player_state_changed' event → update playerState.currentTrack
  → Player bar shows track title + artist (from SDK state)
  → ServiceBadge shows "S" (Spotify)
```

### Player Bar Integration

The existing Player.svelte shows local file playback state. For streaming services:

```
playerState.currentTrack (existing PlayerTrack interface)
  → needs no change for SoundCloud/YouTube/Bandcamp (embed iframes are self-contained)
  → for Spotify SDK: sync SDK player_state_changed to playerState.currentTrack
    (title, artist, album from Spotify SDK state object)

playerState.activeSource (NEW field on playerState)
  → drives ServiceBadge rendering in Player.svelte
  → 'local' | 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | null
```

**Player controls for Spotify:** The existing play/pause/next controls in Player.svelte call `audio.svelte.ts` functions. For Spotify, these need to delegate to the SDK player. Pattern: check `playerState.activeSource` in each control function, conditionally call SDK or audio element.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Spotify OAuth | PKCE via existing tauri-plugin-oauth + @fabianlars/tauri-plugin-oauth | Same pattern as existing import flow — reuse exactly |
| Spotify Web API | Bearer token, fetch from Svelte side | `GET /artists/{id}/top-tracks`, `GET /albums/{id}/tracks` |
| Spotify Web Playback SDK | Script tag loaded at runtime from `sdk.scdn.co` | Premium required. CSP currently null — no blocking. |
| Spotify Connect API | `PUT /me/player/play?device_id={id}` | Requires `user-modify-playback-state` scope. Premium only. |
| SoundCloud oEmbed | Existing `soundcloudOembedUrl()` function, fetched at page load | Already works. Artist profile URL accepted. No changes needed. |
| YouTube embed | `youtubeEmbedUrl()` returns null for channel URLs. Channel URLs → open() | On-demand only. Data API search is v1.7+ feature. |
| YouTube Data API | Optional, on-demand channel→video resolution | 100 units/query. Avoid for v1.6. |
| Bandcamp | External link only. No embed construction. | Requires numeric album ID not available from MusicBrainz URLs. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `spotify-auth.ts` ↔ `taste.db` | `invoke('get_ai_setting')`, `invoke('set_ai_setting')` | No new Rust commands needed |
| `streaming/state.svelte.ts` ↔ `player/state.svelte.ts` | `activeSource` field on playerState | Minimal coupling — only one field added |
| `SpotifyPlayer.svelte` ↔ `streaming/state.svelte.ts` | Writes `deviceId` to streamingState on SDK ready event | One-way: SDK → state |
| `resolver.ts` ↔ `streaming/state.svelte.ts` | Writes `activeSource` after successful resolution | One-way: resolver → state |
| `StreamingPanel.svelte` ↔ `resolver.ts` | Function call on button click | No reactive binding — imperative dispatch |
| `service-priority.svelte.ts` ↔ `taste.db` | `invoke('set_ai_setting', { key: 'service_priority_order' })` | Same pattern as layout template storage |
| `settings/+page.svelte` ↔ `service-priority.svelte.ts` | Imports `servicePriorityState`, calls `saveServicePriority()` | Replace existing platform dropdown |
| Player.svelte ↔ Spotify SDK | On play/pause/next: check `activeSource`, delegate to SDK or audio element | SDK player is module-scoped in `spotify-player.ts` |

---

## Build Order (Recommended)

Dependencies drive the order. Each phase is independently shippable.

**Phase 1: Streaming state module + Settings UI (no actual playback)**
- `src/lib/streaming/state.svelte.ts` — baseline reactive state
- `src/lib/streaming/service-priority.svelte.ts` — load/save ordered list
- `settings/+page.svelte` — drag-to-reorder replacing dropdown
- `ServiceBadge.svelte` — stub, renders service name from `playerState.activeSource`
- Dependency: none (pure new code + UI change)
- Risk: LOW
- Value: Settings UI ready, foundation laid

**Phase 2: Spotify PKCE OAuth + token storage (no playback yet)**
- `src/lib/streaming/spotify-auth.ts` — full PKCE flow, token management
- Settings Spotify card: "Connect Spotify", status display, disconnect
- Token stored to taste.db, `streamingState.spotify.connected` updates
- Premium check via `/v1/me`
- Dependency: `tauri-plugin-oauth` + `tauri-plugin-shell` (both already in Cargo.toml)
- Risk: MEDIUM — OAuth flow is existing pattern but new scopes
- Value: Spotify connection established, users can verify auth works

**Phase 3: Spotify Web Playback SDK + top tracks resolution**
- `src/lib/streaming/spotify-player.ts` — SDK wrapper
- `SpotifyPlayer.svelte` — loads script tag, initializes player
- `src/lib/streaming/resolver.ts` — Spotify path: extract artist ID → top tracks → start playback
- `StreamingPanel.svelte` — available badges, play button, loading state
- `artist/[slug]/+page.svelte` — add StreamingPanel
- `player/state.svelte.ts` — add `activeSource` field
- `Player.svelte` — add ServiceBadge, delegate play/pause/next to SDK when `activeSource === 'spotify'`
- Dependency: Phase 2 complete (need token + deviceId)
- Risk: HIGH — SDK integration in WebView2, Premium required for full test
- Value: Core Spotify playback working

**Phase 4: SoundCloud integration (already mostly working)**
- Confirm existing oEmbed fetch flows correctly through to StreamingPanel
- Wire SoundCloud embed display through `streamingState.activeSource = 'soundcloud'`
- Add SoundCloud to resolver dispatch
- `recordEmbedPlay` hook for SoundCloud plays (already in playback.svelte.ts)
- Dependency: StreamingPanel from Phase 3
- Risk: LOW — existing oEmbed fetch already works
- Value: SoundCloud playable from StreamingPanel

**Phase 5: YouTube embed integration**
- Wire existing `youtubeEmbedUrl()` result through StreamingPanel
- For channel URLs: "Open on YouTube" button using Tauri `open()`
- Update resolver dispatch for YouTube
- Dependency: StreamingPanel from Phase 3
- Risk: LOW — embed path is trivial. Channel→video only opens external.
- Value: YouTube video URLs play in-app, channel URLs open browser

**Phase 6: Release page album playback**
- `artist/[slug]/release/[mbid]/+page.svelte` — "Play Album" button
- Parse Spotify album ID from release link if present
- `GET /v1/albums/{albumId}/tracks` → get URIs
- `PUT /v1/me/player/play` with `context_uri: "spotify:album:{id}"` OR uri list
- Populate queue with album tracks (title, artist from Spotify API response)
- Dependency: Phase 3 complete (Spotify player + token)
- Risk: MEDIUM — needs album tracklist integration with existing queue system
- Value: "Play Album" feature complete

**Rationale for this order:**
- State module first so all subsequent phases have a consistent integration target
- OAuth before SDK — can't test SDK without a valid token
- SDK before SoundCloud/YouTube — StreamingPanel is the shared UI component; build it once
- SoundCloud before YouTube — SoundCloud embed is already 90% working; quick win
- Release page album playback last — depends on Spotify working AND queue integration

---

## Anti-Patterns

### Anti-Pattern 1: Calling Spotify API from Rust Tauri Commands

**What people do:** Create a Rust Tauri command `get_top_tracks(artist_id, token)` that calls the Spotify API server-side.

**Why it's wrong:** There is no server-side in this app — "Rust Tauri command" IS the desktop app process. The token is already on the Svelte side (loaded from taste.db). Making it cross the JS-Rust boundary twice for a simple HTTPS call adds latency and complexity with no benefit. The SvelteKit frontend can call Spotify's API directly using `fetch()`.

**Do this instead:** Call Spotify API directly from TypeScript modules using `fetch()`. The Tauri WebView2 context supports standard fetch. Token never needs to cross to Rust.

### Anti-Pattern 2: Eager SDK Loading for All Users

**What people do:** Unconditionally load `<script src="https://sdk.scdn.co/spotify-player.js">` in the root layout for all users.

**Why it's wrong:** The SDK script is loaded from Spotify's CDN, adding latency and a third-party network request for every user, including those who will never connect Spotify. It also initializes a Spotify Connect device registration even for disconnected users.

**Do this instead:** Load the SDK script dynamically in `SpotifyPlayer.svelte` only when `streamingState.spotify.connected === true`. This component is mounted conditionally in the root layout.

### Anti-Pattern 3: Storing the Token in Svelte $state

**What people do:** `export const spotifyToken = $state('')` to make the token reactive and available everywhere.

**Why it's wrong:** Svelte 5 $state is DevTools-inspectable. Tokens in reactive state show up in component trees. The token changes infrequently (hourly refresh) — it does not need to be reactive. What components need is `connected: boolean` and `isPremium: boolean`, not the token string.

**Do this instead:** Keep the token in a module-scoped variable in `spotify-auth.ts`. Export only status booleans to `streamingState`. Any code that needs the token calls `getSpotifyToken()` which handles the module-scoped cache + refresh.

### Anti-Pattern 4: Constructing Bandcamp Embed URLs from Artist Page URLs

**What people do:** Try to scrape artist.bandcamp.com pages at page load to extract numeric album IDs for embed construction.

**Why it's wrong:** Bandcamp actively blocks automated scraping. The artist page HTML structure is not stable. This would add a fragile web-scraping dependency to the page load path and frequently break. The resulting embed covers only one album (whichever happens to be featured), not the artist's catalog.

**Do this instead:** Bandcamp stays as external-link-only. Show a "Listen on Bandcamp" button that opens the artist's Bandcamp page in the system browser via Tauri `open()`. Users who want Bandcamp follow the link to their site.

### Anti-Pattern 5: Calling YouTube Data API at Page Load

**What people do:** At artist page load, call the YouTube Data API `search.list` to find a video by artist name, and pre-resolve the embed URL.

**Why it's wrong:** Each `search.list` call costs 100 quota units. The default daily quota is 10,000 units. At 100 artists viewed per day, quota is exhausted. Most artists in the BlackTape database (2.8M artists) have YouTube channel URLs from MusicBrainz — search would fire for all of them. YouTube would also throttle or suspend the API key.

**Do this instead:** For artists whose MusicBrainz YouTube URL is a video URL (`youtubeEmbedUrl()` returns non-null), embed directly. For channel URLs, show "Search on YouTube" which opens `youtube.com/results?search_query=...` in the browser — no API call, no quota.

### Anti-Pattern 6: Single Spotify Device for Multiple Artist Pages

**What people do:** Keep the same Spotify SDK player device connected for the lifetime of the app session without handling state between page navigations.

**Why it's wrong:** When navigating from artist A to artist B and clicking play, the new top tracks must replace the queue. If the SDK player is in an unknown state from the previous artist (mid-track, paused, etc.), `PUT /v1/me/player/play` with new URIs may fail or be ignored.

**Do this instead:** Before each play call, verify the device is still registered (listen for `ready` event, handle `not_ready`). When switching artists, explicitly stop current playback before queuing new tracks. The `clearQueue()` → `setQueue()` pattern from the local player should apply to the streaming resolver too.

---

## Scaling Considerations

This is a desktop app. "Scaling" means "as user sessions get longer and artist browsing increases."

| Concern | Current scale | At heavy use (100+ artist visits/session) |
|---------|--------------|------------------------------------------|
| Spotify token refresh | Hourly, on first API call after expiry | Transparent to user — module-scoped refresh |
| YouTube quota | 0 used (no Data API calls in v1.6) | 0 used — stays external links |
| SoundCloud oEmbed requests | 1 per artist page load (existing) | Unchanged — artist page fetches only |
| taste.db ai_settings rows | 4 new rows (tokens + expiry) | Constant — keys are updated, not appended |
| SDK device registration | Once per app session | SDK auto-reconnects on disconnect events |

**Key bottleneck: Spotify API rate limits.** Spotify's Web API has undocumented per-second rate limits (roughly 30 req/sec for most endpoints). Fetching top tracks per artist visit is fine for normal use. If a user rapidly clicks through many artists, consider a 500ms debounce before firing `get-top-tracks`.

---

## Sources

- Spotify Web Playback SDK docs: [developer.spotify.com/documentation/web-playback-sdk](https://developer.spotify.com/documentation/web-playback-sdk)
- Spotify Web Playback SDK Getting Started: [developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)
- Spotify Start Playback endpoint: [developer.spotify.com/documentation/web-api/reference/start-a-users-playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- Spotify Get Artist Top Tracks: [developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks](https://developer.spotify.com/documentation/web-api/reference/get-an-artists-top-tracks)
- Spotify Embeds (artist pages supported): [developer.spotify.com/documentation/embeds/tutorials/creating-an-embed](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed)
- Spotify PKCE OAuth flow: [developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- Spotify OAuth migration (PKCE required after Nov 2025): [developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025](https://developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025)
- SoundCloud oEmbed API: [developers.soundcloud.com/docs/oembed](https://developers.soundcloud.com/docs/oembed)
- YouTube Data API search.list (channelId + type=video, 100 units/call): [developers.google.com/youtube/v3/docs/search/list](https://developers.google.com/youtube/v3/docs/search/list)
- YouTube channels.list forHandle parameter (Jan 2024): [developers.google.com/youtube/v3/guides/working_with_channel_ids](https://developers.google.com/youtube/v3/guides/working_with_channel_ids)
- Tauri CSP documentation: [v2.tauri.app/security/csp](https://v2.tauri.app/security/csp/) — current config has `"csp": null` (disabled), confirmed in tauri.conf.json
- Existing codebase: `src/lib/taste/import/spotify.ts` (PKCE + tauri-plugin-oauth pattern), `src/lib/embeds/spotify.ts` (artist ID extraction), `src/lib/embeds/soundcloud.ts` (oEmbed URL construction), `src/lib/embeds/youtube.ts` (video vs channel detection), `src/lib/embeds/bandcamp.ts` (external-link-only, confirmed rationale), `src/lib/player/queue.svelte.ts` (queue management), `src/lib/player/audio.svelte.ts` (playback engine), `src/lib/theme/preferences.svelte.ts` (ai_settings storage pattern), `src-tauri/Cargo.toml` (tauri-plugin-oauth already present), `src-tauri/tauri.conf.json` (CSP null, asset protocol enabled)

---

*Architecture research for: BlackTape v1.6 — The Playback Milestone*
*Researched: 2026-02-26*
