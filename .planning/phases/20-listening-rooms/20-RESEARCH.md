# Phase 20: Listening Rooms - Research

**Researched:** 2026-02-24
**Domain:** Nostr ephemeral events, YouTube embed, real-time pub/sub presence, SvelteKit UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Room creation & joining**
- One active room per channel at a time — if a room is already open, a user joins it; they cannot start a second one
- Any user can start a room for a channel (first to start is the host)
- Discovery entry point: the scene/channel page shows a "Room active — join" indicator when a room is live
- Room lifecycle: room closes when the host disconnects — all guests are removed. No host transfer, no room persistence without a host

**Sync model**
- URL sync only — when host sets a video, all participants receive the YouTube URL and load it from the beginning. No attempt to sync playback position
- Late joiners get the current active video URL and load it from the start
- Host sets a video by pasting a YouTube URL into a text input field — direct control, bypasses the queue
- When the host sets a new video, all guests immediately load it (no confirmation step, no opt-out)
- Guests have full local player control (pause, seek) — local changes don't affect other participants

**Jukebox queue design**
- Queue is ordered chronologically (FIFO — first submitted, first in queue)
- Each guest can have at most one pending suggestion in the queue at a time; must wait for it to be approved/retracted before adding another
- Guests can retract their own pending suggestions
- After the host approves a suggestion (sets it as the active video), the suggestion is removed from the queue
- Host can also reject/dismiss suggestions from the queue

**Participant list & presence**
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

### Deferred Ideas (OUT OF SCOPE)
- Text chat inside listening rooms — future phase
- Room size cap / host-configurable participant limit — not needed for Phase 20
- Upvote/downvote voting on queue suggestions — chronological queue is sufficient for now
- Playback position sync (true synchronized scrubbing) — deferred; URL-only sync ships first
- Host transfer when host disconnects — room simply closes for now
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROOM-01 | User can create a listening room associated with a Nostr scene channel | kind:10311 replaceable event scoped to channel (scene slug); first publisher becomes host; scene page polls for active room |
| ROOM-02 | Host can set the active YouTube video that all room participants see loaded in their player | Host publishes kind:20010 ephemeral event with YouTube URL → all subscribers load `youtubeEmbedUrl()` result into an `<iframe>`; late joiners get current URL from room state |
| ROOM-03 | Guests can suggest YouTube videos to the room's jukebox queue | Guest publishes kind:20011 ephemeral suggestion event with URL + their pubkey; subscribers add to local queue state in FIFO order |
| ROOM-04 | Host can approve a suggestion from the queue, making it the active video for all participants | Host approves by publishing kind:20010 video-set event (same as ROOM-02) with the suggestion's URL; suggestion removed from queue locally |
| ROOM-05 | User can see the list of current participants in a room | kind:20012 ephemeral heartbeat published on join + every 30s; subscriber maintains participant Map with TTL expiry; Nostr display name + DiceBear avatar shown per participant |
</phase_requirements>

---

## Summary

Phase 20 builds on top of the existing Nostr infrastructure (NDK singleton, ephemeral event patterns) already established in `sessions.svelte.ts`. The listening room system requires three new ephemeral event kinds (video-set, suggestion, heartbeat) and one replaceable event kind for room-open/close lifecycle. All patterns — NDK subscribe with `closeOnEose: false`, ephemeral kind double-cast `as unknown as NDKKind[]`, optimistic local state updates — are already proven in the codebase and can be copied directly.

The YouTube embed side is trivial: `youtubeEmbedUrl()` already exists in `src/lib/embeds/youtube.ts` and converts any YouTube URL to a `youtube-nocookie.com/embed/VIDEO_ID` URL. The host's URL input is validated with the same regex VIDEO_PATTERNS. When the host sets a video, all subscribers update their local `activeVideoUrl` state and a keyed `{#key activeVideoUrl}<iframe...>{/key}` Svelte block forces a fresh iframe load. Autoplay works in Tauri's WebView2 without the muted requirement that browser Chrome enforces.

