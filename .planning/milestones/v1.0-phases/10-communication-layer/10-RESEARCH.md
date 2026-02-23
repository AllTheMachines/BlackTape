# Phase 10: Communication Layer - Research

**Researched:** 2026-02-23
**Domain:** Decentralized messaging protocol (Nostr), real-time chat UI (Svelte 5), AI moderation integration
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Chat UI & Feel**
- Messaging lives as an **overlay/modal** — opens on top of whatever the user is browsing, no navigation required
- DMs and scene rooms use the **same chat interface** — unified UI, just different participant counts and labels
- Notification style: **badge on nav icon only** — unobtrusive, no toasts or interruptions while browsing
- **Mercury links unfurl inline** — paste an artist/release page URL and it renders as a mini card (cover art, name, tags) inside the chat

**Scene Rooms & Discovery**
- **Any user can create a room** — no threshold or restriction (beyond the AI requirement below)
- Rooms are discoverable through **all three paths**: tag browsing (same taxonomy as artists), rooms surfaced on artist/tag pages, and a standalone rooms directory
- Room naming: **name + at least one required tag** — ensures discoverability; a **content safety filter** runs on room names at creation time (no offensive or spam names)
- Inactive rooms **auto-archive** after a period of no messages — archived rooms stay searchable but don't appear in the active directory

**Ephemeral Sessions (Live Listening Parties)**
- Core use case: **"I'm playing this album, come listen with me"** — a live, shared listening moment tied to specific music
- When a session ends: **nothing is preserved** — messages, participants, and context are fully deleted. No taste signals, no receipts. Full privacy.
- Entry points: **both** — a "Start a listening party" action on artist/album pages AND the ability to create one from within the chat overlay
- Visibility: **host chooses at creation** — private (invite-only links) or public (visible in discovery/active sessions feed)

**Moderation UX**
- When a user flags a message: **nothing visible changes** — the flag is logged silently, the room owner gets a notification queue, no public disruption
- Room owner moderation tools: **delete messages + kick + ban + slow mode**
- Room owners can **appoint co-moderators** from existing members (owner retains authority)
- If owner is absent: **nothing automatic** — room continues via community flagging; no auto-promotion

**AI System (Critical — Gates Room Creation)**
- **Configuring an AI model is required to create a room** — not to join or participate, only to create. Ensures every room has AI moderation coverage from day one. Primary rationale: preventing child abuse and harmful content at the infrastructure level.
- AI configuration lives in **Settings** (accessible anytime) AND is **prompted contextually** when a user tries to create a room without it configured
- Configuration options: **paste an API key** (any provider — OpenAI, Anthropic, etc.) OR **download an open-source model** — user's choice
- This is a **platform-wide setting** — the configured model powers all AI features across Mercury

**AI in Communication (Phase 10 scope)**
- **AI moderation bot**: room owner's AI actively monitors their room for harmful content
- **AI taste translation**: when two users connect via DM, AI explains WHY their tastes overlap
- **AI matchmaking context**: suggests conversation starters based on taste overlap/divergence
- **AI bots as room participants**: users can invite AI bots into rooms (e.g., a DJ bot)

### Claude's Discretion
- Communication infrastructure protocol (Matrix vs Nostr vs P2P vs relay) — deferred to research, pick based on zero-server-cost constraint and ecosystem maturity at build time
- Exact slow mode timer options (1 min, 5 min, etc.)
- Auto-archive threshold (30 days, 60 days of inactivity)
- Content safety filter implementation (word list, ML model, etc.)
- How open-source models are downloaded and managed locally

### Deferred Ideas (OUT OF SCOPE)
- None surfaced — discussion stayed within Phase 10 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-04 | Private DM system — encrypted 1:1 messaging between users | Nostr NIP-17 (gift-wrap DMs) via NDK provides E2E encrypted DMs; identity keypair from Phase 9 profile system maps directly to Nostr pubkey |
| COMM-05 | Scene rooms — persistent group chat organized by tag taxonomy | Nostr NIP-28 (public chat channels) works over existing free relays with zero server cost; client-side moderation aligns with room owner tools |
| COMM-06 | Ephemeral live listening parties — zero-persistence shared sessions tied to specific music | Nostr ephemeral event kinds (20000–29999 range per NIP-01) are not stored by relays; NIP-40 expiration tags add explicit TTL for relay cleanup |
</phase_requirements>

---

## Summary

The core infrastructure question — which messaging protocol to use — has a clear answer given the zero-server-cost hard constraint. **Nostr** is the correct choice. It is the only protocol that runs entirely over public, community-operated WebSocket relays (many free), requires no server to operate, has a mature JavaScript ecosystem, supports E2E encrypted DMs (NIP-17), public group channels (NIP-28), and ephemeral events (kinds 20000+). Matrix requires running a homeserver (server cost). WebRTC P2P requires a signaling layer that needs infrastructure (TURN servers for NAT traversal reliability). Nostr's architecture maps perfectly to all three communication layers this phase requires.

