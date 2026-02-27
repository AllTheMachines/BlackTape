<script lang="ts">
	import { onMount } from 'svelte';
	import {
		tasteProfile,
		loadTasteProfile,
		type TasteTag,
		type TasteAnchor
	} from '$lib/taste/profile.svelte';
	import { recomputeTaste } from '$lib/taste/signals';

	let newTagInput = $state('');
	let newAnchorInput = $state('');
	let anchorSearchError = $state('');
	let anchorSearching = $state(false);

	/** Tags sorted by absolute weight, highest first */
	let sortedTags = $derived(
		[...tasteProfile.tags].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
	);

	onMount(async () => {
		if (!tasteProfile.isLoaded) {
			await loadTasteProfile();
		}
	});

	async function getInvoke() {
		const { invoke } = await import('@tauri-apps/api/core');
		return invoke;
	}

	async function handleWeightChange(tag: string, weight: number) {
		try {
			const invoke = await getInvoke();
			// Round to 2 decimal places
			const roundedWeight = Math.round(weight * 100) / 100;
			await invoke('set_taste_tag', {
				tag,
				weight: roundedWeight,
				source: 'manual'
			});
			// Update reactive state
			const idx = tasteProfile.tags.findIndex((t) => t.tag === tag);
			if (idx >= 0) {
				tasteProfile.tags[idx] = {
					...tasteProfile.tags[idx],
					weight: roundedWeight,
					source: 'manual'
				};
			}
		} catch (e) {
			console.error('Failed to update tag weight:', e);
		}
	}

	async function handleRemoveTag(tag: string) {
		try {
			const invoke = await getInvoke();
			await invoke('remove_taste_tag', { tag });
			tasteProfile.tags = tasteProfile.tags.filter((t) => t.tag !== tag);
		} catch (e) {
			console.error('Failed to remove tag:', e);
		}
	}

	async function handleAddTag() {
		const tag = newTagInput.trim().toLowerCase();
		if (!tag) return;

		// Check if tag already exists
		if (tasteProfile.tags.some((t) => t.tag === tag)) {
			newTagInput = '';
			return;
		}

		try {
			const invoke = await getInvoke();
			await invoke('set_taste_tag', {
				tag,
				weight: 0.5,
				source: 'manual'
			});
			tasteProfile.tags = [
				...tasteProfile.tags,
				{ tag, weight: 0.5, source: 'manual' }
			];
			newTagInput = '';
		} catch (e) {
			console.error('Failed to add tag:', e);
		}
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddTag();
		}
	}

	async function handleAddAnchor() {
		const name = newAnchorInput.trim();
		if (!name) return;

		anchorSearchError = '';
		anchorSearching = true;

		try {
			// Search mercury.db for the artist — try exact match first, fall back to FTS5
			const { getProvider } = await import('$lib/db/provider');
			const { searchArtists } = await import('$lib/db/queries');
			const provider = await getProvider();
			if (!provider) {
				anchorSearchError = 'Database not available';
				anchorSearching = false;
				return;
			}

			// Try exact case-insensitive match first
			let results = await provider.all<{ mbid: string; name: string }>(
				`SELECT mbid, name FROM artists WHERE name = ? COLLATE NOCASE LIMIT 1`,
				[name]
			);

			// Fall back to FTS5 search if exact match fails
			if (results.length === 0) {
				const searchResults = await searchArtists(provider, name, 5);
				// Pick the closest match (case-insensitive)
				const exact = searchResults.find(
					(r) => r.name.toLowerCase() === name.toLowerCase()
				);
				if (exact) {
					results = [{ mbid: exact.mbid, name: exact.name }];
				} else if (searchResults.length > 0) {
					// Use best FTS match
					results = [{ mbid: searchResults[0].mbid, name: searchResults[0].name }];
				}
			}

			if (results.length === 0) {
				anchorSearchError = 'Artist not found in database';
				anchorSearching = false;
				return;
			}

			const artist = results[0];

			// Check if already anchored
			if (tasteProfile.anchors.some((a) => a.artist_mbid === artist.mbid)) {
				newAnchorInput = '';
				anchorSearching = false;
				return;
			}

			const invoke = await getInvoke();
			await invoke('add_taste_anchor', {
				artistMbid: artist.mbid,
				artistName: artist.name
			});
			tasteProfile.anchors = [
				...tasteProfile.anchors,
				{
					artist_mbid: artist.mbid,
					artist_name: artist.name,
					pinned_at: Date.now()
				}
			];
			newAnchorInput = '';
			anchorSearchError = '';

			// Trigger recomputation with new anchor context
			await recomputeTaste();
		} catch (e) {
			console.error('Failed to add anchor:', e);
			anchorSearchError = 'Failed to search';
		} finally {
			anchorSearching = false;
		}
	}

	async function handleRemoveAnchor(mbid: string) {
		try {
			const invoke = await getInvoke();
			await invoke('remove_taste_anchor', { artistMbid: mbid });
			tasteProfile.anchors = tasteProfile.anchors.filter(
				(a) => a.artist_mbid !== mbid
			);
		} catch (e) {
			console.error('Failed to remove anchor:', e);
		}
	}

	function handleAnchorKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddAnchor();
		}
	}

	function formatWeight(w: number): string {
		return w >= 0 ? `+${w.toFixed(2)}` : w.toFixed(2);
	}

	function sourceBadgeClass(source: string): string {
		switch (source) {
			case 'manual':
				return 'badge-manual';
			case 'favorite':
				return 'badge-favorite';
			default:
				return 'badge-library';
		}
	}
