<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { GeocodedArtist } from '$lib/db/queries';

	let { data } = $props();
	let artists = $derived(data.artists as GeocodedArtist[]);
	let artistSlug = $derived(data.artistSlug as string | null);
	let tagFilter = $derived(data.tagFilter as string | null);

	// Map container ref — Leaflet binds to this element
	let mapEl: HTMLDivElement;
	let map: any = null;
	let clusterGroup: any = null;
	let leafletRef: any = null; // stored so $effect can access L after onMount

	// Tag filter state
	let activeTag = $state('');
	let tagSuggestions = $state<Array<{ tag: string; artist_count: number }>>([]);
	let showSuggestions = $state(false);
	let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let db: any = null; // DB provider for autocomplete queries

	// Precision-tier opacity: city-level pins are fully opaque; country centroids are faded
	const PRECISION_OPACITY: Record<string, number> = {
		city: 1.0,
		region: 0.6,
		country: 0.3
	};

	// In-memory tag filter — filters artist list by exact tag match (comma-separated tags field)
	function getFilteredArtists(): GeocodedArtist[] {
		if (!activeTag.trim()) return artists;
		const lower = activeTag.trim().toLowerCase();
		return artists.filter((a) =>
			a.tags
				?.split(',')
				.some((t) => t.trim().toLowerCase() === lower)
		);
	}

	// Filtered count for display in the chip
	let filteredCount = $derived(activeTag.trim() ? getFilteredArtists().length : artists.length);

	// Rebuild markers whenever activeTag or artists changes (after map is initialized)
	$effect(() => {
		// Track reactive dependencies
		const _tag = activeTag;
		const _artists = artists;
		if (!map || !clusterGroup || !leafletRef) return;
		buildMarkers(leafletRef, getFilteredArtists());
	});

	// URL sync — replaceState avoids history pollution on every keystroke
	async function handleTagInput(value: string) {
		activeTag = value;
		const url = value.trim()
			? `/world-map?tag=${encodeURIComponent(value.trim())}`
			: '/world-map';
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });

		// Autocomplete suggestions from DB (debounced 150ms)
		if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
		if (value.trim().length >= 2 && db) {
			filterDebounceTimer = setTimeout(async () => {
				const { searchTagsAutocomplete } = await import('$lib/db/queries');
				tagSuggestions = await searchTagsAutocomplete(db, value.trim(), 8);
				showSuggestions = tagSuggestions.length > 0;
			}, 150);
		} else {
			tagSuggestions = [];
			showSuggestions = false;
		}
	}

	function selectSuggestion(tag: string) {
		activeTag = tag;
		showSuggestions = false;
		const url = `/world-map?tag=${encodeURIComponent(tag)}`;
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function buildMarkers(L: any, artistList: GeocodedArtist[]) {
		clusterGroup.clearLayers();
		for (const artist of artistList) {
			const opacity = PRECISION_OPACITY[artist.city_precision] ?? 0.3;
			const marker = L.circleMarker([artist.city_lat, artist.city_lng], {
				radius: 6,
				fillColor: '#c4a55a',
				color: '#c4a55a',
				weight: 1,
				opacity,
				fillOpacity: opacity
			});
			// TODO Plan 05: wire marker click
			// marker.on('click', () => { ... });
			// Store artist data on marker for Plan 05
			(marker as any)._artistData = artist;
			clusterGroup.addLayer(marker);
		}
	}

	onMount(async () => {
		// Inject Leaflet base CSS
		if (!document.querySelector('link[data-leaflet]')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			link.setAttribute('data-leaflet', '1');
			document.head.appendChild(link);
		}

		// Inject MarkerCluster CSS — BOTH files required (structural + visual)
		if (!document.querySelector('link[data-leaflet-mc]')) {
			['MarkerCluster.css', 'MarkerCluster.Default.css'].forEach((file, i) => {
				const lnk = document.createElement('link');
				lnk.rel = 'stylesheet';
				lnk.href = `https://unpkg.com/leaflet.markercluster@1.5.3/dist/${file}`;
				lnk.setAttribute(i === 0 ? 'data-leaflet-mc' : 'data-leaflet-mc-d', '1');
				document.head.appendChild(lnk);
			});
		}

		// Initialize filter from URL param (pre-filter support)
		if (tagFilter) {
			activeTag = tagFilter;
		}
		// Store DB provider for autocomplete
		const { getProvider } = await import('$lib/db/provider');
		db = await getProvider();

		// CRITICAL ORDER: leaflet BEFORE markercluster
		const L = (await import('leaflet')).default;
		leafletRef = L; // store so $effect can access L after onMount
		await import('leaflet.markercluster'); // side-effect: patches L

		// Initialize map
		map = L.map(mapEl, { zoomControl: true }).setView([20, 0], 2);
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
			attribution:
				'© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);

		// Amber cluster group
		clusterGroup = (L as any).markerClusterGroup({
			maxClusterRadius: 60,
			iconCreateFunction: (cluster: any) => {
				const count = cluster.getChildCount();
				return L.divIcon({
					html: `<div class="wm-cluster">${count}</div>`,
					className: '',
					iconSize: L.point(36, 36)
				});
			}
		});
		map.addLayer(clusterGroup);

		// Populate markers — apply filter if activeTag is set (from URL param)
		buildMarkers(L, getFilteredArtists());

		// Resolve any size calculation issues from deferred CSS/layout
		map.invalidateSize();
	});

	onDestroy(() => {
		map?.remove();
		map = null;
	});
</script>

<div class="wm-root">
	<div class="wm-map" bind:this={mapEl}></div>

	<!-- Tag Filter Chip -->
	<div class="wm-filter">
		<div class="wm-filter-input-wrap">
			<input
				type="text"
				class="wm-filter-input"
				placeholder="Filter by tag..."
				value={activeTag}
				oninput={(e) => handleTagInput((e.target as HTMLInputElement).value)}
				onfocus={() => {
					if (tagSuggestions.length > 0) showSuggestions = true;
				}}
				onblur={() =>
					setTimeout(() => {
						showSuggestions = false;
					}, 150)}
			/>
			{#if activeTag}
				<button
					class="wm-filter-clear"
					onclick={() => {
						activeTag = '';
						tagSuggestions = [];
						showSuggestions = false;
						goto('/world-map', { replaceState: true, noScroll: true });
					}}
					title="Clear filter">✕</button
				>
			{/if}
		</div>
		<span class="wm-filter-count">{filteredCount.toLocaleString()} artists</span>

		{#if showSuggestions}
			<div class="wm-suggestions">
				{#each tagSuggestions as s}
					<button class="wm-suggestion" onmousedown={() => selectSuggestion(s.tag)}>
						{s.tag}
						<span class="wm-suggestion-count">{s.artist_count.toLocaleString()}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.wm-root {
		position: relative;
		width: 100%;
		height: calc(100vh - var(--titlebar-height, 32px) - var(--player-height, 0px));
		background: #0f0f0f;
		overflow: hidden;
	}

	.wm-map {
		width: 100%;
		height: 100%;
	}

	.wm-filter {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 200px;
		max-width: 280px;
	}

	.wm-filter-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.wm-filter-input {
		width: 100%;
		padding: 8px 32px 8px 12px;
		background: rgba(15, 15, 15, 0.88);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: var(--t-1);
		font-size: 0.8125rem;
		outline: none;
	}

	.wm-filter-input::placeholder {
		color: var(--t-4);
	}

	.wm-filter-input:focus {
		border-color: var(--acc);
	}

	.wm-filter-clear {
		position: absolute;
		right: 8px;
		background: none;
		border: none;
		color: var(--t-4);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 2px;
		line-height: 1;
	}

	.wm-filter-clear:hover {
		color: var(--t-2);
	}

	.wm-filter-count {
		font-size: 0.6875rem;
		color: var(--t-4);
		padding-left: 2px;
	}

	.wm-suggestions {
		background: rgba(15, 15, 15, 0.95);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		overflow: hidden;
		max-height: 200px;
		overflow-y: auto;
	}

	.wm-suggestion {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 7px 12px;
		background: none;
		border: none;
		color: var(--t-2);
		font-size: 0.8125rem;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}

	.wm-suggestion:hover {
		background: rgba(196, 165, 90, 0.1);
		color: var(--t-1);
	}

	.wm-suggestion-count {
		font-size: 0.6875rem;
		color: var(--t-4);
		flex-shrink: 0;
	}

	/* Amber cluster bubble — matches wm-cluster divIcon html */
	:global(.wm-cluster) {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #c4a55a;
		color: #000;
		font-size: 0.75rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid rgba(196, 165, 90, 0.3);
	}
</style>
