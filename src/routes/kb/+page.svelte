<script lang="ts">
	import GenreGraph from '$lib/components/GenreGraph.svelte';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { isTauri } from '$lib/platform';

	let { data }: { data: PageData } = $props();

	// Local graph state — starts with server data, updates reactively when taste loads
	let graph = $state(data.graph);

	// Re-fetch personalized graph when taste profile becomes available (Tauri only)
	// Guard: only call when tags actually exist — empty profile shows stub, not generic graph
	$effect(() => {
		if (tasteProfile.isLoaded && isTauri() && tasteProfile.tags.length > 0) {
			loadPersonalizedGraph();
		}
	});

	async function loadPersonalizedGraph() {
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { getStarterGenreGraph } = await import('$lib/db/queries');
			const db = await getProvider();
			const tasteTags = tasteProfile.tags.map((t) => t.tag).slice(0, 5);
			graph = await getStarterGenreGraph(db, tasteTags);
		} catch {
			// Keep current graph — best-effort
		}
	}
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

		{#if isTauri() && !tasteProfile.isLoaded}
			<!-- Loading state: taste profile is resolving -->
			<div class="taste-loading">
				<div class="skeleton-line" style="width: 45%;"></div>
			</div>
		{:else if isTauri() && tasteProfile.isLoaded && tasteProfile.tags.length === 0}
			<!-- Empty taste state: profile loaded but no tags saved yet -->
			<p class="kb-taste-empty">
				<a href="/">Search for artists</a> and save favorites to personalize your Knowledge Base.
			</p>
		{/if}
	</div>

	{#if graph.nodes.length > 0}
		<GenreGraph nodes={graph.nodes} edges={graph.edges} />
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

	.taste-loading {
		margin: var(--space-xs, 0.5rem) 0 var(--space-md, 1rem);
	}

	.skeleton-line {
		height: 0.875rem;
		background: var(--bg-elevated);
		border-radius: 4px;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.8; }
	}

	.kb-taste-empty {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: var(--space-xs, 0.4rem) 0 var(--space-md, 1rem);
	}

	.kb-taste-empty a {
		color: var(--text-accent);
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
