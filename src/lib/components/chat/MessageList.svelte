<script lang="ts">
	import { tick } from 'svelte';

	interface Message {
		id: string;
		senderPubkey: string;
		content: string;
		createdAt: number;
	}

	let { messages, ownPubkey = '' }: { messages: Message[]; ownPubkey?: string } = $props();
	let listEl: HTMLElement;

	function relativeTime(unix: number): string {
		const diff = Math.floor(Date.now() / 1000) - unix;
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function handleDisplay(pubkey: string): string {
		// Short identifier until profile resolution is added
		return pubkey.slice(0, 8) + '…';
	}

	$effect(() => {
		if (messages.length) {
			tick().then(() => {
				listEl?.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
			});
		}
	});
</script>

<div class="message-list" bind:this={listEl}>
	{#if messages.length === 0}
		<p class="empty">No messages yet.</p>
	{:else}
		{#each messages as msg (msg.id)}
			<div class="message" class:own={msg.senderPubkey === ownPubkey}>
				<span class="sender">{handleDisplay(msg.senderPubkey)}</span>
				<span class="content">{msg.content}</span>
				<span class="time">{relativeTime(msg.createdAt)}</span>
			</div>
		{/each}
	{/if}
</div>

<style>
	.message-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.message {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 8px;
		border-radius: 6px;
		background: var(--bg-elevated);
	}
	.message.own {
		background: color-mix(in oklch, var(--link-color) 20%, transparent);
		align-self: flex-end;
	}
	.sender {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-family: monospace;
	}
	.content {
		font-size: 0.875rem;
		color: var(--text-primary);
		word-break: break-word;
	}
	.time {
		font-size: 0.65rem;
		color: var(--text-muted);
	}
	.empty {
		color: var(--text-secondary);
		font-size: 0.875rem;
		text-align: center;
		margin-top: 40px;
	}
</style>
