<script lang="ts">
	import type { LibraryAlbum, LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import TrackRow from './TrackRow.svelte';
	import { setQueue, addToQueue } from '$lib/player/queue.svelte';

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

	function getInitials(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	function playAlbum() {
		if (selectedAlbumPlayerTracks.length > 0) setQueue(selectedAlbumPlayerTracks, 0);
	}

	function queueAlbum() {
		for (const t of selectedAlbumPlayerTracks) addToQueue(t);
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
				{#if album.coverArtBase64}
					<img class="album-thumb album-thumb-img" src={album.coverArtBase64} alt={album.name} />
				{:else}
					<div class="album-thumb">{getInitials(album.name)}</div>
				{/if}
				<div class="album-list-info">
					<div class="album-list-title">{album.name}</div>
					<a href="/search?q={encodeURIComponent(album.artist)}" class="album-list-artist" onclick={(e) => e.stopPropagation()}>{album.artist}</a>
				</div>
			</button>
		{/each}
	</div>

	<!-- Right pane: tracklist for selected album -->
	<div class="track-pane" data-testid="track-pane">
		{#if selectedAlbum}
			<div class="track-pane-header">
				{#if selectedAlbum.coverArtBase64}
					<img class="release-cover release-cover-img" src={selectedAlbum.coverArtBase64} alt={selectedAlbum.name} />
				{:else}
					<div class="release-cover" aria-hidden="true">{getInitials(selectedAlbum.name)}</div>
				{/if}
				<div class="release-info">
					<div class="release-title">{selectedAlbum.name}</div>
					<div class="release-artist">{selectedAlbum.artist}</div>
					<div class="release-meta">
						{#if selectedAlbum.year}<span>{selectedAlbum.year}</span>{/if}
						<span>{selectedAlbum.tracks.length} tracks</span>
					</div>
					<div class="release-actions">
						<button class="release-play-btn" onclick={playAlbum}>▶ Play</button>
						<button class="release-queue-btn" onclick={queueAlbum}>+ Queue</button>
					</div>
				</div>
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
		height: 100%;
		overflow: hidden;
	}

	.album-list-pane {
		border-right: 1px solid var(--b-1);
		overflow-y: auto;
		background: var(--bg-1);
	}

	.album-list-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: 52px;
		padding: 0 12px;
		background: none;
		border: none;
		border-left: 2px solid transparent;
		color: inherit;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		box-sizing: border-box;
	}

	.album-thumb {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: var(--t-3);
		letter-spacing: 0.04em;
	}

	.album-thumb-img {
		object-fit: cover;
	}

	.album-list-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.album-list-item:hover {
		background: #181818;
	}

	.album-list-item.selected {
		border-left-color: var(--acc);
		background: #1e1e1e;
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
		text-decoration: none;
	}

	.album-list-artist:hover {
		color: var(--t-1);
		text-decoration: underline;
	}

	.track-pane {
		overflow-y: auto;
		background: var(--bg-1);
	}

	.track-pane-header {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-2);
	}

	.release-cover {
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 600;
		color: var(--t-3);
		letter-spacing: 0.04em;
	}

	.release-cover-img {
		object-fit: cover;
	}

	.release-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		flex: 1;
	}

	.release-title {
		font-size: 18px;
		font-weight: 300;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.release-artist {
		font-size: 12px;
		color: var(--acc);
		font-weight: 500;
	}

	.release-meta {
		display: flex;
		gap: 8px;
		font-size: 11px;
		color: var(--t-3);
	}

	.release-actions {
		display: flex;
		gap: 6px;
		margin-top: 4px;
	}

	.release-play-btn {
		height: 26px;
		padding: 0 12px;
		background: var(--acc-bg);
		color: var(--acc);
		border: 1px solid var(--b-acc);
		border-radius: var(--r);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
	}

	.release-play-btn:hover {
		opacity: 0.85;
	}

	.release-queue-btn {
		height: 26px;
		padding: 0 12px;
		background: transparent;
		color: var(--t-2);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 11px;
		cursor: pointer;
	}

	.release-queue-btn:hover {
		border-color: var(--b-3);
		color: var(--t-1);
	}

	/* Column header row — mirrors TrackRow column layout */
	.track-pane-column-headers {
		display: grid;
		grid-template-columns: 32px 1fr 56px 64px;
		padding: 4px 8px;
		height: 28px;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-1);
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