The key integration insight is that Mercury's existing identity system (Phase 9 — pseudonymous handles, generative avatars) maps directly to Nostr's keypair model. Each Mercury user generates a Nostr keypair stored in IndexedDB (not localStorage, for cryptographic key security). The user's Mercury handle and avatar become their Nostr profile. This means Phase 10 is building a Nostr client embedded in Mercury, not a generic chat system.

The UI layer is the other major domain. The overlay/modal pattern decided by Steve is best implemented using the native HTML `<dialog>` element with Svelte 5 bindings — no additional library needed. The `<dialog>` element has built-in focus trap, Escape key handling, and accessibility semantics. For the chat panel specifically, a slide-in drawer from the right (or bottom on mobile) is the right pattern, keeping the existing browsing context visible. Mercury links unfurling inline requires a server-side API endpoint that fetches Open Graph metadata from Mercury's own pages.

**Primary recommendation:** Use Nostr protocol via NDK (`@nostr-dev-kit/ndk` 3.0.0 + `@nostr-dev-kit/ndk-svelte` 2.4.x) for all three communication layers. Store keypairs in IndexedDB. Use NIP-17 for DMs, NIP-28 for scene rooms, and ephemeral event kinds for listening parties. Build the chat UI as a native `<dialog>`-based overlay in the SvelteKit root layout. Use the user's existing AI provider (from taste.db `ai_settings`) for moderation — no new configuration required beyond what Phase 10 adds as a gate on room creation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nostr-dev-kit/ndk` | 3.0.0 | Nostr protocol client — relay pool, events, subscriptions | The de-facto high-level Nostr JS toolkit; outbox-model, auto-reconnect, NIP-17/28/29/44 support; TypeScript-first |
| `@nostr-dev-kit/ndk-svelte` | 2.4.48 | Svelte 5 reactive bindings for NDK subscriptions | Active (published frequently); provides rune-compatible store subscriptions; first-class Svelte 5 runes support |
| `nostr-tools` | 2.23.1 | Low-level Nostr primitives (key generation, event signing, NIP-19 encoding) | Used underneath NDK; useful directly for key management utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `<dialog>` API | Browser built-in | Chat overlay / modal container | Use for the overlay itself — built-in focus trap, Escape key, `aria-modal`, no library needed |
| `idb` (idb npm package) | latest | IndexedDB wrapper for Nostr keypair storage | Storing CryptoKeys / private key bytes in IndexedDB is W3C recommended over localStorage for cryptographic material |
| `unfurl` (jacktuck/unfurl) | latest | Server-side Open Graph / oEmbed metadata scraping for link unfurl | Node.js-compatible metadata scraper; runs in SvelteKit server route to fetch Mercury link previews |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nostr / NDK | Matrix protocol | Matrix requires a homeserver ($$$). Self-hosting is possible but violates zero-server-cost constraint |
| Nostr / NDK | WebRTC P2P | Pure P2P requires TURN servers for ~15% of connections where STUN fails; no relay = no persistence for scene rooms |
| Nostr / NDK | Custom relay (Cloudflare Durable Objects) | Durable Objects have per-request cost and operational complexity; Nostr's community relays are free |
| NDK | nostr-tools directly | nostr-tools is lower-level; NDK adds relay pool management, auto-reconnect, subscription dedup, caching — use NDK unless size is critical |
| `idb` | localStorage | localStorage stores private keys in plaintext readable by any same-origin JS; IndexedDB allows non-extractable CryptoKey storage per W3C spec |
| Native `<dialog>` | Bits UI / svelte-modals | Native dialog is zero-dependency, matches project pattern of avoiding external UI libraries where native works |

**Installation:**
```bash
npm install @nostr-dev-kit/ndk @nostr-dev-kit/ndk-svelte nostr-tools idb
# For link unfurl (server-side only):
npm install unfurl.js
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── comms/                   # All Phase 10 communication code
│   │   ├── index.ts             # Public API re-exports
│   │   ├── nostr.svelte.ts      # NDK singleton, keypair init, relay pool ($state)
│   │   ├── keypair.ts           # Nostr keypair generation + IndexedDB persistence
│   │   ├── dms.svelte.ts        # NIP-17 DM subscriptions and sending ($state)
│   │   ├── rooms.svelte.ts      # NIP-28 scene rooms — active rooms, messages ($state)
│   │   ├── sessions.svelte.ts   # Ephemeral listening parties ($state)
│   │   ├── moderation.ts        # Flag handling, slow mode, ban/kick logic
│   │   ├── unfurl.ts            # Mercury link detection + unfurl card builder
│   │   └── notifications.svelte.ts  # Unread badge counts ($state)
│   └── components/
│       └── chat/                # Chat UI components
│           ├── ChatOverlay.svelte       # Root <dialog> overlay container
│           ├── ChatPanel.svelte         # Unified DM + room message panel
│           ├── MessageList.svelte       # Scrollable message history
│           ├── MessageInput.svelte      # Composer with link detection
│           ├── UnfurlCard.svelte        # Inline Mercury link preview card
│           ├── RoomDirectory.svelte     # Scene rooms browse/search
│           ├── RoomCreator.svelte       # Create room (AI gate check)
│           ├── SessionCreator.svelte    # Start listening party
│           ├── ModerationQueue.svelte   # Room owner flag review
│           └── AiGatePrompt.svelte      # "Configure AI to create rooms" modal
├── routes/
│   ├── api/
│   │   ├── unfurl/+server.ts    # POST — fetch OG metadata for Mercury URLs
│   │   └── rooms/+server.ts     # GET — room directory (pulls from Nostr relays server-side or returns cached)
│   └── chat/                    # Optional: dedicated chat route for deep linking
```

