<script lang="ts">
	import type { LibraryAlbum, LocalTrack } from '$lib/library/types';
	import type { PlayerTrack } from '$lib/player/state.svelte';
	import TrackRow from './TrackRow.svelte';
	import CoverPlaceholder from './CoverPlaceholder.svelte';
	import { setQueue, addToQueue } from '$lib/player/queue.svelte';
	import { setAlbumCover, getCoverForAlbum } from '$lib/library/scanner';
	import { loadLibrary } from '$lib/library/store.svelte';
	import { isTauri } from '$lib/platform';

	interface FavoriteArtist { artist_mbid: string; artist_name: string; artist_slug: string; saved_at: number; }
	interface FavoriteRelease { release_mbid: string; release_name: string; artist_name: string; artist_slug: string; saved_at: number; }
	let { albums, favorites = [], favoriteReleases = [] }: { albums: LibraryAlbum[]; favorites?: FavoriteArtist[]; favoriteReleases?: FavoriteRelease[] } = $props();

	let expandedAlbumKey = $state<string | null>(null);
	let expandedArtistName = $state<string | null>(null);
	let lightboxSrc = $state<string | null>(null);
	let coverFileInput = $state<HTMLInputElement | null>(null);
	let coverPickerAlbum = $state<LibraryAlbum | null>(null);

	/** Lazily fetched covers: "artist|||album" → base64 data URL */
	let lazyCovers = $state<Record<string, string>>({});

	/** Cached artist slugs: name → slug (null = not in DB) */
	let artistSlugs = $state(new Map<string, string | null>());

	async function lookupArtistSlug(name: string): Promise<void> {
		if (artistSlugs.has(name)) return;
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { searchArtistsAutocomplete } = await import('$lib/db/queries');
			const provider = await getProvider();
			const results = await searchArtistsAutocomplete(provider, name, 5);
			const exact = results.find(r => r.name.toLowerCase() === name.toLowerCase());
			artistSlugs.set(name, exact?.slug ?? null);
		} catch {
			artistSlugs.set(name, null);
		}
	}

	function albumKey(album: LibraryAlbum): string {
		return `${album.artist}|||${album.name}`;
	}

	function getLoadedCover(album: LibraryAlbum): string | null {
		return lazyCovers[albumKey(album)] ?? null;
	}

	/**
	 * Svelte action: observe element; fetch cover when it enters viewport.
	 */
	function lazyLoadCover(node: HTMLElement, album: LibraryAlbum) {
		if (!isTauri()) return;
		const key = albumKey(album);
		if (lazyCovers[key]) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					observer.disconnect();
					getCoverForAlbum(album.name, album.artist).then((cover) => {
						if (cover) lazyCovers[key] = cover;
					});
				}
			},
			{ rootMargin: '300px' }
		);
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}

	let expandedAlbum = $derived(albums.find(a => albumKey(a) === expandedAlbumKey) ?? null);

	let searchQuery = $state('');
	type ViewTab = 'all' | 'artist' | 'album' | 'ep' | 'songs';
	let activeTab = $state<ViewTab>('all');

	/** Filters */
	let selectedGenre = $state<string | null>(null);
	let yearFilter = $state('');

	/** All unique genres in the library — merges file tags + MusicBrainz tags */
	let allGenres = $derived.by(() => {
		const genreSet = new Map<string, number>();
		for (const album of albums) {
			for (const track of album.tracks) {
				// File-embedded genre
				const sources = [track.genre, track.mb_tags].filter(Boolean).join('; ');
				if (sources) {
					for (const g of sources.split(/[;/]/).map(s => s.trim()).filter(Boolean)) {
						const lower = g.toLowerCase();
						genreSet.set(lower, (genreSet.get(lower) ?? 0) + 1);
					}
				}
			}
		}
		return [...genreSet.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([genre, count]) => ({ genre, count }));
	});

	/** Pagination */
	const PAGE_SIZE = 60;
	const SONGS_PAGE_SIZE = 200;
	let currentPage = $state(1);

	/** Reference to the scroll container — for scrolling to top on page change */
	let scrollContainer = $state<HTMLElement | null>(null);

	/** Reset to page 1 when search, tab, genre, or year changes */
	let prevSearch = $state('');
	let prevTab = $state<ViewTab>('all');
	let prevGenre = $state<string | null>(null);
	let prevYear = $state('');
	$effect(() => {
		const q = searchQuery;
		const t = activeTab;
		const g = selectedGenre;
		const y = yearFilter;
		if (q !== prevSearch || t !== prevTab || g !== prevGenre || y !== prevYear) {
			currentPage = 1;
			prevSearch = q;
			prevTab = t;
			prevGenre = g;
			prevYear = y;
		}
	});

	function goToPage(page: number) {
		currentPage = page;
		expandedAlbumKey = null;
		scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function trackMatchesGenre(t: LocalTrack, genre: string): boolean {
		const sources = [t.genre, t.mb_tags].filter(Boolean).join('; ');
		return sources.toLowerCase().split(/[;/]/).some(s => s.trim() === genre);
	}

	let filteredAlbums = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		let result = albums;
		if (q) {
			result = result.filter(a =>
				a.name.toLowerCase().includes(q) ||
				a.artist.toLowerCase().includes(q) ||
				a.tracks.some(t => t.title?.toLowerCase().includes(q))
			);
		}
		// Genre filtering (check both file genre and MusicBrainz tags)
		if (selectedGenre) {
			const g = selectedGenre;
			result = result.filter(a =>
				a.tracks.some(t => trackMatchesGenre(t, g))
			);
		}
		// Year filtering
		if (yearFilter.trim()) {
			const y = parseInt(yearFilter.trim(), 10);
			if (!isNaN(y)) {
				result = result.filter(a => a.year === y);
			}
		}
		// Tab filtering
		if (activeTab === 'album') result = result.filter(a => a.releaseType === 'album');
		else if (activeTab === 'ep') result = result.filter(a => a.releaseType === 'ep');
		// Artist tab: sort by artist name, then album name
		if (activeTab === 'artist') {
			result = [...result].sort((a, b) =>
				a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name)
			);
		}
		return result;
	});

	/** Artists grouped — for "Artists" tab */
	let groupedArtists = $derived.by(() => {
		const map = new Map<string, LibraryAlbum[]>();
		for (const album of filteredAlbums) {
			const name = album.artist || 'Unknown Artist';
			if (!map.has(name)) map.set(name, []);
			map.get(name)!.push(album);
		}
		return [...map.entries()]
			.map(([name, artistAlbums]) => ({ name, albums: artistAlbums }))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	/** Eagerly load slugs for all visible artists when the Artists tab is active */
	$effect(() => {
		if (activeTab === 'artist') {
			for (const group of groupedArtists) {
				lookupArtistSlug(group.name);
			}
		}
	});

	/** All tracks flat — for "Songs" tab */
	let allFilteredTracks = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		let tracks = albums.flatMap(a => a.tracks);
		if (q) {
			tracks = tracks.filter(t =>
				(t.title?.toLowerCase().includes(q)) ||
				(t.artist?.toLowerCase().includes(q)) ||
				(t.album?.toLowerCase().includes(q))
			);
		}
		if (selectedGenre) {
			const g = selectedGenre;
			tracks = tracks.filter(t => trackMatchesGenre(t, g));
		}
		if (yearFilter.trim()) {
			const y = parseInt(yearFilter.trim(), 10);
			if (!isNaN(y)) tracks = tracks.filter(t => t.year === y);
		}
		return tracks;
	});

	/** Current page size depends on tab */
	let pageSize = $derived(activeTab === 'songs' ? SONGS_PAGE_SIZE : PAGE_SIZE);

	/** Total pages for current tab */
	let totalItems = $derived(activeTab === 'songs' ? allFilteredTracks.length : filteredAlbums.length);
	let totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));

	/** Slice indices for current page */
	let pageStart = $derived((currentPage - 1) * pageSize);
	let pageEnd = $derived(currentPage * pageSize);

	/** Paginated album slice — used by All, Album, EP, Artist tabs */
	let pagedAlbums = $derived(filteredAlbums.slice(pageStart, pageEnd));



	/** Paginated tracks for the Songs tab */
	let pagedTracks = $derived(allFilteredTracks.slice(pageStart, pageEnd));

	/** Page numbers to show in the pagination bar */
	let pageNumbers = $derived.by(() => {
		const pages: number[] = [];
		const total = totalPages;
		const cur = currentPage;
		// Always show first, last, current, and neighbors
		const show = new Set<number>();
		show.add(1);
		show.add(total);
		for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) show.add(i);
		const sorted = [...show].sort((a, b) => a - b);
		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push(-1); // gap marker
			pages.push(sorted[i]);
		}
		return pages;
	});

	/** Tab counts */
	let tabCounts = $derived({
		all: albums.length,
		artist: new Set(albums.map(a => a.artist)).size,
		album: albums.filter(a => a.releaseType === 'album').length,
		ep: albums.filter(a => a.releaseType === 'ep').length,
		songs: albums.reduce((n, a) => n + a.tracks.length, 0)
	});

	/** Favourite releases not present in the local library (for Albums tab header section) */
	let unownedFavoriteReleases = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return favoriteReleases.filter((fav) => {
			const nameLower = fav.release_name.toLowerCase();
			const artistLower = fav.artist_name.toLowerCase();
			const owned = albums.some(
				(a) => a.name.toLowerCase() === nameLower && a.artist.toLowerCase() === artistLower
			);
			if (owned) return false;
			if (q) return nameLower.includes(q) || artistLower.includes(q);
			return true;
		});
	});

	let expandedAlbumPlayerTracks = $derived(expandedAlbum?.tracks.map(toPlayerTrack) ?? []);

	function toPlayerTrack(t: LocalTrack): PlayerTrack {
		return {
			path: t.path,
			title: t.title ?? 'Unknown Title',
			artist: t.artist ?? 'Unknown Artist',
			album: t.album ?? 'Unknown Album',
			albumArtist: t.album_artist ?? undefined,
			trackNumber: t.track_number ?? undefined,
			discNumber: t.disc_number ?? undefined,
			genre: t.genre ?? undefined,
			year: t.year ?? undefined,
			durationSecs: t.duration_secs
		};
	}

	function toggleAlbum(album: LibraryAlbum) {
		const key = albumKey(album);
		expandedAlbumKey = expandedAlbumKey === key ? null : key;
		if (expandedAlbumKey) {
			lookupArtistSlug(album.artist);
			// Scroll to top when expanding so the detail view is fully visible
			setTimeout(() => scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
		}
	}

	function collapseAlbum() {
		expandedAlbumKey = null;
		scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function getInitials(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	function playAlbum() {
		if (expandedAlbumPlayerTracks.length > 0) setQueue(expandedAlbumPlayerTracks, 0);
	}

	function queueAlbum() {
		for (const t of expandedAlbumPlayerTracks) addToQueue(t);
	}

	function openLightbox(src: string) {
		lightboxSrc = src;
	}

	function openCoverPicker(album: LibraryAlbum) {
		coverPickerAlbum = album;
		coverFileInput?.click();
	}

	async function handleCoverFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		const album = coverPickerAlbum;
		if (!file || !album) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			const dataUrl = e.target?.result as string;
			if (!dataUrl) return;
			await setAlbumCover(album.name, album.artist, dataUrl);
			lazyCovers[albumKey(album)] = dataUrl;
			await loadLibrary();
		};
		reader.readAsDataURL(file);
		input.value = '';
	}

	function formatDuration(secs: number | null | undefined): string {
		if (!secs) return '';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function totalDuration(tracks: LocalTrack[]): string {
		const total = tracks.reduce((sum, t) => sum + (t.duration_secs ?? 0), 0);
		const mins = Math.floor(total / 60);
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h}h ${m}m`;
	}
</script>

<svelte:window onkeydown={(e) => { if (lightboxSrc && e.key === 'Escape') lightboxSrc = null; }} />

{#if lightboxSrc}
	<div class="lightbox-overlay" role="dialog" aria-modal="true" aria-label="Cover art">
		<button class="lightbox-close" onclick={() => (lightboxSrc = null)} aria-label="Close">×</button>
		<img class="lightbox-img" src={lightboxSrc} alt="Album cover" />
	</div>
{/if}

<input
	bind:this={coverFileInput}
	type="file"
	accept="image/*"
	style="display:none"
	onchange={handleCoverFile}
/>

<div class="library-grid-container" bind:this={scrollContainer}>
	<div class="library-toolbar">
		<input
			type="search"
			placeholder="Search albums, artists, tracks..."
			bind:value={searchQuery}
			class="library-search-input"
			data-testid="library-search-input"
		/>
		<div class="library-tabs">
			<button class="tab" class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>All <span class="tab-count">{tabCounts.all}</span></button>
			<button class="tab" class:active={activeTab === 'artist'} onclick={() => activeTab = 'artist'}>Artists <span class="tab-count">{tabCounts.artist}</span></button>
			<button class="tab" class:active={activeTab === 'album'} onclick={() => activeTab = 'album'}>Albums <span class="tab-count">{tabCounts.album}</span></button>
			<button class="tab" class:active={activeTab === 'ep'} onclick={() => activeTab = 'ep'}>EPs <span class="tab-count">{tabCounts.ep}</span></button>
			<button class="tab" class:active={activeTab === 'songs'} onclick={() => activeTab = 'songs'}>Songs <span class="tab-count">{tabCounts.songs}</span></button>
		</div>
		<div class="filter-row">
			<div class="genre-chips">
				{#each allGenres.slice(0, 20) as { genre, count }}
					<button
						class="genre-chip"
						class:active={selectedGenre === genre}
						onclick={() => (selectedGenre = selectedGenre === genre ? null : genre)}
					>{genre} <span class="genre-count">{count}</span></button>
				{/each}
				{#if allGenres.length > 20}
					<span class="genre-more">+{allGenres.length - 20} more</span>
				{/if}
			</div>
			<input
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				placeholder="Year"
				bind:value={yearFilter}
				class="year-input"
				oninput={(e) => {
					const input = e.currentTarget as HTMLInputElement;
					input.value = input.value.replace(/[^0-9]/g, '');
					yearFilter = input.value;
				}}
			/>
		</div>
	</div>

	{#if activeTab === 'songs'}
		<!-- Songs tab: flat track list -->
		{#if allFilteredTracks.length === 0}
			<div class="library-no-results">No tracks found</div>
		{:else}
			<div class="songs-list">
				{#each pagedTracks as track, i}
					<TrackRow
						track={toPlayerTrack(track)}
						index={pageStart + i}
						contextTracks={allFilteredTracks.map(toPlayerTrack)}
						showDuration={true}
					/>
				{/each}
			</div>
			{#if totalPages > 1}
				{@render paginationControls()}
			{/if}
		{/if}
	{:else if activeTab === 'artist'}
		<!-- Artist tab: favourites + local artists grouped -->
		{@const filteredFavs = favorites.filter(f =>
			!searchQuery.trim() || f.artist_name.toLowerCase().includes(searchQuery.trim().toLowerCase())
		)}
		{#if groupedArtists.length === 0 && filteredFavs.length === 0 && searchQuery.trim()}
			<div class="library-no-results">No results for "{searchQuery.trim()}"</div>
		{:else}
			<div class="artist-list">
				{#each filteredFavs as fav (fav.artist_mbid)}
					<a class="artist-group-header artist-fav-link" href="/artist/{fav.artist_slug}">
						<span class="artist-group-name">{fav.artist_name}</span>
						<span class="artist-fav-badge">♥</span>
					</a>
				{/each}
				{#each groupedArtists as group (group.name)}
					<div class="artist-group">
						<div class="artist-group-header" class:open={expandedArtistName === group.name}>
							<button
								class="artist-group-toggle"
								onclick={() => {
									expandedArtistName = expandedArtistName === group.name ? null : group.name;
									expandedAlbumKey = null;
									if (expandedArtistName === group.name) lookupArtistSlug(group.name);
								}}
							>
								<span class="artist-group-name">{group.name}</span>
								<span class="artist-group-count">{group.albums.length} {group.albums.length === 1 ? 'release' : 'releases'}</span>
								<span class="artist-group-chevron">{expandedArtistName === group.name ? '▲' : '▼'}</span>
							</button>
							{#if artistSlugs.get(group.name)}
								<a href="/artist/{artistSlugs.get(group.name)}" class="artist-page-link" title="Go to artist page">↗</a>
							{/if}
						</div>
						{#if expandedArtistName === group.name}
							<div class="album-grid artist-albums">
								{#each group.albums as album (albumKey(album))}
									{@const key = albumKey(album)}
									{@const isExpanded = expandedAlbumKey === key}
									{#if !expandedAlbumKey || isExpanded}
										{@const cover = getLoadedCover(album)}
										{@render albumCard(album, key, isExpanded, cover)}
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- All / Album / EP tabs: flat grid -->
		{#if activeTab === 'album' && unownedFavoriteReleases.length > 0}
			<div class="fav-releases-section">
				{#each unownedFavoriteReleases as fav (fav.release_mbid)}
					<a class="fav-release-row" href="/artist/{fav.artist_slug}">
						<span class="fav-release-name">{fav.release_name}</span>
						<span class="fav-release-artist">{fav.artist_name}</span>
						<span class="fav-release-badge">♥ not in library</span>
					</a>
				{/each}
			</div>
		{/if}
		{#if filteredAlbums.length === 0 && unownedFavoriteReleases.length === 0 && searchQuery.trim()}
			<div class="library-no-results">No results for "{searchQuery.trim()}"</div>
		{:else if filteredAlbums.length > 0 || !searchQuery.trim()}
			<div class="album-grid">
				{#each pagedAlbums as album (albumKey(album))}
					{@const key = albumKey(album)}
					{@const isExpanded = expandedAlbumKey === key}
					{#if !expandedAlbumKey || isExpanded}
						{@const cover = getLoadedCover(album)}
						{@render albumCard(album, key, isExpanded, cover)}
					{/if}
				{/each}
			</div>
			{#if totalPages > 1}
				{@render paginationControls()}
			{/if}
		{/if}
	{/if}
</div>

{#snippet paginationControls()}
	<div class="pagination">
		<button class="page-btn" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)} aria-label="Previous page">&larr;</button>
		{#each pageNumbers as p}
			{#if p === -1}
				<span class="page-ellipsis">&hellip;</span>
			{:else}
				<button class="page-btn" class:active={p === currentPage} onclick={() => goToPage(p)}>{p}</button>
			{/if}
		{/each}
		<button class="page-btn" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)} aria-label="Next page">&rarr;</button>
	</div>
{/snippet}

{#snippet albumCard(album: LibraryAlbum, key: string, isExpanded: boolean, cover: string | null)}
	<div class="album-card" class:expanded={isExpanded} use:lazyLoadCover={album}>
		{#if !isExpanded}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="album-card-clickable" onclick={() => toggleAlbum(album)} data-testid="album-card">
				<div class="album-cover">
					{#if cover}
						<img src={cover} alt={album.name} />
					{:else}
						<CoverPlaceholder name={album.name} tags={album.tracks[0]?.genre} />
					{/if}
				</div>
				<div class="album-card-info">
					<div class="album-card-title">{album.name}</div>
					<div class="album-card-meta">
						<span class="album-card-artist">{album.artist}</span>
						{#if album.year}<span class="album-card-year">{album.year}</span>{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if isExpanded}
			{@const exp = albums.find(a => albumKey(a) === key)!}
			{@const expTracks = exp.tracks.map(toPlayerTrack)}
			<div class="album-expanded">
				<button class="expanded-close" onclick={collapseAlbum} title="Back to grid">&larr; Back to library</button>

				<div class="release-hero">
					<div class="cover-art">
						{#if cover}
							<button class="cover-art-btn" onclick={() => openLightbox(cover)} title="View cover">
								<img src={cover} alt={exp.name} />
							</button>
						{:else}
							<button class="cover-art-btn" onclick={() => openCoverPicker(exp)} title="Click to add cover art">
								<div class="cover-art-placeholder">
									<CoverPlaceholder name={exp.name} tags={exp.tracks[0]?.genre} />
								</div>
								<span class="upload-hint">Click to add cover</span>
							</button>
						{/if}
					</div>

					<div class="hero-info">
						{#if exp.year || exp.releaseType}
							<div class="release-meta-badges">
								{#if exp.year}<span class="year-badge">{exp.year}</span>{/if}
								{#if exp.releaseType}<span class="type-badge">{exp.releaseType.toUpperCase()}</span>{/if}
							</div>
						{/if}

						<h2 class="release-title">{exp.name}</h2>
						{#if artistSlugs.get(exp.artist)}
						<a href="/artist/{artistSlugs.get(exp.artist)}" class="artist-link">{exp.artist}</a>
					{:else}
						<a href="/search?q={encodeURIComponent(exp.artist)}" class="artist-link">{exp.artist}</a>
					{/if}

						<div class="release-stats">
							<span>{exp.tracks.length} track{exp.tracks.length !== 1 ? 's' : ''}</span>
							<span class="stats-sep">&middot;</span>
							<span>{totalDuration(exp.tracks)}</span>
						</div>

						<div class="expanded-actions">
							<button class="play-btn" onclick={() => { if (expTracks.length > 0) setQueue(expTracks, 0); }}>▶ Play</button>
							<button class="queue-btn" onclick={() => { for (const t of expTracks) addToQueue(t); }}>+ Queue</button>
						</div>
					</div>
				</div>

				<section class="expanded-tracklist">
					<h3 class="section-label">Tracklist</h3>
					{#each exp.tracks as track, i}
						<TrackRow
							track={toPlayerTrack(track)}
							index={i}
							contextTracks={expTracks}
							showDuration={true}
						/>
					{/each}
				</section>
			</div>
		{/if}
	</div>
{/snippet}

<style>
	.library-grid-container {
		overflow-y: auto;
		height: 100%;
		padding-bottom: 2rem;
	}

	.library-toolbar {
		padding: 12px 16px;
		border-bottom: 1px solid var(--b-1);
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--bg-1);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.library-search-input {
		width: 100%;
		max-width: 400px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		color: var(--t-1);
		padding: 6px 10px;
		font-size: 0.8rem;
		border-radius: 0;
		box-sizing: border-box;
		outline: none;
	}

	.library-search-input:focus {
		border-color: var(--b-acc);
	}

	.library-tabs {
		display: flex;
		gap: 2px;
	}

	.tab {
		padding: 4px 12px;
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--t-3);
		background: none;
		border: 1px solid transparent;
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s;
	}

	.tab:hover {
		color: var(--t-1);
	}

	.tab.active {
		color: var(--t-1);
		border-color: var(--b-2);
		background: var(--bg-2);
	}

	.tab-count {
		font-size: 0.62rem;
		color: var(--t-3);
		margin-left: 2px;
	}

	.tab.active .tab-count {
		color: var(--t-2);
	}

	/* --- Filter Row --- */

	.filter-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.genre-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.genre-chip {
		height: 32px;
		padding: 0 12px;
		font-size: 0.8rem;
		color: var(--t-3);
		background: none;
		border: 1px solid var(--b-1);
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s, background 0.1s;
		white-space: nowrap;
	}

	.genre-chip:hover {
		color: var(--t-1);
		border-color: var(--b-2);
	}

	.genre-chip.active {
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.genre-count {
		font-size: 0.58rem;
		opacity: 0.65;
		margin-left: 2px;
	}

	.genre-more {
		font-size: 0.6rem;
		color: var(--t-3);
		align-self: center;
		padding: 0 4px;
	}

	.year-input {
		width: 60px;
		height: 22px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		color: var(--t-1);
		padding: 0 6px;
		font-size: 0.72rem;
		border-radius: 0;
		outline: none;
		flex-shrink: 0;
	}

	.year-input:focus {
		border-color: var(--b-acc);
	}


	.songs-list {
		padding: 4px 0;
	}

	.artist-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.artist-group-header {
		display: flex;
		align-items: center;
		width: 100%;
		border-bottom: 1px solid var(--b-1);
		background: none;
		transition: background 0.15s;
	}
	.artist-group-header:hover,
	.artist-group-header.open { background: var(--bg-3); }
	.artist-group-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: none;
		border: none;
		color: var(--t-1);
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 10px var(--space-sm);
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}
	.artist-page-link {
		padding: 10px 12px;
		color: var(--t-3);
		text-decoration: none;
		font-size: 0.85rem;
		flex-shrink: 0;
		transition: color 0.15s;
	}
	.artist-page-link:hover { color: var(--acc); }
	.artist-group-name { flex: 1; }
	.artist-group-count { font-size: 0.75rem; font-weight: 400; color: var(--t-3); }
	.artist-group-chevron { font-size: 0.65rem; color: var(--t-3); }
	.artist-albums { padding: var(--space-sm) 0; }
	.artist-fav-link { text-decoration: none; }
	.artist-fav-link:hover { color: var(--t-1); background: var(--bg-3); }
	.artist-fav-badge { font-size: 0.7rem; color: var(--acc); }

	.fav-releases-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 0 4px;
	}

	.fav-release-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 8px var(--space-sm);
		border-bottom: 1px solid var(--b-1);
		text-decoration: none;
		color: var(--t-1);
		font-size: 0.875rem;
		transition: background 0.15s;
	}

	.fav-release-row:hover { background: var(--bg-3); }

	.fav-release-name {
		font-weight: 600;
		flex: 1;
	}

	.fav-release-artist {
		font-size: 0.8rem;
		color: var(--t-2);
	}

	.fav-release-badge {
		font-size: 0.65rem;
		color: var(--t-3);
		border: 1px solid var(--b-1);
		padding: 1px 5px;
		white-space: nowrap;
	}

	.library-no-results {
		padding: 48px 16px;
		font-size: 0.85rem;
		color: var(--t-3);
		text-align: center;
	}

	.album-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
		padding: 12px 16px 24px;
	}

	/* --- Album Card --- */

	.album-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.album-card.expanded {
		grid-column: 1 / -1;
		overflow: visible;
	}

	.album-card-clickable {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 8px);
		cursor: pointer;
		padding: 8px;
		border: 1px solid transparent;
		transition: background 0.1s, border-color 0.1s;
	}

	.album-card-clickable:hover {
		background: var(--bg-2);
	}

	.album-cover {
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
	}

	.album-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.album-card-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		overflow: hidden;
	}

	.album-card-title {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--t-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.album-card-artist {
		font-size: 0.72rem;
		color: var(--t-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-card-year {
		font-size: 0.68rem;
		color: var(--t-3);
		flex-shrink: 0;
	}

	/* --- Expanded Album (matches release page hero) --- */

	.album-expanded {
		grid-column: 1 / -1;
	}

	.expanded-close {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--t-2);
		font-size: 0.78rem;
		cursor: pointer;
		padding: 10px 20px;
		transition: color 0.1s;
	}

	.expanded-close:hover {
		color: var(--t-1);
	}

	.release-hero {
		display: flex;
		gap: 24px;
		align-items: flex-start;
		padding: 0 20px 20px;
	}

	.cover-art {
		width: 220px;
		height: 220px;
		flex-shrink: 0;
		overflow: hidden;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
	}

	.cover-art-btn {
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		display: block;
		width: 100%;
		height: 100%;
	}

	.cover-art-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.cover-art-placeholder {
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.upload-hint {
		display: block;
		font-size: 0.65rem;
		color: var(--t-3);
		margin-top: 4px;
		text-align: center;
	}

	.hero-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 4px;
	}

	.release-meta-badges {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.year-badge {
		font-size: 0.85rem;
		color: var(--t-3);
	}

	.type-badge {
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		background: var(--bg-3);
		color: var(--t-2);
		border: 1px solid var(--b-1);
	}

	.release-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--t-1);
		line-height: 1.2;
		margin: 0;
	}

	.artist-link {
		font-size: 0.95rem;
		color: var(--t-2);
		text-decoration: none;
		transition: color 0.15s;
	}

	.artist-link:hover {
		color: var(--t-1);
	}

	.release-stats {
		display: flex;
		gap: 6px;
		font-size: 0.75rem;
		color: var(--t-3);
	}

	.stats-sep {
		color: var(--t-3);
	}

	.expanded-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.play-btn {
		padding: 6px 14px;
		background: var(--acc);
		color: var(--bg-0, #000);
		border: 1px solid var(--acc);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.play-btn:hover {
		filter: brightness(1.1);
	}

	.queue-btn {
		padding: 6px 14px;
		background: transparent;
		color: var(--t-1);
		border: 1px solid var(--b-2);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.queue-btn:hover {
		border-color: var(--b-3);
		color: var(--t-1);
	}

	.expanded-tracklist {
		padding: 0 20px 16px;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		margin: 0 0 8px;
		padding-top: 12px;
		border-top: 1px solid var(--b-1);
	}

	/* --- Lightbox --- */

	.lightbox-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.lightbox-close {
		position: absolute;
		top: 16px;
		right: 20px;
		width: 36px;
		height: 36px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		color: #fff;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s;
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-img {
		max-width: min(600px, 90vw);
		max-height: 90vh;
		object-fit: contain;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
	}

	/* --- Pagination --- */

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 16px;
	}

	.page-btn {
		min-width: 32px;
		height: 32px;
		padding: 0 8px;
		background: none;
		border: 1px solid var(--b-1);
		color: var(--t-2);
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}

	.page-btn:hover:not(:disabled) {
		background: var(--bg-2);
		color: var(--t-1);
		border-color: var(--b-2);
	}

	.page-btn.active {
		background: var(--bg-3);
		color: var(--t-1);
		border-color: var(--b-acc);
		font-weight: 600;
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.page-ellipsis {
		width: 24px;
		text-align: center;
		color: var(--t-3);
		font-size: 0.75rem;
	}
</style>
