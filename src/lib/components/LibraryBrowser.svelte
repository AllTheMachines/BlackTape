<script lang="ts">
	import type { LibraryAlbum, LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import TrackRow from './TrackRow.svelte';
	import { setQueue, addToQueue } from '$lib/player/queue.svelte';
	import { setAlbumCover } from '$lib/library/scanner';
	import { loadLibrary } from '$lib/library/store.svelte';

	let { albums }: { albums: LibraryAlbum[] } = $props();

	let selectedAlbumKey = $state<string | null>(null);
	let lightboxSrc = $state<string | null>(null);
	let coverFileInput = $state<HTMLInputElement | null>(null);

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

	function openLightbox(src: string) {
		lightboxSrc = src;
	}

	function openCoverPicker() {
		coverFileInput?.click();
	}

	async function handleCoverFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		const album = selectedAlbum;
		if (!file || !album) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			const dataUrl = e.target?.result as string;
			if (!dataUrl) return;
			await setAlbumCover(album.name, album.artist, dataUrl);
			await loadLibrary();
		};
		reader.readAsDataURL(file);
		input.value = '';
	}
</script>

<svelte:window onkeydown={(e) => { if (lightboxSrc && e.key === 'Escape') lightboxSrc = null; }} />

{#if lightboxSrc}
	<div class="lightbox-overlay" role="dialog" aria-modal="true" aria-label="Cover art">
		<button class="lightbox-close" onclick={() => (lightboxSrc = null)} aria-label="Close">×</button>
		<img class="lightbox-img" src={lightboxSrc} alt="Album cover" />
	</div>
{/if}

<input
	bind:this={coverFileInput}
	type="file"
	accept="image/*"
	style="display:none"
	onchange={handleCoverFile}
/>

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
					<button class="cover-btn" onclick={() => openLightbox(selectedAlbum!.coverArtBase64!)} title="View cover">
						<img class="release-cover release-cover-img" src={selectedAlbum.coverArtBase64} alt={selectedAlbum.name} />
						<div class="cover-hint">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
						</div>
					</button>
				{:else}
					<button class="cover-btn cover-btn-empty" onclick={openCoverPicker} title="Add cover art">
						<div class="release-cover">{getInitials(selectedAlbum.name)}</div>
						<div class="cover-hint">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
						</div>
					</button>
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

	/* Clickable cover wrapper */
	.cover-btn {
		position: relative;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		border-radius: var(--r);
		overflow: hidden;
	}

	.cover-btn .release-cover {
		width: 100%;
		height: 100%;
	}

	/* Hover overlay hint */
	.cover-hint {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		opacity: 0;
		transition: opacity 0.15s;
		border-radius: var(--r);
	}

	.cover-btn:hover .cover-hint {
		opacity: 1;
	}

	.cover-btn-empty:hover .release-cover {
		opacity: 0.5;
	}

	/* Lightbox */
	.lightbox-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.lightbox-close {
		position: absolute;
		top: 16px;
		right: 20px;
		width: 36px;
		height: 36px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		color: #fff;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-img {
		max-width: min(600px, 90vw);
		max-height: 90vh;
		border-radius: var(--r);
		object-fit: contain;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
	}
</style>
