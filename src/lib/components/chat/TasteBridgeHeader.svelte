<script lang="ts">
	import { getTasteBridge, tasteBridgeState } from '$lib/comms/ai-taste-bridge.js';
	import { onMount } from 'svelte';

	let { peerPubkey }: { peerPubkey: string } = $props();
	let collapsed = $state(false);

	onMount(() => {
		getTasteBridge(peerPubkey);
	});

	const bridge = $derived(tasteBridgeState.get(peerPubkey));
</script>

{#if bridge}
	<div class="taste-bridge" class:collapsed>
		{#if bridge.loading}
			<p class="bridge-loading">Finding your musical connection…</p>
		{:else if bridge.error}
			<!-- silent failure — don't show error in DM header -->
		{:else if bridge.bridgeExplanation}
			<button
				class="bridge-toggle"
				onclick={() => (collapsed = !collapsed)}
				aria-label="Toggle musical context"
			>
				<span class="bridge-label">Musical connection</span>
				<span class="bridge-chevron">{collapsed ? '▼' : '▲'}</span>
			</button>
			{#if !collapsed}
				<p class="bridge-text">{bridge.bridgeExplanation}</p>
				{#if bridge.conversationStarters.length > 0}
					<div class="starters">
						<span class="starters-label">Start with:</span>
						<ul>
							{#each bridge.conversationStarters as starter}
								<li>{starter}</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
{/if}

<style>
	.taste-bridge {
		border-bottom: 1px solid var(--border-default);
		background: var(--bg-elevated);
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex-shrink: 0;
	}
	.taste-bridge.collapsed {
		padding: 4px 12px;
	}
	.bridge-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: none;
		border: none;
		cursor: pointer;
		width: 100%;
		padding: 0;
	}
	.bridge-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--link-color);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.bridge-chevron {
		font-size: 0.6rem;
		color: var(--text-secondary);
	}
	.bridge-text {
		font-size: 0.8rem;
		color: var(--text-primary);
		line-height: 1.5;
		margin: 0;
		font-style: italic;
	}
	.bridge-loading {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
	}
	.starters {
		margin-top: 4px;
	}
	.starters-label {
		font-size: 0.65rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.starters ul {
		margin: 4px 0 0 0;
		padding-left: 16px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.starters li {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}
</style>
