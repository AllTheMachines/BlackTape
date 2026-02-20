<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';

	const MAX_TAGS = 5;

	let { tags, activeTags }: {
		tags: Array<{ tag: string; artist_count: number }>;
		activeTags: string[];
	} = $props();

	function toggleTag(tag: string) {
		const currentUrl = get(page).url;
		const current = currentUrl.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

		let updated: string[];
		if (current.includes(tag)) {
			updated = current.filter(t => t !== tag);
		} else if (current.length < MAX_TAGS) {
			updated = [...current, tag];
		} else {
			return; // max 5 tags reached
		}

		const params = new URLSearchParams(currentUrl.searchParams);
		if (updated.length > 0) {
			params.set('tags', updated.join(','));
		} else {
			params.delete('tags');
		}
		goto(`?${params}`, { keepFocus: true, noScroll: true });
	}
</script>

<div class="tag-filter">
	{#if activeTags.length > 0}
		<div class="active-filters">
			<span class="filter-label">Filtering by:</span>
			{#each activeTags as tag}
				<button class="tag-chip active" onclick={() => toggleTag(tag)}>
					{tag} <span class="remove">×</span>
				</button>
			{/each}
			{#if activeTags.length >= MAX_TAGS}
				<span class="max-note">max 5 tags</span>
			{/if}
		</div>
	{/if}
	<div class="tag-cloud">
		{#each tags as { tag, artist_count }}
			{@const isActive = activeTags.includes(tag)}
			{@const isDisabled = !isActive && activeTags.length >= MAX_TAGS}
			<button
				class="tag-chip"
				class:active={isActive}
				class:disabled={isDisabled}
				onclick={() => toggleTag(tag)}
				disabled={isDisabled}
			>
				{tag}
				<span class="count">{artist_count.toLocaleString()}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.tag-filter {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.active-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--border-subtle);
		margin-bottom: var(--space-xs);
	}

	.filter-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-right: var(--space-xs);
	}

	.max-note {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 3px var(--space-sm);
		background: var(--tag-bg);
		color: var(--tag-text);
		border: 1px solid var(--tag-border);
		border-radius: 999px;
		font-size: 0.8rem;
		line-height: 1.4;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s;
		white-space: nowrap;
	}

	.tag-chip:hover:not(:disabled) {
		background: var(--bg-hover);
		border-color: var(--border-default);
	}

	.tag-chip.active {
		background: var(--text-accent);
		color: var(--bg-base);
		border-color: var(--text-accent);
	}

	.tag-chip.active:hover {
		opacity: 0.85;
	}

	.tag-chip.disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.count {
		font-size: 0.7rem;
		opacity: 0.65;
	}

	.tag-chip.active .count {
		opacity: 0.75;
	}

	.remove {
		font-size: 0.9rem;
		opacity: 0.8;
		margin-left: 1px;
	}
</style>
