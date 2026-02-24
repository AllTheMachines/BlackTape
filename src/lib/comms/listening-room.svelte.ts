/**
 * Listening room state machine and Nostr I/O — Phase 20.
 *
 * ARCHITECTURAL CONSTRAINT: This module MUST NEVER call any Tauri invoke().
 * Room data is ephemeral — lives in Svelte $state only, garbage collected when
 * leaveRoom() is called. No persistence to taste.db or any local storage.
 *
 * Nostr event kinds used:
 *   kind:30311 (addressable, NIP-01 range 30000-39999) — room lifecycle open/close.
 *              Uses `d` tag: 'mercury-room-'+channelSlug for guaranteed tag filter support.
 *              Addressable range (not replaceable 10000-19999) chosen per RESEARCH.md Pitfall 3
 *              — relay tag filter reliability is guaranteed for addressable events.
 *   kind:20010 (ephemeral, 20000-29999) — host sets active YouTube URL; all participants load it
 *   kind:20011 (ephemeral) — jukebox suggestion (action: 'suggest' | 'retract' | 'reject')
 *   kind:20012 (ephemeral) — presence heartbeat; published on join + every 30s; expires at 90s TTL
 *
 * NDK ephemeral kind double-cast pattern (required — NDKKind enum excludes custom ranges):
 *   kinds: [20010, 20011, 20012] as unknown as NDKKind[]
 *
 * NIP references:
 *   NIP-01: Ephemeral (20000-29999), Replaceable (10000-19999), Addressable (30000-39999)
 *   NIP-40: Expiration tag ['expiration', unixTimestamp] — relays purge events past TTL
 */

import type { NDKEvent as NDKEventType, NDKKind } from '@nostr-dev-kit/ndk';
import { ndkState } from './nostr.svelte.js';
import { youtubeEmbedUrl } from '$lib/embeds/youtube.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface RoomParticipant {
	pubkey: string;
	displayName: string; // Nostr kind:0 display_name — fallback: pubkey.slice(0,8)+'...'
	avatarSeed: string; // pubkey used as DiceBear seed (deterministic avatar per user)
	lastSeen: number; // unix timestamp of last heartbeat received
}

export interface QueueItem {
	id: string; // suggestion event ID (used for retract/reject references)
	senderPubkey: string;
	youtubeUrl: string; // original URL (not embed URL) — for host approval routing
	submittedAt: number; // event.created_at — used for FIFO sort order
	state: 'pending' | 'retracted' | 'approved' | 'rejected';
}

// ─── Reactive State ───────────────────────────────────────────────────────────

/**
 * Reactive room state. All fields live in Svelte $state — no external storage.
 *
 * participants uses Record not Map: Svelte 5 $state tracks plain objects deeply
 * but Map mutation does not trigger reactivity.
 */
export const roomState = $state({
	isInRoom: false,
	isHost: false,
	channelSlug: null as string | null,
	hostPubkey: null as string | null,
	activeVideoUrl: null as string | null, // embed URL (youtube-nocookie.com/embed/...) or null
	queue: [] as QueueItem[],
	participants: {} as Record<string, RoomParticipant>,
	myPendingSuggestionId: null as string | null, // tracks guest's one-pending-suggestion limit
	loading: false,
	error: null as string | null
});

// ─── Module-Level Timer/Subscription References ───────────────────────────────

let _roomSub: { stop: () => void } | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open a listening room as host.
 *
 * Publishes kind:30311 with status:'open', sets isHost=true, starts heartbeat
 * and presence cleanup timers, subscribes to room events.
 *
 * Throws if user is already in a room or NDK is not initialized.
 */
