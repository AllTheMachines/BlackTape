<script lang="ts">
	import TagChip from './TagChip.svelte';
	import type { ArtistResult } from '$lib/db/queries';

	let {
		artist,
		matchReason
	}: {
		artist: ArtistResult;
		matchReason?: string;
	} = $props();

	let tags = $derived(
		artist.tags
			? artist.tags
					.split(', ')
					.filter(Boolean)
					.slice(0, 5)
			: []
	);
</script>

<article class="artist-card">
	<div class="card-header">
		<a href="/artist/{artist.slug}" class="artist-name">{artist.name}</a>
		{#if artist.country}
			<span class="country">{artist.country}</span>
		{/if}
	</div>

	{#if tags.length > 0}
		<div class="tags">
			{#each tags as tag}
				<TagChip {tag} />
			{/each}
		</div>
	{/if}

	{#if matchReason}
		<p class="match-reason">{matchReason}</p>
	{/if}
</article>

<style>
	.artist-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		padding: var(--space-md);
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.artist-card:hover {
		background: var(--bg-hover);
		border-color: var(--border-default);
	}

	.card-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.artist-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-accent);
		text-decoration: none;
	}

	.artist-name:hover {
		text-decoration: underline;
	}

	.country {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.match-reason {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}
</style>
