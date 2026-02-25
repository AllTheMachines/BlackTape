<script lang="ts">
	import {
		addToQueue,
		playNextInQueue,
		isQueueActive,
		setQueue,
		queueState
	} from '$lib/player/queue.svelte';
	import { type PlayerTrack } from '$lib/player/state.svelte';

	interface Props {
		track: PlayerTrack;
		index: number;
		contextTracks?: PlayerTrack[];
		showArtist?: boolean;
		showAlbum?: boolean;
		showDuration?: boolean;
		'data-testid'?: string;
	}

	let {
		track,
		index,
		contextTracks,
		showArtist = false,
		showAlbum = false,
		showDuration = true,
		'data-testid': testId
	}: Props = $props();

	function formatDuration(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	const isActive = $derived(
		queueState.currentIndex !== -1 &&
		queueState.tracks[queueState.currentIndex]?.path === track.path
	);

	function handlePlay() {
		if (isQueueActive()) {
			playNextInQueue(track);
		} else {
			setQueue(contextTracks ?? [track], index);
		}
	}

	function handleQueueAdd(e: MouseEvent) {
		e.stopPropagation();
		addToQueue(track);
	}
</script>

<div
	class="track-row"
	data-testid={testId ?? 'track-row'}
	role="button"
	tabindex="0"
	onclick={handlePlay}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlay(); }}
>
	<!-- Track number / play icon column -->
	<div class="track-num-col">
		<span class="track-num">{index + 1}</span>
		<span class="play-icon" aria-hidden="true">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
				<polygon points="2,1 13,7 2,13" />
			</svg>
		</span>
	</div>

	<!-- Track info (title + optional artist/album) -->
	<div class="track-info">
		<span class="track-title" class:active={isActive}>{track.title}</span>
		{#if showArtist || showAlbum}
			<span class="track-meta">
				{#if showArtist}{track.artist}{/if}{#if showArtist && showAlbum} — {/if}{#if showAlbum}{track.album}{/if}
			</span>
		{/if}
	</div>

	<!-- Duration (optional) -->
	{#if showDuration}
		<span class="track-duration">{formatDuration(track.durationSecs)}</span>
	{/if}

	<!-- Queue button — trailing edge, visible on row hover -->
	<button
		class="queue-btn"
		data-testid="queue-btn"
		onclick={handleQueueAdd}
		aria-label="Add {track.title} to queue"
	>
		+ Queue
	</button>
</div>

<style>
	.track-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 0 8px;
		cursor: pointer;
		border-radius: var(--r);
		transition: background 0.1s;
		width: 100%;
		box-sizing: border-box;
	}

	.track-row:hover {
		background: var(--bg-3);
	}

	/* ── Track number / play icon column ── */
	.track-num-col {
		position: relative;
		width: 28px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.track-num {
		font-size: 0.75rem;
		color: var(--t-2);
		font-variant-numeric: tabular-nums;
		line-height: 1;
		transition: opacity 0.1s;
	}

	.play-icon {
		position: absolute;
		right: 0;
		color: var(--acc);
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity 0.1s;
	}

	/* Hover state: hide number, show play icon */
	.track-row:hover .track-num {
		opacity: 0;
	}

	.track-row:hover .play-icon {
		opacity: 1;
	}

	/* ── Track info column ── */
	.track-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.track-title {
		font-size: 0.8rem;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}

	.track-title.active {
		color: var(--acc);
	}

	.track-meta {
		font-size: 0.75em;
		color: var(--t-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Duration ── */
	.track-duration {
		font-size: 0.75rem;
		color: var(--t-3);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	/* ── Queue button — hidden until row hover ── */
	.queue-btn {
		opacity: 0;
		background: transparent;
		border: 1px solid var(--b-2);
		color: var(--t-2);
		font-size: 0.75rem;
		height: 22px;
		padding: 0 8px;
		border-radius: var(--r);
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		font-family: inherit;
		transition: opacity 0.1s, border-color 0.1s, color 0.1s;
	}

	.track-row:hover .queue-btn {
		opacity: 1;
	}

	.queue-btn:hover {
		border-color: var(--b-3);
		color: var(--t-1);
	}
</style>
