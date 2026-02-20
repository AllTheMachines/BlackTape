<script lang="ts">
	import { onMount } from 'svelte';
	import { PROJECT_NAME } from '$lib/config';
	import TagChip from '$lib/components/TagChip.svelte';
	import ReleaseCard from '$lib/components/ReleaseCard.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import UniquenessScore from '$lib/components/UniquenessScore.svelte';
	import AiRecommendations from '$lib/components/AiRecommendations.svelte';
	import { LINK_CATEGORY_ORDER, LINK_CATEGORY_LABELS } from '$lib/embeds/types';
	import { isTauri } from '$lib/platform';
	import { getAiProvider } from '$lib/ai/engine';
	import { PROMPTS } from '$lib/ai/prompts';

	let { data } = $props();

	let tags = $derived(
		data.artist.tags
			? data.artist.tags.split(', ').filter(Boolean)
			: []
	);

	let artistMeta = $derived(() => {
		const parts: string[] = [];
		if (data.artist.type) parts.push(data.artist.type);
		if (data.artist.country) parts.push(data.artist.country);
		return parts.join(' \u2014 ');
	});

	let yearRange = $derived(() => {
		if (!data.artist.begin_year) return '';
		return `${data.artist.begin_year}${data.artist.ended ? '' : ' \u2014 present'}`;
	});

	let headerMeta = $derived(() => {
		const meta = artistMeta();
		const year = yearRange();
		if (meta && year) return `${meta} \u00b7 ${year}`;
		return meta || year;
	});

	/** Bio expand/collapse state. */
	let bioExpanded = $state(false);
	let bioNeedsCollapse = $derived(data.bio ? data.bio.length > 500 : false);
	let displayBio = $derived(
		data.bio && !bioExpanded && bioNeedsCollapse
			? data.bio.slice(0, 500) + '...'
			: data.bio
	);

	/** AI-generated summary fallback when Wikipedia bio is unavailable. */
	let aiBio = $state<string | null>(null);

	/** The bio to display: Wikipedia bio takes priority, then AI-generated. */
	let effectiveBio = $derived(data.bio || aiBio);
	let effectiveBioNeedsCollapse = $derived(effectiveBio ? effectiveBio.length > 500 : false);
	let effectiveDisplayBio = $derived(
		effectiveBio && !bioExpanded && effectiveBioNeedsCollapse
			? effectiveBio.slice(0, 500) + '...'
			: effectiveBio
	);

	onMount(() => {
		// Only generate AI bio when Wikipedia bio is missing and AI is ready
		if (data.bio) return;
		if (!isTauri()) return;

		const provider = getAiProvider();
		if (!provider) return;

		(async () => {
			try {
				const tagsStr = data.artist.tags || '';
				const country = data.artist.country || '';
				const result = await provider.complete(
					PROMPTS.artistSummary(data.artist.name, tagsStr, country),
					{ temperature: 0.5, maxTokens: 200 }
				);
				if (result && result.trim()) {
					aiBio = result.trim();
				}
			} catch {
				// AI summary is best-effort — show nothing on failure
			}
		})();
	});

	/** Inline player HTML (set when user clicks SC/YT on a release). */
	let inlinePlayerHtml = $state<string | null>(null);

	function handlePlayInline(html: string) {
		inlinePlayerHtml = html;
	}

	/** Show more releases. */
	let showAllReleases = $state(false);
	let visibleReleases = $derived(
		showAllReleases ? data.releases : data.releases.slice(0, 50)
	);

	/** Streaming links for the "Listen On" bar. */
	let streamingLinks = $derived(data.categorizedLinks.streaming);

	/** Check if categorized links have any content (excluding streaming, shown separately). */
	let hasAnyLinks = $derived(
		LINK_CATEGORY_ORDER.some(cat => data.categorizedLinks[cat].length > 0)
	);
</script>

<svelte:head>
	<title>{data.artist.name} — {PROJECT_NAME}</title>
	<meta
		name="description"
		content="{data.artist.name}{tags.length > 0 ? ` — ${tags.slice(0, 5).join(', ')}` : ''}"
	/>
</svelte:head>

