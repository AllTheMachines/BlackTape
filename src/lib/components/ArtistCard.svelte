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

	/** Initials placeholder for art area */
	let initials = $derived(
		artist.name
			.split(/\s+/)
			.slice(0, 3)
			.map(w => w[0] ?? '')
			.join('')
			.toUpperCase()
	);
</script>

<a href="/artist/{artist.slug}" class="artist-card" aria-label={artist.name}>
	<!-- Square art area — initials placeholder until cover art available -->
	<div class="a-art" aria-hidden="true">{initials}</div>

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
