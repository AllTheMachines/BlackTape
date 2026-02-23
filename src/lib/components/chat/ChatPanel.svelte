<script lang="ts">
	import { chatState } from '$lib/comms/notifications.svelte.js';
	import { ndkState } from '$lib/comms/nostr.svelte.js';
	import { dmState, sendDM } from '$lib/comms/dms.svelte.js';
	import { roomsState, sendRoomMessage } from '$lib/comms/rooms.svelte.js';
	import { sessionsState, sendPartyMessage } from '$lib/comms/sessions.svelte.js';
	import { slowModeState } from '$lib/comms/moderation.js';
	import MessageList from './MessageList.svelte';
	import MessageInput from './MessageInput.svelte';
	import TasteBridgeHeader from './TasteBridgeHeader.svelte';

	// Resolve the active message list and send handler based on current view
	const activeMessages = $derived(() => {
		if (chatState.view === 'dm-thread' && chatState.activeConversationPubkey) {
			const conv = dmState.conversations.find(
				(c) => c.peerPubkey === chatState.activeConversationPubkey
			);
			return conv?.messages ?? [];
		}
		if (chatState.view === 'room-view' && chatState.activeRoomId) {
			return roomsState.messages.get(chatState.activeRoomId) ?? [];
		}
		if (chatState.view === 'session-view') {
			const session = sessionsState.mySession ?? sessionsState.joinedSession;
			return session?.messages ?? [];
		}
		return [];
	});

	const slowMode = $derived(() => {
		if (chatState.view === 'room-view' && chatState.activeRoomId) {
			return slowModeState.get(chatState.activeRoomId) ?? 0;
		}
		return 0;
	});

	async function handleSend(content: string): Promise<void> {
		if (chatState.view === 'dm-thread' && chatState.activeConversationPubkey) {
			await sendDM(chatState.activeConversationPubkey, content);
		} else if (chatState.view === 'room-view' && chatState.activeRoomId) {
			await sendRoomMessage(chatState.activeRoomId, content);
		} else if (chatState.view === 'session-view') {
			const session = sessionsState.mySession ?? sessionsState.joinedSession;
			if (session) await sendPartyMessage(session.id, content);
		}
	}

	// Show message input only when in an active thread/room/session
	const showInput = $derived(
		chatState.view === 'dm-thread' ||
			chatState.view === 'room-view' ||
			chatState.view === 'session-view'
	);

	// Show taste bridge header only in DM thread view
	const showTasteBridge = $derived(
		chatState.view === 'dm-thread' && !!chatState.activeConversationPubkey
	);
</script>

<div class="chat-panel">
	{#if chatState.view === 'dm-thread'}
		<button class="back-btn" onclick={() => chatState.view = 'dms'}>← Conversations</button>
	{/if}
	{#if showInput || activeMessages().length > 0}
		<!-- AI taste bridge pinned header — DM threads only (ROADMAP criteria 6+7) -->
		{#if showTasteBridge && chatState.activeConversationPubkey}
			<TasteBridgeHeader peerPubkey={chatState.activeConversationPubkey} />
		{/if}
		<MessageList messages={activeMessages()} ownPubkey={ndkState.pubkey ?? ''} />
		{#if showInput}
			<MessageInput onSend={handleSend} slowModeSeconds={slowMode()} />
		{/if}
	{:else}
		<div class="chat-placeholder">
			<p>Select a conversation, room, or listening party.</p>
		</div>
	{/if}
</div>

<style>
	.chat-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.chat-placeholder {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.chat-placeholder p {
		color: var(--text-secondary);
		font-size: 0.875rem;
		text-align: center;
	}
	.back-btn {
		flex-shrink: 0;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-muted);
		font-size: 0.75rem;
		padding: 8px 16px;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: color 0.15s;
	}
	.back-btn:hover {
		color: var(--text-primary);
	}
</style>
