<script lang="ts">
	import SceneCard from '$lib/components/SceneCard.svelte';
	import { isTauri } from '$lib/platform';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';
	import { upvoteFeatureRequest } from '$lib/comms/scenes.svelte.js';
	import { onMount } from 'svelte';
	import type { PartitionedScenes } from '$lib/scenes';

	let { data }: { data: PageData } = $props();

	// Detection state — driven by scenesState in Tauri, empty on web
	let isDetecting = $state(false);
	let partitioned = $state<PartitionedScenes>({ active: [], emerging: [] });

	// Feature request vote state
	const FEATURE_ID = 'collaborative-playlists';
	const VOTED_KEY = `feature_voted_${FEATURE_ID}`;
	let hasVoted = $state(false);
	let voteCount = $state(0);

	onMount(async () => {
		// Check prior vote from localStorage
		try {
			const stored = localStorage.getItem(VOTED_KEY);
			if (stored) {
				hasVoted = true;
				voteCount = parseInt(stored, 10);
			}
		} catch { /* ignore */ }

		if (!isTauri()) return;

		// Run detection and update local state when complete
		const { loadScenes, scenesState } = await import('$lib/scenes');
		isDetecting = true;
		await loadScenes();
		partitioned = scenesState.partitioned;
		isDetecting = false;
	});

	async function handleReload() {
		if (!isTauri() || isDetecting) return;
		const { loadScenes, scenesState } = await import('$lib/scenes');
		isDetecting = true;
		await loadScenes(true); // forceDetect = true
		partitioned = scenesState.partitioned;
		isDetecting = false;
	}

	async function handleVote() {
		if (hasVoted) return;
		const newCount = await upvoteFeatureRequest(FEATURE_ID);
		voteCount = newCount;
		hasVoted = true;
		try {
			localStorage.setItem(VOTED_KEY, String(newCount));
		} catch { /* ignore */ }
	}

	const hasActive = $derived(partitioned.active.length > 0);
	const hasEmerging = $derived(partitioned.emerging.length > 0);
	const isEmpty = $derived(!hasActive && !hasEmerging);
</script>

<svelte:head>
	<title>Scenes — {PROJECT_NAME}</title>
</svelte:head>

<div class="scenes-page">
	<div class="v2-notice">
		<span class="v2-badge">Coming in v2</span>
		Scenes are being redesigned for a better community experience. Check back in the next major release.
	</div>

	<div class="scenes-header">
		<h1 class="page-title">Scenes</h1>
		<p class="page-desc">Music micro-communities discovered from collective listening</p>
	</div>

	{#if isDetecting}
		<p class="detecting-indicator">Detecting scenes...</p>
	{/if}

	{#if isEmpty}
		<div class="empty-state">
			<p>No scenes detected yet. Add artists to your library and favorites to build your taste profile. Scenes emerge as your collection grows.</p>
		</div>
	{/if}

	{#if hasActive}
		<section class="scenes-section">
			<h2>Active Scenes</h2>
			<div class="scene-grid">
				{#each partitioned.active as scene}
					<SceneCard {scene} href="/scenes/{scene.slug}" />
				{/each}
			</div>
		</section>
	{/if}

	{#if hasEmerging}
		<section class="scenes-section">
			<h2>Emerging</h2>
			<p class="section-desc">New combinations appearing for the first time</p>
			<div class="scene-grid">
				{#each partitioned.emerging as scene}
					<SceneCard {scene} href="/scenes/{scene.slug}" />
				{/each}
			</div>
		</section>
	{/if}

	<!-- Reload button -->
	<div class="scenes-reload">
		<button class="reload-btn" onclick={handleReload} disabled={isDetecting}>
			{isDetecting ? 'Detecting…' : 'Reload Scenes'}
		</button>
	</div>

	<!-- Feature request CTA — always visible, regardless of whether scenes exist -->
	<div class="scenes-cta">
		<p class="cta-label">Want more creation tools?</p>
		{#if hasVoted}
			<span class="vote-confirmed">
				{#if voteCount > 0}
					({voteCount} interested)
				{:else}
					Voted!
				{/if}
			</span>
		{:else}
			<button class="cta-btn" onclick={handleVote}>
				Request collaborative playlists
			</button>
		{/if}
	</div>
</div>

<style>
	.v2-notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--bg-4);
		border-bottom: 1px solid var(--b-1);
		font-size: 11px;
		color: var(--t-3);
	}

	.v2-badge {
		background: var(--acc);
		color: var(--bg-1);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 2px 6px;
		border-radius: var(--r);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.scenes-page {		padding: 20px;
	}

	.scenes-header {
		margin-bottom: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs);
	}

	.page-desc {
		font-size: 0.875rem;
		color: var(--t-3);
		margin: 0;
	}

	.detecting-indicator {
		font-size: 0.875rem;
		color: var(--t-3);
		margin-bottom: var(--space-md);
		font-style: italic;
	}

	.empty-state {
		padding: var(--space-2xl) var(--space-lg);
		text-align: center;
		color: var(--t-3);
		font-size: 0.9rem;	}

	.scenes-section {
		margin-bottom: var(--space-2xl);
	}

	.scenes-section h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs);
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--t-3);
		margin: 0 0 var(--space-md);
	}

	.scene-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-md);
	}

	@media (max-width: 600px) {
		.scene-grid {
			grid-template-columns: 1fr;
		}
	}

	.scenes-reload {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--b-1);
	}

	.reload-btn {
		padding: 6px 14px;
		font-size: 0.8rem;
		background: transparent;
		border: 1px solid var(--b-1);
		border-radius: 999px;
		color: var(--t-3);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.reload-btn:hover:not(:disabled) {
		color: var(--acc);
		border-color: var(--acc);
	}

	.reload-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Feature request CTA */
	.scenes-cta {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--b-1);
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.cta-label {
		font-size: 0.85rem;
		color: var(--t-3);
		margin: 0;
	}

	.cta-btn {
		padding: 5px 12px;
		font-size: 0.8rem;
		background: transparent;
		border: 1px solid var(--b-1);
		border-radius: 999px;
		color: var(--t-3);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.cta-btn:hover {
		color: var(--acc);
		border-color: var(--acc);
	}

	.vote-confirmed {
		font-size: 0.8rem;
		color: var(--t-3);
		font-style: italic;
	}
</style>
