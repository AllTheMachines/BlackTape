<script lang="ts">
	import { queueState, setQueue, removeFromQueue, clearQueue, reorderQueue } from '$lib/player/queue.svelte';
	import ExportDialog from '$lib/components/ExportDialog.svelte';
	import { isTauri } from '$lib/platform';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let dragSrcIndex = $state<number | null>(null);
	let isDragTarget = $state<number | null>(null);
	let showExport = $state(false);

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

<aside class="queue-panel" aria-label="Play queue">
	<div class="queue-header">
		<h3>Queue</h3>
		<div class="queue-actions">
			{#if queueState.tracks.length > 0}
				{#if isTauri()}
					<button class="clear-btn" onclick={() => { showExport = true; }} data-testid="queue-export-btn">Export</button>
				{/if}
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
		<div class="queue-empty">Queue is empty. Hit + Queue on any track.</div>
	{:else}
		<div class="queue-list">
			{#each queueState.tracks as track, i}
				<div
					class="queue-item"
					class:active={i === queueState.currentIndex}
					class:drag-over={isDragTarget === i}
					role="button"
					tabindex="0"
					draggable={true}
					ondragstart={() => { dragSrcIndex = i; }}
					ondragover={(e) => { e.preventDefault(); isDragTarget = i; }}
					ondragleave={() => { isDragTarget = null; }}
					ondrop={(e) => { e.preventDefault(); if (dragSrcIndex !== null && dragSrcIndex !== i) reorderQueue(dragSrcIndex, i); dragSrcIndex = null; isDragTarget = null; }}
					ondragend={() => { dragSrcIndex = null; isDragTarget = null; }}
					onclick={() => jumpTo(i)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') jumpTo(i); }}
				>
					<span class="drag-handle">⠿</span>
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

{#if showExport}
	<ExportDialog tracks={queueState.tracks} onclose={() => { showExport = false; }} />
{/if}

<style>
	.queue-panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: var(--player);
		height: min(420px, 65vh);
		background: var(--bg-2);
		border-top: 1px solid var(--b-2);
		z-index: 200;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slide-up 0.2s ease-out;
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
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
		border-radius: 0;
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
		border-radius: 0;
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

	.queue-item.drag-over {
		background: var(--bg-4);
		border-top: 1px solid var(--b-acc);
	}

	.drag-handle {
		font-size: 0.9rem;
		color: var(--t-3);
		opacity: 0;
		cursor: grab;
		flex-shrink: 0;
		transition: opacity 0.15s;
		line-height: 1;
	}

	.queue-item:hover .drag-handle {
		opacity: 1;
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
		border-radius: 0;
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
