<script lang="ts">
	import type { MusicFolder } from '$lib/library/types';

	let {
		folders,
		onAddFolder,
		onRescan,
		onRemove,
		onClose
	}: {
		folders: MusicFolder[];
		onAddFolder: () => void;
		onRescan: (path: string) => void;
		onRemove: (path: string) => void;
		onClose: () => void;
	} = $props();

	function formatDate(dateStr: string): string {
		try {
			const d = new Date(dateStr + 'Z');
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
		} catch {
			return dateStr;
		}
	}
</script>

<div class="folder-manager">
	<div class="fm-header">
		<h3>Music Folders</h3>
		<button class="fm-close" onclick={onClose} aria-label="Close folder manager">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>

	{#if folders.length === 0}
		<p class="fm-empty">No folders registered yet.</p>
	{:else}
		<div class="fm-list">
			{#each folders as folder (folder.id)}
				<div class="fm-item">
					<div class="fm-item-info">
						<div class="fm-path">{folder.path}</div>
						<div class="fm-date">Added {formatDate(folder.added_at)}</div>
					</div>
					<div class="fm-item-actions">
						<button class="fm-btn" onclick={() => onRescan(folder.path)} title="Rescan folder">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="23 4 23 10 17 10" />
								<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
							</svg>
						</button>
						<button class="fm-btn fm-btn-danger" onclick={() => onRemove(folder.path)} title="Remove folder">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<button class="fm-add" onclick={onAddFolder}>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
		Add another folder
	</button>
</div>

<style>
	.folder-manager {
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
	}

	.fm-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.fm-header h3 {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0;
	}

	.fm-close {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
	}

	.fm-close:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	.fm-empty {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-md);
	}

	.fm-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.fm-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-elevated);
		border-radius: 4px;
		gap: var(--space-md);
	}

	.fm-item-info {
		min-width: 0;
		flex: 1;
	}

	.fm-path {
		font-size: 0.8rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fm-date {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.fm-item-actions {
		display: flex;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.fm-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
	}

	.fm-btn:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	.fm-btn-danger:hover {
		color: #e06060;
	}

	.fm-add {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: 1px dashed var(--border-default);
		color: var(--text-secondary);
		padding: 6px 12px;
		border-radius: var(--card-radius);
		font-size: 0.8rem;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.fm-add:hover {
		color: var(--text-primary);
		border-color: var(--border-hover);
	}
</style>
