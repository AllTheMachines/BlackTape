<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { GeocodedArtist } from '$lib/db/queries';

	let { data } = $props();
	let artists = $derived(data.artists as GeocodedArtist[]);
	let artistSlug = $derived(data.artistSlug as string | null);
	let tagFilter = $derived(data.tagFilter as string | null);

	// Map container ref — Leaflet binds to this element
	let mapEl: HTMLDivElement;
	let map: any = null;
	let clusterGroup: any = null;

	// Precision-tier opacity: city-level pins are fully opaque; country centroids are faded
	const PRECISION_OPACITY: Record<string, number> = {
		city: 1.0,
		region: 0.6,
		country: 0.3
	};

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

		// CRITICAL ORDER: leaflet BEFORE markercluster
		const L = (await import('leaflet')).default;
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

		// Populate markers from loaded artists
		buildMarkers(L, artists);

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
