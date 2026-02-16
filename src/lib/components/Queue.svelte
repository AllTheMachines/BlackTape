<script lang="ts">
	import { queueState, setQueue, removeFromQueue, clearQueue } from '$lib/player/queue.svelte';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	function formatDuration(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function jumpTo(index: number) {
		setQueue(queueState.tracks, index);
	}

	function remove(e: Event, index: number) {
		e.stopPropagation();
		removeFromQueue(index);
	}
</script>

<div class="queue-overlay" role="presentation" onclick={onclose}></div>

<aside class="queue-panel" aria-label="Play queue">
	<div class="queue-header">
		<h3>Queue</h3>
		<div class="queue-actions">
			{#if queueState.tracks.length > 0}
				<button class="clear-btn" onclick={clearQueue}>Clear</button>
			{/if}
			<button class="close-btn" onclick={onclose} aria-label="Close queue">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>

	{#if queueState.tracks.length === 0}
		<div class="queue-empty">Queue is empty</div>
	{:else}
		<div class="queue-list">
			{#each queueState.tracks as track, i}
				<div
					class="queue-item"
					class:active={i === queueState.currentIndex}
					role="button"
					tabindex="0"
					onclick={() => jumpTo(i)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') jumpTo(i); }}
				>
					<span class="queue-index">{i + 1}</span>
					<div class="queue-track-info">
						<span class="queue-track-title">{track.title}</span>
						<span class="queue-track-artist">{track.artist}</span>
					</div>
					<span class="queue-track-duration">{formatDuration(track.durationSecs)}</span>
					<button
						class="queue-remove"
						onclick={(e) => remove(e, i)}
						aria-label="Remove {track.title} from queue"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</aside>

<style>
	.queue-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: var(--player-height);
		background: rgba(0, 0, 0, 0.4);
		z-index: 199;
	}

	.queue-panel {
		position: fixed;
		top: var(--header-height);
		right: 0;
		bottom: var(--player-height);
		width: 340px;
		max-width: 90vw;
		background: var(--bg-surface);
		border-left: 1px solid var(--border-subtle);
		z-index: 201;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slide-in 0.2s ease-out;
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.queue-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--border-subtle);
	}

	.queue-header h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.queue-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 3px;
	}

	.clear-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-hover);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.queue-empty {
		padding: var(--space-xl);
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.queue-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-xs) 0;
	}

	.queue-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		width: 100%;
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: background 0.1s;
	}

	.queue-item:hover {
		background: var(--bg-hover);
	}

	.queue-item.active {
		background: var(--bg-elevated);
	}

	.queue-item.active .queue-track-title {
		color: var(--progress-color);
	}

	.queue-index {
		font-size: 0.7rem;
		color: var(--text-muted);
		min-width: 20px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.queue-track-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.queue-track-title {
		font-size: 0.8rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue-track-artist {
		font-size: 0.7rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue-track-duration {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.queue-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		border-radius: 3px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.queue-item:hover .queue-remove {
		opacity: 1;
	}

	.queue-remove:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}
</style>
