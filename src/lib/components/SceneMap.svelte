<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { lat, lng, cityName, zoom = 10 }: { lat: number; lng: number; cityName: string; zoom?: number } =
		$props();

	let mapEl: HTMLDivElement;
	let map: any = null;

	onMount(async () => {
		// Dynamic import — NEVER top-level (Leaflet accesses window at import time)
		const L = (await import('leaflet')).default;

		// Inject Leaflet CSS via link element — dynamic CSS import can be rejected by Vite
		if (!document.querySelector('link[data-leaflet]')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			link.setAttribute('data-leaflet', '1');
			document.head.appendChild(link);
		}

		map = L.map(mapEl).setView([lat, lng], zoom);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
		}).addTo(map);
		L.marker([lat, lng]).addTo(map).bindPopup(cityName).openPopup();
	});

	onDestroy(() => {
		map?.remove();
		map = null;
	});
</script>

<div bind:this={mapEl} class="scene-map"></div>

<style>
	.scene-map {
		height: 280px;
		width: 100%;
		border-radius: 0;
		overflow: hidden;
	}
</style>
