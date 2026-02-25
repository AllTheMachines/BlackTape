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
	<div class="page-header">
		<h1 class="page-title">Style Map</h1>
		<p class="page-desc">
			How genres connect. Node size = how many artists. Edge weight = how often they appear together. Click a node to discover artists.
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

	.empty-state {
		color: var(--t-3);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-2xl);
	}
</style>
