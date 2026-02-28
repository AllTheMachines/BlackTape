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
	<div class="kb-header discover-mode-desc">
		<h2>Knowledge Base</h2>
		<p>
			Genre deep dives. Each genre page shows its defining artists, related scenes, origin story, and connections to other genres.
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
		padding: 20px;
	}

	.kb-header {
		margin-bottom: var(--space-lg, 1.5rem);
	}

	.discover-mode-desc {
		padding: 10px 16px 8px;
		border-bottom: 1px solid var(--b-0);
		background: var(--bg-1);
		margin: -20px -20px var(--space-lg, 1.5rem);
	}
		.discover-mode-desc h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 3px;
	}
	.discover-mode-desc p {
		font-size: 12px;
		color: var(--t-2);
		margin: 0;
		line-height: 1.5;
	}

	.taste-loading {
		margin: var(--space-xs, 0.5rem) 0 var(--space-md, 1rem);
	}

	.skeleton-line {
		height: 0.875rem;
		background: var(--bg-3);
		border-radius: 0;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.8; }
	}

	.kb-taste-empty {
		font-size: 0.85rem;
		color: var(--t-3);
		margin: var(--space-xs, 0.4rem) 0 var(--space-md, 1rem);
	}

	.kb-taste-empty a {
		color: var(--acc);
	}

	.kb-empty {
		padding: var(--space-2xl, 3rem);
		text-align: center;
		color: var(--t-3);
		font-size: 0.875rem;
	}

	.kb-empty code {
		background: var(--bg-3);
		padding: 2px 6px;
		border-radius: 0;
		font-family: monospace;
		font-size: 0.85em;
	}
</style>
