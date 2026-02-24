<script lang="ts">
	/**
	 * ArtistStats — Stats tab content for the artist page.
	 * Shows uniqueness score hero (score + tier label), rarest tag, and a
	 * horizontal bar chart of all tags sorted by MusicBrainz vote count.
	 *
	 * Tier vocabulary (LOCKED — matches CONTEXT.md decisions):
	 *   Ultra Rare ≥ 100 · Rare ≥ 8 · Niche ≥ 0.36 · Common otherwise
	 */
	import { onMount } from 'svelte';
	import type { ArtistTagStat } from '$lib/db/queries';

	let {
		artistId,
		score,
		tagCount
	}: { artistId: number; score: number | null; tagCount: number } = $props();

	let distribution = $state<ArtistTagStat[]>([]);
	let loading = $state(true);

	// Sorted by count DESC for bar chart display
	let sortedByCount = $derived(
		distribution.slice().sort((a, b) => b.count - a.count)
	);

	let maxCount = $derived(sortedByCount.length > 0 ? sortedByCount[0].count : 1);

	// distribution[0] is rarest (lowest global artist_count — sorted ASC by query)
	let rarestTag = $derived(distribution.length > 0 ? distribution[0].tag : null);

	function getTier(s: number | null): string {
		if (s === null) return 'Common';
		if (s >= 100) return 'Ultra Rare';
		if (s >= 8) return 'Rare';
		if (s >= 0.36) return 'Niche';
		return 'Common';
	}

	let tier = $derived(getTier(score));

	onMount(() => {
		(async () => {
			try {
				const { getProvider } = await import('$lib/db/provider');
				const { getArtistTagDistribution } = await import('$lib/db/queries');
				const provider = await getProvider();
				distribution = await getArtistTagDistribution(provider, artistId);
			} catch (err) {
				console.error('ArtistStats: failed to load tag distribution', err);
			} finally {
				loading = false;
			}
		})();
	});
</script>

<div class="artist-stats" data-testid="artist-stats">
	{#if loading}
		<p class="stats-loading" data-testid="stats-loading">Loading stats…</p>
	{:else}
		<!-- Uniqueness score hero -->
		<div class="stats-hero" data-testid="stats-hero">
			{#if score !== null}
				<span class="stats-score">{Math.round(score)}</span>
				<span class="stats-sep">—</span>
				<span class="stats-tier">{tier}</span>
			{:else}
				<span class="stats-no-data">No tag data</span>
			{/if}
		</div>

		<!-- Rarest tag -->
		{#if rarestTag}
			<div class="rarest-tag-row" data-testid="rarest-tag">
				<span class="rarest-label">Rarest tag:</span>
				<a
					href="/search?q={encodeURIComponent(rarestTag)}&mode=tag"
					class="rarest-link"
				>{rarestTag}</a>
			</div>
		{/if}

		<!-- Tag distribution bar chart -->
		{#if sortedByCount.length > 0}
			<div class="tag-distribution" data-testid="tag-distribution">
				{#each sortedByCount as item (item.tag)}
					<div class="tag-row">
						<a
							href="/search?q={encodeURIComponent(item.tag)}&mode=tag"
							class="tag-label"
						>{item.tag}</a>
						<div class="tag-bar-track">
							<div
								class="tag-bar-fill"
								style="width: {(item.count / maxCount) * 100}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.artist-stats {
		padding: var(--space-lg) 0;
	}

	/* Loading */
	.stats-loading {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	/* Hero section */
	.stats-hero {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: var(--space-lg);
	}

	.stats-score {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-accent);
		line-height: 1;
	}

	.stats-sep {
		font-size: 1.5rem;
		color: var(--text-muted);
	}

	.stats-tier {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.stats-no-data {
		font-size: 1.25rem;
		color: var(--text-muted);
	}

	/* Rarest tag */
	.rarest-tag-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: var(--space-lg);
		font-size: 0.875rem;
	}

	.rarest-label {
		color: var(--text-muted);
	}

	.rarest-link {
		color: var(--tag-text);
		text-decoration: none;
	}

	.rarest-link:hover {
		text-decoration: underline;
	}

	/* Tag distribution bar chart */
	.tag-distribution {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tag-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.tag-label {
		flex: 0 0 160px;
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tag-label:hover {
		color: var(--text-accent);
	}

	.tag-bar-track {
		flex: 1;
		height: 6px;
		background: var(--border-subtle);
		border-radius: 3px;
		overflow: hidden;
	}

	.tag-bar-fill {
		height: 100%;
		background: var(--text-accent);
		border-radius: 3px;
		min-width: 2px;
	}
</style>