</script>

<div class="taste-editor">
	<!-- Section 1: Tag Weights -->
	<div class="editor-section">
		<h3>Your Taste Tags</h3>
		<p class="section-subtitle">
			These tags shape your recommendations. Adjust weights or add your own.
		</p>

		{#if sortedTags.length === 0}
			<p class="empty-state">
				No tags yet — browse some artists and save your favorites.
			</p>
		{:else}
			<div class="tag-list">
				{#each sortedTags as tag (tag.tag)}
					<div class="tag-row">
						<div class="tag-info">
							<span class="tag-name">{tag.tag}</span>
							<span class="source-badge {sourceBadgeClass(tag.source)}">{tag.source}</span>
						</div>
						<div class="tag-controls">
							<span class="weight-value" class:negative={tag.weight < 0}>
								{formatWeight(tag.weight)}
							</span>
							<input
								type="range"
								min="-1"
								max="1"
								step="0.05"
								value={tag.weight}
								class="weight-slider"
								oninput={(e) => {
									const target = e.currentTarget as HTMLInputElement;
									handleWeightChange(tag.tag, parseFloat(target.value));
								}}
							/>
							<button
								class="remove-btn"
								onclick={() => handleRemoveTag(tag.tag)}
								title="Remove tag"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="add-row">
			<input
				type="text"
				bind:value={newTagInput}
				placeholder="Add a tag..."
				class="add-input"
				onkeydown={handleTagKeydown}
			/>
			<button class="add-btn" onclick={handleAddTag} disabled={!newTagInput.trim()}>
				Add
			</button>
		</div>
	</div>

	<!-- Section 2: Artist Anchors -->
	<div class="editor-section">
		<h3>Artist Anchors</h3>
		<p class="section-subtitle">
			Pin artists that define your taste. These heavily influence recommendations.
		</p>

		{#if tasteProfile.anchors.length === 0}
			<p class="empty-state">
				No anchors — search for an artist to pin.
			</p>
		{:else}
			<div class="anchor-list">
				{#each tasteProfile.anchors as anchor (anchor.artist_mbid)}
					<div class="anchor-row">
						<span class="anchor-name">{anchor.artist_name}</span>
						<button
							class="remove-btn"
							onclick={() => handleRemoveAnchor(anchor.artist_mbid)}
							title="Remove anchor"
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

		<div class="add-row">
			<input
				type="text"
				bind:value={newAnchorInput}
				placeholder="Search for an artist..."
				class="add-input"
				onkeydown={handleAnchorKeydown}
			/>
			<button
				class="add-btn"
				onclick={handleAddAnchor}
				disabled={!newAnchorInput.trim() || anchorSearching}
			>
				{anchorSearching ? 'Searching...' : 'Pin'}
			</button>
		</div>
		{#if anchorSearchError}
			<p class="search-error">{anchorSearchError}</p>
		{/if}
	</div>
</div>

<style>
	.taste-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.editor-section {
		padding: var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 0;
	}

	.editor-section h3 {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.section-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-md);
		line-height: 1.4;
	}

	.empty-state {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-style: italic;
		margin: var(--space-md) 0;
	}

	/* Tag list */
	.tag-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-md);
	}

	.tag-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		transition: background 0.1s;
	}

	.tag-row:hover {
		background: var(--bg-hover);
	}

	.tag-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		min-width: 0;
		flex-shrink: 1;
	}

	.tag-name {
		font-size: 0.8rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.source-badge {
		font-size: 0.65rem;
		padding: 1px 6px;
		border-radius: 0;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.badge-library {
		background: var(--bg-hover);
		color: var(--text-muted);
	}

	.badge-favorite {
		background: rgba(126, 184, 218, 0.15);
		color: var(--link-color);
	}

	.badge-manual {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-accent);
	}

	.tag-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.weight-value {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		min-width: 3.5em;
		text-align: right;
	}

	.weight-value.negative {
		color: #ef4444;
	}

	/* Slider */
	.weight-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100px;
		height: 4px;
		background: var(--border-default);
		border-radius: 0;
		outline: none;
		cursor: pointer;
	}

	.weight-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--text-accent);
		cursor: pointer;
		border: none;
	}

	.weight-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--text-accent);
		cursor: pointer;
		border: none;
	}

	/* Anchor list */
	.anchor-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-md);
	}

	.anchor-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		transition: background 0.1s;
	}

	.anchor-row:hover {
		background: var(--bg-hover);
	}

	.anchor-name {
		font-size: 0.8rem;
		color: var(--text-primary);
	}

	/* Remove button */
	.remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: 0;
		padding: 0;
		transition: color 0.15s, background 0.15s;
	}

	.remove-btn:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	/* Add row */
	.add-row {
		display: flex;
		gap: var(--space-sm);
	}

	.add-input {
		flex: 1;
		padding: 6px 10px;
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 0;
		color: var(--text-primary);
		font-size: 0.8rem;
		font-family: var(--font-sans);
		outline: none;
		transition: border-color 0.15s;
	}

	.add-input:focus {
		border-color: var(--border-hover);
	}

	.add-input::placeholder {
		color: var(--text-muted);
	}

	.add-btn {
		padding: 6px 14px;
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 0;
		color: var(--text-primary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		font-family: var(--font-sans);
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.add-btn:hover:not(:disabled) {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}

	.add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.search-error {
		font-size: 0.75rem;
		color: #ef4444;
		margin: var(--space-xs) 0 0;
	}
</style>
