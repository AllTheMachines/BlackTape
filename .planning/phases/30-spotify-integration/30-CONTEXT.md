# Phase 30: Spotify Integration - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users connect their own Spotify account via PKCE OAuth (entering their own Client ID from the Spotify Developer Dashboard) and play artist top tracks in their running Spotify Desktop app from within BlackTape — using the Spotify Connect API to trigger playback on an already-running client. Scope is artist-level playback only. Release/track-level playback and multi-service switching are separate phases.

</domain>

<decisions>
## Implementation Decisions

### OAuth Setup Flow
- Step-by-step wizard with 3 explicit steps, not a single form
- **Step 1:** Inline guide with screenshot showing exactly where to find Client ID on developer.spotify.com. Numbered steps, clickable link to dashboard.
- **Step 2:** Client ID input field + Authorize button. When clicked, system browser opens. Wizard shows waiting state with spinner: "Waiting for Spotify authorization..." and a cancel option.
- **Step 3 (success):** "✓ Connected to Spotify" with the user's Spotify display name/username + Done button. No auto-close — user sees and confirms success explicitly.
- Redirect URI must use `http://127.0.0.1` (never `localhost`)

### Connection Status
- Status shown in **Settings only** — no persistent badge in player bar or global UI
- Connected state in Settings: "✓ Connected as [Spotify username]" + Disconnect button
- Disconnect: immediate, no confirmation dialog — settings section reverts to wizard inline. No app restart needed.
- Token expiry/revocation: detected on next play attempt only (no background polling). Show inline error: "Spotify session expired — reconnect in Settings."

### Playback Trigger Surface
- **Artist page only** for this phase
- Play button: Spotify-green, labeled "▶ Play on Spotify", placed near the artist header
- Plays artist's Spotify top tracks via Get Artist Top Tracks endpoint (market-aware, up to 10 tracks)
- Button is **hidden** when Spotify is not connected — no grayed-out or disabled state

### Error & Degraded States
- **No active Spotify device:** Inline message below the play button — "Open Spotify Desktop and start playing anything, then try again." Persists until user navigates away or clicks Play again. No auto-dismiss. No automatic fallback to embeds.
- **API failure / artist not on Spotify:** Inline message below play button — "Couldn't load tracks for this artist on Spotify." No retry button (not appropriate for artist-not-found cases).
- **Expired token (detected on play):** Inline — "Spotify session expired — reconnect in Settings."
- No silent failures. Every failure state has a visible, plain-language message.

### Claude's Discretion
- Exact wizard layout and component structure
- How the 127.0.0.1 redirect URI callback is handled in Tauri (local HTTP server or deep link)
- Token storage mechanism (secure store vs settings file)
- How to distinguish "no device" vs "API error" from the Connect API response

</decisions>

<specifics>
## Specific Ideas

- The wizard should feel like connecting a service in a well-designed settings page (e.g. VS Code extensions auth, not a developer portal)
- Screenshot in step 1 should show the Spotify dashboard with Client ID field highlighted — the exact thing the user needs to copy

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-spotify-integration*
*Context gathered: 2026-02-27*
