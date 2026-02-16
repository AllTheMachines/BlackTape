<script lang="ts">
	import type { ArtistResult } from '$lib/db/queries';
	import { matchArtistToIndex, getRelatedArtists } from '$lib/library/matching';
	import TagChip from './TagChip.svelte';

	let { artistName }: { artistName: string } = $props();

	let matchedArtist = $state<ArtistResult | null>(null);
	let relatedArtists = $state<ArtistResult[]>([]);
	let isLoading = $state(false);
	let lastLookup = $state('');

	async function loadDiscovery(name: string) {
		if (!name || name === lastLookup) return;
		lastLookup = name;
		isLoading = true;
		matchedArtist = null;
		relatedArtists = [];

		try {
			const matched = await matchArtistToIndex(name);
			matchedArtist = matched;

			if (matched) {
				relatedArtists = await getRelatedArtists(matched);
			}
		} catch {
			// Best-effort — silently fail
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		loadDiscovery(artistName);
	});
</script>

<div class="discovery-panel">
	{#if isLoading}
		<div class="discovery-loading">
			<span class="loading-dot"></span>
			Looking up artist...
		</div>
	{:else if matchedArtist}
		<div class="matched-section">
			<div class="section-label">From Mercury index</div>
			<a href="/artist/{matchedArtist.slug}" class="matched-artist">
				<span class="matched-name">{matchedArtist.name}</span>
				{#if matchedArtist.country}
					<span class="matched-country">{matchedArtist.country}</span>
				{/if}
			</a>

			{#if matchedArtist.tags}
				<div class="matched-tags">
					{#each matchedArtist.tags.split(', ').slice(0, 6) as tag}
						<TagChip {tag} />
					{/each}
				</div>
			{/if}
		</div>

		{#if relatedArtists.length > 0}
			<div class="related-section">
				<div class="section-label">Related artists</div>
				<div class="related-list">
					{#each relatedArtists as related}
						<a href="/artist/{related.slug}" class="related-artist">
							<span class="related-name">{related.name}</span>
							{#if related.country}
								<span class="related-country">{related.country}</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{:else}
		<div class="no-match">
			<span class="no-match-text">Not found in Mercury index</span>
		</div>
	{/if}
</div>

<style>
	.discovery-panel {
		padding: var(--space-md) var(--space-lg);
		min-height: 60px;
	}

	.discovery-loading {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.loading-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted);
		animation: pulse-dot 1s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	.section-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: var(--space-xs);
	}

	.matched-section {
		margin-bottom: var(--space-md);
	}

	.matched-artist {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		text-decoration: none;
		color: var(--text-primary);
		margin-bottom: var(--space-sm);
	}

	.matched-artist:hover {
		text-decoration: underline;
	}

	.matched-name {
		font-size: 0.95rem;
		font-weight: 500;
	}

	.matched-country {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.matched-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.related-section {
		margin-top: var(--space-sm);
	}

	.related-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.related-artist {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		text-decoration: none;
		color: var(--text-secondary);
		padding: 3px 0;
		font-size: 0.8rem;
		transition: color 0.1s;
	}

	.related-artist:hover {
		color: var(--text-primary);
		text-decoration: underline;
	}

	.related-name {
		font-weight: 400;
	}

	.related-country {
		font-size: 0.65rem;
		color: var(--text-muted);
	}

	.no-match {
		display: flex;
		align-items: center;
		min-height: 40px;
	}

	.no-match-text {
		color: var(--text-muted);
		font-size: 0.8rem;
		font-style: italic;
	}
</style>