The participant list uses ephemeral heartbeat events. Each client broadcasts a heartbeat on join and every 30 seconds. Other participants track a Map of `pubkey → lastSeen timestamp`. A reactive cleanup timer checks the Map every 10 seconds and drops entries older than 75 seconds (2.5x the 30s interval, tolerates one missed heartbeat). Participant display names and avatars come from Nostr kind:0 profile events fetched via NDK — the same `NDKUser` pattern used in `dms.svelte.ts`. The presence system is entirely in-memory with no taste.db involvement.

**Primary recommendation:** Build a new `src/lib/comms/listening-room.svelte.ts` module mirroring the `sessions.svelte.ts` pattern. Create a new route at `src/routes/room/[channelId]/+page.svelte` for the room UI. Add a "Room active" indicator + "Start room" button to the scene page.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nostr-dev-kit/ndk` | ^3.0.0 (in deps) | Publish/subscribe Nostr events for room state, sync, presence | Already used throughout Mercury; NDK singleton in `nostr.svelte.ts` |
| Svelte 5 `$state` | project version | Reactive room state (active video, queue, participants) | Project-wide state pattern |
| `youtubeEmbedUrl()` | in-project | Convert YouTube URLs to nocookie embed URLs | Already exists in `src/lib/embeds/youtube.ts` |
| SvelteKit routing | project version | New `/room/[channelId]` page route | Project framework |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nostr-tools` | ^2.23.1 (in deps) | `npubEncode()` for display — never for key generation | Only if converting pubkeys to npub for display |
| `@dicebear/core` + `@dicebear/pixel-art` | ^9.3.2 (in deps) | Participant avatar generation from pubkey seed | Participant list avatars — same pattern as `avatar.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom ephemeral event kinds (20010-20012) | NIP-53 kind:30311 Live Activities | NIP-53 is designed for audio/video streaming, not YouTube URL sync; kind:10311 for room state is already decided in STATE.md |
| NDK subscribe | Raw WebSocket | NDK handles relay pool, reconnect, deduplication — never roll custom WebSocket |
| Periodic setInterval heartbeat | NDK ping/pong | No native Nostr heartbeat NIP; setInterval with cleanup on component destroy is the correct approach |

**Installation:** No new packages required. STATE.md confirms: "Zero new npm packages needed for v1.3." All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/comms/
│   └── listening-room.svelte.ts   # New: room state machine, all Nostr I/O
├── routes/
│   ├── room/[channelId]/
│   │   └── +page.svelte           # New: full room UI (player + queue + participants)
│   └── scenes/[slug]/
│       └── +page.svelte           # Modified: add "Room active" indicator + start/join button
```

### Event Kind Design (Claude's Discretion — Recommend)

The STATE.md locked `kind:10311` for Mercury's listening room. Based on NIP-01 kind range semantics:

| Kind | Type | Purpose | Why |
|------|------|---------|-----|
| `10311` | Replaceable (10000-19999) | Room state — open/closed, host pubkey, channel slug | Replaceable = only latest event kept; querying `{kinds:[10311], '#t':['mercury',channelSlug]}` always returns current state |
| `20010` | Ephemeral (20000-29999) | Video sync — host sets active YouTube URL | Not stored; real-time delivery only; late joiners get current URL from room state embedded in kind:10311 |
| `20011` | Ephemeral | Jukebox suggestion — guest submits YouTube URL | Not stored; real-time only; queue rebuilt from live subscription |
| `20012` | Ephemeral | Presence heartbeat — periodic ping to signal "still here" | Not stored; expiry-based presence tracking |

**Room open/close lifecycle via kind:10311:**
- Host opens room: publishes `kind:10311` with `status: "open"`, `host: pubkey`, `channelSlug`, `activeVideoUrl: ""`
- Host closes (disconnects): publishes `kind:10311` with `status: "closed"` (or rely on client-side disconnect detection)
- Scene page polls: `ndk.fetchEvent({kinds:[10311], '#t':['mercury', sceneSlug], authors: [...]})` — since it's replaceable, always gets latest
- Problem: **relays won't return kind:10311 events unless we know the author's pubkey in advance** — see Pitfall 3 for solution

