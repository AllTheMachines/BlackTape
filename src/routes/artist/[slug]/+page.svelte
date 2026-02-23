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
	import { streamingPref } from '$lib/theme/preferences.svelte';
	import { getAiProvider } from '$lib/ai/engine';
	import { PROMPTS } from '$lib/ai/prompts';
	import { openChat, chatState } from '$lib/comms/notifications.svelte.js';

	let { data } = $props();

	let tauriMode = $state(false);

	/** Save to Shelf state (Tauri-only) */
	let savedInCollections = $state<string[]>([]);
	let showSaveDropdown = $state(false);
	let newShelfNameArtist = $state('');
	// collectionsState reference — loaded lazily in onMount Tauri block
	let shelfCollections = $state<Array<{ id: string; name: string }>>([]);

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
		tauriMode = isTauri();
		if (!tauriMode) return;

		(async () => {
			// Load collections for Save to Shelf dropdown
			const { loadCollections, collectionsState, isInAnyCollection } = await import('$lib/taste/collections.svelte');
			if (!collectionsState.isLoaded) await loadCollections();
			shelfCollections = collectionsState.collections;
			savedInCollections = await isInAnyCollection('artist', data.artist.mbid);

			// Only generate AI bio when Wikipedia bio is missing and AI is ready
			if (!data.bio) {
				const provider = getAiProvider();
				if (provider) {
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
				}
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

	/** Streaming links sorted by user's preferred platform — preferred platform first. */
	let sortedStreamingLinks = $derived(
		streamingPref.platform
			? [...streamingLinks].sort((a, b) => {
					const aMatch = a.label.toLowerCase().includes(streamingPref.platform) ? -1 : 0;
					const bMatch = b.label.toLowerCase().includes(streamingPref.platform) ? -1 : 0;
					return aMatch - bMatch;
				})
			: streamingLinks
	);

	/** Check if categorized links have any content (excluding streaming, shown separately). */
	let hasAnyLinks = $derived(
		LINK_CATEGORY_ORDER.some(cat => data.categorizedLinks[cat].length > 0)
	);

	/** Open the chat overlay in rooms view for this artist's primary tag. */
	function openRoomsForArtist() {
		chatState.view = 'rooms';
		openChat('rooms');
	}
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
			{#if tauriMode}
				<div class="save-shelf-wrapper" style="position:relative;">
					<button
						class="save-shelf-btn"
						class:saved={savedInCollections.length > 0}
						onclick={() => showSaveDropdown = !showSaveDropdown}
						aria-label="Save to shelf"
					>
						{savedInCollections.length > 0 ? '✓ Saved' : '+ Save to Shelf'}
					</button>
					{#if showSaveDropdown}
						<div class="shelf-dropdown">
							{#each shelfCollections as col (col.id)}
								<button
									class="shelf-option"
									class:in-collection={savedInCollections.includes(col.id)}
									onclick={async () => {
										const { addToCollection } = await import('$lib/taste/collections.svelte');
										await addToCollection(col.id, 'artist', data.artist.mbid, data.artist.name, data.artist.slug);
										savedInCollections = [...savedInCollections, col.id];
										showSaveDropdown = false;
									}}
								>
									{col.name} {savedInCollections.includes(col.id) ? '✓' : ''}
								</button>
							{/each}
							<div class="new-shelf-inline">
								<input
									class="new-shelf-input-sm"
									type="text"
									bind:value={newShelfNameArtist}
									placeholder="New shelf..."
									onkeydown={async (e) => {
										if (e.key === 'Enter' && newShelfNameArtist.trim()) {
											const { createCollection, addToCollection, collectionsState } = await import('$lib/taste/collections.svelte');
											const id = await createCollection(newShelfNameArtist.trim());
											if (id) {
												await addToCollection(id, 'artist', data.artist.mbid, data.artist.name, data.artist.slug);
												savedInCollections = [...savedInCollections, id];
												shelfCollections = collectionsState.collections;
											}
											newShelfNameArtist = '';
											showSaveDropdown = false;
										}
									}}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if headerMeta()}
			<p class="artist-meta">{headerMeta()}</p>
		{/if}

		{#if tags.length > 0}
			<div class="tags">
				{#each tags as tag}
					<span class="tag-pair">
						<TagChip {tag} />
						<a
							href="/kb/genre/{tag.toLowerCase().replace(/\s+/g, '-')}"
							class="tag-kb-link"
							title="Explore {tag} in Knowledge Base"
						>↗</a>
					</span>
				{/each}
			</div>

			<div class="explore-scene-panel">
				<a
					href="/kb/genre/{tags[0].toLowerCase().replace(/\s+/g, '-')}"
					class="explore-scene-link"
				>
					Explore {tags[0]} scene →
				</a>
			</div>

			<!-- Scene Rooms discovery link -->
			<section class="scene-rooms-hint">
				<button onclick={openRoomsForArtist} class="rooms-link">
					Scene rooms for {tags[0]} &rarr;
				</button>
			</section>
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
	{#if sortedStreamingLinks.length > 0}
		<section class="listen-on">
			<span class="listen-label">Listen on</span>
			<div class="listen-links">
				{#each sortedStreamingLinks as link}
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
					<ReleaseCard {release} artistSlug={data.artist.slug} onplayinline={handlePlayInline} />
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

	.tag-pair {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.tag-kb-link {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-decoration: none;
		vertical-align: super;
		line-height: 1;
		transition: color 0.15s;
	}

	.tag-kb-link:hover {
		color: var(--text-accent);
		text-decoration: none;
	}

	.explore-scene-panel {
		margin-top: var(--space-xs);
	}

	.explore-scene-link {
		font-size: 0.85rem;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	.explore-scene-link:hover {
		color: var(--text-accent);
		text-decoration: none;
	}

	.scene-rooms-hint {
		margin: 4px 0;
	}

	.rooms-link {
		background: none;
		border: 1px solid var(--border-default);
		border-radius: 6px;
		padding: 6px 12px;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.8rem;
		transition: border-color 0.15s, color 0.15s;
	}

	.rooms-link:hover {
		border-color: var(--text-accent);
		color: var(--text-primary);
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

	/* ── Save to Shelf ─────────────────────────────────── */
	.save-shelf-wrapper { display: inline-block; }
	.save-shelf-btn {
		padding: 4px 10px;
		font-size: 0.8rem;
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--text-primary);
		border-radius: 4px;
		cursor: pointer;
	}
	.save-shelf-btn.saved { border-color: var(--accent); color: var(--accent); }
	.shelf-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 50;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		min-width: 160px;
		padding: 4px 0;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
	}
	.shelf-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 6px 12px;
		background: none;
		border: none;
		color: var(--text-primary);
		font-size: 0.85rem;
		cursor: pointer;
	}
	.shelf-option:hover { background: var(--bg-tertiary); }
	.shelf-option.in-collection { color: var(--accent); }
	.new-shelf-inline { padding: 4px 8px; border-top: 1px solid var(--border); }
	.new-shelf-input-sm {
		width: 100%;
		padding: 4px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 3px;
		font-size: 0.8rem;
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
