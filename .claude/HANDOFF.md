# Work Handoff - 2026-02-28

## What Was Just Shipped (this session)

Full Spotify Connect flow fixed across 4 commits:

1. **Release pages** — `extractSpotifyAlbumId()` + `playAlbumOnSpotify()`. Album URLs now work.
2. **Idle Spotify Desktop** — `getFirstAvailableDeviceId()` passes `?device_id=` so open-but-idle Spotify activates.
3. **Player bar feedback** — streaming bar + `▶ Playing` pill state when Spotify Connect is active.
4. **Pause local audio** — `pause()` called on successful Spotify Connect start so local track stops.

## Current State

App is running and reloaded. Test with Spotify Desktop open:
- Go to any artist with Spotify links (e.g. Radiohead)
- Click `▶ Spotify` pill
- Local audio should pause, Radiohead plays in Spotify Desktop
- Pill shows `▶ Playing` (active/green)
- Player bar shows "Radiohead — Top Tracks via Spotify"

## What's Still Rough

- Streaming bar (pulsing dot) only shows when NO local track is loaded — currently hidden behind the local player bar if a track was queued. The `via Spotify` badge in the track-meta is the only indicator when a local track exists.
- Dismissing the streaming bar (`✕`) only clears local state — doesn't actually send pause to Spotify Desktop
- No polling of Spotify's current playback state — player bar shows the artist/label from when play was triggered, not live track info

## Key Files

- `src/lib/spotify/api.ts` — all Spotify API functions incl. device detection
- `src/lib/player/streaming.svelte.ts` — streaming state + label
- `src/lib/components/Player.svelte` — streaming bar + via-badge
- `src/lib/components/EmbedPlayer.svelte` — release page Connect button
- `src/routes/artist/[slug]/+page.svelte` — artist page Connect button + pause() call

## Resume Command
Run `/resume` after `/clear`
