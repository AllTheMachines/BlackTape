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
	import { streamingState } from '$lib/player/streaming.svelte';

	let showQueue = $state(false);
	let showExpanded = $state(false);

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

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		seek(Number(target.value));
	}

	function handleVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		setVolume(Number(target.value));
	}

	function toggleQueuePanel() {
		showQueue = !showQueue;
	}

	function repeatIcon(mode: string): string {
		if (mode === 'one') return '1';
		return '';
	}

	function sourceLabel(source: string): string {
		const labels: Record<string, string> = {
			spotify: 'Spotify',
			soundcloud: 'SoundCloud',
			youtube: 'YouTube',
			bandcamp: 'Bandcamp'
		};
		return labels[source] ?? source;
	}
</script>

{#if playerState.currentTrack}
	{#if showExpanded}
		<div class="expanded-panel">
			<NowPlayingDiscovery artistName={playerState.currentTrack.artist} />
		</div>
	{/if}

	<div class="player-bar">
		<!-- Track info -->
		<div class="track-info">
			<div class="track-title">{playerState.currentTrack.title}</div>
			<div class="track-meta">
				<span class="track-artist">{playerState.currentTrack.artist}</span>
				{#if playerState.currentTrack.album}
					<span class="meta-sep">&mdash;</span>
					<span class="track-album">{playerState.currentTrack.album}</span>
				{/if}
				{#if streamingState.activeSource}
					<span class="via-badge">via {sourceLabel(streamingState.activeSource)}</span>
				{/if}
			</div>
		</div>

		<!-- Center: controls + seek -->
		<div class="controls-center">
			<div class="transport">
				<button
					class="control-btn small"
					class:active={queueState.shuffled}
					onclick={toggleShuffle}
					title="Shuffle"
					aria-label="Toggle shuffle"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="16 3 21 3 21 8" />
						<line x1="4" y1="20" x2="21" y2="3" />
						<polyline points="21 16 21 21 16 21" />
						<line x1="15" y1="15" x2="21" y2="21" />
						<line x1="4" y1="4" x2="9" y2="9" />
					</svg>
				</button>

				<button
					class="control-btn"
					onclick={playPrevious}
					title="Previous"
					aria-label="Previous track"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>

				<button
					class="control-btn play-btn"
					onclick={togglePlayPause}
					title={playerState.isPlaying ? 'Pause' : 'Play'}
					aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
				>
					{#if playerState.isLoading}
						<div class="spinner"></div>
					{:else if playerState.isPlaying}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6zm8 0h4v16h-4z" />
						</svg>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				<button
					class="control-btn"
					onclick={playNext}
					title="Next"
					aria-label="Next track"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z" />
					</svg>
				</button>

				<button
					class="control-btn small"
					class:active={queueState.repeatMode !== 'none'}
					onclick={toggleRepeat}
					title="Repeat: {queueState.repeatMode}"
					aria-label="Toggle repeat"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="17 1 21 5 17 9" />
						<path d="M3 11V9a4 4 0 0 1 4-4h14" />
						<polyline points="7 23 3 19 7 15" />
						<path d="M21 13v2a4 4 0 0 1-4 4H3" />
					</svg>
					{#if queueState.repeatMode === 'one'}
						<span class="repeat-one-badge">{repeatIcon('one')}</span>
					{/if}
				</button>
			</div>

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
		</div>

		<!-- Right: volume + queue toggle -->
		<div class="controls-right">
			<button
				class="control-btn small"
				onclick={toggleMute}
				title={playerState.isMuted ? 'Unmute' : 'Mute'}
				aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
			>
				{#if playerState.isMuted || playerState.volume === 0}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
					</svg>
				{:else if playerState.volume < 0.5}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
					</svg>
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
		<Queue onclose={() => (showQueue = false)} />
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
		display: flex;
		align-items: center;
		padding: 0 14px;
		gap: 12px;
		z-index: 200;
	}

	/* Track info — left section */
	.track-info {
		flex: 1;
		min-width: 0;
		max-width: 240px;
	}

	.track-title {
		font-size: 11px;
		font-weight: 500;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
		flex: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		max-width: 600px;
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
		width: 26px;
		height: 26px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-1);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
		position: relative;
	}

	.control-btn:hover {
		background: var(--bg-5);
		color: var(--t-1);
	}

	.control-btn.small {
		width: 24px;
		height: 24px;
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
		width: 30px;
		height: 30px;
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
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		max-width: 240px;
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