### Pattern 1: New Module — `listening-room.svelte.ts`

**What:** Mirrors `sessions.svelte.ts` exactly. Module-level `$state` for room state. Functions for open/join/leave/setVideo/suggest/approve/reject.

```typescript
// src/lib/comms/listening-room.svelte.ts

import type { NDKKind } from '@nostr-dev-kit/ndk';
import { ndkState } from './nostr.svelte.js';

// Ephemeral kind double-cast — NDKKind enum doesn't include 20000+ range
// Pattern from sessions.svelte.ts line 203
const ROOM_KINDS = [20010, 20011, 20012] as unknown as NDKKind[];

export interface RoomParticipant {
  pubkey: string;
  displayName: string;   // from Nostr kind:0 profile, or truncated pubkey fallback
  avatarSeed: string;    // pubkey used as DiceBear seed
  lastSeen: number;      // unix timestamp of last heartbeat
}

export interface QueueItem {
  id: string;           // suggestion event ID
  senderPubkey: string;
  youtubeUrl: string;
  submittedAt: number;
}

export const roomState = $state({
  isInRoom: false,
  isHost: false,
  channelSlug: null as string | null,
  hostPubkey: null as string | null,
  activeVideoUrl: null as string | null,   // null = no video set yet
  queue: [] as QueueItem[],
  participants: new Map<string, RoomParticipant>(),
  myPendingSuggestionId: null as string | null,  // tracks guest's one-pending-suggestion limit
});
```

### Pattern 2: Video Sync — Host Sets Video

**What:** Host publishes ephemeral kind:20010 event; all subscribers receive it and update `activeVideoUrl`.

```typescript
// Source: adapted from sessions.svelte.ts sendPartyMessage() pattern
export async function setActiveVideo(youtubeUrl: string, channelSlug: string): Promise<void> {
  const { ndk } = ndkState;
  if (!ndk || !roomState.isHost) return;

  // Validate before publishing — use existing youtubeEmbedUrl()
  const { youtubeEmbedUrl } = await import('$lib/embeds/youtube.js');
  const embedUrl = youtubeEmbedUrl(youtubeUrl);
  if (!embedUrl) throw new Error('Not a valid YouTube video URL');

  const { NDKEvent } = await import('@nostr-dev-kit/ndk');
  const event = new NDKEvent(ndk);
  event.kind = 20010 as unknown as NDKKind;
  event.content = JSON.stringify({ youtubeUrl, embedUrl });
  event.tags = [
    ['t', 'mercury'],
    ['t', channelSlug],
    ['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
  ];
  await event.publish();

  // Optimistic local update
  roomState.activeVideoUrl = embedUrl;
}
```

**In the room UI — force iframe reload when URL changes:**
```svelte
<!-- {#key} forces Svelte to destroy and recreate the iframe on URL change -->
<!-- Source: Svelte 5 keyed block pattern -->
{#if roomState.activeVideoUrl}
  {#key roomState.activeVideoUrl}
    <iframe
      src="{roomState.activeVideoUrl}?autoplay=1"
      title="Room video"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen
    ></iframe>
  {/key}
{:else}
  <div class="no-video">Waiting for host to set a video...</div>
{/if}
```

**Note on autoplay in Tauri:** Tauri's WebView2 does NOT enforce Chrome's muted-autoplay restriction by default. `autoplay=1` without `mute=1` works in WebView2. Verify this assumption if behavior differs — fallback is to add `&mute=1` to the embed URL.

### Pattern 3: Presence Heartbeat

**What:** Each client sends kind:20012 on join and every 30 seconds via `setInterval`. Other clients maintain a Map of `pubkey → lastSeen`. A cleanup interval checks every 10 seconds and drops entries > 75 seconds old.

