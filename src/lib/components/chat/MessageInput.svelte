<script lang="ts">
	import { extractMercuryUrls, fetchUnfurlData, type UnfurlCard } from '$lib/comms/unfurl.js';
	import UnfurlCardComponent from './UnfurlCard.svelte';

	let {
		onSend, // (content: string) => Promise<void>
		slowModeSeconds = 0, // 0 = off
		disabled = false
	}: {
		onSend: (content: string) => Promise<void>;
		slowModeSeconds?: number;
		disabled?: boolean;
	} = $props();

	let content = $state('');
	let sending = $state(false);
	let unfurlCards = $state<UnfurlCard[]>([]);
	let unfurlTimer: ReturnType<typeof setTimeout> | null = null;
	let slowModeRemaining = $state(0);
	let slowModeInterval: ReturnType<typeof setInterval> | null = null;

	// 800ms debounced Mercury URL detection
	function onInput() {
		if (unfurlTimer) clearTimeout(unfurlTimer);
		unfurlTimer = setTimeout(async () => {
			const urls = extractMercuryUrls(content);
			const cards = await Promise.all(urls.slice(0, 3).map(fetchUnfurlData)); // max 3 previews
			unfurlCards = cards.filter(Boolean) as UnfurlCard[];
		}, 800);
	}

	async function handleSend() {
		const trimmed = content.trim();
		if (!trimmed || sending || slowModeRemaining > 0) return;

		sending = true;
		try {
			await onSend(trimmed);
			content = '';
			unfurlCards = [];
			if (slowModeSeconds > 0) {
				slowModeRemaining = slowModeSeconds;
				slowModeInterval = setInterval(() => {
					slowModeRemaining -= 1;
					if (slowModeRemaining <= 0) {
						clearInterval(slowModeInterval!);
						slowModeInterval = null;
					}
				}, 1000);
			}
		} catch (e) {
			console.error('Send failed:', e);
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="message-input-area">
	{#each unfurlCards as card (card.url)}
		<UnfurlCardComponent {card} />
	{/each}
	<div class="input-row">
		<textarea
			bind:value={content}
			oninput={onInput}
			onkeydown={handleKeydown}
			placeholder="Send a message…"
			rows="2"
			{disabled}
			class:sending
		></textarea>
		<button
			onclick={handleSend}
			disabled={disabled || sending || slowModeRemaining > 0 || !content.trim()}
			class="send-btn"
		>
			{#if slowModeRemaining > 0}
				{slowModeRemaining}s
			{:else if sending}
				…
			{:else}
				↑
			{/if}
		</button>
	</div>
</div>

<style>
	.message-input-area {
		padding: 8px;
		border-top: 1px solid var(--border-default);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.input-row {
		display: flex;
		gap: 6px;
		align-items: flex-end;
	}
	textarea {
		flex: 1;
		resize: none;
		background: var(--bg-base);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		border-radius: 6px;
		padding: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		min-height: 40px;
	}
	textarea:focus {
		outline: none;
		border-color: var(--link-color);
	}
	.send-btn {
		background: var(--link-color);
		color: var(--bg-base);
		border: none;
		border-radius: 6px;
		padding: 8px 12px;
		cursor: pointer;
		font-size: 1rem;
		min-width: 40px;
		align-self: flex-end;
	}
	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
