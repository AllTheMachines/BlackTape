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
					.slice(0, 3)
			: []
	);

	let barPct = $derived(
		artist.uniqueness_score
			? Math.min(100, Math.round((Math.log10(artist.uniqueness_score + 1) / Math.log10(1001)) * 100))
			: 0
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

	{#if artist.uniqueness_score !== null && artist.uniqueness_score !== undefined}
		<div class="uniqueness-bar-wrap">
			<div class="uniqueness-bar-label">Uniqueness</div>
			<div class="uniqueness-bar-track">
				<div class="uniqueness-bar-fill" style="width: {barPct}%"></div>
			</div>
			<div class="uniqueness-bar-pct">{barPct}%</div>
		</div>
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

	.uniqueness-bar-wrap {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}

	.uniqueness-bar-label {
		font-size: 0.65rem;
		color: var(--text-muted, var(--t-3));
		white-space: nowrap;
		flex-shrink: 0;
	}

	.uniqueness-bar-track {
		flex: 1;
		height: 3px;
		background: var(--bg-elevated, var(--bg-4));
		border-radius: 2px;
		overflow: hidden;
	}

	.uniqueness-bar-fill {
		height: 100%;
		background: var(--text-accent, var(--acc));
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.uniqueness-bar-pct {
		font-size: 0.65rem;
		color: var(--text-muted, var(--t-3));
		min-width: 2.5rem;
		text-align: right;
	}
</style>