```typescript
// Heartbeat publish (Claude's discretion: 30s interval)
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(channelSlug: string): void {
  sendHeartbeat(channelSlug); // immediate on join
  heartbeatTimer = setInterval(() => sendHeartbeat(channelSlug), 30_000);
}

async function sendHeartbeat(channelSlug: string): Promise<void> {
  const { ndk } = ndkState;
  if (!ndk) return;
  const { NDKEvent } = await import('@nostr-dev-kit/ndk');
  const event = new NDKEvent(ndk);
  event.kind = 20012 as unknown as NDKKind;
  event.content = '';
  event.tags = [
    ['t', 'mercury'],
    ['t', channelSlug],
    ['expiration', String(Math.floor(Date.now() / 1000) + 90)] // 90s TTL = 3x heartbeat
  ];
  await event.publish();
}

// Cleanup stale participants (run every 10s)
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startPresenceCleanup(): void {
  cleanupTimer = setInterval(() => {
    const cutoff = Math.floor(Date.now() / 1000) - 75; // 2.5x heartbeat interval
    for (const [pubkey, p] of roomState.participants) {
      if (p.lastSeen < cutoff) roomState.participants.delete(pubkey);
    }
  }, 10_000);
}
```

### Pattern 4: Room Discovery on Scene Page

**Problem:** kind:10311 is replaceable — relay query requires knowing the author pubkey. We don't know who opened the room ahead of time.

**Solution (recommended):** Use a short-lived NDK subscription (`closeOnEose: true`) filtered by tags only:
```typescript
// Scene page: check if a room is active for this scene
const events = await ndk.fetchEvents({
  kinds: [10311] as unknown as NDKKind[],
  '#t': ['mercury', sceneSlug],
  since: Math.floor(Date.now() / 1000) - 3600  // only recent (1hr window)
});
// Find events where content.status === 'open', pick most recent
```

**Concern:** Not all relays support arbitrary tag filters on replaceable events. Using `'#t'` filter on kind:10311 MAY work on most Mercury relays but is not guaranteed. Empirical validation needed (STATE.md Blocker). Fallback: tag kind:10311 with `d` tag making it addressable (kind:30311 range) — but that changes the kind. Simplest fallback: encode channel slug in a known `d` tag and use kind:30311 (addressable, always supports `#d` filter).

**Alternative: Use kind:30311 instead of kind:10311 for room state:**
- kind:30311 is in the addressable range (30000-39999)
- Supports `#d` tag filtering (guaranteed by spec)
- Query: `{kinds:[30311], '#d':['mercury-room-'+sceneSlug]}`
- This is cleaner and more relay-compatible

STATE.md says `kind:10311` was chosen — the planner should pick between 10311 (replaceable, may have tag filter issues) and 30311 (addressable, more reliable). Research recommends 30311 if tag filtering on 10311 proves unreliable.

### Pattern 5: Jukebox Queue

**What:** Guests publish kind:20011 ephemeral suggestion events. The room subscription picks them up and adds to `roomState.queue` in arrival order. One-pending-suggestion limit enforced locally by checking `roomState.myPendingSuggestionId !== null`.

```typescript
export async function submitSuggestion(youtubeUrl: string, channelSlug: string): Promise<void> {
  if (!roomState.isInRoom || roomState.isHost) return;
  if (roomState.myPendingSuggestionId) throw new Error('You already have a pending suggestion');

  const { youtubeEmbedUrl } = await import('$lib/embeds/youtube.js');
  if (!youtubeEmbedUrl(youtubeUrl)) throw new Error('Not a valid YouTube video URL');

  const { ndk } = ndkState;
  if (!ndk) return;
  const { NDKEvent } = await import('@nostr-dev-kit/ndk');
  const event = new NDKEvent(ndk);
  event.kind = 20011 as unknown as NDKKind;
  event.content = JSON.stringify({ youtubeUrl, action: 'suggest' });
  event.tags = [['t', 'mercury'], ['t', channelSlug], expirationTag()];
  await event.publish();

  // Track pending suggestion ID (set optimistically, cleared when approved/retracted)
  roomState.myPendingSuggestionId = event.id ?? `local-${Date.now()}`;
}
```

