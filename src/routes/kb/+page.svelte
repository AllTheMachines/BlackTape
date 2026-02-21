<script lang="ts">
	import GenreGraph from '$lib/components/GenreGraph.svelte';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Knowledge Base — {PROJECT_NAME}</title>
</svelte:head>

<div class="kb-landing">
	<div class="kb-header">
		<h1>Knowledge Base</h1>
		<p class="kb-subtitle">
			The genre and scene map. Click a node to explore its history, key artists, and connections.
		</p>
	</div>

	{#if data.graph.nodes.length > 0}
		<GenreGraph nodes={data.graph.nodes} edges={data.graph.edges} />
	{:else}
		<div class="kb-empty">
			<p>
				Genre data not yet available. Run <code>node pipeline/build-genre-data.mjs</code> to populate.
			</p>
		</div>
	{/if}
</div>

<style>
	.kb-landing {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl, 2rem) var(--space-lg, 1rem);
	}

	.kb-header {
		margin-bottom: var(--space-lg, 1.5rem);
	}

	.kb-header h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs, 0.5rem);
	}

	.kb-subtitle {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.kb-empty {
		padding: var(--space-2xl, 3rem);
		text-align: center;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.kb-empty code {
		background: var(--bg-elevated);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.85em;
	}
</style>
