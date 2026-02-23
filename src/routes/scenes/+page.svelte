<script lang="ts">
	import SceneCard from '$lib/components/SceneCard.svelte';
	import { isTauri } from '$lib/platform';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();

	// Reactive reference to Tauri detection state (only used in Tauri context)
	let isDetecting = $state(false);

	import { onMount } from 'svelte';
	onMount(async () => {
		if (!isTauri()) return;
		// Subscribe to detection state reactively
		const { scenesState } = await import('$lib/scenes');
		isDetecting = scenesState.isDetecting;
	});

	const hasActive = $derived(data.partitioned.active.length > 0);
	const hasEmerging = $derived(data.partitioned.emerging.length > 0);
	const isEmpty = $derived(!hasActive && !hasEmerging);
</script>

<svelte:head>
	<title>Scenes — {PROJECT_NAME}</title>
</svelte:head>

<div class="scenes-page">
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
				{#each data.partitioned.active as scene}
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
				{#each data.partitioned.emerging as scene}
					<SceneCard {scene} href="/scenes/{scene.slug}" />
				{/each}
			</div>
		</section>
	{/if}

	<div class="scenes-cta">
		<a href="/scenes?feature=collaborative-playlists" class="cta-link">
			Request collaborative playlists &rarr;
		</a>
	</div>
</div>

<style>
	.scenes-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.scenes-header {
		margin-bottom: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-desc {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.detecting-indicator {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-bottom: var(--space-md);
		font-style: italic;
	}

	.empty-state {
		padding: var(--space-2xl) var(--space-lg);
		text-align: center;
		color: var(--text-muted);
		font-size: 0.9rem;
		max-width: 480px;
		margin: 0 auto;
	}

	.scenes-section {
		margin-bottom: var(--space-2xl);
	}

	.scenes-section h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--text-muted);
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

	.scenes-cta {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--border-subtle);
	}

	.cta-link {
		font-size: 0.85rem;
		color: var(--text-muted);
		text-decoration: none;
	}

	.cta-link:hover {
		color: var(--text-accent);
	}
</style>
