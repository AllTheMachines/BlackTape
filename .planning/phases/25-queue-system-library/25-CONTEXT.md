# Phase 25: Queue System + Library - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build and manage a playback queue from any track surface in the app, and the library uses a clear two-pane layout. This phase adds Play/Queue actions to track rows across all existing surfaces, adds a queue panel to the player bar, adds album/artist-level play actions, and reworks the library page to a two-pane layout.

</domain>

<decisions>
## Implementation Decisions

### Track row interactions
- Track number column swaps to ▶ on hover (Spotify-style); "+ Queue" button appears at the trailing edge of the row
- Hover behavior is identical across all surfaces: search results, artist top tracks, release tracklist, library tracklist
- Play when nothing is playing: starts the clicked track and auto-queues the remaining tracks in the current context list below it
- Play mid-queue: inserts the clicked track as the next track (after current), queue resumes — does NOT interrupt or replace

### Queue panel
- Opens by sliding up from the player bar (attached, full-width feel)
- Fixed height showing ~8-10 tracks; scrollable if queue is longer
- Queue persists between app sessions (saved to local storage, restored on relaunch)
- Empty state: simple text — "Queue is empty. Hit + Queue on any track." — no suggestions, no auto-close

### Library two-pane layout
- Left pane (album list): sorted by recently added, newest at top
- Album list items: album title + artist name only — no thumbnail
- Right pane auto-selects the first album on load (no empty state; tracklist always visible)
- Selected album in left pane: amber left-border only — no background tint, no bold text

### Album/artist-level actions
- Release page: "Play Album" (solid amber) + "+ Queue Album" (ghost/outline) placed below the album header block (cover, title, meta), above the tracklist
- Artist page: "Play All" + "+ Queue All" in the "Top Tracks" section header, right-aligned
- "Play Album" behavior mid-queue: same as track-level Play — inserts the album's tracks after the current track; does not replace the queue
- Button hierarchy: Play Album = filled primary (amber), + Queue Album = ghost — same pattern on both release and artist pages

### Claude's Discretion
- Drag-reorder implementation details for queue tracks
- Exact transition animation timing for queue panel slide-up
- Queue icon design in player bar
- Track number / ▶ swap animation details
- Keyboard shortcut handling for queue actions (if any)

</decisions>

<specifics>
## Specific Ideas

- The Spotify pattern is the explicit reference for track row hover: number → ▶ icon swap. That's the mental model.
- "Play Album" = filled amber button (primary), "+ Queue Album" = outlined. Clear visual hierarchy — not equal weight buttons.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-queue-system-library*
*Context gathered: 2026-02-25*
