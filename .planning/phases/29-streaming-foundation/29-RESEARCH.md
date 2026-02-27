# Phase 29: Streaming Foundation - Research

**Researched:** 2026-02-27
**Domain:** Svelte 5 state management, HTML5 drag-and-drop, iframe postMessage, Settings UI patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings priority UI:**
- Service name text only — no logos or icons
- Grip icon on the left edge of each row as the drag affordance
- Order is saved and persists across restarts, but has no active effect in this phase — reserved for future auto-resolution
- Lives in a new "Streaming" tab inside the existing Settings page

**Artist page badges:**
- Small text pill style (e.g., "Spotify", "Bandcamp") — no icons
- Non-clickable, informational only — not shortcuts to the embed section
- Positioned below the artist name in the header area, visible without scrolling
- If an artist has no streaming links in MusicBrainz: hide the badge row entirely (no empty state message)

**Audio coordination:**
- When a streaming embed activates: pause local audio (not stop — position is preserved)
- Coordination trigger: postMessage event from the embed iframe signals play activity; the app listens and pauses local audio in response
- When the embed closes or stops: local audio stays paused; user must manually press play to resume
- No toast or notification — the player bar's paused state makes the interruption visible without extra UI

**Player bar badge:**
- Format: small text-only label — "via Spotify", "via SoundCloud", etc.
- Position: near the track info area (left/center of player bar), alongside track name/artist metadata
- Clears when the embed iframe is closed or destroyed (not on pause/stop)
- Only appears during streaming embed activity — shows nothing during local audio playback

### Claude's Discretion
- How "via X" label is styled (color, size, font-weight) relative to existing player bar text
- How drag-and-drop reorder is implemented (library choice or native HTML5 drag)
- Exact postMessage event schema / what signals count as "embed is active"
- Where in the Svelte store the active streaming source state lives

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | User can set streaming service priority order via drag-to-reorder in Settings → Streaming (persisted across sessions) | Native HTML5 drag pattern from Queue.svelte; persistence via existing `set_ai_setting` Tauri invoke |
| INFRA-02 | App prevents simultaneous playback — only one source (local player or streaming service) active at a time | postMessage listener pattern; `pause()` function already exported from `audio.svelte.ts`; new `streamingState` store |
| INFRA-03 | Artist page detects and shows which streaming services have content for the current artist (derived from existing MusicBrainz link data) | `data.links` already has `bandcamp[]`, `spotify[]`, `soundcloud[]`, `youtube[]` arrays — no new API calls needed |
| PLAYER-01 | Player bar displays a service badge showing the currently active streaming source (e.g. "Spotify", "SoundCloud", "Bandcamp") | New `streamingState.activeSource` field; Player.svelte reads it and renders "via X" label conditionally |
</phase_requirements>

---

## Summary

Phase 29 is entirely a frontend Svelte 5 state-management and UI problem. The codebase already has all the raw ingredients: `data.links` exposes per-platform URL arrays (Bandcamp, Spotify, SoundCloud, YouTube) on the artist page, `audio.svelte.ts` has a `pause()` function, the Settings page has an established section/tab pattern, and the Queue component demonstrates native HTML5 drag-and-drop that works in Tauri WebView2. There are no new Rust commands, no new database tables, and no new npm packages required.

The four deliverables map directly to existing patterns: (1) a new "Streaming" section in Settings using the same `settings-section` div pattern, with native HTML5 drag reorder identical to Queue.svelte; (2) artist page badges derived from `data.links` array lengths — non-zero means the platform has content; (3) a new `streamingState` module (`.svelte.ts`) with an `activeSource` field, written once and read everywhere; (4) a conditional "via X" span in the track-info area of Player.svelte, shown only when `streamingState.activeSource` is non-null.

The most nuanced part is the postMessage coordination. Spotify and YouTube embeds emit `message` events from their iframes on play activity. SoundCloud uses its own Widget API (already hooked in EmbedPlayer.svelte). The app must listen at the `window` level, inspect the message origin, and determine which platform sent it. The EmbedPlayer component is the natural place to wire this — it already hooks the SoundCloud widget and manages iframe lifecycle.

