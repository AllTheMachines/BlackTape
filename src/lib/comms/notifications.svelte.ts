/**
 * Chat overlay state — open/close visibility and unread badge counts.
 *
 * Deliberately does NOT import dms.svelte.ts or rooms.svelte.ts to avoid
 * circular dependencies. Those modules update notifState directly when
 * new messages arrive.
 */

/** Which view is currently shown inside the chat overlay. */
export type ChatView =
	| 'dms'
	| 'rooms'
	| 'sessions'
	| 'dm-thread'
	| 'room-view'
	| 'session-view';

/** Chat overlay visibility + navigation state. */
export const chatState = $state({
	open: false,
	view: 'dms' as ChatView,
	activeConversationPubkey: null as string | null, // for dm-thread view
	activeRoomId: null as string | null, // for room-view
	activeSessionId: null as string | null // for session-view
});

/** Open the chat overlay, optionally switching to a specific view. */
export function openChat(view: ChatView = 'dms'): void {
	chatState.open = true;
	chatState.view = view;
}

/** Close the chat overlay. */
export function closeChat(): void {
	chatState.open = false;
}

/**
 * Unread message counts.
 * Updated by dms.svelte.ts and rooms.svelte.ts — not this module.
 */
export const notifState = $state({
	dmUnread: 0,
	roomUnread: 0
});

/** Total unread count across DMs and rooms. */
export const totalUnread = $derived(notifState.dmUnread + notifState.roomUnread);
