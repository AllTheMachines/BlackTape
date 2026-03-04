<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { loadTrail, trailState, jumpToTrailIndex } from '$lib/rabbit-hole/trail.svelte';

	let { children } = $props();

	onMount(() => {
		loadTrail();
	});

	function handleExit() {
		goto('/discover');
	}

	function handleTrailClick(index: number) {
		const item = trailState.items[index];
		if (!item) return;
		jumpToTrailIndex(index);
		const route = item.type === 'artist'
			? `/rabbit-hole/artist/${item.slug}`
			: `/rabbit-hole/tag/${item.slug}`;
		goto(route, { keepFocus: true, noScroll: true });
	}
</script>

<div class="rabbit-hole-shell">
	<div class="rh-topbar">
		<button class="rh-exit" onclick={handleExit} aria-label="Exit Rabbit Hole">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6" />
			</svg>
			Exit
		</button>
		<span class="rh-title">Rabbit Hole</span>
	</div>

	{#if trailState.items.length > 0}
		<div class="rh-trail" role="navigation" aria-label="Exploration trail">
			{#each trailState.items as item, i}
				<button
					class="rh-trail-item"
					class:active={i === trailState.currentIndex}
					onclick={() => handleTrailClick(i)}
					title={item.name}
				>
					{#if item.type === 'tag'}
						<span class="rh-trail-icon">◈</span>
					{/if}
					{item.name}
				</button>
				{#if i < trailState.items.length - 1}
					<span class="rh-trail-sep" aria-hidden="true">›</span>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="rh-content">
		{@render children()}
	</div>
</div>

<style>
	.rabbit-hole-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-1);
		color: var(--t-1);
		overflow: hidden;
	}

	.rh-topbar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: 0 var(--space-lg);
		height: 44px;
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	.rh-exit {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		font-size: 0.8125rem;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.rh-exit:hover {
		color: var(--t-1);
		background: var(--bg-3);
	}

	.rh-title {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--t-3);
		margin-right: auto;
	}

	.rh-trail {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px var(--space-lg);
		overflow-x: auto;
		scrollbar-width: none;
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	.rh-trail::-webkit-scrollbar {
		display: none;
	}

	.rh-trail-item {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: 1px solid transparent;
		color: var(--t-3);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 999px;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
		flex-shrink: 0;
	}

	.rh-trail-item:hover {
		color: var(--t-1);
		border-color: var(--b-2);
	}

	.rh-trail-item.active {
		color: var(--t-1);
		border-color: var(--acc);
		background: color-mix(in srgb, var(--acc) 12%, transparent);
	}

	.rh-trail-sep {
		color: var(--t-4);
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.rh-trail-icon {
		font-size: 0.7rem;
		opacity: 0.7;
	}

	.rh-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}
</style>