**Primary recommendation:** Use native HTML5 drag (no new library — Queue.svelte already demonstrates the exact pattern), persist the service order as a JSON array string via the existing `set_ai_setting` Tauri invoke, add a single `streamingState` module for the active source, and wire postMessage detection into EmbedPlayer.svelte.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 `$state` runes | project version | Reactive global state for `streamingState` | Project-wide pattern — all state modules use `$state` at module level (see `state.svelte.ts`, `playback.svelte.ts`) |
| Native HTML5 Drag API | browser built-in | Drag-to-reorder in Settings | Already used in `Queue.svelte` — no new dependency, works in Tauri WebView2 |
| `set_ai_setting` / `get_all_ai_settings` Tauri invoke | existing | Persist service priority order | All user preferences already use this mechanism (theme, layout, streaming pref) |
| `window.addEventListener('message', ...)` | browser built-in | Detect iframe play events | Standard postMessage API — only mechanism available from sandboxed iframes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SoundCloud Widget API | existing (already loaded in EmbedPlayer.svelte) | Detect SC play events | SC does not reliably emit postMessage from the embed; the Widget API is already hooked |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native HTML5 drag | `svelte-dnd-action` or `SortableJS` | External libs would work fine but add weight; native drag is already proven in this codebase and sufficient for a 4-item list |
| JSON-array in `ai_settings` | Separate DB table | A dedicated table would be future-proof for Phase 30+ but is overkill when we have 4 static services |
| `window` postMessage listener | Cross-frame polling | Polling is wasteful; postMessage is the only reliable cross-origin signal |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

New and modified files for this phase:

```
src/lib/player/
└── streaming.svelte.ts     # NEW — streamingState (activeSource) + setActiveSource / clearActiveSource

src/lib/theme/
└── preferences.svelte.ts   # MODIFY — add loadServiceOrder / saveServiceOrder functions

src/lib/components/
├── EmbedPlayer.svelte       # MODIFY — postMessage listener, SC Widget play event, call setActiveSource
└── Player.svelte            # MODIFY — render "via X" badge from streamingState.activeSource

src/routes/settings/
└── +page.svelte             # MODIFY — add "Streaming" section with drag-to-reorder list

src/routes/artist/[slug]/
└── +page.svelte             # MODIFY — add streaming badge pills below artist name
```

### Pattern 1: Svelte 5 Module-Level Reactive State

**What:** A `.svelte.ts` file exporting a `$state` object plus mutation functions. The same pattern used by `playerState`, `playbackState`, `streamingPref`, `themeState`.

**When to use:** When state must be readable by multiple components without prop drilling.

```typescript
// src/lib/player/streaming.svelte.ts
// Source: project pattern — see state.svelte.ts, playback.svelte.ts

export type StreamingSource = 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | null;

export const streamingState = $state({
  activeSource: null as StreamingSource,
  serviceOrder: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] as string[]
});

export function setActiveSource(source: StreamingSource): void {
  streamingState.activeSource = source;
}

export function clearActiveSource(): void {
  streamingState.activeSource = null;
}
```

### Pattern 2: Persist Service Order via ai_settings

**What:** Serialize the order array to JSON, store under a new key via `set_ai_setting`. Load it in the root layout's `onMount` alongside existing preferences.

**When to use:** Any user preference that needs to survive app restarts.

```typescript
// In preferences.svelte.ts — following the exact pattern of saveUserTemplates()
// Source: src/lib/theme/preferences.svelte.ts lines 148-161

export async function saveServiceOrder(order: string[]): Promise<void> {
  try {
    const invoke = await getInvoke();
    await invoke('set_ai_setting', {
      key: 'streaming_service_order',
      value: JSON.stringify(order)
    });
  } catch (err) {
    console.error('Failed to save service order:', err);
  }
}

export async function loadServiceOrder(): Promise<string[]> {
  const DEFAULT_ORDER = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];
  try {
    const invoke = await getInvoke();
    const settings = await invoke<Record<string, string>>('get_all_ai_settings');
    const raw = settings['streaming_service_order'];
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as string[];
    // Validate — must be an array containing all 4 known services
    if (Array.isArray(parsed) && parsed.length === 4) return parsed;
    return DEFAULT_ORDER;
  } catch {
    return DEFAULT_ORDER;
  }
}
```

### Pattern 3: Native HTML5 Drag-to-Reorder (established project pattern)

**What:** `draggable={true}`, `ondragstart`, `ondragover`, `ondrop`, `ondragend` on each list item. A local `$state` tracks drag source index and drop target highlight.

**When to use:** Short, ordered lists (4 items) where a grip handle provides the affordance.