**Queue retraction:** Guest publishes another kind:20011 with `action: 'retract'` and references the original event ID. Subscribers remove that item from the queue.

**Host approve/reject:** Host approves by calling `setActiveVideo(item.youtubeUrl)` — this publishes kind:20010, which other subscribers pick up as the new active video. Queue item is then cleared locally. Host rejects by publishing kind:20011 with `action: 'reject'` and the suggestion event ID — subscribers remove from queue.

### Anti-Patterns to Avoid

- **Using kind:40 (NIP-28 channels) for listening rooms:** kind:40 is for persistent scene chat rooms already used by `rooms.svelte.ts`. A listening room is not a chat room — it needs different semantics (one per channel, ephemeral lifecycle, video sync). Separate kind space prevents collision.
- **Syncing playback position:** The decision is locked to URL-only sync. No `currentTime` tracking, no iframe API integration.
- **Storing room state in taste.db:** `sessions.svelte.ts` architectural constraint applies: "MUST NEVER call any Tauri invoke(). Ephemeral session data must never reach taste.db." Same rule for listening rooms.
- **Blocking UI on NDK operations:** All Nostr publishes are async/fire-and-forget for room interactions. Optimistic local state updates happen immediately.
- **Calling `ndk.fetchEvents()` for real-time queue/sync:** Use `ndk.subscribe({ closeOnEose: false })` for real-time events. `fetchEvents` closes after EOSE and misses new events.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube URL validation | Custom regex | `youtubeEmbedUrl()` from `src/lib/embeds/youtube.ts` | Already handles `youtube.com/watch`, `youtu.be`, `youtube.com/embed` formats; returns null for invalid/channel URLs |
| Nostr event publish | Raw WebSocket to relay | `NDKEvent.publish()` via existing `ndkState.ndk` | NDK handles relay pool, signing, deduplication |
| Participant avatar rendering | Custom avatar generator | `generateAvatarSvg(pubkey)` from `src/lib/identity/avatar.ts` | DiceBear already integrated; pubkey as seed gives deterministic avatar per participant |
| Ephemeral event subscription | Custom WebSocket filter | `ndk.subscribe({kinds:[...], closeOnEose: false})` | NDK manages relay reconnect, dedup, and filter negotiation |
| Heartbeat timer cleanup | Component-level tracking | Module-level `_roomSubs` Map + cleanup returned from joinRoom | Mirrors `sessions.svelte.ts` `_sessionSubs` Map pattern exactly |

**Key insight:** This phase is almost entirely a new data layer on top of existing infrastructure. `youtubeEmbedUrl()`, `generateAvatarSvg()`, `initNostr()`, and `ndkState` already exist. The work is designing the event schema and wiring Svelte reactive state.

---

## Common Pitfalls

### Pitfall 1: NDK Ephemeral Kind Double-Cast
**What goes wrong:** `ndk.subscribe({kinds: [20010, 20011, 20012]})` gives TypeScript error because NDKKind enum doesn't include 20000+ range values.
**Why it happens:** `NDKKind` is a TypeScript enum with only known NIP event kinds. Custom/ephemeral kinds outside the enum cause type errors.
**How to avoid:** Use the double-cast pattern established in `sessions.svelte.ts` line 203-204:
```typescript
kinds: [20010, 20011, 20012] as unknown as NDKKind[]
```
**Warning signs:** TypeScript errors like "Type 'number' is not assignable to type 'NDKKind'" on the kinds array.

### Pitfall 2: Autoplay Blocked in WebView2
**What goes wrong:** YouTube embed with `?autoplay=1` doesn't auto-play when host sets a new video.
**Why it happens:** Tauri's WebView2 may enforce autoplay policies in certain configurations. Standard Chrome blocks unmuted autoplay.
**How to avoid:** The CONTEXT.md sync model is "load from beginning" — the user will click play manually if autoplay is blocked. The `{#key activeVideoUrl}` block forces a fresh iframe, which is the important part. If autoplay consistently fails, append `&mute=1` to the embed URL — this is allowed by browsers unconditionally.
**Warning signs:** Iframe loads but video doesn't start playing when URL changes.

