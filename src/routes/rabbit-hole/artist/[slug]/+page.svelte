<script lang="ts">
	import { goto } from '$app/navigation';
	import { pushTrailItem } from '$lib/rabbit-hole/trail.svelte';
	import RabbitHoleArtistCard from '$lib/components/RabbitHoleArtistCard.svelte';

	let { data } = $props();
	let { artist, similarArtists, links } = $derived(data);

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
{:else}
	<div class="rh-card-wrap">
		<div class="rh-not-found">Artist not found.</div>
	</div>
{/if}

<style>
	.rh-card-wrap { padding: var(--space-xl); display: flex; justify-content: center; }
	.rh-not-found { color: var(--t-3); font-size: 0.875rem; }
</style>
