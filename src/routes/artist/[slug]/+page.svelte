<script lang="ts">
	import { PROJECT_NAME } from '$lib/config';
	import TagChip from '$lib/components/TagChip.svelte';
	import EmbedPlayer from '$lib/components/EmbedPlayer.svelte';
	import ExternalLink from '$lib/components/ExternalLink.svelte';

	let { data } = $props();

	let tags = $derived(
		data.artist.tags
			? data.artist.tags
					.split(', ')
					.filter(Boolean)
			: []
	);

	let hasEmbeddableLinks = $derived(
		data.links.bandcamp.length > 0 ||
		data.links.spotify.length > 0 ||
		data.links.soundcloud.length > 0 ||
		data.links.youtube.length > 0
	);

	let artistMeta = $derived(() => {
		const parts: string[] = [];
		if (data.artist.type) parts.push(data.artist.type);
		if (data.artist.country) parts.push(data.artist.country);
		return parts.join(' \u2014 ');
	});
</script>

<svelte:head>
	<title>{data.artist.name} — {PROJECT_NAME}</title>
	<meta
		name="description"
		content="{data.artist.name}{tags.length > 0 ? ` — ${tags.slice(0, 5).join(', ')}` : ''}"
	/>
</svelte:head>

<div class="artist-page">
	<div class="artist-layout">
		<!-- Left column: Info -->
		<div class="info-column">
			<h1 class="artist-name">{data.artist.name}</h1>

			{#if artistMeta()}
				<p class="artist-meta">{artistMeta()}</p>
			{/if}

			{#if data.artist.begin_year}
				<p class="artist-year">
					{data.artist.begin_year}{data.artist.ended ? ' (disbanded)' : ' — present'}
				</p>
			{/if}

			{#if data.bio}
				<div class="bio">
					<p>{data.bio}</p>
				</div>
			{/if}

			{#if tags.length > 0}
				<div class="tags-section">
					<div class="tags">
						{#each tags as tag}
							<TagChip {tag} />
						{/each}
					</div>
				</div>
			{/if}

			{#if data.links.other.length > 0}
				<div class="other-links">
					{#each data.links.other as url}
						<ExternalLink {url} platform="other" label={new URL(url).hostname} />
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right column: Embeds -->
		<div class="embeds-column">
			{#if hasEmbeddableLinks}
				<EmbedPlayer links={data.links} soundcloudEmbedHtml={data.soundcloudEmbedHtml} />
			{/if}
		</div>
	</div>
</div>

<style>
	.artist-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.artist-layout {
		display: grid;
		grid-template-columns: 5fr 4fr;
		gap: var(--space-2xl);
		align-items: start;
	}

	.artist-name {
		font-size: 2.4rem;
		font-weight: 300;
		letter-spacing: 0.02em;
		color: var(--text-accent);
		margin: 0 0 var(--space-sm);
		line-height: 1.2;
	}

	.artist-meta {
		font-size: 0.95rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-xs);
	}

	.artist-year {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-lg);
	}

	.bio {
		margin-bottom: var(--space-lg);
	}

	.bio p {
		color: var(--text-primary);
		font-size: 0.95rem;
		line-height: 1.65;
		margin: 0;
	}

	.tags-section {
		margin-bottom: var(--space-lg);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.other-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.embeds-column {
		position: sticky;
		top: calc(var(--header-height) + var(--space-lg));
	}

	@media (max-width: 768px) {
		.artist-layout {
			grid-template-columns: 1fr;
			gap: var(--space-lg);
		}

		.artist-name {
			font-size: 1.8rem;
		}

		.embeds-column {
			position: static;
		}
	}
</style>