### Pitfall 3: kind:10311 Tag Filter May Fail on Some Relays
**What goes wrong:** Scene page queries `{kinds:[10311], '#t':['mercury', slug]}` and gets no results even when a room is open.
**Why it happens:** NIP-01 spec guarantees tag filters (`#t`, `#e`, etc.) for regular and addressable events, but relay implementations vary for replaceable events (10000-19999). Some relays may not index replaceable events by tags.
**How to avoid:** Use kind:30311 instead (addressable, `#d` tag filter is guaranteed). Or: embed the channel slug in the `d` tag of kind:10311 and filter with `'#d': ['mercury-room-'+sceneSlug]` (replaceable events use implicit `d: ''` — this won't work). Safest: use kind:30311.
**Warning signs:** Scene page "Room active" indicator never appears even when a room event was published.

### Pitfall 4: Queue State Diverges Between Participants
**What goes wrong:** Two guests see different queue orders; host sees queue items that guests have retracted; approved items remain visible in queue.
**Why it happens:** Ephemeral events arrive out-of-order across different relay paths. Queue state is built from subscription events, not fetched history (since ephemeral events aren't stored).
**How to avoid:**
- Use suggestion event `created_at` timestamp for FIFO ordering (not arrival order)
- Queue items have a state field: `pending | retracted | approved | rejected` — process all state transitions, never delete from array (just filter on render)
- Approve/reject/retract events reference the original suggestion event ID via `['e', suggestionEventId]` tag
**Warning signs:** Guests see queue items the host has already rejected; queue order flickers.

### Pitfall 5: Host Disconnect Detection
**What goes wrong:** Host disconnects without publishing a room-close event. All guests remain in the room UI with no video and no host, but the "Room active" indicator on the scene page stays lit.
**Why it happens:** No TCP-level disconnect event in Nostr. The host simply stops sending heartbeats.
**How to avoid:** Use the heartbeat TTL for the host too. If the host's heartbeat hasn't arrived in 75 seconds, guests should detect the host as "gone" and close the room UI client-side. The kind:10311 room state event can be re-published with `status: "closed"` by any remaining client — but since it's replaceable, only the host's pubkey version is authoritative. Guests simply navigate back to the scene page when host presence expires.
**Warning signs:** Room page stuck in "Loading..." state with no active video after host disconnects.

### Pitfall 6: One-Pending-Suggestion Limit Not Enforced Cross-Client
**What goes wrong:** A guest opens two Mercury windows and submits suggestions from both, bypassing the one-pending limit.
**Why it happens:** `myPendingSuggestionId` is in-memory state per client instance.
**How to avoid:** This is acceptable for Phase 20 — the CONTEXT.md limit is a UX courtesy, not a security enforcement. Client-side enforcement is sufficient. The host still controls approval. No cross-client enforcement mechanism needed.
**Warning signs:** N/A — this is a known acceptable limitation.

---

## Code Examples

Verified patterns from existing codebase:

### Ephemeral Event Publish (from sessions.svelte.ts — verified)
```typescript
// Source: D:/Projects/Mercury/src/lib/comms/sessions.svelte.ts
// Lines 165-186 — sendPartyMessage pattern

const { NDKEvent } = await import('@nostr-dev-kit/ndk');
const event = new NDKEvent(ndk);
event.kind = 20010 as unknown as NDKKind; // custom ephemeral kind
event.content = JSON.stringify({ youtubeUrl, embedUrl });
event.tags = [
  ['t', 'mercury'],
  ['t', channelSlug],
  ['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
];
await event.publish();
```

### Ephemeral Event Subscribe (from sessions.svelte.ts — verified)
```typescript
// Source: D:/Projects/Mercury/src/lib/comms/sessions.svelte.ts
// Lines 203-206 — NDKKind double-cast pattern for ephemeral kinds

const sub = ndk.subscribe(
  { kinds: [20010, 20011, 20012] as unknown as NDKKind[], '#t': ['mercury', channelSlug] },
  { closeOnEose: false }
);
sub.on('event', (event) => { /* handle */ });
// Store sub.stop() for cleanup in endRoom()
```

### YouTube URL Validation (from youtube.ts — verified)
```typescript
// Source: D:/Projects/Mercury/src/lib/embeds/youtube.ts

import { youtubeEmbedUrl } from '$lib/embeds/youtube.js';

const embedUrl = youtubeEmbedUrl(inputUrl);
if (!embedUrl) {
  // Not a valid YouTube video URL — show error to user
  error = 'Please paste a valid YouTube video URL';
  return;
}
// embedUrl is now a privacy-friendly youtube-nocookie.com/embed/VIDEO_ID URL
```

### Avatar Generation for Participants (from avatar.ts — verified)
```typescript
// Source: D:/Projects/Mercury/src/lib/identity/avatar.ts

import { generateAvatarSvg } from '$lib/identity/avatar.js';

// Use participant's pubkey as seed for deterministic avatar
const svgString = generateAvatarSvg(participant.pubkey);
// Render: {@html svgString} inside a sized container
```

### Svelte Keyed Block for iframe Reload
```svelte
<!-- Source: Svelte 5 documentation — {#key} forces component teardown/remount -->
<!-- Pattern: when activeVideoUrl changes, iframe is destroyed and recreated -->
{#key roomState.activeVideoUrl}
  <iframe
    src="{roomState.activeVideoUrl}?autoplay=1"
    title="Room video"
    frameborder="0"
    allow="autoplay; encrypted-media"
    allowfullscreen
    class="room-player"
  ></iframe>
{/key}
```

### NDK fetchEvent for Replaceable Room State (tag filter on kind:10311)
```typescript
// Source: adapted from rooms.svelte.ts loadRooms() pattern

const events = await ndk.fetchEvents({
  kinds: [10311] as unknown as NDKKind[],
  '#t': ['mercury', sceneSlug],
  since: Math.floor(Date.now() / 1000) - 3600,
  limit: 10
});
// Filter for status: 'open', pick newest by created_at
const activeRoom = [...events]
  .filter(e => { try { return JSON.parse(e.content).status === 'open'; } catch { return false; } })
  .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0] ?? null;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom WebSocket for real-time sync | Nostr ephemeral events (kind:20000+) | Established in sessions.svelte.ts | No custom server; relays handle fan-out |
| kind:20001/20002 (sessions.svelte.ts) | kind:20010/20011/20012 (listening rooms) | Phase 20 | Separate kind space prevents collision with existing session events |
| NIP-53 kind:30311 (Live Activities) | Mercury custom kind:10311 (STATE.md decision) | Design session 2026-02-24 | NIP-53 is designed for audio streams/live video; Mercury rooms are YouTube URL sync only |

**Deprecated/outdated:**
- `kind:20001`/`kind:20002`: Reserved for existing `sessions.svelte.ts` (listening parties with AI music chat). Listening rooms use a separate kind range.
- Position-level sync: Explicitly deferred. Do not implement. iframe API not available for youtube-nocookie embeds.

---

## Open Questions

1. **kind:10311 vs kind:30311 for room state**
   - What we know: STATE.md locked `kind:10311` (replaceable, 10000-19999 range). Research found that `#t` tag filtering on replaceable events is not guaranteed by all relays.
   - What's unclear: Whether Mercury's 4 relays (nos.lol, relay.damus.io, nostr.mom, relay.nostr.band) support `#t` tag filtering on replaceable events.
   - Recommendation: Implement with kind:30311 (addressable, `#d` tag guaranteed) and use `d: 'mercury-room-'+sceneSlug` as the unique identifier. Diverges from STATE.md's kind:10311 choice, but more reliable. If the planner wants to honor STATE.md exactly, test kind:10311 with `#t` filter empirically during Wave 1.

2. **Host display name in participant list**
   - What we know: Participant list shows "Nostr display name + avatar." Mercury does NOT currently fetch Nostr kind:0 profiles anywhere in the codebase — there is no `fetchProfile()` utility.
   - What's unclear: Should we build a profile fetch helper, or use pubkey truncation as the display name fallback?
   - Recommendation: Truncate pubkey to first 8 chars as fallback (`pubkey.slice(0,8)...`). Optionally attempt `ndk.getUser({pubkey}).fetchProfile()` for display name enrichment — NDK 3.x includes this method. Make it best-effort (async, fire-and-forget, swap name when it arrives).

3. **Relay propagation latency for kind:10311 (STATE.md Blocker)**
   - What we know: STATE.md notes "kind:10311 relay propagation latency: needs empirical validation with Mercury's relay pool during implementation."
   - What's unclear: Whether the 4 Mercury relays propagate kind:10311 events to all subscribers fast enough for real-time video sync.
   - Recommendation: Test during implementation. Ephemeral events are prioritized by relays (not stored = less disk I/O). Latency should be 50-500ms on well-connected relays. Acceptable for URL sync (not position sync).

---

## Sources

### Primary (HIGH confidence)
- `D:/Projects/Mercury/src/lib/comms/sessions.svelte.ts` — verified ephemeral event pattern: NDKKind double-cast, NIP-40 expiration tags, subscribe with `closeOnEose: false`, `_sessionSubs` Map cleanup pattern
- `D:/Projects/Mercury/src/lib/comms/rooms.svelte.ts` — verified NIP-28 room pattern: `ndk.fetchEvents()`, `ndk.subscribe()`, optimistic state updates
- `D:/Projects/Mercury/src/lib/comms/nostr.svelte.ts` — verified NDK singleton, Mercury relay pool (4 relays), `initNostr()` idempotent
- `D:/Projects/Mercury/src/lib/embeds/youtube.ts` — verified `youtubeEmbedUrl()` function: 3 URL patterns, returns `youtube-nocookie.com/embed/VIDEO_ID` or null
- `D:/Projects/Mercury/src/lib/identity/avatar.ts` — verified `generateAvatarSvg(seed)` DiceBear integration
- `D:/Projects/Mercury/package.json` — confirmed `@nostr-dev-kit/ndk ^3.0.0`, no new packages needed
- NIP-01 spec (https://github.com/nostr-protocol/nips/blob/master/01.md) — confirmed ephemeral event range 20000-29999, replaceable range 10000-19999, addressable range 30000-39999
- YouTube embed docs (https://developers.google.com/youtube/player_parameters) — confirmed `?autoplay=1` parameter, minimum 200x200px viewport

### Secondary (MEDIUM confidence)
- NIP-53 (https://github.com/nostr-protocol/nips/blob/master/53.md) — confirmed Live Activities spec; ruled out as inappropriate for Mercury's use case (URL sync, not live stream)
- NDK subscribe `closeOnEose: false` default behavior — confirmed from NDK search results; default is `false` (keep open after EOSE)
- YouTube embed `{#key}` pattern — Svelte 5 documentation pattern; iframe teardown/remount on key change is the standard approach

### Tertiary (LOW confidence)
- kind:10311 relay tag filter reliability — not empirically validated; relay behavior for `#t` on replaceable events may vary. Flagged as Open Question 1.
- Autoplay in Tauri WebView2 without muted — based on known WebView2 behavior difference from Chrome. Needs runtime verification.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries verified in existing codebase
- Architecture: HIGH — patterns copied directly from `sessions.svelte.ts` and `rooms.svelte.ts`
- Event kind design: MEDIUM — kind ranges confirmed by NIP-01; specific kind numbers for Mercury are Claude's discretion; relay behavior for `#t` on kind:10311 is LOW confidence
- YouTube embed: HIGH — `youtubeEmbedUrl()` already exists and works; autoplay behavior in WebView2 is MEDIUM
- Pitfalls: HIGH — derived from reading existing code that will be modified/extended

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (Nostr NIPs and NDK APIs are relatively stable; YouTube embed params are stable)
