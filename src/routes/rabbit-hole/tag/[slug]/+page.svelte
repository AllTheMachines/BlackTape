<script lang="ts">
	import { goto } from '$app/navigation';
	import { pushTrailItem } from '$lib/rabbit-hole/trail.svelte';
	import type { ArtistResult, GenreNode } from '$lib/db/queries';

	let { data } = $props();
	let tag = $derived(data.tag as string);
	let artists = $derived(data.artists as ArtistResult[]);
	let relatedTags = $derived(data.relatedTags as Array<{ tag: string; shared_artists: number }>);
	let genre = $derived(data.genre as GenreNode | null);

	function navigateToArtist(slug: string, name: string) {
		pushTrailItem({ type: 'artist', slug, name });
		goto(`/rabbit-hole/artist/${slug}`, { keepFocus: true, noScroll: true });
	}

	function navigateToTag(t: string) {
		const slug = encodeURIComponent(t);
		pushTrailItem({ type: 'tag', slug, name: t });
		goto(`/rabbit-hole/tag/${slug}`, { keepFocus: true, noScroll: true });
	}

	function reshuffle() {
		// Navigate to same URL to re-run the load function → fresh random 20
		goto(`/rabbit-hole/tag/${encodeURIComponent(tag)}`, {
			keepFocus: true,
			noScroll: false,
			invalidateAll: true
		});
	}
</script>

<div class="rh-genre-wrap">
	<div class="rh-genre">

		<!-- Header -->
		<div class="rh-genre-header">
			<h1 class="rh-genre-name">{tag}</h1>
			{#if genre?.inception_year}
				<span class="rh-genre-meta">since {genre.inception_year}</span>
			{/if}
			{#if genre?.origin_city}
				<span class="rh-genre-meta">{genre.origin_city}</span>
			{/if}
			<a href="/world-map?tag={encodeURIComponent(tag)}" class="rh-map-link">
				See on map
			</a>
		</div>

		<!-- Artists -->
		<div class="rh-section">
			<div class="rh-section-header">
				<span class="rh-section-label">Artists</span>
				<button class="rh-reshuffle" onclick={reshuffle} title="Load a different set">
					&#x21BB; Reshuffle
				</button>
			</div>
			{#if artists.length === 0}
				<div class="rh-empty">No artists found for this tag.</div>
			{:else}
				<div class="rh-artist-chips">
					{#each artists as a}
						<button
							class="rh-artist-chip"
							onclick={() => navigateToArtist(a.slug, a.name)}
							title={a.country ?? a.name}
						>
							{a.name}
							{#if a.country}
								<span class="rh-chip-country">{a.country}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Related Tags -->
		<div class="rh-section">
			<div class="rh-section-label">Related Genres &amp; Tags</div>
			{#if relatedTags.length > 0}
				<div class="rh-related-chips">
					{#each relatedTags as rt}
						<button
							class="rh-related-chip"
							onclick={() => navigateToTag(rt.tag)}
							title="{rt.shared_artists} shared artists"
						>
							{rt.tag}
						</button>
					{/each}
				</div>
			{:else}
				<div class="rh-empty">No related genres found — this tag is one of a kind.</div>
			{/if}
		</div>

	</div>
</div>

<style>
	.rh-genre-wrap {
		padding: var(--space-xl);
		display: flex;
		justify-content: center;
	}

	.rh-genre {
		width: 100%;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.rh-genre-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.rh-genre-name {
		font-size: 2rem;
		font-weight: 700;
		color: var(--t-1);
		margin: 0;
		text-transform: capitalize;
	}

	.rh-genre-meta {
		font-size: 0.875rem;
		color: var(--t-3);
	}

	.rh-map-link {
		font-size: 0.8125rem;
		color: var(--t-3);
		text-decoration: none;
		padding: 5px 12px;
		border: 1px solid var(--b-1);
		border-radius: var(--radius-sm);
		transition: color 0.15s, border-color 0.15s;
		margin-left: auto;
	}

	.rh-map-link:hover {
		color: var(--acc);
		border-color: var(--acc);
	}

	.rh-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.rh-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.rh-section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--t-4);
	}

	.rh-reshuffle {
		background: none;
		border: none;
		color: var(--t-3);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.rh-reshuffle:hover {
		color: var(--t-1);
	}

	.rh-empty {
		color: var(--t-4);
		font-size: 0.875rem;
	}

	.rh-artist-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.rh-artist-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 12px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: 999px;
		color: var(--t-2);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.rh-artist-chip:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.rh-chip-country {
		font-size: 0.6875rem;
		color: var(--t-4);
		background: var(--bg-3);
		padding: 1px 5px;
		border-radius: 3px;
	}

	.rh-related-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.rh-related-chip {
		padding: 4px 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 999px;
		color: var(--t-3);
		font-size: 0.75rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.rh-related-chip:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}
</style>