```typescript
// Source: src/lib/components/Queue.svelte — lines 10-11, 58-64
// Same pattern, adapted for service order list

let dragSrcIndex = $state<number | null>(null);
let isDragTarget = $state<number | null>(null);
```

```svelte
<!-- Grip icon on left, text-only service name -->
<div
  class="service-row"
  class:drag-over={isDragTarget === i}
  draggable={true}
  ondragstart={() => { dragSrcIndex = i; }}
  ondragover={(e) => { e.preventDefault(); isDragTarget = i; }}
  ondragleave={() => { isDragTarget = null; }}
  ondrop={(e) => {
    e.preventDefault();
    if (dragSrcIndex !== null && dragSrcIndex !== i) {
      // swap in local order array, then persist
      reorderServices(dragSrcIndex, i);
    }
    dragSrcIndex = null;
    isDragTarget = null;
  }}
  ondragend={() => { dragSrcIndex = null; isDragTarget = null; }}
>
  <span class="grip">⠿</span>
  <span class="service-name">{serviceLabel(order[i])}</span>
</div>
```

### Pattern 4: postMessage Coordination

**What:** Add a `window` message event listener in `EmbedPlayer.svelte` (or the artist page `onMount`) that inspects events from known embed origins and calls `setActiveSource()` + `pause()`.

**When to use:** Any time an iframe needs to communicate play state to the parent frame.

```typescript
// Source: MDN postMessage API + observed Spotify/YouTube message formats

// Known embed origins
const EMBED_ORIGINS: Record<string, StreamingSource> = {
  'open.spotify.com': 'spotify',
  'w.soundcloud.com': 'soundcloud',
  'www.youtube.com': 'youtube',
  'bandcamp.com': 'bandcamp'
};

function handleEmbedMessage(event: MessageEvent): void {
  // Determine which platform sent this
  let source: StreamingSource = null;
  try {
    const origin = new URL(event.origin).hostname;
    source = EMBED_ORIGINS[origin] ?? null;
  } catch {
    return;
  }

  if (!source) return;

  // Detect play activity — each platform has its own schema (see Pitfalls)
  const isPlayEvent = detectPlayEvent(event.data, source);
  if (isPlayEvent) {
    // Pause local audio if it's playing
    import('$lib/player/audio.svelte').then(({ pause }) => pause());
    setActiveSource(source);
  }
}

// Register once, on component mount
window.addEventListener('message', handleEmbedMessage);
// Cleanup on destroy
onDestroy(() => window.removeEventListener('message', handleEmbedMessage));
```

### Pattern 5: Artist Page Streaming Badges

**What:** Derive which platforms have content from `data.links` (already available as `links.bandcamp[]`, `links.spotify[]`, etc.) and render text pills.

**When to use:** Badge display only — no interactivity, no new API calls.

```svelte
<!-- Source: data.links is already populated by +page.ts from MusicBrainz -->
<!-- Positioned after artist-meta and before tags in the header -->

{@const streamingBadges = [
  { key: 'bandcamp', label: 'Bandcamp', has: data.links.bandcamp.length > 0 },
  { key: 'spotify', label: 'Spotify', has: data.links.spotify.length > 0 },
  { key: 'soundcloud', label: 'SoundCloud', has: data.links.soundcloud.length > 0 },
  { key: 'youtube', label: 'YouTube', has: data.links.youtube.length > 0 }
].filter(b => b.has)}

{#if streamingBadges.length > 0}
  <div class="streaming-badges">
    {#each streamingBadges as badge}
      <span class="streaming-badge">{badge.label}</span>
    {/each}
  </div>
{/if}
```

### Pattern 6: "via X" Player Bar Badge

**What:** Conditionally render a small text span in the `track-info` area of `Player.svelte`, driven by `streamingState.activeSource`.

**When to use:** Only during active streaming embed playback.

```svelte
<!-- Source: Player.svelte track-info area — lines 62-72 -->
<!-- Import streamingState at top of <script> -->

<div class="track-info">
  <div class="track-title">{playerState.currentTrack.title}</div>
  <div class="track-meta">
    <span class="track-artist">{playerState.currentTrack.artist}</span>
    {#if streamingState.activeSource}
      <span class="via-badge">via {sourceLabel(streamingState.activeSource)}</span>
    {/if}
  </div>
</div>
```

