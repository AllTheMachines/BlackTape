<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import { PROJECT_NAME } from '$lib/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.query ? `Search: ${data.query}` : 'Search'} — {PROJECT_NAME}</title>
</svelte:head>

<div class="search-page">
	<div class="search-header">
		<SearchBar initialQuery={data.query} initialMode={data.mode as 'artist' | 'tag'} size="normal" />
	</div>

	{#if data.error}
		<p class="message">Search unavailable — please try again later.</p>
	{:else if data.query}
		{#if data.results.length > 0}
			<p class="results-summary">
				{#if data.matchedTag}
					Showing artists tagged '{data.matchedTag}' — {data.results.length} results
				{:else}
					{data.results.length} results for '{data.query}'
				{/if}
			</p>

			<div class="results-grid">
				{#each data.results as artist}
					<ArtistCard
						{artist}
						matchReason={data.mode === 'tag'
							? `Tagged: ${data.matchedTag}`
							: 'Name match'}
					/>
				{/each}
			</div>
		{:else}
			<p class="message">No artists found for '{data.query}'</p>
		{/if}
	{/if}
</div>

<style>
	.search-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.search-header {
		max-width: 600px;
		margin-bottom: var(--space-lg);
	}

	.results-summary {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-md);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-md);
	}

	.message {
		color: var(--text-secondary);
		font-size: 0.95rem;
	}
</style>
