<script lang="ts">
	import { dmState, markConversationRead } from '$lib/comms/dms.svelte.js';
	import type { DmConversation } from '$lib/comms/dms.svelte.js';
	import { chatState } from '$lib/comms/notifications.svelte.js';

	let newPubkeyInput = $state('');
	let pubkeyError = $state('');

	function openConversation(peerPubkey: string) {
		markConversationRead(peerPubkey);
		chatState.activeConversationPubkey = peerPubkey;
		chatState.view = 'dm-thread';
	}

	function truncatePubkey(hex: string): string {
		return hex.slice(0, 8) + '...' + hex.slice(-4);
	}

	function getLastMessage(conv: DmConversation): string {
		const msgs = conv.messages;
		if (!msgs || msgs.length === 0) return '';
		const last = msgs[msgs.length - 1];
		if (!last?.content) return '';
		return last.content.length > 50 ? last.content.slice(0, 50) + '…' : last.content;
	}

	async function handleNewDm() {
		const val = newPubkeyInput.trim();
		let hex = '';
		if (val.startsWith('npub1')) {
			try {
				const { nip19 } = await import('nostr-tools');
				const decoded = nip19.decode(val);
				if (decoded.type !== 'npub') throw new Error('not npub');
				hex = decoded.data as string;
			} catch {
				pubkeyError = 'Invalid pubkey format';
				return;
			}
		} else if (/^[0-9a-f]{64}$/i.test(val)) {
			hex = val.toLowerCase();
		} else {
			pubkeyError = 'Invalid pubkey format';
			return;
		}
		pubkeyError = '';
		newPubkeyInput = '';
		chatState.activeConversationPubkey = hex;
		chatState.view = 'dm-thread';
	}
</script>

<div class="conversation-list">
	<div class="conversations">
		{#if dmState.conversations.length === 0}
			<p class="empty-state">No conversations yet. Start one below.</p>
		{:else}
			{#each dmState.conversations as conv (conv.peerPubkey)}
				<button
					class="conversation-row"
					class:active={chatState.activeConversationPubkey === conv.peerPubkey}
					onclick={() => openConversation(conv.peerPubkey)}
				>
					<span class="pubkey">{truncatePubkey(conv.peerPubkey)}</span>
					<span class="preview">{getLastMessage(conv)}</span>
					{#if conv.unreadCount > 0}
						<span class="unread-badge">{conv.unreadCount}</span>
					{/if}
				</button>
			{/each}
		{/if}
	</div>
	<div class="new-dm-input">
		<input
			type="text"
			placeholder="npub or hex pubkey..."
			bind:value={newPubkeyInput}
			onkeydown={(e) => { if (e.key === 'Enter') handleNewDm(); }}
		/>
		<button onclick={handleNewDm}>Start DM</button>
		{#if pubkeyError}
			<p class="error">{pubkeyError}</p>
		{/if}
	</div>
</div>

<style>
	.conversation-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.conversations {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 0.8rem;
		text-align: center;
		padding: 24px 16px;
		margin: 0;
	}

	.conversation-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		position: relative;
	}

	.conversation-row:hover {
		background: var(--bg-hover);
	}

	.conversation-row.active {
		background: var(--bg-elevated);
		border-color: var(--link-color);
	}

	.pubkey {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-primary);
		flex-shrink: 0;
		white-space: nowrap;
	}

	.preview {
		font-size: 0.75rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.unread-badge {
		flex-shrink: 0;
		background: var(--link-color);
		color: var(--bg-base);
		font-size: 0.65rem;
		font-weight: 700;
		border-radius: 0;
		padding: 1px 6px;
		min-width: 18px;
		text-align: center;
	}

	.new-dm-input {
		flex-shrink: 0;
		padding: 10px 12px;
		border-top: 1px solid var(--border-default);
		background: var(--bg-surface);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.new-dm-input input {
		width: 100%;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 0;
		color: var(--text-primary);
		font-size: 0.8rem;
		padding: 6px 10px;
		outline: none;
		box-sizing: border-box;
	}

	.new-dm-input input:focus {
		border-color: var(--link-color);
	}

	.new-dm-input input::placeholder {
		color: var(--text-muted);
	}

	.new-dm-input button {
		background: var(--link-color);
		color: var(--bg-base);
		border: none;
		border-radius: 0;
		padding: 6px 12px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.new-dm-input button:hover {
		opacity: 0.85;
	}

	.error {
		color: oklch(0.65 0.15 25);
		font-size: 0.75rem;
		margin: 0;
	}
</style>
