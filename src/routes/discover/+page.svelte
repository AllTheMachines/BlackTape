<script lang="ts">
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Discover — {PROJECT_NAME}</title>
</svelte:head>

<div class="discover-page">
	<div class="discover-header">
		<h1 class="page-title">Discover</h1>
		<p class="page-desc">
			{#if data.tags.length > 0}
				Showing {data.artists.length} artists tagged with {data.tags.join(' + ')}
			{:else}
				Niche artists surface first. The more specific your taste, the rarer the discovery.
			{/if}
		</p>
	</div>

	<TagFilter tags={data.popularTags} activeTags={data.tags} />

	<section class="results">
		{#if data.artists.length === 0}
			<p class="empty-state">No artists found with these tags. Try removing one.</p>
		{:else}
			<div class="artist-grid">
				{#each data.artists as artist}
					<ArtistCard {artist} />
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.discover-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.discover-header {
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

	.results {
		margin-top: var(--space-xl);
	}

	.artist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-2xl);
	}
</style>
