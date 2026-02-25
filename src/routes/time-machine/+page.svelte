<script lang="ts">
	import type { PageData } from './$types';
	import ArtistCard from '$lib/components/ArtistCard.svelte';
	import GenreGraphEvolution from '$lib/components/GenreGraphEvolution.svelte';
	import { isTauri } from '$lib/platform';
	import { onMount } from 'svelte';
	import type { GenreNode, GenreEdge } from '$lib/db/queries';

	let { data }: { data: PageData } = $props();

	// --- State ---
	let currentYear = $state(data.year);
	let tagFilter = $state('');
	let artists = $state(data.artists);
	let loading = $state(false);

	// Genre graph data — loaded once on mount (all genres, filtered client-side by year)
	let allGenreNodes = $state<GenreNode[]>([]);
	let allGenreEdges = $state<GenreEdge[]>([]);

	// Decade definitions
	const THIS_YEAR = new Date().getFullYear();
	const DECADES = [
		{ label: '60s', start: 1960, end: 1969 },
		{ label: '70s', start: 1970, end: 1979 },
		{ label: '80s', start: 1980, end: 1989 },
		{ label: '90s', start: 1990, end: 1999 },
		{ label: '00s', start: 2000, end: 2009 },
		{ label: '10s', start: 2010, end: 2019 },
		{ label: '20s', start: 2020, end: THIS_YEAR },
	];

	let activeDecade = $state(DECADES.find(d => currentYear >= d.start && currentYear <= d.end) ?? DECADES[3]);

	// --- Fetch artists on year/tag change ---
	// CRITICAL: Tauri has no server — fetch() to /api/time-machine would silently fail.
	// Tauri path: dynamic import provider + direct DB query (mirror crate/+page.svelte pattern).
	// Web path: fetch /api/time-machine.
	async function loadYear(year: number, tag?: string) {
		loading = true;
		try {
			if (isTauri()) {
				// Tauri: direct DB query — no fetch (adapter-static has no server)
				const { getProvider } = await import('$lib/db/provider');
				const { getArtistsByYear } = await import('$lib/db/queries');
				const db = await getProvider();
				artists = await getArtistsByYear(db, year, tag, 50);
				currentYear = year;
			} else {
				// Web: API fetch
				const params = new URLSearchParams({ year: String(year) });
				if (tag) params.set('tag', tag);
				const resp = await fetch(`/api/time-machine?${params}`);
				if (resp.ok) {
					const result = await resp.json() as { artists: typeof artists; year: number };
					artists = result.artists;
					currentYear = year;
				}
			}
		} catch { /* best-effort */ } finally {
			loading = false;
		}
	}

	function selectDecade(decade: typeof DECADES[0]) {
		activeDecade = decade;
		const mid = Math.floor((decade.start + decade.end) / 2);
		currentYear = mid;
		loadYear(mid, tagFilter || undefined);
	}

	let slideTimer: ReturnType<typeof setTimeout>;
	let tagTimer: ReturnType<typeof setTimeout>;

	function onYearSlide(e: Event) {
		const year = parseInt((e.target as HTMLInputElement).value, 10);
		currentYear = year;
		clearTimeout(slideTimer);
		slideTimer = setTimeout(() => loadYear(year, tagFilter || undefined), 300);
	}

	function onTagFilter(e: Event) {
		tagFilter = (e.target as HTMLInputElement).value;
		clearTimeout(tagTimer);
		tagTimer = setTimeout(() => loadYear(currentYear, tagFilter || undefined), 500);
	}

	// Load ALL genre data on mount for the evolution view.
	// Tauri: calls getAllGenreGraph() directly (defined in plan 07-02 queries.ts).
	// Web: calls GET /api/genres (defined in Task 2 of this plan) which returns { nodes, edges }.
	onMount(async () => {
		try {
			if (isTauri()) {
				const { getProvider } = await import('$lib/db/provider');
				const { getAllGenreGraph } = await import('$lib/db/queries');
				const db = await getProvider();
				const graph = await getAllGenreGraph(db);
				allGenreNodes = graph.nodes;
				allGenreEdges = graph.edges;
			} else {
				// Web: /api/genres returns { nodes: GenreNode[], edges: GenreEdge[] }
				const resp = await fetch('/api/genres');
				if (resp.ok) {
					const graph = await resp.json() as { nodes: GenreNode[]; edges: GenreEdge[] };
					allGenreNodes = graph.nodes ?? [];
					allGenreEdges = graph.edges ?? [];
				}
			}
		} catch { /* graph evolution is best-effort — page still works without it */ }
	});
