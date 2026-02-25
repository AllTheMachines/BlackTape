<script lang="ts">
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';

	let { data }: { data: PageData } = $props();

	// Era decade options
	const ERA_OPTIONS = ['60s', '70s', '80s', '90s', '00s', '10s', '20s'];
	const MAX_TAGS = 5;

	// Country debounce timer
	let countryTimer: ReturnType<typeof setTimeout> | null = null;

	function buildUrl(overrides: { tags?: string[]; country?: string; era?: string }) {
		const currentUrl = get(page).url;
		const params = new URLSearchParams(currentUrl.searchParams);

		const newTags = overrides.tags !== undefined ? overrides.tags : data.tags;
		const newCountry = overrides.country !== undefined ? overrides.country : data.country;
		const newEra = overrides.era !== undefined ? overrides.era : data.era;

		if (newTags.length > 0) {
			params.set('tags', newTags.join(','));
		} else {
			params.delete('tags');
		}

		if (newCountry) {
			params.set('country', newCountry);
		} else {
			params.delete('country');
		}

		if (newEra) {
			params.set('era', newEra);
		} else {
			params.delete('era');
		}

		const str = params.toString();
		return str ? `?${str}` : '/discover';
	}

	function toggleTag(tag: string) {
		const current = data.tags;
		let updated: string[];
		if (current.includes(tag)) {
			updated = current.filter((t) => t !== tag);
		} else if (current.length < MAX_TAGS) {
			updated = [...current, tag];
		} else {
			return;
		}
		goto(buildUrl({ tags: updated }), { keepFocus: true, noScroll: true });
	}

	function onCountryInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		if (countryTimer) clearTimeout(countryTimer);
		countryTimer = setTimeout(() => {
			goto(buildUrl({ country: value }), { keepFocus: true, noScroll: true });
		}, 300);
	}

	function toggleEra(era: string) {
		const newEra = data.era === era ? '' : era;
		goto(buildUrl({ era: newEra }), { keepFocus: true, noScroll: true });
	}

	function clearAllFilters() {
		goto('/discover', { keepFocus: true, noScroll: true });
	}

	let hasActiveFilters = $derived(data.tags.length > 0 || !!data.country || !!data.era);
</script>

<svelte:head>
	<title>Discover — {PROJECT_NAME}</title>
</svelte:head>