<div class="artist-page">
	<!-- Header -->
	<header class="artist-header">
		<div class="artist-name-row">
			<h1 class="artist-name">{data.artist.name}</h1>
			<UniquenessScore score={data.uniquenessScore} tagCount={data.uniquenessTagCount} />
			<FavoriteButton mbid={data.artist.mbid} name={data.artist.name} slug={data.artist.slug} />
		</div>

		{#if headerMeta()}
			<p class="artist-meta">{headerMeta()}</p>
		{/if}

		{#if tags.length > 0}
			<div class="tags">
				{#each tags as tag}
					<TagChip {tag} />
				{/each}
			</div>
		{/if}

		{#if effectiveBio}
			<div class="bio">
				<p>{effectiveDisplayBio}</p>
				{#if effectiveBioNeedsCollapse}
					<button class="bio-toggle" onclick={() => bioExpanded = !bioExpanded}>
						{bioExpanded ? 'Show less' : 'Read more'}
					</button>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Listen On -->
	{#if streamingLinks.length > 0}
		<section class="listen-on">
			<span class="listen-label">Listen on</span>
			<div class="listen-links">
				{#each streamingLinks as link}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="listen-link"
					>
						{link.label}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Discography -->
	{#if data.releases.length > 0}
		<section class="discography">
			<h2 class="section-title">Discography</h2>

			<div class="releases-grid">
				{#each visibleReleases as release (release.mbid)}
					<ReleaseCard {release} onplayinline={handlePlayInline} />
				{/each}
			</div>

			{#if data.releases.length > 50 && !showAllReleases}
				<button class="show-more" onclick={() => showAllReleases = true}>
					Show all {data.releases.length} releases
				</button>
			{/if}

			{#if inlinePlayerHtml}
				<div class="inline-player">
					{@html inlinePlayerHtml}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Categorized Links -->
	{#if hasAnyLinks}
		<section class="links-section">
			<h2 class="section-title">Links</h2>

			{#each LINK_CATEGORY_ORDER as category}
				{@const links = data.categorizedLinks[category]}
				{#if links.length > 0}
					<div class="link-group">
						<h3 class="link-group-title">{LINK_CATEGORY_LABELS[category]}</h3>
						<div class="link-list">
							{#each links as link}
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="cat-link"
								>
									{link.label}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</section>
	{/if}

	<!-- AI Recommendations -->
	<AiRecommendations
		artistName={data.artist.name}
		artistTags={data.artist.tags || ''}
		artistMbid={data.artist.mbid}
	/>
</div>

<style>
	.artist-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-2xl);
	}

	/* ── Header ────────────────────────────────────────── */
	.artist-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.artist-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.artist-name {
		font-size: 2.4rem;
		font-weight: 300;
		letter-spacing: 0.02em;
		color: var(--text-accent);
		margin: 0;
		line-height: 1.2;
	}

	.artist-meta {
		font-size: 0.95rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
	}

	.bio {
		margin-top: var(--space-sm);
	}

	.bio p {
		color: var(--text-primary);
		font-size: 0.95rem;
		line-height: 1.65;
		margin: 0;
	}

	.bio-toggle {
		background: none;
		border: none;
		color: var(--link-color);
		font-size: 0.85rem;
		padding: 0;
		cursor: pointer;
		margin-top: var(--space-xs);
	}

	.bio-toggle:hover {
		text-decoration: underline;
	}

	/* ── Listen On ────────────────────────────────────── */
	.listen-on {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
	}

	.listen-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.listen-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.listen-link {
		display: inline-flex;
		align-items: center;
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-hover);
		border: 1px solid var(--border-default);
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-accent);
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.listen-link:hover {
		background: color-mix(in srgb, var(--link-color) 10%, var(--bg-hover));
		border-color: var(--link-color);
		text-decoration: none;
	}

	/* ── Section titles ────────────────────────────────── */
	.section-title {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--text-accent);
		margin: 0 0 var(--space-md);
		letter-spacing: 0.02em;
	}

	/* ── Discography ───────────────────────────────────── */
	.discography {
		display: flex;
		flex-direction: column;
	}

	.releases-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-lg);
	}

	.show-more {
		margin-top: var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--card-radius);
		color: var(--text-primary);
		font-size: 0.9rem;
		padding: var(--space-sm) var(--space-lg);
		cursor: pointer;
		align-self: flex-start;
		transition: background 0.15s, border-color 0.15s;
	}

	.show-more:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}

	.inline-player {
		margin-top: var(--space-md);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		overflow: hidden;
	}

	.inline-player :global(iframe) {
		width: 100% !important;
		display: block;
		border: none;
	}

	/* ── Links ─────────────────────────────────────────── */
	.links-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.link-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.link-group-title {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0;
	}

	.link-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.cat-link {
		display: inline-flex;
		align-items: center;
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 999px;
		font-size: 0.85rem;
		color: var(--text-primary);
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.cat-link:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
		text-decoration: none;
	}

	/* ── Responsive ────────────────────────────────────── */
	@media (max-width: 768px) {
		.artist-name {
			font-size: 1.8rem;
		}

		.releases-grid {
			gap: var(--space-md);
		}
	}
</style>
