<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ArtistCard from '$lib/components/ArtistCard.svelte';
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

	async function playLocalTrack(track: LocalTrack, index: number) {
		const { setQueue } = await import('$lib/player/queue.svelte');
		const tracks = (data.localTracks ?? []).slice(0, MAX_LOCAL_RESULTS);
		const playerTracks = tracks.map(toPlayerTrack);
		setQueue(playerTracks, index);
	}

	function formatDuration(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
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
		<!-- Local library results (Tauri only) -->
		{#if data.localTracks && data.localTracks.length > 0}
			<div class="local-section">
				<h2 class="section-title">Your Library</h2>
				<div class="local-tracks">
					{#each data.localTracks.slice(0, MAX_LOCAL_RESULTS) as track, i}
						<button
							class="local-track-row"
							onclick={() => playLocalTrack(track, i)}
							title="Play {track.title ?? 'Unknown'}"
						>
							<div class="local-track-info">
								<span class="local-track-title">{track.title ?? 'Unknown Title'}</span>
								<span class="local-track-meta">
									{track.artist ?? 'Unknown Artist'}
									{#if track.album}
										<span class="local-meta-sep">&mdash;</span>
										{track.album}
									{/if}
								</span>
							</div>
							<span class="local-track-duration">{formatDuration(track.duration_secs)}</span>
						</button>
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
			</div>
		{:else if !data.localTracks || data.localTracks.length === 0}
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

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
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
		background: var(--border-subtle);
		border-radius: var(--card-radius);
		overflow: hidden;
	}

	.local-track-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: 8px var(--space-md);
		background: var(--bg-surface);
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		width: 100%;
	}

	.local-track-row:hover {
		background: var(--bg-hover);
	}

	.local-track-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.local-track-title {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.local-track-meta {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.local-meta-sep {
		margin: 0 0.3em;
		color: var(--text-muted);
	}

	.local-track-duration {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.see-all-link {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: 0.8rem;
		color: var(--text-accent);
		text-decoration: none;
	}

	.see-all-link:hover {
		text-decoration: underline;
	}

	.section-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: var(--space-lg) 0;
	}

	/* Discovery results */
	.discovery-section {
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
