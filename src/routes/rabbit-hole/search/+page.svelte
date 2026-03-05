<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getProvider } from '$lib/db/provider';
	import { searchArtistsAutocomplete, searchTagsAutocomplete } from '$lib/db/queries';
	import { pushTrailItem } from '$lib/rabbit-hole/trail.svelte';
	import type { DbProvider } from '$lib/db/provider';

	let db = $state<DbProvider | null>(null);
	let query = $state('');
	let artistResults = $state<Array<{ name: string; slug: string; tags: string | null }>>([]);
	let tagResults = $state<Array<{ tag: string; artist_count: number }>>([]);
	let searching = $state(false);
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	onMount(async () => {
		db = await getProvider();
		query = page.url.searchParams.get('q') ?? '';
		if (query) runSearch(query);
	});

	async function runSearch(q: string) {
		if (!db || !q.trim()) return;
		searching = true;
		try {
			const [artists, tags] = await Promise.all([
				searchArtistsAutocomplete(db, q.trim(), 100),
				searchTagsAutocomplete(db, q.trim(), 50)
			]);
			artistResults = artists;
			tagResults = tags;
		} catch {
			artistResults = [];
			tagResults = [];
		} finally {
			searching = false;
		}
	}

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		const q = query.trim();
		if (!q) { artistResults = []; tagResults = []; return; }
		debounceTimer = setTimeout(() => runSearch(q), 200);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); runSearch(query); }
	}

	function selectArtist(name: string, slug: string) {
		pushTrailItem({ type: 'artist', slug, name });
		goto(`/rabbit-hole/artist/${slug}`, { keepFocus: true, noScroll: true });
	}

	function selectTag(tag: string) {
		pushTrailItem({ type: 'tag', slug: encodeURIComponent(tag), name: tag });
		goto(`/rabbit-hole/tag/${encodeURIComponent(tag)}`, { keepFocus: true, noScroll: true });
	}
</script>

<div class="rh-search-page">
	<div class="rh-search-bar">
		<input
			class="rh-search-input"
			type="text"
			placeholder="Search artists, genres, tags..."
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			autocomplete="off"
			spellcheck="false"
		/>
	</div>

	<div class="rh-search-results">
		{#if searching}
			<p class="rh-search-status">Searching...</p>
		{:else if artistResults.length === 0 && tagResults.length === 0 && query.trim()}
			<p class="rh-search-status">No results for "{query}"</p>
		{:else}
			{#if artistResults.length > 0}
				<div class="rh-group-label">Artists</div>
				{#each artistResults as a}
					<button class="rh-result-item" onclick={() => selectArtist(a.name, a.slug)}>
						<span class="rh-result-name">{a.name}</span>
						{#if a.tags}
							<span class="rh-result-meta">{a.tags.split(',')[0].trim()}</span>
						{/if}
					</button>
				{/each}
			{/if}
			{#if tagResults.length > 0}
				<div class="rh-group-label">Genres & Tags</div>
				{#each tagResults as t}
					<button class="rh-result-item" onclick={() => selectTag(t.tag)}>
						<span class="rh-result-name">◈ {t.tag}</span>
						<span class="rh-result-meta">{t.artist_count.toLocaleString()} artists</span>
					</button>
				{/each}
			{/if}
		{/if}
	</div>
</div>

<style>
	.rh-search-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.rh-search-bar {
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	.rh-search-input {
		width: 100%;
		padding: 10px 14px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-md);
		color: var(--t-1);
		font-size: 0.9375rem;
		outline: none;
		box-sizing: border-box;
		font-family: inherit;
		transition: border-color 0.15s;
	}

	.rh-search-input:focus {
		border-color: var(--acc);
	}

	.rh-search-results {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-sm) 0;
	}

	.rh-search-status {
		color: var(--t-3);
		font-size: 0.875rem;
		padding: var(--space-md) var(--space-lg);
		margin: 0;
	}

	.rh-group-label {
		padding: 8px var(--space-lg) 4px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--t-4);
	}

	.rh-result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 9px var(--space-lg);
		background: none;
		border: none;
		color: var(--t-1);
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		font-family: inherit;
		gap: var(--space-sm);
		transition: background 0.1s;
	}

	.rh-result-item:hover {
		background: var(--bg-2);
	}

	.rh-result-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rh-result-meta {
		color: var(--t-4);
		font-size: 0.75rem;
		flex-shrink: 0;
	}
</style>
