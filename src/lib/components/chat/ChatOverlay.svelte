<script lang="ts">
	import { chatState, closeChat } from '$lib/comms/notifications.svelte.js';
</script>

<aside
	class="chat-overlay"
	class:open={chatState.open}
	aria-label="BlackTape Chat"
	aria-hidden={!chatState.open}
>
	<div class="chat-header">
		<span class="chat-title">
			{chatState.view === 'dms' || chatState.view === 'dm-thread' ? 'Messages' :
			 chatState.view === 'rooms' || chatState.view === 'room-view' ? 'Scene Rooms' :
			 'Listening Party'}
		</span>
		<button class="chat-close" onclick={closeChat} aria-label="Close chat">&#x2715;</button>
	</div>

	<div class="chat-tabs">
		<button
			class:active={chatState.view === 'dms' || chatState.view === 'dm-thread'}
			onclick={() => chatState.view = 'dms'}
		>DMs</button>
		<button
			class:active={chatState.view === 'rooms' || chatState.view === 'room-view'}
			onclick={() => chatState.view = 'rooms'}
		>Rooms</button>
		<button
			class:active={chatState.view === 'sessions' || chatState.view === 'session-view'}
			onclick={() => chatState.view = 'sessions'}
		>Parties</button>
	</div>

	<div class="chat-body">
		{#if chatState.view === 'rooms' || chatState.view === 'room-view'}
			{#await import('./RoomDirectory.svelte') then { default: RoomDirectory }}
				<RoomDirectory />
			{/await}
		{:else if chatState.view === 'sessions' || chatState.view === 'session-view'}
			{#await import('./SessionCreator.svelte') then { default: SessionCreator }}
				<SessionCreator />
			{/await}
		{:else if chatState.view === 'dms'}
			{#await import('./ConversationList.svelte') then { default: ConversationList }}
				<ConversationList />
			{:catch}
				<p>Loading…</p>
			{/await}
		{:else}
			<!-- dm-thread: ChatPanel handles it -->
			{#await import('./ChatPanel.svelte') then { default: ChatPanel }}
				<ChatPanel />
			{:catch}
				<p>Loading…</p>
			{/await}
		{/if}
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
	.chat-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}
	.chat-tabs button {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 8px 4px;
		font-size: 0.8rem;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}
	.chat-tabs button:hover {
		color: var(--text-primary);
	}
	.chat-tabs button.active {
		color: var(--text-primary);
		border-bottom-color: var(--text-accent);
	}
	.chat-body {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
