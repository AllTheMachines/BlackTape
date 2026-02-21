<script lang="ts">
	import type { PageData } from './$types';
	import { isTauri } from '$lib/platform';
	import GenreGraph from '$lib/components/GenreGraph.svelte';
	import ArtistCard from '$lib/components/ArtistCard.svelte';

	let { data }: { data: PageData } = $props();

	// AI genre summary (Layer 3) — Tauri only, lazy loaded
	let aiSummary = $state<string | null>(null);
	let aiLoading = $state(false);

	async function loadAiSummary() {
		if (!isTauri()) return;
		try {
			aiLoading = true;
			const { getAiProvider } = await import('$lib/ai/engine');
			const { genreSummary } = await import('$lib/ai/prompts');
			const ai = getAiProvider();
			if (!ai) return;
			const prompt = genreSummary(
				data.genre.name,
				data.genre.inception_year,
				data.genre.origin_city
			);
			aiSummary = await ai.complete(prompt, { temperature: 0.6, maxTokens: 150 });
		} catch {
			/* best-effort */
		} finally {
			aiLoading = false;
		}
	}

	import { onMount } from 'svelte';
	onMount(() => {
		// data.wikipediaSummary is stable after SSR — safe to read in onMount closure
		if (isTauri() && !data.wikipediaSummary) loadAiSummary();
	});

	// Determine if scene page (has coordinates)
	const isScene = $derived(data.genre.type === 'scene' && data.genre.origin_lat != null);

	// Related genres = subgraph neighbors, excluding self
	const related = $derived(data.subgraph.nodes.filter((n) => n.slug !== data.genre.slug));
</script>

<svelte:head>
	<title>{data.genre.name} — Knowledge Base — Mercury</title>
</svelte:head>

<div class="genre-page">
	<div class="genre-header">
		<span class="genre-type-badge">{data.genre.type}</span>
		<h1>{data.genre.name}</h1>
		{#if data.genre.inception_year}
			<p class="genre-meta">
				Est. {data.genre.inception_year}{data.genre.origin_city
					? ` · ${data.genre.origin_city}`
					: ''}
			</p>
		{/if}
	</div>

	{#if data.genre.mb_tag}
		<a href="/discover?tags={data.genre.mb_tag}" class="discover-link">
			Explore {data.genre.name} in Discover
		</a>
	{/if}

	<!-- Layer 2: Wikipedia summary (always shown first if available) -->
	{#if data.wikipediaSummary}
		<div class="genre-description layer-wikipedia">
			<p>{data.wikipediaSummary}</p>
			<span class="source-badge">Wikipedia</span>
		</div>
	{:else if aiSummary}
		<!-- Layer 3: AI summary (shown when Wikipedia unavailable, Tauri only) -->
		<div class="genre-description layer-ai">
			<p>{aiSummary}</p>
			<span class="source-badge">AI</span>
		</div>
	{:else if !aiLoading}
		<!-- Layer 1 only: sparse page CTA — invitation, not a bug report -->
		<div class="genre-cta">
			<p>This {data.genre.type} has no description yet.</p>
			<p class="cta-invite">Know this scene? <a href="/about">Write it.</a></p>
		</div>
	{/if}

	<!-- Scene map (DISC-05) — only for scene nodes with coordinates -->
	{#if isScene}
		{#await import('$lib/components/SceneMap.svelte') then { default: SceneMap }}
			<div class="scene-map-section">
				<SceneMap
					lat={data.genre.origin_lat!}
					lng={data.genre.origin_lng!}
					cityName={data.genre.origin_city!}
				/>
			</div>
		{/await}
	{/if}

	<!-- Key artists (Layer 1 — always available) -->
	{#if data.keyArtists.length > 0}
		<section class="genre-section">
			<h2>Key Artists</h2>
			<div class="artist-grid">
				{#each data.keyArtists as artist}
					<ArtistCard {artist} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- Related genres / subgraph neighbors -->
	{#if related.length > 0}
		<section class="genre-section">
			<h2>Related Genres</h2>
			<div class="related-genres">
				{#each related as g}
					<a href="/kb/genre/{g.slug}" class="related-genre-chip">
						<span class="chip-type-dot type-{g.type}"></span>
						{g.name}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Mini genre graph — context map for orientation (KB-01: graph stays visible) -->
	{#if data.subgraph.nodes.length > 1}
		<section class="genre-section genre-graph-panel">
			<h2>Genre Map</h2>
			<GenreGraph
				nodes={data.subgraph.nodes}
				edges={data.subgraph.edges}
				focusSlug={data.genre.slug}
			/>
		</section>
	{/if}

	{#if data.genre.mb_tag}
		<div class="discover-footer">
			<a href="/discover?tags={data.genre.mb_tag}" class="discover-link">
				Explore {data.genre.name} in Discover
			</a>
		</div>
	{/if}
</div>

<style>
	.genre-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.genre-header {
		margin-bottom: 1.5rem;
	}

	.genre-type-badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted, #888);
		margin-bottom: 0.5rem;
		display: block;
	}

	.genre-header h1 {
		font-size: 2rem;
		margin-bottom: 0.25rem;
	}

	.genre-meta {
		color: var(--text-muted, #888);
		font-size: 0.9rem;
	}

	.genre-description {
		position: relative;
		padding: 1.25rem;
		background: var(--bg-surface, #1a1a1a);
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.source-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		color: var(--text-muted, #888);
		letter-spacing: 0.1em;
	}

	.genre-cta {
		padding: 1.5rem;
		text-align: center;
		color: var(--text-muted, #888);
	}

	.cta-invite a {
		color: var(--text-accent, #60a5fa);
	}

	.scene-map-section {
		margin-bottom: 1.5rem;
	}

	.genre-section {
		margin-bottom: 2rem;
	}

	.genre-section h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
	}

	.artist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.related-genres {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.related-genre-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		background: var(--bg-surface, #1a1a1a);
		text-decoration: none;
		font-size: 0.85rem;
		color: inherit;
	}

	.related-genre-chip:hover {
		background: var(--bg-hover, #2a2a2a);
	}

	.chip-type-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted, #888);
	}

	.chip-type-dot.type-scene {
		background: #c07820;
	}

	.chip-type-dot.type-city {
		background: #3a8060;
	}

	.genre-graph-panel {
		min-height: 300px;
	}

	.discover-link {
		display: inline-block;
		font-size: 0.85rem;
		color: var(--text-accent, #60a5fa);
		text-decoration: none;
		margin-bottom: var(--space-md, 1rem);
	}

	.discover-link:hover {
		text-decoration: underline;
	}

	.discover-footer {
		margin-top: var(--space-xl, 2rem);
		padding-top: var(--space-md, 1rem);
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
		text-align: center;
	}
</style>