### Pattern 1: NDK Singleton with Svelte 5 Runes

**What:** A single NDK instance initialized once at app startup, exposed as a reactive Svelte 5 `$state` module. All components read from it reactively.

**When to use:** All Nostr operations. Follow the existing Mercury pattern of `.svelte.ts` files for global reactive state.

```typescript
// src/lib/comms/nostr.svelte.ts
// Source: NDK GitHub README + nostr-dev-kit/ndk npm docs

import NDK, { NDKRelaySet } from '@nostr-dev-kit/ndk';
import { loadOrCreateKeypair } from './keypair.js';

// Mercury's curated relay list — mix of large public relays
const MERCURY_RELAYS = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://nostr.mom',
  'wss://relay.nostr.band',
];

export const ndkState = $state({
  ndk: null as NDK | null,
  pubkey: null as string | null,
  connected: false,
});

export async function initNostr(): Promise<void> {
  const { privateKey, publicKey } = await loadOrCreateKeypair();

  const ndk = new NDK({
    explicitRelayUrls: MERCURY_RELAYS,
    enableOutboxModel: true,
  });

  // Provide the signer so NDK can sign events on our behalf
  const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
  ndk.signer = new NDKPrivateKeySigner(privateKey);

  await ndk.connect();

  ndkState.ndk = ndk;
  ndkState.pubkey = publicKey;
  ndkState.connected = true;
}
```

### Pattern 2: Keypair Storage in IndexedDB

