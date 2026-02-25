<script lang="ts">
	import type { LibraryAlbum, LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import TrackRow from './TrackRow.svelte';

	let { albums }: { albums: LibraryAlbum[] } = $props();

	let selectedAlbumKey = $state<string | null>(null);

	function albumKey(album: LibraryAlbum): string {
		return `${album.artist}|||${album.name}`;
	}

	let selectedAlbum = $derived(albums.find(a => albumKey(a) === selectedAlbumKey) ?? null);
	let selectedAlbumPlayerTracks = $derived(selectedAlbum?.tracks.map(toPlayerTrack) ?? []);

	// Auto-select first album on load and when albums list changes
	$effect(() => {
		if (albums.length > 0 && !selectedAlbumKey) {
			selectedAlbumKey = albumKey(albums[0]);
		}
	});

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

	function selectAlbum(album: LibraryAlbum) {
		selectedAlbumKey = albumKey(album);
	}
</script>

<div class="library-panes">
	<!-- Left pane: album list sorted by recently added (newest first) -->
	<div class="album-list-pane" data-testid="album-list-pane">
		{#each albums as album (albumKey(album))}
			<button
				class="album-list-item"
				class:selected={selectedAlbumKey === albumKey(album)}
				onclick={() => selectAlbum(album)}
				data-testid="album-list-item"
			>
				<div class="album-list-title">{album.name}</div>
				<div class="album-list-artist">{album.artist}</div>
			</button>
		{/each}
	</div>

	<!-- Right pane: tracklist for selected album -->
	<div class="track-pane" data-testid="track-pane">
		{#if selectedAlbum}
			<div class="track-pane-header">
				<div class="track-pane-album-name">{selectedAlbum.name}</div>
				<div class="track-pane-artist">{selectedAlbum.artist}</div>
				{#if selectedAlbum.year}
					<div class="track-pane-year">{selectedAlbum.year}</div>
				{/if}
			</div>
			<!-- Column headers: # / Title / Time / Actions — satisfies LIBR-03 -->
			<div class="track-pane-column-headers" data-testid="track-pane-column-headers">
				<span class="col-num">#</span>
				<span class="col-title">Title</span>
				<span class="col-time">Time</span>
				<span class="col-actions">Actions</span>
			</div>
			<div class="track-pane-tracks">
				{#each selectedAlbum.tracks as track, i}
					<TrackRow
						track={toPlayerTrack(track)}
						index={i}
						contextTracks={selectedAlbumPlayerTracks}
						showDuration={true}
						data-testid="library-track-row"
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.library-panes {
		display: grid;
		grid-template-columns: 240px 1fr;
		height: calc(100vh - var(--topbar) - var(--player) - 120px);
		min-height: 300px;
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		overflow: hidden;
	}

	.album-list-pane {
		border-right: 1px solid var(--b-1);
		overflow-y: auto;
		background: var(--bg-2);
	}

	.album-list-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		border-left: 2px solid transparent;
		color: inherit;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}

	.album-list-item:hover {
		background: var(--bg-hover);
	}

	.album-list-item.selected {
		border-left-color: var(--acc);
	}

	.album-list-title {
		font-size: 0.8rem;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-list-artist {
		font-size: 0.7rem;
		color: var(--t-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-pane {
		overflow-y: auto;
		background: var(--bg-1);
	}

	.track-pane-header {
		padding: 12px 16px;
		border-bottom: 1px solid var(--b-1);
	}

	.track-pane-album-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--t-1);
	}

	.track-pane-artist {
		font-size: 0.8rem;
		color: var(--t-2);
		margin-top: 2px;
	}

	.track-pane-year {
		font-size: 0.75rem;
		color: var(--t-3);
		margin-top: 2px;
	}

	/* Column header row — mirrors TrackRow column layout */
	.track-pane-column-headers {
		display: grid;
		grid-template-columns: 32px 1fr 56px 64px;
		padding: 4px 8px;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-2);
	}

	.track-pane-column-headers span {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--t-3);
	}

	.col-num {
		text-align: center;
	}

	.col-title {
		padding-left: 4px;
	}

	.col-time {
		text-align: right;
		padding-right: 4px;
	}

	.col-actions {
		text-align: center;
	}

	.track-pane-tracks {
		padding: 4px 0;
	}
</style>
