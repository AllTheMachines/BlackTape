<script lang="ts">
	import { chatState, closeChat } from '$lib/comms/notifications.svelte.js';
	import ChatPanel from './ChatPanel.svelte';
	// Lazy imports for room/session views (loaded in Plan 06)
</script>

<aside
	class="chat-overlay"
	class:open={chatState.open}
	aria-label="Mercury Chat"
	aria-hidden={!chatState.open}
>
	<div class="chat-header">
		<span class="chat-title">
			{chatState.view === 'dms' || chatState.view === 'dm-thread' ? 'Messages' :
			 chatState.view === 'rooms' || chatState.view === 'room-view' ? 'Scene Rooms' :
			 'Listening Party'}
		</span>
		<button class="chat-close" onclick={closeChat} aria-label="Close chat">✕</button>
	</div>
	<div class="chat-body">
		<ChatPanel />
	</div>
</aside>

<style>
	.chat-overlay {
		position: fixed;
		top: 0;
		right: -380px; /* hidden off-screen */
		width: 360px;
		height: 100vh;
		background: var(--bg-surface);
		border-left: 1px solid var(--border-default);
		z-index: 300;
		display: flex;
		flex-direction: column;
		transition: right 0.25s ease;
		pointer-events: none; /* hidden state — no interaction */
	}
	.chat-overlay.open {
		right: 0;
		pointer-events: all;
	}
	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}
	.chat-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-primary);
	}
	.chat-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		font-size: 1rem;
		padding: 4px;
	}
	.chat-body {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