**What:** Nostr keypair (32-byte private key + derived public key) stored in IndexedDB, not localStorage. Private key bytes stored as Uint8Array in IndexedDB — NOT as a non-extractable CryptoKey (Nostr uses secp256k1, not WebCrypto's supported curves). The key insight: use IndexedDB for persistence, not WebCrypto API for key type.

**When to use:** First-run keypair creation and every subsequent session.

```typescript
// src/lib/comms/keypair.ts
// Source: nostr-tools docs + OWASP browser storage guidance

import { openDB } from 'idb';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

const DB_NAME = 'mercury-comms';
const STORE = 'keypair';

export async function loadOrCreateKeypair(): Promise<{
  privateKey: string; // hex
  publicKey: string;  // hex
}> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });

  let privKeyBytes = await db.get(STORE, 'privateKey');

  if (!privKeyBytes) {
    // nostr-tools generateSecretKey() returns Uint8Array
    privKeyBytes = generateSecretKey();
    await db.put(STORE, privKeyBytes, 'privateKey');
  }

  const privateKey = bytesToHex(privKeyBytes);
  const publicKey = getPublicKey(privKeyBytes);

  return { privateKey, publicKey };
}
```

### Pattern 3: NIP-17 Private DMs (Gift-Wrap)

**What:** NIP-17 is the current standard for private DMs. Messages are signed as kind:14, sealed in kind:13, then gift-wrapped in kind:1059 — each wrapping layer uses a throwaway keypair so metadata (who sent, when) is hidden even from relays. NDK's `@nostr-dev-kit/messages` package handles this complexity.

**When to use:** All 1:1 DMs between Mercury users.

```typescript
// src/lib/comms/dms.svelte.ts
// Source: NDK docs, NIP-17 spec at nips.nostr.com/17

import { NDKDMConversation } from '@nostr-dev-kit/ndk';

export async function sendDM(recipientPubkey: string, content: string): Promise<void> {
  const { ndk } = ndkState;
  if (!ndk) return;

  const { NDKUser } = await import('@nostr-dev-kit/ndk');
  const recipient = new NDKUser({ pubkey: recipientPubkey });

  // NDK handles NIP-17 gift-wrap automatically when sending to a user
  const conversation = new NDKDMConversation(ndk, [recipient]);
  await conversation.sendMessage(content);
}
```

### Pattern 4: NIP-28 Scene Rooms (Public Chat Channels)

**What:** NIP-28 defines kind:40 (channel create), kind:41 (channel metadata), kind:42 (channel message), kind:43 (hide message), kind:44 (mute user). These publish to standard Nostr relays — no special relay required. Client-side moderation (kind:43/44) is how room owners control content.

**When to use:** All scene rooms.

```typescript
// src/lib/comms/rooms.svelte.ts
// Source: NIP-28 spec at nips.nostr.com/28, nostr-tools nip28.ts

import { nip28 } from 'nostr-tools';

// Create a scene room — kind:40 event with Mercury tag taxonomy
export async function createRoom(
  name: string,
  tags: string[], // Mercury tag slugs — maps to Nostr 't' tags
  description: string
): Promise<string> { // returns channel ID (event ID of kind:40)
  const { ndk } = ndkState;
  if (!ndk) throw new Error('NDK not initialized');

  const { NDKEvent } = await import('@nostr-dev-kit/ndk');
  const event = new NDKEvent(ndk);
  event.kind = 40; // NIP-28 channel create
  event.content = JSON.stringify({ name, about: description, tags });

  // Mercury-specific: tag the room with genre taxonomy
  tags.forEach(tag => event.tags.push(['t', tag]));

  await event.publish();
  return event.id!;
}

// Subscribe to room messages — NDK reactive store
export function subscribeToRoom(channelId: string) {
  const { ndk } = ndkState;
  if (!ndk) return;

  return ndk.subscribe({
    kinds: [42], // kind:42 = channel message
    '#e': [channelId],
  }, { closeOnEose: false });
}
```

### Pattern 5: Ephemeral Listening Parties (Kind 20000+)

**What:** Nostr kinds 20000–29999 are ephemeral — relays MUST NOT store them, they relay in real-time only. When the session host closes the session, messages are gone. Use kind:20000 for party messages and NIP-40 expiration tags to hint relays to drop events after TTL.

**When to use:** Live listening party sessions.

```typescript
// src/lib/comms/sessions.svelte.ts
// Source: NIP-01 spec (ephemeral event kinds), NIP-40 (expiration)

export async function sendPartyMessage(
  sessionId: string,
  content: string,
  ttlSeconds = 3600 // 1hr default expiry
): Promise<void> {
  const { ndk } = ndkState;
  if (!ndk) return;

  const { NDKEvent } = await import('@nostr-dev-kit/ndk');
  const event = new NDKEvent(ndk);
  event.kind = 20000; // ephemeral — relays won't store
  event.content = content;
  event.tags = [
    ['e', sessionId],                          // link to session
    ['expiration', String(Math.floor(Date.now() / 1000) + ttlSeconds)], // NIP-40
  ];
  await event.publish();
}
```

### Pattern 6: Chat Overlay with Native `<dialog>`

**What:** The chat panel lives as a `<dialog>` element in the root layout. Opening/closing is managed by a Svelte 5 `$state` module. Native `<dialog>` provides focus trap, Escape key, and `aria-modal` for free.

**When to use:** The chat overlay container.

```svelte
<!-- src/lib/components/chat/ChatOverlay.svelte -->
<!-- Source: MDN dialog element docs + SvelteKit accessibility docs -->
<script lang="ts">
  import { chatState } from '$lib/comms/notifications.svelte.js';

  let dialogEl: HTMLDialogElement;

  $effect(() => {
    if (chatState.open) {
      dialogEl?.showModal(); // opens as modal with backdrop, focus trap, Escape key
    } else {
      dialogEl?.close();
    }
  });
</script>

<dialog
  bind:this={dialogEl}
  class="chat-overlay"
  on:close={() => { chatState.open = false; }}
  aria-label="Mercury Chat"
>
  <!-- Chat content — DMs, rooms, or session view -->
  {#if chatState.view === 'dms'}
    <ChatPanel />
  {:else if chatState.view === 'rooms'}
    <RoomDirectory />
  {:else if chatState.view === 'session'}
    <SessionView />
  {/if}
</dialog>
```

### Pattern 7: Mercury Link Unfurl (Server-Side)

**What:** When a message contains a Mercury URL (e.g., `https://mercury.app/artist/radiohead-…`), the client sends it to a server route that fetches the page's Open Graph tags and returns structured preview data. Client renders it as an inline card.

**When to use:** Link detection in MessageInput.svelte, rendering in UnfurlCard.svelte.

```typescript
// src/routes/api/unfurl/+server.ts
// Source: jacktuck/unfurl npm README

import { unfurl } from 'unfurl.js';

export async function POST({ request }) {
  const { url } = await request.json();

  // Only unfurl Mercury URLs — security guard
  if (!url.startsWith(PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'Not a Mercury URL' }), { status: 400 });
  }

  try {
    const meta = await unfurl(url);
    return new Response(JSON.stringify({
      title: meta.title,
      description: meta.description,
      image: meta.open_graph?.images?.[0]?.url,
      url,
    }));
  } catch {
    return new Response(JSON.stringify({ url }), { status: 200 });
  }
}
```

### Anti-Patterns to Avoid
- **Storing private keys in localStorage:** Readable by any same-origin JavaScript. Use IndexedDB. Private key bytes are stored as raw Uint8Array — Nostr uses secp256k1 which is not in WebCrypto's supported key types, so non-extractable CryptoKey is not possible; IndexedDB isolation is still better than localStorage.
- **Using NIP-04 (deprecated) for DMs:** NIP-04 leaks message metadata (who you're talking to). Use NIP-17 (gift-wrap) always.
- **Connecting to too many relays:** NDK's outbox model handles relay selection intelligently. Don't hardcode 20+ relays — 4–5 well-chosen public relays is the right default.
- **Storing ephemeral session messages locally:** Phase 10's hard requirement is zero persistence for listening parties. Never write ephemeral event content to taste.db or any local store.
- **Polling for new messages:** Nostr uses WebSocket subscriptions — always use `ndk.subscribe()` for real-time delivery. Never poll.
- **Rendering Nostr pubkeys raw in UI:** Always display Mercury handles (from Phase 9 identity) not npub strings. Map pubkey → Mercury handle on render.
- **Blocking room creation UI without context:** When user hits the AI gate, don't just show an error — show `AiGatePrompt.svelte` which explains why AI is needed and links directly to Settings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relay pool management | Custom WebSocket reconnect logic | NDK's built-in relay pool (`enableReconnect: true`) | NDK handles exponential backoff, subscription replay after reconnect, deduplication |
| NIP-17 gift-wrap encryption | Manual NIP-59 seal/wrap implementation | NDK's `NDKDMConversation` | Gift-wrap requires ephemeral keypair per message, double-layer encryption — 50+ line spec, trivially wrong |
| Key generation | Custom secp256k1 key generation | `nostr-tools` `generateSecretKey()` + `getPublicKey()` | Uses `@noble/curves` which is audited; never roll your own crypto |
| Focus trap in overlay | Custom Tab/Shift-Tab interceptor | Native `<dialog>` element | Built into browsers since 2022, fully accessible, zero JS |
| Link preview scraping | Fetching OG tags client-side | Server-side `/api/unfurl` + `unfurl.js` | Client-side OG fetch fails on CORS; server-side avoids it |
| Message content moderation | Custom classifier | OpenAI `/v1/moderations` endpoint (free, user's API key) or Llama Guard (open-source, user's local model) | Moderation is a solved problem; OpenAI's omni-moderation is free per their docs; Llama Guard 4 handles local |
| Content safety word filter for room names | Hand-curated word list | A simple prompt to the user's configured AI model at room creation | User already has an AI model configured (gate requirement); one `/moderations` call per room creation costs nothing |

**Key insight:** Nostr's protocol complexity (NIP-17, NIP-28, relay management, key signing) is the entire reason NDK exists. Use it. The protocol's signing and encryption primitives must be cryptographically correct — this is not the place to save dependencies.

---

## Common Pitfalls

### Pitfall 1: NIP-04 vs NIP-17 Confusion
**What goes wrong:** Developer uses the simpler/older `nip04.encrypt()` from nostr-tools for DMs because it's easier to find in docs. NIP-04 is deprecated — it leaks conversation graph (who you talk to) even with encrypted content.
**Why it happens:** NIP-04 is still in many tutorials; NIP-17 requires understanding gift-wrap (NIP-59).
**How to avoid:** NDK's `NDKDMConversation` uses NIP-17 by default. Never use `nip04` directly.
**Warning signs:** If you see `kind: 4` events for DMs in your Nostr debugger, you're using the wrong NIP.

### Pitfall 2: Ephemeral Event Persistence
**What goes wrong:** Session messages are stored in browser memory during the session and then written to taste.db on session end "just in case." This violates the hard requirement of zero persistence.
**Why it happens:** Natural developer instinct to not lose data.
**How to avoid:** `sessions.svelte.ts` must never call any Tauri invoke that writes to taste.db. Ephemeral session state lives only in Svelte `$state` for the overlay's lifetime.
**Warning signs:** Any Tauri `invoke()` call from `sessions.svelte.ts`.

### Pitfall 3: Keypair Regeneration on Every Load
**What goes wrong:** `loadOrCreateKeypair()` isn't checking IndexedDB properly and generates a new keypair each session. The user appears as a different Nostr identity every day.
**Why it happens:** IndexedDB async operations inside effects vs onMount race conditions.
**How to avoid:** Call `initNostr()` in the root layout's `onMount` once, awaited, before rendering the chat icon. Guard all comms operations on `ndkState.connected`.
**Warning signs:** DM subscription returns no history because pubkey changes.

### Pitfall 4: Relay Spam / Unreliable Free Relays
**What goes wrong:** App connects to a single free relay that goes down or becomes spam-heavy. All messaging stops working.
**Why it happens:** Free public relays are community-operated and not guaranteed uptime.
**How to avoid:** Connect to 4–5 relays (see MERCURY_RELAYS constant above). NDK's outbox model handles relay selection per-user based on NIP-65 relay metadata. Ship with fallback list.
**Warning signs:** `ndk.pool.connectedRelays()` returns empty array.

### Pitfall 5: Chat Overlay Blocking the Main UI
**What goes wrong:** The `<dialog>` element's native backdrop prevents all interaction with the page behind it while chat is open. Users can't browse while chatting.
**Why it happens:** `showModal()` creates an inert backdrop. Using `show()` instead of `showModal()` removes the backdrop but also removes focus trap and Escape key.
**How to avoid:** Use a non-modal `<dialog>` (call `.show()` not `.showModal()`) with a custom semi-transparent backdrop that doesn't intercept pointer events on the main content. Or position the chat as a fixed sidebar panel (right-side drawer) using CSS only — no dialog backdrop needed. The drawer pattern (fixed right, ~360px wide, overlaps but doesn't block) is the correct UX for this use case.
**Warning signs:** User reports they can't click artists while chat is open.

### Pitfall 6: AI Gate UX — Silent Failure
**What goes wrong:** User clicks "Create Room" and gets a cryptic error because they haven't configured an AI model. They don't know what to do.
**Why it happens:** Gate enforcement without friendly UX.
**How to avoid:** Before even showing the room creation form, check `aiState.enabled` (from Phase 9 `ai.svelte.ts`). If not enabled, render `AiGatePrompt.svelte` — a friendly explainer: "Every room needs an AI moderator to prevent harmful content. Here's how to set one up." Link to Settings.
**Warning signs:** User feedback says "I can't create rooms, I get an error."

### Pitfall 7: Room Discovery Query Performance
**What goes wrong:** Room directory page queries all kind:40 events from Nostr relays and returns thousands of rooms globally, not Mercury-scoped rooms.
**Why it happens:** NIP-28 channels are globally visible across all Nostr — Mercury rooms are a subset.
**How to avoid:** Mercury rooms MUST include a specific tag at creation: `['t', 'mercury']`. Room directory queries filter `#t: ['mercury']` to return only Mercury-created rooms. Additionally filter by the room's genre tags.
**Warning signs:** Room directory shows rooms from Nostr Twitter clients.

### Pitfall 8: Link Unfurl on Every Keypress
**What goes wrong:** `MessageInput.svelte` fires the `/api/unfurl` endpoint on every keystroke as the user types a URL, causing excessive server load.
**Why it happens:** Reactive URL detection without debounce.
**How to avoid:** Detect complete URLs only (use URL parse validation), debounce 800ms after typing stops before triggering unfurl. Cache unfurl results by URL in session memory.
**Warning signs:** Network tab shows hundreds of `/api/unfurl` calls per message composition.

---

## Code Examples

Verified patterns from official sources and NDK README:

### NDK Subscription with Svelte 5 Reactive Store
```typescript
// Source: @nostr-dev-kit/ndk-svelte README

import { derived } from 'svelte/store';
import NDKSvelte from '@nostr-dev-kit/ndk-svelte';

// In component or .svelte.ts module:
// ndk is the NDK instance from ndkState.ndk

const roomMessages = ndk.storeSubscribe(
  { kinds: [42], '#e': [channelId] },
  { closeOnEose: false }
);

// roomMessages is a Svelte store — use $roomMessages in template
// Items arrive in created_at order (newest last)
```

### NIP-28 Channel Creation (nostr-tools low-level)
```typescript
// Source: nostr-tools nip28.ts module

import { nip28 } from 'nostr-tools';

const channelCreationEvent = nip28.createChannel({
  name: 'Dark Ambient Explorers',
  about: 'For fans of Lustmord, Biosphere, and the void between stars',
  picture: '',
});
// Returns a partial event — you still need to sign and publish via NDK
```

### NIP-40 Expiration Tag Pattern
```typescript
// Source: nips.nostr.com/40

// Add to any event to signal relay/client that it should be dropped after TTL
const expirationTime = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
event.tags.push(['expiration', String(expirationTime)]);
```

### Detecting Mercury URLs in Message Content
```typescript
// src/lib/comms/unfurl.ts — client-side URL detection

const MERCURY_URL_PATTERN = /https?:\/\/[^\s]+\/(artist|release|kb)\/[^\s]+/g;

export function extractMercuryUrls(content: string): string[] {
  return [...content.matchAll(MERCURY_URL_PATTERN)].map(m => m[0]);
}

export async function fetchUnfurlData(url: string): Promise<UnfurlCard | null> {
  try {
    const res = await fetch('/api/unfurl', {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
```

### AI Moderation Check (Room Name Safety Filter)
```typescript
// src/lib/comms/moderation.ts
// Uses the user's configured AI provider — same OpenAI-compatible interface as taste.ts

import { getAiProvider } from '$lib/ai/provider.js'; // existing Phase 9 AI system

export async function checkRoomNameSafety(name: string): Promise<boolean> {
  const provider = await getAiProvider();
  if (!provider) return true; // no AI = no gate = shouldn't happen (gate prevents this)

  // Use /v1/moderations endpoint — free for OpenAI, prompt-based for others
  const response = await fetch(`${provider.baseUrl}/moderations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: name }),
  });

  if (!response.ok) return true; // fail open on API error (room name check is best-effort)
  const result = await response.json();
  return !result.results?.[0]?.flagged; // true = safe, false = flagged
}
```

### Auto-Archive Logic (Rooms — Timestamp-Based)
```typescript
// Auto-archive: rooms with no kind:42 messages in N days
// This runs client-side — the archive state is a Mercury convention tag

