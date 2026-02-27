# Phase 29: Streaming Foundation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can set streaming service priority once (Settings → Streaming tab, drag-to-reorder). Artist pages show which services have content for that artist via badge pills derived from existing MusicBrainz link data — no new API calls. When a streaming embed becomes active, any local audio playback pauses; only one audio source plays at a time. Player bar shows a small "via [Service]" label while an embed is active, shows nothing otherwise.

</domain>

<decisions>
## Implementation Decisions

### Settings priority UI
- Service name text only — no logos or icons
- Grip icon on the left edge of each row as the drag affordance
- Order is saved and persists across restarts, but has no active effect in this phase — reserved for future auto-resolution
- Lives in a new "Streaming" tab inside the existing Settings page

### Artist page badges
- Small text pill style (e.g., "Spotify", "Bandcamp") — no icons
- Non-clickable, informational only — not shortcuts to the embed section
- Positioned below the artist name in the header area, visible without scrolling
- If an artist has no streaming links in MusicBrainz: hide the badge row entirely (no empty state message)

### Audio coordination
- When a streaming embed activates: pause local audio (not stop — position is preserved)
- Coordination trigger: postMessage event from the embed iframe signals play activity; the app listens and pauses local audio in response
- When the embed closes or stops: local audio stays paused; user must manually press play to resume
- No toast or notification — the player bar's paused state makes the interruption visible without extra UI

### Player bar badge
- Format: small text-only label — "via Spotify", "via SoundCloud", etc.
- Position: near the track info area (left/center of player bar), alongside track name/artist metadata
- Clears when the embed iframe is closed or destroyed (not on pause/stop)
- Only appears during streaming embed activity — shows nothing during local audio playback

### Claude's Discretion
- How "via X" label is styled (color, size, font-weight) relative to existing player bar text
- How drag-and-drop reorder is implemented (library choice or native HTML5 drag)
- Exact postMessage event schema / what signals count as "embed is active"
- Where in the Svelte store the active streaming source state lives

</decisions>

<specifics>
## Specific Ideas

- The text-only aesthetic is consistent across all three surfaces (Settings list, artist badges, player bar) — no logos anywhere in this phase
- Pausing (not stopping) local audio is intentional — preserves position so the user can pick back up after the embed

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-streaming-foundation*
*Context gathered: 2026-02-27*