<div class="discover-page">
	<div class="discover-layout">
		<!-- Left filter panel -->
		<aside class="discover-filter-panel">
			<h2 class="filter-heading">Filters</h2>

			<!-- Genre / Tag cloud -->
			<div class="filter-section">
				<span class="filter-label">Genre / Tag</span>
				<div class="tag-cloud">
					{#each data.popularTags.slice(0, 50) as { tag, artist_count }}
						{@const isActive = data.tags.includes(tag)}
						{@const isDisabled = !isActive && data.tags.length >= MAX_TAGS}
						<button
							class="tag-chip"
							class:active={isActive}
							class:disabled={isDisabled}
							onclick={() => toggleTag(tag)}
							disabled={isDisabled}
							title="{artist_count.toLocaleString()} artists"
						>
							{tag}
						</button>
					{/each}
				</div>
			</div>

			<!-- Country -->
			<div class="filter-section">
				<label class="filter-label" for="country-input">Country</label>
				<input
					id="country-input"
					type="text"
					class="country-input"
					placeholder="e.g. GB, US, JP"
					value={data.country}
					oninput={onCountryInput}
				/>
			</div>

			<!-- Era -->
			<div class="filter-section">
				<span class="filter-label">Era</span>
				<div class="era-pills">
					{#each ERA_OPTIONS as era}
						<button
							class="era-pill"
							class:active={data.era === era}
							onclick={() => toggleEra(era)}
						>
							{era}
						</button>
					{/each}
				</div>
			</div>
		</aside>

		<!-- Right results column -->
		<div class="discover-results">
			<!-- Active filter chips toolbar -->
			<div class="results-toolbar">
				<div class="active-chips">
					{#each data.tags as tag}
						<button class="filter-chip active" onclick={() => toggleTag(tag)}>
							{tag} <span class="chip-remove">×</span>
						</button>
					{/each}
					{#if data.country}
						<button class="filter-chip active" onclick={() => goto(buildUrl({ country: '' }), { keepFocus: true, noScroll: true })}>
							Country: {data.country} <span class="chip-remove">×</span>
						</button>
					{/if}
					{#if data.era}
						<button class="filter-chip active" onclick={() => goto(buildUrl({ era: '' }), { keepFocus: true, noScroll: true })}>
							Era: {data.era} <span class="chip-remove">×</span>
						</button>
					{/if}
				</div>
				<div class="toolbar-right">
					<span class="result-count">{data.artists.length} artists</span>
					{#if hasActiveFilters}
						<button class="clear-all-btn" onclick={clearAllFilters}>Clear all</button>
					{/if}
				</div>
			</div>

			<!-- Results grid or empty state -->
			{#if data.artists.length === 0}
				<div class="empty-state">
					<p>No artists found with these filters.</p>
					<button class="clear-filters-btn" onclick={clearAllFilters}>Clear filters</button>
				</div>
			{:else}
				<div class="artist-list">
					{#each data.artists as artist}
						<ArtistCard {artist} compact />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.discover-page {
		height: 100%;
		overflow: hidden;
	}

	.discover-layout {
		display: grid;
		grid-template-columns: 196px 1fr;
		height: 100%;
		overflow: hidden;
	}

	/* ---- Filter panel ---- */
	.discover-filter-panel {
		background: var(--bg-1);
		border-right: 1px solid var(--b-1);
		padding: 10px 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.filter-heading {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--t-3);
		margin: 0;
		padding: 10px 12px 8px;
		border-bottom: 1px solid var(--b-1);
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0;
		border-bottom: 1px solid var(--b-0);
		padding: 8px 0;
	}

	.filter-label {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--t-3);
		padding: 3px 12px 6px;
	}

	/* Tag cloud in filter panel */
	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 0 10px;
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 6px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 10px;
		color: var(--t-3);
		cursor: pointer;
		white-space: nowrap;
		transition: border-color 0.1s, color 0.1s;
	}

	.tag-chip:hover:not(:disabled) {
		border-color: var(--acc);
		color: var(--t-2);
	}

	.tag-chip.active {
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.tag-chip.disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* Country input */
	.country-input {
		width: 100%;
		box-sizing: border-box;
		font-size: 0.8rem;
		padding: 4px 8px;
	}

	/* Era pills */
	.era-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.era-pill {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 8px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 10px;
		color: var(--t-3);
		cursor: pointer;
		transition: border-color 0.1s, color 0.1s;
	}

	.era-pill:hover {
		border-color: var(--acc);
		color: var(--t-2);
	}

	.era-pill.active {
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	/* ---- Results column ---- */
	.discover-results {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Toolbar */
	.results-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-xs);
		background: var(--bg-2);
		padding: 8px 16px;
		flex-shrink: 0;
		border-bottom: 1px solid var(--b-1);
	}

	.active-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 22px;
		padding: 0 7px;
		background: var(--acc-bg);
		border: 1px solid var(--b-acc);
		border-radius: var(--r);
		font-size: 10px;
		color: var(--acc);
		cursor: pointer;
		transition: opacity 0.1s;
	}

	.filter-chip:hover {
		opacity: 0.8;
	}

	.chip-remove {
		font-size: 0.85rem;
		margin-left: 1px;
		opacity: 0.8;
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.result-count {
		font-size: 0.75rem;
		color: var(--t-3);
		flex-shrink: 0;
	}

	.clear-all-btn {
		font-size: 0.7rem;
		color: var(--t-3);
		background: none;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		padding: 2px 8px;
		cursor: pointer;
		transition: border-color 0.1s, color 0.1s;
	}

	.clear-all-btn:hover {
		border-color: var(--acc);
		color: var(--acc);
	}

	/* Artist list (compact rows) */
	.artist-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
		overflow-y: auto;
		padding: 6px 8px;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-2xl);
		text-align: center;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: var(--t-3);
		margin: 0;
	}

	.clear-filters-btn {
		font-size: 0.8rem;
		color: var(--acc);
		background: var(--acc-bg);
		border: 1px solid var(--b-acc);
		border-radius: var(--r);
		padding: 5px 12px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.clear-filters-btn:hover {
		opacity: 0.8;
	}
</style>
