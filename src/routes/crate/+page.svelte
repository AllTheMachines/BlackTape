<script lang="ts">
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import type { PageData } from './$types';
	import type { CrateFilters } from '$lib/db/queries';
	import type { ArtistResult } from '$lib/db/queries';
	import { isTauri } from '$lib/platform';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();

	// Decade options: 1950s through 2020s
	const decades = [
		{ label: 'Any decade', min: undefined, max: undefined },
		{ label: '1950s', min: 1950, max: 1960 },
		{ label: '1960s', min: 1960, max: 1970 },
		{ label: '1970s', min: 1970, max: 1980 },
		{ label: '1980s', min: 1980, max: 1990 },
		{ label: '1990s', min: 1990, max: 2000 },
		{ label: '2000s', min: 2000, max: 2010 },
		{ label: '2010s', min: 2010, max: 2020 },
		{ label: '2020s', min: 2020, max: undefined },
	];

	let tagInput = $state(data.filters.tag ?? '');
	let country = $state(data.filters.country ?? '');
	let selectedDecade = $state(decades[0]);
	let loading = $state(false);
	let artists = $state<ArtistResult[]>(data.artists);

	async function dig() {
		if (!isTauri()) return;
		loading = true;
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { getCrateDigArtists } = await import('$lib/db/queries');
			const db = await getProvider();
			const filters: CrateFilters = {
				tag: tagInput.trim() || undefined,
				decadeMin: selectedDecade.min,
				decadeMax: selectedDecade.max,
				country: country.trim() || undefined,
			};
			artists = await getCrateDigArtists(db, filters, 20);
		} catch (e) {
			console.error('Crate dig error:', e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Crate Digging — {PROJECT_NAME}</title>
</svelte:head>

<div class="crate-page">
	{#if !data.isTauri}
		<div class="desktop-only">
			<p>Crate Digging Mode is available in the {PROJECT_NAME} desktop app.</p>
		</div>
	{:else}
		<div class="crate-header">
			<h1 class="page-title">Crate Digging</h1>
			<p class="page-desc">Serendipitous discovery. Pick a filter, flip the crate.</p>
		</div>

		<div class="filters">
			<input
				class="filter-input"
				type="text"
				placeholder="Genre tag (e.g. shoegaze)"
				bind:value={tagInput}
			/>
			<select class="filter-select" bind:value={selectedDecade}>
				{#each decades as d}
					<option value={d}>{d.label}</option>
				{/each}
			</select>
			<input
				class="filter-input"
				type="text"
				placeholder="Country code (e.g. US, GB)"
				bind:value={country}
				maxlength="2"
			/>
			<button class="dig-btn" onclick={dig} disabled={loading}>
				{loading ? 'Digging...' : 'Dig'}
			</button>
		</div>

		{#if artists.length === 0 && !loading}
			<p class="empty-state">No artists found for these filters. Try broadening your search.</p>
		{:else}
			<div class="artist-grid">
				{#each artists as artist}
					<ArtistCard {artist} />
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.crate-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-desc {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0 0 var(--space-lg);
	}

	.filters {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: var(--space-xl);
	}

	.filter-input {
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 4px;
		color: var(--text-primary);
		font-size: 0.875rem;
		padding: 6px 10px;
		width: 180px;
	}

	.filter-input::placeholder {
		color: var(--text-muted);
	}

	.filter-select {
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 4px;
		color: var(--text-primary);
		font-size: 0.875rem;
		padding: 6px 10px;
		cursor: pointer;
	}

	.dig-btn {
		background: var(--text-accent);
		border: none;
		border-radius: 4px;
		color: var(--bg-base);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 6px 20px;
		transition: opacity 0.15s;
	}

	.dig-btn:hover:not(:disabled) { opacity: 0.85; }
	.dig-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.artist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.empty-state, .desktop-only {
		color: var(--text-muted);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-2xl);
	}
</style>