</script>

<svelte:head>
	<title>Time Machine — Mercury</title>
</svelte:head>

<div class="time-machine">
	<div class="tm-header">
		<h1>Time Machine</h1>
		<p class="tm-subtitle">Browse artists by the year they formed. Watch genres emerge over time.</p>
	</div>

	<!-- Decade buttons -->
	<div class="decade-buttons">
		{#each DECADES as decade}
			<button
				class="decade-btn"
				class:active={activeDecade.label === decade.label}
				onclick={() => selectDecade(decade)}
			>{decade.label}</button>
		{/each}
	</div>

	<!-- Fine year scrub within selected decade -->
	<div class="year-scrub">
		<label for="year-slider" class="year-label">{currentYear}</label>
		<input
			id="year-slider"
			type="range"
			min={activeDecade.start}
			max={Math.min(activeDecade.end, THIS_YEAR)}
			value={currentYear}
			oninput={onYearSlide}
			class="year-slider"
		/>
	</div>

	<!-- View 1: Animated genre graph evolution -->
	{#if allGenreNodes.length > 0}
		<div class="genre-evolution-panel">
			<GenreGraphEvolution
				{currentYear}
				allNodes={allGenreNodes}
				allEdges={allGenreEdges}
			/>
		</div>
	{/if}

	<!-- Optional tag filter -->
	<div class="tag-filter-row">
		<input
			type="text"
			placeholder="Filter by genre tag (e.g. jazz, punk, ambient)…"
			value={tagFilter}
			oninput={onTagFilter}
			class="tag-input"
		/>
	</div>

	<!-- View 2: Year snapshot heading -->
	<div class="year-snapshot">
		<h2>What was happening in {currentYear}</h2>
		{#if loading}
			<p class="loading-hint">Loading…</p>
		{/if}
	</div>

	<div class="tm-cross-links">
		<a
			href="/discover?era={encodeURIComponent(activeDecade.label)}"
			class="tm-cross-link"
		>Explore {activeDecade.label} artists in Discover →</a>
	</div>

	<!-- View 3: Filtered artist list -->
	{#if artists.length > 0}
		<div class="artist-grid">
			{#each artists as artist}
				<ArtistCard {artist} />
			{/each}
		</div>
	{:else if !loading}
		<div class="no-results">
			<p>No artists found for {currentYear}{tagFilter ? ` · "${tagFilter}"` : ''}.</p>
			<p class="no-results-hint">Try a different year or remove the tag filter.</p>
		</div>
	{/if}
</div>

<style>
	.time-machine { max-width: 1100px; margin: 0 auto; padding: 20px; }
	.tm-header { margin-bottom: 1.5rem; }
	.tm-header h1 { font-size: 1.75rem; }
	.tm-subtitle { color: var(--t-3); font-size: 0.9rem; margin-top: 0.25rem; }

	.decade-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
	.decade-btn {
		padding: 0.4rem 1rem; border-radius: 999px; border: 1px solid var(--b-2);
		background: transparent; cursor: pointer; font-size: 0.85rem; color: inherit;
		transition: background 0.15s, border-color 0.15s;
	}
	.decade-btn:hover { background: var(--bg-3); }
	.decade-btn.active { background: var(--acc); border-color: var(--acc); color: #000; }

	.year-scrub { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
	.year-label { font-size: 1.5rem; font-weight: 600; min-width: 3.5rem; text-align: right; }
	.year-slider { flex: 1; accent-color: var(--acc); }

	.genre-evolution-panel { margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden; background: var(--bg-3); }

	.tag-filter-row { margin-bottom: 1.5rem; }
	.tag-input {
		width: 100%; max-width: 400px; padding: 0.5rem 0.75rem;
		background: var(--bg-3); border: 1px solid var(--b-2);
		border-radius: 6px; color: inherit; font-size: 0.9rem;
	}

	.year-snapshot { margin-bottom: 1.25rem; }
	.year-snapshot h2 { font-size: 1.2rem; }
	.loading-hint { color: var(--t-3); font-size: 0.85rem; }

	.tm-cross-links { margin-bottom: 1rem; }
	.tm-cross-link {
		font-size: 0.8rem;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.15s;
	}
	.tm-cross-link:hover { color: var(--acc); }

	.artist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
	.no-results { text-align: center; padding: 3rem; color: var(--t-3); }
	.no-results-hint { font-size: 0.85rem; margin-top: 0.5rem; }
</style>
