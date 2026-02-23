/**
 * NIP-17 encrypted DM system.
 *
 * Implements private 1:1 messaging using NIP-17 gift-wrap (kind:14 inner event
 * → kind:13 seal → kind:1059 gift wrap). Never uses deprecated NIP-04 (kind:4)
 * which leaks the conversation graph.
 *
 * NDK 3.x ships `giftWrap` and `giftUnwrap` helpers that handle the full
 * encryption/decryption stack. We use those here instead of a nonexistent
 * NDKDMConversation class.
 */

import { ndkState } from './nostr.svelte.js';
import { notifState } from './notifications.svelte.js';

/** A single DM message in a conversation thread. */
export interface DmMessage {
	id: string;
	senderPubkey: string;
	content: string;
	createdAt: number; // unix timestamp
	read: boolean;
}

/** A conversation with one other user. */
export interface DmConversation {
	peerPubkey: string; // the other party's pubkey
	messages: DmMessage[];
	lastMessageAt: number;
	unreadCount: number;
}

export const dmState = $state({
	conversations: [] as DmConversation[],
	loading: false
});

/**
 * Send a DM using NIP-17 (gift-wrap) via NDK.
 * Uses giftWrap() from NDK 3.x — handles the full NIP-17/NIP-59 stack.
 */
export async function sendDM(recipientPubkey: string, content: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) throw new Error('NDK not initialized');

	const { NDKEvent, NDKUser, NDKKind, giftWrap } = await import('@nostr-dev-kit/ndk');

	// Build the kind:14 direct message rumor (inner event)
	const dmEvent = new NDKEvent(ndk);
	dmEvent.kind = NDKKind.PrivateDirectMessage; // 14
	dmEvent.content = content;
	dmEvent.tags = [['p', recipientPubkey]];

	// giftWrap() seals it (kind:13) and wraps it (kind:1059) for the recipient
	const recipient = new NDKUser({ pubkey: recipientPubkey });
	const wrapped = await giftWrap(dmEvent, recipient);
	await wrapped.publish();

	// Optimistically add to local state
	const existing = dmState.conversations.find((c) => c.peerPubkey === recipientPubkey);
	const msg: DmMessage = {
		id: `local-${Date.now()}`,
		senderPubkey: ndkState.pubkey ?? '',
		content,
		createdAt: Math.floor(Date.now() / 1000),
		read: true
	};
	if (existing) {
		existing.messages = [...existing.messages, msg];
		existing.lastMessageAt = msg.createdAt;
	} else {
		dmState.conversations = [
			...dmState.conversations,
			{
				peerPubkey: recipientPubkey,
				messages: [msg],
				lastMessageAt: msg.createdAt,
				unreadCount: 0
			}
		];
	}
}

/**
 * Subscribe to incoming DMs for the current user.
 * Call once in root layout after initNostr() — stays alive for the session.
 *
 * NIP-17: incoming gift-wrapped DMs are kind:1059 addressed to our pubkey.
 * giftUnwrap() decrypts the outer wrap and the seal to reveal the inner DM.
 */
export async function subscribeToIncomingDMs(): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk || !ndkState.pubkey) return;

	const { NDKKind, giftUnwrap } = await import('@nostr-dev-kit/ndk');

	const sub = ndk.subscribe(
		{ kinds: [NDKKind.GiftWrap], '#p': [ndkState.pubkey] },
		{ closeOnEose: false }
	);

	sub.on('event', async (event) => {
		let unwrapped: import('@nostr-dev-kit/ndk').NDKEvent;
		try {
			// giftUnwrap decrypts the kind:1059 → kind:13 → kind:14 chain
			unwrapped = await giftUnwrap(event, undefined, ndk.signer!);
		} catch {
			return; // not addressed to us or decryption failed
		}

		// The unwrapped event is the kind:14 inner DM rumor
		const senderPubkey = unwrapped.pubkey;
		if (!senderPubkey) return;

		const msg: DmMessage = {
			id: event.id,
			senderPubkey,
			content: unwrapped.content,
			createdAt: unwrapped.created_at ?? Math.floor(Date.now() / 1000),
			read: false
		};

		const existing = dmState.conversations.find((c) => c.peerPubkey === senderPubkey);
		if (existing) {
			// Avoid duplicates
			if (!existing.messages.find((m) => m.id === event.id)) {
				existing.messages = [...existing.messages, msg];
				existing.lastMessageAt = msg.createdAt;
				existing.unreadCount += 1;
			}
		} else {
			dmState.conversations = [
				...dmState.conversations,
				{
					peerPubkey: senderPubkey,
					messages: [msg],
					lastMessageAt: msg.createdAt,
					unreadCount: 1
				}
			];
		}

		// Update global notification badge
		notifState.dmUnread = dmState.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
	});
}

/** Mark all messages in a conversation as read and reset unread badge. */
export function markConversationRead(peerPubkey: string): void {
	const conv = dmState.conversations.find((c) => c.peerPubkey === peerPubkey);
	if (conv) {
		conv.messages = conv.messages.map((m) => ({ ...m, read: true }));
		conv.unreadCount = 0;
		notifState.dmUnread = dmState.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
	}
}
