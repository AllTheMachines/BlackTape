<script lang="ts">
	import type { LibraryAlbum, LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import { setQueue } from '$lib/player/queue.svelte';

	let { albums }: { albums: LibraryAlbum[] } = $props();

	let expandedAlbum = $state<string | null>(null);

	function albumKey(album: LibraryAlbum): string {
		return `${album.artist}|||${album.name}`;
	}

	function toggleAlbum(album: LibraryAlbum) {
		const key = albumKey(album);
		expandedAlbum = expandedAlbum === key ? null : key;
	}

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

	function playTrackFromAlbum(album: LibraryAlbum, trackIndex: number) {
		const playerTracks = album.tracks.map(toPlayerTrack);
		setQueue(playerTracks, trackIndex);
	}

	function formatDuration(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<div class="album-grid">
	{#each albums as album (albumKey(album))}
		{@const isExpanded = expandedAlbum === albumKey(album)}
		<div class="album-card" class:expanded={isExpanded}>
			<!-- Album header (clickable) -->
			<button class="album-header" onclick={() => toggleAlbum(album)}>
				<div class="album-cover">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 18V5l12-2v13" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="18" cy="16" r="3" />
					</svg>
				</div>
				<div class="album-info">
					<div class="album-name">{album.name}</div>
					<div class="album-artist">{album.artist}</div>
					<div class="album-meta">
						{#if album.year}
							<span>{album.year}</span>
							<span class="dot">&middot;</span>
						{/if}
						<span>{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</span>
					</div>
				</div>
				<div class="expand-icon" class:rotated={isExpanded}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</div>
			</button>

			<!-- Expanded track list -->
			{#if isExpanded}
				<div class="track-list">
					{#each album.tracks as track, i}
						<button
							class="track-row"
							onclick={() => playTrackFromAlbum(album, i)}
							title="Play {track.title ?? 'Track ' + (i + 1)}"
						>
							<span class="track-num">{track.track_number ?? i + 1}</span>
							<span class="track-title">{track.title ?? 'Unknown Title'}</span>
							<span class="track-duration">{formatDuration(track.duration_secs)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.album-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.album-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		overflow: hidden;
		transition: border-color 0.15s;
	}

	.album-card:hover {
		border-color: var(--border-default);
	}

	.album-card.expanded {
		grid-column: 1 / -1;
		max-width: 600px;
	}

	.album-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		width: 100%;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.album-header:hover {
		background: var(--bg-hover);
	}

	.album-cover {
		flex-shrink: 0;
		width: 56px;
		height: 56px;
		background: var(--bg-elevated);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	.album-info {
		flex: 1;
		min-width: 0;
	}

	.album-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-artist {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-meta {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.dot {
		margin: 0 0.3em;
	}

	.expand-icon {
		flex-shrink: 0;
		color: var(--text-muted);
		transition: transform 0.2s;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Track list */
	.track-list {
		border-top: 1px solid var(--border-subtle);
	}

	.track-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 6px var(--space-md);
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		color: inherit;
		cursor: pointer;
		text-align: left;
		font-size: 0.8rem;
		transition: background 0.1s;
	}

	.track-row:last-child {
		border-bottom: none;
	}

	.track-row:hover {
		background: var(--bg-hover);
	}

	.track-num {
		width: 24px;
		text-align: right;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.track-title {
		flex: 1;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-duration {
		color: var(--text-muted);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}
</style>