Note: the player bar only renders when `playerState.currentTrack !== null`. When a streaming embed is active but no local track is loaded, the player bar is not visible — the "via X" badge is in the player bar by design (CONTEXT.md decision), so this is acceptable for Phase 29. Future phases will address the case where no local track is loaded.

### Anti-Patterns to Avoid

- **Stopping local audio instead of pausing:** The CONTEXT.md explicitly requires `pause()` not `stop()`. Position is preserved. Use the existing `pause()` from `audio.svelte.ts`.
- **Creating a new persistence mechanism:** Do not add a new Rust command or DB table. Use `set_ai_setting` with key `streaming_service_order`.
- **Rendering the badge row with an empty state message:** If no streaming links, hide the row entirely — per CONTEXT.md locked decision.
- **Making service badges clickable:** They are informational only in this phase.
- **Loading the service order inside the Settings component:** Load it in the root layout `onMount` (alongside `loadStreamingPreference()`) and write to `streamingState.serviceOrder` so all components share the same state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | Custom pointer event handler, touch events, animation library | Native HTML5 `draggable` API (same as Queue.svelte) | The codebase already has this working; 4 items don't need touch support or animation |
| Persistence layer | New Rust command, new DB table | `set_ai_setting` / `get_all_ai_settings` (existing Tauri commands) | All user preferences use this; adding a table for 4 strings is over-engineering |
| Platform detection | New URL parsing logic | `detectPlatform()` from `$lib/embeds/categorize.ts` (already exists) | Handles bandcamp subdomains, open.spotify.com, youtu.be, etc. |
| SoundCloud play detection | Custom postMessage parsing | SoundCloud Widget API (already loaded and hooked in EmbedPlayer.svelte) | SC's Widget API provides `SC.Widget.Events.PLAY` — more reliable than raw postMessage |

**Key insight:** This phase adds coordination infrastructure on top of existing mechanisms — it doesn't replace them. The badge derives from `data.links`, the persistence uses `ai_settings`, the drag pattern copies Queue.svelte, and the audio pause uses the existing `pause()` export.

---

## Common Pitfalls

### Pitfall 1: Spotify postMessage Schema Is Undocumented and Fragile

**What goes wrong:** Spotify's embed iframe emits messages to the parent frame, but the payload format is not part of any official API. It changes without notice.

**Why it happens:** Spotify's embed player uses internal event names (`playback_update`, `ready`, etc.) that aren't documented for external use.

**How to avoid:** Use a broad detection heuristic — check `event.origin` for `open.spotify.com`, then check if the data is an object with any play-state indicator. Log events in dev to discover the current format. Do not depend on a specific key name.

**Warning signs:** Events being silently dropped, or active source never being set for Spotify.

### Pitfall 2: YouTube postMessage Origin Is `www.youtube.com` Not the Embed URL

**What goes wrong:** YouTube iframes are embedded with `https://www.youtube-nocookie.com/embed/...` or `https://www.youtube.com/embed/...` but the postMessage origin comes from `https://www.youtube.com`. The origin check must match `www.youtube.com`.

**Why it happens:** YouTube routes embed messages through their main domain regardless of the embed URL variant.

**How to avoid:** Check for `youtube.com` (hostname `includes` check) rather than exact URL match.

**Warning signs:** YouTube embed starts playing but `activeSource` is never set.

### Pitfall 3: SoundCloud Widget `PLAY` Event Fires After Re-Mount

**What goes wrong:** The SoundCloud Widget API binding (`hookSoundCloudWidget`) must be re-run after Svelte navigation causes EmbedPlayer to remount. The `data.hooked` dataset flag prevents re-hooking on the same element, but a new element after navigation has no flag.

**Why it happens:** Svelte destroys and recreates DOM on page navigation. The `data.hooked` guard is per-element — it correctly allows re-hooking on the new element after navigation.

**How to avoid:** This is already handled correctly in EmbedPlayer.svelte. When adding the audio coordination call to the `PLAY` handler, follow the existing pattern exactly.

**Warning signs:** SoundCloud plays start but local audio isn't paused.

### Pitfall 4: `streamingState.activeSource` Leaks Between Artist Pages

**What goes wrong:** User opens Artist A, starts a Spotify embed (sets `activeSource = 'spotify'`), navigates to Artist B. The badge still shows "via Spotify" on Artist B's artist page, but no embed is loaded.

**Why it happens:** Global state persists across navigation; it's only cleared when the iframe is destroyed.

