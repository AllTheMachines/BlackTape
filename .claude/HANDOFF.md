# Work Handoff - 2026-02-28

## Current Task
Spotify Connect "Play in Spotify Desktop" button does nothing on the artist page.

## Completed This Session
- Spotify OAuth fixed: fixed port 7743, correct redirect URI in dashboard
- SpotifySettings UI improved: bigger font, correct instructions, dev mode note
- Streaming settings: removed dead dropdown, replaced broken HTML5 drag with ↑↓ buttons
- Release page: now fetches Spotify/SoundCloud/YouTube/Bandcamp from MB url-rels, shows EmbedPlayer
- EmbedPlayer: when Spotify connected, shows Connect API button instead of broken iframe
- All 191 tests passing, committed

## The Unresolved Bug
"▶ Play in Spotify Desktop" button on artist page does nothing when clicked.

### Debug findings so far
- CDP check found `document.querySelector('.embed-player')` returns null on the artist page
- This means EmbedPlayer isn't rendering on the Radiohead artist page at all, OR it's inside a tab that isn't active
- The only Spotify-related button found was "▶ Spotify" — which is likely a tab button, not the play button

### Likely causes to investigate
1. The artist page renders EmbedPlayer inside a tab (e.g. "Overview" tab) — need to check if the tab is active
2. `spotifyState.connected` may be false in EmbedPlayer context (state not loaded yet)
3. The Spotify Connect flow itself may be failing silently — the `@const cstate` in the template is NOT reactive in Svelte 5 (it's a snapshot, not a binding) — this means button state never updates visually

### Fix needed
- In EmbedPlayer.svelte, replace `{@const cstate = spotifyConnectState[key] ?? 'idle'}` with inline reads
- Add console.log or CDP debug to verify `spotifyState.connected` is true when EmbedPlayer renders
- Check why `.embed-player` div isn't found by CDP on the artist page

## Key Files
- `src/lib/components/EmbedPlayer.svelte` — Spotify Connect button + `playOnSpotifyDesktop()`
- `src/lib/spotify/api.ts` — `getArtistTopTracks()` + `playTracksOnSpotify()` (already complete)
- `src/lib/spotify/auth.ts` — `getValidAccessToken()` (already complete)
- `src/lib/spotify/state.svelte.ts` — `spotifyState.connected` reactive state

## Resume Command
Run `/resume` after `/clear`
