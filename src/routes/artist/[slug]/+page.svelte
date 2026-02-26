<script lang="ts">
	import { onMount } from 'svelte';
	import { PROJECT_NAME } from '$lib/config';
	import TagChip from '$lib/components/TagChip.svelte';
	import ReleaseCard from '$lib/components/ReleaseCard.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import UniquenessScore from '$lib/components/UniquenessScore.svelte';
	import AiRecommendations from '$lib/components/AiRecommendations.svelte';
	import RssButton from '$lib/components/RssButton.svelte';
	import ArtistStats from '$lib/components/ArtistStats.svelte';
	import ArtistSummary from '$lib/components/ArtistSummary.svelte';
	import ArtistRelationships from '$lib/components/ArtistRelationships.svelte';
	import SiteGenDialog from '$lib/components/SiteGenDialog.svelte';
	import { LINK_CATEGORY_ORDER, LINK_CATEGORY_LABELS } from '$lib/embeds/types';
	import { isTauri } from '$lib/platform';
	import { streamingPref } from '$lib/theme/preferences.svelte';

	import { openChat, chatState } from '$lib/comms/notifications.svelte.js';
	import { generateEmbedSnippets } from '$lib/curator/embed-snippet';
	import { page } from '$app/stores';
	import { setQueue, addToQueue } from '$lib/player/queue.svelte';
	import type { PlayerTrack } from '$lib/player/state.svelte';

	let { data } = $props();

	let tauriMode = $state(false);
	let activeTab = $state<'overview' | 'stats' | 'about'>('overview');
	let showSiteGen = $state(false);

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

	let hasRelationships = $derived(
		data.relationships.members.length > 0 ||
		data.relationships.influencedBy.length > 0 ||
		data.relationships.influenced.length > 0 ||
		data.relationships.labels.length > 0
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

	/** Bio expand/collapse state (Wikipedia bio only — AI summary is in ArtistSummary component). */
	let bioExpanded = $state(false);
	let effectiveBio = $derived(data.bio);
	let effectiveBioNeedsCollapse = $derived(effectiveBio ? effectiveBio.length > 500 : false);
	let effectiveDisplayBio = $derived(
		effectiveBio && !bioExpanded && effectiveBioNeedsCollapse
			? effectiveBio.slice(0, 500) + '...'
			: effectiveBio
	);

	onMount(() => {
		tauriMode = isTauri();
		if (!tauriMode) return;

		// Silent visit tracking — best-effort, never shown in UI
		(async () => {
			try {
				const { invoke } = await import('@tauri-apps/api/core');
				await invoke('record_artist_visit', { artistMbid: data.artist.mbid });
			} catch {
				// Silent — visit tracking is best-effort
			}
		})();

		(async () => {
			// Load collections for Save to Shelf dropdown
			const { loadCollections, collectionsState, isInAnyCollection } = await import('$lib/taste/collections.svelte');
			if (!collectionsState.isLoaded) await loadCollections();
			shelfCollections = collectionsState.collections;
			savedInCollections = await isInAnyCollection('artist', data.artist.mbid);

			// AI bio removed — ArtistSummary component handles AI content (#21 fix)
		})();
	});

	/** Inline player HTML (set when user clicks SC/YT on a release). */
	let inlinePlayerHtml = $state<string | null>(null);

	function handlePlayInline(html: string) {
		inlinePlayerHtml = html;
	}

	/** Discography filter and sort state. */
	type DiscographyFilter = 'all' | 'album' | 'ep' | 'single';
	type DiscographySort = 'newest' | 'oldest';

	let discographyFilter = $state<DiscographyFilter>('all');
	let discographySort = $state<DiscographySort>('newest');

	const TYPE_MAP: Record<string, DiscographyFilter> = {
		Album: 'album',
		EP: 'ep',
		Single: 'single'
	};

	let filteredReleases = $derived(() => {
		let result = data.releases as typeof data.releases;
		if (discographyFilter !== 'all') {
			result = result.filter(r => TYPE_MAP[r.type ?? ''] === discographyFilter);
		}
		if (discographySort === 'oldest') {
			return [...result].sort((a, b) => {
				if (a.year === null && b.year === null) return 0;
				if (a.year === null) return 1;
				if (b.year === null) return -1;
				return a.year - b.year;
			});
		}
		return result; // 'newest' is already sorted in data.releases
	});

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

	/** Mastodon share URL — pre-encoded to avoid encodeURIComponent in template. */
	let mastodonShareUrl = $derived(
		`https://sharetomastodon.github.io/?text=${encodeURIComponent(`${data.artist.name} on Mercury — mercury://artist/${data.artist.mbid}`)}`
	);

	/** Icon prefix for funding platform links. */
	function supportIcon(label: string): string {
		const l = label.toLowerCase();
		if (l.includes('patreon')) return '♥ ';
		if (l.includes('ko-fi') || l.includes('kofi')) return '☕ ';
		if (l.includes('kickstarter')) return '🚀 ';
		if (l.includes('opencollective') || l.includes('open collective')) return '♦ ';
		return '♡ ';
	}

	/** Open the chat overlay in rooms view for this artist's primary tag. */
	function openRoomsForArtist() {
		chatState.view = 'rooms';
		openChat('rooms');
	}

	/** Embed widget UI state. */
	let showEmbed = $state(false);
	let embedMode = $state<'iframe' | 'script'>('iframe');
	let qrSvg = $state<string | null>(null);
	let showQr = $state(false);
	/** Optional curator handle for data-curator attribution in script-tag snippet. */
	let curatorHandle = $state('');

	/** Embed URL derived from current page origin + artist slug. */
	let embedUrl = $derived(`${$page.url.origin}/embed/artist/${data.artist.slug}`);

	/** Iframe and script-tag snippets for copy-paste. Passes curator handle when in script mode. */
	let snippets = $derived(
		generateEmbedSnippets(
			embedUrl,
			data.artist.name,
			embedMode === 'script' && curatorHandle.trim() ? curatorHandle.trim() : undefined
		)
	);

	/** Top tracks for the artist (populated when local library matching is available). */
	let topPlayerTracks = $state<PlayerTrack[]>([]);

	function handlePlayAll() {
		if (topPlayerTracks.length > 0) setQueue(topPlayerTracks, 0);
	}
	function handleQueueAll() {
		for (const t of topPlayerTracks) addToQueue(t);
	}

	/** Generate QR code on demand (client-side only, lazy import). */
	async function handleQrClick() {
		if (!showQr) {
			const { generateQrSvg } = await import('$lib/curator/qr');
			qrSvg = await generateQrSvg(embedUrl);
			showQr = true;
		} else {
			showQr = false;
		}
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
	<!-- Header — always visible regardless of active tab -->
	<header class="artist-header">
		<div class="artist-name-row">
			<h1 class="artist-name">{data.artist.name}</h1>
			<UniquenessScore score={data.uniquenessScore} tagCount={data.uniquenessTagCount} />
			<FavoriteButton mbid={data.artist.mbid} name={data.artist.name} slug={data.artist.slug} />
			<RssButton href="/api/rss/artist/{data.artist.slug}" label="Subscribe to {data.artist.name}" />
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
			<a
				href={mastodonShareUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="share-mastodon-btn"
				aria-label="Share on Mastodon"
				title="Share on Mastodon"
			>↑ Share</a>
			{#if tauriMode}
				<button
					class="export-site-btn"
					onclick={() => showSiteGen = true}
					title="Export artist page as standalone website"
					data-testid="export-site-btn"
				>
					Export site
				</button>
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

			<div class="style-map-cross-link">
				<a
					href="/style-map?tag={encodeURIComponent(tags[0])}"
					class="cross-link-secondary"
					title="See {tags[0]} in the Style Map"
				>
					Explore {tags[0]} in Style Map →
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

		{#if data.curators && data.curators.length > 0}
			<div class="discovered-by">
				<span class="discovered-label">Discovered by</span>
				{#each data.curators as curator}
					<a
						href="/new-rising?curator={encodeURIComponent(curator.curator_handle)}"
						class="curator-handle-link"
					>@{curator.curator_handle}</a>
				{/each}
			</div>
		{/if}
	</header>

	<!-- Listen On — always visible regardless of active tab -->
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

	<!-- Tab bar -->
	<div class="artist-tab-bar" data-testid="artist-tabs">
		<button
			class="artist-tab"
			class:active={activeTab === 'overview'}
			onclick={() => activeTab = 'overview'}
			data-testid="tab-overview"
		>Overview</button>
		<button
			class="artist-tab"
			class:active={activeTab === 'stats'}
			onclick={() => activeTab = 'stats'}
			data-testid="tab-stats"
		>Stats</button>
		{#if hasRelationships}
			<button
				class="artist-tab"
				class:active={activeTab === 'about'}
				onclick={() => activeTab = 'about'}
				data-testid="tab-about"
			>About</button>
		{/if}
	</div>

	<!-- Tab content -->
	{#if activeTab === 'overview'}
		<div data-testid="tab-content-overview">
			<ArtistSummary
				artistMbid={data.artist.mbid}
				artistName={data.artist.name}
				artistTags={data.artist.tags ?? ''}
				releases={data.releases}
			/>

			<!-- Top Tracks (Tauri-only: local library queue integration) -->
			{#if tauriMode}
				<div class="top-tracks-section" data-testid="top-tracks-section">
					<div class="top-tracks-header">
						<h3 class="section-label">Top Tracks</h3>
						<div class="top-tracks-actions">
							<button
								class="btn-play-all"
								onclick={handlePlayAll}
								disabled={topPlayerTracks.length === 0}
								title={topPlayerTracks.length === 0 ? 'Library track matching coming soon' : undefined}
								data-testid="play-all-btn"
							>
								Play All
							</button>
							<button
								class="btn-queue-all"
								onclick={handleQueueAll}
								disabled={topPlayerTracks.length === 0}
								title={topPlayerTracks.length === 0 ? 'Library track matching coming soon' : undefined}
								data-testid="queue-all-btn"
							>
								+ Queue All
							</button>
						</div>
					</div>
					<p class="top-tracks-stub">Local track matching coming in a future update.</p>
				</div>
			{/if}

			<!-- Discography -->
			{#if data.releases.length > 0}
				<section class="discography">
					<h2 class="section-title">Discography</h2>

					<div class="discography-controls" data-testid="discography-controls">
						<div class="filter-pills" data-testid="discography-filter">
							{#each ([['all', 'All'], ['album', 'Albums'], ['ep', 'EPs'], ['single', 'Singles']] as const) as [val, label]}
								<button
									class="filter-pill"
									class:active={discographyFilter === val}
									onclick={() => discographyFilter = val}
									data-testid="filter-{val}"
								>{label}</button>
							{/each}
						</div>
						<div class="sort-control">
							<button
								class="sort-btn"
								class:active={discographySort === 'newest'}
								onclick={() => discographySort = 'newest'}
								data-testid="sort-newest"
							>Newest</button>
							<span class="sort-sep">/</span>
							<button
								class="sort-btn"
								class:active={discographySort === 'oldest'}
								onclick={() => discographySort = 'oldest'}
								data-testid="sort-oldest"
							>Oldest</button>
						</div>
					</div>

					{#if filteredReleases().length === 0}
						<p class="discography-empty" data-testid="discography-empty">
							No {discographyFilter === 'ep' ? 'EPs' : discographyFilter === 'all' ? 'releases' : discographyFilter + 's'} for this artist.
						</p>
					{:else}
						<div class="releases-grid">
							{#each filteredReleases() as release (release.mbid)}
								<ReleaseCard {release} artistSlug={data.artist.slug} onplayinline={handlePlayInline} />
							{/each}
						</div>
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
						{#if category !== 'support'}
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
						{/if}
					{/each}
				</section>
			{/if}

			<!-- Support links (artist funding) -->
			{#if data.categorizedLinks.support.length > 0}
				<section class="support-section">
					<h2 class="section-title">Support</h2>
					<div class="support-links">
						{#each data.categorizedLinks.support as link}
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="support-link"
							>
								{supportIcon(link.label)}{link.label}
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- AI Recommendations -->
			<AiRecommendations
				artistName={data.artist.name}
				artistTags={data.artist.tags || ''}
				artistMbid={data.artist.mbid}
			/>

			<!-- Embed Widget UI -->
			<section class="embed-section">
				<button class="embed-toggle" onclick={() => (showEmbed = !showEmbed)}>
					{showEmbed ? 'Hide embed' : '</> Embed this artist'}
				</button>

				{#if showEmbed}
					<div class="embed-panel">
						<div class="embed-mode-row">
							<button
								class="mode-btn"
								class:active={embedMode === 'iframe'}
								onclick={() => (embedMode = 'iframe')}
							>iframe</button>
							<button
								class="mode-btn"
								class:active={embedMode === 'script'}
								onclick={() => (embedMode = 'script')}
							>script tag</button>
						</div>

						{#if embedMode === 'script'}
						<div class="embed-curator-row">
							<label for="curator-handle" class="embed-curator-label">Your blog handle (optional)</label>
							<input
								id="curator-handle"
								type="text"
								class="embed-curator-input"
								bind:value={curatorHandle}
								placeholder="e.g. myblog"
								maxlength="50"
							/>
							{#if curatorHandle.trim()}
								<span class="embed-curator-hint">data-curator will appear in snippet</span>
							{/if}
						</div>
					{/if}

					<pre class="embed-code"><code>{embedMode === 'iframe' ? snippets.iframe : snippets.scriptTag}</code></pre>

						<div class="embed-actions">
							<button
								class="embed-action-btn"
								onclick={() => {
									navigator.clipboard.writeText(embedMode === 'iframe' ? snippets.iframe : snippets.scriptTag);
								}}
							>Copy</button>
							<button class="embed-action-btn" onclick={handleQrClick}>
								{showQr ? 'Hide QR' : 'QR Code'}
							</button>
						</div>

						{#if showQr && qrSvg}
							<div class="qr-wrapper">
								{@html qrSvg}
							</div>
						{/if}
					</div>
				{/if}
			</section>
		</div>
	{:else if activeTab === 'about'}
		<div data-testid="tab-content-about">
			<ArtistRelationships relationships={data.relationships} />
		</div>
	{:else}
		<div data-testid="tab-content-stats">
			<ArtistStats
				artistId={data.artist.id}
				score={data.uniquenessScore}
				tagCount={data.uniquenessTagCount}
			/>
		</div>
	{/if}

	{#if showSiteGen}
		<SiteGenDialog
			artist={data.artist}
			releases={data.releases}
			bio={effectiveBio}
			onclose={() => showSiteGen = false}
		/>
	{/if}
</div>

<style>
	.artist-page {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Header ────────────────────────────────────────── */
	.artist-header {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 18px 20px 0;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-2);
	}

	.artist-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.artist-name {
		font-size: 24px;
		font-weight: 300;
		letter-spacing: 0.02em;
		color: var(--t-1);
		margin: 0;
		line-height: 1.2;
	}

	.artist-meta {
		font-size: 11px;
		color: var(--t-3);
		margin: 0;
		margin-top: 5px;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
		padding-bottom: 14px;
	}

	.tag-pair {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.tag-kb-link {
		font-size: 0.7rem;
		color: var(--t-3);
		text-decoration: none;
		vertical-align: super;
		line-height: 1;
		transition: color 0.15s;
	}

	.tag-kb-link:hover {
		color: var(--acc);
		text-decoration: none;
	}

	.explore-scene-panel {
		margin-top: var(--space-xs);
	}

	.explore-scene-link {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.15s;
	}

	.explore-scene-link:hover {
		color: var(--acc);
		text-decoration: none;
	}

	.style-map-cross-link {
		margin-top: var(--space-xs);
	}

	.cross-link-secondary {
		font-size: 0.8rem;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.15s;
	}

	.cross-link-secondary:hover {
		color: var(--acc);
	}

	.scene-rooms-hint {
		margin: 4px 0;
	}

	.rooms-link {
		background: none;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		padding: 6px 12px;
		cursor: pointer;
		color: var(--t-3);
		font-size: 0.8rem;
		transition: border-color 0.15s, color 0.15s;
	}

	.rooms-link:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.bio {
		margin-top: var(--space-sm);
	}

	.bio p {
		color: var(--t-1);
		font-size: 0.95rem;
		line-height: 1.65;
		margin: 0;
	}

	.bio-toggle {
		background: none;
		border: none;
		color: var(--acc);
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
		gap: 10px;
		padding: 8px 20px;
		background: var(--bg-1);
		border-bottom: 1px solid var(--b-1);
	}

	.listen-label {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		white-space: nowrap;
		width: 62px;
		flex-shrink: 0;
	}

	.listen-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.listen-link {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 11px;
		font-weight: 500;
		color: var(--t-2);
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.listen-link:hover {
		border-color: var(--acc);
		color: var(--t-1);
		text-decoration: none;
	}

	/* ── Tab bar ───────────────────────────────────────── */
	.artist-tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--b-1);
	}

	.artist-tab {
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.5rem 1.25rem;
		cursor: pointer;
		color: var(--t-3);
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		margin-bottom: -1px;
		transition: color 0.15s, border-color 0.15s;
	}

	.artist-tab.active {
		color: var(--t-1);
		border-bottom-color: var(--acc);
	}

	.artist-tab:hover:not(.active) {
		color: var(--t-2);
	}

	/* ── Section titles ────────────────────────────────── */
	.section-title {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--t-3);
		padding: 9px 20px;
		margin: 0;
	}

	/* ── Top Tracks ────────────────────────────────────── */
	.top-tracks-section {
		padding: 9px 20px 14px;
		border-bottom: 1px solid var(--b-1);
	}

	.top-tracks-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t-3);
		margin: 0;
	}

	.top-tracks-actions {
		display: flex;
		gap: 6px;
	}

	.btn-play-all {
		background: var(--acc);
		color: #000;
		border: none;
		padding: 5px 12px;
		border-radius: var(--r);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-play-all:hover {
		background: var(--acc-bg-h);
		color: var(--acc);
		border: 1px solid var(--b-acc);
	}

	.btn-queue-all {
		background: transparent;
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: 5px 12px;
		border-radius: var(--r);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.btn-queue-all:hover {
		border-color: var(--b-3);
	}

	.top-tracks-stub {
		font-size: 0.75rem;
		color: var(--t-3);
		font-style: italic;
		margin: 0;
	}

	/* ── Discography ───────────────────────────────────── */
	.discography {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--b-1);
	}

	.releases-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
		padding: 14px 20px;
	}

	/* ── Discography Controls ───────────────────────────── */
	.discography-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
		padding: 0 20px;
	}

	.filter-pills {
		display: flex;
		gap: var(--space-xs);
	}

	.filter-pill {
		height: 24px;
		padding: 0 var(--space-sm);
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 0.75rem;
		color: var(--t-3);
		cursor: pointer;
		white-space: nowrap;
		transition: border-color 0.1s, color 0.1s, background 0.1s;
	}

	.filter-pill:hover {
		border-color: var(--b-1);
		color: var(--t-2);
	}

	.filter-pill.active {
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.sort-control {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.sort-btn {
		background: none;
		border: none;
		padding: 2px 4px;
		font-size: 0.75rem;
		color: var(--t-3);
		cursor: pointer;
		transition: color 0.1s;
	}

	.sort-btn.active {
		color: var(--t-1);
		font-weight: 600;
	}

	.sort-btn:hover:not(.active) {
		color: var(--t-2);
	}

	.sort-sep {
		color: var(--t-3);
		font-size: 0.75rem;
		pointer-events: none;
	}

	.discography-empty {
		color: var(--t-3);
		font-size: 0.85rem;
		font-style: italic;
		padding: var(--space-md) 0;
		margin: 0;
	}


	.inline-player {
		margin-top: var(--space-md);
		border: 1px solid var(--b-1);
		border-radius: var(--r);
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
		border-bottom: 1px solid var(--b-1);
	}

	.link-group {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 20px;
		flex-wrap: wrap;
	}

	.link-group-title {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		margin: 0;
		width: 68px;
		flex-shrink: 0;
	}

	.link-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.cat-link {
		display: inline-flex;
		align-items: center;
		height: 26px;
		padding: 0 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 11px;
		color: var(--t-2);
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.cat-link:hover {
		border-color: var(--acc);
		color: var(--t-1);
		text-decoration: none;
	}

	/* ── Save to Shelf ─────────────────────────────────── */
	.save-shelf-wrapper { display: inline-block; }
	.save-shelf-btn {
		padding: 4px 10px;
		font-size: 0.8rem;
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--t-1);
		border-radius: var(--r);
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
		border-radius: var(--r);
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
		color: var(--t-1);
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
		color: var(--t-1);
		border-radius: 3px;
		font-size: 0.8rem;
	}

	/* ── Discovered By ────────────────────────────────── */
	.discovered-by {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
		font-size: 0.8rem;
	}

	.discovered-label {
		color: var(--t-3);
		font-style: italic;
	}

	.curator-handle-link {
		color: var(--t-3);
		text-decoration: none;
		border: 1px solid var(--b-1);
		border-radius: 999px;
		padding: 1px 8px;
		font-size: 0.78rem;
		transition: color 0.15s, border-color 0.15s;
	}

	.curator-handle-link:hover {
		color: var(--acc);
		border-color: var(--t-3);
		text-decoration: none;
	}

	/* ── Embed Widget ──────────────────────────────────── */
	.embed-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: 0 20px;
	}

	.embed-toggle {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		padding: 6px 12px;
		cursor: pointer;
		color: var(--t-3);
		font-size: 0.8rem;
		font-family: monospace;
		transition: border-color 0.15s, color 0.15s;
	}

	.embed-toggle:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.embed-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: var(--r);
	}

	.embed-mode-row {
		display: flex;
		gap: var(--space-xs);
	}

	.mode-btn {
		padding: 4px 10px;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		background: none;
		color: var(--t-3);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.mode-btn.active {
		background: var(--bg-3);
		border-color: var(--acc);
		color: var(--t-1);
	}

	.embed-code {
		background: var(--bg-surface, var(--bg-primary));
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		padding: var(--space-sm);
		font-size: 0.75rem;
		font-family: monospace;
		color: var(--t-2);
		overflow-x: auto;
		white-space: pre;
		margin: 0;
	}

	.embed-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.embed-action-btn {
		padding: 4px 10px;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		background: none;
		color: var(--t-3);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.embed-action-btn:hover {
		background: var(--bg-3);
		border-color: var(--b-3);
		color: var(--t-1);
	}

	.embed-curator-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.embed-curator-label {
		font-size: 0.78rem;
		color: var(--t-3);
		white-space: nowrap;
	}

	.embed-curator-input {
		padding: 3px 8px;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		background: var(--bg-surface, var(--bg-primary));
		color: var(--t-1);
		font-size: 0.78rem;
		width: 150px;
	}

	.embed-curator-hint {
		font-size: 0.7rem;
		color: var(--t-3);
		font-style: italic;
	}

	.qr-wrapper {
		max-width: 150px;
	}

	.qr-wrapper :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}

	/* ── Support Links ────────────────────────────────── */
	.support-section {
		padding: 0 20px;
	}

	.support-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm, 0.5rem);
		margin-top: var(--space-sm, 0.5rem);
	}

	.support-link {
		font-size: 0.85rem;
		color: var(--acc);
		text-decoration: none;
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
		border-radius: var(--r);
		transition: background 0.15s, color 0.15s;
	}

	.support-link:hover {
		background: color-mix(in srgb, var(--acc) 15%, transparent);
	}

	/* ── Export Site Button ─────────────────────────────── */
	.export-site-btn {
		padding: 0.25rem 0.6rem;
		font-size: 0.8rem;
		border: 1px solid var(--border-default, #333);
		border-radius: var(--r);
		background: transparent;
		color: var(--text-secondary, #b3b3b3);
		cursor: pointer;
		white-space: nowrap;
	}
	.export-site-btn:hover {
		border-color: var(--link-color, #7ab4d8);
		color: var(--link-color, #7ab4d8);
	}

	/* ── Mastodon Share Button ───────────────────────────── */
	.share-mastodon-btn {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		line-height: 1;
		transition: color 0.15s, border-color 0.15s;
		flex-shrink: 0;
	}

	.share-mastodon-btn:hover {
		color: var(--t-2);
		border-color: var(--t-3);
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