**How to avoid:** Clear `activeSource` in the `onDestroy` callback of `EmbedPlayer.svelte`. This aligns with the CONTEXT.md decision: "Clears when the embed iframe is closed or destroyed."

**Warning signs:** "via Spotify" showing in player bar when no embed is active.

### Pitfall 5: Player Bar Badge Visible When No Local Track Is Loaded

**What goes wrong:** The "via X" badge is inside the Player component, which only renders when `playerState.currentTrack !== null`. If no local track has ever been loaded, the player bar is hidden and the badge is never shown — even while a streaming embed plays.

**Why it happens:** Player.svelte gates on `playerState.currentTrack` (line 54).

**How to avoid:** This is a known limitation accepted for Phase 29 — the CONTEXT.md scopes the badge as part of the local-player bar, not a standalone streaming indicator. Do not add complexity to show the bar without a local track. Later phases (PLAYER-02, PLAYER-03) will address source-switching UI.

**Warning signs:** None — this is expected behavior, not a bug in Phase 29.

### Pitfall 6: Service Order Saved with Wrong Key or Invalid JSON

**What goes wrong:** The `streaming_service_order` key stores JSON. If the array is malformed (wrong services, missing entries) on load, the UI breaks silently.

**Why it happens:** Typos in serialization, or future migration where services change.

**How to avoid:** On load, validate that the parsed array has exactly 4 entries and they're all known service names. Fall back to `DEFAULT_ORDER` on any validation failure (same pattern as `loadUserTemplates` in preferences.svelte.ts).

---

## Code Examples

### Load and Initialize Streaming State in Root Layout

```typescript
// In src/routes/+layout.svelte onMount (Tauri block) — after existing loadStreamingPreference()
// Source: src/routes/+layout.svelte lines 74-76

import { loadServiceOrder } from '$lib/theme/preferences.svelte';
import { streamingState } from '$lib/player/streaming.svelte';

// In onMount Tauri block:
const serviceOrder = await loadServiceOrder();
streamingState.serviceOrder = serviceOrder;
```

### Reorder Function for Settings

```typescript
// Call after drag drop in Settings, then persist
function reorderServices(fromIdx: number, toIdx: number): void {
  const order = [...localOrder];  // local $state copy
  const [moved] = order.splice(fromIdx, 1);
  order.splice(toIdx, 0, moved);
  localOrder = order;
  // Update global state and persist
  streamingState.serviceOrder = order;
  saveServiceOrder(order);  // fire-and-forget
}
```

### Detect Play Events from postMessage

```typescript
// In EmbedPlayer.svelte — handles Spotify and YouTube
// SoundCloud is handled separately via Widget API (already in place)

function detectPlayEvent(data: unknown, source: StreamingSource): boolean {
  if (source === 'spotify') {
    // Spotify embed emits objects — presence of any playback data counts as play
    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      // Known keys as of early 2026 (verify in dev)
      return d['type'] === 'playback_update' || d['type'] === 'player_state_changed';
    }
    return false;
  }
  if (source === 'youtube') {
    // YouTube Player API emits JSON strings
    if (typeof data === 'string') {
      try {
        const d = JSON.parse(data) as Record<string, unknown>;
        return d['event'] === 'onStateChange' && d['info'] === 1; // 1 = playing
      } catch { return false; }
    }
    return false;
  }
  return false;
}
```

### Service Order Drag-to-Reorder Settings UI

```svelte
<!-- src/routes/settings/+page.svelte — new "Streaming" settings-section -->

<div class="settings-section">
  <h2>Streaming</h2>
  <p class="section-desc">
    Drag to set your preferred service order. Reserved for future auto-resolution.
  </p>

  <div class="service-order-list">
    {#each localServiceOrder as service, i}
      <div
        class="service-row"
        class:drag-over={isDragTarget === i}
        draggable={true}
        ondragstart={() => { dragSrcIdx = i; }}
        ondragover={(e) => { e.preventDefault(); isDragTarget = i; }}
        ondragleave={() => { isDragTarget = null; }}
        ondrop={(e) => {
          e.preventDefault();
          if (dragSrcIdx !== null && dragSrcIdx !== i) reorderServices(dragSrcIdx, i);
          dragSrcIdx = null; isDragTarget = null;
        }}
        ondragend={() => { dragSrcIdx = null; isDragTarget = null; }}
        role="listitem"
      >
        <span class="drag-grip">⠿</span>
        <span class="service-name">{serviceLabel(service)}</span>
      </div>
    {/each}
  </div>
</div>
```

