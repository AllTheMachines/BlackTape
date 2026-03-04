<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getProvider } from '$lib/db/provider';
	import { searchArtistsAutocomplete, searchTagsAutocomplete, getRandomArtist } from '$lib/db/queries';
	import { pushTrailItem } from '$lib/rabbit-hole/trail.svelte';
	import type { DbProvider } from '$lib/db/provider';

	let db = $state<DbProvider | null>(null);
	let query = $state('');
	let artistResults = $state<Array<{ name: string; slug: string; tags: string | null }>>([]);
	let tagResults = $state<Array<{ tag: string; artist_count: number }>>([]);
	let searching = $state(false);
	let randomLoading = $state(false);
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let hasResults = $derived(artistResults.length > 0 || tagResults.length > 0);

	onMount(async () => {
		db = await getProvider();
	});

	async function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		const q = query.trim();
		if (!q) {
			artistResults = [];
			tagResults = [];
			return;
		}
		debounceTimer = setTimeout(async () => {
			if (!db) return;
			searching = true;
			try {
				const [artists, tags] = await Promise.all([
					searchArtistsAutocomplete(db, q, 6),
					searchTagsAutocomplete(db, q, 6)
				]);
				artistResults = artists;
				tagResults = tags;
			} catch {
				artistResults = [];
				tagResults = [];
			} finally {
				searching = false;
			}
		}, 200);
	}

	function selectArtist(name: string, slug: string) {
		pushTrailItem({ type: 'artist', slug, name });
		query = '';
		artistResults = [];
		tagResults = [];
		goto(`/rabbit-hole/artist/${slug}`, { keepFocus: true, noScroll: true });
	}

	function selectTag(tag: string) {
		pushTrailItem({ type: 'tag', slug: encodeURIComponent(tag), name: tag });
		query = '';
		artistResults = [];
		tagResults = [];
		goto(`/rabbit-hole/tag/${encodeURIComponent(tag)}`, { keepFocus: true, noScroll: true });
	}

	async function handleRandom() {
		if (!db || randomLoading) return;
		randomLoading = true;
		try {
			const artist = await getRandomArtist(db);
			if (artist) {
				pushTrailItem({ type: 'artist', slug: artist.slug, name: artist.name });
				goto(`/rabbit-hole/artist/${artist.slug}`, { keepFocus: true, noScroll: true });
			}
		} catch {
			// silently fail
		} finally {
			randomLoading = false;
		}
	}
</script>

<div class="rh-landing">
	<div class="rh-landing-inner">
		<p class="rh-tagline">Where do you want to go?</p>

		<div class="rh-search-wrap">
			<input
				class="rh-search-input"
				type="text"
				placeholder="Search artists, genres, tags..."
				bind:value={query}
				oninput={handleInput}
				autocomplete="off"
				spellcheck="false"
			/>
			{#if hasResults || searching}
				<div class="rh-results" role="listbox">
					{#if searching}
						<div class="rh-results-loading">Searching...</div>
					{:else}
						{#if artistResults.length > 0}
							<div class="rh-results-group">
								<div class="rh-results-label">Artists</div>
								{#each artistResults as a}
									<button
										class="rh-result-item"
										role="option"
										aria-selected="false"
										onclick={() => selectArtist(a.name, a.slug)}
									>
										<span class="rh-result-name">{a.name}</span>
										{#if a.tags}
											<span class="rh-result-meta">{a.tags.split(',')[0].trim()}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
						{#if tagResults.length > 0}
							<div class="rh-results-group">
								<div class="rh-results-label">Genres & Tags</div>
								{#each tagResults as t}
									<button
										class="rh-result-item"
										role="option"
										aria-selected="false"
										onclick={() => selectTag(t.tag)}
									>
										<span class="rh-result-name">◈ {t.tag}</span>
										<span class="rh-result-meta">{t.artist_count.toLocaleString()} artists</span>
									</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		<button class="rh-random-btn" onclick={handleRandom} disabled={randomLoading}>
			{randomLoading ? 'Finding...' : 'Random'}
		</button>
	</div>
</div>

<style>
	.rh-landing {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 100%;
		padding: 18vh var(--space-xl) var(--space-xl);
	}

	.rh-landing-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		width: 100%;
		max-width: 520px;
	}

	.rh-tagline {
		color: var(--t-3);
		font-size: 0.875rem;
		margin: 0;
	}

	.rh-search-wrap {
		position: relative;
		width: 100%;
	}

	.rh-search-input {
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-md);
		color: var(--t-1);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.rh-search-input:focus {
		border-color: var(--acc);
	}

	.rh-results {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-md);
		z-index: 50;
		overflow: hidden;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.rh-results-loading {
		padding: 12px 16px;
		color: var(--t-3);
		font-size: 0.875rem;
	}

	.rh-results-group {
		padding: 6px 0;
	}

	.rh-results-label {
		padding: 4px 16px;
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
		padding: 8px 16px;
		background: none;
		border: none;
		color: var(--t-1);
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		gap: var(--space-sm);
		transition: background 0.1s;
	}

	.rh-result-item:hover {
		background: var(--bg-3);
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

	.rh-random-btn {
		padding: 10px 32px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-md);
		color: var(--t-1);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.rh-random-btn:hover:not(:disabled) {
		background: var(--bg-4, var(--bg-3));
		border-color: var(--acc);
	}

	.rh-random-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
