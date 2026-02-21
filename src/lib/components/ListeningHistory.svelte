<script lang="ts">
	import { onMount } from 'svelte';
	import { playbackState, togglePrivateMode } from '$lib/player/playback.svelte';
	import {
		getPlayHistory,
		deletePlay,
		clearPlayHistory,
		exportPlayHistory,
		type PlayRecord
	} from '$lib/taste/history';

	let history = $state<PlayRecord[]>([]);
	let loading = $state(true);
	let confirmClear = $state(false);  // two-step clear confirmation

	onMount(async () => {
		history = await getPlayHistory(200);  // show up to 200 most recent
		loading = false;
	});

	async function handleDelete(id: number) {
		await deletePlay(id);
		history = history.filter(p => p.id !== id);
	}

	async function handleClear() {
		if (!confirmClear) {
			confirmClear = true;
			return;
		}
		await clearPlayHistory();
		history = [];
		confirmClear = false;
	}

	async function handleExport() {
		await exportPlayHistory();
	}

	function formatDate(unixSecs: number): string {
		return new Date(unixSecs * 1000).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const isActive = $derived(playbackState.totalQualifyingPlays >= 5);
</script>

<div class="listening-history">
	<div class="history-controls">
		<div class="private-mode-row">
			<label class="private-toggle">
				<input
					type="checkbox"
					checked={playbackState.privateMode}
					onchange={togglePrivateMode}
				/>
				<span class="toggle-label">Private listening mode</span>
			</label>
			<span class="private-desc">
				{playbackState.privateMode
					? 'Plays are not being recorded'
					: 'Plays are being recorded'}
			</span>
		</div>

		<div class="stats-row">
			<span class="stat">
				{playbackState.totalQualifyingPlays} qualifying plays
			</span>
			<span class="activation-badge" class:active={isActive}>
				{isActive ? 'Active' : `${5 - playbackState.totalQualifyingPlays} more to activate`}
			</span>
		</div>
	</div>

	{#if loading}
		<div class="history-loading">Loading history...</div>
	{:else if history.length === 0}
		<div class="history-empty">
			No qualifying plays yet. Listen past 70% of a track to record it.
		</div>
	{:else}
		<ul class="history-list">
			{#each history as play (play.id)}
				<li class="history-item">
					<div class="play-info">
						<span class="play-track">{play.track_title ?? play.track_path.split('/').pop()}</span>
						{#if play.artist_name}
							<span class="play-artist">{play.artist_name}</span>
						{/if}
						{#if play.album_name}
							<span class="play-album">{play.album_name}</span>
						{/if}
						<span class="play-date">{formatDate(play.played_at)}</span>
					</div>
					<button
						class="delete-play"
						onclick={() => handleDelete(play.id)}
						title="Remove this play"
						aria-label="Remove play of {play.track_title ?? 'track'}"
					>
						&times;
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="history-actions">
		<button class="action-btn" onclick={handleExport} disabled={history.length === 0}>
			Export JSON
		</button>
		<button
			class="action-btn danger"
			class:confirm={confirmClear}
			onclick={handleClear}
			disabled={history.length === 0}
		>
			{confirmClear ? 'Confirm clear all' : 'Clear all history'}
		</button>
		{#if confirmClear}
			<button class="action-btn" onclick={() => confirmClear = false}>
				Cancel
			</button>
		{/if}
	</div>
</div>

<style>
	.listening-history {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.history-controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.private-mode-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.private-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--text-primary);
	}

	.toggle-label {
		font-weight: 500;
	}

	.private-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.stats-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.activation-badge {
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.7rem;
		font-weight: 500;
		background: var(--bg-base);
		border: 1px solid var(--border-subtle);
		color: var(--text-muted);
	}

	.activation-badge.active {
		background: var(--text-accent);
		border-color: var(--text-accent);
		color: var(--bg-base);
	}

	.history-loading,
	.history-empty {
		font-size: 0.8rem;
		color: var(--text-muted);
		padding: var(--space-md) 0;
		text-align: center;
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
	}

	.history-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--border-subtle);
		gap: var(--space-sm);
	}

	.history-item:last-child {
		border-bottom: none;
	}

	.play-info {
		display: flex;
		flex-wrap: wrap;
		gap: 4px var(--space-sm);
		font-size: 0.78rem;
		min-width: 0;
	}

	.play-track {
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.play-artist {
		color: var(--text-secondary);
	}

	.play-album {
		color: var(--text-muted);
	}

	.play-date {
		color: var(--text-muted);
		font-size: 0.7rem;
		margin-left: auto;
	}

	.delete-play {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 1rem;
		line-height: 1;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.delete-play:hover {
		color: var(--text-primary);
	}

	.history-actions {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.action-btn {
		padding: 6px 14px;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover:not(:disabled) {
		border-color: var(--text-secondary);
		color: var(--text-primary);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.action-btn.danger {
		color: var(--text-muted);
	}

	.action-btn.danger.confirm {
		border-color: #ef4444;
		color: #ef4444;
	}
</style>
