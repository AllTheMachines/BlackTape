<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import TrackRow from '$lib/components/TrackRow.svelte';
	import { PROJECT_NAME } from '$lib/config';
	import { isTauri } from '$lib/platform';
	import type { LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';

	let { data } = $props();

	const MAX_LOCAL_RESULTS = 10;

	function toPlayerTrack(t: LocalTrack): PlayerTrack {
		return {
			path: t.path,
			title: t.title ?? 'Unknown Title',
			artist: t.artist ?? 'Unknown Artist',
			album: t.album ?? 'Unknown Album',
			albumArtist: t.album_artist ?? undefined,
			trackNumber: t.track_number ?? undefined,
			discNumber: t.disc_number ?? undefined,
			genre: t.genre ?? undefined,
			year: t.year ?? undefined,
			durationSecs: t.duration_secs
		};
	}

	const allPlayerTracks = $derived(
		(data.localTracks ?? []).slice(0, MAX_LOCAL_RESULTS).map(toPlayerTrack)
	);
</script>

<svelte:head>
	<title>{data.query ? `Search: ${data.query}` : 'Search'} — {PROJECT_NAME}</title>
</svelte:head>

<div class="search-page">
	<!-- Search type selector -->
	<div class="search-type-selector">
		{#each [['artist', 'Artists'], ['label', 'Labels'], ['song', 'Songs']] as const as [type, label]}
			<a
				href="/search?q={encodeURIComponent(data.query)}&type={type}"
				class="type-chip"
				class:active={
					type === 'artist' ? (data.mode === 'artist' || data.mode === 'tag') :
					type === 'label' ? data.mode === 'label' :
					data.mode === 'song'
				}
			>
				{label}
			</a>
		{/each}
	</div>

	<div class="search-header">
		<SearchBar
			initialQuery={data.query}
			initialMode={data.mode === 'tag' ? 'tag' : 'artist'}
			size="normal"
		/>
	</div>

	{#if data.intent && (data.intent.type === 'city' || data.intent.type === 'label')}
		<div class="intent-chip-bar">
			<span class="intent-chip" data-testid="intent-chip">
				{data.intent.type === 'city' ? 'City' : 'Label'}: {data.intent.entity}
				<a href="/search?q={encodeURIComponent(data.query)}&mode=artist" class="intent-clear">×</a>
			</span>
			<span class="intent-hint">
				{data.intent.type === 'city'
					? 'Showing artists from this location'
					: 'Showing artists on this label'}
			</span>
		</div>
	{/if}

	{#if data.error}
		<p class="message">Search unavailable — please try again later.</p>
	{:else if data.query}
		<!-- Local library results (Tauri only) -->
		{#if data.localTracks && data.localTracks.length > 0}
			<div class="local-section">
				<h2 class="section-title">Your Library</h2>
				<div class="local-tracks">
					{#each data.localTracks.slice(0, MAX_LOCAL_RESULTS) as track, i}
						<TrackRow
							track={toPlayerTrack(track)}
							index={i}
							contextTracks={allPlayerTracks}
							showArtist={true}
							showDuration={true}
							data-testid="search-track-row"
						/>
					{/each}
				</div>
				{#if data.localTracks.length > MAX_LOCAL_RESULTS}
					<a href="/library" class="see-all-link">
						See all {data.localTracks.length} matches in Library
					</a>
				{/if}
			</div>

			{#if data.results.length > 0}
				<div class="section-divider"></div>
			{/if}
		{/if}

		<!-- Discovery results -->
		{#if data.results.length > 0}
			<div class="discovery-section">
				{#if data.localTracks && data.localTracks.length > 0}
					<h2 class="section-title">Discovery</h2>
				{/if}

				<p class="results-summary">
					{#if data.intent?.type === 'city'}
						Showing artists from {data.intent.entity} — {data.results.length} results
					{:else if data.intent?.type === 'label'}
						Showing artists on {data.intent.entity} — {data.results.length} results
					{:else if data.matchedTag}
						Showing artists tagged '{data.matchedTag}' — {data.results.length} results
					{:else}
						{data.results.length} results for '{data.query}'
					{/if}
				</p>

				<div class="results-grid">
					{#each data.results as artist}
						<ArtistCard
							{artist}
							matchReason={data.intent?.type === 'city'
								? 'City match'
								: data.intent?.type === 'label'
									? 'Label match'
									: data.mode === 'tag'
										? `Tag match: ${data.matchedTag}`
										: 'Name match'}
						/>
					{/each}
				</div>
			</div>
		{:else if !data.localTracks || data.localTracks.length === 0}
			<p class="message">No artists found for '{data.query}'</p>
		{/if}
	{/if}
</div>

<style>
	.search-page {
		padding: 20px;
	}

	/* Search type selector chips */
	.search-type-selector {
		display: flex;
		gap: 6px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--b-1);
		margin-bottom: 14px;
	}

	.type-chip {
		padding: 3px 10px;
		border: 1px solid var(--b-2);
		border-radius: 0;
		font-size: 11px;
		color: var(--t-3);
		text-decoration: none;
		transition: all 0.1s;
	}

	.type-chip:hover {
		color: var(--t-1);
		border-color: var(--b-3);
	}

	.type-chip.active {
		background: var(--acc);
		color: var(--bg-1);
		border-color: var(--acc);
	}

	.search-header {
		margin-bottom: var(--space-lg);
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t-3);
		margin: 0 0 var(--space-sm);
	}

	/* Local library results */
	.local-section {
		margin-bottom: var(--space-md);
	}

	.local-tracks {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.see-all-link {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: 0.8rem;
		color: var(--acc);
		text-decoration: none;
	}

	.see-all-link:hover {
		text-decoration: underline;
	}

	.section-divider {
		height: 1px;
		background: var(--b-1);
		margin: var(--space-lg) 0;
	}

	/* Intent confirmation chip */
	.intent-chip-bar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		padding: var(--space-xs) 0;
	}

	.intent-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 3px var(--space-sm);
		background: var(--acc-bg);
		border: 1px solid var(--b-acc, rgba(196, 165, 90, 0.3));
		border-radius: 0;
		font-size: 0.78rem;
		color: var(--acc, #c4a55a);
		font-weight: 500;
	}

	.intent-clear {
		color: var(--t-3);
		text-decoration: none;
		font-size: 1rem;
		line-height: 1;
		margin-left: 2px;
	}

	.intent-clear:hover {
		color: var(--t-1);
	}

	.intent-hint {
		font-size: 0.75rem;
		color: var(--t-3);
	}

	/* Discovery results */
	.discovery-section {
		margin-bottom: var(--space-lg);
	}

	.results-summary {
		font-size: 0.85rem;
		color: var(--t-2);
		margin: 0 0 var(--space-md);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--space-md);
	}

	.message {
		color: var(--t-2);
		font-size: 0.95rem;
	}
</style>