export async function openRoom(channelSlug: string): Promise<void> {
	if (roomState.isInRoom) throw new Error('Already in a room — call leaveRoom() first');

	const { ndk } = ndkState;
	if (!ndk || !ndkState.pubkey) throw new Error('NDK not initialized — call initNostr() first');

	roomState.loading = true;
	roomState.error = null;

	try {
		const { NDKEvent } = await import('@nostr-dev-kit/ndk');
		const event = new NDKEvent(ndk);
		event.kind = 30311 as unknown as NDKKind;
		event.content = JSON.stringify({
			status: 'open',
			hostPubkey: ndkState.pubkey,
			channelSlug,
			activeVideoUrl: ''
		});
		event.tags = [
			['d', 'mercury-room-' + channelSlug],
			['t', 'mercury'],
			['t', channelSlug],
			['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
		];
		await event.publish();

		roomState.isInRoom = true;
		roomState.isHost = true;
		roomState.channelSlug = channelSlug;
		roomState.hostPubkey = ndkState.pubkey;
		roomState.activeVideoUrl = null;
		roomState.queue = [];
		roomState.participants = {};
		roomState.myPendingSuggestionId = null;

		_subscribeToRoomEvents(channelSlug);
		startHeartbeat(channelSlug);
		startPresenceCleanup();
	} catch (err) {
		roomState.error = err instanceof Error ? err.message : 'Failed to open room';
		throw err;
	} finally {
		roomState.loading = false;
	}
}

/**
 * Join an existing room as guest.
 *
 * Sets roomState from known room parameters, subscribes to room events,
 * starts heartbeat and presence cleanup timers.
 *
 * @param channelSlug - The scene/channel slug this room is tied to
 * @param hostPubkey - The Nostr pubkey of the room host
 * @param currentVideoUrl - Optional embed URL currently active in the room
 */
export async function joinRoom(
	channelSlug: string,
	hostPubkey: string,
	currentVideoUrl?: string
): Promise<void> {
	if (roomState.isInRoom) throw new Error('Already in a room — call leaveRoom() first');

	const { ndk } = ndkState;
	if (!ndk) throw new Error('NDK not initialized — call initNostr() first');

	roomState.loading = true;
	roomState.error = null;

	try {
		roomState.isInRoom = true;
		roomState.isHost = false;
		roomState.channelSlug = channelSlug;
		roomState.hostPubkey = hostPubkey;
		roomState.activeVideoUrl = currentVideoUrl ?? null;
		roomState.queue = [];
		roomState.participants = {};
		roomState.myPendingSuggestionId = null;

		_subscribeToRoomEvents(channelSlug);
		startHeartbeat(channelSlug);
		startPresenceCleanup();
	} catch (err) {
		roomState.error = err instanceof Error ? err.message : 'Failed to join room';
		throw err;
	} finally {
		roomState.loading = false;
	}
}

/**
 * Leave the current room.
 *
 * If host: publishes kind:30311 with status:'closed' to signal all guests.
 * Stops all timers and subscriptions. Resets roomState to defaults.
 */
export async function leaveRoom(): Promise<void> {
	if (!roomState.isInRoom) return;

	const { ndk } = ndkState;
	const channelSlug = roomState.channelSlug;

	// Host closes the room by publishing a 'closed' status event
	if (roomState.isHost && ndk && channelSlug) {
		try {
			const { NDKEvent } = await import('@nostr-dev-kit/ndk');
			const event = new NDKEvent(ndk);
			event.kind = 30311 as unknown as NDKKind;
			event.content = JSON.stringify({
				status: 'closed',
				hostPubkey: ndkState.pubkey,
				channelSlug
			});
			event.tags = [
				['d', 'mercury-room-' + channelSlug],
				['t', 'mercury'],
				['t', channelSlug],
				['expiration', String(Math.floor(Date.now() / 1000) + 60)]
			];
			await event.publish();
		} catch {
			// Fire-and-forget — don't block cleanup on publish failure
		}
	}

	_cleanup();
}

/**
 * Host only: Set the active YouTube video for all room participants.
 *
 * Validates URL with youtubeEmbedUrl(), publishes kind:20010 ephemeral event.
 * Optimistic update: roomState.activeVideoUrl is set immediately before network round-trip.
 *
 * @throws If not host, URL is invalid, or NDK is not ready
 */
export async function setActiveVideo(youtubeUrl: string): Promise<void> {
	if (!roomState.isHost) throw new Error('Only the host can set the active video');

	const embedUrl = youtubeEmbedUrl(youtubeUrl);
	if (!embedUrl) throw new Error('Not a valid YouTube video URL');

	const { ndk } = ndkState;
	if (!ndk || !roomState.channelSlug) return;

	// Optimistic local update — all subscribers will receive the event too
	roomState.activeVideoUrl = embedUrl;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20010 as unknown as NDKKind;
	event.content = JSON.stringify({ youtubeUrl, embedUrl });
	event.tags = [
		['t', 'mercury'],
		['t', roomState.channelSlug],
		['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
	];
	await event.publish();
}

/**
 * Guest only: Submit a YouTube video suggestion to the jukebox queue.
 *
 * Enforces one-pending-suggestion limit per guest (client-side).
 * Publishes kind:20011 ephemeral suggestion event.
 *
 * @throws If not a guest, already has a pending suggestion, or URL is invalid
 */
export async function submitSuggestion(youtubeUrl: string): Promise<void> {
	if (!roomState.isInRoom || roomState.isHost)
		throw new Error('Only guests can submit suggestions');
	if (roomState.myPendingSuggestionId !== null)
		throw new Error('You already have a pending suggestion — retract it first');

	const embedUrl = youtubeEmbedUrl(youtubeUrl);
	if (!embedUrl) throw new Error('Not a valid YouTube video URL');

	const { ndk } = ndkState;
	if (!ndk || !roomState.channelSlug) return;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20011 as unknown as NDKKind;
	event.content = JSON.stringify({ youtubeUrl, action: 'suggest' });
	event.tags = [
		['t', 'mercury'],
		['t', roomState.channelSlug],
		['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
	];
	await event.publish();

	roomState.myPendingSuggestionId = event.id ?? `local-${Date.now()}`;
}

/**
 * Guest only: Retract a pending suggestion from the queue.
 *
 * Publishes kind:20011 with action:'retract' referencing the original suggestion.
 * Clears myPendingSuggestionId to allow submitting a new suggestion.
 */
export async function retractSuggestion(): Promise<void> {
	if (!roomState.isInRoom || roomState.isHost) throw new Error('Only guests can retract suggestions');
	if (!roomState.myPendingSuggestionId) return; // Nothing to retract

	const suggestionEventId = roomState.myPendingSuggestionId;
	const { ndk } = ndkState;
	if (!ndk || !roomState.channelSlug) return;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20011 as unknown as NDKKind;
	event.content = JSON.stringify({ action: 'retract', eventId: suggestionEventId });
	event.tags = [
		['e', suggestionEventId],
		['t', 'mercury'],
		['t', roomState.channelSlug],
		['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
	];
	await event.publish();

	// Clear local pending ID immediately (optimistic — subscriber will also process it)
	roomState.myPendingSuggestionId = null;
}

/**
 * Host only: Approve a queue suggestion, making it the active video for all participants.
 *
 * Approval is implicit: calling setActiveVideo() publishes kind:20010, which all
 * subscribers receive as the new active video. The queue item is marked 'approved' locally.
 */
export async function approveQueueItem(item: QueueItem): Promise<void> {
	if (!roomState.isHost) throw new Error('Only the host can approve queue items');

	// setActiveVideo publishes kind:20010 — all clients will load the new video
	await setActiveVideo(item.youtubeUrl);

	// Mark item as approved locally (subscribers will see the kind:20010 and check queue too)
	const idx = roomState.queue.findIndex((q) => q.id === item.id);
	if (idx !== -1) {
		roomState.queue[idx] = { ...roomState.queue[idx], state: 'approved' };
	}
}

/**
 * Host only: Reject a suggestion from the queue.
 *
 * Publishes kind:20011 with action:'reject' + ['e', item.id] tag.
 * All subscribers mark that item state='rejected'.
 */
export async function rejectQueueItem(item: QueueItem): Promise<void> {
	if (!roomState.isHost) throw new Error('Only the host can reject queue items');

	const { ndk } = ndkState;
	if (!ndk || !roomState.channelSlug) return;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20011 as unknown as NDKKind;
	event.content = JSON.stringify({ action: 'reject', eventId: item.id });
	event.tags = [
		['e', item.id],
		['t', 'mercury'],
		['t', roomState.channelSlug],
		['expiration', String(Math.floor(Date.now() / 1000) + 3600)]
	];
	await event.publish();

	// Mark locally (optimistic, subscribers also process this)
	const idx = roomState.queue.findIndex((q) => q.id === item.id);
	if (idx !== -1) {
		roomState.queue[idx] = { ...roomState.queue[idx], state: 'rejected' };
	}
}

/**
 * Check if a listening room is currently active for a given channel.
 *
 * Used by scene pages to show "Room active — join" indicator.
 * Queries kind:30311 by '#d' tag (guaranteed to work on all relays for addressable events).
 *
 * @returns { active: true, hostPubkey, activeVideoUrl } if open, or { active: false } if not
 */
export async function checkActiveRoom(
	channelSlug: string
): Promise<{ active: boolean; hostPubkey?: string; activeVideoUrl?: string }> {
	const { ndk } = ndkState;
	if (!ndk) return { active: false };

	try {
		const events = await ndk.fetchEvents({
			kinds: [30311] as unknown as NDKKind[],
			'#d': ['mercury-room-' + channelSlug],
			since: Math.floor(Date.now() / 1000) - 3600,
			limit: 5
		});

		// Find events with status:'open', pick most recent by created_at
		const openEvents = [...events]
			.filter((e) => {
				try {
					return JSON.parse(e.content).status === 'open';
				} catch {
					return false;
				}
			})
			.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

		if (openEvents.length === 0) return { active: false };

		const latest = openEvents[0];
		const meta = JSON.parse(latest.content) as {
			hostPubkey?: string;
			activeVideoUrl?: string;
		};

		return {
			active: true,
			hostPubkey: meta.hostPubkey ?? latest.pubkey,
			activeVideoUrl: meta.activeVideoUrl || undefined
		};
	} catch {
		return { active: false };
	}
}

// ─── Internal: Subscription ───────────────────────────────────────────────────

/**
 * Subscribe to all room events for the given channel.
 *
 * Handles kind:20010 (video sync), kind:20011 (queue), kind:20012 (heartbeat).
 * Uses closeOnEose: false — stays open for real-time delivery.
 * Filters by '#t': ['mercury', channelSlug] so only this room's events arrive.
 */
function _subscribeToRoomEvents(channelSlug: string): void {
	const { ndk } = ndkState;
	if (!ndk) return;

	// NDKKind double-cast — enum doesn't include ephemeral 20000+ range
	const sub = ndk.subscribe(
		{
			kinds: [20010, 20011, 20012] as unknown as NDKKind[],
			'#t': ['mercury', channelSlug]
		},
		{ closeOnEose: false }
	);

	sub.on('event', (event: NDKEventType) => {
		if (event.kind === 20010) {
			_handleVideoSync(event);
		} else if (event.kind === 20011) {
			_handleQueueEvent(event);
		} else if (event.kind === 20012) {
			_handleHeartbeat(event);
		}
	});

	_roomSub = sub;
}

/** Handle kind:20010 — host set a new active video URL. */
function _handleVideoSync(event: NDKEventType): void {
	try {
		const meta = JSON.parse(event.content) as { youtubeUrl?: string; embedUrl?: string };
		if (!meta.embedUrl) return;

		roomState.activeVideoUrl = meta.embedUrl;

		// If any queue item matches this video URL, mark it approved
		for (let i = 0; i < roomState.queue.length; i++) {
			const item = roomState.queue[i];
			if (
				item.state === 'pending' &&
				meta.youtubeUrl &&
				item.youtubeUrl === meta.youtubeUrl
			) {
				roomState.queue[i] = { ...item, state: 'approved' };
			}
		}
	} catch {
		// Malformed event — ignore
	}
}

/** Handle kind:20011 — jukebox suggestion, retraction, or rejection. */
function _handleQueueEvent(event: NDKEventType): void {
	try {
		const meta = JSON.parse(event.content) as {
			action?: string;
			youtubeUrl?: string;
			eventId?: string;
		};

		if (meta.action === 'suggest' && meta.youtubeUrl) {
			// Deduplicate by event ID
			if (roomState.queue.find((q) => q.id === event.id)) return;

			const newItem: QueueItem = {
				id: event.id ?? `event-${Date.now()}`,
				senderPubkey: event.pubkey,
				youtubeUrl: meta.youtubeUrl,
				submittedAt: event.created_at ?? Math.floor(Date.now() / 1000),
				state: 'pending'
			};

			// Insert in FIFO order (sort by submittedAt ascending)
			roomState.queue = [...roomState.queue, newItem].sort(
				(a, b) => a.submittedAt - b.submittedAt
			);
		} else if (meta.action === 'retract') {
			// Find the referenced suggestion by ['e', id] tag
			const refTag = event.tags.find((t: string[]) => t[0] === 'e');
			const refId = refTag?.[1] ?? meta.eventId;
			if (refId) {
				const idx = roomState.queue.findIndex((q) => q.id === refId);
				if (idx !== -1) {
					roomState.queue[idx] = { ...roomState.queue[idx], state: 'retracted' };
				}
				// If this is our own retraction, clear the pending ID
				if (refId === roomState.myPendingSuggestionId) {
					roomState.myPendingSuggestionId = null;
				}
			}
		} else if (meta.action === 'reject') {
			// Find the referenced suggestion by ['e', id] tag
			const refTag = event.tags.find((t: string[]) => t[0] === 'e');
			const refId = refTag?.[1] ?? meta.eventId;
			if (refId) {
				const idx = roomState.queue.findIndex((q) => q.id === refId);
				if (idx !== -1) {
					roomState.queue[idx] = { ...roomState.queue[idx], state: 'rejected' };
				}
				// If host rejected our suggestion, clear pending ID so guest can suggest again
				if (refId === roomState.myPendingSuggestionId) {
					roomState.myPendingSuggestionId = null;
				}
			}
		}
	} catch {
		// Malformed event — ignore
	}
}

/** Handle kind:20012 — participant heartbeat. Upsert presence; attempt profile fetch. */
function _handleHeartbeat(event: NDKEventType): void {
	const pubkey = event.pubkey;
	const now = Math.floor(Date.now() / 1000);

	if (roomState.participants[pubkey]) {
		// Update lastSeen for existing participant
		roomState.participants[pubkey] = {
			...roomState.participants[pubkey],
			lastSeen: now
		};
	} else {
		// New participant — add with truncated pubkey fallback display name
		roomState.participants[pubkey] = {
			pubkey,
			displayName: pubkey.slice(0, 8) + '...',
			avatarSeed: pubkey,
			lastSeen: now
		};

		// Best-effort async profile fetch — swap display name when it arrives
		const { ndk } = ndkState;
		if (ndk) {
			const user = ndk.getUser({ pubkey });
			user
				.fetchProfile()
				.then((profile) => {
					if (!profile) return;
					const name = profile.displayName ?? profile.name ?? null;
					if (name && roomState.participants[pubkey]) {
						roomState.participants[pubkey] = {
							...roomState.participants[pubkey],
							displayName: name
						};
					}
				})
				.catch(() => {
					// Profile fetch failed — keep truncated pubkey fallback
				});
		}
	}
}

// ─── Internal: Heartbeat ──────────────────────────────────────────────────────

/**
 * Start the 30-second heartbeat timer.
 * Sends an immediate heartbeat on join, then every 30 seconds.
 */
function startHeartbeat(channelSlug: string): void {
	_sendHeartbeat(channelSlug);
	_heartbeatTimer = setInterval(() => _sendHeartbeat(channelSlug), 30_000);
}

/** Publish a kind:20012 ephemeral heartbeat event with 90-second TTL. */
async function _sendHeartbeat(channelSlug: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20012 as unknown as NDKKind;
	event.content = '';
	event.tags = [
		['t', 'mercury'],
		['t', channelSlug],
		['expiration', String(Math.floor(Date.now() / 1000) + 90)]
	];
	await event.publish();
}

// ─── Internal: Presence Cleanup ───────────────────────────────────────────────

/**
 * Start the 10-second presence cleanup timer.
 * Drops participants whose lastSeen is older than 75 seconds (2.5x heartbeat interval).
 * This tolerates one missed heartbeat before dropping a participant.
 */
function startPresenceCleanup(): void {
	_cleanupTimer = setInterval(() => {
		const cutoff = Math.floor(Date.now() / 1000) - 75;
		for (const pubkey of Object.keys(roomState.participants)) {
			if (roomState.participants[pubkey].lastSeen < cutoff) {
				delete roomState.participants[pubkey];
			}
		}
	}, 10_000);
}

// ─── Internal: Full Cleanup ───────────────────────────────────────────────────

/** Stop all timers and subscriptions, reset roomState to defaults. */
function _cleanup(): void {
	if (_heartbeatTimer) {
		clearInterval(_heartbeatTimer);
		_heartbeatTimer = null;
	}
	if (_cleanupTimer) {
		clearInterval(_cleanupTimer);
		_cleanupTimer = null;
	}
	if (_roomSub) {
		_roomSub.stop();
		_roomSub = null;
	}

	// Reset all state to defaults
	roomState.isInRoom = false;
	roomState.isHost = false;
	roomState.channelSlug = null;
	roomState.hostPubkey = null;
	roomState.activeVideoUrl = null;
	roomState.queue = [];
	roomState.participants = {};
	roomState.myPendingSuggestionId = null;
	roomState.loading = false;
	roomState.error = null;
}
