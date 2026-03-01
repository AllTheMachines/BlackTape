<script lang="ts">
	import { playerState } from '$lib/player/state.svelte';
	import { togglePlayPause, seek, setVolume, toggleMute } from '$lib/player/audio.svelte';
	import {
		playNext,
		playPrevious,
		toggleShuffle,
		toggleRepeat,
		queueState
	} from '$lib/player/queue.svelte';
	import Queue from './Queue.svelte';
	import NowPlayingDiscovery from './NowPlayingDiscovery.svelte';
	import {
		streamingState,
		clearActiveSource,
		spotifyTogglePlayPause,
		spotifySkipNext,
		spotifySkipPrevious,
		spotifySeek,
		spotifySetVolume,
		spotifyToggleMute,
		spotifyToggleShuffle,
		spotifyCycleRepeat
	} from '$lib/player/streaming.svelte';

	let showQueue = $state(false);
	let showExpanded = $state(false);

	// True when Spotify Connect is the active audio source.
	const isSpotifyMode = $derived(streamingState.activeSource === 'spotify');
	const spotifyRepeat = $derived(streamingState.spotifyTrack?.repeatState ?? 'off');

	// Unified play state — Spotify or local.
	const isPlaying = $derived(
		isSpotifyMode
			? (streamingState.spotifyTrack?.isPlaying ?? false)
			: playerState.isPlaying
	);

	// Smooth Spotify seek bar: interpolate progress locally between polls.
	let spotifyProgress = $state(0);

	$effect(() => {
		const track = streamingState.spotifyTrack;
		const playing = track?.isPlaying;

		if (!track || !isSpotifyMode) {
			spotifyProgress = 0;
			return;
		}

		// Sync immediately from the latest poll result.
		spotifyProgress = playing
			? Math.min(track.progressMs + (Date.now() - track.lastPollTime), track.durationMs)
			: track.progressMs;

		if (!playing) return;

		// Advance progress every animation frame while playing.
		let rafId: number;
		function tick() {
			const t = streamingState.spotifyTrack;
			if (!t?.isPlaying) return;
			spotifyProgress = Math.min(t.progressMs + (Date.now() - t.lastPollTime), t.durationMs);
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	function toggleExpanded() {
		showExpanded = !showExpanded;
	}

	function formatTime(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		}
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function handlePlayPause() {
		if (isSpotifyMode) {
			spotifyTogglePlayPause();
		} else {
			togglePlayPause();
		}
	}

	function handleNext() {
		if (isSpotifyMode) {
			spotifySkipNext();
		} else {
			playNext();
		}
	}

	function handlePrevious() {
		if (isSpotifyMode) {
			spotifySkipPrevious();
		} else {
			playPrevious();
		}
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		seek(Number(target.value));
	}

	function handleSpotifySeek(e: Event) {
		const target = e.target as HTMLInputElement;
		spotifySeek(Number(target.value));
	}

	function handleVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		setVolume(Number(target.value));
	}

	function handleSpotifyVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		spotifySetVolume(Number(target.value));
	}

	// ─── Spotify queue ──────────────────────────────────────────────────────────

	import type { SpotifyQueueItem } from '$lib/spotify/api';

	let spotifyQueue = $state<SpotifyQueueItem[] | null>(null);
	let spotifyQueueLoading = $state(false);

	async function loadSpotifyQueue() {
		spotifyQueueLoading = true;
		try {
			const { getValidAccessToken } = await import('$lib/spotify/auth');
			const { getSpotifyQueue } = await import('$lib/spotify/api');
			const token = await getValidAccessToken();
			spotifyQueue = await getSpotifyQueue(token);
		} catch {
			spotifyQueue = [];
		} finally {
			spotifyQueueLoading = false;
		}
	}

	function toggleQueuePanel() {
		showQueue = !showQueue;
		if (showQueue && isSpotifyMode) {
			spotifyQueue = null;
			loadSpotifyQueue();
		}
	}

	function repeatIcon(mode: string): string {
		if (mode === 'one') return '1';
		return '';
	}
</script>

{#if playerState.currentTrack || isSpotifyMode}
	{#if showExpanded}
		<div class="expanded-panel">
			<NowPlayingDiscovery
				artistName={isSpotifyMode
					? (streamingState.spotifyTrack?.artist ?? '')
					: (playerState.currentTrack?.artist ?? '')}
			/>
		</div>
	{/if}

	<div class="player-bar">
		<!-- Track info -->
		<div class="track-info">
			<div class="cassette-reels" class:playing={isPlaying}>
				<!--
					Compact cassette reel: thin outer ring + open gap + notched hub + spindle hole.
					Hub is a 32-point polygon: 8 rectangular notches (outer r=4, notch r=3, 16° per notch, 29° between).
					Both reels spin the same direction (like real cassettes).
				-->
				<svg class="reel" viewBox="0 0 20 20" width="36" height="36">
					<circle cx="10" cy="10" r="8.5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.3"/>
					<polygon fill="currentColor" fill-opacity="0.65" points="
						13.96,9.44 12.97,9.58 12.97,10.42 13.96,10.56
						13.19,12.41 12.40,11.81 11.81,12.40 12.41,13.19
						10.56,13.96 10.42,12.97 9.58,12.97 9.44,13.96
						7.59,13.19 8.20,12.40 7.60,11.81 6.81,12.41
						6.04,10.56 7.03,10.42 7.03,9.58 6.04,9.44
						6.81,7.59 7.60,8.20 8.20,7.60 7.59,6.81
						9.44,6.04 9.58,7.03 10.42,7.03 10.56,6.04
						12.41,6.81 11.81,7.60 12.40,8.20 13.19,7.59"/>
					<circle cx="10" cy="10" r="1.2" fill="var(--bg-3)"/>
				</svg>
				<svg class="reel" viewBox="0 0 20 20" width="36" height="36">
					<circle cx="10" cy="10" r="8.5" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.3"/>
					<polygon fill="currentColor" fill-opacity="0.65" points="
						13.96,9.44 12.97,9.58 12.97,10.42 13.96,10.56
						13.19,12.41 12.40,11.81 11.81,12.40 12.41,13.19
						10.56,13.96 10.42,12.97 9.58,12.97 9.44,13.96
						7.59,13.19 8.20,12.40 7.60,11.81 6.81,12.41
						6.04,10.56 7.03,10.42 7.03,9.58 6.04,9.44
						6.81,7.59 7.60,8.20 8.20,7.60 7.59,6.81
						9.44,6.04 9.58,7.03 10.42,7.03 10.56,6.04
						12.41,6.81 11.81,7.60 12.40,8.20 13.19,7.59"/>
					<circle cx="10" cy="10" r="1.2" fill="var(--bg-3)"/>
				</svg>
			</div>
			<div class="track-text">
				{#if isSpotifyMode && streamingState.spotifyTrack}
					<div class="track-title">{streamingState.spotifyTrack.title}</div>
					<div class="track-meta">
						<span class="track-artist">{streamingState.spotifyTrack.artist}</span>
						{#if streamingState.spotifyTrack.album}
							<span class="meta-sep">&mdash;</span>
							<span class="track-album">{streamingState.spotifyTrack.album}</span>
						{/if}
						<span class="via-badge">via Spotify</span>
					</div>
				{:else if isSpotifyMode}
					<div class="track-title connecting">Connecting to Spotify…</div>
				{:else if playerState.currentTrack}
					<div class="track-title">{playerState.currentTrack.title}</div>
					<div class="track-meta">
						<span class="track-artist">{playerState.currentTrack.artist}</span>
						{#if playerState.currentTrack.album}
							<span class="meta-sep">&mdash;</span>
							<span class="track-album">{playerState.currentTrack.album}</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Center: controls + seek -->
		<div class="controls-center">
			<div class="transport">
				<button
					class="control-btn small"
					class:active={isSpotifyMode ? streamingState.spotifyTrack?.shuffleState : queueState.shuffled}
					onclick={isSpotifyMode ? spotifyToggleShuffle : toggleShuffle}
					title="Shuffle"
					aria-label="Toggle shuffle"
				>
					<svg style="display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="16 3 21 3 21 8" />
						<line x1="4" y1="20" x2="21" y2="3" />
						<polyline points="21 16 21 21 16 21" />
						<line x1="15" y1="15" x2="21" y2="21" />
						<line x1="4" y1="4" x2="9" y2="9" />
					</svg>
				</button>

				<button
					class="control-btn"
					onclick={handlePrevious}
					title="Previous"
					aria-label="Previous track"
				>
					<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<button
					class="control-btn play-btn"
					onclick={handlePlayPause}
					title={isPlaying ? 'Pause' : 'Play'}
					aria-label={isPlaying ? 'Pause' : 'Play'}
				>
					{#if !isSpotifyMode && playerState.isLoading}
						<div class="spinner"></div>
					{:else if isPlaying}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6zm8 0h4v16h-4z" />
						</svg>
					{:else}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				<button
					class="control-btn"
					onclick={handleNext}
					title="Next"
					aria-label="Next track"
				>
					<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z" />
					</svg>
				</button>

				<button
					class="control-btn small"
					class:active={isSpotifyMode ? spotifyRepeat !== 'off' : queueState.repeatMode !== 'none'}
					onclick={isSpotifyMode ? spotifyCycleRepeat : toggleRepeat}
					title={isSpotifyMode ? `Repeat: ${spotifyRepeat}` : `Repeat: ${queueState.repeatMode}`}
					aria-label="Toggle repeat"
				>
					<svg style="display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="17 1 21 5 17 9" />
						<path d="M3 11V9a4 4 0 0 1 4-4h14" />
						<polyline points="7 23 3 19 7 15" />
						<path d="M21 13v2a4 4 0 0 1-4 4H3" />
					</svg>
					{#if isSpotifyMode && spotifyRepeat === 'track'}
						<span class="repeat-one-badge">1</span>
					{:else if !isSpotifyMode && queueState.repeatMode === 'one'}
						<span class="repeat-one-badge">{repeatIcon('one')}</span>
					{/if}
				</button>
			</div>

			{#if isSpotifyMode && streamingState.spotifyTrack}
				<div class="seek-row">
					<span class="time-display">{formatTime(spotifyProgress / 1000)}</span>
					<input
						type="range"
						class="seek-bar"
						min="0"
						max={streamingState.spotifyTrack.durationMs}
						step="1000"
						value={spotifyProgress}
						oninput={handleSpotifySeek}
						aria-label="Seek"
					/>
					<span class="time-display">{formatTime(streamingState.spotifyTrack.durationMs / 1000)}</span>
				</div>
			{:else if !isSpotifyMode}
				<div class="seek-row">
					<span class="time-display">{formatTime(playerState.currentTime)}</span>
					<input
						type="range"
						class="seek-bar"
						min="0"
						max={playerState.duration || 0}
						step="0.1"
						value={playerState.currentTime}
						oninput={handleSeek}
						aria-label="Seek"
					/>
					<span class="time-display">{formatTime(playerState.duration)}</span>
				</div>
			{/if}
		</div>

		<!-- Right: volume + queue toggle -->
		<div class="controls-right">
			{#if isSpotifyMode}
				{@const svol = streamingState.spotifyTrack?.volumePercent ?? 100}
				<button
					class="control-btn small"
					onclick={spotifyToggleMute}
					title={svol === 0 ? 'Unmute' : 'Mute'}
					aria-label={svol === 0 ? 'Unmute' : 'Mute'}
				>
					{#if svol === 0}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
						</svg>
					{:else if svol < 50}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
						</svg>
					{:else}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
						</svg>
					{/if}
				</button>
				<input
					type="range"
					class="volume-bar"
					min="0"
					max="100"
					step="1"
					value={svol}
					oninput={handleSpotifyVolume}
					aria-label="Volume"
				/>
			{:else}
				<button
					class="control-btn small"
					onclick={toggleMute}
					title={playerState.isMuted ? 'Unmute' : 'Mute'}
					aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
				>
					{#if playerState.isMuted || playerState.volume === 0}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
						</svg>
					{:else if playerState.volume < 0.5}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
						</svg>
					{:else}
						<svg style="display:block" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
						</svg>
					{/if}
				</button>
				<input
					type="range"
					class="volume-bar"
					min="0"
					max="1"
					step="0.01"
					value={playerState.volume}
					oninput={handleVolume}
					aria-label="Volume"
				/>
			{/if}

			<button
				class="discover-btn"
				class:active={showExpanded}
				onclick={toggleExpanded}
				title={showExpanded ? 'Collapse discovery' : 'Discover this artist'}
				aria-label={showExpanded ? 'Collapse discovery panel' : 'Expand discovery panel'}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					{#if showExpanded}
						<polyline points="6 15 12 9 18 15" />
					{:else}
						<polyline points="6 9 12 15 18 9" />
					{/if}
				</svg>
				<span class="discover-label">Discover</span>
			</button>

			<button
				class="control-btn small"
				class:active={showQueue}
				onclick={toggleQueuePanel}
				title="Queue"
				aria-label="Toggle queue"
				data-testid="queue-toggle"
			>
				<svg style="display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="8" y1="6" x2="21" y2="6" />
					<line x1="8" y1="12" x2="21" y2="12" />
					<line x1="8" y1="18" x2="21" y2="18" />
					<line x1="3" y1="6" x2="3.01" y2="6" />
					<line x1="3" y1="12" x2="3.01" y2="12" />
					<line x1="3" y1="18" x2="3.01" y2="18" />
				</svg>
			</button>
		</div>
	</div>

	{#if showQueue}
		{#if isSpotifyMode}
			<div class="queue-panel">
				<div class="queue-header">
					<span class="queue-title">Spotify Queue</span>
					<button class="queue-close" onclick={() => (showQueue = false)} aria-label="Close queue">✕</button>
				</div>
				{#if spotifyQueueLoading}
					<div class="queue-empty">Loading…</div>
				{:else if !spotifyQueue || spotifyQueue.length === 0}
					<div class="queue-empty">Queue is empty</div>
				{:else}
					<div class="queue-list">
						{#each spotifyQueue as item, i}
							<div class="queue-item">
								<span class="queue-num">{i + 1}</span>
								<div class="queue-track">
									<span class="queue-track-name">{item.name}</span>
									<span class="queue-track-artist">{item.artists}</span>
								</div>
								<span class="queue-duration">{formatTime(item.durationMs / 1000)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<Queue onclose={() => (showQueue = false)} />
		{/if}
	{/if}
{/if}

<style>
	.expanded-panel {
		position: fixed;
		bottom: var(--player);
		left: 0;
		right: 0;
		background: var(--bg-2);
		border-top: 1px solid var(--b-2);
		z-index: 199;
		animation: slide-up 0.2s ease-out;
		max-height: 280px;
		overflow-y: auto;
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.player-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: var(--player);
		background: var(--bg-3);
		border-top: 1px solid var(--b-2);
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0 14px;
		gap: 12px;
		z-index: 200;
	}

	/* Track info — left section */
	.track-info {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.track-text {
		flex: 1;
		min-width: 0;
	}

	.cassette-reels {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--t-3);
		flex-shrink: 0;
	}

	.reel {
		display: block;
		transform-origin: 50% 50%;
		animation: spin 2.2s linear infinite;
		animation-play-state: paused;
	}

	.reel-reverse {
		animation-direction: reverse;
	}

	.cassette-reels.playing .reel {
		animation-play-state: running;
	}

	.track-title {
		font-size: 11px;
		font-weight: 500;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-title.connecting {
		color: var(--t-3);
		font-style: italic;
	}

	.track-meta {
		font-size: 10px;
		color: var(--t-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta-sep {
		margin: 0 0.3em;
		color: var(--t-3);
	}

	.via-badge {
		font-size: 9px;
		color: var(--t-3);
		font-style: italic;
		margin-left: 6px;
		opacity: 0.8;
		white-space: nowrap;
	}

	/* Center — transport controls + seek */
	.controls-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		width: 100%;
		max-width: 560px;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-1);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
		position: relative;
	}

	:global(.control-btn svg) {
		display: block;
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	:global(.play-btn svg) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.control-btn:hover {
		background: var(--bg-5);
		color: var(--t-1);
	}

	.control-btn.small {
		width: 28px;
		height: 28px;
	}

	.control-btn.active {
		color: var(--acc);
		border-color: var(--b-acc);
		background: var(--acc-bg);
		opacity: 1;
	}

	.discover-btn {
		display: flex;
		align-items: center;
		gap: 3px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-3);
		cursor: pointer;
		padding: 3px 8px;
		height: 22px;
		font-size: 10px;
		font-family: inherit;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: color 0.1s, border-color 0.1s, background 0.1s;
	}

	.discover-btn:hover {
		background: var(--bg-5);
		color: var(--t-2);
	}

	.discover-btn.active {
		color: var(--acc);
		border-color: var(--b-acc);
		background: var(--acc-bg);
	}

	.discover-label {
		line-height: 1;
	}

	.play-btn {
		width: 36px;
		height: 36px;
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.play-btn:hover {
		background: var(--acc-bg-h);
	}

	.repeat-one-badge {
		position: absolute;
		top: -2px;
		right: -2px;
		font-size: 0.55rem;
		font-weight: 700;
		color: var(--acc);
	}

	/* Seek bar */
	.seek-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.time-display {
		font-size: 9px;
		color: var(--t-3);
		font-variant-numeric: tabular-nums;
		min-width: 30px;
		text-align: center;
	}

	.seek-bar {
		flex: 1;
		height: 3px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--b-2);
		border-radius: 0;
		outline: none;
		cursor: pointer;
		accent-color: var(--acc);
	}

	.seek-bar::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--acc);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.seek-bar:hover::-webkit-slider-thumb {
		opacity: 1;
	}

	.seek-bar::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--acc);
		cursor: pointer;
		border: none;
	}

	.seek-bar::-webkit-slider-runnable-track {
		height: 3px;
		border-radius: 0;
	}

	/* Right section — volume + queue */
	.controls-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}

	.volume-bar {
		width: 64px;
		height: 3px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--b-2);
		border-radius: 0;
		outline: none;
		cursor: pointer;
		accent-color: var(--t-3);
	}

	.volume-bar::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--t-2);
		cursor: pointer;
	}

	.volume-bar::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--t-2);
		cursor: pointer;
		border: none;
	}

	/* Spotify queue panel */
	.queue-panel {
		position: fixed;
		bottom: var(--player);
		right: 14px;
		width: 300px;
		max-height: 360px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		z-index: 201;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.queue-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--b-2);
		flex-shrink: 0;
	}

	.queue-title {
		font-size: 11px;
		font-weight: 600;
		color: var(--t-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.queue-close {
		background: none;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		font-size: 12px;
		padding: 2px 4px;
		line-height: 1;
	}

	.queue-close:hover {
		color: var(--t-1);
	}

	.queue-list {
		overflow-y: auto;
		flex: 1;
	}

	.queue-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--b-1);
	}

	.queue-item:last-child {
		border-bottom: none;
	}

	.queue-num {
		font-size: 10px;
		color: var(--t-3);
		min-width: 16px;
		text-align: right;
		flex-shrink: 0;
	}

	.queue-track {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.queue-track-name {
		font-size: 11px;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue-track-artist {
		font-size: 10px;
		color: var(--t-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue-duration {
		font-size: 10px;
		color: var(--t-3);
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.queue-empty {
		padding: 20px 12px;
		font-size: 11px;
		color: var(--t-3);
		text-align: center;
	}

	/* Loading spinner */
	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
