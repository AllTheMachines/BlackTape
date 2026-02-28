<script lang="ts">
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import type { PageData } from './$types';
	import type { CrateFilters } from '$lib/db/queries';
	import type { ArtistResult } from '$lib/db/queries';
	import { isTauri } from '$lib/platform';
	import { PROJECT_NAME } from '$lib/config';
	let { data }: { data: PageData } = $props();

	// Country options: common countries in music databases mapped to ISO codes
	const COUNTRIES = [
		{ name: 'Any country', code: '' },
		{ name: 'United States', code: 'US' },
		{ name: 'United Kingdom', code: 'GB' },
		{ name: 'Germany', code: 'DE' },
		{ name: 'France', code: 'FR' },
		{ name: 'Japan', code: 'JP' },
		{ name: 'Canada', code: 'CA' },
		{ name: 'Australia', code: 'AU' },
		{ name: 'Sweden', code: 'SE' },
		{ name: 'Norway', code: 'NO' },
		{ name: 'Finland', code: 'FI' },
		{ name: 'Denmark', code: 'DK' },
		{ name: 'Netherlands', code: 'NL' },
		{ name: 'Belgium', code: 'BE' },
		{ name: 'Switzerland', code: 'CH' },
		{ name: 'Austria', code: 'AT' },
		{ name: 'Italy', code: 'IT' },
		{ name: 'Spain', code: 'ES' },
		{ name: 'Portugal', code: 'PT' },
		{ name: 'Brazil', code: 'BR' },
		{ name: 'Argentina', code: 'AR' },
		{ name: 'Mexico', code: 'MX' },
		{ name: 'Colombia', code: 'CO' },
		{ name: 'Chile', code: 'CL' },
		{ name: 'Poland', code: 'PL' },
		{ name: 'Czech Republic', code: 'CZ' },
		{ name: 'Hungary', code: 'HU' },
		{ name: 'Russia', code: 'RU' },
		{ name: 'Ukraine', code: 'UA' },
		{ name: 'Greece', code: 'GR' },
		{ name: 'Turkey', code: 'TR' },
		{ name: 'Israel', code: 'IL' },
		{ name: 'South Korea', code: 'KR' },
		{ name: 'China', code: 'CN' },
		{ name: 'Taiwan', code: 'TW' },
		{ name: 'Hong Kong', code: 'HK' },
		{ name: 'India', code: 'IN' },
		{ name: 'Iceland', code: 'IS' },
		{ name: 'Ireland', code: 'IE' },
		{ name: 'New Zealand', code: 'NZ' },
		{ name: 'South Africa', code: 'ZA' },
		{ name: 'Nigeria', code: 'NG' },
		{ name: 'Ghana', code: 'GH' },
		{ name: 'Jamaica', code: 'JM' },
		{ name: 'Cuba', code: 'CU' },
		{ name: 'Romania', code: 'RO' },
		{ name: 'Serbia', code: 'RS' },
		{ name: 'Croatia', code: 'HR' },
		{ name: 'Slovakia', code: 'SK' },
		{ name: 'Bulgaria', code: 'BG' },
		{ name: 'Lithuania', code: 'LT' },
		{ name: 'Latvia', code: 'LV' },
		{ name: 'Estonia', code: 'EE' },
		{ name: 'Indonesia', code: 'ID' },
		{ name: 'Philippines', code: 'PH' },
		{ name: 'Thailand', code: 'TH' },
		{ name: 'Vietnam', code: 'VN' },
		{ name: 'Singapore', code: 'SG' },
		{ name: 'Malaysia', code: 'MY' },
		{ name: 'Egypt', code: 'EG' },
		{ name: 'Morocco', code: 'MA' },
	];

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
	let selectedCountryCode = $state(data.filters.country ?? '');
	let selectedDecadeIndex = $state(0);
	let selectedDecade = $derived(decades[selectedDecadeIndex]);
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
				country: selectedCountryCode || undefined,
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
		<div class="crate-header discover-mode-desc">
			<h2>Crate Digging</h2>
			<p>Serendipitous discovery. Pick a filter, flip the crate — random artists surface from the bottom of the pile.</p>
		</div>

		<div class="filters">
			<input
				class="filter-input"
				type="text"
				placeholder="Genre tag (e.g. shoegaze)"
				bind:value={tagInput}
			/>
			<select class="filter-select" bind:value={selectedDecadeIndex}>
				{#each decades as d, i}
					<option value={i}>{d.label}</option>
				{/each}
			</select>
			<select class="filter-select" bind:value={selectedCountryCode}>
				{#each COUNTRIES as c}
					<option value={c.code}>{c.name}</option>
				{/each}
			</select>
			<button class="dig-btn" onclick={dig} disabled={loading}>
				{loading ? 'Digging...' : 'Dig'}
			</button>
		</div>

		{#if artists.length === 0 && !loading}
			<p class="empty-state">No artists found for these filters. Try broadening your search.</p>
		{:else}
			<div class="artist-grid">
				{#each artists as artist}
					<div class="crate-result">
						<ArtistCard {artist} />
						<div class="crate-cross-links">
							{#if artist.tags}
								{@const primaryTag = artist.tags.split(', ')[0]}
								<a
									href="/style-map?tag={encodeURIComponent(primaryTag)}"
									class="crate-cross-link"
								>Explore in Style Map →</a>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.crate-page {
		padding: 20px;
	}

	.discover-mode-desc {
		padding: 10px 16px 8px;
		border-bottom: 1px solid var(--b-0);
		background: var(--bg-1);
		margin: -20px -20px 20px;
	}
		.discover-mode-desc h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 3px;
	}
	.discover-mode-desc p {
		font-size: 12px;
		color: var(--t-2);
		margin: 0;
		line-height: 1.5;
	}

	.filters {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: var(--space-xl);
	}

	.filter-input {
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: 0;
		color: var(--t-1);
		font-size: 0.875rem;
		padding: 6px 10px;
		width: 180px;
	}

	.filter-input::placeholder {
		color: var(--t-3);
	}

	.filter-select {
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: 0;
		color: var(--t-1);
		font-size: 0.875rem;
		padding: 6px 10px;
		cursor: pointer;
	}

	.dig-btn {
		background: var(--acc);
		border: none;
		border-radius: 0;
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

	.crate-result { display: flex; flex-direction: column; gap: var(--space-xs); }
	.crate-cross-links { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
	.crate-cross-link {
		font-size: 0.75rem;
		color: var(--t-3);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		font-family: inherit;
		transition: color 0.15s;
	}
	.crate-cross-link:hover { color: var(--acc); }

	.empty-state, .desktop-only {
		color: var(--t-3);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-2xl);
	}
</style>
