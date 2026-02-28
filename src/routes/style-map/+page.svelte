<script lang="ts">
	import StyleMap from '$lib/components/StyleMap.svelte';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Style Map — {PROJECT_NAME}</title>
</svelte:head>

<div class="style-map-page">
	<div class="page-header discover-mode-desc">
		<h2>Style Map</h2>
		<p>
			How genres connect. Node size = how many artists. Edge weight = how often they appear together. Click nodes to select genres, then find artists that match all of them.
		</p>
	</div>

	{#if data.nodes.length === 0}
		<p class="empty-state">Style map data not available. Make sure mercury.db includes tag_cooccurrence data (run the pipeline).</p>
	{:else}
		<StyleMap nodes={data.nodes} edges={data.edges} initialTag={data.initialTag} />
	{/if}
</div>

<style>
	.style-map-page {		padding: 20px;
	}

	.page-header {
		margin-bottom: var(--space-lg);
	}

	.discover-mode-desc {
		padding: 10px 16px 8px;
		border-bottom: 1px solid var(--b-0);
		background: var(--bg-1);
		margin: -20px -20px var(--space-lg);
	}
	.discover-mode-desc h2 {
		font-size: 13px;
		font-weight: 600;
		color: var(--t-2);
		margin: 0 0 3px;
	}
	.discover-mode-desc p {
		font-size: 11px;
		color: var(--t-3);
		margin: 0;
		line-height: 1.5;
	}

	.empty-state {
		color: var(--t-3);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-2xl);
	}
</style>
