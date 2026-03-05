<script lang="ts">
	import { onMount } from 'svelte';
	import CoverPlaceholder from '$lib/components/CoverPlaceholder.svelte';
	import { registerCover } from '$lib/cover-pool.svelte';
	import { PROJECT_NAME } from '$lib/config';
	import BuyOnBar from '$lib/components/BuyOnBar.svelte';
	import LinerNotes from '$lib/components/LinerNotes.svelte';
	import { isTauri } from '$lib/platform';
	import EmbedPlayer from '$lib/components/EmbedPlayer.svelte';
	import type { CreditEntry } from './+page';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import FavoriteReleaseButton from '$lib/components/FavoriteReleaseButton.svelte';

	let { data } = $props();

	// Release data comes from the load function — derived so SPA navigation stays reactive
	let release = $derived(data.release);
	let platformLinks = $derived(data.platformLinks);
	let hasAnyStream = $derived(data.hasAnyStream);

	// Credits with DB-resolved slugs — loaded async in onMount (supplementary, Tauri-only)
	let credits = $state<CreditEntry[]>([]);

	/** Format milliseconds as M:SS */
	function formatDuration(ms: number | null): string {
		if (!ms) return '';
		const totalSec = Math.round(ms / 1000);
		const m = Math.floor(totalSec / 60);
		const s = totalSec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	let coverError = $state(false);
	let tauriMode = $state(false);

	let creditsExpanded = $state(false);
	let albumActionState = $state<'idle' | 'loading' | 'not-found'>('idle');

	/**
	 * Search local library for tracks matching this release, then convert to PlayerTrack[].
	 * Matches on album title (exact, case-insensitive) and artist name (contains).
	 */
	async function getMatchedLocalTracks(): Promise<PlayerTrack[]> {
		if (!release) return [];
		const { searchLocalTracks } = await import('$lib/library/scanner');
		const results = await searchLocalTracks(release.title);
		const albumLower = release.title.toLowerCase();
		const artistLower = release.artistName.toLowerCase();
		return results
			.filter((t) => {
				if (t.album?.toLowerCase() !== albumLower) return false;
				const localArtist = (t.album_artist ?? t.artist ?? '').toLowerCase();
				return localArtist.includes(artistLower) || artistLower.includes(localArtist);
			})
			.sort((a, b) => {
				const dA = a.disc_number ?? 1, dB = b.disc_number ?? 1;
				if (dA !== dB) return dA - dB;
				return (a.track_number ?? 999) - (b.track_number ?? 999);
			})
			.map((t): PlayerTrack => ({
				path: t.path,
				title: t.title ?? release!.title,
				artist: t.artist ?? release!.artistName,
				album: t.album ?? release!.title,
				albumArtist: t.album_artist ?? undefined,
				trackNumber: t.track_number ?? undefined,
				discNumber: t.disc_number ?? undefined,
				genre: t.genre ?? undefined,
				year: t.year ?? undefined,
				durationSecs: t.duration_secs
			}));
	}

	async function handlePlayAlbum() {
		albumActionState = 'loading';
		const { setQueue } = await import('$lib/player/queue.svelte');
		const tracks = await getMatchedLocalTracks();
		if (tracks.length === 0) {
			albumActionState = 'not-found';
			return;
		}
		setQueue(tracks, 0);
		albumActionState = 'idle';
	}

	async function handleQueueAlbum() {
		albumActionState = 'loading';
		const { addAllToQueue } = await import('$lib/player/queue.svelte');
		const tracks = await getMatchedLocalTracks();
		if (tracks.length === 0) {
			albumActionState = 'not-found';
			return;
		}
		addAllToQueue(tracks);
		albumActionState = 'idle';
	}

	/** Save to Shelf state (Tauri-only) */
	let savedInCollections = $state<string[]>([]);
	let showSaveDropdown = $state(false);
	let newShelfNameRelease = $state('');
	let shelfCollections = $state<Array<{ id: string; name: string }>>([]);

	let pageTitle = $derived(
		release ? `${release.title} — ${release.artistName} — ${PROJECT_NAME}` : PROJECT_NAME
	);

	onMount(() => {
		tauriMode = isTauri();

		// Resolve credit slugs against local DB (graceful degradation if unavailable)
		if (data.rawCredits.length > 0) {
			(async () => {
				try {
					const { getProvider } = await import('$lib/db/provider');
					const provider = await getProvider();
					credits = await Promise.all(
						data.rawCredits.map(async (c) => {
							try {
								const row = await provider.get<{ slug: string }>(
									'SELECT slug FROM artists WHERE mbid = ?',
									c.mbid
								);
								return { ...c, slug: row?.slug ?? null };
							} catch {
								return { ...c, slug: null };
							}
						})
					);
				} catch {
					credits = data.rawCredits.map((c) => ({ ...c, slug: null }));
				}
			})();
		}

		if (!tauriMode) return;

		(async () => {
			const { loadCollections, collectionsState, isInAnyCollection } = await import('$lib/taste/collections.svelte');
			if (!collectionsState.isLoaded) await loadCollections();
			shelfCollections = collectionsState.collections;
			savedInCollections = await isInAnyCollection('release', data.mbid);
		})();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if release}
		<meta name="description" content="{release.title} by {release.artistName}{release.year ? ` (${release.year})` : ''}" />
	{/if}
</svelte:head>

<div class="release-page">

	{#if !release}
		<div class="release-loading">
			<p>Couldn't load release details. <a href="/artist/{data.slug}">← Back to artist</a></p>
		</div>
	{:else}

		<!-- Hero -->
		<header class="release-hero">
			<div class="cover-art">
				{#if !coverError}
					<img
						src={release.coverArtUrl}
						alt="{release.title} cover art"
						onerror={() => coverError = true}
						onload={() => registerCover(release.coverArtUrl)}
					/>
				{:else}
					<CoverPlaceholder name={release.title} />
				{/if}
			</div>

			<div class="hero-info">
				<div class="release-meta-badges">
					{#if release.year}
						<span class="year">{release.year}</span>
					{/if}
					{#if release.type && release.type !== 'Release'}
						<span class="type-badge">{release.type}</span>
					{/if}
				</div>

				<div class="title-row">
					<h1 class="release-title">{release.title}</h1>
					<FavoriteReleaseButton
						mbid={data.mbid}
						releaseName={release.title}
						artistName={release.artistName}
						artistSlug={release.artistSlug}
					/>
				</div>

				<a href="/artist/{release.artistSlug}" class="artist-link">
					{release.artistName}
				</a>

				<!-- Buy On row — always shown -->
				<div class="action-rows">
					<BuyOnBar links={release.buyLinks} />

					<!-- Stream On row — always shown, uses MB direct URLs when available, search fallbacks otherwise -->
					<section class="stream-on">
						<span class="stream-label">Stream on</span>
						<div class="stream-links">
							{#if platformLinks.bandcamp.length}
								<a href={platformLinks.bandcamp[0]} target="_blank" rel="noopener noreferrer" class="stream-link platform-bandcamp">Bandcamp</a>
							{/if}
							<a href={platformLinks.spotify[0] ?? data.streamSearchLinks.spotify} target="_blank" rel="noopener noreferrer" class="stream-link platform-spotify">
								Spotify{#if !platformLinks.spotify.length}<span class="search-indicator" title="Opens Spotify search — no direct link found in MusicBrainz">?</span>{/if}
							</a>
							{#if platformLinks.soundcloud.length}
								<a href={platformLinks.soundcloud[0]} target="_blank" rel="noopener noreferrer" class="stream-link platform-soundcloud">SoundCloud</a>
							{/if}
							<a href={platformLinks.youtube[0] ?? data.streamSearchLinks.youtube} target="_blank" rel="noopener noreferrer" class="stream-link platform-youtube">
								YouTube{#if !platformLinks.youtube.length}<span class="search-indicator" title="Opens YouTube search — no direct link found in MusicBrainz">?</span>{/if}
							</a>
						</div>
					</section>
					{#if tauriMode}
						<div class="save-shelf-wrapper" style="position:relative; margin-top: 8px;">
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
												await addToCollection(col.id, 'release', data.mbid, release?.title ?? data.mbid, data.slug);
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
											bind:value={newShelfNameRelease}
											placeholder="New shelf..."
											onkeydown={async (e) => {
												if (e.key === 'Enter' && newShelfNameRelease.trim()) {
													const { createCollection, addToCollection, collectionsState } = await import('$lib/taste/collections.svelte');
													const id = await createCollection(newShelfNameRelease.trim());
													if (id) {
														await addToCollection(id, 'release', data.mbid, release?.title ?? data.mbid, data.slug);
														savedInCollections = [...savedInCollections, id];
														shelfCollections = collectionsState.collections;
													}
													newShelfNameRelease = '';
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

			{#if tauriMode}
				<div class="album-actions" data-testid="album-actions">
					<button
						class="btn-play-album"
						onclick={handlePlayAlbum}
						disabled={albumActionState === 'loading'}
						data-testid="play-album-btn"
					>
						{albumActionState === 'loading' ? '…' : '▶ Play Album'}
					</button>
					<button
						class="btn-queue-album"
						onclick={handleQueueAlbum}
						disabled={albumActionState === 'loading'}
						data-testid="queue-album-btn"
					>
						+ Queue Album
					</button>
				</div>
				{#if albumActionState === 'not-found'}
					<p class="album-not-in-library">Not in your library — add the folder in Settings.</p>
				{/if}

				{#if hasAnyStream}
					<div class="release-embed-wrap" data-testid="release-embed">
						<EmbedPlayer links={platformLinks} />
					</div>
				{/if}
			{/if}
		</div>
		</header>

		<!-- Tracklist -->
		{#if release.tracks.length > 0}
			<section class="tracklist">
				<h2 class="section-title">Tracklist</h2>
				<ol class="tracks">
					{#each release.tracks as track (track.id)}
						<li class="track">
							<span class="track-num">{track.number}</span>
							<span class="track-title">{track.title}</span>
							{#if track.length}
								<span class="track-duration">{formatDuration(track.length)}</span>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{:else}
			<section class="tracklist">
				<p class="no-tracks">Tracklist not available from MusicBrainz for this release.</p>
			</section>
		{/if}

		<!-- Credits / Personnel -->
		{#if release.credits.length > 0}
			<section class="credits">
				<h2 class="section-title">Credits</h2>
				<ul class="credits-list">
					{#each release.credits as credit (credit.name + credit.role)}
						<li class="credit-item">
							<span class="credit-name">{credit.name}</span>
							<span class="credit-role">{credit.role}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Collapsible Credits Section (producer/engineer/mix etc. with artist links) -->
		{#if credits && credits.length > 0}
			<section class="credits-section" data-testid="credits-section">
				<button
					class="credits-toggle"
					onclick={() => creditsExpanded = !creditsExpanded}
					aria-expanded={creditsExpanded}
					data-testid="credits-toggle"
				>
					<span>Credits</span>
					<span class="credits-icon">{creditsExpanded ? '▲' : '▼'}</span>
				</button>

				{#if creditsExpanded}
					<ul class="credits-expanded-list" data-testid="credits-list">
						{#each credits as credit}
							<li class="credit-row">
								<span class="credit-role-label">{credit.role}</span>
								{#if credit.slug}
									<a href="/artist/{credit.slug}" class="credit-artist-link">{credit.name}</a>
								{:else}
									<span class="credit-artist-text">{credit.name}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<!-- Liner Notes — expandable credits panel, lazy-fetches MusicBrainz on open -->
		<LinerNotes releaseMbid={data.mbid} />

	{/if}
</div>

<style>
	.release-page {
		padding: 20px;
	}

	.release-loading {
		text-align: center;
		padding: var(--space-xl);
		color: var(--t-3);
	}

	/* Hero */
	.release-hero {
		display: flex;
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
		align-items: flex-start;
	}

	.cover-art {
		width: 220px;
		height: 220px;
		flex-shrink: 0;
		border-radius: 0;
		overflow: hidden;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
	}

	.cover-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}


	.hero-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding-top: var(--space-xs);
	}

	.release-meta-badges {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.year {
		font-size: 0.85rem;
		color: var(--t-3);
	}

	.type-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 0;
		background: var(--bg-3);
		color: var(--t-2);
		border: 1px solid var(--b-1);
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.release-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--t-1);
		line-height: 1.2;
		margin: 0;
		flex: 1;
		min-width: 0;
	}

	.artist-link {
		font-size: 1rem;
		color: var(--t-2);
		text-decoration: none;
		transition: color 0.15s;
	}

	.artist-link:hover {
		color: var(--t-1);
	}

	.action-rows {
		margin-top: var(--space-md);
	}

	.album-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.btn-play-album {
		background: var(--acc);
		color: var(--bg-0);
		border: 1px solid var(--acc);
		padding: 6px 14px;
		border-radius: 0;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.btn-play-album:hover {
		filter: brightness(1.1);
	}

	.btn-play-album:disabled,
	.btn-queue-album:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-queue-album {
		background: transparent;
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: 6px 14px;
		border-radius: 0;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.btn-queue-album:hover {
		border-color: var(--b-3);
	}

	.album-not-in-library {
		font-size: 0.75rem;
		color: var(--t-3);
		margin: 4px 0 0;
	}

	.release-embed-wrap {
		margin-top: var(--space-sm);
		border-radius: 0;
		overflow: hidden;
	}

	/* Tracklist */
	.tracklist {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		margin-bottom: var(--space-md);
	}

	.tracks {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--b-1);
	}

	.track {
		display: grid;
		grid-template-columns: 2.5rem 1fr auto;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--b-1);
	}

	.track-num {
		font-size: 0.8rem;
		color: var(--t-3);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.track-title {
		font-size: 0.9rem;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-duration {
		font-size: 0.8rem;
		color: var(--t-3);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.no-tracks {
		font-size: 0.85rem;
		color: var(--t-3);
		font-style: italic;
	}

	/* Credits */
	.credits {
		margin-bottom: var(--space-xl);
	}

	.credits-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.credit-item {
		display: flex;
		gap: var(--space-md);
		font-size: 0.85rem;
	}

	.credit-name {
		color: var(--t-1);
		min-width: 160px;
	}

	.credit-role {
		color: var(--t-3);
		text-transform: capitalize;
	}

	/* ── Save to Shelf ──────────────────────────────────── */
	.save-shelf-wrapper { display: inline-block; }
	.save-shelf-btn {
		padding: 4px 10px;
		font-size: 0.8rem;
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--t-1);
		border-radius: 0;
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
		border-radius: 0;
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
		border-radius: 0;
		font-size: 0.8rem;
	}

	/* ── Credits Section (new collapsible) ─────────────── */
	.credits-section {
		margin-bottom: var(--space-xl);
		border-top: 1px solid var(--b-1);
		padding-top: var(--space-xs);
	}

	.credits-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) 0;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--t-2);
		text-align: left;
	}

	.credits-toggle:hover {
		color: var(--t-1);
	}

	.credits-icon {
		font-size: 0.65rem;
		color: var(--t-3);
	}

	.credits-expanded-list {
		list-style: none;
		padding: 0 0 var(--space-md);
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.credit-row {
		display: flex;
		gap: var(--space-md);
		font-size: 0.85rem;
	}

	.credit-role-label {
		color: var(--t-3);
		text-transform: capitalize;
		min-width: 100px;
		flex-shrink: 0;
	}

	.credit-artist-link {
		color: var(--t-2);
		text-decoration: none;
	}

	.credit-artist-link:hover {
		color: var(--acc);
		text-decoration: underline;
	}

	.credit-artist-text {
		color: var(--t-2);
	}

	/* ── Stream On ─────────────────────────────────────── */
	.stream-on {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--b-1);
	}

	.stream-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t-3);
		white-space: nowrap;
		min-width: 4rem;
	}

	.stream-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.stream-link {
		font-size: 0.8rem;
		font-weight: 500;
		padding: 4px 10px;
		text-decoration: none;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		color: var(--t-2);
		transition: border-color 0.15s, color 0.15s;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.stream-link:hover { color: var(--t-1); }
	.stream-link.platform-spotify:hover  { border-color: var(--spotify-color);   color: var(--spotify-color); }
	.stream-link.platform-youtube:hover  { border-color: var(--youtube-color);   color: var(--youtube-color); }
	.stream-link.platform-bandcamp:hover { border-color: var(--bandcamp-color);  color: var(--bandcamp-color); }
	.stream-link.platform-soundcloud:hover { border-color: var(--soundcloud-color); color: var(--soundcloud-color); }

	.search-indicator {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--t-3);
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 50%;
		width: 14px;
		height: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		cursor: help;
	}

	/* Mobile */
	@media (max-width: 600px) {
		.release-hero {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.cover-art {
			width: 180px;
			height: 180px;
		}

		.hero-info {
			align-items: center;
		}

		.release-meta-badges {
			justify-content: center;
		}

		.action-rows {
			width: 100%;
		}
	}
</style>