### "via X" Player Bar Badge

```svelte
<!-- In Player.svelte track-info div, after track-meta -->
<!-- Style: small, muted, consistent with existing track-meta font-size (10px, var(--t-3)) -->

{#if streamingState.activeSource}
  <span class="via-badge">via {sourceLabel(streamingState.activeSource)}</span>
{/if}

<!-- Style -->
<!-- .via-badge: font-size 10px, color var(--t-3), font-style italic, margin-left 4px -->
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `preferred_platform` string in preferences | `streaming_service_order` JSON array | Phase 29 | Array replaces the string — the old `preferred_platform` key can coexist (backward compatible) |
| No audio coordination state | `streamingState.activeSource` in `streaming.svelte.ts` | Phase 29 | Enables player bar badge and future source-switching |
| EmbedPlayer: play detection only for SoundCloud (taste tracking) | EmbedPlayer: play detection for SC + Spotify + YouTube (audio coordination) | Phase 29 | SC Widget API already hooks PLAY event; add postMessage handler for Spotify/YouTube |

**Deprecated/outdated:**
- The `preferred_platform` single-string preference: not removed, but its role shrinks — it remains for backward compatibility and the existing sorted-embed logic. The new `streaming_service_order` array is the authoritative priority for Phase 29+.

---

## Open Questions

1. **Spotify postMessage payload format**
   - What we know: Spotify embeds emit messages; the payload includes playback state
   - What's unclear: Exact key names as of February 2026 (no official docs)
   - Recommendation: During implementation, add a `console.log` on all messages from `open.spotify.com` in dev mode, capture the payload, then implement `detectPlayEvent` based on observed keys. Document the keys in a code comment with date observed.

2. **YouTube postMessage: `youtube-nocookie.com` vs `youtube.com` origin**
   - What we know: YouTube nocookie embeds are used in EmbedPlayer.svelte; some YouTube implementations route messages through the main domain
   - What's unclear: Whether the production .msi build (different origin context) changes postMessage behavior
   - Recommendation: Check both `youtube.com` and `youtube-nocookie.com` as valid origins. Log the actual origin in dev.

3. **Player bar visibility when no local track is loaded**
   - What we know: Player.svelte only renders when `playerState.currentTrack !== null`
   - What's unclear: Whether this is a problem users will notice immediately (they'd see streaming audio playing with no player bar badge)
   - Recommendation: Accept this limitation for Phase 29 — it's within scope. Note it explicitly in the implementation as a known gap addressed by later phases.

---

## Sources

### Primary (HIGH confidence)
- Source: `src/lib/player/state.svelte.ts` — Svelte 5 `$state` module pattern used throughout the project
- Source: `src/lib/player/audio.svelte.ts` — `pause()` function (line 121) already exported, available for coordination
- Source: `src/lib/components/Queue.svelte` — native HTML5 drag-and-drop pattern (lines 10-64), confirmed working in Tauri WebView2
- Source: `src/lib/theme/preferences.svelte.ts` — `set_ai_setting` / `get_all_ai_settings` persistence pattern for user preferences
- Source: `src/lib/embeds/types.ts` — `PlatformLinks` interface with `bandcamp[]`, `spotify[]`, `soundcloud[]`, `youtube[]` arrays
- Source: `src/routes/artist/[slug]/+page.ts` — `data.links` is populated from MusicBrainz; no new API calls needed for badges
- Source: `src/lib/components/EmbedPlayer.svelte` — SoundCloud Widget API already hooked (lines 33-110); `window` message handler is the addition needed

### Secondary (MEDIUM confidence)
- YouTube iframe Player API postMessage format: `{event: "onStateChange", info: 1}` for playing state — verified against YouTube IFrame Player API docs (https://developers.google.com/youtube/iframe_api_reference#Events)
- Spotify embed postMessage: no official docs, but observed behavior from community reports (LOW confidence on exact keys — verify in dev)

### Tertiary (LOW confidence)
- Spotify embed `playback_update` event name: reported in community GitHub issues and Stack Overflow; not in official docs. Mark as LOW confidence — verify with console.log during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns are confirmed in the existing codebase
- Architecture: HIGH — direct derivation from existing files; no speculative patterns
- Pitfalls: MEDIUM-HIGH — most are derived from reading the code; Spotify postMessage is LOW (undocumented)

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable patterns; Spotify postMessage format may drift faster)
