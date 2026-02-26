<script lang="ts">
	import TagChip from './TagChip.svelte';
	import type { ArtistResult } from '$lib/db/queries';
	import { getWikiThumbnail } from '$lib/wiki-thumbnail';

	let {
		artist,
		matchReason,
		compact = false
	}: {
		artist: ArtistResult;
		matchReason?: string;
		compact?: boolean;
	} = $props();

	let tags = $derived(
		artist.tags
			? artist.tags
					.split(', ')
					.filter(Boolean)
					.slice(0, compact ? 2 : 3)
			: []
	);

	let barPct = $derived(
		artist.uniqueness_score
			? Math.min(100, Math.round((Math.log10(artist.uniqueness_score + 1) / Math.log10(1001)) * 100))
			: 0
	);

	/** Initials placeholder for art area */
	let initials = $derived(
		artist.name
			.split(/\s+/)
			.slice(0, 3)
			.map(w => w[0] ?? '')
			.join('')
			.toUpperCase()
	);

	/** Wikipedia thumbnail — null until loaded, stays null if not found */
	let thumbnailUrl = $state<string | null>(null);

	$effect(() => {
		// Only fetch for card (non-compact) mode — compact rows don't show the art square
		if (!compact) {
			getWikiThumbnail(artist.name).then(url => {
				thumbnailUrl = url;
			});
		}
	});
</script>

<a href="/artist/{artist.slug}" class="artist-card" class:compact aria-label={artist.name}>
	{#if !compact}
		<!-- Square art area — Wikipedia thumbnail if available, initials fallback -->
		<div class="a-art" aria-hidden="true">
			{#if thumbnailUrl}
				<img src={thumbnailUrl} alt="" />
			{:else}
				{initials}
			{/if}
		</div>
	{/if}

	<div class="a-info">
		<div class="a-name">{artist.name}</div>
		{#if artist.country}
			<div class="a-meta">{artist.country}</div>
		{/if}

		{#if tags.length > 0}
			<div class="a-tags">
				{#each tags as tag}
					<TagChip {tag} clickable={false} />
				{/each}
			</div>
		{/if}

		{#if matchReason}
			<p class="match-reason">{matchReason}</p>
		{/if}

		{#if artist.uniqueness_score !== null && artist.uniqueness_score !== undefined}
			<div class="a-score">
				<span class="score-num">{barPct}</span>
				<div class="score-bar uniqueness-bar">
					<div class="score-fill" style="width: {barPct}%"></div>
				</div>
			</div>
		{/if}
	</div>
</a>

<style>
	.artist-card {
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		overflow: hidden;
		cursor: pointer;
		display: block;
		text-decoration: none;
		transition: border-color 0.1s, background 0.1s;
	}

	.artist-card:hover {
		border-color: var(--b-3);
		background: #1d1d1d;
		text-decoration: none;
	}

	/* Compact list row mode (used in Discover) */
	.artist-card.compact {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 10px;
		border-radius: var(--r);
		background: transparent;
		border-color: transparent;
	}

	.artist-card.compact:hover {
		background: var(--bg-3);
		border-color: var(--b-1);
	}

	.artist-card.compact .a-info {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0;
		flex: 1;
		min-width: 0;
	}

	.artist-card.compact .a-name {
		flex-shrink: 0;
		min-width: 140px;
		max-width: 220px;
		font-size: 12px;
	}

	.artist-card.compact .a-meta {
		flex-shrink: 0;
		margin: 0;
		font-size: 10px;
		color: var(--t-3);
		min-width: 24px;
	}

	.artist-card.compact .a-tags {
		display: flex;
		flex-wrap: nowrap;
		gap: 3px;
		margin: 0;
		flex: 1;
		overflow: hidden;
	}

	.artist-card.compact .match-reason {
		margin: 0;
		flex-shrink: 0;
	}

	.artist-card.compact .a-score {
		flex-shrink: 0;
		margin: 0;
		width: 80px;
	}

	/* Square art area — fills width, 1:1 ratio */
	.a-art {
		aspect-ratio: 1;
		background: var(--bg-4);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		color: var(--t-3);
		font-weight: 700;
		letter-spacing: 0.06em;
		overflow: hidden;
	}

	.a-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.a-info {
		padding: 8px 10px;
	}

	.a-name {
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--t-1);
	}

	.artist-card:hover .a-name {
		color: var(--t-1);
	}

	.a-meta {
		font-size: 10px;
		color: var(--t-3);
		margin-top: 2px;
	}

	.a-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-top: 6px;
	}

	.match-reason {
		font-size: 10px;
		color: var(--t-3);
		margin: 4px 0 0;
		font-style: italic;
	}

	.a-score {
		margin-top: 6px;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: var(--t-3);
	}

	.score-num {
		flex-shrink: 0;
	}

	.score-bar {
		flex: 1;
		height: 2px;
		background: var(--b-2);
		position: relative;
	}

	.score-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: var(--acc);
	}
</style>
