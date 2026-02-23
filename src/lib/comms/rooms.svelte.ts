/**
 * NIP-28 scene rooms — persistent group communication scoped to Mercury.
 *
 * Rooms are public Nostr channels (NIP-28) identified by the ['t', 'mercury']
 * scope tag. This prevents Mercury rooms from appearing in generic Nostr clients
 * and vice versa. Room creation is gated by an AI content safety filter.
 *
 * NIP-28 event kinds used:
 *   kind:40 — channel creation (room identity + metadata)
 *   kind:41 — channel metadata update
 *   kind:42 — channel message
 *   kind:43 — hide message (delete, client-enforced)
 *   kind:44 — mute user (kick, client-enforced)
 */

import { ndkState } from './nostr.svelte.js';
import { notifState } from './notifications.svelte.js';
import { checkRoomNameSafety, isRoomArchived, bannedUsers } from './moderation.js';

/** A Mercury scene room (backed by NIP-28 kind:40 channel). */
export interface SceneRoom {
	id: string; // event ID of kind:40
	name: string;
	description: string;
	tags: string[]; // Mercury tag slugs (genre taxonomy)
	ownerPubkey: string;
	createdAt: number; // unix timestamp
	lastMessageAt: number | null;
	memberCount: number; // approximate (unique senders in last 30 days)
	archived: boolean;
}

/** A single message in a scene room (kind:42). */
export interface RoomMessage {
	id: string;
	senderPubkey: string;
	content: string;
	createdAt: number;
	channelId: string;
}

export const roomsState = $state({
	rooms: [] as SceneRoom[],
	messages: new Map<string, RoomMessage[]>(), // channelId -> messages
	activeSubscriptions: new Set<string>(), // channelIds currently subscribed
	loading: false
});

/**
 * Create a Mercury scene room (NIP-28 kind:40).
 *
 * Requires at least one tag (validated by UI) and passes the room name
 * through an AI safety filter before publishing to Nostr.
 *
 * @returns The channel ID (kind:40 event ID)
 */
export async function createRoom(
	name: string,
	tags: string[], // at least one required (validated by UI)
	description: string
): Promise<string> {
	const { ndk } = ndkState;
	if (!ndk) throw new Error('NDK not initialized');

	// Safety filter — uses user's AI provider
	const safety = await checkRoomNameSafety(name);
	if (!safety.safe) throw new Error(safety.reason ?? 'Room name not allowed');

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 40;
	event.content = JSON.stringify({ name, about: description });

	// Mercury scope tag — CRITICAL: without this, room appears globally in all Nostr clients
	event.tags = [['t', 'mercury']];
	// Mercury genre taxonomy tags
	tags.forEach((tag) => event.tags.push(['t', tag]));

	await event.publish();
	const channelId = event.id!;

	// Add to local state immediately (optimistic update)
	roomsState.rooms = [
		{
			id: channelId,
			name,
			description,
			tags,
			ownerPubkey: ndkState.pubkey ?? '',
			createdAt: Math.floor(Date.now() / 1000),
			lastMessageAt: null,
			memberCount: 1,
			archived: false
		},
		...roomsState.rooms
	];

	return channelId;
}

/**
 * Load rooms from Nostr relays filtered to Mercury rooms, optionally by genre tag.
 *
 * Archived rooms (30+ days inactive) are excluded from results.
 * Active rooms are sorted by creation date, newest first.
 */
export async function loadRooms(filterTag?: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;
	roomsState.loading = true;

	const tagFilter = filterTag ? ['mercury', filterTag] : ['mercury'];

	const events = await ndk.fetchEvents({
		kinds: [40],
		'#t': tagFilter,
		limit: 100
	});
	const rooms: SceneRoom[] = [];

	for (const event of events) {
		let meta: { name?: string; about?: string } = {};
		try {
			meta = JSON.parse(event.content) as { name?: string; about?: string };
		} catch {
			continue;
		}
		if (!meta.name) continue;

		const roomTags = event.tags
			.filter((t) => t[0] === 't' && t[1] !== 'mercury')
			.map((t) => t[1]);

		const room: SceneRoom = {
			id: event.id,
			name: meta.name,
			description: meta.about ?? '',
			tags: roomTags,
			ownerPubkey: event.pubkey,
			createdAt: event.created_at ?? 0,
			lastMessageAt: null, // updated when messages load
			memberCount: 0,
			archived: false
		};
		room.archived = isRoomArchived(room.lastMessageAt, room.createdAt);
		if (!room.archived) rooms.push(room);
	}

	roomsState.rooms = rooms.sort((a, b) => b.createdAt - a.createdAt);
	roomsState.loading = false;
}

/**
 * Subscribe to real-time messages in a room (kind:42 channel messages).
 *
 * Banned users' messages are filtered client-side on receipt.
 * Returns a cleanup function — call on component destroy.
 *
 * Safe to call multiple times for the same channelId — returns no-op cleanup
 * if already subscribed.
 */
export async function subscribeToRoom(channelId: string): Promise<() => void> {
	const { ndk } = ndkState;
	if (!ndk) return () => {};
	if (roomsState.activeSubscriptions.has(channelId)) return () => {};

	roomsState.activeSubscriptions.add(channelId);

	const sub = ndk.subscribe({ kinds: [42], '#e': [channelId] }, { closeOnEose: false });

	sub.on('event', (event) => {
		const banned = bannedUsers.get(channelId);
		if (banned?.has(event.pubkey)) return; // client-side ban enforcement

		const msg: RoomMessage = {
			id: event.id,
			senderPubkey: event.pubkey,
			content: event.content,
			createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
			channelId
		};

		const current = roomsState.messages.get(channelId) ?? [];
		if (!current.find((m) => m.id === event.id)) {
			roomsState.messages.set(channelId, [...current, msg]);
			notifState.roomUnread += 1;
		}
	});

	return () => {
		sub.stop();
		roomsState.activeSubscriptions.delete(channelId);
	};
}

/**
 * Send a message to a room (kind:42).
 *
 * Publishes to Nostr and optimistically adds to local state.
 * The NIP-28 root event reference tag links the message to its channel.
 */
export async function sendRoomMessage(channelId: string, content: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;
	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 42;
	event.content = content;
	event.tags = [['e', channelId, '', 'root']]; // NIP-28 root event reference
	await event.publish();

	// Optimistic update
	const msg: RoomMessage = {
		id: `local-${Date.now()}`,
		senderPubkey: ndkState.pubkey ?? '',
		content,
		createdAt: Math.floor(Date.now() / 1000),
		channelId
	};
	const current = roomsState.messages.get(channelId) ?? [];
	roomsState.messages.set(channelId, [...current, msg]);
}
