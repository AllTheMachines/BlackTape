<script lang="ts">
	import { goto } from '$app/navigation';
	import { pushTrailItem } from '$lib/rabbit-hole/trail.svelte';
	import RabbitHoleArtistCard from '$lib/components/RabbitHoleArtistCard.svelte';

	let { data } = $props();
	let { artist, similarArtists, links } = $derived(data);
	let hasGeocoordinates = $derived(data.hasGeocoordinates as boolean);

	function navigateToArtist(slug: string, name: string) {
		pushTrailItem({ type: 'artist', slug, name });
		goto(`/rabbit-hole/artist/${slug}`, { keepFocus: true, noScroll: true });
	}

	function navigateToTag(tag: string) {
		const slug = encodeURIComponent(tag.trim());
		pushTrailItem({ type: 'tag', slug, name: tag.trim() });
		goto(`/rabbit-hole/tag/${slug}`, { keepFocus: true, noScroll: true });
	}
</script>

{#if artist}
	<RabbitHoleArtistCard
		{artist}
		{similarArtists}
		{links}
		onTagClick={navigateToTag}
		onSimilarArtistClick={navigateToArtist}
		showOpenInRabbitHole={false}
	/>
	{#if hasGeocoordinates}
		<div class="rh-map-link-wrap">
			<a href="/world-map?artist={artist.slug}" class="rh-map-link">
				See on map
			</a>
		</div>
	{/if}
{:else}
	<div class="rh-card-wrap">
		<div class="rh-not-found">Artist not found.</div>
	</div>
{/if}

<style>
	.rh-card-wrap { padding: var(--space-xl); display: flex; justify-content: center; }
	.rh-not-found { color: var(--t-3); font-size: 0.875rem; }

	.rh-map-link-wrap {
		padding: 0 var(--space-xl) var(--space-xl);
		display: flex;
		justify-content: center;
	}

	.rh-map-link {
		font-size: 0.8125rem;
		color: var(--t-3);
		text-decoration: none;
		padding: 5px 12px;
		border: 1px solid var(--b-1);
		border-radius: var(--radius-sm);
		transition: color 0.15s, border-color 0.15s;
	}

	.rh-map-link:hover {
		color: var(--acc);
		border-color: var(--acc);
	}
</style>
