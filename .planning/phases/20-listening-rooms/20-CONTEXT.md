# Phase 20: Listening Rooms - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can host or join a synchronized listening room tied to a Nostr scene channel. The host controls which YouTube video plays for all participants. Guests can suggest videos via a jukebox queue; the host approves suggestions. A participant list shows who is in the room. No chat, no non-YouTube media — purely: video sync + queue + presence.

</domain>

<decisions>
## Implementation Decisions

### Room creation & joining
- One active room per channel at a time — if a room is already open, a user joins it; they cannot start a second one
- Any user can start a room for a channel (first to start is the host)
- Discovery entry point: the scene/channel page shows a "Room active — join" indicator when a room is live
- Room lifecycle: room closes when the host disconnects — all guests are removed. No host transfer, no room persistence without a host

### Sync model
- URL sync only — when host sets a video, all participants receive the YouTube URL and load it from the beginning. No attempt to sync playback position
- Late joiners get the current active video URL and load it from the start
- Host sets a video by pasting a YouTube URL into a text input field — direct control, bypasses the queue
- When the host sets a new video, all guests immediately load it (no confirmation step, no opt-out)
- Guests have full local player control (pause, seek) — local changes don't affect other participants

### Jukebox queue design
- Queue is ordered chronologically (FIFO — first submitted, first in queue)
- Each guest can have at most one pending suggestion in the queue at a time; must wait for it to be approved/retracted before adding another
- Guests can retract their own pending suggestions
- After the host approves a suggestion (sets it as the active video), the suggestion is removed from the queue
- Host can also reject/dismiss suggestions from the queue

### Participant list & presence
- Participant list shows Nostr display name + avatar for each person in the room
- Presence tracked via Nostr ephemeral events — clients broadcast a periodic heartbeat; presence naturally expires if a client disconnects without sending a leave event
- No room size cap — open to all while the room is active
- No text chat or reactions in Phase 20 — room UI is: video player + queue + participant list only

### Claude's Discretion
- Specific Nostr event kinds/formats for room state, video sync, suggestions, presence heartbeats
- Room UI layout (video player placement, queue position, participant list placement)
- Error handling for invalid or non-YouTube URLs submitted by guests or the host
- Exact heartbeat interval for presence
- Loading and transition states (e.g., buffering indicator when video changes)

</decisions>

<specifics>
## Specific Ideas

- No specific UI references — open to standard approaches that fit Mercury's existing aesthetic
- The "Room active" indicator on the scene page should be discoverable but not intrusive

</specifics>

<deferred>
## Deferred Ideas

- Text chat inside listening rooms — future phase
- Room size cap / host-configurable participant limit — not needed for Phase 20
- Upvote/downvote voting on queue suggestions — chronological queue is sufficient for now
- Playback position sync (true synchronized scrubbing) — deferred; URL-only sync ships first
- Host transfer when host disconnects — room simply closes for now

</deferred>

---

*Phase: 20-listening-rooms*
*Context gathered: 2026-02-24*
