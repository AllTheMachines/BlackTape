<script lang="ts">
	import type { GeocodedArtist } from '$lib/db/queries';

	let { data } = $props();
	let artists = $derived(data.artists as GeocodedArtist[]);
	let artistSlug = $derived(data.artistSlug as string | null);
	let tagFilter = $derived(data.tagFilter as string | null);

	// Map container ref — Leaflet binds to this element in onMount (Plan 03)
	let mapEl: HTMLDivElement;
</script>

<div class="wm-root">
	<div class="wm-map" bind:this={mapEl}>
		<!-- Leaflet map initializes here in Plan 03 -->
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
</style>