// When creating a room: record creation time in kind:40 content
// When subscribing: check most recent kind:42 message timestamp
// If (now - lastMessageTimestamp) > ARCHIVE_THRESHOLD_MS: mark room as archived in local state
// Archived rooms don't appear in active directory, but remain searchable

const ARCHIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (Claude's discretion default)

export function isRoomArchived(lastMessageAt: number | null, createdAt: number): boolean {
  const reference = lastMessageAt ?? createdAt;
  return (Date.now() - reference * 1000) > ARCHIVE_THRESHOLD_MS;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NIP-04 direct encrypted DMs | NIP-17 gift-wrap DMs (NIP-44 + NIP-59) | 2023–2024 | Hides conversation graph; recommended default |
| nostr-tools directly | NDK (high-level toolkit) | 2023+ | Relay pool, subscription management, outbox model are complex to build correctly |
| Simple store wrapper (ndk-svelte v1) | Svelte 5 runes-first (ndk-svelte 2.4.x) | 2024–2025 | Native rune reactivity, no writable stores needed |
| NIP-28 client-moderation only | NIP-29 relay-enforced groups | 2024 | NIP-29 requires special relay infrastructure — NIP-28 is correct choice for zero-cost |

**Deprecated/outdated:**
- **NIP-04 DMs**: Officially deprecated — still widely supported but leaks metadata. Never use for new implementations.
- **`svelte-nostr` package (0.0.1)**: Unmaintained 2023 project. Use `@nostr-dev-kit/ndk-svelte` instead.
- **Ephemeral kind range NIP-16**: NIP-16 (which defined ephemeral events) was merged into NIP-01. The ephemeral kind range (20000–29999) is now defined in the base protocol spec.

---

## Protocol Decision: Why Nostr (Not Matrix, Not P2P)

This section documents the protocol recommendation for Claude's Discretion.

| Criterion | Nostr | Matrix | WebRTC P2P |
|-----------|-------|--------|------------|
| Zero server cost | YES — uses community relays | NO — requires homeserver | PARTIAL — needs STUN/TURN |
| Ecosystem maturity | HIGH — 2+ years, production clients | HIGH — 10+ years | MEDIUM |
| JS/SvelteKit library | NDK 3.0 (Svelte 5 support) | matrix-js-sdk (no Svelte bindings) | PeerJS, simple-peer |
| Encrypted DMs | YES — NIP-17 (E2E) | YES — Signal protocol | YES — WebRTC DTLS |
| Persistent group rooms | YES — NIP-28 (relay-stored) | YES | NO — no persistence |
| Ephemeral events | YES — built into protocol | NO — all events stored | YES — real-time only |
| Offline message delivery | YES — via relay storage | YES | NO |
| Identity model | Keypair — maps to Mercury profile | Matrix ID (requires server) | No identity layer |
| Content moderation | Client-side (NIP-28) | Server-side | Client-side |
| Open source relays | Many free public relays | Must run or pay for homeserver | N/A |

**Recommendation: Nostr.** It is the only protocol that satisfies all three communication layers (DMs, scene rooms, ephemeral sessions) with zero server cost. NDK 3.0 provides first-class Svelte 5 support. The protocol maps cleanly to Mercury's pseudonymous keypair identity from Phase 9.

---

## Integration with Existing Phase 9 System

Mercury's Phase 9 built:
- `src/lib/taste/profile.svelte.ts` — tasteProfile global reactive state (tags, favorites, anchors)
- `src/lib/taste/collections.svelte.ts` — collection/shelf state
- `src-tauri/src/taste_db.rs` — taste.db Tauri commands
- `src/lib/ai/` — AI provider state (`aiState.enabled`, `aiState.provider`, etc.)

Phase 10 integration points:
1. **Identity:** Mercury generates a Nostr keypair on first comms init. The user's Mercury handle (from profile) becomes their Nostr display name. Avatar (from DiceBear, Phase 9) is published as kind:0 Nostr metadata.
2. **AI gate:** Check `aiState.enabled` before showing room creation. `aiState` already holds the provider config — room creation reuses this for moderation.
3. **Taste translation for DMs:** When two users connect, pull both taste profiles (local user from `tasteProfile`, remote user's shared profile from their Nostr kind:0 or a Mercury-specific kind), feed to AI for "why your tastes connect" explanation.
4. **No new Tauri commands needed for ephemeral sessions** — session data never touches taste.db.
5. **Comms state is web-capable** — unlike Library/Player/Settings which are Tauri-only, DMs and room browsing should work on web too (using browser WebSocket natively). Listening parties are Tauri-only (require local player).

---

## Open Questions

1. **Nostr relay discovery for Mercury users**
   - What we know: Mercury ships with a hardcoded relay list (nos.lol, relay.damus.io, nostr.mom, relay.nostr.band)
   - What's unclear: Should Mercury run its own relay eventually? Right now, Mercury rooms appear in global Nostr — is `['t', 'mercury']` tagging sufficient to scope them?
   - Recommendation: Ship with the `['t', 'mercury']` convention and hardcoded relays. Revisit if relay spam becomes a problem. Mercury does not need its own relay to launch Phase 10.

2. **DM user discovery: finding other Mercury users' pubkeys**
   - What we know: Nostr pubkeys are public. Mercury profiles (Phase 9) don't currently publish to Nostr.
   - What's unclear: How does User A find User B's Nostr pubkey to initiate a DM? Does Mercury need a pubkey registry (kind:0 events with Mercury-specific tags)?
   - Recommendation: Publish a Mercury kind:0 event on first comms init containing the user's handle and avatar. Users discoverable via Nostr NIP-05 DNS verification (optional, for power users) or direct npub share. The "Find users" UX can be simple for Phase 10: paste npub or share a Mercury profile link that contains the npub.

3. **AI moderation bot — local vs API for message screening**
   - What we know: OpenAI's `/v1/moderations` is free. Local Llama Guard 4 is 12B parameters (too large for a typical user's setup given Mercury already uses 3B generation model + 137MB embedding model).
   - What's unclear: Can users with local-model config do real-time moderation without API? Real-time screening of every message against a 12B model may be too slow.
   - Recommendation: For API-key users, call `/v1/moderations` per message (free, fast). For local model users, fall back to keyword-list screening for real-time (configurable word list) + optional AI review of flagged messages in queue. Don't block message display on moderation — screen async, act on flags.

4. **Slow mode timer options**
   - What we know: User decided slow mode is a room owner tool (Claude's discretion for timer values)
   - Recommendation: 30s, 2min, 5min, 15min — four options. These are standard Discord-equivalent values familiar to users.

5. **Auto-archive threshold**
   - What we know: Claude's discretion
   - Recommendation: 30 days of inactivity. Matches reasonable community expectation; shorter than GitHub's 90-day stale issue convention but matches the pace of niche music communities.

---

## Sources

### Primary (HIGH confidence)
- `@nostr-dev-kit/ndk` npm registry — version 3.0.0 confirmed via `npm show`
- `@nostr-dev-kit/ndk-svelte` npm registry — version 2.4.48 confirmed via `npm show`
- `nostr-tools` npm registry — version 2.23.1 confirmed via `npm show`
- NDK GitHub README (github.com/nostr-dev-kit/ndk) — NIP support list, Svelte 5 integration, NDKDMConversation, NDKPrivateKeySigner
- NIP-17 official spec (nips.nostr.com/17) — gift-wrap DM implementation
- NIP-28 official spec (e2encrypted.com/nostr/nips/28) — public channel kinds 40-44
- NIP-40 official spec (nips.nostr.com/40) — expiration timestamp
- NIP-01 (ephemeral kinds 20000–29999) — baked into base protocol
- W3C / OWASP browser storage guidance — IndexedDB vs localStorage for cryptographic keys
- nostrbook.dev/groups — NIP-28 vs NIP-29 comparison (NIP-28 for zero-cost, NIP-29 requires special relay)
- OpenAI moderation API docs (developers.openai.com) — free `/v1/moderations` endpoint

### Secondary (MEDIUM confidence)
- WebSearch: NDK Svelte 5 runes support confirmed by NDK GitHub + npm page (published 11 hours ago at research time)
- WebSearch: Cloudflare Pages WebSocket support confirmed in official CF docs (websockets on free tier)
- WebSearch: NIP-17 being used as default DM type in production Nostr apps (multiple sources agree)
- WebSearch: Llama Guard 4 (12B) as leading open-source content moderation model — from Meta and IBM sources

### Tertiary (LOW confidence)
- WebSearch only: Recommended relay list (nos.lol, relay.damus.io, nostr.mom) — community consensus but relay uptime not guaranteed; validate at build time
- WebSearch only: NDK's `NDKDMConversation` API — name and existence confirmed from GitHub but exact method signatures not verified via Context7 (no Context7 entry for NDK)

---

## Metadata

**Confidence breakdown:**
- Protocol decision (Nostr): HIGH — verified against all constraints, no credible alternative at zero server cost
- Standard stack (NDK versions): HIGH — verified via npm registry
- NIP specifications: HIGH — read from official nostr-protocol/nips repository sources
- NDK API surface (NDKDMConversation etc.): MEDIUM — confirmed from GitHub README, not from running code
- Relay reliability: LOW — free relays are community-operated; treat relay list as a suggestion not a guarantee

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (NDK is actively developed; re-check version before planning if more than 2 weeks pass)
