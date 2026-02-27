<script lang="ts">
	import type { PageData } from './$types';
	import { isTauri } from '$lib/platform';

	let { data }: { data: PageData } = $props();

	// AI genre summary (Layer 3) — Tauri only, lazy loaded
	let aiSummary = $state<string | null>(null);
	let aiLoading = $state(false);

	async function loadAiSummary() {
		if (!isTauri() || !data.genre) return;
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
	const isScene = $derived(
		data.genre != null && data.genre.type === 'scene' && data.genre.origin_lat != null
	);

	// Related genres = subgraph neighbors, excluding self
	const related = $derived(
		data.genre != null
			? data.subgraph.nodes.filter((n) => n.slug !== data.genre!.slug)
			: []
	);
</script>

<svelte:head>
	<title>{data.genre ? `${data.genre.name} — Knowledge Base — BlackTape` : 'Knowledge Base — BlackTape'}</title>
</svelte:head>

{#if data.genre}
<div class="genre-page">
	<div class="genre-header">
		<div class="genre-title-row">
			<h1 data-testid="genre-title">{data.genre.name}</h1>
			<span class="genre-type-pill type-{data.genre.type}" data-testid="genre-type-pill">
				{data.genre.type.charAt(0).toUpperCase() + data.genre.type.slice(1)}
			</span>
		</div>
		{#if data.genre.inception_year}
			<p class="genre-meta">
				Est. {data.genre.inception_year}{data.genre.origin_city ? ` · ${data.genre.origin_city}` : ''}
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
		<section class="genre-section" data-testid="key-artists-section">
			<h2>Key Artists</h2>
			<ul class="key-artists-list">
				{#each data.keyArtists.slice(0, 8) as artist}
					<li class="key-artist-row">
						<a href="/artist/{artist.slug}" class="key-artist-name">{artist.name}</a>
						{#if artist.tags}
							<span class="key-artist-tags">{artist.tags.split(', ').slice(0, 3).join(', ')}</span>
						{/if}
					</li>
				{/each}
			</ul>
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

	<!-- Genre Map — links to Style Map filtered for this genre -->
	{#if data.genre.mb_tag}
	<section class="genre-section genre-map-section" data-testid="genre-map-section">
		<h2>Genre Map</h2>
		<div class="genre-map-placeholder" data-testid="genre-map-placeholder">
			<a href="/style-map?tag={encodeURIComponent(data.genre.mb_tag)}" class="map-link">
				Explore {data.genre.name} in Style Map →
			</a>
			<p class="placeholder-hint">See how {data.genre.name} connects to related genres visually.</p>
		</div>
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
{/if}

<style>
	.genre-page {
		padding: 0;
	}

	.genre-header {
		padding: 18px 20px 16px;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-2);
	}

	.genre-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.5rem);
		margin-bottom: var(--space-xs, 0.25rem);
	}

	.genre-title-row h1 {
		font-size: 28px;
		font-weight: 300;
		margin: 0;
		margin-top: 6px;
		color: var(--t-1);
	}

	/* Type badge pill */
	.genre-type-pill {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border: 1px solid;
		/* Default (genre) */
		color: var(--t-3);
		border-color: var(--b-2);
		background: transparent;
	}

	.genre-type-pill.type-scene {
		color: var(--acc, #c4a55a);
		border-color: var(--b-acc, rgba(196, 165, 90, 0.3));
		background: var(--acc-bg, rgba(196, 165, 90, 0.08));
	}

	.genre-type-pill.type-city {
		color: #4aad80;
		border-color: rgba(74, 173, 128, 0.3);
		background: rgba(74, 173, 128, 0.08);
	}

	.genre-meta {
		color: var(--t-3);
		font-size: 11px;
		margin: 0;
	}

	/* Description panel */
	.genre-description {
		position: relative;
		padding: 14px 20px;
		border-bottom: 1px solid var(--b-1);
	}

	.genre-description p {
		margin: 0 0 var(--space-xs) 0;
		color: var(--t-2);
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.source-badge {
		font-size: 0.6rem;
		text-transform: uppercase;
		color: var(--t-3);
		letter-spacing: 0.1em;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		padding: 1px 5px;
		border-radius: 0;
	}

	.genre-cta {
		padding: var(--space-lg);
		text-align: center;
		color: var(--t-3);
		font-size: 0.9rem;
	}

	.cta-invite a {
		color: var(--acc, #c4a55a);
	}

	.scene-map-section {
		margin-bottom: var(--space-lg);
	}

	/* Section layout */
	.genre-section {
		border-bottom: 1px solid var(--b-1);
		padding: 0;
	}

	.genre-section h2 {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t-3);
		padding: 9px 20px;
		margin: 0;
	}

	/* Compact key artists list */
	.key-artists-list {
		list-style: none;
		margin: 0;
		padding: 0 20px 14px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.key-artist-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-2);
		border: 1px solid var(--b-1);
	}

	.key-artist-row:hover {
		background: var(--bg-3);
		border-color: var(--b-2);
	}

	.key-artist-name {
		font-weight: 500;
		color: var(--text-accent, var(--acc));
		text-decoration: none;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.key-artist-name:hover {
		text-decoration: underline;
	}

	.key-artist-tags {
		font-size: 0.75rem;
		color: var(--t-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Related genres */
	.related-genres {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		padding: 0 20px 14px;
	}

	.related-genre-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 0;
		text-decoration: none;
		font-size: 0.8rem;
		color: var(--t-2);
	}

	.related-genre-chip:hover {
		background: var(--bg-3);
		border-color: var(--b-2);
		color: var(--t-1);
	}

	.chip-type-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--t-3);
	}

	.chip-type-dot.type-scene {
		background: var(--acc, #c4a55a);
	}

	.chip-type-dot.type-city {
		background: #4aad80;
	}

	/* Genre map placeholder */
	.genre-map-section {
		min-height: 0;
	}

	.genre-map-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: 14px 20px;
		background: var(--bg-2);
		border: 1px dashed var(--b-1);
		border-radius: 0;
		text-align: center;
		margin: 14px 20px;
	}

	.placeholder-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--t-3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.map-link {
		font-size: 0.9rem;
		color: var(--acc);
		text-decoration: none;
		font-weight: 500;
	}

	.map-link:hover {
		text-decoration: underline;
	}

	.placeholder-hint {
		font-size: 0.75rem;
		color: var(--t-3);
		max-width: 320px;
		margin: 0;
		opacity: 0.7;
	}

	/* Discover link */
	.discover-link {
		display: inline-block;
		font-size: 0.8rem;
		color: var(--acc, #c4a55a);
		text-decoration: none;
		padding: 8px 20px;
	}

	.discover-link:hover {
		text-decoration: underline;
	}

	.discover-footer {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--b-1);
		text-align: center;
	}
</style>
